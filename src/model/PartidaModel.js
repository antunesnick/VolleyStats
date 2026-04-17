class PartidaModel {
    constructor(id = null, nome = null, pontosTime1 = null, pontosTime2 = null, dataPartida = null, tipo = null, status = 'AGENDADA', externa = 0, ginasio_id = null, time1 = null, time2 = null) {
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
    }

    findAll(db) {
        const stmt = db.prepare('SELECT * FROM Partidas');
        return stmt.all();
    }

    findPartidaFiltered(filter, db) {
        const stmt = db.prepare('SELECT * FROM Partidas WHERE status = ?');
        return stmt.all(filter.status);
    }

    findPartidaByDateAndTeam(filters, db) {
        let query = 'SELECT * FROM Partidas WHERE 1=1';
        const params = [];

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

    insert(partida, db) {
        const stmt = db.prepare(`
            INSERT INTO Partidas (nome, pontosTime1, pontosTime2, dataPartida, tipo, status, externa, ginasio_id, time1, time2)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        const data = stmt.run(
            partida.nome,
            partida.pontosTime1 || null,
            partida.pontosTime2 || null,
            partida.dataPartida,
            partida.tipo,
            partida.status || 'AGENDADA',
            partida.externa ? 1 : 0,
            partida.ginasio_id || 1, // Fallback para 1 enquanto não temos a tela de Ginásios
            partida.time1 || 1,      // Fallback para 1 enquanto não temos a tela de Times
            partida.time2 || 2       // Fallback para 2 enquanto não temos a tela de Times
        );

        return { id: data.lastInsertRowid, ...partida };
    }

    update(partida, db) {
        const stmt = db.prepare(`
            UPDATE Partidas 
            SET nome = ?, dataPartida = ?, tipo = ?, externa = ?, ginasio_id = ?, time1 = ?, time2 = ?
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
            partida.id
        );
        
        return partida;
    }

    delete(id, db) {
        const stmt = db.prepare('DELETE FROM Partidas WHERE id = ?');
        stmt.run(id);
        return { success: true };
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
}

module.exports = PartidaModel;