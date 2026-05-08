import db from '../db/db';
import TimesPartida from '../Model/TimesPartida';

class TimesPartidaControl {
  static #instance;

  static getInstance() {
    if (!TimesPartidaControl.#instance) {
      TimesPartidaControl.#instance = new TimesPartidaControl();
    }

    return TimesPartidaControl.#instance;
  }

  async salvarEscalacao({ timesId, partidaId, jogadores = [] }) {
    const transaction = db.transaction((dadosEscalacao) => {
      return TimesPartida.salvarEscalacao(dadosEscalacao, db);
    });

    return transaction({ timesId, partidaId, jogadores });
  }

  async findEscalacaoByPartidaId(partidaId, timesId = null) {
    return TimesPartida.findEscalacaoByPartidaId(partidaId, timesId, db);
  }
}

export default TimesPartidaControl;
