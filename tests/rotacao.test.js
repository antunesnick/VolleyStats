import { describe, it, expect, beforeEach } from 'vitest';
import Ponto from '../src/Model/Ponto';
import EscalacaoSet from '../src/Model/EscalacaoSet';
import EstatisticaRotacao from '../src/Model/EstatisticaRotacao';
import PontoControl from '../src/Control/PontoControl';
import EscalacaoSetControl from '../src/Control/EscalacaoSetControl';
import SubstituicaoControl from '../src/Control/SubstituicaoControl';
import { LADO, proximaZona, simularSet, girarEscalacao, zonaDiagonal } from '../src/Model/Rotacao';
import { db, resetarBanco, cenarioRotacao, escalarPorZona, TIPO_ACAO } from './helpers/fixtures';

const { MANDANTE, VISITANTE } = LADO;

/** Sequencia de rallies a partir dos vencedores, na ordem em que aconteceram. */
const rallies = (vencedores) => {
  let home = 0;
  let away = 0;
  return vencedores.map((vencedor) => {
    const rally = { pontoTime1: home, pontoTime2: away, vencedor };
    if (vencedor === MANDANTE) home += 1;
    else away += 1;
    return rally;
  });
};

const escalacaoDeTeste = (ancora = 1) =>
  [1, 2, 3, 4, 5, 6].map((zona) => ({
    zona,
    jogadorId: zona * 10,
    levantador: zona === ancora ? 1 : 0,
  }));

describe('Rotacao — motor puro', () => {
  it('gira uma posicao a cada side-out, e o numero da zona decresce', () => {
    // Recebendo sempre e vencendo sempre: 1 -> 6 -> 5 -> 4 ...
    // Como vencer sacando nao gira, alterna-se perder e vencer para receber
    // de novo a cada rally.
    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(1),
      sacaPrimeiro: VISITANTE,
      rallies: rallies([MANDANTE, VISITANTE, MANDANTE, VISITANTE, MANDANTE]),
    });

    expect(estados.map((estado) => estado.rotacao)).toEqual([1, 6, 6, 5, 5]);
  });

  it('fecha o ciclo em 6 side-outs', () => {
    const seis = [];
    for (let i = 0; i < 6; i += 1) seis.push(MANDANTE, VISITANTE);

    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(1),
      sacaPrimeiro: VISITANTE,
      rallies: rallies(seis),
    });

    // Depois de 6 side-outs a equipe volta a rotacao inicial.
    expect(estados[0].rotacao).toBe(1);
    expect(estados[estados.length - 1].rotacao).toBe(1);
  });

  it('vencer sacando e break point: nao gira', () => {
    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(3),
      sacaPrimeiro: MANDANTE,
      rallies: rallies([MANDANTE, MANDANTE, MANDANTE]),
    });

    expect(estados.map((estado) => estado.rotacao)).toEqual([3, 3, 3]);
    expect(estados.every((estado) => estado.sacando === MANDANTE)).toBe(true);
  });

  it('perder o rally nunca gira a nossa rotacao', () => {
    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(4),
      sacaPrimeiro: MANDANTE,
      rallies: rallies([VISITANTE, VISITANTE, VISITANTE]),
    });

    expect(estados.map((estado) => estado.rotacao)).toEqual([4, 4, 4]);
  });

  it('marca side-out apenas nos rallies em que a equipe recebe', () => {
    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(1),
      sacaPrimeiro: VISITANTE,
      rallies: rallies([MANDANTE, MANDANTE, VISITANTE]),
    });

    // 1o recebendo (side-out), 2o ja sacando (break), 3o ainda sacando.
    expect(estados.map((estado) => estado.sideOut)).toEqual([true, false, false]);
  });

  it('a ocupacao das zonas acompanha o giro', () => {
    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(1),
      sacaPrimeiro: VISITANTE,
      rallies: rallies([MANDANTE, VISITANTE]),
    });

    // Quem estava na zona 2 passa para a 1.
    expect(estados[0].ocupacao[2]).toBe(20);
    expect(estados[1].ocupacao[proximaZona(2)]).toBe(20);
  });

  it('girarEscalacao move o ancora uma posicao', () => {
    const girada = girarEscalacao(escalacaoDeTeste(1));
    const ancora = girada.find((linha) => linha.levantador === 1);

    expect(ancora.zona).toBe(6);
  });
});

