import { VENCEDOR } from './Ponto';
import {
  TIPO_ACAO_ERRO_GERAL,
  TIPO_ACAO_PARA_FUNDAMENTO,
  TIPOS_ERRO_GERAL,
  classificar,
  normalizarQualidade,
} from './Qualidade';

/**
 * Metricas de analista: as que dependem da ORDEM do rally, e nao so da contagem
 * de acoes.
 *
 *   - Side-out % (K1) e break-point % (K2);
 *   - ataque K1 x K2 (ataque apos recepcao x contra-ataque);
 *   - ataque por qualidade do passe;
 *   - origem dos pontos ganhos e cedidos;
 *   - erros por tipo, inclusive as faltas do Erro geral.
 *
 * Nada disso exige formacao declarada: quem sacou cada rally sai das proprias
 * acoes (um Saque nosso, uma Recepcao nossa) e da regra do jogo - quem venceu o
 * rally anterior saca o seguinte. O relatorio de rotacao (`EstatisticaRotacao`)
 * continua sendo o unico que precisa da formacao.
 *
 * As funcoes puras recebem os rallies ja montados; `resumoDaPartida` e o unico
 * ponto que le o banco.
 */

const SAQUE = 1;
const ATAQUE = 2;
const BLOQUEIO = 3;
const RECEPCAO = 4;
const DEFESA = 5;

const percentual = (parte, total) =>
  total > 0 ? Number(((parte / total) * 100).toFixed(1)) : 0;

const chaveRally = (numSet, pontoTime1, pontoTime2) =>
  `${Number(numSet)}-${Number(pontoTime1)}-${Number(pontoTime2)}`;

/**
 * Quem sacou o rally, pela evidencia mais direta disponivel.
 *
 * 1. As acoes do rally: Saque nosso ou Recepcao do adversario = nos sacamos;
 *    Recepcao nossa ou Saque do adversario = o adversario sacou.
 * 2. A regra do jogo: quem venceu o rally anterior saca este.
 * 3. No primeiro rally do set, quem a formacao diz que sacou primeiro.
 *
 * Devolve null quando nada disso existe - o rally fica fora de K1/K2 em vez de
 * entrar num lado chutado.
 */
export function quemSacou(rally, anterior, sacaPrimeiro) {
  const nossa = (rally.acoes || []).find((acao) => acao.idTipoAcao === SAQUE || acao.idTipoAcao === RECEPCAO);
  if (nossa) return nossa.idTipoAcao === SAQUE ? VENCEDOR.MANDANTE : VENCEDOR.VISITANTE;

  const deles = (rally.acoesAdversario || []).find((acao) => acao.idTipoAcao === SAQUE || acao.idTipoAcao === RECEPCAO);
  if (deles) return deles.idTipoAcao === SAQUE ? VENCEDOR.VISITANTE : VENCEDOR.MANDANTE;

  if (anterior?.vencedor === VENCEDOR.MANDANTE || anterior?.vencedor === VENCEDOR.VISITANTE) {
    return anterior.vencedor;
  }

  const ehPrimeiro = Number(rally.pontoTime1) + Number(rally.pontoTime2) === 0;
  if (ehPrimeiro && (sacaPrimeiro === VENCEDOR.MANDANTE || sacaPrimeiro === VENCEDOR.VISITANTE)) {
    return sacaPrimeiro;
  }

  return null;
}

/**
 * Marca `sacando` em cada rally de um set. `rallies` precisam vir de um set
 * so; a ordem e refeita aqui pelo placar, que e ordem total.
 */
export function marcarSaque(rallies = [], sacaPrimeiro = null) {
  const ordenados = [...rallies].sort(
    (a, b) => (a.pontoTime1 + a.pontoTime2) - (b.pontoTime1 + b.pontoTime2)
  );
  const porTotal = new Map(ordenados.map((rally) => [rally.pontoTime1 + rally.pontoTime2, rally]));

  return ordenados.map((rally) => {
    const anterior = porTotal.get(rally.pontoTime1 + rally.pontoTime2 - 1) || null;
    return { ...rally, sacando: quemSacou(rally, anterior, sacaPrimeiro) };
  });
}

