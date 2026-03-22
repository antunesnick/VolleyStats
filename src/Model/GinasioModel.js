import db from "../db/db.js";

class GinasioModel {
	constructor(id = null, nome = null, estado = null, cidade = null) {
		this.id = id;
		this.nome = nome;
		this.estado = estado;
		this.cidade = cidade;
	}

	async criarGinasio() {
		try {
			const sql = db.prepare(
				"INSERT INTO Ginasios (nome, estado, cidade) VALUES (?, ?, ?)"
			);
			const info = sql.run(this.nome, this.estado, this.cidade);
			return info.lastInsertRowid;
		} catch (e) {
			throw e;
		}
	}

	async excluirGinasio(id) {
		try {
			const sql = db.prepare("DELETE FROM Ginasios WHERE id = ?");
			sql.run(id);
		} catch (e) {
			throw e;
		}
	}

	async editarGinasio(id = this.id) {
		try {
			const sql = db.prepare(
				"UPDATE Ginasios SET nome = ?, estado = ?, cidade = ? WHERE id = ?"
			);
			sql.run(this.nome, this.estado, this.cidade, id);
		} catch (e) {
			throw e;
		}
	}

	async buscarTodos() {
		try {
			const sql = db.prepare("SELECT * FROM Ginasios");
			return sql.all();
		} catch (e) {
			throw e;
		}
	}

	async buscarFiltrado(filter) {
		try {
			const conditions = [];
			const params = [];

			if (typeof filter === "string") {
				const termo = filter.trim();

				if (termo) {
					conditions.push("nome LIKE ?");
					conditions.push("estado LIKE ?");
					conditions.push("cidade LIKE ?");
					params.push(`%${termo}%`, `%${termo}%`, `%${termo}%`);
				}
			} else if (filter && typeof filter === "object") {
				if (filter.nome) {
					conditions.push("nome LIKE ?");
					params.push(`%${filter.nome}%`);
				}

				if (filter.estado) {
					conditions.push("estado LIKE ?");
					params.push(`%${filter.estado}%`);
				}

				if (filter.cidade) {
					conditions.push("cidade LIKE ?");
					params.push(`%${filter.cidade}%`);
				}
			}

			if (conditions.length === 0) {
				const sqlAll = db.prepare("SELECT * FROM Ginasios");
				return sqlAll.all();
			}

			const query = `SELECT * FROM Ginasios WHERE ${conditions.join(" OR ")}`;
			const sql = db.prepare(query);
			return sql.all(...params);
		} catch (e) {
			throw e;
		}
	}

	// Aliases para manter compatibilidade com chamadas antigas
	async insertGinasio(ginasio) {
		this.nome = ginasio.nome;
		this.estado = ginasio.estado;
		this.cidade = ginasio.cidade;
		return this.criarGinasio();
	}

	async deleteGinasio(id) {
		return this.excluirGinasio(id);
	}

	async updateGinasio(ginasio) {
		this.id = ginasio.id;
		this.nome = ginasio.nome;
		this.estado = ginasio.estado;
		this.cidade = ginasio.cidade;
		return this.editarGinasio(ginasio.id);
	}

	async findAllGinasios() {
		return this.buscarTodos();
	}

	async findGinasioFiltered(filter) {
		return this.buscarFiltrado(filter);
	}
}

export default GinasioModel;
