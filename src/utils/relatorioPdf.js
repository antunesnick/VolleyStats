/**
 * Esqueleto unico dos relatorios em PDF.
 *
 * Todas as telas que emitem PDF montam HTML e mandam para
 * `window.reportAPI.salvarPdf`, que renderiza numa BrowserWindow offscreen.
 * Antes deste modulo cada tela reescrevia o `escapeHtml`, o `<head>` e a folha
 * de estilo inteira - oito copias que ja tinham divergido em padding, tamanho
 * de fonte e ate no nome da classe do subtitulo (`.meta`, `.sub`, `.city`).
 *
 * Aqui ficam o estilo e os blocos comuns. Cada tela continua dona do conteudo:
 * passa o corpo pronto para `montarDocumento`.
 */

/** Escapa texto vindo do banco antes de entrar no HTML do relatorio. */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Folha de estilo dos relatorios: preto, vermelho #dc2626 e cinzas, como o app.
 *
 * `.meta`, `.sub` e `.city` sao o mesmo subtitulo com tres nomes - os tres
 * existiam nas copias antigas e continuam validos para nao quebrar nenhum corpo.
 */
const ESTILO = `
    * { box-sizing: border-box; }
    body { margin: 0; padding: 32px; font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; }

    header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding: 22px 24px; color: #ffffff; background: #000000; border-bottom: 6px solid #dc2626; border-radius: 14px 14px 0 0; }
    .eyebrow { margin: 0 0 6px; color: #f87171; font-size: 11px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; }
    h1 { margin: 0; font-size: 30px; line-height: 1; text-transform: uppercase; }
    .meta, .sub, .city { margin-top: 8px; color: #d1d5db; font-size: 13px; font-weight: 700; }
    .avatar { width: 72px; height: 72px; display: flex; align-items: center; justify-content: center; flex: 0 0 auto; border-radius: 12px; background: #dc2626; color: #ffffff; font-size: 30px; font-weight: 900; }

    .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
    .metric { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #ffffff; }
    .metric.featured { color: #ffffff; background: #000000; border-color: #000000; }
    .metric span { display: block; color: #6b7280; font-size: 10px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; }
    .metric.featured span { color: #f87171; }
    .metric strong { display: block; margin-top: 8px; font-size: 26px; font-weight: 900; }

    .highlights { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 22px; }
    .highlight { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #f9fafb; }
    .highlight span { display: block; color: #6b7280; font-size: 10px; font-weight: 900; letter-spacing: 1.4px; text-transform: uppercase; }
    .highlight strong { display: block; margin-top: 8px; font-size: 15px; line-height: 1.3; font-weight: 900; }

    .section { margin-top: 20px; }
    .section h2 { margin: 0 0 10px; color: #dc2626; font-size: 14px; letter-spacing: 1px; text-transform: uppercase; }

    .table-title { margin: 26px 0 0; padding: 14px 18px; background: #dc2626; color: #ffffff; font-size: 18px; font-weight: 900; text-transform: uppercase; border-radius: 12px 12px 0 0; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #e5e7eb; }
    th { padding: 11px; background: #000000; color: #ffffff; font-size: 10px; letter-spacing: 1px; text-align: left; text-transform: uppercase; }
    td { padding: 12px 11px; border-bottom: 1px solid #f3f4f6; font-size: 12px; vertical-align: top; }
    td span { display: block; margin-top: 4px; color: #6b7280; font-size: 10px; font-weight: 700; }
    .center { text-align: center; }
    .emph { color: #dc2626; font-weight: 900; }

    /* Tabela de muitas colunas (o scout tem 40): so assim cabe na pagina. */
    table.compacta { font-size: 10px; }
    table.compacta th { padding: 8px 6px; letter-spacing: 0.6px; }
    table.compacta td { padding: 8px 6px; }
    /* Tabela de poucas colunas nao precisa ocupar a largura toda. */
    .tabela.estreita, .sets { max-width: 420px; }

    .tag { display: inline-block; min-width: 78px; padding: 5px 8px; border-radius: 999px; color: #ffffff; font-size: 9px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; text-align: center; }
    .tag.win { background: #dc2626; }
    .tag.loss { background: #000000; }
    .tag.pending { background: #e5e7eb; color: #374151; }

    /* Tabela larga (scout) nao pode ser cortada na pagina do PDF. */
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }
`;

/**
 * Documento completo do relatorio.
 *
 * @param {string} titulo    - vai no <h1> e no <title>.
 * @param {string} eyebrow   - rotulo pequeno acima do titulo.
 * @param {string|string[]} subtitulo - linha(s) de contexto (filtros, data, endereco...).
 * @param {string} aside     - HTML opcional a direita do cabecalho (ex.: avatar).
 * @param {string} corpo     - HTML das secoes, ja montado pela tela.
 */
