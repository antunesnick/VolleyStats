import GinasioModel from "../Model/GinasioModel";
//chamar o singleton aqui para garantir que o banco de dados seja inicializado antes de qualquer operação
const GinasioControl = {
	async cadastrarDados(dados) {
		try {
			const ginasio = new GinasioModel(
				null,
				dados.nome,
				dados.estado,
				dados.cidade,
				dados.endereco
			);
			return await ginasio.criarGinasio();
		} catch (e) {
			throw e;
		}
	},

	async listarGinasios() {
		try {
			return await new GinasioModel().buscarTodos();
		} catch (e) {
			throw e;
		}
	},

	async editarGinasio(id, dados) {
		try {
			const ginasio = new GinasioModel(
				id,
				dados.nome,
				dados.estado,
				dados.cidade,
				dados.endereco
			);
			await ginasio.editarGinasio(id);
		} catch (e) {
			throw e;
		}
	},

	async excluirGinasio(id) {
		try {
			await new GinasioModel().excluirGinasio(id);
		} catch (e) {
			throw e;
		}
	},

	async pesquisarGinasio(filtro) {
		try {
			return await new GinasioModel().buscarFiltrado(filtro);
		} catch (e) {
			throw e;
		}
	},
};

export default GinasioControl;
    