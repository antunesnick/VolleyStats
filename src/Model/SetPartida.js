class SetPartida {
  constructor(numSet, partida) {
    this.numSet = numSet;
    this.partida = partida;
  }

  criarSet(db) {
    try {
      const sql = db.prepare(
        'INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)'
      );
      sql.run(this.numSet, this.partida.id);
    } catch (e) {
      throw e;
    }
  }

  // NOVO: Salva o placar final do set (pontosTime1/2 na tabela Set)
  finalizarSet(db, pontosTime1, pontosTime2) {
    try {
      const sql = db.prepare(
        'UPDATE "Set" SET pontosTime1 = ?, pontosTime2 = ? WHERE NumSet = ? AND Partida_id = ?'
      );
      sql.run(pontosTime1, pontosTime2, this.numSet, this.partida.id);
    } catch (e) {
      throw e;
    }
  }
}

export default SetPartida;