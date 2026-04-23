const Evento = require('./Evento');

class Acao extends Evento {
    /**
     * @param {Ponto}     ponto    - Objeto Ponto ao qual esta ação pertence
     * @param {object}    jogador  - Objeto Jogador (deve conter .id)
     * @param {TipoAcao}  tipoAcao - Objeto TipoAcao (deve conter .idTipoAcao)
     * @param {string}    qualidade - 'A', 'B' ou 'C'
     */
    constructor(ponto, jogador, tipoAcao, qualidade) {
        super(ponto);
        this.jogador = jogador;
        this.tipoAcao = tipoAcao;
        this.qualidade = qualidade;
    }

    criarAcao(db) {
        try {
            const sql = db.prepare(
                'INSERT INTO Acao (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id, Jogador_id, Qualidade, idTipoAcao) VALUES (?, ?, ?, ?, ?, ?)'
            );
            const info = sql.run(
                this.ponto.pontoTime1,
                this.ponto.pontoTime2,
                this.ponto.partida.id,
                this.jogador.id,
                this.qualidade,
                this.tipoAcao.idTipoAcao
            );
            this.id = info.lastInsertRowid;
            return this.id;
        } catch (e) {
            throw e;
        }
    }
}

module.exports = Acao;