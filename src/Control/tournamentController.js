export class TournamentController {
  constructor({ tournamentApi }) {
    this.tournamentApi = tournamentApi;
  }

  async listTournaments() {
    return this.tournamentApi.list();
  }

  async updateTournament(payload) {
    return this.tournamentApi.update(payload);
  }

  async deleteTournamentById(id) {
    return this.tournamentApi.delete(id);
  }
}

export const tournamentController = new TournamentController({ tournamentApi: window.tournamentAPI });

