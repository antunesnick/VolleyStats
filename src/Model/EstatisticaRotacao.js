import Ponto from './Ponto';
import EscalacaoSet from './EscalacaoSet';
import { LADO, ZONAS, ZONAS_REDE } from './Rotacao';
import { sqlContagemPorResultado } from './SqlQualidade';
import { TIPO_ACAO_PARA_FUNDAMENTO } from './Qualidade';

/**
 * Relatorio de rotacao da nossa equipe.
 *
 * Os numeros de rally (side-out, break, saldo) sao contados em JS, a partir dos
 * estados que `Rotacao.simularSet` produz. Nao ha versao SQL da regra de
 * rotacao de proposito: a escala de qualidade ja existe nas duas linguagens
 * (`Qualidade.js` e `SqlQualidade.js`) e mante-las de acordo custa um teste
 * dedicado de 30 combinacoes. Aqui a regra vive num lugar so.
 *
 * O unico bloco que usa SQL e o de fundamentos por rotacao, que precisa cruzar
 * `Acao` com o rally - e para isso existe a coluna `Ponto.rotacao`, que e cache
 * do mesmo motor.
 */

const contagemVazia = () => ({
  rallies: 0,
  recebidos: 0,
  sideOuts: 0,
  sacados: 0,
  breaks: 0,
  pontos: 0,
  cedidos: 0,
});

const percentual = (parte, total) =>
  total > 0 ? Number(((parte / total) * 100).toFixed(1)) : 0;

const fecharContagem = (contagem) => ({
  ...contagem,
  sideOutPct: percentual(contagem.sideOuts, contagem.recebidos),
  breakPct: percentual(contagem.breaks, contagem.sacados),
  saldo: contagem.pontos - contagem.cedidos,
});

/** Acumula um rally numa contagem. Rally sem vencedor marcado nao entra. */
const acumular = (contagem, estado) => {
  if (estado.vencedor !== LADO.MANDANTE && estado.vencedor !== LADO.VISITANTE) {
    return contagem;
  }

  const ganhamos = estado.vencedor === LADO.MANDANTE;

  contagem.rallies += 1;
  if (ganhamos) contagem.pontos += 1;
  else contagem.cedidos += 1;

  if (estado.sideOut) {
    contagem.recebidos += 1;
    if (ganhamos) contagem.sideOuts += 1;
  } else {
    contagem.sacados += 1;
    if (ganhamos) contagem.breaks += 1;
  }

  return contagem;
};

class EstatisticaRotacao {
  /** Sets da partida que ja tem formacao declarada. */
  static setsComFormacao(partidaId, db) {
    const sets = db.prepare(
      'SELECT NumSet FROM "Set" WHERE Partida_id = ? ORDER BY NumSet ASC'
    ).all(Number(partidaId));

    return sets
      .map(({ NumSet }) => Number(NumSet))
      .filter((numSet) => EscalacaoSet.buscarPorSet(partidaId, numSet, db).length === 6);
  }

  /** Todos os estados de rotacao da partida, achatados, com o set junto. */
  static estadosDaPartida(partidaId, db) {
    return EstatisticaRotacao.setsComFormacao(partidaId, db).flatMap((numSet) =>
      Ponto.buscarEstadosDeRotacao(partidaId, numSet, db).map((estado) => ({ ...estado, numSet }))
    );
  }

  /** Tabela principal: uma linha por rotacao R1..R6. */
  static porRotacao(estados) {
    const mapa = new Map(ZONAS.map((zona) => [zona, contagemVazia()]));

    estados.forEach((estado) => {
      const contagem = mapa.get(Number(estado.rotacao));
      if (contagem) acumular(contagem, estado);
    });

    return ZONAS.map((zona) => ({ rotacao: zona, ...fecharContagem(mapa.get(zona)) }));
  }

  /**
   * O corte da dupla substituicao.
   *
   * Compara as rotacoes de ancora na rede (R2/R3/R4, onde a dupla e feita) com
   * e sem a troca, contra as de ancora no fundo. E a resposta numerica para "a
   * dupla substituicao esta valendo a pena?".
   */
  static porDuplaSubstituicao(estados) {
    const grupos = {
      redeComDupla: contagemVazia(),
      redeSemDupla: contagemVazia(),
      fundo: contagemVazia(),
    };

    estados.forEach((estado) => {
      const naRede = ZONAS_REDE.includes(Number(estado.rotacao));
      if (!naRede) {
        acumular(grupos.fundo, estado);
        return;
      }
      acumular(estado.duplaSub ? grupos.redeComDupla : grupos.redeSemDupla, estado);
    });

    return [
      { chave: 'redeComDupla', rotulo: 'R2/R3/R4 com dupla substituicao', ...fecharContagem(grupos.redeComDupla) },
      { chave: 'redeSemDupla', rotulo: 'R2/R3/R4 sem dupla substituicao', ...fecharContagem(grupos.redeSemDupla) },
      { chave: 'fundo', rotulo: 'R1/R5/R6 (levantador no fundo)', ...fecharContagem(grupos.fundo) },
    ];
  }

