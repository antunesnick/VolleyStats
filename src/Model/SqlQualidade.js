/**
 * Fragmentos SQL que classificam uma linha de Acao em ponto / erro / neutra.
 *
 * Espelham exatamente `Qualidade.classificar()`, que e a versao em JS da mesma
 * regra. Se um dos dois mudar, o outro precisa mudar junto - por isso os dois
 * ficam documentados lado a lado.
 *
 * A classificacao depende do fundamento, nao so do simbolo:
 *   - "#" so e ponto em Saque (1), Ataque (2) e Bloqueio (3). Uma recepcao "#"
 *     e perfeita, mas nao encerra o rally.
 *   - "/" e erro em Ataque (bloqueado) e Bloqueio (invasao). No saque "/" e uma
 *     boa bola, e na recepcao/defesa e apenas ruim.
 */

const TIPOS_QUE_PONTUAM = '(1, 2, 3)';
const TIPOS_QUE_PERDEM_NO_BARRADO = '(2, 3)';

/** Condicao "esta acao encerrou o rally a favor da equipe". */
export function sqlEhPonto(alias = 'A') {
    return `(${alias}.Qualidade = '#' AND ${alias}.idTipoAcao IN ${TIPOS_QUE_PONTUAM})`;
}

/** Condicao "esta acao encerrou o rally a favor do adversario". */
export function sqlEhErro(alias = 'A') {
    return `(${alias}.Qualidade = '=' OR (${alias}.Qualidade = '/' AND ${alias}.idTipoAcao IN ${TIPOS_QUE_PERDEM_NO_BARRADO}))`;
}

/** Condicao "o rally continuou depois desta acao". */
export function sqlEhNeutra(alias = 'A') {
    return `(${alias}.Qualidade IS NOT NULL AND NOT ${sqlEhPonto(alias)} AND NOT ${sqlEhErro(alias)})`;
}

/**
 * As tres colunas de contagem prontas para entrar num SELECT.
 * Devolve `acoesPonto`, `acoesNeutra` e `acoesErro`.
 */
export function sqlContagemPorResultado(alias = 'A', prefixo = 'acoes') {
    const nome = (sufixo) => `${prefixo}${sufixo}`;
    return `
                SUM(CASE WHEN ${sqlEhPonto(alias)} THEN 1 ELSE 0 END) AS ${nome('Ponto')},
                SUM(CASE WHEN ${sqlEhNeutra(alias)} THEN 1 ELSE 0 END) AS ${nome('Neutra')},
                SUM(CASE WHEN ${sqlEhErro(alias)} THEN 1 ELSE 0 END) AS ${nome('Erro')}`;
}
