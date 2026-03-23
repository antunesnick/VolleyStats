export class HomeController {
  constructor({ tournamentApi }) {
    this.tournamentApi = tournamentApi;
  }

  async listTournaments() {
    return this.tournamentApi.list();
  }

  buildTournamentPayload(formData) {
    return {
      id: formData.id,
      name: formData.name,
      type: Number(formData.type),
      startDate: formData.startDate,
      endDate: formData.endDate,
    };
  }

  async createTournament(payload) {
    return this.tournamentApi.create(payload);
  }

  async updateTournament(payload) {
    return this.tournamentApi.update(payload);
  }

  async deleteTournamentById(id) {
    return this.tournamentApi.delete(id);
  }
}

export const homeController = new HomeController({ tournamentApi: window.tournamentAPI });
