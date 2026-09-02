/**
 * Regras oficiais de pontuacao do volei (FIVB), isoladas do banco e da tela.
 *
 * Tudo aqui e funcao pura: recebe placar e formato, devolve decisao. E o unico
 * lugar que sabe quantos pontos vale um set e quando a partida acabou - o
 * scout ao vivo, a validacao de encerramento e os relatorios consultam daqui.
 */

/** Sets que uma equipe precisa vencer. 2 = melhor de 3, 3 = melhor de 5. */
export const MELHOR_DE_3 = 2;
export const MELHOR_DE_5 = 3;

const PONTOS_SET_NORMAL = 25;
const PONTOS_SET_DECISIVO = 15;
const VANTAGEM_MINIMA = 2;

/**
 * Devolve sempre "sets para vencer" (2 ou 3).
 *
 * Aceita tambem o total de sets do formato (5), porque e assim que um humano
 * costuma descrever a partida. Partidas antigas, sem a coluna preenchida, caem
 * em melhor de 5 - o unico formato que a validacao antiga assumia.
 */
export function normalizarSetsParaVencer(valor) {
    const numero = Number(valor);

    if (numero === MELHOR_DE_3) return MELHOR_DE_3;
    if (numero === MELHOR_DE_5 || numero === 5) return MELHOR_DE_5;

    return MELHOR_DE_5;
}

/** Quantos sets a partida pode ter no maximo: 3 numa MD3, 5 numa MD5. */
export function totalDeSets(setsParaVencer) {
    return normalizarSetsParaVencer(setsParaVencer) * 2 - 1;
}

/** O set decisivo (tie-break) e sempre o ultimo possivel do formato. */
export function ehSetDecisivo(numSet, setsParaVencer) {
    return Number(numSet) === totalDeSets(setsParaVencer);
}

/**
 * Pontos que o vencedor precisa alcancar no set.
 *
 * Cuidado: nao e "set 3 e set 5 valem 15". Numa melhor de 5 o set 3 vale 25;
 * so o ultimo set do formato e de 15.
 */
export function pontosParaVencerSet(numSet, setsParaVencer) {
    return ehSetDecisivo(numSet, setsParaVencer) ? PONTOS_SET_DECISIVO : PONTOS_SET_NORMAL;
}

/**
 * Estado do set a partir do placar corrente.
 *
 * Nao existe teto: em 25x24 o set continua ate alguem abrir 2 pontos, entao a
 * decisao e sempre "alcancou o alvo E abriu 2", nunca "alcancou o alvo".
 */
export function avaliarSet(pontosHome, pontosAway, numSet, setsParaVencer) {
    const home = Math.max(0, Number(pontosHome) || 0);
    const away = Math.max(0, Number(pontosAway) || 0);
    const alvo = pontosParaVencerSet(numSet, setsParaVencer);

    const lider = home > away ? 'home' : away > home ? 'away' : null;
    const maior = Math.max(home, away);
    const diferenca = Math.abs(home - away);
    const encerrado = maior >= alvo && diferenca >= VANTAGEM_MINIMA;

    return {
        alvo,
        decisivo: ehSetDecisivo(numSet, setsParaVencer),
        encerrado,
        vencedor: encerrado ? lider : null,
        // Quantos pontos faltam para o lider fechar o set. Alimenta o aviso de
        // "set point" na tela do scout.
        faltamParaFechar: encerrado
            ? 0
            : Math.max(alvo - maior, VANTAGEM_MINIMA - diferenca, 1),
        emSetPoint: !encerrado
            && lider !== null
            && maior >= alvo - 1
            && Math.max(alvo - maior, VANTAGEM_MINIMA - diferenca) <= 1,
    };
}

/**
 * O placar so trava para cima quando o set ja esta decidido.
 *
 * Decrementar continua sempre liberado: e assim que o analista corrige um
 * ponto marcado errado.
 */
export function podeIncrementar(pontosHome, pontosAway, numSet, setsParaVencer) {
    return !avaliarSet(pontosHome, pontosAway, numSet, setsParaVencer).encerrado;
}

/** Estado da partida a partir dos sets ganhos por cada lado. */
export function avaliarPartida(setsHome, setsAway, setsParaVencer) {
    const alvo = normalizarSetsParaVencer(setsParaVencer);
    const home = Math.max(0, Number(setsHome) || 0);
    const away = Math.max(0, Number(setsAway) || 0);

    const encerrada = home >= alvo || away >= alvo;

    return {
        alvo,
        totalDeSets: totalDeSets(alvo),
        encerrada,
        vencedor: encerrada ? (home >= alvo ? 'home' : 'away') : null,
        // Numero do proximo set a disputar, ou null se a partida acabou.
        proximoSet: encerrada ? null : home + away + 1,
    };
}