describe('Rotacao — substituicao', () => {
  const ehLevantador = (id) => id === 10 || id === 70;

  it('substituicao simples nao muda a rotacao', () => {
    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(1),
      sacaPrimeiro: MANDANTE,
      rallies: rallies([MANDANTE, MANDANTE]),
      substituicoes: [{ pontoTime1: 1, pontoTime2: 0, jogadorSai: 30, jogadorEntra: 99 }],
      ehLevantador,
    });

    expect(estados.map((estado) => estado.rotacao)).toEqual([1, 1]);
    // Quem entra assume o slot de quem saiu.
    expect(estados[1].ocupacao[3]).toBe(99);
  });

  it('troca de levantador por levantador no mesmo slot nao e dupla substituicao', () => {
    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(1),
      sacaPrimeiro: MANDANTE,
      rallies: rallies([MANDANTE, MANDANTE]),
      substituicoes: [{ pontoTime1: 1, pontoTime2: 0, jogadorSai: 10, jogadorEntra: 70 }],
      ehLevantador,
    });

    expect(estados[1].duplaSub).toBe(false);
    expect(estados[1].zonaLevantador).toBe(1);
  });

  /**
   * O caso que decide a modelagem: com a dupla, quem levanta passa a ser o
   * reserva na diagonal. Se a rotacao fosse "a zona de quem levanta", o numero
   * pularia 3 e os seis alinhamentos virariam tres.
   */
  it('dupla substituicao nao faz a rotacao pular 3', () => {
    const ancora = 2;
    const diagonal = zonaDiagonal(ancora); // 5

    const estados = simularSet({
      escalacaoInicial: escalacaoDeTeste(ancora),
      sacaPrimeiro: MANDANTE,
      rallies: rallies([MANDANTE, MANDANTE]),
      substituicoes: [
        // levantador (zona 2) sai, entra o oposto reserva
        { pontoTime1: 1, pontoTime2: 0, jogadorSai: 20, jogadorEntra: 88 },
        // oposto (zona 5, diagonal) sai, entra o levantador reserva
        { pontoTime1: 1, pontoTime2: 0, jogadorSai: diagonal * 10, jogadorEntra: 70 },
      ],
      ehLevantador: (id) => id === 20 || id === 70,
    });

    expect(estados[0].duplaSub).toBe(false);
    expect(estados[0].rotacao).toBe(ancora);

    expect(estados[1].rotacao).toBe(ancora);
    expect(estados[1].duplaSub).toBe(true);
    expect(estados[1].zonaLevantador).toBe(diagonal);
    expect(estados[1].levantadorId).toBe(70);
  });
});

