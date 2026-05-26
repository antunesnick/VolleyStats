// Substituído require() por import para harmonizar com o export default no final
import { cpf } from 'cpf-cnpj-validator';
import db from '../db/db';

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
    acc[name] = { A: 0, B: 0, C: 0 };
    return acc;
  }, {});

  base.Outros = { A: 0, B: 0, C: 0 };
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
    this.cpf = cpfNumero;
    this.nome = nome;
    this.dataNasc = dataNasc;
    this.numCamisa = numCamisa;
    this.rg = rg;
    this.altura = altura;
    this.posicaoId = posicaoId;
    this.foto = foto;
    this.categoriaId = categoriaId; 
  }

    validarCPF(cpfString) {
      if (!cpfString) return true;
      return cpf.isValid(cpfString);
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

  deletePlayer(id, db) {
    try { 
      const sql = db.prepare('DELETE FROM Jogadores WHERE id = ?');
      sql.run(id);
    } catch (e) {
      throw e;
    }
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
        SUM(CASE WHEN UPPER(COALESCE(a.Qualidade, '')) = 'A' THEN 1 ELSE 0 END) AS acertos,
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
      const acertos = Number(row.acertos) || 0;
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
        acertos,
        bloqueios,
        efetividade: totalAcoes > 0 ? Number(((acertos / totalAcoes) * 100).toFixed(1)) : 0,
      };
    });

    const ordenacao = filtro.ordenacao || 'efetividade';
    const getMetric = (player) => {
      if (ordenacao === 'acertos') return player.acertos;
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
      qualidade: { A: 0, B: 0, C: 0 },
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

      const quality = String(row.qualidade || '').toUpperCase();
      if (Object.prototype.hasOwnProperty.call(totals.qualidade, quality)) {
        totals.qualidade[quality] += count;
      }

      const actionKey = normalizarNomeAcao(row.tipoAcaoNome);
      if (!Object.prototype.hasOwnProperty.call(totals.acoesPorTipo, actionKey)) {
        totals.acoesPorTipo[actionKey] = 0;
      }
      totals.acoesPorTipo[actionKey] += count;

      if (!Object.prototype.hasOwnProperty.call(totals.acoesPorTipoQualidade, actionKey)) {
        totals.acoesPorTipoQualidade[actionKey] = { A: 0, B: 0, C: 0 };
      }

      if (Object.prototype.hasOwnProperty.call(totals.acoesPorTipoQualidade[actionKey], quality)) {
        totals.acoesPorTipoQualidade[actionKey][quality] += count;
      }
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
        SUM(CASE WHEN A.Qualidade = 'A' THEN 1 ELSE 0 END) AS qualidadeA,
        SUM(CASE WHEN A.Qualidade = 'B' THEN 1 ELSE 0 END) AS qualidadeB,
        SUM(CASE WHEN A.Qualidade = 'C' THEN 1 ELSE 0 END) AS qualidadeC
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
        A: Number(row.qualidadeA) || 0,
        B: Number(row.qualidadeB) || 0,
        C: Number(row.qualidadeC) || 0,
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
