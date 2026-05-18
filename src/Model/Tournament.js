const TournamentType = Object.freeze({
    POINTS: 1,
    KNOCKOUT: 2,
    POINTS_AND_KNOCKOUT: 3
});

const { TournamentDAO } = require('./TournamentDAO');
const tournamentDAO = new TournamentDAO();

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
                fase: partida.fase || 'Sem fase',
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
}

module.exports = {
    TournamentType,
    Tournament,
};
