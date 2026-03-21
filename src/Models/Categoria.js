import db from '../db/db.js';
class Categoria{
    constructor(nome, idadeMin, idadeMax){
        this.nome = nome
        this.idadeMin = idadeMin
        this.idadeMax = idadeMax
    }

    validarIdade(idadeMin, idadeMax){
        if(idadeMin < 12 || idadeMax < 13){
            return 'Idade mínima e máxima devem ser maiores ou iguais a 12 e 13, respectivamente.'
        }
        if(idadeMin > idadeMax){
            return 'Idade mínima não pode ser maior que a idade máxima.';
        }
    }

    async criarCategoria(){
        const erro = this.validarIdade(this.idadeMin, this.idadeMax);
        if(erro){
            throw new Error(erro);
        }
        try {
            const sql = db.prepare('INSERT INTO Categorias (nome, idadeMin, idadeMax) VALUES (?, ?, ?)');
            const info = sql.run(this.nome, this.idadeMin, this.idadeMax);
            return info.lastInsertRowid;
        } catch (e) {
            throw e;
        }
    }

    async buscarTodas(){
        try {
            const sql = db.prepare('SELECT * FROM Categorias');
            return sql.all();
        } catch (e) {
            throw e;
        }
    }
}

export default Categoria;

