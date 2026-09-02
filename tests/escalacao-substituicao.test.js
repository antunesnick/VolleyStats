import { describe, it, expect, beforeEach } from 'vitest';
import TimesPartidaControl from '../src/Control/TimesPartidaControl';
import SubstituicaoControl from '../src/Control/SubstituicaoControl';
import {
  db,
  resetarBanco,
  criarPartida,
  criarJogador,
  escalar,
  cenarioPartidaEscalada,
} from './helpers/fixtures';

describe('Escalacao', () => {
  const control = () => TimesPartidaControl.getInstance();
  let partida;

  beforeEach(() => {
    resetarBanco();
    partida = criarPartida({});
  });

  const jogadores = (quantidade, linha) =>
    Array.from({ length: quantidade }, (_, i) => ({
      jogadorId: criarJogador({ numCamisa: i + 1 }),
      linha,
    }));

  it('salva 6 em quadra e 8 no banco', async () => {
    await control().salvarEscalacao({
      timesId: partida.time1,
      partidaId: partida.id,
      jogadores: [...jogadores(6, 1), ...jogadores(8, 0)],
    });

    const escalacao = await control().findEscalacaoByPartidaId(partida.id, partida.time1);

    expect(escalacao.filter((j) => j.linha === 1)).toHaveLength(6);
    expect(escalacao.filter((j) => j.linha === 0)).toHaveLength(8);
  });

  it('recusa mais de 6 jogadores em quadra', async () => {
    await expect(
      control().salvarEscalacao({
        timesId: partida.time1,
        partidaId: partida.id,
        jogadores: jogadores(7, 1),
      })
    ).rejects.toThrow(/6 jogadores em linha/);
  });

  it('recusa mais de 8 no banco', async () => {
    await expect(
      control().salvarEscalacao({
        timesId: partida.time1,
        partidaId: partida.id,
        jogadores: jogadores(9, 0),
      })
    ).rejects.toThrow(/8 jogadores no banco/);
  });

  it('recusa elenco acima de 14 jogadores', async () => {
    await expect(
      control().salvarEscalacao({
        timesId: partida.time1,
        partidaId: partida.id,
        jogadores: [...jogadores(6, 1), ...jogadores(9, 0)],
      })
    ).rejects.toThrow(/14 jogadores/);
  });

  it('substitui a escalacao anterior em vez de duplicar', async () => {
    await control().salvarEscalacao({
      timesId: partida.time1,
      partidaId: partida.id,
      jogadores: jogadores(6, 1),
    });
    await control().salvarEscalacao({
      timesId: partida.time1,
      partidaId: partida.id,
      jogadores: jogadores(3, 1),
    });

    const escalacao = await control().findEscalacaoByPartidaId(partida.id, partida.time1);
    expect(escalacao).toHaveLength(3);
  });
});

describe('Regras de substituicao do volei', () => {
  const control = () => SubstituicaoControl.getInstance();
  let cenario;

  const substituir = (entra, sai, numSet = 1) =>
    control().registrarSubstituicao({
      partidaId: cenario.id,
      jogadorEntra: entra,
      jogadorSai: sai,
      numSet,
      pontoTime1: 0,
      pontoTime2: 0,
    });

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  it('registra uma substituicao valida', () => {
    const resultado = substituir(cenario.noBanco[0], cenario.emQuadra[0]);

    expect(resultado.success).not.toBe(false);
    expect(control().buscarSubstituicoesDoSet(cenario.id, 1)).toHaveLength(1);
  });

  it('recusa substituir um jogador por ele mesmo', () => {
    const resultado = substituir(cenario.emQuadra[0], cenario.emQuadra[0]);

    expect(resultado.success).toBe(false);
    expect(resultado.message).toMatch(/diferente/i);
  });

  it('exige os dois jogadores', () => {
    const resultado = substituir(null, cenario.emQuadra[0]);

    expect(resultado.success).toBe(false);
  });

  it('permite o reserva voltar pelo mesmo titular que substituiu', () => {
    substituir(cenario.noBanco[0], cenario.emQuadra[0]);

    const volta = substituir(cenario.emQuadra[0], cenario.noBanco[0]);

    expect(volta.success).not.toBe(false);
  });

  it('impede o reserva de sair por um titular diferente', () => {
    substituir(cenario.noBanco[0], cenario.emQuadra[0]);

    const invalida = substituir(cenario.emQuadra[1], cenario.noBanco[0]);

    expect(invalida.success).toBe(false);
  });

  /**
   * Um par titular/reserva rende no maximo 2 substituicoes (o reserva entra e
   * depois devolve a vaga). Para chegar as 6 do regulamento sao 3 pares
   * distintos - reaproveitar o mesmo reserva ja e barrado pela regra de pares.
   */
  const esgotarSubstituicoesDoSet = (numSet = 1) => {
    const reservas = [0, 1, 2].map((i) =>
      criarJogador({ nome: `Extra ${i}`, numCamisa: 20 + i })
    );
    escalar({ timeId: cenario.time1, partidaId: cenario.id, noBanco: reservas });

    reservas.forEach((reserva, i) => {
      expect(substituir(reserva, cenario.emQuadra[i], numSet).success).not.toBe(false);
      expect(substituir(cenario.emQuadra[i], reserva, numSet).success).not.toBe(false);
    });

    expect(control().buscarSubstituicoesDoSet(cenario.id, numSet)).toHaveLength(6);
  };

  it('limita a 6 substituicoes por set', () => {
    esgotarSubstituicoesDoSet(1);

    const excedente = substituir(cenario.noBanco[0], cenario.emQuadra[4]);

    expect(excedente.success).toBe(false);
    expect(excedente.message).toMatch(/[Ll]imite/);
  });

  it('zera a contagem de substituicoes a cada set', () => {
    esgotarSubstituicoesDoSet(1);

    const noSetDois = substituir(cenario.noBanco[0], cenario.emQuadra[4], 2);

    expect(noSetDois.success).not.toBe(false);
  });

  it('identifica o libero pela posicao', () => {
    const libero = criarJogador({ nome: 'Libero', numCamisa: 15, posicao: 'Líbero' });
    escalar({ timeId: cenario.time1, partidaId: cenario.id, noBanco: [libero] });

    expect(control().isLibero(libero)).toBe(true);
    expect(control().isLibero(cenario.emQuadra[0])).toBe(false);
  });

  it('nao conta trocas de libero no limite do set', () => {
    const libero = criarJogador({ nome: 'Libero', numCamisa: 15, posicao: 'Líbero' });
    escalar({ timeId: cenario.time1, partidaId: cenario.id, noBanco: [libero] });

    for (let i = 0; i < 4; i += 1) {
      substituir(libero, cenario.emQuadra[2]);
      substituir(cenario.emQuadra[2], libero);
    }

    // 8 trocas de libero ja aconteceram; uma substituicao normal ainda cabe.
    const normal = substituir(cenario.noBanco[0], cenario.emQuadra[0]);

    expect(normal.success).not.toBe(false);
  });

  it('vincula a substituicao ao rally em que ela ocorreu', () => {
    control().registrarSubstituicao({
      partidaId: cenario.id,
      jogadorEntra: cenario.noBanco[0],
      jogadorSai: cenario.emQuadra[0],
      numSet: 2,
      pontoTime1: 12,
      pontoTime2: 9,
    });

    const registro = db
      .prepare('SELECT Ponto_pontoTime1 h, Ponto_pontoTime2 a, Ponto_NumSet s FROM Substituicao')
      .get();

    expect(registro).toMatchObject({ h: 12, a: 9, s: 2 });
  });
});
