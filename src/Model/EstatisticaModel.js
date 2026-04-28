import db from '../db/db';

const ACTION_NAMES = ['Saque', 'Ataque', 'Bloqueio', 'Recepcao', 'Defesa'];

export const normalizeScoreValue = (value) => Math.max(0, Number(value) || 0);

export const buildDraftScore = (score) => ({
  home: normalizeScoreValue(score?.home),
  away: normalizeScoreValue(score?.away),
});

export const buildEmptyStatistics = () => ({
  totals: {
    sets: 0,
    pontos: 0,
    acoes: 0,
  },
  resultadoPartida: {
    home: 0,
    away: 0,
  },
  resultadoSets: {
    home: 0,
    away: 0,
  },
  jogadores: [],
  sets: [],
});

const buildResultFromPartida = (partidaScore = {}) => ({
  home: normalizeScoreValue(partidaScore.home),
  away: normalizeScoreValue(partidaScore.away),
});

const buildEmptyStatisticsWithPartida = (partidaScore) => ({
  ...buildEmptyStatistics(),
  resultadoPartida: buildResultFromPartida(partidaScore),
});

const ensureSetScoreColumns = () => {
  const columns = db.prepare('PRAGMA table_info("Set")').all().map((column) => column.name);

  if (!columns.includes('pontosTime1')) {
    db.exec('ALTER TABLE "Set" ADD COLUMN pontosTime1 INTEGER');
  }

  if (!columns.includes('pontosTime2')) {
    db.exec('ALTER TABLE "Set" ADD COLUMN pontosTime2 INTEGER');
  }
};

const normalizeActionName = (name) => {
  const actionName = String(name || '').trim();
  if (actionName.toLowerCase().startsWith('recep')) return 'Recepcao';
  return actionName || 'Sem tipo';
};

const createPlayerStats = (row) => ({
  id: row.jogadorId,
  nome: row.jogadorNome || 'Jogador',
  numero: row.jogadorNumero || '--',
  totalAcoes: 0,
  qualidade: {
    A: 0,
    B: 0,
    C: 0,
  },
  acoes: ACTION_NAMES.reduce((acc, actionName) => {
    acc[actionName] = 0;
    return acc;
  }, {}),
});

export const buildStatisticsFromRows = (rows = [], partidaScore = {}) => {
  const resultadoPartida = buildResultFromPartida(partidaScore);

  if (!rows.length) {
    return buildEmptyStatisticsWithPartida(resultadoPartida);
  }

  const jogadoresMap = new Map();
  const setsMap = new Map();
  let totalAcoes = 0;

  for (const row of rows) {
    const setNumber = Number(row.numSet);
    const pointKey = `${row.pontoTime1}-${row.pontoTime2}`;

    if (!setsMap.has(setNumber)) {
      const hasSavedScore = row.pontosTime1 !== null && row.pontosTime1 !== undefined
        && row.pontosTime2 !== null && row.pontosTime2 !== undefined;

      setsMap.set(setNumber, {
        numSet: setNumber,
        pontosMap: new Map(),
        acoes: 0,
        hasSavedScore,
        savedPlacar: hasSavedScore
          ? {
              home: normalizeScoreValue(row.pontosTime1),
              away: normalizeScoreValue(row.pontosTime2),
            }
          : null,
        placar: {
          home: normalizeScoreValue(row.pontoTime1),
          away: normalizeScoreValue(row.pontoTime2),
        },
      });
    }

    const setStats = setsMap.get(setNumber);
    if (row.pontoTime1 !== null && row.pontoTime1 !== undefined && !setStats.pontosMap.has(pointKey)) {
      setStats.pontosMap.set(pointKey, {
        home: normalizeScoreValue(row.pontoTime1),
        away: normalizeScoreValue(row.pontoTime2),
      });
    }

    const currentTotal = setStats.placar.home + setStats.placar.away;
    const rowTotal = normalizeScoreValue(row.pontoTime1) + normalizeScoreValue(row.pontoTime2);
    if (rowTotal >= currentTotal) {
      setStats.placar = {
        home: normalizeScoreValue(row.pontoTime1),
        away: normalizeScoreValue(row.pontoTime2),
      };
    }

    if (!row.acaoId) {
      continue;
    }

    totalAcoes += 1;
    setStats.acoes += 1;

    if (!jogadoresMap.has(row.jogadorId)) {
      jogadoresMap.set(row.jogadorId, createPlayerStats(row));
    }

    const playerStats = jogadoresMap.get(row.jogadorId);
    const actionName = normalizeActionName(row.tipoAcaoNome);
    const quality = String(row.qualidade || '').toUpperCase();

    playerStats.totalAcoes += 1;
    playerStats.acoes[actionName] = (playerStats.acoes[actionName] || 0) + 1;
    if (Object.prototype.hasOwnProperty.call(playerStats.qualidade, quality)) {
      playerStats.qualidade[quality] += 1;
    }
  }

  const sets = Array.from(setsMap.values())
    .map((setStats) => {
      const placar = setStats.savedPlacar || setStats.placar;

      return {
        numSet: setStats.numSet,
        pontos: setStats.pontosMap.size,
        acoes: setStats.acoes,
        placar,
        vencedor: placar.home > placar.away ? 'home' : placar.away > placar.home ? 'away' : null,
      };
    })
    .sort((a, b) => a.numSet - b.numSet);

  const jogadores = Array.from(jogadoresMap.values())
    .sort((a, b) => b.totalAcoes - a.totalAcoes || String(a.nome).localeCompare(String(b.nome)));

  const resultadoSets = sets.reduce((resultado, setStats) => {
    if (setStats.vencedor === 'home') {
      resultado.home += 1;
    }

    if (setStats.vencedor === 'away') {
      resultado.away += 1;
    }

    return resultado;
  }, { home: 0, away: 0 });

  return {
    totals: {
      sets: sets.length,
      pontos: sets.reduce((sum, setStats) => sum + setStats.pontos, 0),
      acoes: totalAcoes,
    },
    resultadoPartida,
    resultadoSets,
    jogadores,
    sets,
  };
};

