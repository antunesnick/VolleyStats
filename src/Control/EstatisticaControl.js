import {
  buildDraftScore,
  buildEmptyStatistics,
  buscarEstatisticasPartida,
  normalizeScoreValue,
  salvarPontuacaoSets,
} from "../Model/EstatisticaModel";

class EstatisticaControl {
  static #instance;

  static getInstance() {
    if (!EstatisticaControl.#instance) {
      EstatisticaControl.#instance = new EstatisticaControl();
    }

    return EstatisticaControl.#instance;
  }

  criarEstadoInicial(score) {
    return {
      activeTab: "geral",
      draftScore: buildDraftScore(score),
      draftSets: [],
      statistics: buildEmptyStatistics(),
      statisticsError: "",
    };
  }

  resetarAoAbrir(score) {
    return this.criarEstadoInicial(score);
  }

  alterarPlacarRascunho(currentDraft, side, value) {
    return {
      ...currentDraft,
      [side]: normalizeScoreValue(value),
    };
  }

  criarRascunhoSets(statistics) {
    return (statistics?.sets || []).map((setStats) => ({
      numSet: setStats.numSet,
      home: normalizeScoreValue(setStats.placar?.home),
      away: normalizeScoreValue(setStats.placar?.away),
    }));
  }

  alterarPlacarSet(currentDraftSets, numSet, side, value) {
    return currentDraftSets.map((setScore) => {
      if (Number(setScore.numSet) !== Number(numSet)) {
        return setScore;
      }

      return {
        ...setScore,
        [side]: normalizeScoreValue(value),
      };
    });
  }

  calcularResultadoSets(draftSets) {
    return (draftSets || []).reduce((resultado, setScore) => {
      const home = normalizeScoreValue(setScore.home);
      const away = normalizeScoreValue(setScore.away);

      if (home > away) {
        resultado.home += 1;
      }

      if (away > home) {
        resultado.away += 1;
      }

      return resultado;
    }, { home: 0, away: 0 });
  }

  carregarResumo(partidaId) {
    try {
      const statistics = buscarEstatisticasPartida(partidaId);

      return {
        statistics,
        draftSets: this.criarRascunhoSets(statistics),
        statisticsError: "",
      };
    } catch (error) {
      console.error("Erro ao carregar estatisticas da partida:", error);
      return {
        statistics: buildEmptyStatistics(),
        draftSets: [],
        statisticsError: "Nao foi possivel carregar as estatisticas registradas.",
      };
    }
  }

  salvarSets(partidaId, draftSets) {
    const statistics = salvarPontuacaoSets(partidaId, draftSets);

    return {
      statistics,
      draftSets: this.criarRascunhoSets(statistics),
      statisticsError: "",
    };
  }

  confirmar(onConfirm, draftSets) {
    if (typeof onConfirm === "function") {
      onConfirm(this.calcularResultadoSets(draftSets));
    }
  }
}

export default EstatisticaControl.getInstance();
