import db from "../db/db";

class PlayerControl {

    async createPlayer(data){
        Player = new Player(null, data.cpf, data.nome, data.dataNasc, data.numCamisa, data.rg, data.altura, data.posicaoId, data.foto);
        const insertTransaction = db.transaction((playerObj) => {
            Player.insertPlayer(Player, db);
        }
        );
        insertTransaction(Player);
        try {
            const result = insertTransaction(newPlayer);
            return result; 
        } catch (error) {
            console.error("Failed to create player. Transaction rolled back.", error);
            throw error; 
        }
        
    }

    async deletePlayer(id){
        const Player = new Player();
        const deleteTransaction = db.transaction((playerId) => {
            Player.deletePlayer(playerId, db);
        }); 
        try {
            const result = deleteTransaction(id);
            return result;
        } catch (error) {
            console.error("Failed to delete player. Transaction rolled back.", error);
            throw error; 
        }
    }

    async updatePlayer(data){
        const Player = new Player(data.id, data.cpf, data.nome, data.dataNasc, data.numCamisa, data.rg, data.altura, data.posicaoId, data.foto);    
        const updateTransaction = db.transaction((playerObj) => {
            Player.updatePlayer(Player, db);
        });
        try {            
            const result = updateTransaction(Player);
            return result;
        } catch (error) {
            console.error("Failed to update player. Transaction rolled back.", error);
            throw error; 
        }
    }

    async findAllPlayers(){
        const Player = new Player();
        try {
            return Player.findAllPlayers(db);
        } catch (e) {
            throw e;
        }
    }

    async findPlayerFiltered(filter){
        const Player = new Player();
        try {
            return Player.findPlayerFiltered(filter, db);
        } catch (e) {
            throw e;
        }
    }

}