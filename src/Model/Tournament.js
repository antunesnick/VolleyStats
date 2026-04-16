const TournamentType = Object.freeze({
    POINTS: 1,
    KNOCKOUT: 2,
    POINTS_AND_KNOCKOUT: 3
});

const { TournamentDAO } = require('./TournamentDAO');
const tournamentDAO = new TournamentDAO();

class Tournament {
    id; // int 
    name; // string
    type; // TournamentType enum / int
    startDate; // YYYY-MM-DD
    endDate; // YYYY-MM-DD

    constructor(id, name, type, startDate, endDate) {
        if (startDate && endDate && startDate > endDate) {
            throw new Error('A data de início não pode ser maior que a de término.');
        }

        this.id = id;
        this.name = name;
        this.type = type;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    static fromRow(row) {
        if (!row) {
            return null;
        }

        return new Tournament(row.id, row.nome, row.tipo, row.inicio, row.termino);
    }

    static fromRows(rows) {
        return rows.map((row) => Tournament.fromRow(row));
    }

    static getAllTournaments() {
        return Tournament.fromRows(tournamentDAO.getAllTournaments());
    }

    static getTournamentById(id) {
        return Tournament.fromRow(tournamentDAO.getTournamentById(id));
    }

    static createTournament(tournament) {
        return Tournament.fromRow(tournamentDAO.createTournament(tournament));
    }

    static modifyTournament(tournament) {
        return Tournament.fromRow(tournamentDAO.modifyTournament(tournament));
    }

    static deleteTournament(id) {
        return tournamentDAO.deleteTournament(id);
    }
}

module.exports = {
    TournamentType,
    Tournament,
};