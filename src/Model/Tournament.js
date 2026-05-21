const TournamentType = Object.freeze({
    POINTS: 1,
    KNOCKOUT: 2,
    POINTS_AND_KNOCKOUT: 3
});

const { TournamentDAO } = require('./TournamentDAO');
const tournamentDAO = new TournamentDAO();

const getTournamentTypeLabel = (type) => {
    const types = {
        1: 'Pontos Corridos',
        2: 'Mata-Mata',
        3: 'Mata-Mata + Pontos Corridos',
    };

    return types[Number(type)] || 'Formato nao informado';
};

const getClassificationPoints = (setsFor, setsAgainst) => {
    if (setsFor > setsAgainst) {
        return setsAgainst === 2 ? 2 : 3;
    }

    if (setsAgainst > setsFor) {
        return setsFor === 2 ? 1 : 0;
    }

    return 0;
};

const normalizarNomeAcao = (nome) => {
    const texto = String(nome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (texto.startsWith('saq')) return 'Saque';
    if (texto.startsWith('ata')) return 'Ataque';
    if (texto.startsWith('bloq')) return 'Bloqueio';
    if (texto.startsWith('recep')) return 'Recepcao';
    if (texto.startsWith('def')) return 'Defesa';
    if (texto.startsWith('lev')) return 'Levantamento';
    return 'Outros';
};

const getDefaultPhaseByTournamentType = (type) => {
    if (Number(type) === TournamentType.POINTS) return 'Fase de Grupos';
    if (Number(type) === TournamentType.KNOCKOUT) return 'Mata-Mata';
    if (Number(type) === TournamentType.POINTS_AND_KNOCKOUT) return 'Fase de Grupos';
    return 'Fase nao informada';
};

const normalizarFasePartida = (partida, torneioTipo) => {
    const invalidos = new Set(['', 'sem fase', 'mock completo', 'null', 'undefined']);
    const valores = [partida.tipo, partida.fase];

    for (const valor of valores) {
        const texto = String(valor ?? '').trim();
        const chave = texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        if (!invalidos.has(chave) && Number.isNaN(Number(texto))) {
            return texto;
        }
    }

    const numerico = Number(partida.tipo || partida.fase);
    if (Number.isFinite(numerico)) {
        if (numerico === 1) return 'Fase de Grupos';
        if (numerico === 2) return 'Mata-Mata';
        if (numerico === 3) return 'Fase Mista';
    }

    return getDefaultPhaseByTournamentType(torneioTipo);
};

class Tournament {
    id; // int 
    name; // string
    type; // TournamentType enum / int
    startDate; // YYYY-MM-DD
    endDate; // YYYY-MM-DD

    constructor(id, name, type, startDate, endDate) {
        if (startDate && endDate && startDate > endDate) {
            throw new Error('A data de início não pode ser maior que a de término.');
        }

        this.id = id;
        this.name = name;
        this.type = type;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    static fromRow(row) {
        if (!row) {
            return null;
        }

        return new Tournament(row.id, row.nome, row.tipo, row.inicio, row.termino);
    }

    static fromRows(rows) {
        return rows.map((row) => Tournament.fromRow(row));
    }

    static getAllTournaments() {
        return Tournament.fromRows(tournamentDAO.getAllTournaments());
    }

    static getTournamentById(id) {
        return Tournament.fromRow(tournamentDAO.getTournamentById(id));
    }

    static createTournament(tournament) {
        return Tournament.fromRow(tournamentDAO.createTournament(tournament));
    }

    static modifyTournament(tournament) {
        return Tournament.fromRow(tournamentDAO.modifyTournament(tournament));
    }

    static deleteTournament(id) {
        return tournamentDAO.deleteTournament(id);
    }

    static buildMatchReport(tournamentId) {
        const torneioId = Number(tournamentId);
        if (!torneioId || Number.isNaN(torneioId)) {
            throw new Error('Torneio invalido para emitir relatorio.');
        }

        const torneio = tournamentDAO.getTournamentById(torneioId);
        if (!torneio) {
            throw new Error('Torneio nao encontrado.');
        }

        const partidas = tournamentDAO.getMatchReportRows(torneioId);
        const timesMap = new Map();
        const ensureTime = (nome) => {
            const key = nome || 'Time nao definido';
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
            const status = String(partida.status || 'AGENDADA').toUpperCase();
            const finalizada = status === 'FINALIZADA';
            const pontosTime1 = Number(partida.pontosTime1) || 0;
            const pontosTime2 = Number(partida.pontosTime2) || 0;
            const time1 = ensureTime(partida.time1Nome);
            const time2 = ensureTime(partida.time2Nome);

            time1.jogos += 1;
            time2.jogos += 1;

            if (finalizada) {
                time1.finalizadas += 1;
                time2.finalizadas += 1;
                time1.setsGanhos += pontosTime1;
                time1.setsPerdidos += pontosTime2;
                time2.setsGanhos += pontosTime2;
                time2.setsPerdidos += pontosTime1;

                if (pontosTime1 > pontosTime2) {
                    time1.vitorias += 1;
                    time2.derrotas += 1;
                } else if (pontosTime2 > pontosTime1) {
                    time2.vitorias += 1;
                    time1.derrotas += 1;
                } else {
                    time1.empates += 1;
                    time2.empates += 1;
                }
            }

            return {
                id: partida.id,
                nome: partida.nome,
                dataPartida: partida.dataPartida,
                status,
                fase: normalizarFasePartida(partida, torneio.tipo),
                time1Nome: partida.time1Nome || 'Time 1',
                time2Nome: partida.time2Nome || 'Time 2',
                ginasioNome: partida.ginasioNome || 'Local nao definido',
                pontosTime1,
                pontosTime2,
                placar: finalizada ? `${pontosTime1} x ${pontosTime2}` : '--',
                vencedor: finalizada
                    ? pontosTime1 > pontosTime2
                        ? partida.time1Nome
                        : pontosTime2 > pontosTime1
                            ? partida.time2Nome
                            : 'Empate'
                    : 'Pendente',
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
            || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
        ));

        return {
            torneio,
            resumo: {
                totalPartidas: jogos.length,
                finalizadas: jogos.filter((jogo) => jogo.status === 'FINALIZADA').length,
                agendadas: jogos.filter((jogo) => jogo.status !== 'FINALIZADA').length,
            },
            melhorTime: times[0] || null,
            melhorJogador: tournamentDAO.getBestPlayerByTournamentId(torneioId),
            times,
            jogos,
        };
    }

    static buildTournamentReport(tournamentId) {
        const baseReport = Tournament.buildMatchReport(tournamentId);
        const { torneio, jogos } = baseReport;
        const finalizadas = jogos.filter((jogo) => jogo.status === 'FINALIZADA');
        const totalSets = finalizadas.reduce((acc, jogo) => acc + jogo.pontosTime1 + jogo.pontosTime2, 0);
        const cincoSets = finalizadas.filter((jogo) => jogo.pontosTime1 + jogo.pontosTime2 >= 5).length;
        const maiorDiferenca = finalizadas.reduce((maior, jogo) => {
            const diferenca = Math.abs(jogo.pontosTime1 - jogo.pontosTime2);
            if (!maior || diferenca > maior.diferencaSets) {
                return { ...jogo, diferencaSets: diferenca };
            }
            return maior;
        }, null);

        const maisDisputado = finalizadas.reduce((melhor, jogo) => {
            const total = jogo.pontosTime1 + jogo.pontosTime2;
            const diferenca = Math.abs(jogo.pontosTime1 - jogo.pontosTime2);
            const score = total * 10 - diferenca;
            if (!melhor || score > melhor.scoreDisputa) {
                return { ...jogo, scoreDisputa: score };
            }
            return melhor;
        }, null);

        const times = baseReport.times.map((time) => {
            const pontosClassificacao = finalizadas.reduce((acc, jogo) => {
                if (jogo.time1Nome === time.nome) {
                    return acc + getClassificationPoints(jogo.pontosTime1, jogo.pontosTime2);
                }
                if (jogo.time2Nome === time.nome) {
                    return acc + getClassificationPoints(jogo.pontosTime2, jogo.pontosTime1);
                }
                return acc;
            }, 0);
            const setRatio = time.setsPerdidos > 0 ? Number((time.setsGanhos / time.setsPerdidos).toFixed(3)) : time.setsGanhos;

            return {
                ...time,
                pontosClassificacao,
                setRatio,
            };
        }).sort((a, b) => (
            b.pontosClassificacao - a.pontosClassificacao
            || b.vitorias - a.vitorias
            || b.setRatio - a.setRatio
            || b.saldoSets - a.saldoSets
            || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
        ));

        const jogadores = tournamentDAO.getPlayerRankingByTournamentId(torneio.id).map((jogador) => {
            const totalAcoes = Number(jogador.totalAcoes) || 0;
            const acoesA = Number(jogador.acoesA) || 0;
            return {
                ...jogador,
                totalAcoes,
                acoesA,
                acoesB: Number(jogador.acoesB) || 0,
                acoesC: Number(jogador.acoesC) || 0,
                eficiencia: totalAcoes > 0 ? Number(((acoesA / totalAcoes) * 100).toFixed(1)) : 0,
            };
        });

        const acoesPorTipoMap = new Map();
        const qualidade = { A: 0, B: 0, C: 0 };
        let totalAcoes = 0;

        tournamentDAO.getActionSummaryByTournamentId(torneio.id).forEach((row) => {
            const tipo = normalizarNomeAcao(row.tipoAcaoNome);
            const count = Number(row.total) || 0;
            const qual = String(row.qualidade || '').toUpperCase();

            if (!acoesPorTipoMap.has(tipo)) {
                acoesPorTipoMap.set(tipo, { tipo, total: 0, A: 0, B: 0, C: 0 });
            }

            const item = acoesPorTipoMap.get(tipo);
            item.total += count;
            totalAcoes += count;

            if (Object.prototype.hasOwnProperty.call(qualidade, qual)) {
                qualidade[qual] += count;
                item[qual] += count;
            }
        });

        const acoesPorTipo = Array.from(acoesPorTipoMap.values()).sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo));
        const aproveitamentoA = totalAcoes > 0 ? Number(((qualidade.A / totalAcoes) * 100).toFixed(1)) : 0;
        const ginasios = tournamentDAO.getGymSummaryByTournamentId(torneio.id).map((ginasio) => ({
            ...ginasio,
            partidas: Number(ginasio.partidas) || 0,
            finalizadas: Number(ginasio.finalizadas) || 0,
        }));

        return {
            torneio: {
                ...torneio,
                tipoNome: getTournamentTypeLabel(torneio.tipo),
            },
            resumo: {
                ...baseReport.resumo,
                totalTimes: times.length,
                totalSets,
                mediaSetsPorPartida: finalizadas.length > 0 ? Number((totalSets / finalizadas.length).toFixed(1)) : 0,
                jogosCincoSets: cincoSets,
                totalAcoes,
                aproveitamentoA,
                locais: ginasios.length,
            },
            destaques: {
                lider: times[0] || null,
                campeao: finalizadas.length > 0 ? times[0] || null : null,
                melhorJogador: jogadores[0] || baseReport.melhorJogador || null,
                jogoMaisDisputado: maisDisputado,
                maiorDiferenca,
                fundamentoMaisRegistrado: acoesPorTipo[0] || null,
            },
            times,
            jogadores,
            acoesPorTipo,
            qualidade,
            ginasios,
            jogos,
        };
    }
}

module.exports = {
    TournamentType,
    Tournament,
};
