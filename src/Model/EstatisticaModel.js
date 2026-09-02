import db from '../db/db';
import Ponto from './Ponto';
import { ESCALA, normalizarFundamento, normalizarQualidade } from './Qualidade';

const ACTION_NAMES = ['Saque', 'Ataque', 'Bloqueio', 'Recepcao', 'Defesa', 'Erro geral'];

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
    const fundamento = normalizarFundamento(name);
    if (fundamento) return fundamento;

    const actionName = String(name || '').trim();
    if (actionName.toLowerCase().startsWith('erro')) return 'Erro geral';
    return actionName || 'Sem tipo';
  }

  criarContagemPorQualidade() {
    return ESCALA.reduce((acc, simbolo) => {
      acc[simbolo] = 0;
      return acc;
    }, {});
  }

  /**
   * Estrutura de scout de um jogador, de um set ou da partida inteira.
   *
   * `qualidade` guarda a escala de 6 niveis crua; os campos derivados
   * (aces, erros, eficiencia...) sao recalculados por `finalizarScout`.
   */
  criarScoutVazio() {
    const porQualidade = () => this.criarContagemPorQualidade();

    return {
      pontosTotais: 0,
      errosTotais: 0,
      totalAcoes: 0,
      qualidade: porQualidade(),
      saque: {
        total: 0,
        qualidade: porQualidade(),
        aces: 0,
        // "ab" e "cx" vem das telas antigas: pressao alta e pressao baixa.
        // Mantidos porque os relatorios ja existentes leem esses nomes.
        ab: 0,
        cx: 0,
        erros: 0,
        positivos: 0,
        eficiencia: 0,
        positivoPct: 0,
      },
      recepcao: {
        total: 0,
        qualidade: porQualidade(),
        perfeita: 0,
        positiva: 0,
        c: 0,
        x: 0,
        erros: 0,
        positivaPct: 0,
        perfeitaPct: 0,
        eficiencia: 0,
      },
      ataque: {
        total: 0,
        qualidade: porQualidade(),
        pontos: 0,
        positivos: 0,
        negativos: 0,
        bloqueados: 0,
        erros: 0,
        eficiencia: 0,
        pontosPct: 0,
      },
      bloqueio: {
        total: 0,
        qualidade: porQualidade(),
        pontos: 0,
        positivos: 0,
        neutros: 0,
        erros: 0,
        eficiencia: 0,
      },
      defesa: {
        total: 0,
        qualidade: porQualidade(),
        perfeitas: 0,
        positivas: 0,
        negativas: 0,
        erros: 0,
        positivaPct: 0,
        eficiencia: 0,
      },
      errosGerais: 0,
      vitoriaPontos: 0,
    };
  }

  arredondarPercentual(value) {
    if (!Number.isFinite(value)) {
      return 0;
    }

    return Number(value.toFixed(1));
  }

  somarQualidades(contagem) {
    return ESCALA.reduce((soma, simbolo) => soma + (contagem[simbolo] || 0), 0);
  }

  percentual(parte, total) {
    return total > 0 ? this.arredondarPercentual((parte / total) * 100) : 0;
  }

  /**
   * Fecha os numeros derivados do scout.
   *
   * As formulas sao as usadas no mercado (DataVolley e sumulas de federacao):
   *   eficiencia de ataque = (pontos - erros - bloqueados) / tentativas
   *   eficiencia de saque  = (aces - erros) / tentativas
   *   recepcao positiva    = (# + +) / tentativas
   */
  finalizarScout(scout) {
    const s = scout || this.criarScoutVazio();

    s.saque.total = this.somarQualidades(s.saque.qualidade);
    s.saque.eficiencia = this.percentual(s.saque.aces - s.saque.erros, s.saque.total);
    s.saque.positivoPct = this.percentual(s.saque.positivos, s.saque.total);

    s.recepcao.total = this.somarQualidades(s.recepcao.qualidade);
    s.recepcao.positivaPct = this.percentual(s.recepcao.perfeita + s.recepcao.positiva, s.recepcao.total);
    s.recepcao.perfeitaPct = this.percentual(s.recepcao.perfeita, s.recepcao.total);
    s.recepcao.eficiencia = this.percentual(s.recepcao.perfeita - s.recepcao.erros, s.recepcao.total);

    s.ataque.total = this.somarQualidades(s.ataque.qualidade);
    s.ataque.eficiencia = this.percentual(
      s.ataque.pontos - s.ataque.erros - s.ataque.bloqueados,
      s.ataque.total
    );
    s.ataque.pontosPct = this.percentual(s.ataque.pontos, s.ataque.total);

    s.bloqueio.total = this.somarQualidades(s.bloqueio.qualidade);
    s.bloqueio.eficiencia = this.percentual(s.bloqueio.pontos - s.bloqueio.erros, s.bloqueio.total);

    s.defesa.total = this.somarQualidades(s.defesa.qualidade);
    s.defesa.positivaPct = this.percentual(s.defesa.positivas, s.defesa.total);
    s.defesa.eficiencia = this.percentual(s.defesa.positivas - s.defesa.erros, s.defesa.total);

    // So saque, ataque e bloqueio encerram o rally a favor da equipe.
    s.pontosTotais = s.saque.aces + s.ataque.pontos + s.bloqueio.pontos;
    s.errosTotais = s.saque.erros
      + s.recepcao.erros
      + s.ataque.erros
      + s.ataque.bloqueados
      + s.bloqueio.erros
      + s.defesa.erros
      + s.errosGerais;
    s.vitoriaPontos = s.pontosTotais - s.errosTotais;

    return s;
  }

  aplicarAcaoNoScout(scout, actionName, quality) {
    if (!scout) {
      return;
    }

    const fundamento = normalizarFundamento(actionName);
    const simbolo = normalizarQualidade(quality);

    if (!fundamento || !simbolo) {
      if (this.normalizarNomeAcao(actionName) === 'Erro geral') {
        scout.errosGerais += 1;
        scout.totalAcoes += 1;
      }
      return;
    }

    scout.totalAcoes += 1;
    scout.qualidade[simbolo] += 1;

    const chave = fundamento === 'Recepcao' ? 'recepcao' : fundamento.toLowerCase();
    const alvo = scout[chave];
    alvo.qualidade[simbolo] += 1;

    if (fundamento === 'Saque') {
      if (simbolo === '#') alvo.aces += 1;
      else if (simbolo === '=') alvo.erros += 1;
      // "/" e "+" tiraram o adversario do primeiro tempo; "!" e "-" devolveram
      // passe facil.
      else if (simbolo === '/' || simbolo === '+') alvo.ab += 1;
      else alvo.cx += 1;

      if (['#', '/', '+'].includes(simbolo)) alvo.positivos += 1;
      return;
    }

    if (fundamento === 'Recepcao') {
      if (simbolo === '#') alvo.perfeita += 1;
      else if (simbolo === '+') alvo.positiva += 1;
      else if (simbolo === '/') alvo.x += 1;
      else if (simbolo === '=') alvo.erros += 1;
      else alvo.c += 1;
      return;
    }

    if (fundamento === 'Ataque') {
      if (simbolo === '#') alvo.pontos += 1;
      else if (simbolo === '+') alvo.positivos += 1;
      else if (simbolo === '/') alvo.bloqueados += 1;
      else if (simbolo === '=') alvo.erros += 1;
      else alvo.negativos += 1;
      return;
    }

    if (fundamento === 'Bloqueio') {
      if (simbolo === '#') alvo.pontos += 1;
      else if (simbolo === '+') alvo.positivos += 1;
      // Invasao e erro tecnico entregam o ponto ao adversario do mesmo jeito.
      else if (simbolo === '/' || simbolo === '=') alvo.erros += 1;
      else alvo.neutros += 1;
      return;
    }

    if (simbolo === '#') {
      alvo.perfeitas += 1;
      alvo.positivas += 1;
    } else if (simbolo === '+') {
      alvo.positivas += 1;
    } else if (simbolo === '=') {
      alvo.erros += 1;
    } else {
      alvo.negativas += 1;
    }
  }

  criarEstatisticaJogador(row) {
    return {
      id: row.jogadorId,
      nome: row.jogadorNome || 'Jogador',
      numero: row.jogadorNumero || '--',
      totalAcoes: 0,
      qualidade: this.criarContagemPorQualidade(),
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
          // Cada set carrega o proprio scout e os proprios jogadores, para o
          // relatorio poder comparar set a set - e onde se enxerga a equipe
          // caindo de rendimento do primeiro para o terceiro set.
          scout: this.criarScoutVazio(),
          jogadoresMap: new Map(),
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

      if (!setStats.jogadoresMap.has(row.jogadorId)) {
        setStats.jogadoresMap.set(row.jogadorId, this.criarEstatisticaJogador(row));
      }

      const actionName = this.normalizarNomeAcao(row.tipoAcaoNome);
      const quality = normalizarQualidade(row.qualidade);

      const detalhe = {
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
      };

      for (const alvo of [jogadoresMap.get(row.jogadorId), setStats.jogadoresMap.get(row.jogadorId)]) {
        alvo.totalAcoes += 1;
        alvo.acoes[actionName] = (alvo.acoes[actionName] || 0) + 1;
        if (quality && Object.prototype.hasOwnProperty.call(alvo.qualidade, quality)) {
          alvo.qualidade[quality] += 1;
        }
        this.aplicarAcaoNoScout(alvo.scout, actionName, quality);
        alvo.acoesDetalhadas.push(detalhe);
      }

      this.aplicarAcaoNoScout(setStats.scout, actionName, quality);
      this.aplicarAcaoNoScout(scoutTotal, actionName, quality);
    }

    const ordenarJogadores = (lista) => lista
      .map((jogador) => ({ ...jogador, scout: this.finalizarScout(jogador.scout) }))
      .sort((a, b) => b.totalAcoes - a.totalAcoes || String(a.nome).localeCompare(String(b.nome)));

    const sets = Array.from(setsMap.values())
      .map((setStats) => {
        const placar = setStats.savedPlacar || setStats.placar;

        return {
          numSet: setStats.numSet,
          pontos: setStats.pontosMap.size,
          acoes: setStats.acoes,
          placar,
          vencedor: placar.home > placar.away ? 'home' : placar.away > placar.home ? 'away' : null,
          scout: this.finalizarScout(setStats.scout),
          jogadores: ordenarJogadores(Array.from(setStats.jogadoresMap.values())),
        };
      })
      .sort((a, b) => a.numSet - b.numSet);

    const jogadores = ordenarJogadores(Array.from(jogadoresMap.values()));

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

    const estatisticas = this.montarEstatisticasPorLinhas(sql.all(Number(partidaId)), partidaScore);

    return this.aplicarPontosPorAtleta(Number(partidaId), estatisticas);
  }

  /**
   * Acrescenta a cada jogador quantos pontos da partida sao dele.
   *
   * O dono do ponto e o autor da ultima acao do rally (Ponto.Jogador_id), e o
   * lado que venceu o rally separa "ponto conquistado" de "ponto cedido".
   * Sem essa separacao um erro de ataque contaria como ponto a favor do atleta.
   */
  aplicarPontosPorAtleta(partidaId, estatisticas) {
    const porAtleta = new Map(
      Ponto.buscarPontosPorAtleta(partidaId, db).map((linha) => [Number(linha.jogadorId), linha])
    );

    // Mesma informacao, indexada por set, para a aba "Por set" do relatorio.
    const porAtletaNoSet = new Map();
    for (const linha of Ponto.buscarPontosPorAtletaPorSet(partidaId, db)) {
      const numSet = Number(linha.numSet);
      if (!porAtletaNoSet.has(numSet)) {
        porAtletaNoSet.set(numSet, new Map());
      }
      porAtletaNoSet.get(numSet).set(Number(linha.jogadorId), linha);
    }

    const enxertar = (lista, indice) => (lista || []).map((jogador) => {
      const linha = indice?.get(Number(jogador.id));

      return {
        ...jogador,
        pontos: Number(linha?.pontos ?? 0),
        pontosCedidos: Number(linha?.pontosCedidos ?? 0),
      };
    });

    const somarPontos = (lista) => lista.reduce(
      (acc, jogador) => ({
        pontos: acc.pontos + jogador.pontos,
        pontosCedidos: acc.pontosCedidos + jogador.pontosCedidos,
      }),
      { pontos: 0, pontosCedidos: 0 }
    );

    const jogadores = enxertar(estatisticas.jogadores, porAtleta);
    const totais = somarPontos(jogadores);

    const sets = (estatisticas.sets || []).map((setStats) => {
      const jogadoresDoSet = enxertar(setStats.jogadores, porAtletaNoSet.get(Number(setStats.numSet)));
      const totaisDoSet = somarPontos(jogadoresDoSet);

      return {
        ...setStats,
        jogadores: jogadoresDoSet,
        pontosAtribuidos: totaisDoSet.pontos,
        pontosCedidos: totaisDoSet.pontosCedidos,
      };
    });

    return {
      ...estatisticas,
      jogadores,
      sets,
      totals: {
        ...estatisticas.totals,
        pontosAtribuidos: totais.pontos,
        pontosCedidos: totais.pontosCedidos,
      },
    };
  }

  montarRelatorioGeralPartidas(filtros = null) {
    this.garantirColunasPlacarSet();

    const filtrosNormalizados = typeof filtros === 'object' && filtros !== null
      ? filtros
      : { torneioId: filtros };

    const torneioId = filtrosNormalizados.torneioId ?? filtrosNormalizados.tournamentId;
    const dataPartida = String(filtrosNormalizados.dataPartida || '').trim();
    const timeId = filtrosNormalizados.timeId ?? filtrosNormalizados.time;
    const hasTournament = torneioId !== null && torneioId !== undefined && torneioId !== '';
    const hasDataPartida = dataPartida !== '';
    const hasTime = timeId !== null && timeId !== undefined && timeId !== '';
    const whereParts = [];
    const params = [];

    if (hasTournament) {
      whereParts.push('p.torneio_id = ?');
      params.push(Number(torneioId));
    }

    if (hasDataPartida) {
      whereParts.push('p.dataPartida = ?');
      params.push(dataPartida);
    }

    if (hasTime) {
      whereParts.push('(p.time1 = ? OR p.time2 = ?)');
      params.push(Number(timeId), Number(timeId));
    }

    const where = whereParts.length > 0 ? `WHERE ${whereParts.join(' AND ')}` : '';

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
        tr.nome AS torneioNome,
        t1.nome AS time1Nome,
        t2.nome AS time2Nome,
        g.nome AS ginasioNome
      FROM Partidas p
      LEFT JOIN Torneios tr ON tr.id = p.torneio_id
      LEFT JOIN Times t1 ON t1.id = p.time1
      LEFT JOIN Times t2 ON t2.id = p.time2
      LEFT JOIN Ginasios g ON g.id = p.ginasio_id
      ${where}
      ORDER BY p.dataPartida DESC, p.id DESC
    `).all(...params);

    const torneioFiltro = hasTournament
      ? db.prepare('SELECT id, nome FROM Torneios WHERE id = ?').get(Number(torneioId))
      : null;
    const timeFiltro = hasTime
      ? db.prepare('SELECT id, nome FROM Times WHERE id = ?').get(Number(timeId))
      : null;

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
      const totalSets = finalizada ? pontosTime1 + pontosTime2 : 0;
      const diferencaSets = finalizada ? Math.abs(pontosTime1 - pontosTime2) : 0;
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
        totalSets,
        diferencaSets,
        placar: finalizada ? `${pontosTime1} x ${pontosTime2}` : '--',
        vencedor: finalizada
          ? pontosTime1 > pontosTime2
            ? partida.time1Nome
            : pontosTime2 > pontosTime1
              ? partida.time2Nome
              : 'Empate'
          : 'Pendente',
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

    const rankingDerrotas = [...times].sort((a, b) => (
      b.derrotas - a.derrotas
      || a.taxaVitoria - b.taxaVitoria
      || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
    ));

    const jogosFinalizados = jogos.filter((jogo) => jogo.status === 'FINALIZADA');
    const totalSetsDisputados = jogosFinalizados.reduce((total, jogo) => total + jogo.totalSets, 0);
    const resumoPorTipoMap = new Map();
    const resumoPorGinasioMap = new Map();

    for (const jogo of jogos) {
      const tipo = jogo.tipo || 'Sem tipo';
      const ginasio = jogo.ginasioNome || 'Local nao definido';

      if (!resumoPorTipoMap.has(tipo)) {
        resumoPorTipoMap.set(tipo, {
          tipo,
          total: 0,
          finalizadas: 0,
          agendadas: 0,
          setsDisputados: 0,
        });
      }

      if (!resumoPorGinasioMap.has(ginasio)) {
        resumoPorGinasioMap.set(ginasio, {
          ginasio,
          total: 0,
          finalizadas: 0,
          agendadas: 0,
        });
      }

      const resumoTipo = resumoPorTipoMap.get(tipo);
      const resumoGinasio = resumoPorGinasioMap.get(ginasio);
      resumoTipo.total += 1;
      resumoGinasio.total += 1;

      if (jogo.status === 'FINALIZADA') {
        resumoTipo.finalizadas += 1;
        resumoTipo.setsDisputados += jogo.totalSets;
        resumoGinasio.finalizadas += 1;
      } else {
        resumoTipo.agendadas += 1;
        resumoGinasio.agendadas += 1;
      }
    }

    const resumoPorTipo = Array.from(resumoPorTipoMap.values())
      .map((tipo) => ({
        ...tipo,
        taxaConclusao: tipo.total > 0
          ? this.arredondarPercentual((tipo.finalizadas / tipo.total) * 100)
          : 0,
      }))
      .sort((a, b) => (
        b.total - a.total
        || b.finalizadas - a.finalizadas
        || String(a.tipo).localeCompare(String(b.tipo), 'pt-BR', { sensitivity: 'base' })
      ));

    const resumoPorGinasio = Array.from(resumoPorGinasioMap.values())
      .sort((a, b) => (
        b.total - a.total
        || b.finalizadas - a.finalizadas
        || String(a.ginasio).localeCompare(String(b.ginasio), 'pt-BR', { sensitivity: 'base' })
      ));

    const jogoMaiorDiferenca = [...jogosFinalizados]
      .sort((a, b) => (
        b.diferencaSets - a.diferencaSets
        || b.totalSets - a.totalSets
        || String(a.dataPartida).localeCompare(String(b.dataPartida))
      ))[0] || null;

    const jogoMaisDisputado = [...jogosFinalizados]
      .filter((jogo) => jogo.diferencaSets > 0)
      .sort((a, b) => (
        a.diferencaSets - b.diferencaSets
        || b.totalSets - a.totalSets
        || String(a.dataPartida).localeCompare(String(b.dataPartida))
      ))[0] || null;

    const jogoMaisLongo = [...jogosFinalizados]
      .sort((a, b) => (
        b.totalSets - a.totalSets
        || a.diferencaSets - b.diferencaSets
        || String(a.dataPartida).localeCompare(String(b.dataPartida))
      ))[0] || null;

    return {
      filtrosAplicados: {
        torneioId: hasTournament ? Number(torneioId) : null,
        torneioNome: torneioFiltro?.nome || null,
        dataPartida: hasDataPartida ? dataPartida : '',
        timeId: hasTime ? Number(timeId) : null,
        timeNome: timeFiltro?.nome || null,
      },
      resumo: {
        totalTimes: times.length,
        totalPartidas: jogos.length,
        finalizadas: jogosFinalizados.length,
        agendadas: jogos.filter((jogo) => jogo.status !== 'FINALIZADA').length,
        totalSetsDisputados,
        mediaSetsPorPartida: jogosFinalizados.length > 0
          ? this.arredondarPercentual(totalSetsDisputados / jogosFinalizados.length)
          : 0,
      },
      melhorTime: times[0] || null,
      piorTime: rankingDerrotas[0] || null,
      tipoMaisFrequente: resumoPorTipo[0] || null,
      ginasioMaisUsado: resumoPorGinasio[0] || null,
      jogoMaiorDiferenca,
      jogoMaisDisputado,
      jogoMaisLongo,
      times,
      rankingDerrotas,
      resumoPorTipo,
      resumoPorGinasio,
      jogos,
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
      qualidades: [...ESCALA],
    };
  }

  editarAcao(partidaId, dadosAcao) {
    const acaoId = Number(dadosAcao?.id);
    const jogadorId = Number(dadosAcao?.jogadorId);
    const tipoAcaoId = Number(dadosAcao?.tipoAcaoId);
    const qualidade = normalizarQualidade(dadosAcao?.qualidade);

    if (!acaoId || !jogadorId || !tipoAcaoId || !qualidade) {
      throw new Error('Dados invalidos para editar a acao.');
    }

    const acao = db.prepare(`
      SELECT id, Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id
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

    // Trocar o autor da ultima acao do rally troca o dono do ponto.
    Ponto.sincronizarDonoDoPonto(
      acao.Ponto_Partida_id,
      acao.Ponto_NumSet,
      acao.Ponto_pontoTime1,
      acao.Ponto_pontoTime2,
      db
    );

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
    } else {
      // Sobraram acoes: o ponto passa para o autor da nova ultima acao.
      Ponto.sincronizarDonoDoPonto(
        acaoRow.Ponto_Partida_id,
        acaoRow.Ponto_NumSet,
        acaoRow.Ponto_pontoTime1,
        acaoRow.Ponto_pontoTime2,
        db
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
export const buscarRelatorioGeralPartidas = (filtros = null) =>
  estatisticaModel.montarRelatorioGeralPartidas(filtros);

export default EstatisticaModel;
