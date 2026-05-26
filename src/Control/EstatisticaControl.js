import db from "../db/db";
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

  carregarRelatorioGeralPartidas(filtros = null) {
    try {
      return {
        relatorio: this.estatisticaModel.montarRelatorioGeralPartidas(filtros),
        erro: "",
      };
    } catch (error) {
      console.error("Erro ao carregar relatorio geral de partidas:", error);
      return {
        relatorio: null,
        erro: error?.message || "Nao foi possivel carregar o relatorio geral de partidas.",
      };
    }
  }

  criarSnapshotPartida(partidaId) {
    try {
      return this.estatisticaModel.criarSnapshotPartida(partidaId);
    } catch (error) {
      console.error("Erro ao criar snapshot da partida:", error);
      return null;
    }
  }

  restaurarSnapshotPartida(partidaId, snapshot) {
    if (!snapshot) {
      return null;
    }

    try {
      const transaction = db.transaction((idPartida, snapshotPartida) => {
        return this.estatisticaModel.restaurarSnapshotPartida(idPartida, snapshotPartida);
      });
      const statistics = transaction(partidaId, snapshot);

      return {
        statistics,
        draftSets: this.criarRascunhoSets(statistics),
        statisticsError: "",
      };
    } catch (error) {
      console.error("Erro ao restaurar snapshot da partida:", error);
      return {
        statistics: null,
        draftSets: null,
        statisticsError: error?.message || "Nao foi possivel desfazer as alteracoes.",
      };
    }
  }

  salvarSets(partidaId, draftSets) {
    const transaction = db.transaction((idPartida, sets) => {
      return this.estatisticaModel.salvarPontuacaoSets(idPartida, sets);
    });
    const statistics = transaction(partidaId, draftSets);

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
      const transaction = db.transaction((idPartida, acao) => {
        return this.estatisticaModel.editarAcao(idPartida, acao);
      });
      const statistics = transaction(partidaId, draftAcao);

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
      const transaction = db.transaction((idPartida, idAcao) => {
        return this.estatisticaModel.excluirAcao(idPartida, idAcao);
      });
      const statistics = transaction(partidaId, acaoId);

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
      const setNumber = Number(numSet);
      const statisticsAtual = this.estatisticaModel.buscarEstatisticasPartida(partidaId);
      const ultimoSet = (statisticsAtual?.sets || []).reduce((maiorSet, setStats) => {
        return Math.max(maiorSet, Number(setStats.numSet) || 0);
      }, 0);

      if (!ultimoSet || setNumber !== ultimoSet) {
        throw new Error("Somente o ultimo set pode ser excluido.");
      }

      const transaction = db.transaction((idPartida, setNumber) => {
        return this.estatisticaModel.excluirSet(idPartida, setNumber);
      });
      const statistics = transaction(partidaId, setNumber);

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
