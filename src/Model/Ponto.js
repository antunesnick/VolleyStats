import Acao from './Acao';
import Substituicao from './Substituicao';

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
}

export default Ponto;