describe('Rotacao — derivada do banco', () => {
  let cenario;

  const control = () => PontoControl.getInstance();

  /** Marca o vencedor do rally e avanca o placar, como a tela faz. */
  const jogarRally = (placar, vencedor) => {
    control().definirVencedorRally(cenario.id, 1, placar.home, placar.away, vencedor);
    if (vencedor === MANDANTE) placar.home += 1;
    else placar.away += 1;
    control().atualizarPlacarSet(cenario.id, 1, placar.home, placar.away);
    return placar;
  };

  const rotacoesGravadas = () =>
    db.prepare(`
      SELECT rotacao, sacando FROM Ponto
      WHERE Set_Partida_id = ? AND NumSet = 1
      ORDER BY (pontoTime1 + pontoTime2) ASC
    `).all(cenario.id);

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioRotacao({ sacaPrimeiro: VISITANTE });
  });

  it('cria o rally mesmo quando so o placar e mexido, sem acao escoutada', () => {
    jogarRally({ home: 0, away: 0 }, MANDANTE);

    const total = db.prepare(
      'SELECT COUNT(*) AS total FROM Ponto WHERE Set_Partida_id = ? AND NumSet = 1'
    ).get(cenario.id);

    expect(total.total).toBe(1);
  });

  it('grava a rotacao de cada rally no banco', () => {
    const placar = { home: 0, away: 0 };
    jogarRally(placar, MANDANTE);
    jogarRally(placar, VISITANTE);
    jogarRally(placar, MANDANTE);

    expect(rotacoesGravadas().map((linha) => linha.rotacao)).toEqual([1, 6, 6]);
    expect(rotacoesGravadas().map((linha) => linha.sacando)).toEqual([VISITANTE, MANDANTE, VISITANTE]);
  });

  it('reconverge depois de corrigir o placar para baixo (undo)', () => {
    const placar = { home: 0, away: 0 };
    jogarRally(placar, MANDANTE);
    jogarRally(placar, VISITANTE);
    const depoisDeDois = rotacoesGravadas();

    // Terceiro rally e o desfazer dele, como o Ctrl+Z da tela faz.
    jogarRally(placar, MANDANTE);
    control().definirVencedorRally(cenario.id, 1, 1, 1, null);
    control().atualizarPlacarSet(cenario.id, 1, 1, 1);
    control().sincronizarRotacoes(cenario.id, 1);

    const depoisDoUndo = rotacoesGravadas().slice(0, 2);
    expect(depoisDoUndo).toEqual(depoisDeDois);
  });

  it('sincronizar duas vezes seguidas nao muda nada', () => {
    const placar = { home: 0, away: 0 };
    jogarRally(placar, MANDANTE);
    jogarRally(placar, VISITANTE);

    const antes = rotacoesGravadas();
    control().sincronizarRotacoes(cenario.id, 1);
    expect(rotacoesGravadas()).toEqual(antes);
  });

  it('set sem formacao declarada fica sem rotacao, em vez de inventar um numero', () => {
    EscalacaoSet.deletarPorSet(cenario.id, 1, db);
    jogarRally({ home: 0, away: 0 }, MANDANTE);

    expect(rotacoesGravadas().every((linha) => linha.rotacao === null)).toBe(true);
  });

  it('girar a formacao recalcula o set inteiro', () => {
    const placar = { home: 0, away: 0 };
    jogarRally(placar, MANDANTE);
    jogarRally(placar, VISITANTE);

    expect(rotacoesGravadas()[0].rotacao).toBe(1);

    EscalacaoSetControl.getInstance().girar(cenario.id, 1);

    expect(rotacoesGravadas()[0].rotacao).toBe(6);
  });

  it('a troca do libero nao mexe na rotacao', () => {
    const placar = { home: 0, away: 0 };
    jogarRally(placar, MANDANTE);

    SubstituicaoControl.getInstance().registrarSubstituicao({
      partidaId: cenario.id,
      numSet: 1,
      pontoTime1: placar.home,
      pontoTime2: placar.away,
      jogadorEntra: cenario.libero,
      jogadorSai: cenario.zonas[4], // ponteiro da zona 5, no fundo
    });

    jogarRally(placar, VISITANTE);

    expect(rotacoesGravadas().map((linha) => linha.rotacao)).toEqual([1, 6]);
  });
});

