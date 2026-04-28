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
}

export default PontoControl;