import db from '../db/db';
import Substituicao from '../Model/Substituicao';
import Player from '../Model/Player';

class SubstituicaoControl {
  static #instance;

  static getInstance() {
    if (!SubstituicaoControl.#instance) {
      SubstituicaoControl.#instance = new SubstituicaoControl();
    }

    return SubstituicaoControl.#instance;
  }

  buscarJogador(jogadorId) {
    return Player.buscarJogador(jogadorId);
  }

  isLibero(jogadorId) {
    return Substituicao.isLibero(jogadorId);
  }

  buscarSubstituicoesDoSet(partidaId, numSet) {
    return Substituicao.buscarSubstituicoesDoSet(partidaId, numSet);
  }

  montarParesNormais(substituicoes) {
    return Substituicao.montarParesNormais(substituicoes);
  }

  validarParSubstituicao({ jogadorEntra, jogadorSai, pares }) {
    return Substituicao.validarParSubstituicao({ jogadorEntra, jogadorSai, pares });
  }

  validarSubstituicao({ partidaId, jogadorEntra, jogadorSai, numSet = 1 }) {
    return Substituicao.validarSubstituicao({ partidaId, jogadorEntra, jogadorSai, numSet });
  }

  registrarSubstituicao({ pontoTime1 = 0, pontoTime2 = 0, partidaId, jogadorEntra, jogadorSai, numSet = 1 }) {
    const validacao = this.validarSubstituicao({ partidaId, jogadorEntra, jogadorSai, numSet });

    if (!validacao.permissaoSubstituir) {
      return {
        success: false,
        message: validacao.validacoes.mensagens[0],
      };
    }

    const transaction = db.transaction((dadosSubstituicao) => {
      return Substituicao.registrarSubstituicao(dadosSubstituicao, db);
    });

    try {
      return transaction({
        pontoTime1,
        pontoTime2,
        partidaId,
        jogadorEntra,
        jogadorSai,
        numSet,
      });
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erro ao registrar substituição.',
      };
    }
  }
}

export default SubstituicaoControl;
