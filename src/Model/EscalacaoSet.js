import { LADO, ZONAS, ZONAS_FUNDO, girarEscalacao, ocupacaoDaEscalacao, zonaAncora } from './Rotacao';

/**
 * Formacao inicial de cada set, por zona de quadra.
 *
 * `TimesPartida` diz quem esta em quadra e quem esta no banco; aqui fica ONDE
 * cada titular comeca o set. E o que falta hoje para saber em que rotacao a
 * equipe estava em cada rally.
 *
 * So a nossa equipe e registrada - o adversario continua sendo escoutado
 * apenas por camisa, sem escalacao.
 */

const semAcento = (texto) =>
  String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

class EscalacaoSet {
  /**
   * Grava a formacao do set inteira, substituindo a anterior.
   *
   * Recebe as 6 zonas de uma vez de proposito: uma formacao pela metade nao
   * descreve rotacao nenhuma, e gravar zona a zona deixaria o set num estado
   * intermediario que o motor nao sabe ler.
   */
  static salvar({ partidaId, numSet, zonas = [], sacaPrimeiro = LADO.MANDANTE }, db) {
    const partida = Number(partidaId);
    const set = Number(numSet);

    if (!partida || !set) {
      throw new Error('Partida e set sao obrigatorios para salvar a formacao.');
    }

    EscalacaoSet.validar(zonas, EscalacaoSet.verificadorDeLibero(db));

    db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)').run(set, partida);
    db.prepare('UPDATE "Set" SET sacaPrimeiro = ? WHERE NumSet = ? AND Partida_id = ?')
      .run(sacaPrimeiro === LADO.VISITANTE ? LADO.VISITANTE : LADO.MANDANTE, set, partida);

    db.prepare('DELETE FROM EscalacaoSet WHERE Partida_id = ? AND NumSet = ?').run(partida, set);

    const insert = db.prepare(`
      INSERT INTO EscalacaoSet (Partida_id, NumSet, zona, Jogadores_id, levantador)
      VALUES (?, ?, ?, ?, ?)
    `);

    zonas.forEach((linha) => {
      insert.run(
        partida,
        set,
        Number(linha.zona),
        Number(linha.jogadorId),
        Number(linha.levantador) === 1 ? 1 : 0
      );
    });

