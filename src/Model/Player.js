import { sqlContagemPorResultado, sqlEhPonto } from './SqlQualidade';
import { bucketDoResultado, criarContagemPorBucket } from './Qualidade';
// Substituído require() por import para harmonizar com o export default no final
import { cpf } from 'cpf-cnpj-validator';
import Ponto from './Ponto';
import db from '../db/db';

/**
 * Campo opcional com UNIQUE: vazio precisa virar NULL.
 *
 * `Jogadores.cpf` e `Jogadores.rg` sao UNIQUE. No SQLite dois NULL sao
 * distintos, mas duas strings vazias nao - entao o segundo cadastro sem CPF
 * estourava "UNIQUE constraint failed" como se o documento ja existisse.
 * Normalizar na entrada e o que permite cadastrar varios atletas sem documento.
 */
export function normalizarDocumento(valor) {
  const texto = String(valor ?? '').trim();
  return texto === '' ? null : texto;
}

const ACTION_TYPES = ['Saque', 'Ataque', 'Bloqueio', 'Recepcao', 'Defesa'];

const criarMapaAcoes = () => {
  const base = ACTION_TYPES.reduce((acc, name) => {
    acc[name] = 0;
    return acc;
  }, {});

  base.Outros = 0;
  return base;
};

const criarMapaAcoesQualidade = () => {
  const base = ACTION_TYPES.reduce((acc, name) => {
    acc[name] = criarContagemPorBucket();
    return acc;
  }, {});

  base.Outros = criarContagemPorBucket();
  return base;
};

const normalizarNomeAcao = (nome) => {
  const texto = String(nome || '').trim();
  if (!texto) {
    return 'Outros';
  }

  const semAcento = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lower = semAcento.toLowerCase();

  if (lower.startsWith('saq')) return 'Saque';
  if (lower.startsWith('ata')) return 'Ataque';
  if (lower.startsWith('bloq')) return 'Bloqueio';
  if (lower.startsWith('recep')) return 'Recepcao';
  if (lower.startsWith('def')) return 'Defesa';

  return 'Outros';
};

class Player {
  // Adicionado categoriaId
  constructor(id, cpfNumero, nome, dataNasc, numCamisa, rg, altura, posicaoId, foto, categoriaId = null) {
    this.id = id;
    // CPF e RG sao UNIQUE e opcionais: string vazia colide, NULL nao.
    this.cpf = normalizarDocumento(cpfNumero);
    this.nome = nome;
    this.dataNasc = dataNasc;
    this.numCamisa = numCamisa;
    this.rg = normalizarDocumento(rg);
    this.altura = altura;
    this.posicaoId = posicaoId;
    this.foto = foto;
    this.categoriaId = categoriaId; 
  }

    /**
     * CPF em branco e valido: o campo e opcional.
     *
     * Passa por `normalizarDocumento` de proposito - um campo so com espacos e
     * "vazio" para o usuario, mas era truthy aqui e caia no validador, que o
     * recusava como CPF invalido.
     */
    validarCPF(cpfString) {
      const documento = normalizarDocumento(cpfString);
      if (!documento) return true;
      return cpf.isValid(documento);
    }

  static buscarJogador(jogadorId) {
    if (!jogadorId) {
      return null;
    }

    return db.prepare(`
      SELECT
        j.id,
        j.nome,
        j.posicao_id,
        p.nome AS posicaoNome
      FROM Jogadores j
      LEFT JOIN Posicoes p ON p.id = j.posicao_id
      WHERE j.id = ?
    `).get(Number(jogadorId));
  }

