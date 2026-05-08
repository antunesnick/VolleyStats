import Acao from './Acao';
import Substituicao from './Substituicao';
import SetPartida from './SetPartida';
import TimesPartida from './TimesPartida';

class Ponto {
    /**
     * @param {number}     pontoTime1 - Pontuação do time 1
     * @param {number}     pontoTime2 - Pontuação do time 2
     * @param {SetPartida} set        - Objeto SetPartida (deve conter .numSet e .partida.id)
     */
    constructor(pontoTime1, pontoTime2, set) {
        this.pontoTime1 = pontoTime1;
        this.pontoTime2 = pontoTime2;
        this.set = set;
        this.eventoList = [];
    }

      criarPonto(db) {
    try {
      this.set.criarSet(db);

      const sql = db.prepare(
        'INSERT OR IGNORE INTO Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id) VALUES (?, ?, ?, ?)'
      );
      sql.run(this.pontoTime1, this.pontoTime2, this.set.numSet, this.set.partida.id);
    } catch (e) {
      throw e;
    }
  }
    addEvento(evento, db) {
        this.eventoList.push(evento);
        if (evento instanceof Acao) {
            evento.criarAcao(db);
        } else if (evento instanceof Substituicao) {
            evento.criarSubstituicao(db);
        }
    }

    removeEvento(evento, db) {
        const index = this.eventoList.indexOf(evento);
        if (index > -1) {
            this.eventoList.splice(index, 1);
            if (evento instanceof Acao) {
                const sql = db.prepare('DELETE FROM Acao WHERE id = ?');
                sql.run(evento.id);
            } else if (evento instanceof Substituicao) {
                const sql = db.prepare('DELETE FROM Substituicao WHERE id = ?');
                sql.run(evento.id);
            }
        }
    }

    static gravarPonto(partida, numSet, pontoTime1, pontoTime2, jogador, tipoAcao, qualidade, db) {
        const timesPartida1 = new TimesPartida(partida.time1, partida);
        timesPartida1.carregarDoDb(db);

        const timesPartida2 = new TimesPartida(partida.time2, partida);
        timesPartida2.carregarDoDb(db);

        const estaEmCampo =
            timesPartida1.jogadorNaLinha(jogador) ||
            timesPartida2.jogadorNaLinha(jogador);

        if (!estaEmCampo) {
            throw new Error(`Jogador "${jogador.nome ?? jogador.id}" não está na linha desta partida.`);
        }

        const set = new SetPartida(numSet, partida);
        const ponto = new Ponto(pontoTime1, pontoTime2, set);
        ponto.criarPonto(db);

        const acao = new Acao(ponto, jogador, tipoAcao, qualidade);
        ponto.addEvento(acao, db);

        return ponto;
    }

    static removerPonto(ponto, db) {
        const eventosCopia = [...ponto.eventoList];
        for (const evento of eventosCopia) {
            ponto.removeEvento(evento, db);
        }

        const sql = db.prepare(
            'DELETE FROM Ponto WHERE pontoTime1 = ? AND pontoTime2 = ? AND NumSet = ? AND Set_Partida_id = ?'
        );
        sql.run(ponto.pontoTime1, ponto.pontoTime2, ponto.set.numSet, ponto.set.partida.id);
    }

    static buscarPontosPorSet(partida_id, numSet, db) {
        const sql = db.prepare(`
            SELECT
                P.pontoTime1, P.pontoTime2,
                A.id AS acaoId,
                A.Qualidade AS qualidade,
                J.nome AS jogadorNome,
                J.NumCamisa AS jogadorNumero,
                T.Nome AS tipoAcaoNome
            FROM Ponto P
            LEFT JOIN Acao A ON P.pontoTime1 = A.Ponto_pontoTime1
                            AND P.pontoTime2 = A.Ponto_pontoTime2
                            AND P.NumSet = A.Ponto_NumSet
                            AND P.Set_Partida_id = A.Ponto_Partida_id
            LEFT JOIN Jogadores J ON A.Jogador_id = J.id
            LEFT JOIN TipoAcao T ON A.idTipoAcao = T.idTipoAcao
            WHERE P.Set_Partida_id = ? AND P.NumSet = ?
            ORDER BY P.pontoTime1 ASC, P.pontoTime2 ASC, A.id ASC
        `);
        const rows = sql.all(partida_id, numSet);
        const pontosMap = new Map();

        for (const row of rows) {
            const key = `${row.pontoTime1}-${row.pontoTime2}`;
            if (!pontosMap.has(key)) {
                pontosMap.set(key, {
                    pontoTime1: row.pontoTime1,
                    pontoTime2: row.pontoTime2,
                    acoes: []
                });
            }

            if (row.acaoId) {
                pontosMap.get(key).acoes.push({
                    id: row.acaoId,
                    jogadorNome: row.jogadorNome,
                    jogadorNumero: row.jogadorNumero,
                    tipoAcaoNome: row.tipoAcaoNome,
                    qualidade: row.qualidade
                });
            }
        }

        return Array.from(pontosMap.values());
    }

    static avancarSet(partida_id, numSet, pontosSetTime1, pontosSetTime2, db) {
        const updateSet = db.prepare(
            'UPDATE "Set" SET pontosTime1 = ?, pontosTime2 = ? WHERE NumSet = ? AND Partida_id = ?'
        );
        updateSet.run(pontosSetTime1, pontosSetTime2, numSet, partida_id);

        const colVencedor = pontosSetTime1 > pontosSetTime2 ? 'pontosTime1' : 'pontosTime2';
        const updatePartida = db.prepare(
            `UPDATE Partidas SET ${colVencedor} = COALESCE(${colVencedor}, 0) + 1 WHERE id = ?`
        );
        updatePartida.run(partida_id);

        return numSet + 1;
    }

    static atualizarPlacarSet(partida_id, numSet, pontosTime1, pontosTime2, db) {
        db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)')
            .run(numSet, partida_id);
        db.prepare('UPDATE "Set" SET pontosTime1 = ?, pontosTime2 = ? WHERE NumSet = ? AND Partida_id = ?')
            .run(pontosTime1, pontosTime2, numSet, partida_id);
    }

    static buscarPlacarSet(partida_id, numSet, db) {
        const row = db.prepare(
            'SELECT pontosTime1, pontosTime2 FROM "Set" WHERE Partida_id = ? AND NumSet = ?'
        ).get(partida_id, numSet);
        return { home: row?.pontosTime1 ?? 0, away: row?.pontosTime2 ?? 0 };
    }

    static atualizarSetsGanhos(partida_id, deltaTime1, deltaTime2, db) {
        db.prepare(`
            UPDATE Partidas
            SET pontosTime1 = MAX(0, COALESCE(pontosTime1, 0) + ?),
                pontosTime2 = MAX(0, COALESCE(pontosTime2, 0) + ?)
            WHERE id = ?
        `).run(deltaTime1, deltaTime2, partida_id);
        const row = db.prepare(
            'SELECT pontosTime1, pontosTime2 FROM Partidas WHERE id = ?'
        ).get(partida_id);
        return { home: row?.pontosTime1 ?? 0, away: row?.pontosTime2 ?? 0 };
    }

    static removerAcao(acaoId, db) {
        Acao.deletarPorId(db, acaoId);
    }
}

export default Ponto;
