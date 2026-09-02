import { describe, it, expect, beforeEach } from 'vitest';
import PartidaControl from '../src/Control/PartidaControl';
import PontoControl from '../src/Control/PontoControl';
import { db, resetarBanco, criarTime, criarGinasio, cenarioPartidaEscalada, TIPO_ACAO } from './helpers/fixtures';

describe('Partidas', () => {
  const control = () => PartidaControl.getInstance();
  let time1;
  let time2;
  let ginasioId;

  const dadosBase = (extra = {}) => ({
    nome: 'Prudente x Bauru',
    pontosTime1: 0,
    pontosTime2: 0,
    dataPartida: '2026-04-15',
    tipo: 1,
    status: 'AGENDADA',
    externa: 0,
    ginasio_id: ginasioId,
    time1,
    time2,
    torneio_id: null,
    videoLink: null,
    ...extra,
  });

  beforeEach(() => {
    resetarBanco();
    time1 = criarTime({ nome: 'Volei Prudente' });
    time2 = criarTime({ nome: 'Sesi Bauru' });
    ginasioId = criarGinasio();
  });

  it('cria e busca uma partida', async () => {
    await control().createPartida(dadosBase());

    const partidas = await control().findAllPartidas();
    expect(partidas).toHaveLength(1);
    expect(partidas[0].nome).toBe('Prudente x Bauru');
  });

  it('marca a partida como em andamento ao iniciar', async () => {
    await control().createPartida(dadosBase());
    const [partida] = await control().findAllPartidas();

    await control().iniciarPartida(partida.id);

    const atualizada = await control().findPartidaById(partida.id);
    expect(atualizada.status).toBe('EM_ANDAMENTO');
  });

  it('grava o resultado ao finalizar', async () => {
    await control().createPartida(dadosBase());
    const [partida] = await control().findAllPartidas();

    await control().finalizarPartida(partida.id, 3, 1);

    const atualizada = await control().findPartidaById(partida.id);
    expect(atualizada.pontosTime1).toBe(3);
    expect(atualizada.pontosTime2).toBe(1);
  });

  it('exclui a partida junto com todo o scout dela', async () => {
    const cenario = cenarioPartidaEscalada();
    const jogador = db.prepare('SELECT id FROM Jogadores WHERE numCamisa = 6').get();

    PontoControl.getInstance().gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      1,
      0,
      0,
      jogador,
      TIPO_ACAO.ATAQUE,
      '#'
    );

    expect(db.prepare('SELECT COUNT(*) c FROM Acao').get().c).toBe(1);

    await control().deletePartida(cenario.id);

    // Sem a cascata manual sobrariam linhas orfas em Acao/Ponto/Set.
    expect(db.prepare('SELECT COUNT(*) c FROM Acao').get().c).toBe(0);
    expect(db.prepare('SELECT COUNT(*) c FROM Ponto').get().c).toBe(0);
    expect(db.prepare('SELECT COUNT(*) c FROM "Set"').get().c).toBe(0);
    expect(db.prepare('SELECT COUNT(*) c FROM TimesPartida').get().c).toBe(0);
  });

  it('recusa link de video malformado', async () => {
    await control().createPartida(dadosBase());
    const [partida] = await control().findAllPartidas();

    await expect(control().updateVideoLink(partida.id, 'nao-e-uma-url')).rejects.toThrow();
  });

  it('filtra partidas pelo time, achando mandante e visitante', async () => {
    const osasco = criarTime({ nome: 'Osasco Volei' });
    await control().createPartida(dadosBase());
    await control().createPartida(dadosBase({ nome: 'Osasco x Bauru', time1: osasco }));
    await control().createPartida(dadosBase({ nome: 'Bauru x Osasco', time1: time2, time2: osasco }));

    const encontradas = await control().findPartidaByDateAndTeam({ timeId: osasco }, null);

    expect(encontradas.map((p) => p.nome).sort()).toEqual(['Bauru x Osasco', 'Osasco x Bauru']);
  });

  it('filtra partidas por data', async () => {
    await control().createPartida(dadosBase({ dataPartida: '2026-04-15' }));
    await control().createPartida(dadosBase({ nome: 'Outro dia', dataPartida: '2026-05-20' }));

    const encontradas = await control().findPartidaByDateAndTeam({ dataPartida: '2026-05-20' }, null);

    expect(encontradas).toHaveLength(1);
    expect(encontradas[0].nome).toBe('Outro dia');
  });
});

