import Categoria from "../Model/Categoria";

class CategoriaControl {
    static #instance;

    static getInstance() {
        if (!CategoriaControl.#instance) {
            CategoriaControl.#instance = new CategoriaControl();
        }
        return CategoriaControl.#instance;
    }

    async cadastrarDados(dados) {
        try {
            const categoria = new Categoria(dados.nome, dados.idadeMin, dados.idadeMax);
            const erro = categoria.validarIdade(categoria.idadeMin, categoria.idadeMax);
            if (erro) {
                throw new Error(erro);
            }
            const id = await categoria.criarCategoria();
            return id;
        } catch (e) {
            throw e;
        }
    }

    async listarCategorias() {
        try {
            return await new Categoria().buscarTodas();
        } catch (e) {
            throw e;
        }
    }

    async relatorioGeralCategorias(filtros = {}) {
        try {
            return await new Categoria().buscarRelatorioGeral(filtros);
        } catch (e) {
            throw e;
        }
    }

    async editarCategoria(id, dados) {
        try {
            const categoria = new Categoria(dados.nome, dados.idadeMin, dados.idadeMax);
            const erro = categoria.validarIdade(categoria.idadeMin, categoria.idadeMax);
            if (erro) {
                throw new Error(erro);
            }
            await categoria.editarCategoria(id);
        } catch (e) {
            throw e;
        }
    }

    async excluirCategoria(id) {
        try {
            await new Categoria().excluirCategoria(id);
        } catch (e) {
            throw e;
        }
    }
}

export default CategoriaControl;
