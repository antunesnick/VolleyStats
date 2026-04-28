import db from '../db/db';
import Ponto from '../Model/Ponto';
import Acao from '../Model/Acao';
import SetPartida from '../Model/SetPartida';

class PontoControl {
    static getInstance() {
        if (!PontoControl.instance) {
            PontoControl.instance = new PontoControl();
        }
        return PontoControl.instance;
    }

    /**
     * @param {object}   partida    - Objeto Partida (deve conter .id)
     * @param {number}   numSet     - Número do set atual
     * @param {number}   pontoTime1 - Pontuação atual do time 1
     * @param {number}   pontoTime2 - Pontuação atual do time 2
     * @param {object}   jogador    - Objeto Jogador (deve conter .id)
     * @param {object}   tipoAcao   - Objeto TipoAcao (deve conter .idTipoAcao)
     * @param {string}   qualidade  - 'A', 'B' ou 'C'
     * @returns {Ponto}
     */
    gravarPonto(partida, numSet, pontoTime1, pontoTime2, jogador, tipoAcao, qualidade) {
        const gravarTransaction = db.transaction(() => {
            
            const set = new SetPartida(numSet, partida);

            const ponto = new Ponto(pontoTime1, pontoTime2, set);
            ponto.criarPonto(db); // já chama set.criarSet(db) internamente

            const acao = new Acao(ponto, jogador, tipoAcao, qualidade);
            ponto.addEvento(acao, db);

            return ponto;
        });

        try {
            return gravarTransaction();
        } catch (e) {
            throw e;
        }
    }

    removerPonto(ponto) {
        const removerTransaction = db.transaction(() => {
            const eventosCopia = [...ponto.eventoList];
            for (const evento of eventosCopia) {
                ponto.removeEvento(evento, db);
            }

            const sql = db.prepare(
                'DELETE FROM Ponto WHERE pontoTime1 = ? AND pontoTime2 = ? AND NumSet = ? AND Set_Partida_id = ?'
            );
            sql.run(ponto.pontoTime1, ponto.pontoTime2, ponto.set.numSet, ponto.set.partida.id);
        });

        try {
            removerTransaction();
        } catch (e) {
            throw e;
        }
    }

      buscarPontosPorSet(partida_id, numSet) {
    try {
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
      
      // Agrupando todas as ações dentro do respectivo ponto
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
      
      // Retorna uma array com os pontos e a lista de ações de cada um
      return Array.from(pontosMap.values());
    } catch (e) {
      throw e;
    }
  }
  // Adicione este método dentro da classe PontoControl:
avancarSet(partida_id, numSet, pontosSetTime1, pontosSetTime2) {
  const transaction = db.transaction(() => {
    // 1. Salva o placar final do set que acabou
    const updateSet = db.prepare(
      'UPDATE "Set" SET pontosTime1 = ?, pontosTime2 = ? WHERE NumSet = ? AND Partida_id = ?'
    );
    updateSet.run(pontosSetTime1, pontosSetTime2, numSet, partida_id);

    // 2. Incrementa os sets ganhos na Partida (pontosTime1/2 = sets vencidos)
    const colVencedor = pontosSetTime1 > pontosSetTime2 ? 'pontosTime1' : 'pontosTime2';
    const updatePartida = db.prepare(
      `UPDATE Partidas SET ${colVencedor} = COALESCE(${colVencedor}, 0) + 1 WHERE id = ?`
    );
    updatePartida.run(partida_id);

    return numSet + 1; // Retorna o próximo número de set
  });

  try {
    return transaction();
  } catch (e) {
    throw e;
  }
}

  // Garante que o Set existe e salva/atualiza o placar do set
  atualizarPlacarSet(partida_id, numSet, pontosTime1, pontosTime2) {
    try {
      db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)')
        .run(numSet, partida_id);
      db.prepare('UPDATE "Set" SET pontosTime1 = ?, pontosTime2 = ? WHERE NumSet = ? AND Partida_id = ?')
        .run(pontosTime1, pontosTime2, numSet, partida_id);
    } catch (e) {
      throw e;
    }
  }

  // Carrega o placar salvo de um set específico
  buscarPlacarSet(partida_id, numSet) {
    try {
      const row = db.prepare(
        'SELECT pontosTime1, pontosTime2 FROM "Set" WHERE Partida_id = ? AND NumSet = ?'
      ).get(partida_id, numSet);
      return { home: row?.pontosTime1 ?? 0, away: row?.pontosTime2 ?? 0 };
    } catch (e) {
      throw e;
    }
  }

  // Incrementa/decrementa os sets ganhos na Partida (+1, 0 ou 0, +1)
  atualizarSetsGanhos(partida_id, deltaTime1, deltaTime2) {
    try {
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
    } catch (e) {
      throw e;
    }
  }
}

export default PontoControl;