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

    getMatchReportRows(tournamentId) {
        const stmt = this.db.prepare(`
            SELECT
                p.id,
                p.nome,
                p.dataPartida,
                p.status,
                p.pontosTime1,
                p.pontosTime2,
                p.fase,
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

    getBestPlayerByTournamentId(tournamentId) {
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
            GROUP BY j.id, j.nome, j.numCamisa
            ORDER BY acoesA DESC, totalAcoes DESC, j.nome ASC
            LIMIT 1
        `);

        return stmt.get(tournamentId) || null;
    }
}

module.exports = {
    TournamentDAO,
};
