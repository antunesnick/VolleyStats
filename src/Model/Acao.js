import Evento from './Evento';

class Acao extends Evento {
    /**
     * @param {Ponto}    ponto     - Objeto Ponto (contem .pontoTime1, .pontoTime2, .set.numSet, .set.partida.id)
     * @param {object}   jogador   - Objeto Jogador (deve conter .id)
     * @param {object}   tipoAcao  - Objeto TipoAcao (deve conter .idTipoAcao)
     * @param {string}   qualidade - 'A', 'B' ou 'C'
     */
    constructor(ponto, jogador, tipoAcao, qualidade, importacaoId = null) {
        super(ponto);
        this.jogador = jogador;
        this.tipoAcao = tipoAcao;
        this.qualidade = qualidade;
        this.importacaoId = importacaoId;
    }

    criarAcao(db) {
            try {
                const sql = db.prepare(
                    `INSERT INTO Acao 
                    (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id, Jogador_id, Qualidade, idTipoAcao, importacao_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
                );
                
                const info = sql.run(
                    this.ponto?.pontoTime1 ?? null,
                    this.ponto?.pontoTime2 ?? null,
                    this.ponto?.set?.numSet ?? null,
                    this.ponto?.set?.partida?.id ?? null,
                    this.jogador.id,
                    this.qualidade,
                    this.tipoAcao.idTipoAcao,
                    this.importacaoId // <-- Novo
                );
                this.id = info.lastInsertRowid;
                return this.id;
            } catch (e) {
                throw e;
            }
    }
}
export default Acao;