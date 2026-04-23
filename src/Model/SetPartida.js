class SetPartida {
    /**
     * @param {number} numSet  - Número do set (1, 2, 3...)
     * @param {object} partida - Objeto Partida (deve conter .id)
     */
    constructor(numSet, partida) {
        this.numSet = numSet;
        this.partida = partida;
    }

    criarSet(db) {
        try {
            // Tabela: Set | Colunas: NumSet, Partida_id
            // INSERT OR IGNORE pois o set pode já existir se um ponto for adicionado depois
            const sql = db.prepare(
                'INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)'
            );
            sql.run(this.numSet, this.partida.id);
        } catch (e) {
            throw e;
        }
    }
}

export default SetPartida;