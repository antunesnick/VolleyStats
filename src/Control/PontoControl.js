import db from '../db/db';
import Ponto from '../Model/Ponto';
import Acao from '../Model/Acao';

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
            const ponto = new Ponto(pontoTime1, pontoTime2, numSet, partida);
            ponto.criarPonto(db);

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
                'DELETE FROM Pontos WHERE ponto_time1 = ? AND ponto_time2 = ? AND set_num = ? AND partida_id = ?'
            );
            sql.run(ponto.pontoTime1, ponto.pontoTime2, ponto.set, ponto.partida.id);
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
                'SELECT * FROM Pontos WHERE partida_id = ? AND set_num = ? ORDER BY ponto_time1 ASC, ponto_time2 ASC'
            );
            return sql.all(partida_id, numSet);
        } catch (e) {
            throw e;
        }
    }
}

export default PontoControl;