import { Tournament } from '../Model/Tournament.js';

export class HomeController {
  constructor({ tournamentApi }) {
    this.tournamentApi = tournamentApi;
  }

  async listTournaments() {
    return this.tournamentApi.list();
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

  async createTournament(payload) {
    const tournament = this.buildTournamentEntity(payload);
    return this.tournamentApi.create({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
    });
  }

  async updateTournament(payload) {
    const tournament = this.buildTournamentEntity(payload);
    return this.tournamentApi.update({
      id: tournament.id,
      name: tournament.name,
      type: tournament.type,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
    });
  }

  async deleteTournamentById(id) {
    return this.tournamentApi.delete(id);
  }
}

export const homeController = new HomeController({ tournamentApi: window.tournamentAPI });
