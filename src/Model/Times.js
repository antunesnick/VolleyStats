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

	buscarRelatorio(id = this.id) {
		const timeId = Number(id);

		if (!timeId || Number.isNaN(timeId)) {
			throw new Error("Time invalido para emissao do relatorio.");
		}

		const time = this.buscarPorId(timeId);
		if (!time) {
			throw new Error("Time nao encontrado para emissao do relatorio.");
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
				g.nome AS ginasioNome,
				tr.nome AS torneioNome
			FROM Partidas p
			LEFT JOIN Times t1 ON t1.id = p.time1
			LEFT JOIN Times t2 ON t2.id = p.time2
			LEFT JOIN Ginasios g ON g.id = p.ginasio_id
			LEFT JOIN Torneios tr ON tr.id = p.torneio_id
			WHERE p.time1 = ? OR p.time2 = ?
			ORDER BY p.dataPartida DESC, p.id DESC
		`).all(timeId, timeId);

		const resumo = {
			totalPartidas: partidas.length,
			finalizadas: 0,
			agendadas: 0,
			vitorias: 0,
			derrotas: 0,
			empates: 0,
			setsGanhos: 0,
			setsPerdidos: 0,
		};

		const historico = partidas.map((partida) => {
			const isTime1 = Number(partida.time1) === timeId;
			const pontosPro = Number(isTime1 ? partida.pontosTime1 : partida.pontosTime2) || 0;
			const pontosContra = Number(isTime1 ? partida.pontosTime2 : partida.pontosTime1) || 0;
			const adversario = isTime1 ? partida.time2Nome : partida.time1Nome;
			const status = String(partida.status || "AGENDADA").toUpperCase();
			const finalizada = status === "FINALIZADA";
			let resultado = "Pendente";

			if (finalizada) {
				resumo.finalizadas += 1;
				resumo.setsGanhos += pontosPro;
				resumo.setsPerdidos += pontosContra;

				if (pontosPro > pontosContra) {
					resumo.vitorias += 1;
					resultado = "Vitoria";
				} else if (pontosContra > pontosPro) {
					resumo.derrotas += 1;
					resultado = "Derrota";
				} else {
					resumo.empates += 1;
					resultado = "Empate";
				}
			} else {
				resumo.agendadas += 1;
			}

			return {
				id: partida.id,
				nome: partida.nome,
				dataPartida: partida.dataPartida,
				status,
				adversario: adversario || "Adversario nao definido",
				ginasioNome: partida.ginasioNome || "Local nao definido",
				torneioNome: partida.torneioNome || "Sem torneio",
				pontosPro,
				pontosContra,
				resultado,
			};
		});

		const taxaVitoria = resumo.finalizadas > 0
			? Number(((resumo.vitorias / resumo.finalizadas) * 100).toFixed(1))
			: 0;

		const saldoSets = resumo.setsGanhos - resumo.setsPerdidos;

		return {
			time,
			resumo: {
				...resumo,
				taxaVitoria,
				saldoSets,
			},
			historico,
		};
	}

	buscarRelatorioGeral() {
		const times = this.buscarTodos();
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
				g.nome AS ginasioNome,
				tr.nome AS torneioNome
			FROM Partidas p
			LEFT JOIN Times t1 ON t1.id = p.time1
			LEFT JOIN Times t2 ON t2.id = p.time2
			LEFT JOIN Ginasios g ON g.id = p.ginasio_id
			LEFT JOIN Torneios tr ON tr.id = p.torneio_id
			ORDER BY p.dataPartida DESC, p.id DESC
		`).all();

		const estatisticasMap = new Map();
		for (const time of times) {
			estatisticasMap.set(Number(time.id), {
				id: time.id,
				nome: time.nome,
				cidade: time.cidade,
				totalPartidas: 0,
				finalizadas: 0,
				agendadas: 0,
				vitorias: 0,
				derrotas: 0,
				empates: 0,
				setsGanhos: 0,
				setsPerdidos: 0,
				saldoSets: 0,
				taxaVitoria: 0,
			});
		}

		const jogos = partidas.map((partida) => {
			const status = String(partida.status || "AGENDADA").toUpperCase();
			const finalizada = status === "FINALIZADA";
			const placarTime1 = Number(partida.pontosTime1) || 0;
			const placarTime2 = Number(partida.pontosTime2) || 0;
			const time1Stats = estatisticasMap.get(Number(partida.time1));
			const time2Stats = estatisticasMap.get(Number(partida.time2));

			if (time1Stats) {
				time1Stats.totalPartidas += 1;
			}

			if (time2Stats) {
				time2Stats.totalPartidas += 1;
			}

			if (finalizada) {
				if (time1Stats) {
					time1Stats.finalizadas += 1;
					time1Stats.setsGanhos += placarTime1;
					time1Stats.setsPerdidos += placarTime2;
				}

				if (time2Stats) {
					time2Stats.finalizadas += 1;
					time2Stats.setsGanhos += placarTime2;
					time2Stats.setsPerdidos += placarTime1;
				}

				if (placarTime1 > placarTime2) {
					if (time1Stats) time1Stats.vitorias += 1;
					if (time2Stats) time2Stats.derrotas += 1;
				} else if (placarTime2 > placarTime1) {
					if (time2Stats) time2Stats.vitorias += 1;
					if (time1Stats) time1Stats.derrotas += 1;
				} else {
					if (time1Stats) time1Stats.empates += 1;
					if (time2Stats) time2Stats.empates += 1;
				}
			} else {
				if (time1Stats) time1Stats.agendadas += 1;
				if (time2Stats) time2Stats.agendadas += 1;
			}

			return {
				id: partida.id,
				nome: partida.nome,
				dataPartida: partida.dataPartida,
				status,
				time1Nome: partida.time1Nome || "Time 1",
				time2Nome: partida.time2Nome || "Time 2",
				torneioNome: partida.torneioNome || "Sem torneio",
				ginasioNome: partida.ginasioNome || "Local nao definido",
				pontosTime1: placarTime1,
				pontosTime2: placarTime2,
				placar: finalizada ? `${placarTime1} x ${placarTime2}` : "--",
				vencedor: finalizada
					? placarTime1 > placarTime2
						? partida.time1Nome
						: placarTime2 > placarTime1
							? partida.time2Nome
							: "Empate"
					: "Pendente",
			};
		});

		const timesResumo = Array.from(estatisticasMap.values()).map((time) => ({
			...time,
			saldoSets: time.setsGanhos - time.setsPerdidos,
			taxaVitoria: time.finalizadas > 0
				? Number(((time.vitorias / time.finalizadas) * 100).toFixed(1))
				: 0,
		}));

		const rankingVitorias = [...timesResumo].sort((a, b) => (
			b.vitorias - a.vitorias
			|| b.taxaVitoria - a.taxaVitoria
			|| b.saldoSets - a.saldoSets
			|| String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" })
		));

		const rankingDerrotas = [...timesResumo].sort((a, b) => (
			b.derrotas - a.derrotas
			|| a.taxaVitoria - b.taxaVitoria
			|| String(a.nome).localeCompare(String(b.nome), "pt-BR", { sensitivity: "base" })
		));

		return {
			resumo: {
				totalTimes: timesResumo.length,
				totalJogos: jogos.length,
				jogosFinalizados: jogos.filter((jogo) => jogo.status === "FINALIZADA").length,
				jogosAgendados: jogos.filter((jogo) => jogo.status !== "FINALIZADA").length,
			},
			times: timesResumo,
			rankingVitorias,
			rankingDerrotas,
			jogos,
		};
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

	findTeamReport(id) {
		return this.buscarRelatorio(id);
	}

	findGeneralTeamReport() {
		return this.buscarRelatorioGeral();
	}
}

export default Times;
