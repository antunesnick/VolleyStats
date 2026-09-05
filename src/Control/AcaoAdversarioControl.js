import db from '../db/db';
import AcaoAdversario from '../Model/AcaoAdversario';

/**
 * Orquestracao do scout do adversario. Como todo Control do projeto, e ele que
 * abre a transacao - a Model nunca abre.
 */
class AcaoAdversarioControl {
    static #instance;

    static getInstance() {
        if (!AcaoAdversarioControl.#instance) {
            AcaoAdversarioControl.#instance = new AcaoAdversarioControl();
        }
        return AcaoAdversarioControl.#instance;
    }

    gravar(dados) {
        const transaction = db.transaction((entrada) => AcaoAdversario.gravar(entrada, db));

        try {
            return transaction(dados);
        } catch (error) {
            console.error('Falha ao gravar acao do adversario. Rollback.', error);
            throw error;
        }
    }

    remover(id) {
        const transaction = db.transaction((acaoId) => AcaoAdversario.deletarPorId(acaoId, db));

        try {
            return transaction(id);
        } catch (error) {
            console.error('Falha ao remover acao do adversario. Rollback.', error);
            throw error;
        }
    }

    buscarPorSet(partidaId, numSet) {
        return AcaoAdversario.buscarPorSet(partidaId, numSet, db);
    }

    /** `numSet = null` soma a partida inteira. */
    resumo(partidaId, numSet = null) {
        return AcaoAdversario.resumoDaPartida(partidaId, db, numSet);
    }
}

export default AcaoAdversarioControl;