const contagemFase = () => ({ recebidos: 0, sideOuts: 0, sacados: 0, breaks: 0 });

const fecharFase = (contagem) => ({
  ...contagem,
  sideOutPct: percentual(contagem.sideOuts, contagem.recebidos),
  breakPct: percentual(contagem.breaks, contagem.sacados),
});

/** K1 (side-out) e K2 (break-point) de uma lista de rallies ja com `sacando`. */
export function contarFases(rallies = []) {
  const contagem = contagemFase();

  rallies.forEach((rally) => {
    if (!rally.sacando || !rally.vencedor) return;
    const ganhamos = rally.vencedor === VENCEDOR.MANDANTE;

    if (rally.sacando === VENCEDOR.VISITANTE) {
      contagem.recebidos += 1;
      if (ganhamos) contagem.sideOuts += 1;
    } else {
      contagem.sacados += 1;
      if (ganhamos) contagem.breaks += 1;
    }
  });

  return fecharFase(contagem);
}

const contagemAtaque = () => ({ total: 0, pontos: 0, erros: 0, bloqueados: 0 });

const somarAtaque = (contagem, qualidade) => {
  contagem.total += 1;
  if (qualidade === '#') contagem.pontos += 1;
  else if (qualidade === '=') contagem.erros += 1;
  else if (qualidade === '/') contagem.bloqueados += 1;
};

const fecharAtaque = (contagem) => ({
  ...contagem,
  // Mesma formula do scout por jogador: (pontos - erros - bloqueados) / total.
  eficiencia: percentual(contagem.pontos - contagem.erros - contagem.bloqueados, contagem.total),
  pontosPct: percentual(contagem.pontos, contagem.total),
});

/** Faixas de passe para o "ataque por qualidade do passe". */
export const FAIXAS_PASSE = Object.freeze([
  { chave: 'bom', rotulo: 'Passe bom (perfeita / positiva)', simbolos: ['#', '+'] },
  { chave: 'regular', rotulo: 'Passe regular (sem 1º tempo)', simbolos: ['!'] },
  { chave: 'ruim', rotulo: 'Passe ruim (negativa / ruim)', simbolos: ['-', '/'] },
]);

const faixaDoPasse = (qualidade) =>
  FAIXAS_PASSE.find((faixa) => faixa.simbolos.includes(qualidade))?.chave || null;

/**
 * Classifica cada ataque nosso em K1 (apos a recepcao) ou K2 (contra-ataque).
 *
 * Percorre as acoes do rally na ordem de digitacao e guarda a ultima "origem"
 * da bola: Recepcao abre um K1; Defesa, Bloqueio e Saque abrem um K2. Quando
 * nenhuma origem foi escoutada, o primeiro ataque de um rally de recepcao e K1
 * e qualquer outro e K2 - depois que a bola cruza a rede uma vez, todo ataque
 * e contra-ataque.
 *
 * Devolve [{ fase: 'K1' | 'K2' | null, qualidade, passe }], com `passe` sendo
 * a qualidade da recepcao que originou o K1, quando ela existe.
 */
export function classificarAtaques(rally) {
  let origem = null;
  let jaAtacou = false;
  const ataques = [];

  (rally.acoes || []).forEach((acao) => {
    if (acao.idTipoAcao === RECEPCAO) {
      origem = { fase: 'K1', passe: acao.qualidade };
      return;
    }

    if (acao.idTipoAcao === DEFESA || acao.idTipoAcao === BLOQUEIO || acao.idTipoAcao === SAQUE) {
      origem = { fase: 'K2', passe: null };
      return;
    }

    if (acao.idTipoAcao !== ATAQUE) return;

    let fase = origem?.fase || null;
    if (!fase) {
      if (jaAtacou || rally.sacando === VENCEDOR.MANDANTE) fase = 'K2';
      else if (rally.sacando === VENCEDOR.VISITANTE) fase = 'K1';
    }

    ataques.push({ fase, qualidade: acao.qualidade, passe: origem?.fase === 'K1' ? origem.passe : null });

    // A bola cruzou a rede: o proximo ataque so pode ser contra-ataque.
    origem = null;
    jaAtacou = true;
  });

  return ataques;
}

