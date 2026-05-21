import { Tournament } from '../Model/Tournament.js';

class TournamentControl {
  constructor() {
    if (TournamentControl.instance) {
      return TournamentControl.instance;
    }

    TournamentControl.instance = this;
  }

  static getInstance() {
    if (!TournamentControl.instance) {
      TournamentControl.instance = new TournamentControl();
    }

    return TournamentControl.instance;
  }

  buildTournamentEntity(formData) {
    return new Tournament(
      formData.id || null,
      formData.name,
      Number(formData.type),
      formData.startDate,
      formData.endDate
    );
  }

  async listTournaments() {
    return Tournament.getAllTournaments();
  }

  async createTournament(payload) {
    const tournament = this.buildTournamentEntity(payload);

    return Tournament.createTournament(
      new Tournament(null, tournament.name, tournament.type, tournament.startDate, tournament.endDate)
    );
  }

  async updateTournament(payload) {
    const tournament = this.buildTournamentEntity(payload);

    return Tournament.modifyTournament(
      new Tournament(
        Number(tournament.id),
        tournament.name,
        tournament.type,
        tournament.startDate,
        tournament.endDate
      )
    );
  }

  async getTournamentById(id) {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID do torneio invalido.');
    }
    return Tournament.getTournamentById(numericId);
  }

  async deleteTournamentById(id) {
    return this.deleteTournament(id);
  }

  async deleteTournament(id) {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID do torneio invalido.');
    }

    return Tournament.deleteTournament(numericId);
  }

  async emitirRelatorioPartidas(tournamentId) {
    return Tournament.buildMatchReport(tournamentId);
  }

  async emitirRelatorioTorneio(tournamentId, filtros = {}) {
    return Tournament.buildTournamentReport(tournamentId, filtros);
  }

  async emitirRelatorioGeralTorneios() {
    return Tournament.buildGeneralTournamentReport();
  }
}

const tournamentControl = TournamentControl.getInstance();

export default tournamentControl;

