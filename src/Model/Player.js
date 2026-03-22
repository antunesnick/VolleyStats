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

   

  insertPlayer(db) {
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

    findPlayerFiltered(filter, db) {
    try {
      const sql = db.prepare('SELECT * FROM Jogadores WHERE nome LIKE ?');
      return sql.all(`%${filter}%`);
    } catch (e) {
      throw e;
    }       
  }
}

export default Player;