/** Ataque K1 x K2 e ataque por qualidade do passe, de uma lista de rallies. */
export function contarAtaques(rallies = []) {
  const porFase = { K1: contagemAtaque(), K2: contagemAtaque() };
  const porPasse = Object.fromEntries(FAIXAS_PASSE.map((faixa) => [faixa.chave, contagemAtaque()]));

  rallies.forEach((rally) => {
    classificarAtaques(rally).forEach((ataque) => {
      if (ataque.fase) somarAtaque(porFase[ataque.fase], ataque.qualidade);

      const faixa = faixaDoPasse(ataque.passe);
      if (faixa) somarAtaque(porPasse[faixa], ataque.qualidade);
    });
  });

  return {
    k1: fecharAtaque(porFase.K1),
    k2: fecharAtaque(porFase.K2),
    porPasse: FAIXAS_PASSE.map((faixa) => ({
      chave: faixa.chave,
      rotulo: faixa.rotulo,
      ...fecharAtaque(porPasse[faixa.chave]),
    })),
  };
}

/** Rotulos da origem dos pontos, na ordem em que aparecem no relatorio. */
export const ORIGENS_GANHOS = Object.freeze([
  { chave: 'ataque', rotulo: 'Ataque' },
  { chave: 'saque', rotulo: 'Saque (ace)' },
  { chave: 'bloqueio', rotulo: 'Bloqueio' },
  { chave: 'erroAdversario', rotulo: 'Erro do adversário' },
  { chave: 'naoEscoutado', rotulo: 'Sem ação registrada' },
]);

export const ORIGENS_CEDIDOS = Object.freeze([
  { chave: 'pontoAdversario', rotulo: 'Ponto do adversário' },
  { chave: 'erroSaque', rotulo: 'Erro de saque' },
  { chave: 'erroAtaque', rotulo: 'Erro de ataque' },
  { chave: 'ataqueBloqueado', rotulo: 'Ataque bloqueado' },
  { chave: 'erroRecepcao', rotulo: 'Erro de recepção' },
  { chave: 'erroBloqueio', rotulo: 'Erro de bloqueio / invasão' },
  { chave: 'erroDefesa', rotulo: 'Erro de defesa' },
  { chave: 'falta', rotulo: 'Falta (erro geral)' },
  { chave: 'naoEscoutado', rotulo: 'Sem ação registrada' },
]);

const PONTO_POR_TIPO = { [SAQUE]: 'saque', [ATAQUE]: 'ataque', [BLOQUEIO]: 'bloqueio' };
const ERRO_POR_TIPO = {
  [SAQUE]: 'erroSaque',
  [ATAQUE]: 'erroAtaque',
  [BLOQUEIO]: 'erroBloqueio',
  [RECEPCAO]: 'erroRecepcao',
  [DEFESA]: 'erroDefesa',
};

const resultadoDaAcao = (acao) => {
  if (acao.idTipoAcao === TIPO_ACAO_ERRO_GERAL) return 'ERRO';
  return classificar(TIPO_ACAO_PARA_FUNDAMENTO[acao.idTipoAcao], acao.qualidade);
};

/**
 * De onde veio cada rally decidido.
 *
 * Rally ganho: se a nossa ultima acao foi um ponto (ataque, ace, bloqueio), o
 * ponto e dela; senao o adversario errou. Rally perdido: se a nossa ultima
 * acao foi um erro, o ponto foi entregue; senao o adversario conquistou.
 */
export function origemDoRally(rally) {
  const nossas = rally.acoes || [];
  const ultima = nossas[nossas.length - 1] || null;
  const temAcao = nossas.length > 0 || (rally.acoesAdversario || []).length > 0;

  if (rally.vencedor === VENCEDOR.MANDANTE) {
    if (ultima && resultadoDaAcao(ultima) === 'PONTO') return PONTO_POR_TIPO[ultima.idTipoAcao];
    return temAcao ? 'erroAdversario' : 'naoEscoutado';
  }

  if (rally.vencedor === VENCEDOR.VISITANTE) {
    if (ultima && resultadoDaAcao(ultima) === 'ERRO') {
      if (ultima.idTipoAcao === TIPO_ACAO_ERRO_GERAL) return 'falta';
      if (ultima.idTipoAcao === ATAQUE && ultima.qualidade === '/') return 'ataqueBloqueado';
      return ERRO_POR_TIPO[ultima.idTipoAcao] || 'pontoAdversario';
    }
    return temAcao ? 'pontoAdversario' : 'naoEscoutado';
  }

  return null;
}

