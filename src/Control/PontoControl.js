import db from '../db/db';
import Ponto from '../Model/Ponto';

class PontoControl {
  static getInstance() {
    if (!PontoControl.instance) {
      PontoControl.instance = new PontoControl();
    }
    return PontoControl.instance;
  }

  gravarPonto(partida, numSet, pontoTime1, pontoTime2, jogador, tipoAcao, qualidade, tipoErro = null) {
    const gravarTransaction = db.transaction(() => {
      return Ponto.gravarPonto(partida, numSet, pontoTime1, pontoTime2, jogador, tipoAcao, qualidade, db, tipoErro);
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

  reabrirSet(partida_id, numSet) {
    const transaction = db.transaction(() => Ponto.reabrirSet(partida_id, numSet, db));
    return transaction();
  }

  buscarSetsGanhos(partida_id) {
    return Ponto.buscarSetsGanhos(partida_id, db);
  }

  buscarSetsDaPartida(partida_id) {
    return Ponto.buscarSetsDaPartida(partida_id, db);
  }

  setEstaEncerrado(partida_id, numSet) {
    return Ponto.setEstaEncerrado(partida_id, numSet, db);
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

  /**
   * Marca quem venceu o rally disputado no placar informado.
   * O scout chama isso ao mexer no placar, com o placar ANTERIOR ao incremento.
   */
  definirVencedorRally(partida_id, numSet, pontoTime1, pontoTime2, vencedor) {
    const transaction = db.transaction(() => {
      const marcado = Ponto.definirVencedorRally(partida_id, numSet, pontoTime1, pontoTime2, vencedor, db);
      // A rotacao depende de quem venceu cada rally, entao ela e regravada na
      // mesma transacao: ou o rally e o estado de rotacao mudam juntos, ou
      // nenhum dos dois muda.
      Ponto.sincronizarRotacoes(partida_id, numSet, db);
      return marcado;
    });

    return transaction();
  }

  /** Rotacao de cada rally do set, com ocupacao das zonas. Alimenta o badge ao vivo. */
  buscarEstadosDeRotacao(partida_id, numSet) {
    return Ponto.buscarEstadosDeRotacao(partida_id, numSet, db);
  }

  sincronizarRotacoes(partida_id, numSet) {
    const transaction = db.transaction(() => Ponto.sincronizarRotacoes(partida_id, numSet, db));
    return transaction();
  }

  buscarDonoDoPonto(partida_id, numSet, pontoTime1, pontoTime2) {
    return Ponto.buscarDonoDoPonto(partida_id, numSet, pontoTime1, pontoTime2, db);
  }

  /** Pontos ganhos e cedidos por atleta na partida. Base dos relatorios. */
  buscarPontosPorAtleta(partida_id) {
    return Ponto.buscarPontosPorAtleta(partida_id, db);
  }
}

export default PontoControl;
