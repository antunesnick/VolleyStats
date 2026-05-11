class ImportHistory {
    constructor(id = null, nomeArquivo = null, dataImportacao = null) {
        this.id = id;
        this.nomeArquivo = nomeArquivo;
        this.dataImportacao = dataImportacao;
    }

    insert(db) {
        try {
            const sql = db.prepare('INSERT INTO ImportacaoHistorico (nomeArquivo) VALUES (?)');
            const info = sql.run(this.nomeArquivo);
            this.id = info.lastInsertRowid;
            return this.id;
        } catch (e) {
            console.error("Erro ao inserir histórico:", e);
            throw e;
        }
    }

    static findAll(db) {
        try {
            return db.prepare('SELECT * FROM ImportacaoHistorico ORDER BY dataImportacao DESC').all();
        } catch (e) {
            console.error("Erro ao buscar histórico:", e);
            throw e;
        }
    }

    static delete(db, id) {
        try {
            return db.prepare('DELETE FROM ImportacaoHistorico WHERE id = ?').run(id);
        } catch (e) {
            console.error("Erro ao deletar importação:", e);
            throw e;
        }
    }
}

export default ImportHistory;