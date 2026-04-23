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
            const sql = db.prepare(
                'SELECT * FROM Ponto WHERE Set_Partida_id = ? AND NumSet = ? ORDER BY pontoTime1 ASC, pontoTime2 ASC'
            );
            return sql.all(partida_id, numSet);
        } catch (e) {
            throw e;
        }
    }
}

export default PontoControl;