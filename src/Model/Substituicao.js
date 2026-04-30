import Evento from './Evento';

class Substituicao extends Evento {
    /**
     * @param {Ponto}  ponto        - Objeto Ponto (contem .pontoTime1, .pontoTime2, .set.numSet, .set.partida.id)
     * @param {object} jogadorEntra - Objeto Jogador que entra (deve conter .id)
     * @param {object} jogadorSai   - Objeto Jogador que sai (deve conter .id)
     */
    constructor(ponto, jogadorEntra, jogadorSai) {
        super(ponto);
        this.jogadorEntra = jogadorEntra;
        this.jogadorSai = jogadorSai;
    }

    criarSubstituicao(db) {
        try {
            // FK completa: (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id)
            const sql = db.prepare(
                `INSERT INTO Substituicao 
                (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id, JogadorEntra, JogadorSai) 
                VALUES (?, ?, ?, ?, ?, ?)`
            );
            const info = sql.run(
                this.ponto.pontoTime1,
                this.ponto.pontoTime2,
                this.ponto.set.numSet,
                this.ponto.set.partida.id,
                this.jogadorEntra.id,
                this.jogadorSai.id
            );
            this.id = info.lastInsertRowid;
            return this.id;
        } catch (e) {
            throw e;
        }
    }
}

export default Substituicao;