class TipoAcao {
    /**
     * @param {string} nome        - Nome do tipo de ação
     * @param {number} idTipoAcao  - ID (opcional, preenchido após criação)
     */
    constructor(nome, idTipoAcao = null) {
        this.idTipoAcao = idTipoAcao;
        this.nome = nome;
    }

    criarTipoAcao(db) {
        try {
            // Tabela: TipoAcao | Colunas: idTipoAcao (PK manual), Nome
            const sql = db.prepare('INSERT OR IGNORE INTO TipoAcao (Nome) VALUES (?)');
            const info = sql.run(this.nome);
            this.idTipoAcao = info.lastInsertRowid;
            return this.idTipoAcao;
        } catch (e) {
            throw e;
        }
    }
}

export default TipoAcao;