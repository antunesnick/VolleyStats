const db = require('../db/db');
const PartidaModel = require('../Model/PartidaModel');

class PartidaControl {

    async createPartida(data) {
        const partida = new PartidaModel(null, data.nome, data.pontosTime1, data.pontosTime2, data.dataPartida, data.tipo, data.status, data.externa, data.ginasio_id, data.time1, data.time2);
        
        const insertTransaction = db.transaction((partidaObj) => {
            return partida.insert(partidaObj, db); 
        });

        try {
            const result = insertTransaction(partida);
            return result; 
        } catch (error) {
            console.error("Falha ao criar partida. Transação revertida (Rollback).", error);
            throw error; 
        }
    }

    async updatePartida(data) {
        const partida = new PartidaModel(data.id, data.nome, data.pontosTime1, data.pontosTime2, data.dataPartida, data.tipo, data.status, data.externa, data.ginasio_id, data.time1, data.time2);    
        
        const updateTransaction = db.transaction((partidaObj) => {
            return partida.update(partidaObj, db);
        });

        try {            
            const result = updateTransaction(partida);
            return result;
        } catch (error) {
            console.error("Falha ao atualizar partida. Transação revertida (Rollback).", error);
            throw error; 
        }
    }

    async deletePartida(id) {
        const partida = new PartidaModel();
        
        const deleteTransaction = db.transaction((partidaId) => {
            return partida.delete(partidaId, db);
        }); 

        try {
            const result = deleteTransaction(id);
            return result;
        } catch (error) {
            console.error("Falha ao apagar partida. Transação revertida (Rollback).", error);
            throw error; 
        }
    }

    async findAllPartidas() {
        const partida = new PartidaModel();
        try {
            return partida.findAll(db);
        } catch (e) {
            console.error("Falha ao buscar partidas.", e);
            throw e;
        }
    }

    async findPartidaFiltered(filter) {
        const partida = new PartidaModel();
        try {
            return partida.findPartidaFiltered(filter, db);
        } catch (e) {
            throw e;
        }
    }

    async findPartidaByDateAndTeam(filters) {
        const partida = new PartidaModel();
        try {
            return partida.findPartidaByDateAndTeam(filters, db);
        } catch (e) {
            console.error("Falha ao buscar partidas filtradas.", e);
            throw e;
        }
    }
    
    async finalizarPartida(id, pontosTime1, pontosTime2) {
        const partida = new PartidaModel();
        
        const finalizeTransaction = db.transaction(() => {
            return partida.finalize(id, pontosTime1, pontosTime2, db);
        });

        try {
            const result = finalizeTransaction();
            return result;
        } catch (error) {
            console.error("Falha ao finalizar partida. Transação revertida.", error);
            throw error;
        }
    }
}

module.exports = new PartidaControl();