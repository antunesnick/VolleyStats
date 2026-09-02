import { normalizarSetsParaVencer } from './RegrasSet';

class PartidaModel {
    constructor(id = null, nome = null, pontosTime1 = null, pontosTime2 = null, dataPartida = null, tipo = null, status = 'AGENDADA', externa = 0, ginasio_id = null, time1 = null, time2 = null, torneio_id = null, videoLink = null, fase = null, setsParaVencer = null) {
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
        this.fase = fase || tipo;
        // 2 = melhor de 3, 3 = melhor de 5.
        this.setsParaVencer = normalizarSetsParaVencer(setsParaVencer);
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

        if (filters.dataPartida && filters.dataPartida.trim() !== '') {
            query += ' AND dataPartida = ?';
            params.push(filters.dataPartida);
        }

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
        // Incluído videoLink e fase na inserção
        const stmt = db.prepare(`
            INSERT INTO Partidas (nome, pontosTime1, pontosTime2, dataPartida, tipo, status, externa, ginasio_id, time1, time2, torneio_id, videoLink, fase, setsParaVencer)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            partida.videoLink ? partida.videoLink.trim() : null,
            partida.fase || partida.tipo || null,
            normalizarSetsParaVencer(partida.setsParaVencer)
        );

        return { id: data.lastInsertRowid, ...partida };
    }

    update(partida, db) {
        // Incluído videoLink e fase na atualização
        const stmt = db.prepare(`
            UPDATE Partidas 
            SET nome = ?, dataPartida = ?, tipo = ?, externa = ?, ginasio_id = ?, time1 = ?, time2 = ?, torneio_id = ?, videoLink = ?, fase = ?, setsParaVencer = ?
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
            partida.torneio_id, 
            partida.videoLink,
            partida.fase,
            normalizarSetsParaVencer(partida.setsParaVencer),
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

    updateStatus(id, status, db) {
        const stmt = db.prepare(`
            UPDATE Partidas
            SET status = ?
            WHERE id = ?
        `);

        const result = stmt.run(status, id);
        return { success: result.changes > 0, id, status };
    }

    isKnownVideoProvider(parsedUrl) {
        const host = parsedUrl.hostname.replace(/^www\./i, '').toLowerCase();
        const path = parsedUrl.pathname || '';

        if ((host === 'youtube.com' || host === 'm.youtube.com') && path === '/watch' && parsedUrl.searchParams.get('v')) {
            return true;
        }

        if ((host === 'youtube.com' || host === 'm.youtube.com') && (path.startsWith('/shorts/') || path.startsWith('/live/'))) {
            return true;
        }

        if (host === 'youtu.be' && path.length > 1) {
            return true;
        }

        if (host === 'vimeo.com' && /^\/\d+/.test(path)) {
            return true;
        }

        if (host === 'player.vimeo.com' && path.startsWith('/video/')) {
            return true;
        }

        return false;
    }

    async hasVideoContentType(link) {
        if (typeof fetch !== 'function') {
            return false;
        }

        const requestWithTimeout = async (method, extraHeaders = {}) => {
            const abortController = new AbortController();
            const timeoutId = setTimeout(() => abortController.abort(), 6000);

            try {
                const response = await fetch(link, {
                    method,
                    redirect: 'follow',
                    headers: {
                        ...extraHeaders,
                        'User-Agent': 'VolleyStats/1.0'
                    },
                    signal: abortController.signal
                });

                const contentType = (response.headers.get('content-type') || '').toLowerCase();
                return contentType.startsWith('video/');
            } catch (_error) {
                return false;
            } finally {
                clearTimeout(timeoutId);
            }
        };

        const headCheck = await requestWithTimeout('HEAD');
        if (headCheck) {
            return true;
        }

        return requestWithTimeout('GET', { Range: 'bytes=0-1024' });
    }

    async isValidVideoLink(link) {
        const normalizedLink = typeof link === 'string' ? link.trim() : '';

        if (normalizedLink === '') {
            return { isValid: true, normalizedLink: '' };
        }

        let parsedUrl;
        try {
            parsedUrl = new URL(normalizedLink);
        } catch (_error) {
            return {
                isValid: false,
                message: 'Link de video invalido. Informe uma URL completa com http:// ou https://.'
            };
        }

        if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
            return {
                isValid: false,
                message: 'Link de video invalido. Informe uma URL completa com http:// ou https://.'
            };
        }

        if (this.isKnownVideoProvider(parsedUrl)) {
            return { isValid: true, normalizedLink };
        }

        const looksLikeVideoFile = /\.(mp4|webm|mov|m3u8|mkv|avi)(\?|#|$)/i.test(parsedUrl.pathname);
        if (looksLikeVideoFile) {
            return { isValid: true, normalizedLink };
        }

        const hasVideoContent = await this.hasVideoContentType(normalizedLink);
        if (hasVideoContent) {
            return { isValid: true, normalizedLink };
        }

        return {
            isValid: false,
            message: 'Nao foi possivel confirmar conteudo de video nesse link. Use URL direta de video (.mp4/.webm) ou link de plataforma (YouTube/Vimeo).'
        };
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

export default PartidaModel;
