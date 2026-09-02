/**
 * Escala de avaliacao de 6 niveis, no padrao DataVolley.
 *
 * O simbolo e o mesmo para todos os fundamentos; o SIGNIFICADO muda conforme
 * o fundamento - e assim que o DataVolley funciona. Por isso a tela sempre
 * mostra a legenda do fundamento que esta sendo escoutado.
 *
 * A tecla e fixa (1..6, do pior para o melhor) justamente para nao obrigar o
 * analista a lembrar de um mapa diferente por fundamento no meio do rally.
 */

/** Simbolos na ordem das teclas 1..6. */
export const ESCALA = Object.freeze(['=', '/', '-', '!', '+', '#']);

/** Tecla digitada no 3o estagio do buffer -> simbolo gravado. */
export const TECLA_PARA_QUALIDADE = Object.freeze({
    1: '=', 2: '/', 3: '-', 4: '!', 5: '+', 6: '#',
});

export const QUALIDADE_PARA_TECLA = Object.freeze(
    Object.fromEntries(Object.entries(TECLA_PARA_QUALIDADE).map(([tecla, cod]) => [cod, tecla]))
);

/**
 * Escala antiga de 3 niveis -> escala nova.
 * A era "ponto/perfeito", B era "ok" e C era "erro".
 */
export const MAPA_LEGADO = Object.freeze({ A: '#', B: '!', C: '=' });

/** Nomes de fundamento como o resto do sistema os normaliza. */
export const FUNDAMENTOS = Object.freeze(['Saque', 'Recepcao', 'Ataque', 'Bloqueio', 'Defesa']);

/** idTipoAcao (tabela TipoAcao) -> fundamento normalizado. */
export const TIPO_ACAO_PARA_FUNDAMENTO = Object.freeze({
    1: 'Saque', 2: 'Ataque', 3: 'Bloqueio', 4: 'Recepcao', 5: 'Defesa',
});

/** Tecla do 2o estagio do buffer -> fundamento. */
export const TECLA_PARA_FUNDAMENTO = Object.freeze({
    S: 'Saque', A: 'Ataque', B: 'Bloqueio', R: 'Recepcao', D: 'Defesa',
});

/** Fundamento normalizado -> idTipoAcao, para gravar a acao. */
export const FUNDAMENTO_PARA_TIPO_ACAO = Object.freeze(
    Object.fromEntries(
        Object.entries(TIPO_ACAO_PARA_FUNDAMENTO).map(([id, fundamento]) => [fundamento, Number(id)])
    )
);

/**
 * Significado de cada simbolo por fundamento, conforme o manual do DataVolley.
 *
 * Repare no saque: "/" e melhor que "+", porque significa que o adversario
 * nao conseguiu montar ataque nenhum. E a unica inversao da escala.
 */
export const DESCRICOES = Object.freeze({
    Saque: {
        '=': 'Erro de saque',
        '/': 'Adversário sem ataque',
        '-': 'Adversário ataca livre',
        '!': 'Adversário sem 1º tempo',
        '+': 'Adversário com ataque limitado',
        '#': 'Ace',
    },
    Recepcao: {
        '=': 'Erro de recepção',
        '/': 'Ruim, sem ataque',
        '-': 'Negativa, ataque limitado',
        '!': 'Ok, sem 1º tempo',
        '+': 'Positiva, ataque montado',
        '#': 'Perfeita',
    },
    Ataque: {
        '=': 'Erro de ataque',
        '/': 'Bloqueado',
        '-': 'Fácil de defender',
        '!': 'Bloqueado para recontra-ataque',
        '+': 'Bom ataque',
        '#': 'Ponto de ataque',
    },
    Bloqueio: {
        '=': 'Erro de bloqueio',
        '/': 'Invasão',
        '-': 'Adversário reataca',
        '!': 'Adversário reataca',
        '+': 'Tocou no bloqueio',
        '#': 'Ponto de bloqueio',
    },
    Defesa: {
        '=': 'Erro de defesa',
        '/': 'Devolveu direto para o adversário',
        '-': 'Sem ataque estruturado',
        '!': 'Ok, sem 1º tempo',
        '+': 'Boa defesa',
        '#': 'Defesa perfeita',
    },
});

