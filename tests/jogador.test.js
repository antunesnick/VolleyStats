import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
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

  it('recusa CPF invalido tambem na atualizacao', async () => {
    await control().createPlayer(dadosBase());
    const [jogador] = await control().findAllPlayers();

    await expect(
      control().updatePlayer({ ...dadosBase({ cpf: CPF_INVALIDO }), id: jogador.id })
    ).rejects.toThrow(/CPF/);
  });

  // A validacao do CPF roda antes de a foto ser escrita em disco. Na ordem
  // antiga cada tentativa recusada deixava um arquivo orfao em uploads/.
  it('nao deixa foto orfa quando o CPF e recusado', async () => {
    const dataDirOriginal = process.env.VOLLEYSTATS_DATA_DIR;
    const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'volleystats-teste-'));
    process.env.VOLLEYSTATS_DATA_DIR = dataDir;

    const uploads = path.join(dataDir, 'uploads');
    const listarUploads = () => (fs.existsSync(uploads) ? fs.readdirSync(uploads) : []);
    const foto = `data:image/png;base64,${Buffer.from('conteudo-de-teste').toString('base64')}`;

    try {
      await expect(
        control().createPlayer(dadosBase({ cpf: CPF_INVALIDO, foto }))
      ).rejects.toThrow(/CPF/);

      expect(listarUploads()).toEqual([]);

      // Controle positivo: com CPF valido a foto continua sendo gravada.
      await control().createPlayer(dadosBase({ foto }));
      expect(listarUploads()).toHaveLength(1);
    } finally {
      if (dataDirOriginal === undefined) {
        delete process.env.VOLLEYSTATS_DATA_DIR;
      } else {
        process.env.VOLLEYSTATS_DATA_DIR = dataDirOriginal;
      }
      fs.rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('impede dois jogadores com o mesmo CPF', async () => {
    await control().createPlayer(dadosBase());

    await expect(
      control().createPlayer(dadosBase({ nome: 'Outra Pessoa', rg: '98.765.432-1' }))
    ).rejects.toThrow(/CPF/i);
  });

  it('impede dois jogadores com o mesmo RG', async () => {
    await control().createPlayer(dadosBase());

    await expect(
      control().createPlayer(dadosBase({ nome: 'Outra Pessoa', cpf: '390.533.447-05' }))
    ).rejects.toThrow(/RG/i);
  });

  // CPF e RG sao UNIQUE e opcionais. Duas strings vazias colidem no SQLite,
  // dois NULL nao - sem a normalizacao o segundo cadastro sem documento era
  // recusado como se o documento ja existisse.
  it('cadastra varios jogadores sem CPF nem RG', async () => {
    await control().createPlayer(dadosBase({ cpf: '', rg: '', nome: 'Sem Documento 1' }));
    await control().createPlayer(dadosBase({ cpf: '', rg: '', nome: 'Sem Documento 2', numCamisa: 11 }));
    await control().createPlayer(dadosBase({ cpf: '   ', rg: undefined, nome: 'Sem Documento 3', numCamisa: 12 }));

    const jogadores = await control().findAllPlayers();
    expect(jogadores).toHaveLength(3);
    expect(jogadores.every((jogador) => jogador.cpf === null && jogador.rg === null)).toBe(true);
  });

  it('grava vazio como NULL tambem na atualizacao', async () => {
    await control().createPlayer(dadosBase());
    const [jogador] = await control().findAllPlayers();

    await control().updatePlayer(dadosBase({ id: jogador.id, cpf: '', rg: '' }));

    const [atualizado] = await control().findAllPlayers();
    expect(atualizado.cpf).toBeNull();
    expect(atualizado.rg).toBeNull();
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