const montarDistribuicao = (rotulos, contagem) => {
  const total = rotulos.reduce((soma, item) => soma + (contagem[item.chave] || 0), 0);
  return {
    total,
    itens: rotulos.map((item) => ({
      ...item,
      total: contagem[item.chave] || 0,
      pct: percentual(contagem[item.chave] || 0, total),
    })),
  };
};

export function contarOrigens(rallies = []) {
  const ganhos = {};
  const cedidos = {};

  rallies.forEach((rally) => {
    const origem = origemDoRally(rally);
    if (!origem) return;
    const alvo = rally.vencedor === VENCEDOR.MANDANTE ? ganhos : cedidos;
    alvo[origem] = (alvo[origem] || 0) + 1;
  });

  const distribuicaoCedidos = montarDistribuicao(ORIGENS_CEDIDOS, cedidos);

  // Erro nao forcado: o que a equipe entregou sem o adversario precisar
  // jogar - erro de saque, erro de ataque e falta.
  const naoForcados = (cedidos.erroSaque || 0) + (cedidos.erroAtaque || 0) + (cedidos.falta || 0);

  return {
    ganhos: montarDistribuicao(ORIGENS_GANHOS, ganhos),
    cedidos: distribuicaoCedidos,
    errosNaoForcados: {
      total: naoForcados,
      pct: percentual(naoForcados, distribuicaoCedidos.total),
    },
  };
}

/**
 * Erros da equipe por tipo, a partir do scout ja agregado
 * (`EstatisticaModel.finalizarScout`). Inclui as faltas do Erro geral.
 */
export function errosPorTipo(scout) {
  const s = scout || {};
  const porTipo = s.errosGeraisPorTipo || {};

  const linhas = [
    { chave: 'saque', rotulo: 'Erro de saque', grupo: 'Fundamento', total: s.saque?.erros || 0 },
    { chave: 'recepcao', rotulo: 'Erro de recepção', grupo: 'Fundamento', total: s.recepcao?.erros || 0 },
    { chave: 'ataque', rotulo: 'Erro de ataque', grupo: 'Fundamento', total: s.ataque?.erros || 0 },
    { chave: 'bloqueado', rotulo: 'Ataque bloqueado', grupo: 'Fundamento', total: s.ataque?.bloqueados || 0 },
    { chave: 'bloqueio', rotulo: 'Erro de bloqueio / invasão', grupo: 'Fundamento', total: s.bloqueio?.erros || 0 },
    { chave: 'defesa', rotulo: 'Erro de defesa', grupo: 'Fundamento', total: s.defesa?.erros || 0 },
    ...TIPOS_ERRO_GERAL.map((tipo) => ({
      chave: tipo.codigo,
      rotulo: tipo.nome,
      grupo: 'Falta',
      total: porTipo[tipo.codigo] || 0,
    })),
    ...(porTipo.SEM_TIPO
      ? [{ chave: 'SEM_TIPO', rotulo: 'Falta sem tipo', grupo: 'Falta', total: porTipo.SEM_TIPO }]
      : []),
  ];

  const total = linhas.reduce((soma, linha) => soma + linha.total, 0);
  return {
    total,
    linhas: linhas.map((linha) => ({ ...linha, pct: percentual(linha.total, total) })),
  };
}

