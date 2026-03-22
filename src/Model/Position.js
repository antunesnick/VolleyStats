class Position{
    constructor(id, nome) {
        this.id = id;
        this.nome = nome;   
    }

    async getAllPositions() {
        try {
            const sql = db.prepare('SELECT * FROM Posicoes');
            return sql.all();
        } catch (e) {
            throw e;
        }   
    }
    async getPositionById(id) {
        try {
            const sql = db.prepare('SELECT * FROM Posicoes WHERE id = ?');
            return sql.get(id);
        } catch (e) {
            throw e;
        }
    }
}