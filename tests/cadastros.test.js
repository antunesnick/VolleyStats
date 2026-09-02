import { describe, it, expect, beforeEach } from 'vitest';
import CategoriaControl from '../src/Control/CategoriaControl';
import GinasioControl from '../src/Control/GinasioControl';
import TimesControl from '../src/Control/TimesControl';
import { resetarBanco } from './helpers/fixtures';

describe('Categorias', () => {
  const control = () => CategoriaControl.getInstance();

  beforeEach(resetarBanco);

  it('cadastra e lista uma categoria', async () => {
    await control().cadastrarDados({ nome: 'Sub-19', idadeMin: 16, idadeMax: 19 });

    const categorias = await control().listarCategorias();

    expect(categorias).toHaveLength(1);
    expect(categorias[0]).toMatchObject({ nome: 'Sub-19', idadeMin: 16, idadeMax: 19 });
  });

  it('recusa faixa etaria invertida', async () => {
    await expect(
      control().cadastrarDados({ nome: 'Invalida', idadeMin: 30, idadeMax: 18 })
    ).rejects.toThrow();
  });

  it('edita uma categoria existente', async () => {
    const id = await control().cadastrarDados({ nome: 'Adulto', idadeMin: 18, idadeMax: 40 });
    await control().editarCategoria(id, { nome: 'Adulto Master', idadeMin: 30, idadeMax: 55 });

    const [categoria] = await control().listarCategorias();
    expect(categoria).toMatchObject({ nome: 'Adulto Master', idadeMin: 30, idadeMax: 55 });
  });

  it('recusa idade minima abaixo do permitido pela federacao', async () => {
    await expect(
      control().cadastrarDados({ nome: 'Infantil', idadeMin: 8, idadeMax: 11 })
    ).rejects.toThrow(/12/);
  });

  it('exclui uma categoria', async () => {
    const id = await control().cadastrarDados({ nome: 'Temporaria', idadeMin: 12, idadeMax: 14 });
    await control().excluirCategoria(id);

    expect(await control().listarCategorias()).toHaveLength(0);
  });
});

describe('Ginasios', () => {
  const dados = {
    nome: 'Ginasio Watal Ishibashi',
    estado: 'SP',
    cidade: 'Presidente Prudente',
    endereco: 'Rua X, 123',
  };

  beforeEach(resetarBanco);

  it('cadastra e lista um ginasio', async () => {
    await GinasioControl.cadastrarDados(dados);

    const ginasios = await GinasioControl.listarGinasios();
    expect(ginasios).toHaveLength(1);
    expect(ginasios[0].nome).toBe(dados.nome);
  });

  it('exige os campos obrigatorios', async () => {
    await expect(GinasioControl.cadastrarDados({ ...dados, nome: '' })).rejects.toThrow();
  });

  it('impede dois ginasios com mesmo nome na mesma cidade', async () => {
    await GinasioControl.cadastrarDados(dados);

    await expect(GinasioControl.cadastrarDados(dados)).rejects.toThrow();
  });

  it('permite o mesmo nome em cidades diferentes', async () => {
    await GinasioControl.cadastrarDados(dados);

    await expect(
      GinasioControl.cadastrarDados({ ...dados, cidade: 'Bauru' })
    ).resolves.toBeDefined();
  });

  it('pesquisa por nome', async () => {
    await GinasioControl.cadastrarDados(dados);
    await GinasioControl.cadastrarDados({ ...dados, nome: 'Ginasio SESI', cidade: 'Bauru' });

    const encontrados = await GinasioControl.pesquisarGinasio({ nome: 'SESI' });

    expect(encontrados).toHaveLength(1);
    expect(encontrados[0].nome).toBe('Ginasio SESI');
  });

  it('exclui um ginasio', async () => {
    const id = await GinasioControl.cadastrarDados(dados);
    await GinasioControl.excluirGinasio(id);

    expect(await GinasioControl.listarGinasios()).toHaveLength(0);
  });
});

describe('Times', () => {
  const control = () => TimesControl.getInstance();

  beforeEach(resetarBanco);

  it('cadastra e lista um time', async () => {
    await control().createTime({ nome: 'Volei Prudente', cidade: 'Presidente Prudente' });

    const times = await control().findAllTimes();
    expect(times).toHaveLength(1);
    expect(times[0].nome).toBe('Volei Prudente');
  });

  it('exige nome e cidade', async () => {
    await expect(control().createTime({ nome: '', cidade: 'Bauru' })).rejects.toThrow();
  });

  it('impede time com nome duplicado', async () => {
    await control().createTime({ nome: 'Sesi Bauru', cidade: 'Bauru' });

    await expect(control().createTime({ nome: 'Sesi Bauru', cidade: 'Bauru' })).rejects.toThrow();
  });

  it('exclui um time', async () => {
    const id = await control().createTime({ nome: 'Efemero', cidade: 'Osasco' });
    await control().deleteTime(id);

    expect(await control().findAllTimes()).toHaveLength(0);
  });
});