export function montarDocumento({ titulo, eyebrow = 'Relatorio', subtitulo = '', aside = '', corpo = '' }) {
  return `
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(titulo)}</title>
        <style>${ESTILO}</style>
      </head>
      <body>
        <header>
          <div>
            <p class="eyebrow">${escapeHtml(eyebrow)}</p>
            <h1>${escapeHtml(titulo)}</h1>
            ${(Array.isArray(subtitulo) ? subtitulo : [subtitulo])
              .filter((linha) => linha !== null && linha !== undefined && String(linha).trim() !== '')
              .map((linha) => `<div class="meta">${escapeHtml(linha)}</div>`)
              .join('')}
          </div>
          ${aside}
        </header>
        ${corpo}
      </body>
    </html>
  `;
}

/**
 * Cartoes de numero. `destaque` inverte as cores (preto no vermelho do app).
 * @param {Array<{rotulo: string, valor: any, destaque?: boolean}>} itens
 */
export function blocoMetricas(itens = [], { colunas = 4 } = {}) {
  if (itens.length === 0) return '';

  const cartoes = itens
    .map((item) => `
          <div class="metric${item.destaque ? ' featured' : ''}">
            <span>${escapeHtml(item.rotulo)}</span>
            <strong>${escapeHtml(item.valor ?? 0)}</strong>
          </div>`)
    .join('');

  return `
        <section class="metrics" style="grid-template-columns: repeat(${colunas}, 1fr);">${cartoes}
        </section>`;
}

/**
 * Cartoes de texto (o melhor sacador, o ginasio mais usado...).
 * @param {Array<{rotulo: string, valor: any}>} itens
 */
export function blocoDestaques(itens = [], { colunas = 3 } = {}) {
  if (itens.length === 0) return '';

  const cartoes = itens
    .map((item) => `
          <div class="highlight">
            <span>${escapeHtml(item.rotulo)}</span>
            <strong>${escapeHtml(item.valor ?? 'Sem dados')}</strong>
          </div>`)
    .join('');

  return `
        <section class="highlights" style="grid-template-columns: repeat(${colunas}, 1fr);">${cartoes}
        </section>`;
}

/**
 * Tabela com titulo.
 *
 * `linhas` sao `<tr>` ja montados pela tela - e o unico jeito de comportar
 * desde a tabela de 5 colunas dos cadastros ate a de 40 do scout. O `colspan`
 * da linha vazia sai de `colunas`, entao ele nunca mais desencontra do
 * cabecalho.
 *
 * @param {Array<string|{rotulo: string, center?: boolean}>} colunas
 * @param {string[]} linhas
 */
export function blocoTabela({
  titulo = '',
  colunas = [],
  linhas = [],
  vazio = 'Nenhum registro encontrado.',
  compacta = false,
  estreita = false,
}) {
  const cabecalho = colunas
    .map((coluna) => {
      const { rotulo, center } = typeof coluna === 'string' ? { rotulo: coluna, center: false } : coluna;
      return `<th${center ? ' class="center"' : ''}>${escapeHtml(rotulo)}</th>`;
    })
    .join('');

  const corpo = linhas.length > 0
    ? linhas.join('')
    : `<tr><td colspan="${colunas.length}" class="center">${escapeHtml(vazio)}</td></tr>`;

  return `
        <section class="tabela${estreita ? ' estreita' : ''}">
          ${titulo ? `<h2 class="table-title">${escapeHtml(titulo)}</h2>` : ''}
          <table${compacta ? ' class="compacta"' : ''}>
            <thead><tr>${cabecalho}</tr></thead>
            <tbody>${corpo}</tbody>
          </table>
        </section>`;
}

/** Nome de arquivo previsivel: `relatorio-time-volei-prudente.pdf`. */
export function nomeArquivoRelatorio(...partes) {
  const slug = partes
    .filter((parte) => parte !== null && parte !== undefined && String(parte).trim() !== '')
    .join('-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `${slug || 'relatorio'}.pdf`;
}

/**
 * Envia o HTML para o processo principal gerar o PDF.
 *
 * A checagem do `reportAPI` estava repetida em algumas telas e faltando em
 * outras - ali o erro so aparecia como "cannot read property of undefined".
 */
export async function salvarRelatorioPdf({ nomeArquivo, html }) {
  if (!window.reportAPI?.salvarPdf) {
    throw new Error('Geração de PDF indisponível nesta janela.');
  }

  return window.reportAPI.salvarPdf({ nomeArquivo, html });
}
