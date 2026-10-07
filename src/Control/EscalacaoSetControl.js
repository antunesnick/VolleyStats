import db from '../db/db';
import EscalacaoSet from '../Model/EscalacaoSet';
import Ponto from '../Model/Ponto';
import Substituicao from '../Model/Substituicao';
import { LADO, zonaDiagonal } from '../Model/Rotacao';

/**
 * Formacao por zona de cada set, e a dupla substituicao.
 *
 * Como todo Control do projeto, e aqui que a transacao e aberta - a Model
 * nunca abre. Toda gravacao que muda a formacao regrava a rotacao do set na
 * mesma transacao, senao o cache de `Ponto.rotacao` ficaria descrevendo uma
 * escalacao que nao existe mais.
 */
class EscalacaoSetControl {
  static #instance;

  static getInstance() {
    if (!EscalacaoSetControl.#instance) {
      EscalacaoSetControl.#instance = new EscalacaoSetControl();
    }
    return EscalacaoSetControl.#instance;
  }

  buscarPorSet(partidaId, numSet) {
    return EscalacaoSet.buscarPorSet(partidaId, numSet, db);
  }

  buscarSacaPrimeiro(partidaId, numSet) {
    return EscalacaoSet.buscarSacaPrimeiro(partidaId, numSet, db);
  }

  /** Formacao do ultimo set declarado, para abrir o set novo ja preenchido. */
  sugerirParaSet(partidaId, numSet) {
    return EscalacaoSet.sugerirParaSet(partidaId, numSet, db);
  }

  salvar({ partidaId, numSet, zonas, sacaPrimeiro = LADO.MANDANTE }) {
    const transaction = db.transaction(() => {
      const resultado = EscalacaoSet.salvar({ partidaId, numSet, zonas, sacaPrimeiro }, db);
      Ponto.sincronizarRotacoes(partidaId, numSet, db);
      return resultado;
    });

    try {
      return transaction();
    } catch (error) {
      console.error('Falha ao salvar a formacao do set. Rollback.', error);
      throw error;
    }
  }

  /** Gira a formacao inicial do set. Recalcula o set inteiro. */
  girar(partidaId, numSet) {
    const transaction = db.transaction(() => {
      const resultado = EscalacaoSet.girar(partidaId, numSet, db);
      Ponto.sincronizarRotacoes(partidaId, numSet, db);
      return resultado;
    });

    try {
      return transaction();
    } catch (error) {
      console.error('Falha ao girar a formacao do set. Rollback.', error);
      throw error;
    }
  }

  definirSacaPrimeiro(partidaId, numSet, lado) {
    const transaction = db.transaction(() => {
      EscalacaoSet.definirSacaPrimeiro(partidaId, numSet, lado, db);
      Ponto.sincronizarRotacoes(partidaId, numSet, db);
    });

    return transaction();
  }