/**
 * Classificacao do resultado do rally por fundamento.
 *
 * PONTO  - a acao encerra o rally a favor da equipe
 * ERRO   - a acao encerra o rally a favor do adversario
 * NEUTRO - o rally continua
 *
 * Ataque "/" (bloqueado) e bloqueio "/" (invasao) sao erros: o ponto vai para
 * o adversario, ainda que o simbolo nao seja "=".
 */
const PONTOS_POR_FUNDAMENTO = Object.freeze({
    Saque: ['#'], Ataque: ['#'], Bloqueio: ['#'], Recepcao: [], Defesa: [],
});

const ERROS_POR_FUNDAMENTO = Object.freeze({
    Saque: ['='], Ataque: ['=', '/'], Bloqueio: ['=', '/'], Recepcao: ['='], Defesa: ['='],
});

/** Simbolos que contam como "acao positiva" no percentual de positividade. */
const POSITIVAS_POR_FUNDAMENTO = Object.freeze({
    Saque: ['#', '/', '+'],
    Recepcao: ['#', '+'],
    Ataque: ['#', '+'],
    Bloqueio: ['#', '+'],
    Defesa: ['#', '+'],
});

export function normalizarFundamento(nome) {
    const texto = String(nome || '').trim().toLowerCase();
    if (texto.startsWith('recep')) return 'Recepcao';
    if (texto.startsWith('saq')) return 'Saque';
    if (texto.startsWith('ata')) return 'Ataque';
    if (texto.startsWith('bloq')) return 'Bloqueio';
    if (texto.startsWith('def')) return 'Defesa';
    return null;
}

/**
 * Aceita o simbolo novo ou a letra antiga e devolve sempre o simbolo novo.
 * Devolve null para qualquer coisa fora da escala.
 */
export function normalizarQualidade(valor) {
    const texto = String(valor ?? '').trim();
    if (ESCALA.includes(texto)) return texto;

    const legado = MAPA_LEGADO[texto.toUpperCase()];
    return legado ?? null;
}

export function descrever(fundamento, qualidade) {
    const chave = normalizarFundamento(fundamento);
    const simbolo = normalizarQualidade(qualidade);
    if (!chave || !simbolo) return '';
    return DESCRICOES[chave][simbolo] || '';
}

export function classificar(fundamento, qualidade) {
    const chave = normalizarFundamento(fundamento);
    const simbolo = normalizarQualidade(qualidade);
    if (!chave || !simbolo) return 'NEUTRO';

    if (PONTOS_POR_FUNDAMENTO[chave].includes(simbolo)) return 'PONTO';
    if (ERROS_POR_FUNDAMENTO[chave].includes(simbolo)) return 'ERRO';
    return 'NEUTRO';
}

export function ehPositiva(fundamento, qualidade) {
    const chave = normalizarFundamento(fundamento);
    const simbolo = normalizarQualidade(qualidade);
    if (!chave || !simbolo) return false;
    return POSITIVAS_POR_FUNDAMENTO[chave].includes(simbolo);
}

/** Legenda pronta para a tela do scout: [{ tecla, simbolo, texto }]. */
export function legendaDoFundamento(fundamento) {
    const chave = normalizarFundamento(fundamento);
    if (!chave) return [];

    return ESCALA.map((simbolo) => ({
        tecla: QUALIDADE_PARA_TECLA[simbolo],
        simbolo,
        texto: DESCRICOES[chave][simbolo],
        resultado: classificar(chave, simbolo),
    }));
}

/**
 * Agrupamento em tres baldes para os relatorios resumidos (torneio, jogador,
 * ranking), que somam fundamentos diferentes na mesma tabela e por isso nao
 * comportam a escala de 6 niveis inteira.
 *
 * Espelha `SqlQualidade.js`, que faz a mesma classificacao dentro do SQL.
 */
export const BUCKETS = Object.freeze(['Ponto', 'Neutra', 'Erro']);

export const ROTULO_BUCKET = Object.freeze({
    Ponto: 'Pontos',
    Neutra: 'Neutras',
    Erro: 'Erros',
});

export function criarContagemPorBucket() {
    return { Ponto: 0, Neutra: 0, Erro: 0 };
}

export function bucketDoResultado(fundamento, qualidade) {
    const resultado = classificar(fundamento, qualidade);
    if (resultado === 'PONTO') return 'Ponto';
    if (resultado === 'ERRO') return 'Erro';
    return 'Neutra';
}