describe('Rotacao — dupla substituicao no banco', () => {
  let cenario;

  beforeEach(() => {
    resetarBanco();
    // Levantador comeca na zona 2 (ja na rede), que e quando a dupla acontece.
    cenario = cenarioRotacao();
    escalarPorZona({
      partidaId: cenario.id,
      numSet: 1,
      // Z1..Z6: oposto na 5 para ficar diagonal do levantador na 2.
      zonas: [
        cenario.zonas[1],
        cenario.levantador,
        cenario.zonas[2],
        cenario.zonas[4],
        cenario.oposto,
        cenario.zonas[5],
      ],
      levantadorNaZona: 2,
    });
    Ponto.sincronizarRotacoes(cenario.id, 1, db);
  });

  it('a dupla mantem a rotacao e move quem levanta para a diagonal', () => {
    const control = SubstituicaoControl.getInstance();

    control.registrarSubstituicao({
      partidaId: cenario.id, numSet: 1, pontoTime1: 0, pontoTime2: 0,
      jogadorEntra: cenario.opostoReserva, jogadorSai: cenario.levantador,
    });
    control.registrarSubstituicao({
      partidaId: cenario.id, numSet: 1, pontoTime1: 0, pontoTime2: 0,
      jogadorEntra: cenario.levantadorReserva, jogadorSai: cenario.oposto,
    });

    PontoControl.getInstance().definirVencedorRally(cenario.id, 1, 0, 0, MANDANTE);

    const estados = Ponto.buscarEstadosDeRotacao(cenario.id, 1, db);

    expect(estados[0].rotacao).toBe(2);
    expect(estados[0].duplaSub).toBe(true);
    expect(estados[0].zonaLevantador).toBe(5);
    expect(estados[0].levantadorId).toBe(cenario.levantadorReserva);
  });

  it('registrarDuplaSubstituicao aplica as duas trocas de uma vez', () => {
    const resultado = EscalacaoSetControl.getInstance().registrarDuplaSubstituicao({
      partidaId: cenario.id,
      numSet: 1,
      trocas: [
        { jogadorSai: cenario.levantador, jogadorEntra: cenario.opostoReserva },
        { jogadorSai: cenario.oposto, jogadorEntra: cenario.levantadorReserva },
      ],
    });

    expect(resultado.success).toBe(true);

    const total = db.prepare(
      'SELECT COUNT(*) AS total FROM Substituicao WHERE Ponto_Partida_id = ? AND Ponto_NumSet = 1'
    ).get(cenario.id);

    expect(total.total).toBe(2);
  });

  /**
   * O ciclo completo, que e como a tela usa: o botao monta as duas trocas
   * sozinho, nos dois sentidos. Desfazer precisa devolver exatamente quem saiu
   * de cada slot - a regra do par recusaria qualquer outro atleta.
   */
  it('sugere e aplica a dupla, e depois a desfaz pelo mesmo botao', () => {
    const control = EscalacaoSetControl.getInstance();
    const banco = [
      { id: cenario.levantadorReserva },
      { id: cenario.opostoReserva },
    ];

    const fazendo = control.sugerirDuplaSubstituicao(cenario.id, 1, banco);

    expect(fazendo.desfazendo).toBe(false);
    expect(fazendo.trocaAncora.jogadorSai).toBe(cenario.levantador);
    expect(fazendo.trocaAncora.jogadorEntra).toBe(cenario.opostoReserva);
    expect(fazendo.trocaDiagonal.jogadorSai).toBe(cenario.oposto);
    expect(fazendo.trocaDiagonal.jogadorEntra).toBe(cenario.levantadorReserva);

    expect(
      control.registrarDuplaSubstituicao({
        partidaId: cenario.id,
        numSet: 1,
        trocas: [fazendo.trocaAncora, fazendo.trocaDiagonal],
      }).success
    ).toBe(true);

    // Agora o banco tem os titulares que sairam.
    const desfazendo = control.sugerirDuplaSubstituicao(cenario.id, 1, [
      { id: cenario.levantador },
      { id: cenario.oposto },
    ]);

    expect(desfazendo.desfazendo).toBe(true);
    expect(desfazendo.trocaAncora.jogadorSai).toBe(cenario.opostoReserva);
    expect(desfazendo.trocaAncora.jogadorEntra).toBe(cenario.levantador);
    expect(desfazendo.trocaDiagonal.jogadorSai).toBe(cenario.levantadorReserva);
    expect(desfazendo.trocaDiagonal.jogadorEntra).toBe(cenario.oposto);

    expect(
      control.registrarDuplaSubstituicao({
        partidaId: cenario.id,
        numSet: 1,
        pontoTime1: 1,
        trocas: [desfazendo.trocaAncora, desfazendo.trocaDiagonal],
      }).success
    ).toBe(true);

    PontoControl.getInstance().definirVencedorRally(cenario.id, 1, 1, 0, MANDANTE);
    const estados = Ponto.buscarEstadosDeRotacao(cenario.id, 1, db);
    const ultimo = estados[estados.length - 1];

    // Desfeita a dupla, o levantador titular volta ao ancora.
    expect(ultimo.duplaSub).toBe(false);
    expect(ultimo.levantadorId).toBe(cenario.levantador);
  });

  it('recusa a dupla inteira quando uma das trocas e invalida', () => {
    const resultado = EscalacaoSetControl.getInstance().registrarDuplaSubstituicao({
      partidaId: cenario.id,
      numSet: 1,
      trocas: [
        { jogadorSai: cenario.levantador, jogadorEntra: cenario.opostoReserva },
        { jogadorSai: cenario.oposto, jogadorEntra: cenario.oposto },
      ],
    });

    expect(resultado.success).toBe(false);

    const total = db.prepare(
      'SELECT COUNT(*) AS total FROM Substituicao WHERE Ponto_Partida_id = ?'
    ).get(cenario.id);

    expect(total.total).toBe(0);
  });
});

