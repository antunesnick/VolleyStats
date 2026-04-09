const { getDatabase } = require('../db/db');
const { Tournament } = require('./Tournament');

class TournamentDAO {

    constructor(database = getDatabase()) {
        this.db = database;
    }

    createTournament(tournament) {
        const stmt = this.db.prepare(`
            INSERT INTO Torneios (nome, tipo, inicio, termino)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(tournament.name, tournament.type, tournament.startDate, tournament.endDate);
        return new Tournament(result.lastInsertRowid, tournament.name, tournament.type, tournament.startDate, tournament.endDate);
    }

    modifyTournament(tournament) {
        const stmt = this.db.prepare(`
            UPDATE Torneios
            SET nome = ?, tipo = ?, inicio = ?, termino = ?
            WHERE id = ?
        `);

        const result = stmt.run(tournament.name, tournament.type, tournament.startDate, tournament.endDate, tournament.id);
        if (result.changes > 0) {
            return this.getTournamentById(tournament.id);
        }
        throw new Error('Torneio nao encontrado para atualizacao.');
    }

    deleteTournament(id) {
        const stmt = this.db.prepare('DELETE FROM Torneios WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    getTournamentById(id) {
        const stmt = this.db.prepare('SELECT id, nome, tipo, inicio, termino FROM Torneios WHERE id = ?');
        const row = stmt.get(id);

        if (!row) {
            return null;
        }

        return new Tournament(row.id, row.nome, row.tipo, row.inicio, row.termino);
    }

    getAllTournaments() {
        const stmt = this.db.prepare('SELECT id, nome, tipo, inicio, termino FROM Torneios ORDER BY id DESC');
        const rows = stmt.all();

        return rows.map((row) => new Tournament(row.id, row.nome, row.tipo, row.inicio, row.termino));
    }


}

module.exports = {
    TournamentDAO,
};
