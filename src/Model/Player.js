const { cpf } = require('cpf-cnpj-validator');

class Player {
  constructor(id, cpf, nome, dataNasc, numCamisa, rg, altura, posicaoId, foto) {
    this.id = id;
    this.cpf = cpf;
    this.nome = nome;
    this.dataNasc = dataNasc;
    this.numCamisa = numCamisa;
    this.rg = rg;
    this.altura = altura;
    this.posicaoId = posicaoId;
    this.foto = foto;
  }

    #validarCPF(cpfString) {
    if (!cpfString) return false;
    return cpf.isValid(cpfString); 
  }

   

  insertPlayer(db) {
    if (!this.#validarCPF(this.cpf)) {
      throw new Error("CPF inválido. Por favor, insira um CPF válido.");
    }
    try {
      const sql = db.prepare('INSERT INTO Jogadores (cpf, nome, dataNasc, numCamisa, rg, altura, posicao_id, foto) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
      const info = sql.run(this.cpf, this.nome, this.dataNasc, this.numCamisa, this.rg, this.altura, this.posicaoId, this.foto);
      return info.lastInsertRowid;
    } catch (e) {
      throw e;
    }
  }

  deletePlayer(id, db) {
    try { 
      const sql = db.prepare('DELETE FROM Jogadores WHERE id = ?');
      sql.run(id);
    } catch (e) {
      throw e;
    }
  }

  updatePlayer(db) {
        if (!this.#validarCPF(this.cpf)) {
            throw new Error("CPF inválido. Por favor, insira um CPF válido.");
        }
    try {
      const sql = db.prepare('UPDATE Jogadores SET cpf = ?, nome = ?, dataNasc = ?, numCamisa = ?, rg = ?, altura = ?, posicao_id = ?, foto = ? WHERE id = ?');
      sql.run(this.cpf, this.nome, this.dataNasc, this.numCamisa, this.rg, this.altura, this.posicaoId, this.foto, this.id);
    } catch (e) {
      throw e;
    }
  }

    findAllPlayers(db) {
    try {
      const sql = db.prepare('SELECT * FROM Jogadores');
      return sql.all();
    } catch (e) {
      throw e;
    }
  }

    findPlayerFiltered(filtro, db) {
    try {
      // Começamos a query trazendo o jogador e o nome da posição dele
      // O "WHERE 1=1" é um truque para facilitar a adição de "AND" dinamicamente
      let query = `
        SELECT j.*, p.nome as posicao 
        FROM Jogadores j 
        INNER JOIN Posicoes p ON j.posicao_id = p.id 
        WHERE 1=1
      `;
      const params = [];

      // Se o usuário digitou algum nome, adiciona na query
      if (filtro.nome) {
        query += ` AND j.nome LIKE ?`;
        params.push(`%${filtro.nome}%`);
      }

      // Se o usuário selecionou alguma posição no select, adiciona na query
      if (filtro.posicaoId) {
        query += ` AND j.posicao_id = ?`;
        params.push(filtro.posicaoId);
      }

      // Prepara e executa passando o array de parâmetros
      const sql = db.prepare(query);
      return sql.all(...params);

    } catch (e) {
      throw e;
    }       
  }
    
}

export default Player;