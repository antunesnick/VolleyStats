import db from "../db/db";
import Player from "../Model/Player";

class PlayerControl {

    async createPlayer(data) {
        const newPlayer = new Player(null, data.cpf, data.nome, data.dataNasc, data.numCamisa, data.rg, data.altura, data.posicaoId, data.foto);
        
        const insertTransaction = db.transaction((playerObj) => {
            return playerObj.insertPlayer(db);
        });
        
        try {
            const result = insertTransaction(newPlayer);
            return result; 
        } catch (error) {
            console.error("Failed to create player. Transaction rolled back.", error);
            throw error; 
        }
    }

    async deletePlayer(id) {
        const playerInstance = new Player(); 
        
        const deleteTransaction = db.transaction((playerId) => {
            playerInstance.deletePlayer(playerId, db);
        }); 
        
        try {
            const result = deleteTransaction(id);
            return result;
        } catch (error) {
            console.error("Failed to delete player. Transaction rolled back.", error);
            throw error; 
        }
    }

    async updatePlayer(data) {
        const playerToUpdate = new Player(data.id, data.cpf, data.nome, data.dataNasc, data.numCamisa, data.rg, data.altura, data.posicaoId, data.foto);    
        
        const updateTransaction = db.transaction((playerObj) => {
            playerObj.updatePlayer(db);
        });
        
        try {            
            const result = updateTransaction(playerToUpdate);
            return result;
        } catch (error) {
            console.error("Failed to update player. Transaction rolled back.", error);
            throw error; 
        }
    }

    async findAllPlayers() {
          const playerInstance = new Player(); 
        try {
            return playerInstance.findAllPlayers(db);
        } catch (e) {
            throw e;
        }
    }

    async findPlayerFiltered(filter) {
          const playerInstance = new Player(); 
        try {
            return playerInstance.findPlayerFiltered(filter, db);
        } catch (e) {
            throw e;
        }
    }
}

export default PlayerControl;