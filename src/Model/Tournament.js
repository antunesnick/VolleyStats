const TournamentType = Object.freeze({
    POINTS: 1,
    KNOCKOUT: 2,
    POINTS_AND_KNOCKOUT: 3
});

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
}

module.exports = {
    TournamentType,
    Tournament,
};