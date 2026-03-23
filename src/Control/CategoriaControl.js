import Categoria from "../Model/Categoria";

const CategoriaControl = {
    async cadastrarDados(dados){
        try{
            const categoria = new Categoria(dados.nome, dados.idadeMin, dados.idadeMax);
            const id = await categoria.criarCategoria();
            return id;
        } catch (e) {
            throw e;

        } 
    },

    async listarCategorias(){
        try {
            return await new Categoria().buscarTodas()
        } catch (e) {
            throw e;
        }
    },

    async editarCategoria(id, dados){
        try {
            const categoria = new Categoria(dados.nome, dados.idadeMin, dados.idadeMax);
            await categoria.editarCategoria(id);
        } catch (e) {
            throw e;
        }
    },

    async excluirCategoria(id){
        try {
            await new Categoria().excluirCategoria(id);
        } catch (e) {
            throw e;
        }
    }
}

export default CategoriaControl;