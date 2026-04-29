const db = require('../db/db');
const PartidaModel = require('../Model/PartidaModel');

class PartidaControl {

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

    async validateVideoLink(link) {
        const partida = new PartidaModel();
        const normalizedLink = typeof link === 'string' ? link.trim() : '';

        if (normalizedLink === '') {
            return { isValid: true, normalizedLink: '' };
        }

        if (!partida.isValidVideoLink(normalizedLink)) {
            return {
                isValid: false,
                message: 'Link de video invalido. Informe uma URL completa com http:// ou https://.'
            };
        }

        const parsedUrl = new URL(normalizedLink);
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



    async createPartida(data) {
        const partida = new PartidaModel(null, data.nome, data.pontosTime1, data.pontosTime2, data.dataPartida, data.tipo, data.status, data.externa, data.ginasio_id, data.time1, data.time2, data.torneio_id, data.videoLink);
        
        const insertTransaction = db.transaction((partidaObj) => {
            return partida.insert(partidaObj, db); 
        });

        try {
            const result = insertTransaction(partida);
            return result; 
        } catch (error) {
            console.error("Falha ao criar partida. Transação revertida (Rollback).", error);
            throw error; 
        }
    }

    async updatePartida(data) {
        const partida = new PartidaModel(data.id, data.nome, data.pontosTime1, data.pontosTime2, data.dataPartida, data.tipo, data.status, data.externa, data.ginasio_id, data.time1, data.time2, data.torneio_id, data.videoLink);    
        
        const updateTransaction = db.transaction((partidaObj) => {
            return partida.update(partidaObj, db);
        });

        try {            
            const result = updateTransaction(partida);
            return result;
        } catch (error) {
            console.error("Falha ao atualizar partida. Transação revertida (Rollback).", error);
            throw error; 
        }
    }

    async deletePartida(id) {
        const partida = new PartidaModel();
        
        const deleteTransaction = db.transaction((partidaId) => {
            return partida.delete(partidaId, db);
        }); 

        try {
            const result = deleteTransaction(id);
            return result;
        } catch (error) {
            console.error("Falha ao apagar partida. Transação revertida (Rollback).", error);
            throw error; 
        }
    }

    async findAllPartidas() {
        const partida = new PartidaModel();
        try {
            return partida.findAll(db);
        } catch (e) {
            console.error("Falha ao buscar partidas.", e);
            throw e;
        }
    }

    async findPartidaFiltered(filter) {
        const partida = new PartidaModel();
        try {
            return partida.findPartidaFiltered(filter, db);
        } catch (e) {
            throw e;
        }
    }

    async findPartidaByDateAndTeam(filters, tournamentId) {
        const partida = new PartidaModel();
        try {
            return partida.findPartidaByDateAndTeam(filters, db, tournamentId);
        } catch (e) {
            console.error("Falha ao buscar partidas filtradas.", e);
            throw e;
        }
    }

    async findPartidaById(id) {
        const partida = new PartidaModel();
        try {
            return partida.findById(id, db);
        } catch (e) {
            console.error("Falha ao buscar partida por ID.", e);
            throw e;
        }
    }

    async findPartidaByTournamentId(tournamentId) {
        const partida = new PartidaModel(); 
        try {
            return partida.findByTournamentId(tournamentId, db);
        } catch (e) {
            console.error("Falha ao buscar partidas por ID do torneio.", e);
            throw e;
        }
    }
    
    async finalizarPartida(id, pontosTime1, pontosTime2) {
        const partida = new PartidaModel();
        
        const finalizeTransaction = db.transaction(() => {
            return partida.finalize(id, pontosTime1, pontosTime2, db);
        });

        try {
            const result = finalizeTransaction();
            return result;
        } catch (error) {
            console.error("Falha ao finalizar partida. Transação revertida.", error);
            throw error;
        }
    }

    async iniciarPartida(id) {
        const partida = new PartidaModel();

        const startTransaction = db.transaction((partidaId) => {
            return partida.updateStatus(partidaId, 'EM_ANDAMENTO', db);
        });

        try {
            return startTransaction(id);
        } catch (error) {
            console.error("Falha ao iniciar partida. Transacao revertida.", error);
            throw error;
        }
    }
    
    async updateVideoLink(id, link) {
        const validationResult = await this.validateVideoLink(link);
        if (!validationResult.isValid) {
            throw new Error(validationResult.message);
        }

        const partida = new PartidaModel();
        const normalizedLink = validationResult.normalizedLink;

        const updateVideoLinkTransaction = db.transaction((partidaId, partidaLink) => {
            return partida.updateVideoLink(partidaId, partidaLink, db);
        });

        try {
            const result = updateVideoLinkTransaction(id, normalizedLink);
            return {
                success: true,
                ...result
            };
        } catch (error) {
            console.error('Falha ao atualizar link de video da partida. Transacao revertida.', error);
            throw error;
        }
    }

    async updateVideoLink(id, link) {
        const validationResult = await this.validateVideoLink(link);
        if (!validationResult.isValid) {
            throw new Error(validationResult.message);
        }

        const partida = new PartidaModel();
        const normalizedLink = validationResult.normalizedLink;

        const updateVideoLinkTransaction = db.transaction((partidaId, partidaLink) => {
            return partida.updateVideoLink(partidaId, partidaLink, db);
        });

        try {
            const result = updateVideoLinkTransaction(id, normalizedLink);
            return {
                success: true,
                ...result
            };
        } catch (error) {
            console.error('Falha ao atualizar link de video da partida. Transacao revertida.', error);
            throw error;
        }
    }

    static getInstance() {
        if (!PartidaControl.instance) {
            PartidaControl.instance = new PartidaControl();
        }
        return PartidaControl.instance;
    }
}   
module.exports = PartidaControl;
