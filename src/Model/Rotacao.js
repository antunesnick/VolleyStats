/**
 * Rotacao da nossa equipe, sistema 5-1.
 *
 * Funcoes puras: placar + formacao -> rotacao. Sem banco e sem tela, no mesmo
 * molde de `RegrasSet.js`. Quem persiste o resultado e
 * `Ponto.sincronizarRotacoes()`.
 *
 * As zonas seguem a numeracao oficial, vistas de cima, na nossa quadra:
 *
 *          R E D E
 *     Z4  |  Z3  |  Z2      frente
 *    -----+------+-----
 *     Z5  |  Z6  |  Z1      fundo   (Z1 = quem saca)
 *
 * A cada side-out os jogadores andam Z2->Z1->Z6->Z5->Z4->Z3->Z2, ou seja, o
 * numero da zona DECRESCE: R1 -> R6 -> R5 -> R4 -> R3 -> R2 -> R1.
 */

export const LADO = Object.freeze({
  MANDANTE: 'MANDANTE',
  VISITANTE: 'VISITANTE',
});

export const ZONAS = Object.freeze([1, 2, 3, 4, 5, 6]);

/** Zonas de rede e de fundo. O corte classico dos relatorios de rotacao. */
export const ZONAS_REDE = Object.freeze([2, 3, 4]);
export const ZONAS_FUNDO = Object.freeze([1, 5, 6]);

/** Para onde vai, no giro, quem esta na zona informada. */
export function proximaZona(zona) {
  const z = Number(zona);
  return z === 1 ? 6 : z - 1;
}

/** Inverso de `proximaZona`. Usado para desfazer um giro. */
export function zonaAnterior(zona) {
  const z = Number(zona);
  return z === 6 ? 1 : z + 1;
}

/**
 * A zona diagonal - a que fica 3 posicoes adiante no ciclo.
 *
 * Levantador e oposto sao diagonais entre si num 5-1, e e por isso que a dupla
 * substituicao troca justamente esses dois slots.
 */
export function zonaDiagonal(zona) {
  const z = Number(zona);
  return z <= 3 ? z + 3 : z - 3;
}

/**
 * Gira a ocupacao das zonas uma posicao.
 *
 * `ocupacao` e um objeto { zona: jogadorId }. Quem esta na zona Z passa a
 * ocupar `proximaZona(Z)`.
 */
export function girarOcupacao(ocupacao) {
  const nova = {};
  ZONAS.forEach((zona) => {
    nova[proximaZona(zona)] = ocupacao[zona] ?? null;
  });
  return nova;
}

/** { zona: jogadorId } a partir das linhas de EscalacaoSet. */
export function ocupacaoDaEscalacao(escalacao = []) {
  const ocupacao = {};
  ZONAS.forEach((zona) => { ocupacao[zona] = null; });
  escalacao.forEach((linha) => {
    const zona = Number(linha.zona);
    if (ZONAS.includes(zona)) {
      ocupacao[zona] = Number(linha.jogadorId ?? linha.Jogadores_id) || null;
    }
  });
  return ocupacao;
}

/**
 * Zona do slot-ancora: onde o levantador comecou o set.
 *
 * E dela que sai o numero da rotacao. Devolve `null` quando a escalacao do set
 * nao foi declarada - a tela usa isso para saber que nao ha rotacao a mostrar.
 */
export function zonaAncora(escalacao = []) {
  const linha = escalacao.find((item) => Number(item.levantador) === 1);
  const zona = Number(linha?.zona);
  return ZONAS.includes(zona) ? zona : null;
}

/** Rotacao em que o set comeca. Sinonimo de `zonaAncora`, com o nome do dominio. */
export function rotacaoInicial(escalacao = []) {
  return zonaAncora(escalacao);
}

/**
 * Gira a escalacao inicial uma posicao.
 *
 * E o botao "girar" da tela: quando o analista percebe que declarou a rotacao
 * inicial errada, girar a formacao recalcula o set inteiro. Como tudo e
 * derivado, nao existe estado paralelo para consertar.
 */
export function girarEscalacao(escalacao = []) {
  return escalacao.map((linha) => ({
    ...linha,
    zona: proximaZona(Number(linha.zona)),
  }));
}

/** Ordem dos rallies: a chave de `Ponto` e o placar, entao o rally n soma n. */
const ordenarPorPlacar = (lista = []) =>
  [...lista].sort(
    (a, b) =>
      (Number(a.pontoTime1) + Number(a.pontoTime2)) -
      (Number(b.pontoTime1) + Number(b.pontoTime2))
  );

const chaveDoRally = (item) => `${Number(item.pontoTime1)}x${Number(item.pontoTime2)}`;

/**
 * Onde esta o levantador de verdade, e se a dupla substituicao esta em vigor.
 *
 * O slot-ancora e fixo no set, mas quem o ocupa muda: na dupla substituicao o
 * levantador sai para entrar um oposto, e o levantador reserva entra na
 * diagonal, no lugar do oposto titular. Por isso a deteccao e feita pela
 * POSICAO de quem esta em quadra, e nao por "o ancora mudou de dono" - uma
 * troca simples de levantador por levantador nao e dupla substituicao.
 */
