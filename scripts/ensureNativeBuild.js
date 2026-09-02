/*
 * Garante que o better-sqlite3 esteja compilado para o Node antes dos testes.
 *
 * O modulo e nativo e so carrega no ABI para o qual foi compilado. Rodar
 * `npm run package` / `npm run make` faz o electron-rebuild recompila-lo para o
 * ABI do Electron, e a partir dai o Vitest (que roda em Node puro) quebra com
 * "NODE_MODULE_VERSION 143 ... requires 137".
 *
 * Em vez de deixar isso como pegadinha manual, o pretest detecta e corrige.
 *
 * CommonJS de proposito: roda pelo Node direto, sem passar pelo Babel/Vite.
 * A regra "src/ e sempre ESM" nao se aplica aqui.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * O electron-rebuild grava um marcador com o ABI que ele compilou. Um
 * `npm rebuild` troca o binario mas NAO atualiza esse marcador, e o Forge passa
 * a confiar num dado mentiroso e pula a recompilacao - foi assim que uma build
 * empacotada saiu com o binario do Node dentro e quebrou ao abrir.
 */
function invalidarMarcadorDoForge() {
  const marcador = path.join(
    __dirname,
    '..',
    'node_modules',
    'better-sqlite3',
    'build',
    'Release',
    '.forge-meta'
  );

  fs.rmSync(marcador, { force: true });
}

/**
 * `require('better-sqlite3')` NAO carrega o binario: o modulo so chama
 * `bindings()` dentro do construtor. Testar apenas o require daria sempre
 * "tudo certo" e o rebuild nunca aconteceria - por isso abrimos um banco.
 */
function carregaNoNode() {
  const Database = require('better-sqlite3');
  new Database(':memory:').close();
}

try {
  carregaNoNode();
  process.exit(0);
} catch (error) {
  const mensagem = String(error && error.message);
  const abiIncompativel = /NODE_MODULE_VERSION|was compiled against/i.test(mensagem);

  if (!abiIncompativel) {
    console.error('Falha inesperada ao carregar o better-sqlite3:');
    console.error(mensagem);
    process.exit(1);
  }

  console.log('better-sqlite3 esta compilado para o Electron. Recompilando para o Node...');
  execSync('npm rebuild better-sqlite3', { stdio: 'inherit' });
  invalidarMarcadorDoForge();
  console.log('Pronto. `npm run package` recompila para o Electron automaticamente.');
}
