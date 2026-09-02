const path = require('node:path');
const fs = require('node:fs/promises');

const { FusesPlugin } = require('@electron-forge/plugin-fuses');
const { FuseV1Options, FuseVersion } = require('@electron/fuses');

/**
 * Modulos que o webpack NAO empacota (ver `externals` em webpack.*.config.js) e
 * que portanto precisam existir em node_modules dentro do app empacotado.
 *
 * better-sqlite3 e nativo: precisa ser carregado como .node de verdade, o que
 * so funciona fora do asar. `bindings` e `file-uri-to-path` sao as dependencias
 * de runtime dele (prebuild-install e usado so na instalacao).
 */
const MODULOS_EXTERNOS = ['better-sqlite3', 'bindings', 'file-uri-to-path'];

// Lixo de compilacao que nao precisa ir junto e pesa dezenas de MB.
const IGNORAR_NO_COPY = new Set(['deps', 'src', 'obj', 'obj.target', '.deps']);

const MARCADOR_ABI = path.join(
  __dirname,
  'node_modules',
  'better-sqlite3',
  'build',
  'Release',
  '.forge-meta'
);

/**
 * Apaga o marcador de ABI antes do Forge decidir se recompila o modulo nativo.
 *
 * O Forge pula a recompilacao quando o marcador ja bate com o ABI alvo. So que
 * um `npm rebuild` (feito pelos testes) troca o .node sem atualizar o marcador:
 * o Forge confia no marcador desatualizado, pula o rebuild e empacota o binario
 * do Node. O app compila, empacota e so quebra ao abrir, na maquina de quem
 * recebeu o instalador.
 *
 * Sem marcador, o Forge sempre recompila - e ai o marcador volta a ser verdade.
 */
async function invalidarMarcadorDeAbi() {
  await fs.rm(MARCADOR_ABI, { force: true });
}

/**
 * Rede de seguranca: confere se o binario que foi para o pacote e mesmo o do
 * ABI do Electron. So e confiavel porque o marcador acabou de ser reescrito
 * pela recompilacao forcada acima.
 */
async function verificarAbiDoBinario(releaseDir, electronVersion) {
  const { getAbi } = require('node-abi');
  const abiEsperado = String(getAbi(electronVersion, 'electron'));
  const marcador = path.join(releaseDir, '.forge-meta');
  const conteudo = await fs.readFile(marcador, 'utf8').catch(() => '');

  if (!conteudo.endsWith(`--${abiEsperado}`)) {
    throw new Error(
      `better_sqlite3.node nao esta compilado para o Electron ${electronVersion} ` +
        `(ABI ${abiEsperado}); marcador encontrado: "${conteudo || 'nenhum'}". ` +
        'Rode `npm run rebuild:electron` e empacote de novo.'
    );
  }

  console.log(`[forge] better-sqlite3 confirmado no ABI ${abiEsperado} (Electron ${electronVersion})`);
}

async function copiarModulosExternos(buildPath, electronVersion) {
  const destinoBase = path.join(buildPath, 'node_modules');

  for (const modulo of MODULOS_EXTERNOS) {
    const origem = path.join(__dirname, 'node_modules', modulo);
    const destino = path.join(destinoBase, modulo);

    await fs.cp(origem, destino, {
      recursive: true,
      filter: (src) => !IGNORAR_NO_COPY.has(path.basename(src)),
    });
  }

  const releaseDir = path.join(destinoBase, 'better-sqlite3', 'build', 'Release');

  // Sem o binario o app nem abre: falhar aqui e melhor que falhar na entrega.
  await fs.access(path.join(releaseDir, 'better_sqlite3.node')).catch(() => {
    throw new Error(
      `better_sqlite3.node nao foi copiado para o pacote (${releaseDir}). ` +
        'Rode `npm run rebuild:electron` e empacote de novo.'
    );
  });

  await verificarAbiDoBinario(releaseDir, electronVersion);
}

module.exports = {
  // Por padrao o build vai para ./out. Da para redirecionar quando o diretorio
  // anterior esta bloqueado (antivirus, ou um editor com a pasta aberta):
  //   VOLLEYSTATS_OUT_DIR=out-nova npm run package
  outDir: process.env.VOLLEYSTATS_OUT_DIR || undefined,
  packagerConfig: {
    asar: {
      // O .node precisa ficar fora do asar para o Electron conseguir carrega-lo.
      unpack: '**/node_modules/better-sqlite3/build/Release/*.node',
    },
    // O plugin do webpack cria um node_modules vazio, assumindo que tudo foi
    // empacotado pelo bundler. Como better-sqlite3 esta em `externals`, ele
    // precisa ser copiado a mao.
    //
    // Este hook do proprio electron-packager roda DEPOIS dos hooks do Forge e
    // dos plugins, entao nada sobrescreve a copia. (`packageAfterPrune` nao
    // serve: o plugin do webpack desliga a poda, e o hook nunca dispara.)
    afterCopy: [
      (buildPath, electronVersion, _platform, _arch, callback) => {
        copiarModulosExternos(buildPath, electronVersion).then(() => callback(), callback);
      },
    ],
  },
  rebuildConfig: {},
  hooks: {
    // Roda antes da etapa "Preparing native dependencies" do Forge.
    generateAssets: invalidarMarcadorDeAbi,
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
    {
      name: '@electron-forge/plugin-webpack',
      config: {
        mainConfig: './webpack.main.config.js',
        renderer: {
          config: './webpack.renderer.config.js',
          entryPoints: [
            {
              html: './src/View/index.html',
              js: './src/renderer.js',
              name: 'main_window',
              preload: {
                js: './src/preload.js',
              },
            },
          ],
        },
      },
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};
