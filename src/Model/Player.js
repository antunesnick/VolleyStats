// Substituído require() por import para harmonizar com o export default no final
import { cpf } from 'cpf-cnpj-validator';

class Player {
  // Adicionado categoriaId
  constructor(id, cpfNumero, nome, dataNasc, numCamisa, rg, altura, posicaoId, foto, categoriaId = null) {
    this.id = id;
    this.cpf = cpfNumero;
    this.nome = nome;
    this.dataNasc = dataNasc;
    this.numCamisa = numCamisa;
    this.rg = rg;
    this.altura = altura;
    this.posicaoId = posicaoId;
    this.foto = foto;
    this.categoriaId = categoriaId; 
  }

    #validarCPF(cpfString) {
      if (!cpfString) return true;
      return cpf.isValid(cpfString);
    }

  insertPlayer(db) {
    if (!this.#validarCPF(this.cpf)) {
      throw new Error("CPF inválido. Por favor, insira um CPF válido.");
    }
    try {
      // Inserindo também a categoria_id
      const sql = db.prepare('INSERT INTO Jogadores (cpf, nome, dataNasc, numCamisa, rg, altura, posicao_id, foto, categoria_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
      const info = sql.run(this.cpf, this.nome, this.dataNasc, this.numCamisa, this.rg, this.altura, this.posicaoId, this.foto, this.categoriaId);
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
      // Atualizando também a categoria_id
      const sql = db.prepare('UPDATE Jogadores SET cpf = ?, nome = ?, dataNasc = ?, numCamisa = ?, rg = ?, altura = ?, posicao_id = ?, foto = ?, categoria_id = ? WHERE id = ?');
      sql.run(this.cpf, this.nome, this.dataNasc, this.numCamisa, this.rg, this.altura, this.posicaoId, this.foto, this.categoriaId, this.id);
    } catch (e) {
      throw e;
    }
  }

  findAllPlayers(db) {
    try {
      const sql = db.prepare('SELECT * FROM Jogadores ORDER BY nome ASC');
      return sql.all();
    } catch (e) {
      throw e;
    }
  }

  findPlayerFiltered(filtro, db) {
    try {
      let sqlQuery = `
        SELECT j.*, p.nome as posicao 
        FROM Jogadores j 
        LEFT JOIN Posicoes p ON j.posicao_id = p.id 
        WHERE 1=1
      `;
      const params = [];

      if (filtro.nome) {
        sqlQuery += ` AND j.nome LIKE ?`;
        params.push(`%${filtro.nome}%`);
      }

      if (filtro.posicaoId) {
        sqlQuery += ` AND j.posicao_id = ?`;
        params.push(filtro.posicaoId);
      }

      sqlQuery += ` ORDER BY j.nome ASC`;

      const sql = db.prepare(sqlQuery);
      return sql.all(...params);
    } catch (e) {
      throw e;
    }       
  }
}

export default Player;