/**
 * O libero nao roda: ele entra no lugar de um jogador de fundo e sai antes de
 * chegar a rede. Por isso ele nunca ocupa zona na formacao declarada - e o
 * caminho dele e a troca, que ja e isenta do limite de substituicoes.
 */
describe('Rotacao — libero', () => {
  let cenario;

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioRotacao();
  });

  it('recusa o libero ocupando uma zona da formacao', () => {
    const zonas = [
      { zona: 1, jogadorId: cenario.levantador, levantador: 1 },
      { zona: 2, jogadorId: cenario.zonas[1], levantador: 0 },
      { zona: 3, jogadorId: cenario.zonas[2], levantador: 0 },
      { zona: 4, jogadorId: cenario.oposto, levantador: 0 },
      { zona: 5, jogadorId: cenario.libero, levantador: 0 },
      { zona: 6, jogadorId: cenario.zonas[5], levantador: 0 },
    ];

    expect(() =>
      EscalacaoSetControl.getInstance().salvar({ partidaId: cenario.id, numSet: 1, zonas })
    ).toThrow(/libero nao ocupa zona/i);
  });

  it('aceita a formacao sem o libero', () => {
    const zonas = cenario.zonas.map((jogadorId, indice) => ({
      zona: indice + 1,
      jogadorId,
      levantador: indice === 0 ? 1 : 0,
    }));

    const resultado = EscalacaoSetControl.getInstance().salvar({
      partidaId: cenario.id,
      numSet: 1,
      zonas,
    });

    expect(resultado.rotacaoInicial).toBe(1);
  });

  it('avisa quando o libero acaba na rede, sinal de troca esquecida', () => {
    const control = PontoControl.getInstance();
    // Recebendo primeiro: assim cada vitoria nossa e side-out e gira de fato.
    EscalacaoSetControl.getInstance().definirSacaPrimeiro(cenario.id, 1, VISITANTE);

    // Libero entra no lugar do central da zona 6 (fundo).
    SubstituicaoControl.getInstance().registrarSubstituicao({
      partidaId: cenario.id, numSet: 1, pontoTime1: 0, pontoTime2: 0,
      jogadorEntra: cenario.libero, jogadorSai: cenario.zonas[5],
    });

    // Dois side-outs levam quem estava na zona 6 ate a 4, que e rede.
    let home = 0;
    let away = 0;
    [MANDANTE, VISITANTE, MANDANTE, VISITANTE, MANDANTE].forEach((vencedor) => {
      control.definirVencedorRally(cenario.id, 1, home, away, vencedor);
      if (vencedor === MANDANTE) home += 1; else away += 1;
      control.atualizarPlacarSet(cenario.id, 1, home, away);
    });

    const estados = Ponto.buscarEstadosDeRotacao(cenario.id, 1, db);

    expect(estados[0].liberoNaRede).toBe(false);
    expect(estados.some((estado) => estado.liberoNaRede)).toBe(true);
  });

  it('a troca do libero nao consome as 6 substituicoes do set', () => {
    const control = SubstituicaoControl.getInstance();

    for (let i = 0; i < 3; i += 1) {
      control.registrarSubstituicao({
        partidaId: cenario.id, numSet: 1, pontoTime1: i, pontoTime2: 0,
        jogadorEntra: i % 2 === 0 ? cenario.libero : cenario.zonas[5],
        jogadorSai: i % 2 === 0 ? cenario.zonas[5] : cenario.libero,
      });
    }

    // Uma substituicao normal ainda passa: as do libero nao contaram.
    const resultado = control.registrarSubstituicao({
      partidaId: cenario.id, numSet: 1, pontoTime1: 4, pontoTime2: 0,
      jogadorEntra: cenario.opostoReserva, jogadorSai: cenario.oposto,
    });

    expect(resultado.success).toBe(true);
  });
});

