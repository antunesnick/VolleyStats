import db from '../db/db';

class TimesPartidaControl {
  static #instance;

  static getInstance() {
    if (!TimesPartidaControl.#instance) {
      TimesPartidaControl.#instance = new TimesPartidaControl();
    }

    return TimesPartidaControl.#instance;
  }

  async salvarEscalacao({ timesId, partidaId, jogadores = [] }) {
    if (!timesId || !partidaId) {
      throw new Error('Times_id e Partida_id são obrigatórios para salvar a escalação.');
    }

    if (!Array.isArray(jogadores)) {
      throw new Error('Jogo de jogadores inválido. Deve ser um array.');
    }

    if (jogadores.length > 14) {
      throw new Error('Máximo de 14 jogadores na escalação.');
    }

    const linhaCount = jogadores.filter((item) => Number(item.linha) === 1).length;
    const bancoCount = jogadores.filter((item) => Number(item.linha) === 0).length;

    if (linhaCount > 6) {
      throw new Error('Máximo de 6 jogadores em linha.');
    }

    if (bancoCount > 8) {
      throw new Error('Máximo de 8 jogadores no banco.');
    }

    const deleteStmt = db.prepare('DELETE FROM TimesPartida WHERE Times_id = ? AND Partida_id = ?');
    const insertStmt = db.prepare(
      'INSERT OR REPLACE INTO TimesPartida (Times_id, Partida_id, Jogadores_id, linha) VALUES (?, ?, ?, ?)'
    );

    const transaction = db.transaction((timesIdParam, partidaIdParam, players) => {
      deleteStmt.run(timesIdParam, partidaIdParam);
      players.forEach((player) => {
        insertStmt.run(timesIdParam, partidaIdParam, Number(player.jogadorId), Number(player.linha));
      });
    });

    return transaction(timesId, partidaId, jogadores);
  }

  async findEscalacaoByPartidaId(partidaId, timesId = null) {
    if (!partidaId) {
      return [];
    }

    const sql = `
      SELECT
        tp.Jogadores_id AS id,
        COALESCE(j.numCamisa, j.id) AS numero,
        j.nome AS nome,
        j.posicao_id AS posicao_id,
        tp.linha AS linha
      FROM TimesPartida tp
      JOIN Jogadores j ON j.id = tp.Jogadores_id
      WHERE tp.Partida_id = ?
      ${timesId ? 'AND tp.Times_id = ?' : ''}
      ORDER BY tp.linha DESC, j.numCamisa ASC, j.nome ASC
    `;

    const rows = timesId
      ? db.prepare(sql).all(partidaId, timesId)
      : db.prepare(sql).all(partidaId);

    return rows.map((row) => ({
      id: row.id,
      numero: String(row.numero).padStart(2, '0'),
      nome: row.nome || `Jogador ${row.id}`,
      posicao: row.posicao_id ? `Posição ${row.posicao_id}` : 'Sem posição',
      linha: Number(row.linha),
    }));
  }
}

export default TimesPartidaControl;
