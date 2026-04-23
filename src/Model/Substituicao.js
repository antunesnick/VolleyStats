const Evento = require('./Evento');

class Substituicao extends Evento {
    /**
     * @param {Ponto}   ponto        - Objeto Ponto ao qual esta substituição pertence
     * @param {object}  jogadorEntra - Objeto Jogador que entra (deve conter .id)
     * @param {object}  jogadorSai   - Objeto Jogador que sai (deve conter .id)
     */
    constructor(ponto, jogadorEntra, jogadorSai) {
        super(ponto);
        this.jogadorEntra = jogadorEntra;
        this.jogadorSai = jogadorSai;
    }

    criarSubstituicao(db) {
        try {
            const sql = db.prepare(
                'INSERT INTO Substituicao (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id, JogadorEntra, JogadorSai) VALUES (?, ?, ?, ?, ?)'
            );
            const info = sql.run(
                this.ponto.pontoTime1,
                this.ponto.pontoTime2,
                this.ponto.partida.id,
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

module.exports = Substituicao