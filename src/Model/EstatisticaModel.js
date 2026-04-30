import db from '../db/db';

const ACTION_NAMES = ['Saque', 'Ataque', 'Bloqueio', 'Recepcao', 'Defesa'];

class EstatisticaModel {
  normalizarPlacar(value) {
    return Math.max(0, Number(value) || 0);
  }

  montarPlacarRascunho(score) {
    return {
      home: this.normalizarPlacar(score?.home),
      away: this.normalizarPlacar(score?.away),
    };
  }

  montarEstatisticaVazia() {
    return {
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
    };
  }

  montarResultadoPartida(partidaScore = {}) {
    return {
      home: this.normalizarPlacar(partidaScore.home),
      away: this.normalizarPlacar(partidaScore.away),
    };
  }

  montarEstatisticaVaziaComPartida(partidaScore) {
    return {
      ...this.montarEstatisticaVazia(),
      resultadoPartida: this.montarResultadoPartida(partidaScore),
    };
  }

  garantirColunasPlacarSet() {
    const columns = db.prepare('PRAGMA table_info("Set")').all().map((column) => column.name);

    if (!columns.includes('pontosTime1')) {
      db.exec('ALTER TABLE "Set" ADD COLUMN pontosTime1 INTEGER');
    }

    if (!columns.includes('pontosTime2')) {
      db.exec('ALTER TABLE "Set" ADD COLUMN pontosTime2 INTEGER');
    }
  }

  normalizarNomeAcao(name) {
    const actionName = String(name || '').trim();
    if (actionName.toLowerCase().startsWith('recep')) return 'Recepcao';
    return actionName || 'Sem tipo';
  }

  criarEstatisticaJogador(row) {
    return {
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
      acoesDetalhadas: [],
    };
  }

