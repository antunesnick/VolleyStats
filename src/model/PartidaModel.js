class PartidaModel {
    constructor(id = null, nome = null, pontosTime1 = null, pontosTime2 = null, dataPartida = null, tipo = null, status = 'AGENDADA', externa = 0, ginasio_id = null, time1 = null, time2 = null, torneio_id = null, videoLink = null) {
        this.id = id;
        this.nome = nome;
        this.pontosTime1 = pontosTime1;
        this.pontosTime2 = pontosTime2;
        this.dataPartida = dataPartida;
        this.tipo = tipo;
        this.status = status;
        this.externa = externa;
        this.ginasio_id = ginasio_id;
        this.time1 = time1;
        this.time2 = time2;
        this.torneio_id = torneio_id;
        this.videoLink = videoLink;
    }

    findAll(db) {
        const stmt = db.prepare('SELECT * FROM Partidas');
        return stmt.all();
    }

    findPartidaFiltered(filter, db) {
        const stmt = db.prepare('SELECT * FROM Partidas WHERE status = ?');
        return stmt.all(filter.status);
    }

    findPartidaByDateAndTeam(filters, db, tournamentId) {
        let query = 'SELECT * FROM Partidas WHERE 1=1';
        const params = [];

        if (tournamentId !== null && tournamentId !== undefined && tournamentId !== '') {
            query += ' AND torneio_id = ?';
            params.push(tournamentId);
        }

        // Filtro por data
        if (filters.dataPartida && filters.dataPartida.trim() !== '') {
            query += ' AND dataPartida = ?';
            params.push(filters.dataPartida);
        }

        // Filtro por time (pode ser time1 ou time2)
        if (filters.timeId && filters.timeId !== '') {
            query += ' AND (time1 = ? OR time2 = ?)';
            params.push(parseInt(filters.timeId), parseInt(filters.timeId));
        }

        query += ' ORDER BY dataPartida DESC';
        const stmt = db.prepare(query);
        return stmt.all(...params);
    }

    findById(id, db) {
        const stmt = db.prepare(`
            SELECT
                p.*,
                t1.nome AS time1Nome,
                t2.nome AS time2Nome,
                g.nome AS ginasioNome
            FROM Partidas p
            LEFT JOIN Times t1 ON t1.id = p.time1
            LEFT JOIN Times t2 ON t2.id = p.time2
            LEFT JOIN Ginasios g ON g.id = p.ginasio_id
            WHERE p.id = ?
        `);
        return stmt.get(id);
    }

    findByTournamentId(torneioId, db) {
        const hasTournamentId = torneioId !== null && torneioId !== undefined && torneioId !== '';

        if (!hasTournamentId) {
            const stmt = db.prepare(`
                SELECT
                    p.*,
                    t1.nome AS time1Nome,
                    t2.nome AS time2Nome,
                    g.nome AS ginasioNome
                FROM Partidas p
                LEFT JOIN Times t1 ON t1.id = p.time1
                LEFT JOIN Times t2 ON t2.id = p.time2
                LEFT JOIN Ginasios g ON g.id = p.ginasio_id
                ORDER BY p.dataPartida DESC
            `);
            return stmt.all();
        }

        const stmt = db.prepare(`
            SELECT
                p.*,
                t1.nome AS time1Nome,
                t2.nome AS time2Nome,
                g.nome AS ginasioNome
            FROM Partidas p
            LEFT JOIN Times t1 ON t1.id = p.time1
            LEFT JOIN Times t2 ON t2.id = p.time2
            LEFT JOIN Ginasios g ON g.id = p.ginasio_id
            WHERE p.torneio_id = ?
            ORDER BY p.dataPartida DESC
        `);
        return stmt.all(torneioId);
    }


    insert(partida, db) {
        const stmt = db.prepare(`
            INSERT INTO Partidas (nome, pontosTime1, pontosTime2, dataPartida, tipo, status, externa, ginasio_id, time1, time2, torneio_id, videoLink)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const data = stmt.run(
            partida.nome,
            partida.pontosTime1 || null,
            partida.pontosTime2 || null,
            partida.dataPartida,
            partida.tipo,
            partida.status || 'AGENDADA',
            partida.externa ? 1 : 0,
            partida.ginasio_id || 1, 
            partida.time1 || 1,      
            partida.time2 || 2,
                partida.torneio_id || null,
            partida.videoLink ? partida.videoLink.trim() : null
        );

        return { id: data.lastInsertRowid, ...partida };
    }

    update(partida, db) {
        const stmt = db.prepare(`
            UPDATE Partidas 
            SET nome = ?, dataPartida = ?, tipo = ?, externa = ?, ginasio_id = ?, time1 = ?, time2 = ?, torneio_id = ?
            WHERE id = ?
        `);
        
        stmt.run(
            partida.nome, 
            partida.dataPartida, 
            partida.tipo, 
            partida.externa ? 1 : 0, 
            partida.ginasio_id, 
            partida.time1, 
            partida.time2, 
            partida.torneio_id, // <- Atualizando na query
            partida.id
        );   
        return partida;
    }
    
    delete(id, db) {
        const partidaId = Number(id);

        db.prepare('DELETE FROM Substituicao WHERE Ponto_Partida_id = ?').run(partidaId);
        db.prepare('DELETE FROM Acao WHERE Ponto_Partida_id = ?').run(partidaId);
        db.prepare('DELETE FROM Ponto WHERE Set_Partida_id = ?').run(partidaId);
        db.prepare('DELETE FROM "Set" WHERE Partida_id = ?').run(partidaId);
        db.prepare('DELETE FROM TimesPartida WHERE Partida_id = ?').run(partidaId);
        db.prepare('DELETE FROM LinksPartida WHERE Partida_id = ?').run(partidaId);

        const info = db.prepare('DELETE FROM Partidas WHERE id = ?').run(partidaId);
        return { success: info.changes > 0, changes: info.changes };
    }

    finalize(id, pontosTime1, pontosTime2, db) {
        const stmt = db.prepare(`
            UPDATE Partidas 
            SET status = 'FINALIZADA', pontosTime1 = ?, pontosTime2 = ?
            WHERE id = ?
        `);
        stmt.run(pontosTime1, pontosTime2, id);
        return { success: true, id, pontosTime1, pontosTime2 };
    }

    isValidVideoLink(link) {
        const normalizedLink = typeof link === 'string' ? link.trim() : '';

        if (normalizedLink === '') {
            return true;
        }

        try {
            const parsedUrl = new URL(normalizedLink);
            return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        } catch (_error) {
            return false;
        }
    }

    updateVideoLink(id, link, db) {
        const normalizedLink = typeof link === 'string' && link.trim() !== '' ? link.trim() : null;

        const stmt = db.prepare(`
            UPDATE Partidas
            SET videoLink = ?
            WHERE id = ?
        `);

        const result = stmt.run(normalizedLink, id);

        if (result.changes === 0) {
            throw new Error('Partida nao encontrada para atualizar o link de video.');
        }

        return { success: true, id, videoLink: normalizedLink };
    }
}

module.exports = PartidaModel;
