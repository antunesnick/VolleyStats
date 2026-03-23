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
      // 👇 Alterado para ordenar pelo número da camisa
      const sql = db.prepare('SELECT * FROM Jogadores ORDER BY numCamisa ASC');
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

      // 👇 Alterado para ordenar pelo número da camisa
      sqlQuery += ` ORDER BY j.numCamisa ASC`;

      const sql = db.prepare(sqlQuery);
      return sql.all(...params);
    } catch (e) {
      throw e;
    }       
  }
}

export default Player;