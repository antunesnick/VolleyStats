import db from "../db/db";
import Player from "../Model/Player";
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');
const url = require('url');

class PlayerControl {

    #salvarFotoLocalmente(base64Image, nomeJogador) {
        if (!base64Image || !base64Image.startsWith('data:image')) {
            return base64Image; 
        }
        const pastaUploads = path.join(process.cwd(), 'uploads');
        if (!fs.existsSync(pastaUploads)) {
            fs.mkdirSync(pastaUploads);
        }
        const partes = base64Image.match(/^data:image\/([a-zA-Z0-9+-]+);base64,(.+)$/);
        if (!partes || partes.length !== 3) return null;

        const extensao = partes[1] === 'jpeg' ? 'jpg' : partes[1];
        const dadosPuros = partes[2];
        const buffer = Buffer.from(dadosPuros, 'base64');
        const nomeArquivo = `foto_${Date.now()}_${nomeJogador.replace(/\s+/g, '')}.${extensao}`;
        const caminhoCompleto = path.join(pastaUploads, nomeArquivo);
        fs.writeFileSync(caminhoCompleto, buffer);
        
        // 2. SUBSTITUA O RETURN FINAL POR ESTAS DUAS LINHAS:
        // O Node cria a string perfeita (file:///C:/Users...) e nós só trocamos o prefixo
        const urlSegura = url.pathToFileURL(caminhoCompleto).href;
        return urlSegura.replace('file://', 'local://');
    }
    async createPlayer(data) {
        const caminhoDaFoto = this.#salvarFotoLocalmente(data.foto, data.nome);

        const newPlayer = new Player(
            null, data.cpf, data.nome, data.dataNasc, 
            data.numCamisa, data.rg, data.altura, 
            Number(data.posicaoId), 
            caminhoDaFoto 
        );
        
        const insertTransaction = db.transaction((playerObj) => {
            return playerObj.insertPlayer(db);
        });
        
        try {
            return insertTransaction(newPlayer);
        } catch (error) {
            console.error("Failed to create player.", error);
            throw error; 
        }
    }

    async updatePlayer(data) {

        const caminhoDaFoto = this.#salvarFotoLocalmente(data.foto, data.nome);

        const playerToUpdate = new Player(
            data.id, data.cpf, data.nome, data.dataNasc, 
            data.numCamisa, data.rg, data.altura, 
            Number(data.posicaoId), 
            caminhoDaFoto
        );    
        
        const updateTransaction = db.transaction((playerObj) => {
            playerObj.updatePlayer(db);
        });
        
        try {            
            return updateTransaction(playerToUpdate);
        } catch (error) {
            console.error("Failed to update player.", error);
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