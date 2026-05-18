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
        scout: this.criarScoutVazio(),
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

  criarSnapshotPartida(partidaId) {
    const partida = Number(partidaId);
    if (!partida) {
      return null;
    }

    this.garantirColunasPlacarSet();

    return {
      partida: db.prepare(`
        SELECT id, status, pontosTime1, pontosTime2
        FROM Partidas
        WHERE id = ?
      `).get(partida),
      sets: db.prepare('SELECT * FROM "Set" WHERE Partida_id = ?').all(partida),
      pontos: db.prepare('SELECT * FROM Ponto WHERE Set_Partida_id = ?').all(partida),
      acoes: db.prepare('SELECT * FROM Acao WHERE Ponto_Partida_id = ?').all(partida),
      substituicoes: db.prepare('SELECT * FROM Substituicao WHERE Ponto_Partida_id = ?').all(partida),
    };
  }

  inserirLinhas(tableName, rows = []) {
    if (!rows.length) {
      return;
    }

    for (const row of rows) {
      const columns = Object.keys(row);
      const quotedColumns = columns.map((column) => `"${column}"`).join(', ');
      const placeholders = columns.map((column) => `@${column}`).join(', ');

      db.prepare(`INSERT INTO "${tableName}" (${quotedColumns}) VALUES (${placeholders})`).run(row);
    }
  }

  restaurarSnapshotPartida(partidaId, snapshot) {
    const partida = Number(partidaId);
    if (!partida || !snapshot) {
      return this.buscarEstatisticasPartida(partidaId);
    }

    db.prepare('DELETE FROM Substituicao WHERE Ponto_Partida_id = ?').run(partida);
    db.prepare('DELETE FROM Acao WHERE Ponto_Partida_id = ?').run(partida);
    db.prepare('DELETE FROM Ponto WHERE Set_Partida_id = ?').run(partida);
    db.prepare('DELETE FROM "Set" WHERE Partida_id = ?').run(partida);

    this.inserirLinhas('Set', snapshot.sets);
    this.inserirLinhas('Ponto', snapshot.pontos);
    this.inserirLinhas('Acao', snapshot.acoes);
    this.inserirLinhas('Substituicao', snapshot.substituicoes);

    if (snapshot.partida) {
      db.prepare(`
        UPDATE Partidas
        SET status = ?, pontosTime1 = ?, pontosTime2 = ?
        WHERE id = ?
      `).run(
        snapshot.partida.status,
        snapshot.partida.pontosTime1,
        snapshot.partida.pontosTime2,
        partida,
      );
    }

    return this.buscarEstatisticasPartida(partidaId);
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

  criarScoutVazio() {
    return {
      pontosTotais: 0,
      totalAcoes: 0,
      qualidade: { A: 0, B: 0, C: 0 },
      saque: {
        total: 0,
        aces: 0,
        positivos: 0,
        continuacao: 0,
        erros: 0,
        eficiencia: 0,
      },
      recepcao: {
        total: 0,
        perfeita: 0,
        positiva: 0,
        erros: 0,
        positivaPct: 0,
        perfeitaPct: 0,
      },
      ataque: {
        total: 0,
        pontos: 0,
        positivos: 0,
        erros: 0,
        bloqueados: 0,
        eficiencia: 0,
        pontosPct: 0,
      },
      bloqueio: {
        total: 0,
        pontos: 0,
        positivos: 0,
        erros: 0,
        eficiencia: 0,
      },
      defesa: {
        total: 0,
        positivas: 0,
        erros: 0,
        eficiencia: 0,
      },
    };
  }

  arredondarPercentual(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Number(value.toFixed(1));
  }

  finalizarScout(scout) {
    const nextScout = scout || this.criarScoutVazio();
    const calcularEficiencia = (positivos, erros, total) =>
      total > 0 ? this.arredondarPercentual(((positivos - erros) / total) * 100) : 0;

    nextScout.saque.eficiencia = calcularEficiencia(
      nextScout.saque.aces + nextScout.saque.positivos,
      nextScout.saque.erros,
      nextScout.saque.total,
    );
    nextScout.recepcao.positivaPct = nextScout.recepcao.total > 0
      ? this.arredondarPercentual(((nextScout.recepcao.perfeita + nextScout.recepcao.positiva) / nextScout.recepcao.total) * 100)
      : 0;
    nextScout.recepcao.perfeitaPct = nextScout.recepcao.total > 0
      ? this.arredondarPercentual((nextScout.recepcao.perfeita / nextScout.recepcao.total) * 100)
      : 0;
    nextScout.ataque.eficiencia = calcularEficiencia(
      nextScout.ataque.pontos + nextScout.ataque.positivos,
      nextScout.ataque.erros + nextScout.ataque.bloqueados,
      nextScout.ataque.total,
    );
    nextScout.ataque.pontosPct = nextScout.ataque.total > 0
      ? this.arredondarPercentual((nextScout.ataque.pontos / nextScout.ataque.total) * 100)
      : 0;
    nextScout.bloqueio.eficiencia = calcularEficiencia(
      nextScout.bloqueio.pontos + nextScout.bloqueio.positivos,
      nextScout.bloqueio.erros,
      nextScout.bloqueio.total,
    );
    nextScout.defesa.eficiencia = calcularEficiencia(
      nextScout.defesa.positivas,
      nextScout.defesa.erros,
      nextScout.defesa.total,
    );

    return nextScout;
  }

  aplicarAcaoNoScout(scout, actionName, quality) {
    if (!scout) {
      return;
    }

    const normalizedAction = this.normalizarNomeAcao(actionName);
    const normalizedQuality = String(quality || '').toUpperCase();
    const isA = normalizedQuality === 'A';
    const isB = normalizedQuality === 'B';
    const isC = normalizedQuality === 'C';

    scout.totalAcoes += 1;
    if (Object.prototype.hasOwnProperty.call(scout.qualidade, normalizedQuality)) {
      scout.qualidade[normalizedQuality] += 1;
    }

    if (normalizedAction === 'Saque') {
      scout.saque.total += 1;
      if (isA) {
        scout.saque.aces += 1;
        scout.pontosTotais += 1;
      } else if (isB) {
        scout.saque.positivos += 1;
      } else if (isC) {
        scout.saque.erros += 1;
      } else {
        scout.saque.continuacao += 1;
      }
      return;
    }

    if (normalizedAction === 'Recepcao') {
      scout.recepcao.total += 1;
      if (isA) {
        scout.recepcao.perfeita += 1;
      } else if (isB) {
        scout.recepcao.positiva += 1;
      } else if (isC) {
        scout.recepcao.erros += 1;
      }
      return;
    }

    if (normalizedAction === 'Ataque') {
      scout.ataque.total += 1;
      if (isA) {
        scout.ataque.pontos += 1;
        scout.pontosTotais += 1;
      } else if (isB) {
        scout.ataque.positivos += 1;
      } else if (isC) {
        scout.ataque.erros += 1;
      }
      return;
    }

    if (normalizedAction === 'Bloqueio') {
      scout.bloqueio.total += 1;
      if (isA) {
        scout.bloqueio.pontos += 1;
        scout.pontosTotais += 1;
      } else if (isB) {
        scout.bloqueio.positivos += 1;
      } else if (isC) {
        scout.bloqueio.erros += 1;
      }
      return;
    }

    if (normalizedAction === 'Defesa') {
      scout.defesa.total += 1;
      if (isA || isB) {
        scout.defesa.positivas += 1;
      } else if (isC) {
        scout.defesa.erros += 1;
      }
    }
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
      scout: this.criarScoutVazio(),
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
    const scoutTotal = this.criarScoutVazio();
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
      this.aplicarAcaoNoScout(playerStats.scout, actionName, quality);
      this.aplicarAcaoNoScout(scoutTotal, actionName, quality);

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
      .map((jogador) => ({
        ...jogador,
        scout: this.finalizarScout(jogador.scout),
      }))
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
        scout: this.finalizarScout(scoutTotal),
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

  montarRelatorioGeralPartidas(tournamentId = null) {
    this.garantirColunasPlacarSet();

    const hasTournament = tournamentId !== null && tournamentId !== undefined && tournamentId !== '';
    const params = hasTournament ? [Number(tournamentId)] : [];
    const where = hasTournament ? 'WHERE p.torneio_id = ?' : '';

    const partidas = db.prepare(`
      SELECT
        p.id,
        p.nome,
        p.dataPartida,
        p.tipo,
        p.status,
        p.pontosTime1,
        p.pontosTime2,
        p.time1,
        p.time2,
        p.torneio_id,
        t1.nome AS time1Nome,
        t2.nome AS time2Nome,
        g.nome AS ginasioNome
      FROM Partidas p
      LEFT JOIN Times t1 ON t1.id = p.time1
      LEFT JOIN Times t2 ON t2.id = p.time2
      LEFT JOIN Ginasios g ON g.id = p.ginasio_id
      ${where}
      ORDER BY p.dataPartida DESC, p.id DESC
    `).all(...params);

    const ids = partidas.map((partida) => Number(partida.id)).filter(Boolean);
    const scoutTotal = this.criarScoutVazio();
    const jogadoresMap = new Map();
    const scoutPorPartida = new Map(ids.map((id) => [id, this.criarScoutVazio()]));

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(', ');
      const acoes = db.prepare(`
        SELECT
          A.id AS acaoId,
          A.Ponto_Partida_id AS partidaId,
          A.idTipoAcao AS tipoAcaoId,
          A.Qualidade AS qualidade,
          J.id AS jogadorId,
          J.nome AS jogadorNome,
          J.NumCamisa AS jogadorNumero,
          T.Nome AS tipoAcaoNome
        FROM Acao A
        LEFT JOIN Jogadores J ON A.Jogador_id = J.id
        LEFT JOIN TipoAcao T ON A.idTipoAcao = T.idTipoAcao
        WHERE A.Ponto_Partida_id IN (${placeholders})
        ORDER BY A.Ponto_Partida_id ASC, A.id ASC
      `).all(...ids);

      for (const row of acoes) {
        const actionName = this.normalizarNomeAcao(row.tipoAcaoNome);
        const quality = String(row.qualidade || '').toUpperCase();
        const playerKey = row.jogadorId || `sem-jogador-${row.acaoId}`;

        if (!jogadoresMap.has(playerKey)) {
          jogadoresMap.set(playerKey, this.criarEstatisticaJogador(row));
        }

        const playerStats = jogadoresMap.get(playerKey);
        playerStats.totalAcoes += 1;
        playerStats.acoes[actionName] = (playerStats.acoes[actionName] || 0) + 1;
        if (Object.prototype.hasOwnProperty.call(playerStats.qualidade, quality)) {
          playerStats.qualidade[quality] += 1;
        }

        this.aplicarAcaoNoScout(playerStats.scout, actionName, quality);
        this.aplicarAcaoNoScout(scoutTotal, actionName, quality);

        const matchScout = scoutPorPartida.get(Number(row.partidaId));
        this.aplicarAcaoNoScout(matchScout, actionName, quality);
      }
    }

    const timesMap = new Map();
    const ensureTime = (id, nome) => {
      const key = Number(id) || String(nome || 'time');
      if (!timesMap.has(key)) {
        timesMap.set(key, {
          id: Number(id) || null,
          nome: nome || 'Time nao definido',
          jogos: 0,
          finalizadas: 0,
          vitorias: 0,
          derrotas: 0,
          empates: 0,
          setsGanhos: 0,
          setsPerdidos: 0,
          saldoSets: 0,
          taxaVitoria: 0,
        });
      }

      return timesMap.get(key);
    };

    const jogos = partidas.map((partida) => {
      const status = String(partida.status || 'AGENDADA').toUpperCase();
      const finalizada = status === 'FINALIZADA';
      const pontosTime1 = this.normalizarPlacar(partida.pontosTime1);
      const pontosTime2 = this.normalizarPlacar(partida.pontosTime2);
      const time1 = ensureTime(partida.time1, partida.time1Nome);
      const time2 = ensureTime(partida.time2, partida.time2Nome);

      time1.jogos += 1;
      time2.jogos += 1;

      if (finalizada) {
        time1.finalizadas += 1;
        time2.finalizadas += 1;
        time1.setsGanhos += pontosTime1;
        time1.setsPerdidos += pontosTime2;
        time2.setsGanhos += pontosTime2;
        time2.setsPerdidos += pontosTime1;

        if (pontosTime1 > pontosTime2) {
          time1.vitorias += 1;
          time2.derrotas += 1;
        } else if (pontosTime2 > pontosTime1) {
          time2.vitorias += 1;
          time1.derrotas += 1;
        } else {
          time1.empates += 1;
          time2.empates += 1;
        }
      }

      return {
        ...partida,
        status,
        pontosTime1,
        pontosTime2,
        placar: finalizada ? `${pontosTime1} x ${pontosTime2}` : '--',
        vencedor: finalizada
          ? pontosTime1 > pontosTime2
            ? partida.time1Nome
            : pontosTime2 > pontosTime1
              ? partida.time2Nome
              : 'Empate'
          : 'Pendente',
        scout: this.finalizarScout(scoutPorPartida.get(Number(partida.id)) || this.criarScoutVazio()),
      };
    });

    const times = Array.from(timesMap.values()).map((time) => ({
      ...time,
      saldoSets: time.setsGanhos - time.setsPerdidos,
      taxaVitoria: time.finalizadas > 0
        ? this.arredondarPercentual((time.vitorias / time.finalizadas) * 100)
        : 0,
    })).sort((a, b) => (
      b.vitorias - a.vitorias
      || b.taxaVitoria - a.taxaVitoria
      || b.saldoSets - a.saldoSets
      || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
    ));

    const jogadores = Array.from(jogadoresMap.values()).map((jogador) => ({
      ...jogador,
      scout: this.finalizarScout(jogador.scout),
    })).sort((a, b) => (
      b.scout.pontosTotais - a.scout.pontosTotais
      || b.totalAcoes - a.totalAcoes
      || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
    ));

    return {
      resumo: {
        totalPartidas: jogos.length,
        finalizadas: jogos.filter((jogo) => jogo.status === 'FINALIZADA').length,
        agendadas: jogos.filter((jogo) => jogo.status !== 'FINALIZADA').length,
        scout: this.finalizarScout(scoutTotal),
      },
      melhorTime: times[0] || null,
      melhorJogador: jogadores[0] || null,
      times,
      jogos,
      jogadores,
    };
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

    const stmt = db.prepare(`
      UPDATE Acao
      SET Jogador_id = ?, idTipoAcao = ?, Qualidade = ?
      WHERE id = ? AND Ponto_Partida_id = ?
    `);

    const result = stmt.run(jogadorId, tipoAcaoId, qualidade, acaoId, Number(partidaId));
    if (result.changes === 0) {
      throw new Error('Nenhuma acao foi atualizada.');
    }

    return this.buscarEstatisticasPartida(partidaId);
  }

  excluirAcao(partidaId, acaoId) {
    const partida = Number(partidaId);
    const acao = Number(acaoId);

    if (!partida || !acao) {
      throw new Error('Acao invalida para exclusao.');
    }

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

    return this.buscarEstatisticasPartida(partidaId);
  }

  excluirSet(partidaId, numSet) {
    const partida = Number(partidaId);
    const setNumber = Number(numSet);

    if (!partida || !setNumber) {
      throw new Error('Set invalido para exclusao.');
    }

    db.prepare('DELETE FROM Substituicao WHERE Ponto_Partida_id = ? AND Ponto_NumSet = ?')
      .run(partida, setNumber);
    db.prepare('DELETE FROM Acao WHERE Ponto_Partida_id = ? AND Ponto_NumSet = ?')
      .run(partida, setNumber);
    db.prepare('DELETE FROM Ponto WHERE Set_Partida_id = ? AND NumSet = ?')
      .run(partida, setNumber);
    db.prepare('DELETE FROM "Set" WHERE Partida_id = ? AND NumSet = ?')
      .run(partida, setNumber);

    return this.buscarEstatisticasPartida(partidaId);
  }

  salvarPontuacaoSets(partidaId, sets = []) {
    if (!partidaId) {
      return this.montarEstatisticaVazia();
    }

    this.garantirColunasPlacarSet();

    const insertSet = db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)');
    const updateSet = db.prepare(`
      UPDATE "Set"
      SET pontosTime1 = ?, pontosTime2 = ?
      WHERE NumSet = ? AND Partida_id = ?
    `);

    for (const setScore of sets) {
      const numSet = Number(setScore.numSet);
      if (!numSet) continue;

      insertSet.run(numSet, Number(partidaId));
      updateSet.run(
        this.normalizarPlacar(setScore.home),
        this.normalizarPlacar(setScore.away),
        numSet,
        Number(partidaId),
      );
    }

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
export const buscarRelatorioGeralPartidas = (tournamentId = null) =>
  estatisticaModel.montarRelatorioGeralPartidas(tournamentId);

export default EstatisticaModel;
