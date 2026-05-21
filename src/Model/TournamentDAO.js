const { getDatabase } = require('../db/db');

class TournamentDAO {

    constructor(database = getDatabase()) {
        this.db = database;
    }

    createTournament(tournament) {
        const stmt = this.db.prepare(`
            INSERT INTO Torneios (nome, tipo, inicio, termino)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(tournament.name, tournament.type, tournament.startDate, tournament.endDate);
        return this.getTournamentById(result.lastInsertRowid);
    }

    modifyTournament(tournament) {
        const stmt = this.db.prepare(`
            UPDATE Torneios
            SET nome = ?, tipo = ?, inicio = ?, termino = ?
            WHERE id = ?
        `);

        const result = stmt.run(tournament.name, tournament.type, tournament.startDate, tournament.endDate, tournament.id);
        if (result.changes > 0) {
            return this.getTournamentById(tournament.id);
        }
        throw new Error('Torneio nao encontrado para atualizacao.');
    }

    deleteTournament(id) {
        const stmt = this.db.prepare('DELETE FROM Torneios WHERE id = ?');
        const result = stmt.run(id);
        return result.changes > 0;
    }

    getTournamentById(id) {
        const stmt = this.db.prepare('SELECT id, nome, tipo, inicio, termino FROM Torneios WHERE id = ?');
        const row = stmt.get(id);

        if (!row) {
            return null;
        }

        return row;
    }

    getAllTournaments() {
        const stmt = this.db.prepare('SELECT id, nome, tipo, inicio, termino FROM Torneios ORDER BY id DESC');
        const rows = stmt.all();

        return rows;
    }

    getGeneralTournamentMatchRows() {
        const stmt = this.db.prepare(`
            SELECT
                tr.id AS torneioId,
                tr.nome AS torneioNome,
                tr.tipo AS torneioTipo,
                tr.inicio AS torneioInicio,
                tr.termino AS torneioTermino,
                p.id AS partidaId,
                p.nome AS partidaNome,
                p.dataPartida,
                p.status,
                p.pontosTime1,
                p.pontosTime2,
                p.tipo AS partidaTipo,
                p.time1 AS time1Id,
                p.time2 AS time2Id,
                t1.nome AS time1Nome,
                t2.nome AS time2Nome,
                g.nome AS ginasioNome
            FROM Torneios tr
            LEFT JOIN Partidas p ON p.torneio_id = tr.id
            LEFT JOIN Times t1 ON t1.id = p.time1
            LEFT JOIN Times t2 ON t2.id = p.time2
            LEFT JOIN Ginasios g ON g.id = p.ginasio_id
            ORDER BY tr.inicio DESC, tr.id DESC, p.dataPartida DESC, p.id DESC
        `);

        return stmt.all();
    }

    getMainTeamPlayerRankingAcrossTournaments(teamId) {
        const stmt = this.db.prepare(`
            SELECT
                j.id,
                j.nome,
                j.numCamisa,
                p.nome AS posicaoNome,
                COUNT(a.id) AS totalAcoes,
                SUM(CASE WHEN a.Qualidade = 'A' THEN 1 ELSE 0 END) AS acoesA,
                SUM(CASE WHEN a.Qualidade = 'B' THEN 1 ELSE 0 END) AS acoesB,
                SUM(CASE WHEN a.Qualidade = 'C' THEN 1 ELSE 0 END) AS acoesC,
                COUNT(DISTINCT pa.torneio_id) AS torneios,
                COUNT(DISTINCT pa.id) AS partidas,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'saq%' THEN 1 ELSE 0 END) AS saques,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'ata%' THEN 1 ELSE 0 END) AS ataques,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'bloq%' THEN 1 ELSE 0 END) AS bloqueios,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'recep%' THEN 1 ELSE 0 END) AS recepcoes,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'def%' THEN 1 ELSE 0 END) AS defesas
            FROM Acao a
            INNER JOIN Jogadores j ON j.id = a.Jogador_id
            LEFT JOIN Posicoes p ON p.id = j.posicao_id
            LEFT JOIN TipoAcao ta ON ta.idTipoAcao = a.idTipoAcao
            INNER JOIN Partidas pa ON pa.id = a.Ponto_Partida_id
            LEFT JOIN TimesPartida tp ON tp.Partida_id = pa.id
                                    AND tp.Jogadores_id = j.id
                                    AND tp.Times_id = ?
            WHERE tp.Times_id = ?
               OR (
                    tp.Times_id IS NULL
                    AND (pa.time1 = ? OR pa.time2 = ?)
               )
            GROUP BY j.id, j.nome, j.numCamisa, p.nome
            ORDER BY acoesA DESC, totalAcoes DESC, torneios DESC, j.nome ASC
            LIMIT 10
        `);

        return stmt.all(teamId, teamId, teamId, teamId);
    }

    getMatchReportRows(tournamentId) {
        const stmt = this.db.prepare(`
            SELECT
                p.id,
                p.nome,
                p.dataPartida,
                p.status,
                p.pontosTime1,
                p.pontosTime2,
                p.tipo,
                p.fase,
                p.time1 AS time1Id,
                p.time2 AS time2Id,
                t1.nome AS time1Nome,
                t2.nome AS time2Nome,
                g.nome AS ginasioNome
            FROM Partidas p
            LEFT JOIN Times t1 ON t1.id = p.time1
            LEFT JOIN Times t2 ON t2.id = p.time2
            LEFT JOIN Ginasios g ON g.id = p.ginasio_id
            WHERE p.torneio_id = ?
            ORDER BY p.dataPartida DESC, p.id DESC
        `);

        return stmt.all(tournamentId);
    }

    getBestPlayerByTournamentId(tournamentId, matchIds = []) {
        const ids = (matchIds || []).map(Number).filter(Boolean);
        const matchFilter = ids.length > 0 ? `AND p.id IN (${ids.map(() => '?').join(',')})` : '';
        const stmt = this.db.prepare(`
            SELECT
                j.id,
                j.nome,
                j.numCamisa,
                COUNT(a.id) AS totalAcoes,
                SUM(CASE WHEN a.Qualidade = 'A' THEN 1 ELSE 0 END) AS acoesA,
                SUM(CASE WHEN a.Qualidade = 'B' THEN 1 ELSE 0 END) AS acoesB,
                SUM(CASE WHEN a.Qualidade = 'C' THEN 1 ELSE 0 END) AS acoesC,
                SUM(CASE WHEN ta.Nome = 'Saque' THEN 1 ELSE 0 END) AS saques,
                SUM(CASE WHEN ta.Nome = 'Ataque' THEN 1 ELSE 0 END) AS ataques,
                SUM(CASE WHEN ta.Nome = 'Bloqueio' THEN 1 ELSE 0 END) AS bloqueios
            FROM Acao a
            INNER JOIN Jogadores j ON j.id = a.Jogador_id
            LEFT JOIN TipoAcao ta ON ta.idTipoAcao = a.idTipoAcao
            INNER JOIN Partidas p ON p.id = a.Ponto_Partida_id
            WHERE p.torneio_id = ?
            ${matchFilter}
            GROUP BY j.id, j.nome, j.numCamisa
            ORDER BY acoesA DESC, totalAcoes DESC, j.nome ASC
            LIMIT 1
        `);

        return stmt.get(tournamentId, ...ids) || null;
    }

    getPlayerRankingByTournamentId(tournamentId, matchIds = []) {
        const ids = (matchIds || []).map(Number).filter(Boolean);
        const matchFilter = ids.length > 0 ? `AND pa.id IN (${ids.map(() => '?').join(',')})` : '';
        const stmt = this.db.prepare(`
            SELECT
                j.id,
                j.nome,
                j.numCamisa,
                p.nome AS posicaoNome,
                COUNT(a.id) AS totalAcoes,
                SUM(CASE WHEN a.Qualidade = 'A' THEN 1 ELSE 0 END) AS acoesA,
                SUM(CASE WHEN a.Qualidade = 'B' THEN 1 ELSE 0 END) AS acoesB,
                SUM(CASE WHEN a.Qualidade = 'C' THEN 1 ELSE 0 END) AS acoesC,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'saq%' THEN 1 ELSE 0 END) AS saques,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'ata%' THEN 1 ELSE 0 END) AS ataques,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'bloq%' THEN 1 ELSE 0 END) AS bloqueios,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'recep%' THEN 1 ELSE 0 END) AS recepcoes,
                SUM(CASE WHEN LOWER(COALESCE(ta.Nome, '')) LIKE 'def%' THEN 1 ELSE 0 END) AS defesas
            FROM Acao a
            INNER JOIN Jogadores j ON j.id = a.Jogador_id
            LEFT JOIN Posicoes p ON p.id = j.posicao_id
            LEFT JOIN TipoAcao ta ON ta.idTipoAcao = a.idTipoAcao
            INNER JOIN Partidas pa ON pa.id = a.Ponto_Partida_id
            WHERE pa.torneio_id = ?
            ${matchFilter}
            GROUP BY j.id, j.nome, j.numCamisa, p.nome
            ORDER BY acoesA DESC, totalAcoes DESC, j.nome ASC
            LIMIT 10
        `);

        return stmt.all(tournamentId, ...ids);
    }

    getActionSummaryByTournamentId(tournamentId, matchIds = []) {
        const ids = (matchIds || []).map(Number).filter(Boolean);
        const matchFilter = ids.length > 0 ? `AND p.id IN (${ids.map(() => '?').join(',')})` : '';
        const stmt = this.db.prepare(`
            SELECT
                COALESCE(ta.Nome, 'Outros') AS tipoAcaoNome,
                COALESCE(a.Qualidade, '-') AS qualidade,
                COUNT(a.id) AS total
            FROM Acao a
            LEFT JOIN TipoAcao ta ON ta.idTipoAcao = a.idTipoAcao
            INNER JOIN Partidas p ON p.id = a.Ponto_Partida_id
            WHERE p.torneio_id = ?
            ${matchFilter}
            GROUP BY ta.Nome, a.Qualidade
            ORDER BY total DESC
        `);

        return stmt.all(tournamentId, ...ids);
    }

    getGymSummaryByTournamentId(tournamentId, matchIds = []) {
        const ids = (matchIds || []).map(Number).filter(Boolean);
        const matchFilter = ids.length > 0 ? `AND p.id IN (${ids.map(() => '?').join(',')})` : '';
        const stmt = this.db.prepare(`
            SELECT
                COALESCE(g.nome, 'Local nao definido') AS nome,
                COALESCE(g.cidade, '') AS cidade,
                COALESCE(g.estado, '') AS estado,
                COUNT(p.id) AS partidas,
                SUM(CASE WHEN UPPER(COALESCE(p.status, '')) = 'FINALIZADA' THEN 1 ELSE 0 END) AS finalizadas
            FROM Partidas p
            LEFT JOIN Ginasios g ON g.id = p.ginasio_id
            WHERE p.torneio_id = ?
            ${matchFilter}
            GROUP BY g.id, g.nome, g.cidade, g.estado
            ORDER BY partidas DESC, nome ASC
        `);

        return stmt.all(tournamentId, ...ids);
    }
}

module.exports = {
    TournamentDAO,
};
