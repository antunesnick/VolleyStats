import { app } from 'electron';

/**
 * Define onde ficam os dados gravaveis ANTES de qualquer modulo abrir o banco.
 *
 * Precisa ser o primeiro import do main.js: src/db/db.js abre a conexao no
 * momento em que e importado, e ai ja e tarde para escolher o caminho.
 *
 * - Empacotado: userData do sistema operacional, porque o app roda de dentro
 *   do asar, que e somente leitura.
 * - Desenvolvimento: a pasta do projeto, preservando o developVS.db existente.
 */
if (!process.env.VOLLEYSTATS_DATA_DIR) {
  process.env.VOLLEYSTATS_DATA_DIR = app.isPackaged ? app.getPath('userData') : process.cwd();
}

export const DATA_DIR = process.env.VOLLEYSTATS_DATA_DIR;
