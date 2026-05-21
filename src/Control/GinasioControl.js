import db from "../db/db";
import GinasioModel from "../Model/GinasioModel";

class GinasioControl {
	static #instance;

	static getInstance() {
		if (!GinasioControl.#instance) {
			GinasioControl.#instance = new GinasioControl();
		}

		return GinasioControl.#instance;
	}

	async cadastrarDados(dados) {
		const ginasio = new GinasioModel(
			null,
			dados.nome,
			dados.estado,
			dados.cidade,
			dados.endereco
		);

		const insertTransaction = db.transaction((ginasioObj) => {
			return ginasioObj.criarGinasio();
		});

		try {
			const result = insertTransaction(ginasio);
			return result;
		} catch (error) {
			console.error("Falha ao cadastrar ginasio. Transacao revertida (Rollback).", error);
			throw error;
		}
	} 

	async listarGinasios() {
		try {
			return await new GinasioModel().buscarTodos();
		} catch (e) {
			throw e;
		}
	}

	async editarGinasio(id, dados) {
		const ginasio = new GinasioModel(
			id,
			dados.nome,
			dados.estado,
			dados.cidade,
			dados.endereco
		);

		const updateTransaction = db.transaction((ginasioObj) => {
			return ginasioObj.editarGinasio(id);
		});

		try {
			const result = updateTransaction(ginasio);
			return result;
		} catch (error) {
			console.error("Falha ao atualizar ginasio. Transacao revertida (Rollback).", error);
			throw error;
		}
	}

	async excluirGinasio(id) {
		const ginasio = new GinasioModel();

		const deleteTransaction = db.transaction((ginasioId) => {
			return ginasio.excluirGinasio(ginasioId);
		});

		try {
			const result = deleteTransaction(id);
			return result;
		} catch (error) {
			console.error("Falha ao excluir ginasio. Transacao revertida (Rollback).", error);
			throw error;
		}
	}

	async pesquisarGinasio(filtro) {
		try {
			return await new GinasioModel().buscarFiltrado(filtro);
		} catch (e) {
			throw e;
		}
	}

	async relatorioGinasio(ginasioId, filtros = {}) {
		return new GinasioModel().buscarRelatorio(ginasioId, filtros);
	}
}

export default GinasioControl.getInstance();
