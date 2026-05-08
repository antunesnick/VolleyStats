import db from "../db/db";
import Times from "../Model/Times";

const fs = require("fs");
const path = require("path");
const { Buffer } = require("buffer");
const url = require("url");

class TimesControl {
    static #instance;

    static getInstance() {
        if (!TimesControl.#instance) {
            TimesControl.#instance = new TimesControl();
        }
        return TimesControl.#instance;
    }

    #salvarImagemLocalmente(base64Image, nomeTime) {
        if (!base64Image || !base64Image.startsWith("data:image")) {
            return base64Image;
        }

        const pastaUploads = path.join(process.cwd(), "uploads");
        if (!fs.existsSync(pastaUploads)) {
            fs.mkdirSync(pastaUploads);
        }

        const partes = base64Image.match(/^data:image\/([a-zA-Z0-9+-]+);base64,(.+)$/);
        if (!partes || partes.length !== 3) return null;

        const extensao = partes[1] === "jpeg" ? "jpg" : partes[1];
        const dadosPuros = partes[2];
        const buffer = Buffer.from(dadosPuros, "base64");
        const nomeSeguro = String(nomeTime || "time").replace(/\s+/g, "");
        const nomeArquivo = `time_${Date.now()}_${nomeSeguro}.${extensao}`;
        const caminhoCompleto = path.join(pastaUploads, nomeArquivo);
        fs.writeFileSync(caminhoCompleto, buffer);

        const urlSegura = url.pathToFileURL(caminhoCompleto).href;
        return urlSegura.replace("file://", "local://");
    }

    async createTime(data) {
        const caminhoImagem = this.#salvarImagemLocalmente(data.imagem, data.nome);

        const newTime = new Times(
            null,
            data.nome,
            caminhoImagem,
            data.cidade
        );

        const insertTransaction = db.transaction((timeObj) => {
            return timeObj.criarTime();
        });

        try {
            return insertTransaction(newTime);
        } catch (error) {
            console.error("Failed to create team.", error);
            throw error;
        }
    }

    async updateTime(data) {
        const caminhoImagem = this.#salvarImagemLocalmente(data.imagem, data.nome);

        const timeToUpdate = new Times(
            data.id,
            data.nome,
            caminhoImagem,
            data.cidade
        );

        const updateTransaction = db.transaction((timeObj) => {
            return timeObj.editarTime(timeObj.id);
        });

        try {
            return updateTransaction(timeToUpdate);
        } catch (error) {
            console.error("Failed to update team.", error);
            throw error;
        }
    }

    async deleteTime(id) {
        const timeInstance = new Times();

        const deleteTransaction = db.transaction((timeId) => {
            return timeInstance.excluirTime(timeId);
        });

        try {
            return deleteTransaction(id);
        } catch (error) {
            console.error("Failed to delete team. Transaction rolled back.", error);
            throw error;
        }
    }

    async findTimeById(id) {
        const timeInstance = new Times();

        try {
            return timeInstance.buscarPorId(id);
        } catch (e) {
            throw e;
        }
    }

    async findAllTimes() {
        const timeInstance = new Times();

        try {
            return timeInstance.buscarTodos();
        } catch (e) {
            throw e;
        }
    }

    async findTimeFiltered(filtro) {
        const timeInstance = new Times();

        try {
            return timeInstance.buscarFiltrado(filtro);
        } catch (e) {
            throw e;
        }
    }

    async cadastrarDados(dados) {
        return this.createTime(dados);
    }

    async listarTimes() {
        return this.findAllTimes();
    }

    async editarTime(id, dados) {
        return this.updateTime({ ...dados, id });
    }

    async excluirTime(id) {
        return this.deleteTime(id);
    }

    async pesquisarTime(filtro) {
        return this.findTimeFiltered(filtro);
    }
}

export default TimesControl;