    return { partidaId: partida, numSet: set, rotacaoInicial: zonaAncora(zonas) };
  }

  /**
   * Recusa formacao incompleta, zona repetida, atleta repetido, sem levantador
   * - ou com o libero ocupando uma zona.
   */
  static validar(zonas = [], ehLibero = null) {
    if (zonas.length !== 6) {
      throw new Error('A formacao do set precisa das 6 zonas preenchidas.');
    }

    const zonasVistas = new Set(zonas.map((linha) => Number(linha.zona)));
    if (zonasVistas.size !== 6 || ZONAS.some((zona) => !zonasVistas.has(zona))) {
      throw new Error('Cada zona de 1 a 6 precisa aparecer exatamente uma vez.');
    }

    const atletas = new Set(zonas.map((linha) => Number(linha.jogadorId)));
    if (atletas.size !== 6 || atletas.has(0) || atletas.has(Number.NaN)) {
      throw new Error('Cada zona precisa de um atleta diferente.');
    }

    const levantadores = zonas.filter((linha) => Number(linha.levantador) === 1);
    if (levantadores.length !== 1) {
      throw new Error('Marque exatamente um levantador na formacao (sistema 5-1).');
    }

    // O libero nao entra na formacao por zona porque ele NAO RODA: ele entra no
    // lugar de um jogador de fundo e sai antes de chegar a rede. Declarado numa
    // zona, ele apareceria na rede depois de dois giros - situacao que nao
    // existe em quadra e que estragaria o relatorio de quem estava na rede.
    // O caminho certo e a troca de libero, que ja e isenta do limite de
    // substituicoes em Model/Substituicao.js.
    if (typeof ehLibero === 'function') {
      const naZona = zonas.find((linha) => ehLibero(linha.jogadorId));
      if (naZona) {
        throw new Error(
          'O libero nao ocupa zona na formacao: ele entra no lugar de um jogador de fundo. '
            + 'Escale os 6 que rodam e depois registre a entrada do libero.'
        );
      }
    }
  }

  /** Formacao do set, com nome e camisa para a tela. Vazio = nao declarada. */
  static buscarPorSet(partidaId, numSet, db) {
    return db.prepare(`
      SELECT
        E.zona,
        E.Jogadores_id AS jogadorId,
        E.levantador,
        J.nome AS jogadorNome,
        J.numCamisa AS jogadorNumero,
        P.nome AS posicaoNome
      FROM EscalacaoSet E
      JOIN Jogadores J ON J.id = E.Jogadores_id
      LEFT JOIN Posicoes P ON P.id = J.posicao_id
      WHERE E.Partida_id = ? AND E.NumSet = ?
      ORDER BY E.zona ASC
    `).all(Number(partidaId), Number(numSet));
  }

  /** Quem sacou a primeira bola do set. MANDANTE por padrao. */
  static buscarSacaPrimeiro(partidaId, numSet, db) {
    const linha = db.prepare(
      'SELECT sacaPrimeiro FROM "Set" WHERE Partida_id = ? AND NumSet = ?'
    ).get(Number(partidaId), Number(numSet));

    return linha?.sacaPrimeiro === LADO.VISITANTE ? LADO.VISITANTE : LADO.MANDANTE;
  }

  static definirSacaPrimeiro(partidaId, numSet, lado, db) {
    db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)')
      .run(Number(numSet), Number(partidaId));
    db.prepare('UPDATE "Set" SET sacaPrimeiro = ? WHERE NumSet = ? AND Partida_id = ?')
      .run(lado === LADO.VISITANTE ? LADO.VISITANTE : LADO.MANDANTE, Number(numSet), Number(partidaId));
  }

  /**
   * Gira a formacao inicial do set uma posicao.
   *
   * E o conserto quando o analista declarou a rotacao inicial errada: como a
   * rotacao de cada rally e derivada, girar a inicial recalcula o set inteiro.
   */
  static girar(partidaId, numSet, db) {
    const atual = EscalacaoSet.buscarPorSet(partidaId, numSet, db);

    if (atual.length !== 6) {
      throw new Error('A formacao deste set ainda nao foi declarada.');
    }

    return EscalacaoSet.salvar(
      {
        partidaId,
        numSet,
        zonas: girarEscalacao(atual),
        sacaPrimeiro: EscalacaoSet.buscarSacaPrimeiro(partidaId, numSet, db),
      },
      db
    );
  }

  /**
   * Formacao sugerida para um set novo: a do ultimo set declarado.
   *
   * Na pratica a equipe repete a escalacao e so muda por onde comeca, entao
   * herdar e depois girar e bem mais rapido que remontar as 6 zonas.
   */
  static sugerirParaSet(partidaId, numSet, db) {
    const anterior = db.prepare(`
      SELECT MAX(NumSet) AS numSet FROM EscalacaoSet
      WHERE Partida_id = ? AND NumSet < ?
    `).get(Number(partidaId), Number(numSet));

    if (!anterior?.numSet) {
      return [];
    }

    return EscalacaoSet.buscarPorSet(partidaId, anterior.numSet, db);
  }

  /**
   * Ids dos atletas cadastrados como levantador.
   *
   * O motor precisa disso para distinguir a dupla substituicao (o levantador
   * saiu e quem levanta agora esta na diagonal) de uma troca simples de
   * levantador por levantador, que nao muda nada.
   */
  static idsDeLevantadores(db) {
    const linhas = db.prepare(`
      SELECT J.id, P.nome AS posicaoNome
      FROM Jogadores J
      JOIN Posicoes P ON P.id = J.posicao_id
    `).all();

    return new Set(
      linhas
        .filter((linha) => semAcento(linha.posicaoNome).startsWith('levantador'))
        .map((linha) => Number(linha.id))
    );
  }

  /** `(jogadorId) => boolean` no formato que `Rotacao.simularSet` espera. */
  static verificadorDeLevantador(db) {
    const levantadores = EscalacaoSet.idsDeLevantadores(db);
    return (jogadorId) => levantadores.has(Number(jogadorId));
  }

  /** Ids dos atletas cadastrados como libero. */
  static idsDeLiberos(db) {
    const linhas = db.prepare(`
      SELECT J.id, P.nome AS posicaoNome
      FROM Jogadores J
      JOIN Posicoes P ON P.id = J.posicao_id
    `).all();

    return new Set(
      linhas
        .filter((linha) => semAcento(linha.posicaoNome).includes('libero'))
        .map((linha) => Number(linha.id))
    );
  }

  static verificadorDeLibero(db) {
    const liberos = EscalacaoSet.idsDeLiberos(db);
    return (jogadorId) => liberos.has(Number(jogadorId));
  }

  /** Zonas de fundo, as unicas em que o libero pode entrar. */
  static zonasDeFundo() {
    return [...ZONAS_FUNDO];
  }

  /** Zona de cada atleta no inicio do set. Usado pela tela. */
  static ocupacaoInicial(partidaId, numSet, db) {
    return ocupacaoDaEscalacao(EscalacaoSet.buscarPorSet(partidaId, numSet, db));
  }

  static deletarPorPartida(partidaId, db) {
    db.prepare('DELETE FROM EscalacaoSet WHERE Partida_id = ?').run(Number(partidaId));
  }

  static deletarPorSet(partidaId, numSet, db) {
    db.prepare('DELETE FROM EscalacaoSet WHERE Partida_id = ? AND NumSet = ?')
      .run(Number(partidaId), Number(numSet));
  }
}

export default EscalacaoSet;
