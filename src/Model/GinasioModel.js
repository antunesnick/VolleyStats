import db from "../db/db.js";

class GinasioModel {
	constructor(id = null, nome = null, estado = null, cidade = null, endereco = null) {
		//colocar a validacao aqui para evitar de criar o objeto com dados invalidos
		if (!id || !String(id).trim()) {
			throw new Error("ID do ginasio e obrigatorio.");
		}
		if (!nome || !String(nome).trim()) {
			throw new Error("Nome do ginasio e obrigatorio.");
		}
		if (!estado || !String(estado).trim()) {
			throw new Error("Estado do ginasio e obrigatorio.");
		}
		if (!cidade || !String(cidade).trim()) {
			throw new Error("Cidade do ginasio e obrigatória.");
		}
		this.id = id;
		this.nome = nome;
		this.estado = estado;
		this.cidade = cidade;
		this.endereco = endereco;
	}


	validarNomeCidadeDuplicados(idAtual = null) {
		const nomeNormalizado = String(this.nome).trim();
		const cidadeNormalizada = String(this.cidade).trim();

		let sql;
		let existente;

		if (idAtual !== null && idAtual !== undefined) {
			sql = db.prepare(
				"SELECT id FROM Ginasios WHERE lower(nome) = lower(?) AND lower(cidade) = lower(?) AND id <> ? LIMIT 1"
			);
			existente = sql.get(nomeNormalizado, cidadeNormalizada, idAtual);
		} else {
			sql = db.prepare(
				"SELECT id FROM Ginasios WHERE lower(nome) = lower(?) AND lower(cidade) = lower(?) LIMIT 1"
			);
			existente = sql.get(nomeNormalizado, cidadeNormalizada);
		}

		if (existente) {
			return "Ja existe um ginasio com esse nome nesta cidade.";
		}

		return null;
	}

	async criarGinasio() {
		const erroValidacao = this.validarCamposObrigatorios();
		if (erroValidacao) {
			throw new Error(erroValidacao);
		}

		const erroDuplicado = this.validarNomeCidadeDuplicados();
		if (erroDuplicado) {
			throw new Error(erroDuplicado);
		}

		try {
			const sql = db.prepare(
				"INSERT INTO Ginasios (nome, estado, cidade, endereco) VALUES (?, ?, ?, ?)"
			);
			const info = sql.run(
				String(this.nome).trim(),
				String(this.estado).trim(),
				String(this.cidade).trim(),
				this.endereco ? String(this.endereco).trim() : null
			);
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
		const erroValidacao = this.validarCamposObrigatorios();
		if (erroValidacao) {
			throw new Error(erroValidacao);
		}

		const erroDuplicado = this.validarNomeCidadeDuplicados(id);
		if (erroDuplicado) {
			throw new Error(erroDuplicado);
		}

		try {
			const sql = db.prepare(
				"UPDATE Ginasios SET nome = ?, estado = ?, cidade = ?, endereco = ? WHERE id = ?"
			);
			sql.run(
				String(this.nome).trim(),
				String(this.estado).trim(),
				String(this.cidade).trim(),
				this.endereco ? String(this.endereco).trim() : null,
				id
			);
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
			let joinOperator = " OR ";

			if (typeof filter === "string") {
				const termo = filter.trim();

				if (termo) {
					conditions.push("nome LIKE ?");
					conditions.push("estado LIKE ?");
					conditions.push("cidade LIKE ?");
					conditions.push("endereco LIKE ?");
					params.push(`%${termo}%`, `%${termo}%`, `%${termo}%`, `%${termo}%`);
				}
			} else if (filter && typeof filter === "object") {
				joinOperator = " AND ";

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

				if (filter.endereco) {
					conditions.push("endereco LIKE ?");
					params.push(`%${filter.endereco}%`);
				}
			}

			if (conditions.length === 0) {
				const sqlAll = db.prepare("SELECT * FROM Ginasios");
				return sqlAll.all();
			}

			const query = `SELECT * FROM Ginasios WHERE ${conditions.join(joinOperator)}`;
			const sql = db.prepare(query);
			return sql.all(...params);
		} catch (e) {
			throw e;
		}
	}

	async insertGinasio(ginasio) {
		this.nome = ginasio.nome;
		this.estado = ginasio.estado;
		this.cidade = ginasio.cidade;
		this.endereco = ginasio.endereco;
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
		this.endereco = ginasio.endereco;
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
