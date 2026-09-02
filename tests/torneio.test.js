import { describe, it, expect, beforeEach } from 'vitest';
import TournamentControl from '../src/Control/TournamentControl';
import PartidaControl from '../src/Control/PartidaControl';
import { Tournament, TournamentType } from '../src/Model/Tournament';
import { resetarBanco, criarTime, criarGinasio } from './helpers/fixtures';

describe('Torneios', () => {
  beforeEach(resetarBanco);

  const dadosBase = (extra = {}) => ({
    name: 'Copa Prudente',
    type: TournamentType.POINTS,
    startDate: '2026-03-01',
    endDate: '2026-03-30',
    ...extra,
  });

  it('cria e lista um torneio', async () => {
    await TournamentControl.createTournament(dadosBase());

    const torneios = await TournamentControl.listTournaments();

    expect(torneios).toHaveLength(1);
    expect(torneios[0].name).toBe('Copa Prudente');
  });

  it('recusa data de termino anterior ao inicio', () => {
    expect(
      () => new Tournament(null, 'Invalido', TournamentType.POINTS, '2026-05-10', '2026-04-01')
    ).toThrow();
  });

  it('busca torneio por id', async () => {
    await TournamentControl.createTournament(dadosBase());
    const [criado] = await TournamentControl.listTournaments();

    const encontrado = await TournamentControl.getTournamentById(criado.id);

    expect(encontrado.name).toBe('Copa Prudente');
  });

  it('recusa id invalido', async () => {
    await expect(TournamentControl.getTournamentById('abc')).rejects.toThrow(/invalido/i);
  });

  it('atualiza um torneio', async () => {
    await TournamentControl.createTournament(dadosBase());
    const [criado] = await TournamentControl.listTournaments();

    await TournamentControl.updateTournament({
      id: criado.id,
      name: 'Copa Prudente 2026',
      type: TournamentType.KNOCKOUT,
      startDate: '2026-03-01',
      endDate: '2026-04-15',
    });

    const atualizado = await TournamentControl.getTournamentById(criado.id);
    expect(atualizado.name).toBe('Copa Prudente 2026');
    expect(Number(atualizado.type)).toBe(TournamentType.KNOCKOUT);
  });

  it('exclui um torneio', async () => {
    await TournamentControl.createTournament(dadosBase());
    const [criado] = await TournamentControl.listTournaments();

    await TournamentControl.deleteTournament(criado.id);

    expect(await TournamentControl.listTournaments()).toHaveLength(0);
  });

  it('lista as partidas vinculadas ao torneio', async () => {
    await TournamentControl.createTournament(dadosBase());
    const [torneio] = await TournamentControl.listTournaments();

    const time1 = criarTime({ nome: 'Prudente' });
    const time2 = criarTime({ nome: 'Bauru' });
    const ginasioId = criarGinasio();

    await PartidaControl.getInstance().createPartida({
      nome: 'Rodada 1',
      dataPartida: '2026-03-05',
      tipo: 1,
      status: 'AGENDADA',
      externa: 0,
      ginasio_id: ginasioId,
      time1,
      time2,
      torneio_id: torneio.id,
    });

    const partidas = await PartidaControl.getInstance().findPartidaByTournamentId(torneio.id);

    expect(partidas).toHaveLength(1);
    expect(partidas[0].nome).toBe('Rodada 1');
  });

  it('gera o relatorio do torneio sem quebrar quando nao ha partidas', async () => {
    await TournamentControl.createTournament(dadosBase());
    const [torneio] = await TournamentControl.listTournaments();

    const relatorio = await TournamentControl.emitirRelatorioTorneio(torneio.id, {});

    expect(relatorio).toBeDefined();
  });

  it('gera o relatorio geral de torneios', async () => {
    await TournamentControl.createTournament(dadosBase());

    const relatorio = await TournamentControl.emitirRelatorioGeralTorneios({});

    expect(relatorio).toBeDefined();
  });
});
