import { bucketDoResultado, criarContagemPorBucket } from './Qualidade';
const TournamentType = Object.freeze({
    POINTS: 1,
    KNOCKOUT: 2,
    POINTS_AND_KNOCKOUT: 3
});

import { TournamentDAO } from './TournamentDAO';
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

const normalizarTexto = (texto) => String(texto || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const arredondarUmaCasa = (value) => {
    if (!Number.isFinite(value)) {
        return 0;
    }

    return Number(value.toFixed(1));
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

    static buildMatchReport(tournamentId, filtros = {}) {
        const torneioId = Number(tournamentId);
        if (!torneioId || Number.isNaN(torneioId)) {
            throw new Error('Torneio invalido para emitir relatorio.');
        }

        const torneio = tournamentDAO.getTournamentById(torneioId);
        if (!torneio) {
            throw new Error('Torneio nao encontrado.');
        }

        const timeId = filtros.timeId ? Number(filtros.timeId) : null;
        const faseFiltro = String(filtros.fase || '').trim();
        const dataPartida = String(filtros.dataPartida || '').trim();
        const partidasBase = tournamentDAO.getMatchReportRows(torneioId).map((partida) => ({
            ...partida,
            faseNormalizada: normalizarFasePartida(partida, torneio.tipo),
        }));
        const filtrosAtivos = Boolean(timeId || faseFiltro || dataPartida);
        const partidas = partidasBase.filter((partida) => {
            const matchTime = !timeId || Number(partida.time1Id) === timeId || Number(partida.time2Id) === timeId;
            const matchFase = !faseFiltro || normalizarTexto(partida.faseNormalizada) === normalizarTexto(faseFiltro);
            const matchData = !dataPartida || String(partida.dataPartida || '') === dataPartida;
            return matchTime && matchFase && matchData;
        });
        const fases = Array.from(new Set(partidasBase.map((partida) => partida.faseNormalizada).filter(Boolean))).sort((a, b) => (
            String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' })
        ));
        const timesOpcoesMap = new Map();
        partidasBase.forEach((partida) => {
            if (partida.time1Id) timesOpcoesMap.set(Number(partida.time1Id), partida.time1Nome || 'Time 1');
            if (partida.time2Id) timesOpcoesMap.set(Number(partida.time2Id), partida.time2Nome || 'Time 2');
        });
        const filtrosAplicados = {
            timeId,
            timeNome: timeId ? timesOpcoesMap.get(timeId) || null : null,
            fase: faseFiltro,
            dataPartida,
        };
        const opcoes = {
            times: Array.from(timesOpcoesMap.entries()).map(([id, nome]) => ({ id, nome })).sort((a, b) => (
                String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
            )),
            fases,
        };
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
                fase: partida.faseNormalizada,
                time1Id: partida.time1Id,
                time2Id: partida.time2Id,
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
            filtrosAplicados,
            filtrosAtivos,
            opcoes,
            resumo: {
                totalPartidas: jogos.length,
                finalizadas: jogos.filter((jogo) => jogo.status === 'FINALIZADA').length,
                agendadas: jogos.filter((jogo) => jogo.status !== 'FINALIZADA').length,
            },
            melhorTime: times[0] || null,
            melhorJogador: tournamentDAO.getBestPlayerByTournamentId(
                torneioId,
                filtrosAtivos && jogos.length === 0 ? [-1] : jogos.map((jogo) => Number(jogo.id)).filter(Boolean)
            ),
            times,
            jogos,
        };
    }

    static buildTournamentReport(tournamentId, filtros = {}) {
        const baseReport = Tournament.buildMatchReport(tournamentId, filtros);
        const { torneio, jogos } = baseReport;
        const matchIds = jogos.map((jogo) => Number(jogo.id)).filter(Boolean);
        const matchIdsForDao = baseReport.filtrosAtivos && matchIds.length === 0 ? [-1] : matchIds;
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

        const jogadores = tournamentDAO.getPlayerRankingByTournamentId(torneio.id, matchIdsForDao).map((jogador) => {
            const totalAcoes = Number(jogador.totalAcoes) || 0;
            const acoesPonto = Number(jogador.acoesPonto) || 0;
            return {
                ...jogador,
                totalAcoes,
                acoesPonto,
                acoesNeutra: Number(jogador.acoesNeutra) || 0,
                acoesErro: Number(jogador.acoesErro) || 0,
                eficiencia: totalAcoes > 0 ? Number(((acoesPonto / totalAcoes) * 100).toFixed(1)) : 0,
            };
        });

        const acoesPorTipoMap = new Map();
        // Baldes de resultado, nao a escala completa: esta tabela mistura
        // fundamentos, e o mesmo simbolo significa coisas diferentes em cada um.
        const qualidade = criarContagemPorBucket();
        let totalAcoes = 0;

        tournamentDAO.getActionSummaryByTournamentId(torneio.id, matchIdsForDao).forEach((row) => {
            const tipo = normalizarNomeAcao(row.tipoAcaoNome);
            const count = Number(row.total) || 0;
            const balde = bucketDoResultado(row.tipoAcaoNome, row.qualidade);

            if (!acoesPorTipoMap.has(tipo)) {
                acoesPorTipoMap.set(tipo, { tipo, total: 0, ...criarContagemPorBucket() });
            }

            const item = acoesPorTipoMap.get(tipo);
            item.total += count;
            totalAcoes += count;
            qualidade[balde] += count;
            item[balde] += count;
        });

        const acoesPorTipo = Array.from(acoesPorTipoMap.values()).sort((a, b) => b.total - a.total || a.tipo.localeCompare(b.tipo));
        const aproveitamentoPontos = totalAcoes > 0 ? Number(((qualidade.Ponto / totalAcoes) * 100).toFixed(1)) : 0;
        const ginasios = tournamentDAO.getGymSummaryByTournamentId(torneio.id, matchIdsForDao).map((ginasio) => ({
            ...ginasio,
            partidas: Number(ginasio.partidas) || 0,
            finalizadas: Number(ginasio.finalizadas) || 0,
        }));

        return {
            torneio: {
                ...torneio,
                tipoNome: getTournamentTypeLabel(torneio.tipo),
            },
            filtrosAplicados: baseReport.filtrosAplicados,
            opcoes: baseReport.opcoes,
            resumo: {
                ...baseReport.resumo,
                totalTimes: times.length,
                totalSets,
                mediaSetsPorPartida: finalizadas.length > 0 ? Number((totalSets / finalizadas.length).toFixed(1)) : 0,
                jogosCincoSets: cincoSets,
                totalAcoes,
                aproveitamentoPontos,
                locais: ginasios.length,
            },
            destaques: {
                lider: times[0] || null,
                campeao: finalizadas.length > 0 ? times[0] || null : null,
                melhorJogador: jogadores[0] || tournamentDAO.getBestPlayerByTournamentId(torneio.id, matchIdsForDao) || null,
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

    static buildGeneralTournamentReport(filtros = {}) {
        const dataInicioFiltro = String(filtros.dataInicio || '').trim();
        const dataFimFiltro = String(filtros.dataFim || '').trim();
        const dataInicio = dataInicioFiltro && dataFimFiltro && dataInicioFiltro > dataFimFiltro ? dataFimFiltro : dataInicioFiltro;
        const dataFim = dataInicioFiltro && dataFimFiltro && dataInicioFiltro > dataFimFiltro ? dataInicioFiltro : dataFimFiltro;
        const tipoTorneio = filtros.tipoTorneio || filtros.tipo;
        const tipoTorneioNumber = tipoTorneio ? Number(tipoTorneio) : null;
        const tipoTorneioId = Number.isFinite(tipoTorneioNumber) && tipoTorneioNumber > 0 ? tipoTorneioNumber : null;
        const timeId = filtros.timeId ? Number(filtros.timeId) : null;
        const filtrosAtivos = Boolean(dataInicio || dataFim || tipoTorneioId || timeId);
        const rows = tournamentDAO.getGeneralTournamentMatchRows({
            dataInicio,
            dataFim,
            tipoTorneio: tipoTorneioId,
            timeId,
        });
        const opcoes = tournamentDAO.getGeneralTournamentFilterOptions();
        const timeFiltro = timeId ? tournamentDAO.getTeamById(timeId) : null;
        const torneiosMap = new Map();
        const timesMap = new Map();

        const ensureTournament = (row) => {
            const key = Number(row.torneioId);
            if (!key) {
                return null;
            }

            if (!torneiosMap.has(key)) {
                torneiosMap.set(key, {
                    id: key,
                    nome: row.torneioNome || 'Torneio sem nome',
                    tipo: row.torneioTipo,
                    tipoNome: getTournamentTypeLabel(row.torneioTipo),
                    inicio: row.torneioInicio,
                    termino: row.torneioTermino,
                    partidas: 0,
                    finalizadas: 0,
                    agendadas: 0,
                    times: new Map(),
                    setsDisputados: 0,
                    campeao: null,
                });
            }

            return torneiosMap.get(key);
        };

        const ensureTeam = (id, nome) => {
            const key = Number(id) || String(nome || 'time');
            if (!timesMap.has(key)) {
                timesMap.set(key, {
                    id: Number(id) || null,
                    nome: nome || 'Time nao definido',
                    torneiosIds: new Set(),
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

        for (const row of rows) {
            const torneio = ensureTournament(row);
            if (!torneio || !row.partidaId) {
                continue;
            }

            const status = String(row.status || 'AGENDADA').toUpperCase();
            const finalizada = status === 'FINALIZADA';
            const pontosTime1 = Number(row.pontosTime1) || 0;
            const pontosTime2 = Number(row.pontosTime2) || 0;
            const time1 = ensureTeam(row.time1Id, row.time1Nome);
            const time2 = ensureTeam(row.time2Id, row.time2Nome);

            torneio.partidas += 1;
            torneio.times.set(time1.nome, time1.nome);
            torneio.times.set(time2.nome, time2.nome);
            time1.jogos += 1;
            time2.jogos += 1;
            time1.torneiosIds.add(torneio.id);
            time2.torneiosIds.add(torneio.id);

            if (finalizada) {
                torneio.finalizadas += 1;
                torneio.setsDisputados += pontosTime1 + pontosTime2;
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
            } else {
                torneio.agendadas += 1;
            }
        }

        const times = Array.from(timesMap.values()).map((time) => ({
            ...time,
            torneios: time.torneiosIds.size,
            torneiosIds: undefined,
            saldoSets: time.setsGanhos - time.setsPerdidos,
            taxaVitoria: time.finalizadas > 0
                ? arredondarUmaCasa((time.vitorias / time.finalizadas) * 100)
                : 0,
        })).sort((a, b) => (
            b.vitorias - a.vitorias
            || b.taxaVitoria - a.taxaVitoria
            || b.saldoSets - a.saldoSets
            || b.torneios - a.torneios
            || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
        ));

        const calcularRankingTorneio = (torneioId) => {
            const ranking = new Map();

            for (const row of rows) {
                if (Number(row.torneioId) !== Number(torneioId) || !row.partidaId) {
                    continue;
                }

                const ensureLocal = (id, nome) => {
                    const key = Number(id) || String(nome || 'time');
                    if (!ranking.has(key)) {
                        ranking.set(key, {
                            id: Number(id) || null,
                            nome: nome || 'Time nao definido',
                            vitorias: 0,
                            derrotas: 0,
                            setsGanhos: 0,
                            setsPerdidos: 0,
                            saldoSets: 0,
                        });
                    }
                    return ranking.get(key);
                };

                const status = String(row.status || 'AGENDADA').toUpperCase();
                if (status !== 'FINALIZADA') {
                    ensureLocal(row.time1Id, row.time1Nome);
                    ensureLocal(row.time2Id, row.time2Nome);
                    continue;
                }

                const pontosTime1 = Number(row.pontosTime1) || 0;
                const pontosTime2 = Number(row.pontosTime2) || 0;
                const time1 = ensureLocal(row.time1Id, row.time1Nome);
                const time2 = ensureLocal(row.time2Id, row.time2Nome);
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
                }
            }

            return Array.from(ranking.values())
                .map((time) => ({
                    ...time,
                    saldoSets: time.setsGanhos - time.setsPerdidos,
                }))
                .sort((a, b) => (
                    b.vitorias - a.vitorias
                    || b.saldoSets - a.saldoSets
                    || b.setsGanhos - a.setsGanhos
                    || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
                ));
        };

        const torneios = Array.from(torneiosMap.values()).map((torneio) => {
            const ranking = calcularRankingTorneio(torneio.id);
            const campeao = ranking[0] || null;

            return {
                ...torneio,
                times: torneio.times.size,
                mediaSetsPorPartida: torneio.finalizadas > 0
                    ? arredondarUmaCasa(torneio.setsDisputados / torneio.finalizadas)
                    : 0,
                campeao,
                ranking: ranking.slice(0, 3),
            };
        }).sort((a, b) => (
            b.finalizadas - a.finalizadas
            || b.partidas - a.partidas
            || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
        ));

        const matchIds = rows.map((row) => Number(row.partidaId)).filter(Boolean);
        const matchIdsForDao = filtrosAtivos ? (matchIds.length > 0 ? matchIds : [-1]) : [];
        const timePrincipalFiltrado = timeId
            ? times.find((time) => Number(time.id) === timeId) || (timeFiltro ? { id: timeFiltro.id, nome: timeFiltro.nome } : null)
            : null;
        const timePrincipal = timePrincipalFiltrado || times.find((time) => {
            const nome = normalizarTexto(time.nome);
            return nome.includes('volei prudente') || nome.includes('prudente');
        }) || times[0] || null;

        const jogadoresTimePrincipal = timePrincipal?.id
            ? tournamentDAO.getMainTeamPlayerRankingAcrossTournaments(timePrincipal.id, matchIdsForDao).map((jogador) => {
                const totalAcoes = Number(jogador.totalAcoes) || 0;
                const acoesPonto = Number(jogador.acoesPonto) || 0;

                return {
                    ...jogador,
                    totalAcoes,
                    acoesPonto,
                    acoesNeutra: Number(jogador.acoesNeutra) || 0,
                    acoesErro: Number(jogador.acoesErro) || 0,
                    torneios: Number(jogador.torneios) || 0,
                    partidas: Number(jogador.partidas) || 0,
                    saques: Number(jogador.saques) || 0,
                    ataques: Number(jogador.ataques) || 0,
                    bloqueios: Number(jogador.bloqueios) || 0,
                    recepcoes: Number(jogador.recepcoes) || 0,
                    defesas: Number(jogador.defesas) || 0,
                    aproveitamentoPontos: totalAcoes > 0 ? arredondarUmaCasa((acoesPonto / totalAcoes) * 100) : 0,
                };
            })
            : [];

        const torneioMaisPartidas = [...torneios].sort((a, b) => b.partidas - a.partidas || b.finalizadas - a.finalizadas)[0] || null;
        const torneioMaisSets = [...torneios].sort((a, b) => b.setsDisputados - a.setsDisputados || b.finalizadas - a.finalizadas)[0] || null;
        const totalPartidas = torneios.reduce((acc, torneio) => acc + torneio.partidas, 0);
        const totalFinalizadas = torneios.reduce((acc, torneio) => acc + torneio.finalizadas, 0);
        const totalSets = torneios.reduce((acc, torneio) => acc + torneio.setsDisputados, 0);

        return {
            resumo: {
                totalTorneios: torneios.length,
                totalPartidas,
                finalizadas: totalFinalizadas,
                agendadas: torneios.reduce((acc, torneio) => acc + torneio.agendadas, 0),
                totalTimes: times.length,
                totalSets,
                mediaPartidasPorTorneio: torneios.length > 0 ? arredondarUmaCasa(totalPartidas / torneios.length) : 0,
                mediaSetsPorPartida: totalFinalizadas > 0 ? arredondarUmaCasa(totalSets / totalFinalizadas) : 0,
            },
            filtrosAplicados: {
                dataInicio,
                dataFim,
                tipoTorneio: tipoTorneioId,
                tipoTorneioNome: tipoTorneioId ? getTournamentTypeLabel(tipoTorneioId) : null,
                timeId,
                timeNome: timeFiltro?.nome || null,
            },
            opcoes: {
                ...opcoes,
                tipos: (opcoes.tipos || []).map((tipo) => ({
                    value: Number(tipo.value),
                    label: getTournamentTypeLabel(tipo.value),
                })),
            },
            destaques: {
                timeMaisVitorias: times[0] || null,
                timeMaisParticipou: [...times].sort((a, b) => b.torneios - a.torneios || b.jogos - a.jogos)[0] || null,
                timePrincipal,
                melhorJogadorTimePrincipal: jogadoresTimePrincipal[0] || null,
                torneioMaisPartidas,
                torneioMaisSets,
            },
            torneios,
            times,
            jogadoresTimePrincipal,
        };
    }
}

export { TournamentType, Tournament };
export default Tournament;
