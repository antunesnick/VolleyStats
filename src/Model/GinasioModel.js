import db from "../db/db.js";

class GinasioModel {
	constructor(id = null, nome = null, estado = null, cidade = null, endereco = null) {
		this.id = id;
		this.nome = nome;
		this.estado = estado;
		this.cidade = cidade;
		this.endereco = endereco;
	}

	normalizarLinha(row) {
		if (!row) {
			return row;
		}

		return {
			id: row.id,
			nome: row.nome ?? row.Nome ?? null,
			estado: row.estado ?? row.Estado ?? null,
			cidade: row.cidade ?? row.Cidade ?? null,
			endereco: row.endereco ?? row.Endereco ?? null,
		};
	}

	validarCamposObrigatorios() {
		if (!this.nome || !String(this.nome).trim()) {
			return "Nome do ginasio e obrigatorio.";
		}
		if (!this.estado || !String(this.estado).trim()) {
			return "Estado do ginasio e obrigatorio.";
		}
		if (!this.cidade || !String(this.cidade).trim()) {
			return "Cidade do ginasio e obrigatoria.";
		}

		return null;
	}


	validarNomeCidadeDuplicados(idAtual = null) {
		const nomeNormalizado = String(this.nome).trim();
		const cidadeNormalizada = String(this.cidade).trim();

		let sql;
		let existente;

		if (idAtual != null) {
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

	criarGinasio() {
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

	excluirGinasio(id) {
		try {
			const sql = db.prepare("DELETE FROM Ginasios WHERE id = ?");
			sql.run(id);
		} catch (e) {
			throw e;
		}
	}

	editarGinasio(id = this.id) {
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

	buscarTodos() {
		try {
			const sql = db.prepare("SELECT * FROM Ginasios");
			return sql.all().map((row) => this.normalizarLinha(row));
		} catch (e) {
			throw e;
		}
	}

	buscarFiltrado(filter) {
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
				return sqlAll.all().map((row) => this.normalizarLinha(row));
			}

			const query = `SELECT * FROM Ginasios WHERE ${conditions.join(joinOperator)}`;
			const sql = db.prepare(query);
			return sql.all(...params).map((row) => this.normalizarLinha(row));
		} catch (e) {
			throw e;
		}
	}

	insertGinasio(ginasio) {
		this.nome = ginasio.nome;
		this.estado = ginasio.estado;
		this.cidade = ginasio.cidade;
		this.endereco = ginasio.endereco;
		return this.criarGinasio();
	}

	deleteGinasio(id) {
		return this.excluirGinasio(id);
	}

	updateGinasio(ginasio) {
		this.id = ginasio.id;
		this.nome = ginasio.nome;
		this.estado = ginasio.estado;
		this.cidade = ginasio.cidade;
		this.endereco = ginasio.endereco;
		return this.editarGinasio(ginasio.id);
	}

	findAllGinasios() {
		return this.buscarTodos();
	}

	findGinasioFiltered(filter) {
		return this.buscarFiltrado(filter);
	}
}

export default GinasioModel;
