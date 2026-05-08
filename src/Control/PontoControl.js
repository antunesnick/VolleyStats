import db from '../db/db';
import Ponto from '../Model/Ponto';

class PontoControl {
  static getInstance() {
    if (!PontoControl.instance) {
      PontoControl.instance = new PontoControl();
    }
    return PontoControl.instance;
  }

  gravarPonto(partida, numSet, pontoTime1, pontoTime2, jogador, tipoAcao, qualidade) {
    const gravarTransaction = db.transaction(() => {
      return Ponto.gravarPonto(partida, numSet, pontoTime1, pontoTime2, jogador, tipoAcao, qualidade, db);
    });

    try {
      return gravarTransaction();
    } catch (e) {
      throw e;
    }
  }

  removerPonto(ponto) {
    const removerTransaction = db.transaction(() => {
      return Ponto.removerPonto(ponto, db);
    });

    try {
      return removerTransaction();
    } catch (e) {
      throw e;
    }
  }

  buscarPontosPorSet(partida_id, numSet) {
    try {
      return Ponto.buscarPontosPorSet(partida_id, numSet, db);
    } catch (e) {
      throw e;
    }
  }

  avancarSet(partida_id, numSet, pontosSetTime1, pontosSetTime2) {
    const transaction = db.transaction(() => {
      return Ponto.avancarSet(partida_id, numSet, pontosSetTime1, pontosSetTime2, db);
    });

    try {
      return transaction();
    } catch (e) {
      throw e;
    }
  }

  atualizarPlacarSet(partida_id, numSet, pontosTime1, pontosTime2) {
    const transaction = db.transaction(() => {
      return Ponto.atualizarPlacarSet(partida_id, numSet, pontosTime1, pontosTime2, db);
    });

    try {
      return transaction();
    } catch (e) {
      throw e;
    }
  }

  buscarPlacarSet(partida_id, numSet) {
    try {
      return Ponto.buscarPlacarSet(partida_id, numSet, db);
    } catch (e) {
      throw e;
    }
  }

  atualizarSetsGanhos(partida_id, deltaTime1, deltaTime2) {
    const transaction = db.transaction(() => {
      return Ponto.atualizarSetsGanhos(partida_id, deltaTime1, deltaTime2, db);
    });

    try {
      return transaction();
    } catch (e) {
      throw e;
    }
  }

  removerAcao(acaoId) {
    const transaction = db.transaction(() => {
      return Ponto.removerAcao(acaoId, db);
    });

    try {
      return transaction();
    } catch (e) {
      throw e;
    }
  }
}

export default PontoControl;