  /** Como cada set correu, e por qual rotacao ele comecou. */
  static porSet(partidaId, estados, db) {
    const numeros = [...new Set(estados.map((estado) => estado.numSet))].sort((a, b) => a - b);

    return numeros.map((numSet) => {
      const doSet = estados.filter((estado) => estado.numSet === numSet);
      const contagem = doSet.reduce(acumular, contagemVazia());
      const escalacao = EscalacaoSet.buscarPorSet(partidaId, numSet, db);
      const levantador = escalacao.find((linha) => Number(linha.levantador) === 1);

      return {
        numSet,
        rotacaoInicial: doSet[0]?.rotacao ?? null,
        sacaPrimeiro: EscalacaoSet.buscarSacaPrimeiro(partidaId, numSet, db),
        levantadorNome: levantador?.jogadorNome || null,
        levantadorNumero: levantador?.jogadorNumero ?? null,
        ...fecharContagem(contagem),
      };
    });
  }

  /**
   * Fundamentos por rotacao.
   *
   * Unico bloco em SQL: cruza `Acao` com o rally usando `Ponto.rotacao` e
   * reaproveita `sqlContagemPorResultado`, a mesma classificacao Ponto/Neutra/
   * Erro do resto dos relatorios.
   */
  static fundamentosPorRotacao(partidaId, db) {
    const linhas = db.prepare(`
      SELECT
        P.rotacao AS rotacao,
        A.idTipoAcao AS idTipoAcao,
        COUNT(*) AS total,
${sqlContagemPorResultado('A', 'qualidade')}
      FROM Acao A
      JOIN Ponto P
        ON P.pontoTime1 = A.Ponto_pontoTime1
       AND P.pontoTime2 = A.Ponto_pontoTime2
       AND P.NumSet = A.Ponto_NumSet
       AND P.Set_Partida_id = A.Ponto_Partida_id
      WHERE P.Set_Partida_id = ? AND P.rotacao IS NOT NULL
      GROUP BY P.rotacao, A.idTipoAcao
      ORDER BY P.rotacao ASC, A.idTipoAcao ASC
    `).all(Number(partidaId));

    return linhas.map((linha) => ({
      rotacao: Number(linha.rotacao),
      idTipoAcao: Number(linha.idTipoAcao),
      fundamento: TIPO_ACAO_PARA_FUNDAMENTO[Number(linha.idTipoAcao)] || 'Outros',
      total: Number(linha.total) || 0,
      pontos: Number(linha.qualidadePonto) || 0,
      neutras: Number(linha.qualidadeNeutra) || 0,
      erros: Number(linha.qualidadeErro) || 0,
    }));
  }

  /**
   * Resumo pronto para a tela e para o PDF.
   *
   * `disponivel: false` quando nenhum set tem formacao declarada - e o caso das
   * partidas escoutadas antes desta funcionalidade, que nao tem como ganhar
   * rotacao retroativa.
   */
  static resumoDaPartida(partidaId, db) {
    const setsComFormacao = EstatisticaRotacao.setsComFormacao(partidaId, db);

    if (setsComFormacao.length === 0) {
      return { disponivel: false, setsComFormacao: [], porRotacao: [], duplaSub: [], porSet: [], fundamentos: [], totais: fecharContagem(contagemVazia()), destaques: {} };
    }

    const estados = EstatisticaRotacao.estadosDaPartida(partidaId, db);
    const porRotacao = EstatisticaRotacao.porRotacao(estados);
    const totais = fecharContagem(estados.reduce(acumular, contagemVazia()));

    // Rotacoes sem rally nenhum ficam de fora dos destaques: um saldo 0 por
    // nao ter sido jogada nao e "a melhor rotacao".
    const jogadas = porRotacao.filter((linha) => linha.rallies > 0);
    const porSaldo = [...jogadas].sort((a, b) => b.saldo - a.saldo || b.sideOutPct - a.sideOutPct);

    return {
      disponivel: true,
      setsComFormacao,
      porRotacao,
      duplaSub: EstatisticaRotacao.porDuplaSubstituicao(estados),
      porSet: EstatisticaRotacao.porSet(partidaId, estados, db),
      fundamentos: EstatisticaRotacao.fundamentosPorRotacao(partidaId, db),
      totais,
      destaques: {
        melhor: porSaldo[0] || null,
        pior: porSaldo.length > 1 ? porSaldo[porSaldo.length - 1] : null,
      },
    };
  }
}

export default EstatisticaRotacao;
