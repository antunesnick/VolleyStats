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

}