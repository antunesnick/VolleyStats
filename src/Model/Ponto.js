import Acao from './Acao';
import Substituicao from './Substituicao';
import SetPartida from './SetPartida';
import TimesPartida from './TimesPartida';

/** Lados possiveis de um rally. */
export const VENCEDOR = Object.freeze({
    MANDANTE: 'MANDANTE',
    VISITANTE: 'VISITANTE',
});

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
    this.set.criarSet(db);

    // Um rally so e cadastrado quando a equipe da casa registra alguma acao,
    // por isso o padrao e MANDANTE. Alt+Seta no scout corrige para VISITANTE.
    const sql = db.prepare(
      `INSERT OR IGNORE INTO Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id, vencedor)
       VALUES (?, ?, ?, ?, ?)`
    );
    sql.run(
      this.pontoTime1,
      this.pontoTime2,
      this.set.numSet,
      this.set.partida.id,
      VENCEDOR.MANDANTE
    );
  }
    /**
     * Id da ultima acao gravada neste rally.
     *
     * O scout usa para saber o que apagar quando o analista desfaz (Ctrl+Z).
     */
    ultimaAcaoGravada() {
        for (let i = this.eventoList.length - 1; i >= 0; i -= 1) {
            const evento = this.eventoList[i];
            if (evento instanceof Acao) return evento.id ?? null;
        }
        return null;
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

        // Regra do scout: o dono do ponto e o autor da ULTIMA acao do rally.
        // Como isso roda a cada acao gravada, a ultima sempre prevalece.
        Ponto.sincronizarDonoDoPonto(partida.id, numSet, pontoTime1, pontoTime2, db);

        return ponto;
    }

    /**
     * Regrava Ponto.Jogador_id a partir da ultima acao existente no rally.
     *
     * Chamado depois de gravar e depois de excluir uma acao, de modo que o dono
     * do ponto seja sempre derivado do estado atual do banco - nunca de um
     * valor que possa ficar desatualizado.
     */
    static sincronizarDonoDoPonto(partida_id, numSet, pontoTime1, pontoTime2, db) {
        db.prepare(`
            UPDATE Ponto
            SET Jogador_id = (
                SELECT A.Jogador_id
                FROM Acao A
                WHERE A.Ponto_pontoTime1 = Ponto.pontoTime1
                  AND A.Ponto_pontoTime2 = Ponto.pontoTime2
                  AND A.Ponto_NumSet = Ponto.NumSet
                  AND A.Ponto_Partida_id = Ponto.Set_Partida_id
                ORDER BY A.id DESC
                LIMIT 1
            )
            WHERE pontoTime1 = ? AND pontoTime2 = ? AND NumSet = ? AND Set_Partida_id = ?
        `).run(pontoTime1, pontoTime2, numSet, partida_id);

        return Ponto.buscarDonoDoPonto(partida_id, numSet, pontoTime1, pontoTime2, db);
    }

    static buscarDonoDoPonto(partida_id, numSet, pontoTime1, pontoTime2, db) {
        const row = db.prepare(`
            SELECT P.Jogador_id AS jogadorId, P.vencedor AS vencedor,
                   J.nome AS jogadorNome, J.numCamisa AS jogadorNumero
            FROM Ponto P
            LEFT JOIN Jogadores J ON J.id = P.Jogador_id
            WHERE P.pontoTime1 = ? AND P.pontoTime2 = ?
              AND P.NumSet = ? AND P.Set_Partida_id = ?
        `).get(pontoTime1, pontoTime2, numSet, partida_id);

        return row ?? null;
    }

    /**
     * Marca quem venceu o rally que estava sendo disputado no placar informado.
     *
     * O scout chama isso no momento em que o analista mexe no placar: o rally
     * que acabou e o que estava no placar ANTES do incremento.
     * `vencedor = null` limpa a marcacao (usado ao decrementar o placar).
     */
    static definirVencedorRally(partida_id, numSet, pontoTime1, pontoTime2, vencedor, db) {
        if (vencedor !== null && vencedor !== VENCEDOR.MANDANTE && vencedor !== VENCEDOR.VISITANTE) {
            throw new Error(`Vencedor do rally invalido: "${vencedor}".`);
        }

        const alvo = db.prepare(
            'SELECT 1 FROM Ponto WHERE pontoTime1 = ? AND pontoTime2 = ? AND NumSet = ? AND Set_Partida_id = ?'
        ).get(pontoTime1, pontoTime2, numSet, partida_id);

        // Sem acoes registradas nao existe rally no banco: nada a marcar.
        if (!alvo) {
            return false;
        }

        db.prepare(`
            UPDATE Ponto SET vencedor = ?
            WHERE pontoTime1 = ? AND pontoTime2 = ? AND NumSet = ? AND Set_Partida_id = ?
        `).run(vencedor, pontoTime1, pontoTime2, numSet, partida_id);

        return true;
    }

    /**
     * Pontos por atleta na partida, base dos relatorios.
     *
     * pontos        - rallies vencidos pelo mandante cuja ultima acao foi do atleta
     * pontosCedidos - rallies perdidos cuja ultima acao foi do atleta (erro dele)
     */
    static buscarPontosPorAtleta(partida_id, db) {
        return db.prepare(`
            SELECT
                J.id AS jogadorId,
                J.nome AS jogadorNome,
                J.numCamisa AS jogadorNumero,
                SUM(CASE WHEN P.vencedor = ? THEN 1 ELSE 0 END) AS pontos,
                SUM(CASE WHEN P.vencedor = ? THEN 1 ELSE 0 END) AS pontosCedidos
            FROM Ponto P
            JOIN Jogadores J ON J.id = P.Jogador_id
            WHERE P.Set_Partida_id = ?
            GROUP BY J.id, J.nome, J.numCamisa
            ORDER BY pontos DESC, J.numCamisa ASC
        `).all(VENCEDOR.MANDANTE, VENCEDOR.VISITANTE, partida_id);
    }

    /**
     * Mesma contagem de `buscarPontosPorAtleta`, quebrada por set.
     *
     * E o que permite ao relatorio mostrar que um atleta fez 8 pontos no set 1
     * e 2 no set 3 - a leitura de queda de rendimento que o analista procura.
     */
    static buscarPontosPorAtletaPorSet(partida_id, db) {
        return db.prepare(`
            SELECT
                P.NumSet AS numSet,
                J.id AS jogadorId,
                J.nome AS jogadorNome,
                J.numCamisa AS jogadorNumero,
                SUM(CASE WHEN P.vencedor = ? THEN 1 ELSE 0 END) AS pontos,
                SUM(CASE WHEN P.vencedor = ? THEN 1 ELSE 0 END) AS pontosCedidos
            FROM Ponto P
            JOIN Jogadores J ON J.id = P.Jogador_id
            WHERE P.Set_Partida_id = ?
            GROUP BY P.NumSet, J.id, J.nome, J.numCamisa
            ORDER BY P.NumSet ASC, pontos DESC, J.numCamisa ASC
        `).all(VENCEDOR.MANDANTE, VENCEDOR.VISITANTE, partida_id);
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
                P.vencedor AS vencedor,
                P.Jogador_id AS donoId,
                DONO.nome AS donoNome,
                DONO.numCamisa AS donoNumero,
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
            LEFT JOIN Jogadores DONO ON P.Jogador_id = DONO.id
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
                    vencedor: row.vencedor,
                    dono: row.donoId
                        ? { id: row.donoId, nome: row.donoNome, numero: row.donoNumero }
                        : null,
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

    /**
     * Sets ganhos por cada lado, contados a partir dos sets ja encerrados.
     *
     * E derivado, nunca incrementado: um contador que so cresce erraria se o
     * analista encerrasse o mesmo set duas vezes ou reabrisse um set.
     */
    static buscarSetsGanhos(partida_id, db) {
        const linhas = db.prepare(`
            SELECT pontosTime1 AS home, pontosTime2 AS away
            FROM "Set"
            WHERE Partida_id = ? AND encerrado = 1
        `).all(partida_id);

        return linhas.reduce((total, linha) => {
            const home = Number(linha.home) || 0;
            const away = Number(linha.away) || 0;

            if (home > away) total.home += 1;
            else if (away > home) total.away += 1;

            return total;
        }, { home: 0, away: 0 });
    }

    /**
     * Placar e situacao de cada set da partida, em ordem.
     *
     * Alimenta o painel de sets do scout e a navegacao entre eles.
     */
    static buscarSetsDaPartida(partida_id, db) {
        return db.prepare(`
            SELECT NumSet AS numSet,
                   COALESCE(pontosTime1, 0) AS home,
                   COALESCE(pontosTime2, 0) AS away,
                   COALESCE(encerrado, 0) AS encerrado
            FROM "Set"
            WHERE Partida_id = ?
            ORDER BY NumSet ASC
        `).all(partida_id).map((linha) => ({ ...linha, encerrado: Number(linha.encerrado) === 1 }));
    }

    /**
     * Fecha o set com o placar informado e devolve o proximo numero de set.
     *
     * Idempotente: encerrar o mesmo set de novo apenas regrava o placar, sem
     * somar um set ganho a mais.
     */
    static avancarSet(partida_id, numSet, pontosSetTime1, pontosSetTime2, db) {
        db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)')
            .run(numSet, partida_id);

        db.prepare(`
            UPDATE "Set" SET pontosTime1 = ?, pontosTime2 = ?, encerrado = 1
            WHERE NumSet = ? AND Partida_id = ?
        `).run(pontosSetTime1, pontosSetTime2, numSet, partida_id);

        const setsGanhos = Ponto.buscarSetsGanhos(partida_id, db);

        // Partidas.pontosTime1/2 guarda SETS ganhos, nao pontos.
        db.prepare('UPDATE Partidas SET pontosTime1 = ?, pontosTime2 = ? WHERE id = ?')
            .run(setsGanhos.home, setsGanhos.away, partida_id);

        return { proximoSet: numSet + 1, setsGanhos };
    }

    /** Desfaz o encerramento de um set marcado por engano. */
    static reabrirSet(partida_id, numSet, db) {
        db.prepare('UPDATE "Set" SET encerrado = 0 WHERE NumSet = ? AND Partida_id = ?')
            .run(numSet, partida_id);

        const setsGanhos = Ponto.buscarSetsGanhos(partida_id, db);

        db.prepare('UPDATE Partidas SET pontosTime1 = ?, pontosTime2 = ? WHERE id = ?')
            .run(setsGanhos.home, setsGanhos.away, partida_id);

        return setsGanhos;
    }

    static setEstaEncerrado(partida_id, numSet, db) {
        const linha = db.prepare(
            'SELECT encerrado FROM "Set" WHERE Partida_id = ? AND NumSet = ?'
        ).get(partida_id, numSet);

        return Number(linha?.encerrado) === 1;
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

    static removerAcao(acaoId, db) {
        // Guarda o rally antes de apagar: depois da exclusao nao ha mais como
        // saber a qual ponto a acao pertencia para recalcular o dono.
        const rally = db.prepare(`
            SELECT Ponto_pontoTime1 AS pontoTime1, Ponto_pontoTime2 AS pontoTime2,
                   Ponto_NumSet AS numSet, Ponto_Partida_id AS partidaId
            FROM Acao WHERE id = ?
        `).get(acaoId);

        Acao.deletarPorId(db, acaoId);

        if (rally?.partidaId != null && rally?.numSet != null) {
            Ponto.sincronizarDonoDoPonto(
                rally.partidaId,
                rally.numSet,
                rally.pontoTime1,
                rally.pontoTime2,
                db
            );
        }
    }
}

export default Ponto;
