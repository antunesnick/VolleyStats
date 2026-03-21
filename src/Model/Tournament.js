const TournamentType = Object.freeze({
    POINTS: 1,
    KNOCKOUT: 2,
    POINTS_AND_KNOCKOUT: 3
});

const { getDatabase } = require('../db/db');

class Tournament {
    id; // int 
    name; // string
    type; // TournamentType enum / int
    startDate; // YYYY-MM-DD
    endDate; // YYYY-MM-DD

    constructor(id, name, type, startDate, endDate) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.startDate = startDate;
        this.endDate = endDate;
    }
}

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
        return result.changes > 0;
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

    isValidDateString(value) {
        return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    normalizeTournamentInput(payload) {
        const id = payload.id != null ? Number(payload.id) : null;
        const name = typeof payload.name === 'string' ? payload.name.trim() : '';
        const type = Number(payload.type);
        const startDate = payload.startDate;
        const endDate = payload.endDate;

        if (!name) {
            throw new Error('Nome do torneio e obrigatorio.');
        }

        const validTypes = Object.values(TournamentType);
        if (!validTypes.includes(type)) {
            throw new Error('Tipo de torneio invalido.');
        }

        if (!this.isValidDateString(startDate) || !this.isValidDateString(endDate)) {
            throw new Error('Datas de inicio e termino sao obrigatorias.');
        }

        if (startDate > endDate) {
            throw new Error('A data de inicio nao pode ser maior que a de termino.');
        }

        return new Tournament(id, name, type, startDate, endDate);
    }

    createFromPayload(payload) {
        const tournament = this.normalizeTournamentInput(payload);
        return this.createTournament(tournament);
    }

    updateFromPayload(payload) {
        const tournament = this.normalizeTournamentInput(payload);

        if (!tournament.id || Number.isNaN(tournament.id)) {
            throw new Error('ID do torneio e obrigatorio para atualizacao.');
        }

        const updated = this.modifyTournament(tournament);
        if (!updated) {
            throw new Error('Torneio nao encontrado para atualizacao.');
        }

        return this.getTournamentById(tournament.id);
    }

    deleteById(id) {
        const numericId = Number(id);

        if (!numericId || Number.isNaN(numericId)) {
            throw new Error('ID do torneio invalido.');
        }

        const deleted = this.deleteTournament(numericId);
        if (!deleted) {
            throw new Error('Torneio nao encontrado para exclusao.');
        }

        return true;
    } 

}

module.exports = {
    TournamentType,
    Tournament,
    TournamentDAO,
};