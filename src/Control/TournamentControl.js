import { Tournament } from '../Model/Tournament.js';
import { TournamentDAO } from '../Model/TournamentDAO';

class TournamentControl {
  constructor({ tournamentApi, tournamentDAO } = {}) {
    this.tournamentApi = tournamentApi || (typeof window !== 'undefined' ? window.tournamentAPI : null);
    this.tournamentDAO = tournamentDAO || (this.tournamentApi ? null : new TournamentDAO());
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
    if (this.tournamentApi) {
      return this.tournamentApi.list();
    }

    return this.tournamentDAO.getAllTournaments();
  }

  async createTournament(payload) {
    const tournament = this.buildTournamentEntity(payload);

    if (this.tournamentApi) {
      return this.tournamentApi.create({
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
      });
    }

    return this.tournamentDAO.createTournament(
      new Tournament(null, tournament.name, tournament.type, tournament.startDate, tournament.endDate)
    );
  }

  async updateTournament(payload) {
    const tournament = this.buildTournamentEntity(payload);

    if (this.tournamentApi) {
      return this.tournamentApi.update({
        id: tournament.id,
        name: tournament.name,
        type: tournament.type,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
      });
    }

    return this.tournamentDAO.modifyTournament(
      new Tournament(
        Number(tournament.id),
        tournament.name,
        tournament.type,
        tournament.startDate,
        tournament.endDate
      )
    );
  }

  async deleteTournamentById(id) {
    return this.deleteTournament(id);
  }

  async deleteTournament(id) {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID do torneio invalido.');
    }

    if (this.tournamentApi) {
      return this.tournamentApi.delete(numericId);
    }

    return this.tournamentDAO.deleteTournament(numericId);
  }
}

export default new TournamentControl();