  montarEstatisticasPorLinhas(rows = [], partidaScore = {}) {
    const resultadoPartida = this.montarResultadoPartida(partidaScore);

    if (!rows.length) {
      return this.montarEstatisticaVaziaComPartida(resultadoPartida);
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
          savedPlacar: hasSavedScore
            ? {
                home: this.normalizarPlacar(row.pontosTime1),
                away: this.normalizarPlacar(row.pontosTime2),
              }
            : null,
          placar: {
            home: this.normalizarPlacar(row.pontoTime1),
            away: this.normalizarPlacar(row.pontoTime2),
          },
        });
      }

      const setStats = setsMap.get(setNumber);
      if (row.pontoTime1 !== null && row.pontoTime1 !== undefined && !setStats.pontosMap.has(pointKey)) {
        setStats.pontosMap.set(pointKey, {
          home: this.normalizarPlacar(row.pontoTime1),
          away: this.normalizarPlacar(row.pontoTime2),
        });
      }

      const currentTotal = setStats.placar.home + setStats.placar.away;
      const rowTotal = this.normalizarPlacar(row.pontoTime1) + this.normalizarPlacar(row.pontoTime2);
      if (rowTotal >= currentTotal) {
        setStats.placar = {
          home: this.normalizarPlacar(row.pontoTime1),
          away: this.normalizarPlacar(row.pontoTime2),
        };
      }

      if (!row.acaoId) {
        continue;
      }

      totalAcoes += 1;
      setStats.acoes += 1;

      if (!jogadoresMap.has(row.jogadorId)) {
        jogadoresMap.set(row.jogadorId, this.criarEstatisticaJogador(row));
      }

      const playerStats = jogadoresMap.get(row.jogadorId);
      const actionName = this.normalizarNomeAcao(row.tipoAcaoNome);
      const quality = String(row.qualidade || '').toUpperCase();

      playerStats.totalAcoes += 1;
      playerStats.acoes[actionName] = (playerStats.acoes[actionName] || 0) + 1;
      if (Object.prototype.hasOwnProperty.call(playerStats.qualidade, quality)) {
        playerStats.qualidade[quality] += 1;
      }

      playerStats.acoesDetalhadas.push({
        id: row.acaoId,
        numSet: row.numSet,
        pontoTime1: row.pontoTime1,
        pontoTime2: row.pontoTime2,
        jogadorId: row.jogadorId,
        jogadorNome: row.jogadorNome || 'Jogador',
        jogadorNumero: row.jogadorNumero || '--',
        tipoAcaoId: row.tipoAcaoId,
        tipoAcaoNome: row.tipoAcaoNome || 'Sem tipo',
        qualidade: quality,
      });
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
  }

  buscarEstatisticasPartida(partidaId) {
    if (!partidaId) {
      return this.montarEstatisticaVazia();
    }

    this.garantirColunasPlacarSet();

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
        A.idTipoAcao AS tipoAcaoId,
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

    return this.montarEstatisticasPorLinhas(sql.all(Number(partidaId)), partidaScore);
  }

  buscarOpcoesEdicaoAcao(partidaId) {
    const jogadoresEscalados = db.prepare(`
      SELECT DISTINCT
        J.id,
        J.nome,
        J.NumCamisa AS numero
      FROM TimesPartida TP
      INNER JOIN Jogadores J ON J.id = TP.Jogadores_id
      WHERE TP.Partida_id = ?
      ORDER BY J.nome ASC
    `).all(Number(partidaId));

    const jogadores = jogadoresEscalados.length > 0
      ? jogadoresEscalados
      : db.prepare(`
          SELECT
            id,
            nome,
            NumCamisa AS numero
          FROM Jogadores
          ORDER BY nome ASC
        `).all();

    const tiposAcao = db.prepare(`
      SELECT idTipoAcao, Nome AS nome
      FROM TipoAcao
      ORDER BY idTipoAcao ASC
    `).all();

    return {
      jogadores,
      tiposAcao,
      qualidades: ['A', 'B', 'C'],
    };
  }

  editarAcao(partidaId, dadosAcao) {
    const acaoId = Number(dadosAcao?.id);
    const jogadorId = Number(dadosAcao?.jogadorId);
    const tipoAcaoId = Number(dadosAcao?.tipoAcaoId);
    const qualidade = String(dadosAcao?.qualidade || '').toUpperCase();

    if (!acaoId || !jogadorId || !tipoAcaoId || !['A', 'B', 'C'].includes(qualidade)) {
      throw new Error('Dados invalidos para editar a acao.');
    }

    const acao = db.prepare(`
      SELECT id
      FROM Acao
      WHERE id = ? AND Ponto_Partida_id = ?
    `).get(acaoId, Number(partidaId));

    if (!acao) {
      throw new Error('Acao nao encontrada para esta partida.');
    }

    const opcoes = this.buscarOpcoesEdicaoAcao(partidaId);
    const jogadorPermitido = opcoes.jogadores.some((jogador) => Number(jogador.id) === jogadorId);
    if (!jogadorPermitido) {
      throw new Error('Jogador nao pertence as opcoes desta partida.');
    }

    const tipoAcaoPermitido = opcoes.tiposAcao.some((tipo) => Number(tipo.idTipoAcao) === tipoAcaoId);
    if (!tipoAcaoPermitido) {
      throw new Error('Tipo de acao invalido.');
    }

    const updateTransaction = db.transaction(() => {
      const stmt = db.prepare(`
        UPDATE Acao
        SET Jogador_id = ?, idTipoAcao = ?, Qualidade = ?
        WHERE id = ? AND Ponto_Partida_id = ?
      `);

      const result = stmt.run(jogadorId, tipoAcaoId, qualidade, acaoId, Number(partidaId));
      if (result.changes === 0) {
        throw new Error('Nenhuma acao foi atualizada.');
      }
    });

    updateTransaction();
    return this.buscarEstatisticasPartida(partidaId);
  }

  excluirAcao(partidaId, acaoId) {
    const partida = Number(partidaId);
    const acao = Number(acaoId);

    if (!partida || !acao) {
      throw new Error('Acao invalida para exclusao.');
    }

    const deleteTransaction = db.transaction(() => {
      const acaoRow = db.prepare(`
        SELECT Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id
        FROM Acao
        WHERE id = ? AND Ponto_Partida_id = ?
      `).get(acao, partida);

      if (!acaoRow) {
        throw new Error('Acao nao encontrada para esta partida.');
      }

      const result = db.prepare(`
        DELETE FROM Acao
        WHERE id = ? AND Ponto_Partida_id = ?
      `).run(acao, partida);

      if (result.changes === 0) {
        throw new Error('Acao nao encontrada para esta partida.');
      }

      const acoesRestantes = db.prepare(`
        SELECT COUNT(*) AS total
        FROM Acao
        WHERE Ponto_pontoTime1 = ?
          AND Ponto_pontoTime2 = ?
          AND Ponto_NumSet = ?
          AND Ponto_Partida_id = ?
      `).get(
        acaoRow.Ponto_pontoTime1,
        acaoRow.Ponto_pontoTime2,
        acaoRow.Ponto_NumSet,
        acaoRow.Ponto_Partida_id,
      );

      if (Number(acoesRestantes?.total || 0) === 0) {
        db.prepare(`
          DELETE FROM Substituicao
          WHERE Ponto_pontoTime1 = ?
            AND Ponto_pontoTime2 = ?
            AND Ponto_NumSet = ?
            AND Ponto_Partida_id = ?
        `).run(
          acaoRow.Ponto_pontoTime1,
          acaoRow.Ponto_pontoTime2,
          acaoRow.Ponto_NumSet,
          acaoRow.Ponto_Partida_id,
        );

        db.prepare(`
          DELETE FROM Ponto
          WHERE pontoTime1 = ?
            AND pontoTime2 = ?
            AND NumSet = ?
            AND Set_Partida_id = ?
        `).run(
          acaoRow.Ponto_pontoTime1,
          acaoRow.Ponto_pontoTime2,
          acaoRow.Ponto_NumSet,
          acaoRow.Ponto_Partida_id,
        );
      }
    });

    deleteTransaction();
    return this.buscarEstatisticasPartida(partidaId);
  }

  excluirSet(partidaId, numSet) {
    const partida = Number(partidaId);
    const setNumber = Number(numSet);

    if (!partida || !setNumber) {
      throw new Error('Set invalido para exclusao.');
    }

    const deleteTransaction = db.transaction(() => {
      db.prepare('DELETE FROM Substituicao WHERE Ponto_Partida_id = ? AND Ponto_NumSet = ?')
        .run(partida, setNumber);
      db.prepare('DELETE FROM Acao WHERE Ponto_Partida_id = ? AND Ponto_NumSet = ?')
        .run(partida, setNumber);
      db.prepare('DELETE FROM Ponto WHERE Set_Partida_id = ? AND NumSet = ?')
        .run(partida, setNumber);
      db.prepare('DELETE FROM "Set" WHERE Partida_id = ? AND NumSet = ?')
        .run(partida, setNumber);
    });

    deleteTransaction();
    return this.buscarEstatisticasPartida(partidaId);
  }

  salvarPontuacaoSets(partidaId, sets = []) {
    if (!partidaId) {
      return this.montarEstatisticaVazia();
    }

    this.garantirColunasPlacarSet();

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
          this.normalizarPlacar(setScore.home),
          this.normalizarPlacar(setScore.away),
          numSet,
          Number(partida),
        );
      }
    });

    saveTransaction(Number(partidaId), sets);
    return this.buscarEstatisticasPartida(partidaId);
  }
}

const estatisticaModel = new EstatisticaModel();

export const normalizeScoreValue = (value) => estatisticaModel.normalizarPlacar(value);
export const buildDraftScore = (score) => estatisticaModel.montarPlacarRascunho(score);
export const buildEmptyStatistics = () => estatisticaModel.montarEstatisticaVazia();
export const buildStatisticsFromRows = (rows = [], partidaScore = {}) =>
  estatisticaModel.montarEstatisticasPorLinhas(rows, partidaScore);
export const buscarEstatisticasPartida = (partidaId) =>
  estatisticaModel.buscarEstatisticasPartida(partidaId);
export const salvarPontuacaoSets = (partidaId, sets = []) =>
  estatisticaModel.salvarPontuacaoSets(partidaId, sets);

export default EstatisticaModel;
