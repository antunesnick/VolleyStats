import path from 'path';
import fs from 'fs';

/**
 * Fonte unica de verdade para os caminhos gravaveis do app (banco e uploads).
 *
 * Um app empacotado roda de dentro do asar, que e somente leitura: gravar em
 * process.cwd() funciona em dev e quebra em producao. Por isso o diretorio de
 * dados e resolvido em tempo de execucao, nesta ordem:
 *
 *   1. VOLLEYSTATS_DATA_DIR  - definido pelo main process (userData do Electron)
 *                              quando empacotado, e pelos testes (tmpdir).
 *   2. process.cwd()         - fallback de desenvolvimento, preserva o
 *                              developVS.db que ja existe na raiz do projeto.
 *
 * O processo de renderizacao recebe a variavel via preload.js, que roda antes
 * do bundle do React (ver src/preload.js).
 */
function getDataDir() {
  return process.env.VOLLEYSTATS_DATA_DIR || process.cwd();
}

function getDatabasePath() {
  if (process.env.VOLLEYSTATS_DB_PATH) {
    return process.env.VOLLEYSTATS_DB_PATH;
  }

  return path.join(getDataDir(), 'developVS.db');
}

/** Cria o diretorio de uploads sob demanda e devolve o caminho absoluto. */
function getUploadsDir() {
  const dir = path.join(getDataDir(), 'uploads');

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  return dir;
}

export { getDataDir, getDatabasePath, getUploadsDir };
