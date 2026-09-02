import { describe, it, expect, beforeEach } from 'vitest';
import PlayerControl from '../src/Control/PlayerControl';
import PositionControl from '../src/Control/PositionControl';
import { resetarBanco, criarCategoria, idPosicao } from './helpers/fixtures';

describe('Jogadores', () => {
  const control = () => PlayerControl.getInstance();
  let categoriaId;

  // CPFs sinteticos com digito verificador valido.
  const CPF_VALIDO = '529.982.247-25';
  const CPF_INVALIDO = '111.111.111-11';

  const dadosBase = (extra = {}) => ({
    cpf: CPF_VALIDO,
    nome: 'Ana Levantadora',
    dataNasc: '2001-05-12',
    numCamisa: 10,
    rg: '12.345.678-9',
    altura: 1.82,
    posicaoId: idPosicao('Levantador'),
    categoria_id: categoriaId,
    foto: null,
    ...extra,
  });

  beforeEach(() => {
    resetarBanco();
    categoriaId = criarCategoria();
  });

  it('cadastra um jogador com CPF valido', async () => {
    await control().createPlayer(dadosBase());

    const jogadores = await control().findAllPlayers();
    expect(jogadores).toHaveLength(1);
    expect(jogadores[0].nome).toBe('Ana Levantadora');
  });

  it('recusa CPF invalido', async () => {
    await expect(control().createPlayer(dadosBase({ cpf: CPF_INVALIDO }))).rejects.toThrow(/CPF/);
  });

  it('impede dois jogadores com o mesmo CPF', async () => {
    await control().createPlayer(dadosBase());

    await expect(
      control().createPlayer(dadosBase({ nome: 'Outra Pessoa', rg: '98.765.432-1' }))
    ).rejects.toThrow();
  });

  it('atualiza os dados de um jogador', async () => {
    await control().createPlayer(dadosBase());
    const [jogador] = await control().findAllPlayers();

    await control().updatePlayer(dadosBase({ id: jogador.id, nome: 'Ana Maria', numCamisa: 7 }));

    const [atualizado] = await control().findAllPlayers();
    expect(atualizado.nome).toBe('Ana Maria');
    expect(atualizado.numCamisa).toBe(7);
  });

  it('exclui um jogador', async () => {
    await control().createPlayer(dadosBase());
    const [jogador] = await control().findAllPlayers();

    await control().deletePlayer(jogador.id);

    expect(await control().findAllPlayers()).toHaveLength(0);
  });

  it('filtra jogadores por nome', async () => {
    await control().createPlayer(dadosBase());
    await control().createPlayer(
      dadosBase({ cpf: '390.533.447-05', nome: 'Bruno Central', rg: '11.222.333-4', numCamisa: 12 })
    );

    const encontrados = await control().findPlayerFiltered({ nome: 'Bruno' });

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe('Bruno Central');
  });
});

describe('Posicoes', () => {
  beforeEach(resetarBanco);

  it('traz as cinco posicoes do volei', async () => {
    const posicoes = await PositionControl.getInstance().findAllPositions();

    expect(posicoes.map((p) => p.nome).sort()).toEqual(
      ['Central', 'Levantador', 'Líbero', 'Oposto', 'Ponteiro'].sort()
    );
  });
});