  insertPlayer(db) {
    try {
      // Inserindo também a categoria_id
      const sql = db.prepare('INSERT INTO Jogadores (cpf, nome, dataNasc, numCamisa, rg, altura, posicao_id, foto, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = sql.run(this.cpf, this.nome, this.dataNasc, this.numCamisa, this.rg, this.altura, this.posicaoId, this.foto, this.categoriaId);
      return info.lastInsertRowid;
    } catch (e) {
      throw e;
    }
  }

  /**
   * O que ficaria orfao se o atleta fosse apagado.
   *
   * A tela usa isso para dizer ao usuario, ANTES de confirmar, quanto de
   * historico a exclusao leva junto.
   */
  static contarVinculos(id, db) {
    const jogadorId = Number(id);
    const contar = (sql, ...params) => Number(db.prepare(sql).get(...params)?.total) || 0;

    const acoes = contar('SELECT COUNT(*) AS total FROM Acao WHERE Jogador_id = ?', jogadorId);
    const partidas = contar(
      `SELECT COUNT(DISTINCT Ponto_Partida_id) AS total
       FROM Acao WHERE Jogador_id = ? AND Ponto_Partida_id IS NOT NULL`,
      jogadorId
    );
    const escalacoes = contar(
      'SELECT COUNT(*) AS total FROM TimesPartida WHERE Jogadores_id = ?',
      jogadorId
    );
    const substituicoes = contar(
      'SELECT COUNT(*) AS total FROM Substituicao WHERE JogadorEntra = ? OR JogadorSai = ?',
      jogadorId,
      jogadorId
    );
    const pontos = contar('SELECT COUNT(*) AS total FROM Ponto WHERE Jogador_id = ?', jogadorId);

    return {
      acoes,
      partidas,
      escalacoes,
      substituicoes,
      pontos,
      total: acoes + escalacoes + substituicoes + pontos,
    };
  }

  /**
   * Exclusao do atleta com a cascata feita a mao.
   *
   * `Acao.Jogador_id`, `Ponto.Jogador_id` e `Substituicao` referenciam
   * `Jogadores` sem ON DELETE, e o banco roda com `foreign_keys = ON`: apagar
   * direto um atleta que ja foi escoutado estourava "FOREIGN KEY constraint
   * failed" e o card simplesmente nao sumia da tela.
   *
   * A ordem importa. Os rallies em que o atleta agiu sao guardados ANTES de
   * apagar as acoes, porque depois nao ha mais como saber quais eram - e o dono
   * de cada um precisa ser recalculado a partir das acoes que sobraram, senao
   * o rally ficaria sem dono mesmo tendo outro atleta na jogada.
   */
  deletePlayer(id, db) {
    const jogadorId = Number(id);

    const ralliesAfetados = db.prepare(`
      SELECT DISTINCT
        Ponto_Partida_id AS partidaId,
        Ponto_NumSet AS numSet,
        Ponto_pontoTime1 AS pontoTime1,
        Ponto_pontoTime2 AS pontoTime2
      FROM Acao
      WHERE Jogador_id = ?
        AND Ponto_Partida_id IS NOT NULL
        AND Ponto_NumSet IS NOT NULL
    `).all(jogadorId);

    db.prepare('DELETE FROM Substituicao WHERE JogadorEntra = ? OR JogadorSai = ?')
      .run(jogadorId, jogadorId);
    db.prepare('DELETE FROM Acao WHERE Jogador_id = ?').run(jogadorId);
    db.prepare('DELETE FROM TimesPartida WHERE Jogadores_id = ?').run(jogadorId);
    db.prepare('UPDATE Ponto SET Jogador_id = NULL WHERE Jogador_id = ?').run(jogadorId);

    ralliesAfetados.forEach((rally) => {
      Ponto.sincronizarDonoDoPonto(
        rally.partidaId,
        rally.numSet,
        rally.pontoTime1,
        rally.pontoTime2,
        db
      );
    });

    const info = db.prepare('DELETE FROM Jogadores WHERE id = ?').run(jogadorId);
    return { success: info.changes > 0, changes: info.changes };
  }

  updatePlayer(db) {
    try {
      // Atualizando também a categoria_id
      const sql = db.prepare('UPDATE Jogadores SET cpf = ?, nome = ?, dataNasc = ?, numCamisa = ?, rg = ?, altura = ?, posicao_id = ?, foto = ?, categoria_id = ? WHERE id = ?');
      sql.run(this.cpf, this.nome, this.dataNasc, this.numCamisa, this.rg, this.altura, this.posicaoId, this.foto, this.categoriaId, this.id);
    } catch (e) {
      throw e;
    }
  }

  findAllPlayers(db) {
    try {
      const sql = db.prepare('SELECT * FROM Jogadores ORDER BY nome ASC');
      return sql.all();
    } catch (e) {
      throw e;
    }
  }

  findPlayerFiltered(filtro, db) {
    try {
      let sqlQuery = `
        SELECT j.*, p.nome as posicao, c.nome as categoria
        FROM Jogadores j 
        LEFT JOIN Posicoes p ON j.posicao_id = p.id 
        LEFT JOIN Categorias c ON c.id = j.categoria_id
        WHERE 1=1
      `;
      const params = [];

      if (filtro.nome) {
        sqlQuery += ` AND j.nome LIKE ?`;
        params.push(`%${filtro.nome}%`);
      }

      if (filtro.posicaoId) {
        sqlQuery += ` AND j.posicao_id = ?`;
        params.push(filtro.posicaoId);
      }

      sqlQuery += ` ORDER BY j.nome ASC`;

      const sql = db.prepare(sqlQuery);
      return sql.all(...params);
    } catch (e) {
      throw e;
    }       
  }

  buscarRankingJogadores(filtro = {}) {
    const params = [];
    let where = 'WHERE 1=1';

    if (filtro.posicaoId) {
      where += ' AND j.posicao_id = ?';
      params.push(Number(filtro.posicaoId));
    }

    if (filtro.categoriaId) {
      where += ' AND j.categoria_id = ?';
      params.push(Number(filtro.categoriaId));
    }

    const rows = db.prepare(`
      SELECT
        j.id,
        j.nome,
        j.numCamisa,
        j.foto,
        j.posicao_id AS posicaoId,
        p.nome AS posicaoNome,
        j.categoria_id AS categoriaId,
        c.nome AS categoriaNome,
        COUNT(a.id) AS totalAcoes,
        SUM(CASE WHEN ${sqlEhPonto('a')} THEN 1 ELSE 0 END) AS pontosAcao,
        SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'bloq%' THEN 1 ELSE 0 END) AS bloqueios
      FROM Jogadores j
      LEFT JOIN Posicoes p ON p.id = j.posicao_id
      LEFT JOIN Categorias c ON c.id = j.categoria_id
      LEFT JOIN Acao a ON a.Jogador_id = j.id
      LEFT JOIN TipoAcao ta ON ta.idTipoAcao = a.idTipoAcao
      ${where}
      GROUP BY j.id
    `).all(...params);

    const ranking = rows.map((row) => {
      const totalAcoes = Number(row.totalAcoes) || 0;
      const pontosAcao = Number(row.pontosAcao) || 0;
      const bloqueios = Number(row.bloqueios) || 0;

      return {
        id: row.id,
        nome: row.nome,
        numCamisa: row.numCamisa,
        foto: row.foto || '',
        posicaoId: row.posicaoId,
        posicaoNome: row.posicaoNome || '--',
        categoriaId: row.categoriaId,
        categoriaNome: row.categoriaNome || '--',
        totalAcoes,
        pontosAcao,
        bloqueios,
        efetividade: totalAcoes > 0 ? Number(((pontosAcao / totalAcoes) * 100).toFixed(1)) : 0,
      };
    });

    const ordenacao = filtro.ordenacao || 'efetividade';
    const getMetric = (player) => {
      if (ordenacao === 'pontos') return player.pontosAcao;
      if (ordenacao === 'bloqueios') return player.bloqueios;
      if (ordenacao === 'acoes') return player.totalAcoes;
      return player.efetividade;
    };

    return ranking.sort((a, b) => {
      const metricDiff = getMetric(b) - getMetric(a);
      if (metricDiff !== 0) return metricDiff;
      return String(a.nome || '').localeCompare(String(b.nome || ''));
    });
  }

  buscarRelatorioJogador(jogadorId) {
    const id = Number(jogadorId);
    if (!id) {
      return null;
    }

    const jogador = db.prepare(`
      SELECT
        j.id,
        j.nome,
        j.numCamisa,
        j.cpf,
        j.rg,
        j.dataNasc,
        j.altura,
        j.foto,
        j.posicao_id AS posicaoId,
        p.nome AS posicaoNome,
        j.categoria_id AS categoriaId,
        c.nome AS categoriaNome
      FROM Jogadores j
      LEFT JOIN Posicoes p ON p.id = j.posicao_id
      LEFT JOIN Categorias c ON c.id = j.categoria_id
      WHERE j.id = ?
    `).get(id);

    if (!jogador) {
      return null;
    }

    const totals = {
      acoes: 0,
      partidas: 0,
      torneios: 0,
      qualidade: criarContagemPorBucket(),
      acoesPorTipo: criarMapaAcoes(),
      acoesPorTipoQualidade: criarMapaAcoesQualidade(),
    };

    const actionRows = db.prepare(`
      SELECT
        T.Nome AS tipoAcaoNome,
        A.Qualidade AS qualidade,
        COUNT(*) AS total
      FROM Acao A
      LEFT JOIN TipoAcao T ON T.idTipoAcao = A.idTipoAcao
      WHERE A.Jogador_id = ?
      GROUP BY T.Nome, A.Qualidade
    `).all(id);

    actionRows.forEach((row) => {
      const count = Number(row.total) || 0;
      totals.acoes += count;

      // O simbolo sozinho nao diz o resultado: "/" e erro no ataque e boa bola
      // no saque. Por isso a classificacao leva o fundamento junto.
      const balde = bucketDoResultado(row.tipoAcaoNome, row.qualidade);
      totals.qualidade[balde] += count;

      const actionKey = normalizarNomeAcao(row.tipoAcaoNome);
      if (!Object.prototype.hasOwnProperty.call(totals.acoesPorTipo, actionKey)) {
        totals.acoesPorTipo[actionKey] = 0;
      }
      totals.acoesPorTipo[actionKey] += count;

      if (!Object.prototype.hasOwnProperty.call(totals.acoesPorTipoQualidade, actionKey)) {
        totals.acoesPorTipoQualidade[actionKey] = criarContagemPorBucket();
      }

      totals.acoesPorTipoQualidade[actionKey][balde] += count;
    });

    const matchRows = db.prepare(`
      SELECT
        P.id AS partidaId,
        P.nome AS partidaNome,
        P.dataPartida,
        P.status,
        P.torneio_id AS torneioId,
        Tor.nome AS torneioNome,
        T1.nome AS time1Nome,
        T2.nome AS time2Nome,
        COUNT(A.id) AS totalAcoes,
${sqlContagemPorResultado('A', 'qualidade')}
      FROM Acao A
      JOIN Partidas P ON P.id = A.Ponto_Partida_id
      LEFT JOIN Torneios Tor ON Tor.id = P.torneio_id
      LEFT JOIN Times T1 ON T1.id = P.time1
      LEFT JOIN Times T2 ON T2.id = P.time2
      WHERE A.Jogador_id = ?
      GROUP BY P.id
      ORDER BY P.dataPartida DESC
    `).all(id);

    const matchActionRows = db.prepare(`
      SELECT
        P.id AS partidaId,
        T.Nome AS tipoAcaoNome,
        COUNT(*) AS total
      FROM Acao A
      JOIN Partidas P ON P.id = A.Ponto_Partida_id
      LEFT JOIN TipoAcao T ON T.idTipoAcao = A.idTipoAcao
      WHERE A.Jogador_id = ?
      GROUP BY P.id, T.Nome
    `).all(id);

    const matchActionsMap = new Map();
    matchActionRows.forEach((row) => {
      const partidaId = Number(row.partidaId);
      if (!matchActionsMap.has(partidaId)) {
        matchActionsMap.set(partidaId, criarMapaAcoes());
      }

      const actionKey = normalizarNomeAcao(row.tipoAcaoNome);
      const current = matchActionsMap.get(partidaId);
      if (!Object.prototype.hasOwnProperty.call(current, actionKey)) {
        current[actionKey] = 0;
      }
      current[actionKey] += Number(row.total) || 0;
    });

    const partidas = matchRows.map((row) => ({
      id: row.partidaId,
      nome: row.partidaNome || `Partida #${row.partidaId}`,
      dataPartida: row.dataPartida,
      status: row.status,
      time1Nome: row.time1Nome,
      time2Nome: row.time2Nome,
      torneioId: row.torneioId,
      torneioNome: row.torneioNome,
      acoes: Number(row.totalAcoes) || 0,
      qualidade: {
        Ponto: Number(row.qualidadePonto) || 0,
        Neutra: Number(row.qualidadeNeutra) || 0,
        Erro: Number(row.qualidadeErro) || 0,
      },
      acoesPorTipo: matchActionsMap.get(Number(row.partidaId)) || criarMapaAcoes(),
    }));

    const torneioRows = db.prepare(`
      SELECT
        Tor.id AS torneioId,
        Tor.nome AS torneioNome,
        Tor.inicio,
        Tor.termino,
        COUNT(DISTINCT P.id) AS partidas,
        COUNT(A.id) AS totalAcoes
      FROM Acao A
      JOIN Partidas P ON P.id = A.Ponto_Partida_id
      LEFT JOIN Torneios Tor ON Tor.id = P.torneio_id
      WHERE A.Jogador_id = ?
      GROUP BY Tor.id
      ORDER BY Tor.inicio DESC
    `).all(id);

    const torneios = torneioRows.map((row) => ({
      id: row.torneioId,
      nome: row.torneioNome || 'Sem torneio',
      inicio: row.inicio,
      termino: row.termino,
      partidas: Number(row.partidas) || 0,
      acoes: Number(row.totalAcoes) || 0,
    }));

    totals.partidas = partidas.length;
    totals.torneios = torneios.length;

    return {
      jogador,
      totals,
      partidas,
      torneios,
    };
  }
}

export default Player;
