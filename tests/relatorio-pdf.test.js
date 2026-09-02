import { describe, it, expect } from 'vitest';
import {
  blocoDestaques,
  blocoMetricas,
  blocoTabela,
  escapeHtml,
  montarDocumento,
  nomeArquivoRelatorio,
} from '../src/utils/relatorioPdf';

describe('Escape do HTML dos relatorios', () => {
  it('neutraliza os caracteres que quebrariam o documento', () => {
    expect(escapeHtml('<script>alert("x")</script>'))
      .toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });

  it('escapa o & antes das outras entidades, sem escapar duas vezes', () => {
    expect(escapeHtml('Sesi & Bauru')).toBe('Sesi &amp; Bauru');
    expect(escapeHtml('<a>')).toBe('&lt;a&gt;');
  });

  it('trata nulo e indefinido como texto vazio', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
    expect(escapeHtml(0)).toBe('0');
  });
});

describe('Documento do relatorio', () => {
  it('monta o esqueleto com titulo, chapeu e corpo', () => {
    const html = montarDocumento({
      titulo: 'Categorias',
      eyebrow: 'Relatorio Geral',
      subtitulo: 'Filtros: todos',
      corpo: '<p>conteudo</p>',
    });

    expect(html).toContain('<!doctype html>');
    expect(html).toContain('<title>Categorias</title>');
    expect(html).toContain('<h1>Categorias</h1>');
    expect(html).toContain('Relatorio Geral');
    expect(html).toContain('Filtros: todos');
    expect(html).toContain('<p>conteudo</p>');
  });

  it('escapa o titulo, que vem de nome cadastrado pelo usuario', () => {
    const html = montarDocumento({ titulo: 'Time <b>A</b>' });

    expect(html).toContain('<h1>Time &lt;b&gt;A&lt;/b&gt;</h1>');
    expect(html).not.toContain('<b>A</b>');
  });

  it('omite o subtitulo quando nao ha contexto para mostrar', () => {
    expect(montarDocumento({ titulo: 'X' })).not.toContain('class="meta"');
  });
});

describe('Blocos reutilizaveis', () => {
  it('monta os cartoes de metrica e marca o destaque', () => {
    const html = blocoMetricas([
      { rotulo: 'Partidas', valor: 12 },
      { rotulo: 'Vitorias', valor: 9, destaque: true },
    ]);

    expect(html).toContain('<span>Partidas</span>');
    expect(html).toContain('<strong>12</strong>');
    expect(html).toContain('class="metric featured"');
  });

  it('devolve vazio quando nao ha metrica nenhuma', () => {
    expect(blocoMetricas([])).toBe('');
    expect(blocoDestaques([])).toBe('');
  });

  it('usa "Sem dados" no destaque sem valor', () => {
    expect(blocoDestaques([{ rotulo: 'Maior pontuador' }])).toContain('Sem dados');
  });

  it('respeita o numero de colunas pedido', () => {
    expect(blocoMetricas([{ rotulo: 'A', valor: 1 }], { colunas: 3 }))
      .toContain('repeat(3, 1fr)');
  });

  // O colspan da linha vazia ja tinha desencontrado do cabecalho numa das
  // copias antigas (38 colunas para uma tabela de 37). Agora ele e derivado.
  it('deriva o colspan da linha vazia do proprio cabecalho', () => {
    const html = blocoTabela({
      titulo: 'Jogadores',
      colunas: ['Nome', { rotulo: 'Acoes', center: true }, { rotulo: 'Pontos', center: true }],
      linhas: [],
      vazio: 'Nenhum jogador.',
    });

    expect(html).toContain('colspan="3"');
    expect(html).toContain('Nenhum jogador.');
    expect(html).toContain('<th>Nome</th>');
    expect(html).toContain('<th class="center">Acoes</th>');
  });

  it('usa as linhas montadas pela tela quando existem', () => {
    const html = blocoTabela({
      colunas: ['Nome'],
      linhas: ['<tr><td>Ana</td></tr>', '<tr><td>Bia</td></tr>'],
    });

    expect(html).toContain('<td>Ana</td>');
    expect(html).toContain('<td>Bia</td>');
    expect(html).not.toContain('colspan');
  });
});

describe('Nome do arquivo', () => {
  it('junta as partes em um slug com extensao', () => {
    expect(nomeArquivoRelatorio('relatorio', 'time', 'Volei Prudente'))
      .toBe('relatorio-time-volei-prudente.pdf');
  });

  it('tira acento e pontuacao, que quebram o nome do arquivo no Windows', () => {
    expect(nomeArquivoRelatorio('relatorio', 'Ginásio Poliesportivo: Zona/Norte'))
      .toBe('relatorio-ginasio-poliesportivo-zona-norte.pdf');
  });

  it('ignora partes vazias e cai num nome padrao', () => {
    expect(nomeArquivoRelatorio('relatorio', null, '', undefined)).toBe('relatorio.pdf');
    expect(nomeArquivoRelatorio('')).toBe('relatorio.pdf');
  });
});