describe('Relatorio de rotacao', () => {
  let cenario;

  const jogar = (vencedores) => {
    const control = PontoControl.getInstance();
    let home = 0;
    let away = 0;
    vencedores.forEach((vencedor) => {
      control.definirVencedorRally(cenario.id, 1, home, away, vencedor);
      if (vencedor === MANDANTE) home += 1;
      else away += 1;
      control.atualizarPlacarSet(cenario.id, 1, home, away);
    });
  };

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioRotacao({ sacaPrimeiro: VISITANTE });
  });

  it('conta side-out e break separando quem estava sacando', () => {
    // R1 recebendo: ganha (side-out).  R6 sacando: ganha (break).
    // R6 sacando: perde.  R6 recebendo: perde.
    jogar([MANDANTE, MANDANTE, VISITANTE, VISITANTE]);

    const resumo = EstatisticaRotacao.resumoDaPartida(cenario.id, db);
    const porRotacao = Object.fromEntries(resumo.porRotacao.map((l) => [l.rotacao, l]));

    expect(resumo.disponivel).toBe(true);

    expect(porRotacao[1].recebidos).toBe(1);
    expect(porRotacao[1].sideOuts).toBe(1);
    expect(porRotacao[1].sideOutPct).toBe(100);

    expect(porRotacao[6].sacados).toBe(2);
    expect(porRotacao[6].breaks).toBe(1);
    expect(porRotacao[6].breakPct).toBe(50);
    expect(porRotacao[6].recebidos).toBe(1);
    expect(porRotacao[6].sideOuts).toBe(0);
  });

  it('o saldo por rotacao soma o total da partida', () => {
    jogar([MANDANTE, VISITANTE, MANDANTE, MANDANTE, VISITANTE]);

    const resumo = EstatisticaRotacao.resumoDaPartida(cenario.id, db);
    const somaSaldos = resumo.porRotacao.reduce((total, linha) => total + linha.saldo, 0);

    expect(somaSaldos).toBe(resumo.totais.saldo);
    expect(resumo.totais.rallies).toBe(5);
  });

  it('o corte da dupla substituicao cobre os mesmos rallies do total', () => {
    jogar([MANDANTE, VISITANTE, MANDANTE, VISITANTE, MANDANTE, VISITANTE]);

    const resumo = EstatisticaRotacao.resumoDaPartida(cenario.id, db);
    const somaGrupos = resumo.duplaSub.reduce((total, grupo) => total + grupo.rallies, 0);

    expect(somaGrupos).toBe(resumo.totais.rallies);
  });

  it('quebra os fundamentos por rotacao', () => {
    const control = PontoControl.getInstance();
    const partida = { id: cenario.id, time1: cenario.time1, time2: cenario.time2 };
    const atacante = db.prepare('SELECT id, nome FROM Jogadores WHERE id = ?').get(cenario.oposto);

    control.gravarPonto(partida, 1, 0, 0, atacante, TIPO_ACAO.ATAQUE, '#');
    jogar([MANDANTE]);

    const resumo = EstatisticaRotacao.resumoDaPartida(cenario.id, db);
    const ataque = resumo.fundamentos.find((linha) => linha.fundamento === 'Ataque');

    expect(ataque.rotacao).toBe(1);
    expect(ataque.total).toBe(1);
    expect(ataque.pontos).toBe(1);
  });

  it('partida sem formacao declarada nao finge ter rotacao', () => {
    EscalacaoSet.deletarPorPartida(cenario.id, db);
    jogar([MANDANTE, VISITANTE]);

    const resumo = EstatisticaRotacao.resumoDaPartida(cenario.id, db);

    expect(resumo.disponivel).toBe(false);
    expect(resumo.porRotacao).toEqual([]);
  });
});

describe('Rotacao — cascata de exclusao', () => {
  let cenario;

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioRotacao();
  });

  it('excluir o atleta leva a formacao junto', async () => {
    const PlayerControl = (await import('../src/Control/PlayerControl')).default;

    await PlayerControl.getInstance().deletePlayer(cenario.levantador);

    const restante = db.prepare(
      'SELECT COUNT(*) AS total FROM EscalacaoSet WHERE Jogadores_id = ?'
    ).get(cenario.levantador);

    expect(restante.total).toBe(0);
  });

  it('excluir a partida leva a formacao junto', async () => {
    const PartidaControl = (await import('../src/Control/PartidaControl')).default;

    await PartidaControl.getInstance().deletePartida(cenario.id);

    const restante = db.prepare(
      'SELECT COUNT(*) AS total FROM EscalacaoSet WHERE Partida_id = ?'
    ).get(cenario.id);

    expect(restante.total).toBe(0);
  });
});
