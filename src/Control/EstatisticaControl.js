import { buildDraftScore, normalizeScoreValue } from "../Model/EstatisticaModel";

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
      editMode: false,
      draftScore: buildDraftScore(score),
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

  alternarModoEdicao(editMode, score, currentDraft) {
    if (editMode) {
      return {
        editMode: false,
        draftScore: currentDraft,
      };
    }

    return {
      editMode: true,
      draftScore: buildDraftScore(score),
    };
  }

  confirmar(onConfirm, draftScore) {
    if (typeof onConfirm === "function") {
      onConfirm(buildDraftScore(draftScore));
    }
  }
}

export default EstatisticaControl.getInstance();