/*
 * Garante que o better-sqlite3 esteja compilado para o Electron antes do
 * `npm start`. E o espelho do `ensureNativeBuild.js`, que faz o contrario antes
 * dos testes.
 *
 * POR QUE ISSO PRECISA EXISTIR
 *
 * O hook `generateAssets` do forge.config.js apaga o marcador `.forge-meta`
 * para forcar a recompilacao. Isso funciona no `package` e no `make`, onde a
 * ordem das etapas e:
 *
 *     Running generateAssets hook   <- apaga o marcador
 *     Preparing native dependencies <- recompila, porque nao ha marcador
 *
 * No `start` a ordem se inverte:
 *
 *     Preparing native dependencies <- ja decidiu pular, marcador ainda existe
 *     Running generateAssets hook   <- apaga tarde demais
 *
 * Ou seja: depois de rodar os testes (que recompilam para o Node), o
 * `npm start` subia com o binario do Node e o app morria no boot com
 * "NODE_MODULE_VERSION 137 ... requires 143". O marcador mentiroso escondia o
 * problema do Forge, exatamente como no bug de empacotamento ja documentado no
 * CLAUDE.md - so que por um caminho diferente.
 *
 * CommonJS de proposito: roda pelo Node direto, sem passar pelo Babel/Vite.
 * A regra "src/ e sempre ESM" nao se aplica aqui.
 */
const { execFileSync, execSync } = require('child_process');

/**
 * Se o binario CARREGA no Node, ele esta no ABI errado para o Electron.
 *
 * A deteccao e feita assim, e nao pelo `.forge-meta`, porque o marcador e
 * justamente o dado em que nao da para confiar: um `npm rebuild` troca o
 * binario sem atualiza-lo. Carregar de verdade e a unica prova.
 *
 * A PROVA RODA NUM PROCESSO FILHO, e isso nao e detalhe: no Windows um `.node`
 * carregado fica travado pelo sistema, e o rebuild precisa apaga-lo. Se a
 * verificacao acontecesse aqui, este processo seguraria o arquivo e o proprio
 * rebuild que ele dispara falharia com EPERM. (O `ensureNativeBuild.js` nao tem
 * esse problema porque la o caso que dispara o rebuild e justamente o de FALHA
 * ao carregar - o handle nunca chega a existir.)
 *
 * `require('better-sqlite3')` sozinho tambem nao serve: o modulo so chama
 * `bindings()` dentro do construtor, entao e preciso abrir um banco.
 */
function estaCompiladoParaNode() {
  try {
    execFileSync(
      process.execPath,
      ['-e', "new (require('better-sqlite3'))(':memory:').close()"],
      { cwd: __dirname + '/..', stdio: 'pipe' }
    );
    return true;
  } catch (error) {
    const saida = String(error.stderr || error.message || '');

    if (/NODE_MODULE_VERSION|was compiled against/i.test(saida)) {
      return false;
    }

    console.error('Falha inesperada ao carregar o better-sqlite3:');
    console.error(saida);
    process.exit(1);
  }
}

if (estaCompiladoParaNode()) {
  console.log('better-sqlite3 esta compilado para o Node. Recompilando para o Electron...');

  try {
    execSync('npx electron-rebuild -f -w better-sqlite3', { stdio: 'inherit' });
  } catch (error) {
    // EPERM/EBUSY aqui quase sempre e o VolleyStats aberto segurando o .node -
    // nao e problema de permissao nem de instalacao.
    console.error('');
    console.error('Nao foi possivel recompilar o better-sqlite3 para o Electron.');
    console.error('Se o erro acima for EPERM ou EBUSY, feche o VolleyStats e rode de novo:');
    console.error('  o Windows trava o binario nativo enquanto o app esta aberto.');
    process.exit(1);
  }

  console.log('Pronto.');
}
