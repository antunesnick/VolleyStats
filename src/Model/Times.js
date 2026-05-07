import db from "../db/db.js";

class Times {
	constructor(id = null, nome = null, imagem = null, cidade = null) {
		this.id = id;
		this.nome = nome;
		this.imagem = imagem;
		this.cidade = cidade;
	}

	normalizarLinha(row) {
		if (!row) {
			return row;
		}

		return {
			id: row.id,
			nome: row.nome ?? null,
			imagem: row.imagem ?? null,
			cidade: row.cidade ?? null,
		};
	}

	validarCamposObrigatorios() {
		if (!this.nome || !String(this.nome).trim()) {
			return "Nome do time e obrigatorio.";
		}

		if (!this.cidade || !String(this.cidade).trim()) {
			return "Cidade do time e obrigatoria.";
		}

		return null;
	}

	validarNomeDuplicado(idAtual = null) {
		const nomeNormalizado = String(this.nome).trim();

		let sql;
		let existente;

		if (idAtual != null) {
			sql = db.prepare(
				"SELECT id FROM Times WHERE lower(nome) = lower(?) AND id <> ? LIMIT 1"
			);
			existente = sql.get(nomeNormalizado, idAtual);
		} else {
			sql = db.prepare(
				"SELECT id FROM Times WHERE lower(nome) = lower(?) LIMIT 1"
			);
			existente = sql.get(nomeNormalizado);
		}

		if (existente) {
			return "Ja existe um time com esse nome.";
		}

		return null;
	}

	criarTime() {
		const erroValidacao = this.validarCamposObrigatorios();
		if (erroValidacao) {
			throw new Error(erroValidacao);
		}

		const erroDuplicado = this.validarNomeDuplicado();
		if (erroDuplicado) {
			throw new Error(erroDuplicado);
		}

		try {
			const sql = db.prepare(
				"INSERT INTO Times (nome, imagem, cidade) VALUES (?, ?, ?)"
			);
			const info = sql.run(
				String(this.nome).trim(),
				this.imagem ? String(this.imagem).trim() : null,
				String(this.cidade).trim()
			);
			return info.lastInsertRowid;
		} catch (e) {
			throw e;
		}
	}

	editarTime(id = this.id) {
		const erroValidacao = this.validarCamposObrigatorios();
		if (erroValidacao) {
			throw new Error(erroValidacao);
		}

		const erroDuplicado = this.validarNomeDuplicado(id);
		if (erroDuplicado) {
			throw new Error(erroDuplicado);
		}

		try {
			const sql = db.prepare(
				"UPDATE Times SET nome = ?, imagem = ?, cidade = ? WHERE id = ?"
			);
			return sql.run(
				String(this.nome).trim(),
				this.imagem ? String(this.imagem).trim() : null,
				String(this.cidade).trim(),
				id
			);
		} catch (e) {
			throw e;
		}
	}

	excluirTime(id = this.id) {
		try {
			const sql = db.prepare("DELETE FROM Times WHERE id = ?");
			return sql.run(id);
		} catch (e) {
			throw e;
		}
	}

	buscarPorId(id = this.id) {
		try {
			const sql = db.prepare("SELECT * FROM Times WHERE id = ?");
			return this.normalizarLinha(sql.get(id));
		} catch (e) {
			throw e;
		}
	}

	buscarTodos() {
		try {
			const sql = db.prepare("SELECT * FROM Times ORDER BY nome ASC");
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
					conditions.push("cidade LIKE ?");
					params.push(`%${termo}%`, `%${termo}%`);
				}
			} else if (filter && typeof filter === "object") {
				joinOperator = " AND ";

				if (filter.nome) {
					conditions.push("nome LIKE ?");
					params.push(`%${filter.nome}%`);
				}

				if (filter.cidade) {
					conditions.push("cidade LIKE ?");
					params.push(`%${filter.cidade}%`);
				}
			}

			if (conditions.length === 0) {
				return this.buscarTodos();
			}

			const query = `SELECT * FROM Times WHERE ${conditions.join(joinOperator)} ORDER BY nome ASC`;
			const sql = db.prepare(query);
			return sql.all(...params).map((row) => this.normalizarLinha(row));
		} catch (e) {
			throw e;
		}
	}

	insertTime(time) {
		this.nome = time.nome;
		this.imagem = time.imagem;
		this.cidade = time.cidade;
		return this.criarTime();
	}

	updateTime(time) {
		this.id = time.id;
		this.nome = time.nome;
		this.imagem = time.imagem;
		this.cidade = time.cidade;
		return this.editarTime(time.id);
	}

	deleteTime(id) {
		return this.excluirTime(id);
	}

	findTimeById(id) {
		return this.buscarPorId(id);
	}

	findAllTimes() {
		return this.buscarTodos();
	}

	findTimeFiltered(filter) {
		return this.buscarFiltrado(filter);
	}
}

export default Times;
