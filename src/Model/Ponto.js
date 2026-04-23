const Acao = require('./Acao');
const Substituicao = require('./Substituicao');

class Ponto {
    /**
     * @param {number} pontoTime1 - Pontuação do time 1
     * @param {number} pontoTime2 - Pontuação do time 2
     * @param {number} numSet     - Número do set
     * @param {object} partida    - Objeto Partida (deve conter .id)
     */
    constructor(pontoTime1, pontoTime2, numSet, partida) {
        this.pontoTime1 = pontoTime1;
        this.pontoTime2 = pontoTime2;
        this.set = numSet;
        this.partida = partida;
        this.eventoList = [];
    }

    criarPonto(db) {
        try {
            const sql = db.prepare(
                'INSERT INTO Pontos (ponto_time1, ponto_time2, set_num, partida_id) VALUES (?, ?, ?, ?)'
            );
            sql.run(this.pontoTime1, this.pontoTime2, this.set, this.partida.id);
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
}

module.exports = Ponto;