  /**
   * Monta a dupla substituicao a partir do estado atual da quadra.
   *
   * Nao inventa regra nova: descobre quem esta no slot-ancora e quem esta na
   * diagonal, e devolve os dois pares que a troca exige. A tela usa isso para
   * pre-preencher as duas trocas em vez de obrigar o analista a monta-las na
   * mao no meio do jogo.
   *
   * Os papeis se invertem conforme a direcao:
   *
   *   - fazendo  : no ancora entra um atacante do banco, e na diagonal entra o
   *                levantador reserva. O time passa a ter 3 atacantes na rede.
   *   - desfazendo: cada slot recebe de volta exatamente quem saiu dele, lido
   *                das substituicoes ja registradas no set. Chutar aqui seria
   *                pior que nao sugerir - a regra do par (o reserva so volta
   *                pelo mesmo titular) recusaria a troca.
   *
   * Devolve `null` quando o set nao tem formacao declarada.
   */
  sugerirDuplaSubstituicao(partidaId, numSet, reservas = []) {
    const escalacao = EscalacaoSet.buscarPorSet(partidaId, numSet, db);

    if (escalacao.length !== 6) {
      return null;
    }

    const estados = Ponto.buscarEstadosDeRotacao(partidaId, numSet, db);
    const ultimo = estados[estados.length - 1];
    const ocupacao = ultimo?.ocupacao || EscalacaoSet.ocupacaoInicial(partidaId, numSet, db);
    const zonaAncoraAtual =
      ultimo?.rotacao ?? Number(escalacao.find((linha) => Number(linha.levantador) === 1)?.zona);
    const zonaDiagonalAtual = zonaDiagonal(zonaAncoraAtual);

    const noAncora = ocupacao[zonaAncoraAtual] ?? null;
    const naDiagonal = ocupacao[zonaDiagonalAtual] ?? null;

    const ehLevantador = EscalacaoSet.verificadorDeLevantador(db);
    // Ancora sem levantador = a dupla ja esta em vigor.
    const desfazendo = !ehLevantador(noAncora);

    // Quem saiu do lugar de cada um: e por ele que a troca tem de voltar.
    const substituicoes = Substituicao.buscarSubstituicoesDoSet(partidaId, numSet);
    const quemSaiuNoLugarDe = (jogadorId) => {
      const troca = [...substituicoes]
        .reverse()
        .find((item) => Number(item.JogadorEntra) === Number(jogadorId));
      return troca ? Number(troca.JogadorSai) : null;
    };

    const reservaLevantador = reservas.find((jogador) => ehLevantador(jogador.id))?.id ?? null;
    const reservaAtacante = reservas.find((jogador) => !ehLevantador(jogador.id))?.id ?? null;

    return {
      desfazendo,
      rotacao: zonaAncoraAtual,
      trocaAncora: {
        zona: zonaAncoraAtual,
        jogadorSai: noAncora,
        jogadorEntra: desfazendo ? quemSaiuNoLugarDe(noAncora) : reservaAtacante,
      },
      trocaDiagonal: {
        zona: zonaDiagonalAtual,
        jogadorSai: naDiagonal,
        jogadorEntra: desfazendo ? quemSaiuNoLugarDe(naDiagonal) : reservaLevantador,
      },
    };
  }

  /**
   * Aplica as duas trocas da dupla substituicao numa transacao so.
   *
   * As duas passam pelas validacoes normais de `Model/Substituicao` - limite de
   * 6 por set e a regra de o reserva so voltar pelo mesmo titular -, e juntas
   * consomem 2 das 6 substituicoes do set, como na regra real. Se a segunda for
   * recusada, a primeira volta atras: meia dupla deixaria a quadra com dois
   * levantadores ou nenhum.
   */
  registrarDuplaSubstituicao({ partidaId, numSet, pontoTime1 = 0, pontoTime2 = 0, trocas = [] }) {
    if (trocas.length !== 2) {
      return { success: false, message: 'A dupla substituicao precisa das duas trocas.' };
    }

    const invalida = trocas.find((troca) => !troca.jogadorEntra || !troca.jogadorSai);
    if (invalida) {
      return { success: false, message: 'Selecione quem entra e quem sai nas duas trocas.' };
    }

    for (const troca of trocas) {
      const validacao = Substituicao.validarSubstituicao({
        partidaId,
        numSet,
        jogadorEntra: troca.jogadorEntra,
        jogadorSai: troca.jogadorSai,
      });

      if (!validacao.permissaoSubstituir) {
        return { success: false, message: validacao.validacoes.mensagens[0] };
      }
    }

    const transaction = db.transaction(() => {
      trocas.forEach((troca) => {
        Substituicao.registrarSubstituicao(
          {
            partidaId,
            numSet,
            pontoTime1,
            pontoTime2,
            jogadorEntra: troca.jogadorEntra,
            jogadorSai: troca.jogadorSai,
          },
          db
        );
      });

      Ponto.sincronizarRotacoes(partidaId, numSet, db);
      return { success: true };
    });

    try {
      return transaction();
    } catch (error) {
      console.error('Falha na dupla substituicao. Rollback.', error);
      return { success: false, message: error.message || 'Erro ao registrar a dupla substituicao.' };
    }
  }
}

export default EscalacaoSetControl;