class EstatisticaAnalista {
  /**
   * Rallies da partida, com as acoes de cada lado na ordem de digitacao e
   * `sacando` ja marcado, agrupados por set.
   */
  static carregarRallies(partidaId, db) {
    const partida = Number(partidaId);

    const pontos = db.prepare(`
      SELECT NumSet AS numSet, pontoTime1, pontoTime2, vencedor
      FROM Ponto
      WHERE Set_Partida_id = ?
      ORDER BY NumSet ASC, (pontoTime1 + pontoTime2) ASC
    `).all(partida);

    const acoes = db.prepare(`
      SELECT Ponto_NumSet AS numSet, Ponto_pontoTime1 AS pontoTime1, Ponto_pontoTime2 AS pontoTime2,
             idTipoAcao, Qualidade AS qualidade, tipoErro
      FROM Acao
      WHERE Ponto_Partida_id = ? AND Ponto_NumSet IS NOT NULL
      ORDER BY id ASC
    `).all(partida);

    const acoesAdversario = db.prepare(`
      SELECT NumSet AS numSet, Ponto_pontoTime1 AS pontoTime1, Ponto_pontoTime2 AS pontoTime2,
             idTipoAcao, Qualidade AS qualidade
      FROM AcaoAdversario
      WHERE Partida_id = ?
      ORDER BY id ASC
    `).all(partida);

    // O valor cru: `EscalacaoSet.buscarSacaPrimeiro` cai em MANDANTE quando a
    // coluna e nula, e aqui "nao sabemos" precisa continuar sendo null.
    const sacaPrimeiroPorSet = new Map(
      db.prepare('SELECT NumSet, sacaPrimeiro FROM "Set" WHERE Partida_id = ?')
        .all(partida)
        .map((linha) => [Number(linha.NumSet), linha.sacaPrimeiro || null])
    );

    const rallies = new Map();
    pontos.forEach((ponto) => {
      rallies.set(chaveRally(ponto.numSet, ponto.pontoTime1, ponto.pontoTime2), {
        numSet: Number(ponto.numSet),
        pontoTime1: Number(ponto.pontoTime1),
        pontoTime2: Number(ponto.pontoTime2),
        vencedor: ponto.vencedor || null,
        acoes: [],
        acoesAdversario: [],
      });
    });

    const anexar = (lista, campo) => lista.forEach((acao) => {
      const rally = rallies.get(chaveRally(acao.numSet, acao.pontoTime1, acao.pontoTime2));
      if (!rally) return;
      rally[campo].push({
        idTipoAcao: Number(acao.idTipoAcao),
        qualidade: normalizarQualidade(acao.qualidade),
        tipoErro: acao.tipoErro || null,
      });
    });

    anexar(acoes, 'acoes');
    anexar(acoesAdversario, 'acoesAdversario');

    const porSet = new Map();
    rallies.forEach((rally) => {
      if (!porSet.has(rally.numSet)) porSet.set(rally.numSet, []);
      porSet.get(rally.numSet).push(rally);
    });

    return [...porSet.entries()]
      .sort(([a], [b]) => a - b)
      .map(([numSet, lista]) => ({
        numSet,
        rallies: marcarSaque(lista, sacaPrimeiroPorSet.get(numSet) || null),
      }));
  }

  /**
   * Resumo pronto para a tela e para o PDF.
   *
   * @param {object} scoutTotal - `statistics.totals.scout`, para o bloco de
   *                              erros por tipo (os numeros ja agregados).
   */
  static resumoDaPartida(partidaId, db, scoutTotal = null) {
    const sets = EstatisticaAnalista.carregarRallies(partidaId, db);
    const todos = sets.flatMap((set) => set.rallies);
    const semSaque = todos.filter((rally) => rally.vencedor && !rally.sacando).length;

    return {
      fases: contarFases(todos),
      ataques: contarAtaques(todos),
      origens: contarOrigens(todos),
      erros: errosPorTipo(scoutTotal),
      porSet: sets.map(({ numSet, rallies }) => {
        const ataques = contarAtaques(rallies);
        return {
          numSet,
          ...contarFases(rallies),
          ataqueK1: ataques.k1,
          ataqueK2: ataques.k2,
        };
      }),
      // Rallies decididos em que nao deu para saber quem sacou: ficam fora de
      // K1/K2, e o relatorio avisa quantos foram.
      ralliesSemSaque: semSaque,
    };
  }
}

export default EstatisticaAnalista;