function localizarLevantador(ocupacao, ancora, ehLevantador) {
  if (!ancora) {
    return { zonaLevantador: null, levantadorId: null, duplaSub: false };
  }

  if (typeof ehLevantador !== 'function') {
    return { zonaLevantador: ancora, levantadorId: ocupacao[ancora] ?? null, duplaSub: false };
  }

  // O ancora tem prioridade: e o caso normal, e evita ambiguidade quando ha
  // dois levantadores em quadra por um instante.
  if (ehLevantador(ocupacao[ancora])) {
    return { zonaLevantador: ancora, levantadorId: ocupacao[ancora] ?? null, duplaSub: false };
  }

  const diagonal = zonaDiagonal(ancora);
  if (ehLevantador(ocupacao[diagonal])) {
    return { zonaLevantador: diagonal, levantadorId: ocupacao[diagonal] ?? null, duplaSub: true };
  }

  const zona = ZONAS.find((z) => ehLevantador(ocupacao[z]));
  if (zona) {
    return { zonaLevantador: zona, levantadorId: ocupacao[zona] ?? null, duplaSub: zona !== ancora };
  }

  // Nenhum levantador em quadra: o ancora ainda define a rotacao.
  return { zonaLevantador: ancora, levantadorId: ocupacao[ancora] ?? null, duplaSub: false };
}

/**
 * Percorre o set rally a rally e devolve o estado de rotacao de cada um.
 *
 * @param {object[]} escalacaoInicial - linhas { zona, jogadorId, levantador }
 * @param {string}   sacaPrimeiro     - LADO.MANDANTE | LADO.VISITANTE
 * @param {object[]} rallies          - { pontoTime1, pontoTime2, vencedor }
 * @param {object[]} substituicoes    - { pontoTime1, pontoTime2, jogadorEntra, jogadorSai }
 * @param {function} ehLevantador     - (jogadorId) => boolean
 * @param {function} ehLibero         - (jogadorId) => boolean
 *
 * @returns {object[]} um item por rally, com { pontoTime1, pontoTime2, vencedor,
 *   rotacao, sacando, sideOut, ocupacao, zonaLevantador, levantadorId, duplaSub,
 *   liberoNaRede }
 *
 * `rotacao` e sempre a zona do slot-ancora, nunca a de quem esta levantando no
 * momento. Se fosse a segunda, a dupla substituicao faria o numero pular 3, e
 * uma equipe que dobra toda vez que o levantador chega a rede so produziria
 * R1, R5 e R6 - seis alinhamentos distintos colapsados em tres rotulos.
 */
export function simularSet({
  escalacaoInicial = [],
  sacaPrimeiro = LADO.MANDANTE,
  rallies = [],
  substituicoes = [],
  ehLevantador = null,
  ehLibero = null,
} = {}) {
  const ancoraDoSet = zonaAncora(escalacaoInicial);

  if (!ancoraDoSet) {
    return [];
  }

  let ocupacao = ocupacaoDaEscalacao(escalacaoInicial);
  let ancora = ancoraDoSet;
  let sacando = sacaPrimeiro === LADO.VISITANTE ? LADO.VISITANTE : LADO.MANDANTE;

  // Substituicoes indexadas pelo rally em que foram feitas: elas valem A PARTIR
  // daquele placar, entao sao aplicadas antes de o rally ser registrado.
  const trocasPorRally = new Map();
  ordenarPorPlacar(substituicoes).forEach((troca) => {
    const chave = chaveDoRally(troca);
    if (!trocasPorRally.has(chave)) trocasPorRally.set(chave, []);
    trocasPorRally.get(chave).push(troca);
  });

  return ordenarPorPlacar(rallies).map((rally) => {
    (trocasPorRally.get(chaveDoRally(rally)) || []).forEach((troca) => {
      const sai = Number(troca.jogadorSai);
      const entra = Number(troca.jogadorEntra);
      // Quem entra assume o slot de quem saiu - a substituicao troca o ocupante
      // da zona, nunca a posicao dela no ciclo.
      const zona = ZONAS.find((z) => ocupacao[z] === sai);
      if (zona) ocupacao = { ...ocupacao, [zona]: entra };
    });

    const { zonaLevantador, levantadorId, duplaSub } = localizarLevantador(
      ocupacao,
      ancora,
      ehLevantador
    );

    const sideOut = sacando === LADO.VISITANTE;

    const estado = {
      pontoTime1: Number(rally.pontoTime1),
      pontoTime2: Number(rally.pontoTime2),
      vencedor: rally.vencedor ?? null,
      rotacao: ancora,
      sacando,
      // O rally e de side-out quando estamos recebendo. Vira "side-out
      // convertido" se o vencedor for MANDANTE.
      sideOut,
      ocupacao: { ...ocupacao },
      zonaLevantador,
      levantadorId,
      duplaSub,
      // O libero nunca joga na rede: se ele aparece ali, o analista esqueceu de
      // registrar a saida dele. A tela avisa em vez de deixar o relatorio
      // dizer que um libero atacou de zona 4.
      liberoNaRede:
        typeof ehLibero === 'function'
          ? ZONAS_REDE.some((zona) => ehLibero(ocupacao[zona]))
          : false,
    };

    if (rally.vencedor === LADO.MANDANTE) {
      if (sacando === LADO.VISITANTE) {
        // Side-out: giramos e passamos a sacar.
        ocupacao = girarOcupacao(ocupacao);
        ancora = proximaZona(ancora);
        sacando = LADO.MANDANTE;
      }
      // Vencer sacando e break point: nada gira.
    } else if (rally.vencedor === LADO.VISITANTE) {
      // Eles giram, nos nao. So muda quem saca.
      sacando = LADO.VISITANTE;
    }
    // Rally sem vencedor marcado (ainda em disputa): o estado nao avanca.

    return estado;
  });
}

export default {
  LADO,
  ZONAS,
  ZONAS_REDE,
  ZONAS_FUNDO,
  proximaZona,
  zonaAnterior,
  zonaDiagonal,
  girarOcupacao,
  ocupacaoDaEscalacao,
  zonaAncora,
  rotacaoInicial,
  girarEscalacao,
  simularSet,
};
