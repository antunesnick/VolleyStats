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

	buscarRelatorio(id = this.id) {
		const ginasioId = Number(id);

		if (!ginasioId || Number.isNaN(ginasioId)) {
			throw new Error("Ginasio invalido para emitir relatorio.");
		}

		const ginasio = db.prepare(`
			SELECT id, nome, cidade, estado, endereco
			FROM Ginasios
			WHERE id = ?
		`).get(ginasioId);

		if (!ginasio) {
			throw new Error("Ginasio nao encontrado.");
		}

		const partidas = db.prepare(`
			SELECT
				p.id,
				p.nome,
				p.dataPartida,
				p.status,
				p.pontosTime1,
				p.pontosTime2,
				p.time1,
				p.time2,
				t1.nome AS time1Nome,
				t2.nome AS time2Nome,
				tr.nome AS torneioNome
			FROM Partidas p
			LEFT JOIN Times t1 ON t1.id = p.time1
			LEFT JOIN Times t2 ON t2.id = p.time2
			LEFT JOIN Torneios tr ON tr.id = p.torneio_id
			WHERE p.ginasio_id = ?
			ORDER BY p.dataPartida DESC, p.id DESC
		`).all(ginasioId);

		const resumo = {
			totalPartidas: partidas.length,
			finalizadas: 0,
			agendadas: 0,
			vitorias: 0,
			derrotas: 0,
			empates: 0,
			totalTimes: 0,
		};

		const timesMap = new Map();
		const ensureTime = (nome) => {
			const key = nome || "Time nao definido";
			if (!timesMap.has(key)) {
				timesMap.set(key, {
					nome: key,
					jogos: 0,
					finalizadas: 0,
					vitorias: 0,
					derrotas: 0,
					empates: 0,
					setsGanhos: 0,
					setsPerdidos: 0,
					saldoSets: 0,
					taxaVitoria: 0,
				});
			}
			return timesMap.get(key);
		};

		const jogos = partidas.map((partida) => {
			const status = String(partida.status || "AGENDADA").toUpperCase();
			const finalizada = status === "FINALIZADA";
			const pontosTime1 = Number(partida.pontosTime1) || 0;
			const pontosTime2 = Number(partida.pontosTime2) || 0;

			const time1 = ensureTime(partida.time1Nome);
			const time2 = ensureTime(partida.time2Nome);

			time1.jogos += 1;
			time2.jogos += 1;

			if (finalizada) {
				resumo.finalizadas += 1;
				time1.finalizadas += 1;
				time2.finalizadas += 1;

				time1.setsGanhos += pontosTime1;
				time1.setsPerdidos += pontosTime2;
				time2.setsGanhos += pontosTime2;
				time2.setsPerdidos += pontosTime1;

				if (pontosTime1 > pontosTime2) {
					time1.vitorias += 1;
					time2.derrotas += 1;
					resumo.vitorias += 1;
					resumo.derrotas += 1;
				} else if (pontosTime2 > pontosTime1) {
					time2.vitorias += 1;
					time1.derrotas += 1;
					resumo.vitorias += 1;
					resumo.derrotas += 1;
				} else {
					time1.empates += 1;
					time2.empates += 1;
					resumo.empates += 1;
				}
			} else {
				resumo.agendadas += 1;
			}

			return {
				id: partida.id,
				nome: partida.nome,
				dataPartida: partida.dataPartida,
				status,
				torneioNome: partida.torneioNome || "Sem torneio",
				time1Nome: partida.time1Nome || "Time 1",
				time2Nome: partida.time2Nome || "Time 2",
				pontosTime1,
				pontosTime2,
				placar: finalizada ? `${pontosTime1} x ${pontosTime2}` : "--",
				vencedor: finalizada
					? pontosTime1 > pontosTime2
						? partida.time1Nome
						: pontosTime2 > pontosTime1
							? partida.time2Nome
							: "Empate"
					: "Pendente",
			};
		});

		const times = Array.from(timesMap.values()).map((time) => ({
			...time,
			saldoSets: time.setsGanhos - time.setsPerdidos,
			taxaVitoria: time.finalizadas > 0
				? Number(((time.vitorias / time.finalizadas) * 100).toFixed(1))
				: 0,
		})).sort((a, b) => (
			b.vitorias - a.vitorias
			|| b.taxaVitoria - a.taxaVitoria
			|| b.saldoSets - a.saldoSets
			|| String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" })
		));

		resumo.totalTimes = timesMap.size;

		return {
			ginasio,
			resumo,
			melhorTime: times[0] || null,
			times,
			jogos,
		};
	}
}

export default GinasioModel;