describe('Placar e sets', () => {
  let cenario;
  const control = () => PontoControl.getInstance();

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  it('guarda e le o placar de um set', () => {
    control().atualizarPlacarSet(cenario.id, 1, 25, 21);

    expect(control().buscarPlacarSet(cenario.id, 1)).toEqual({ home: 25, away: 21 });
  });

  it('mantem placares independentes por set', () => {
    control().atualizarPlacarSet(cenario.id, 1, 25, 20);
    control().atualizarPlacarSet(cenario.id, 2, 18, 25);

    expect(control().buscarPlacarSet(cenario.id, 1)).toEqual({ home: 25, away: 20 });
    expect(control().buscarPlacarSet(cenario.id, 2)).toEqual({ home: 18, away: 25 });
  });

  it('devolve zero para um set que ainda nao existe', () => {
    expect(control().buscarPlacarSet(cenario.id, 5)).toEqual({ home: 0, away: 0 });
  });

  it('nao conta set ganho enquanto nenhum set foi encerrado', () => {
    control().atualizarPlacarSet(cenario.id, 1, 25, 20);

    // O placar sozinho nao decide nada: sets ganhos saem de "Set".encerrado.
    expect(control().buscarSetsGanhos(cenario.id)).toEqual({ home: 0, away: 0 });
  });
});

/**
 * O ciclo que a tela do scout dirige: encerrar um set fecha o placar dele,
 * deriva os sets ganhos e abre o proximo. Antes disso o set ficava aberto para
 * sempre - o placar nunca virava resultado e a partida nao fechava sozinha.
 */
describe('Ciclo de vida do set', () => {
  let cenario;
  const control = () => PontoControl.getInstance();

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  const setGravado = (numSet) =>
    db.prepare('SELECT pontosTime1, pontosTime2, encerrado FROM "Set" WHERE Partida_id = ? AND NumSet = ?')
      .get(cenario.id, numSet);

  it('fecha o set com o placar e aponta o proximo', () => {
    const resultado = control().avancarSet(cenario.id, 1, 25, 20);

    expect(resultado.proximoSet).toBe(2);
    expect(resultado.setsGanhos).toEqual({ home: 1, away: 0 });
    expect(setGravado(1)).toEqual({ pontosTime1: 25, pontosTime2: 20, encerrado: 1 });
    expect(control().setEstaEncerrado(cenario.id, 1)).toBe(true);
  });

  it('so conta como set ganho o set que foi encerrado', () => {
    control().avancarSet(cenario.id, 1, 25, 20);
    // Set 2 em andamento: placar gravado, mas ainda aberto.
    control().atualizarPlacarSet(cenario.id, 2, 24, 22);

    expect(control().buscarSetsGanhos(cenario.id)).toEqual({ home: 1, away: 0 });
    expect(control().setEstaEncerrado(cenario.id, 2)).toBe(false);
  });

  it('encerrar o mesmo set duas vezes nao soma dois sets', () => {
    control().avancarSet(cenario.id, 1, 25, 20);
    // Corrigir o placar de um set ja encerrado regrava, nao duplica.
    const resultado = control().avancarSet(cenario.id, 1, 25, 23);

    expect(resultado.setsGanhos).toEqual({ home: 1, away: 0 });
    expect(setGravado(1).pontosTime2).toBe(23);
  });

  it('reabrir o set devolve a contagem de sets ganhos', () => {
    control().avancarSet(cenario.id, 1, 25, 20);
    control().avancarSet(cenario.id, 2, 22, 25);
    expect(control().buscarSetsGanhos(cenario.id)).toEqual({ home: 1, away: 1 });

    expect(control().reabrirSet(cenario.id, 2)).toEqual({ home: 1, away: 0 });
    expect(control().setEstaEncerrado(cenario.id, 2)).toBe(false);
  });

  it('espelha os sets ganhos em Partidas, que e o que os relatorios leem', () => {
    control().avancarSet(cenario.id, 1, 25, 20);
    control().avancarSet(cenario.id, 2, 25, 18);

    const partida = db.prepare('SELECT pontosTime1, pontosTime2 FROM Partidas WHERE id = ?').get(cenario.id);
    expect(partida).toEqual({ pontosTime1: 2, pontosTime2: 0 });
  });

  it('lista os sets da partida em ordem, com placar e situacao', () => {
    control().avancarSet(cenario.id, 1, 25, 20);
    control().atualizarPlacarSet(cenario.id, 2, 0, 0);

    expect(control().buscarSetsDaPartida(cenario.id)).toEqual([
      { numSet: 1, home: 25, away: 20, encerrado: true },
      { numSet: 2, home: 0, away: 0, encerrado: false },
    ]);
  });

  it('abre o proximo set zerado, sem herdar o placar do anterior', () => {
    control().avancarSet(cenario.id, 1, 25, 20);
    control().atualizarPlacarSet(cenario.id, 2, 0, 0);

    expect(control().buscarPlacarSet(cenario.id, 2)).toEqual({ home: 0, away: 0 });
  });
});
