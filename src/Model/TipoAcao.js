class TipoAcao {
    constructor(nome, idTipoAcao = null) {
        this.idTipoAcao = idTipoAcao;
        this.nome = nome;
    }

    criarTipoAcao(db) {
        try {
            const sql = db.prepare('INSERT INTO TipoAcao (Nome) VALUES (?)');
            const info = sql.run(this.nome);
            this.idTipoAcao = info.lastInsertRowid;
            return this.idTipoAcao;
        } catch (e) {
            throw e;
        }
    }
}

module.exports = TipoAcao;