import EstatisticaModel from "../Model/EstatisticaModel";

class EstatisticaControl {
  static #instance;

  constructor() {
    this.estatisticaModel = new EstatisticaModel();
  }

  static getInstance() {
    if (!EstatisticaControl.#instance) {
      EstatisticaControl.#instance = new EstatisticaControl();
    }

    return EstatisticaControl.#instance;
  }

  criarEstadoInicial(score) {
    return {
      activeTab: "geral",
      draftScore: this.estatisticaModel.montarPlacarRascunho(score),
      draftSets: [],
      editOptions: {
        jogadores: [],
        tiposAcao: [],
        qualidades: ["A", "B", "C"],
      },
      statistics: this.estatisticaModel.montarEstatisticaVazia(),
      statisticsError: "",
    };
  }

  resetarAoAbrir(score) {
    return this.criarEstadoInicial(score);
  }

  alterarPlacarRascunho(currentDraft, side, value) {
    return {
      ...currentDraft,
      [side]: this.estatisticaModel.normalizarPlacar(value),
    };
  }

  criarRascunhoSets(statistics) {
    return (statistics?.sets || []).map((setStats) => ({
      numSet: setStats.numSet,
      home: this.estatisticaModel.normalizarPlacar(setStats.placar?.home),
      away: this.estatisticaModel.normalizarPlacar(setStats.placar?.away),
    }));
  }

  alterarPlacarSet(currentDraftSets, numSet, side, value) {
    return currentDraftSets.map((setScore) => {
      if (Number(setScore.numSet) !== Number(numSet)) {
        return setScore;
      }

      return {
        ...setScore,
        [side]: this.estatisticaModel.normalizarPlacar(value),
      };
    });
  }

  calcularResultadoSets(draftSets) {
    return (draftSets || []).reduce((resultado, setScore) => {
      const home = this.estatisticaModel.normalizarPlacar(setScore.home);
      const away = this.estatisticaModel.normalizarPlacar(setScore.away);

      if (home > away) {
        resultado.home += 1;
      }

      if (away > home) {
        resultado.away += 1;
      }

      return resultado;
    }, { home: 0, away: 0 });
  }

  obterResultadoPartida(statistics, draftSets) {
    const resultadoPartida = statistics?.resultadoPartida;
    const hasResultadoPartida = resultadoPartida
      && (Number(resultadoPartida.home) > 0 || Number(resultadoPartida.away) > 0);

    if (hasResultadoPartida) {
      return {
        home: this.estatisticaModel.normalizarPlacar(resultadoPartida.home),
        away: this.estatisticaModel.normalizarPlacar(resultadoPartida.away),
      };
    }

    return this.calcularResultadoSets(draftSets);
  }

  carregarResumo(partidaId) {
    try {
      const statistics = this.estatisticaModel.buscarEstatisticasPartida(partidaId);

      return {
        statistics,
        draftSets: this.criarRascunhoSets(statistics),
        statisticsError: "",
      };
    } catch (error) {
      console.error("Erro ao carregar estatisticas da partida:", error);
      return {
        statistics: this.estatisticaModel.montarEstatisticaVazia(),
        draftSets: [],
        statisticsError: "Nao foi possivel carregar as estatisticas registradas.",
      };
    }
  }

  salvarSets(partidaId, draftSets) {
    const statistics = this.estatisticaModel.salvarPontuacaoSets(partidaId, draftSets);

    return {
      statistics,
      draftSets: this.criarRascunhoSets(statistics),
      statisticsError: "",
    };
  }

  carregarOpcoesEdicaoAcao(partidaId) {
    try {
      return this.estatisticaModel.buscarOpcoesEdicaoAcao(partidaId);
    } catch (error) {
      console.error("Erro ao carregar opcoes de edicao da acao:", error);
      return {
        jogadores: [],
        tiposAcao: [],
        qualidades: ["A", "B", "C"],
      };
    }
  }

  criarRascunhoAcao(acao) {
    if (!acao) {
      return null;
    }

    return {
      id: acao.id,
      jogadorId: Number(acao.jogadorId) || "",
      tipoAcaoId: Number(acao.tipoAcaoId) || "",
      qualidade: acao.qualidade || "A",
    };
  }

  alterarRascunhoAcao(currentDraft, field, value) {
    return {
      ...currentDraft,
      [field]: field === "qualidade" ? value : Number(value),
    };
  }

  salvarEdicaoAcao(partidaId, draftAcao) {
    try {
      const statistics = this.estatisticaModel.editarAcao(partidaId, draftAcao);

      return {
        statistics,
        draftSets: this.criarRascunhoSets(statistics),
        statisticsError: "",
      };
    } catch (error) {
      console.error("Erro ao editar acao:", error);
      return {
        statistics: null,
        draftSets: null,
        statisticsError: error?.message || "Nao foi possivel editar a acao.",
      };
    }
  }

  excluirAcao(partidaId, acaoId) {
    try {
      const statistics = this.estatisticaModel.excluirAcao(partidaId, acaoId);

      return {
        statistics,
        draftSets: this.criarRascunhoSets(statistics),
        statisticsError: "",
      };
    } catch (error) {
      console.error("Erro ao excluir acao:", error);
      return {
        statistics: null,
        draftSets: null,
        statisticsError: error?.message || "Nao foi possivel excluir a acao.",
      };
    }
  }

  excluirSet(partidaId, numSet) {
    try {
      const statistics = this.estatisticaModel.excluirSet(partidaId, numSet);

      return {
        statistics,
        draftSets: this.criarRascunhoSets(statistics),
        statisticsError: "",
      };
    } catch (error) {
      console.error("Erro ao excluir set:", error);
      return {
        statistics: null,
        draftSets: null,
        statisticsError: error?.message || "Nao foi possivel excluir o set.",
      };
    }
  }

  confirmar(onConfirm, statistics, draftSets) {
    if (typeof onConfirm === "function") {
      onConfirm(this.obterResultadoPartida(statistics, draftSets));
    }
  }
}

export default EstatisticaControl.getInstance();