export const buscarEstatisticasPartida = (partidaId) => {
  if (!partidaId) {
    return buildEmptyStatistics();
  }

  ensureSetScoreColumns();

  const partidaRow = db.prepare(`
    SELECT pontosTime1, pontosTime2
    FROM Partidas
    WHERE id = ?
  `).get(Number(partidaId));

  const partidaScore = {
    home: partidaRow?.pontosTime1,
    away: partidaRow?.pontosTime2,
  };

  const sql = db.prepare(`
    SELECT
      S.NumSet AS numSet,
      S.pontosTime1,
      S.pontosTime2,
      P.pontoTime1,
      P.pontoTime2,
      A.id AS acaoId,
      A.Qualidade AS qualidade,
      J.id AS jogadorId,
      J.nome AS jogadorNome,
      J.NumCamisa AS jogadorNumero,
      T.Nome AS tipoAcaoNome
    FROM "Set" S
    LEFT JOIN Ponto P ON P.NumSet = S.NumSet
                     AND P.Set_Partida_id = S.Partida_id
    LEFT JOIN Acao A ON P.pontoTime1 = A.Ponto_pontoTime1
                    AND P.pontoTime2 = A.Ponto_pontoTime2
                    AND P.NumSet = A.Ponto_NumSet
                    AND P.Set_Partida_id = A.Ponto_Partida_id
    LEFT JOIN Jogadores J ON A.Jogador_id = J.id
    LEFT JOIN TipoAcao T ON A.idTipoAcao = T.idTipoAcao
    WHERE S.Partida_id = ?
    ORDER BY S.NumSet ASC, (P.pontoTime1 + P.pontoTime2) ASC, P.pontoTime1 ASC, P.pontoTime2 ASC, A.id ASC
  `);

  return buildStatisticsFromRows(sql.all(Number(partidaId)), partidaScore);
};

export const salvarPontuacaoSets = (partidaId, sets = []) => {
  if (!partidaId) {
    return buildEmptyStatistics();
  }

  ensureSetScoreColumns();

  const saveTransaction = db.transaction((partida, draftSets) => {
    const insertSet = db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)');
    const updateSet = db.prepare(`
      UPDATE "Set"
      SET pontosTime1 = ?, pontosTime2 = ?
      WHERE NumSet = ? AND Partida_id = ?
    `);

    for (const setScore of draftSets) {
      const numSet = Number(setScore.numSet);
      if (!numSet) continue;

      insertSet.run(numSet, Number(partida));
      updateSet.run(
        normalizeScoreValue(setScore.home),
        normalizeScoreValue(setScore.away),
        numSet,
        Number(partida),
      );
    }
  });

  saveTransaction(Number(partidaId), sets);
  return buscarEstatisticasPartida(partidaId);
};
