class TimesPartida {
    constructor(time, partida) {
        this.time = time;
        this.partida = partida;
        this.linha = [];
        this.banco = [];
        this.maxLinha = 6;
        this.maxBanco = 8;
        this.maxTotal = 14;
    }

    totalJogadores() {
        return this.linha.length + this.banco.length;
    }

    adicionarJogadorLinha(jogador) {
        if (this.linha.length >= this.maxLinha) return false;
        if (this.totalJogadores() >= this.maxTotal) return false;
        if (this.linha.some((item) => item?.id === jogador?.id)) return false;
        if (this.banco.some((item) => item?.id === jogador?.id)) return false;
        this.linha.push(jogador);
        return true;
    }

    adicionarJogadorBanco(jogador) {
        if (this.banco.length >= this.maxBanco) return false;
        if (this.totalJogadores() >= this.maxTotal) return false;
        if (this.linha.some((item) => item?.id === jogador?.id)) return false;
        if (this.banco.some((item) => item?.id === jogador?.id)) return false;
        this.banco.push(jogador);
        return true;
    }

    removerJogadorLinha(jogador) {
        this.linha = this.linha.filter((item) => item?.id !== jogador?.id);
        return true;
    }

    removerJogadorBanco(jogador) {
        this.banco = this.banco.filter((item) => item?.id !== jogador?.id);
        return true;
    }

    realizarSubstituicao(jogadorSai, jogadorEntra) {
        const indexLinha = this.linha.findIndex((item) => item?.id === jogadorSai?.id);
        const indexBanco = this.banco.findIndex((item) => item?.id === jogadorEntra?.id);

        if (indexLinha > -1 && indexBanco > -1) {
            const [saindo] = this.linha.splice(indexLinha, 1);
            const [entrando] = this.banco.splice(indexBanco, 1);
            this.linha.push(entrando);
            this.banco.push(saindo);
            return true;
        }

        return false;
    }

    jogadorNaLinha(jogador) {
        return this.linha.some((item) => Number(item?.id) === Number(jogador?.id));
    }

    carregarDoDb(db) {
        const timeId = this.time?.id ?? this.time;
        const partidaId = this.partida?.id ?? this.partida;

        const rows = db.prepare(`
            SELECT tp.Jogadores_id AS id, tp.linha, j.nome, j.numCamisa
            FROM TimesPartida tp
            JOIN Jogadores j ON j.id = tp.Jogadores_id
            WHERE tp.Times_id = ? AND tp.Partida_id = ?
        `).all(timeId, partidaId);

        this.linha = [];
        this.banco = [];
        for (const row of rows) {
            const jogador = { id: row.id, nome: row.nome, numCamisa: row.numCamisa };
            row.linha === 1 ? this.linha.push(jogador) : this.banco.push(jogador);
        }
    }

    static validarEscalacao({ timesId, partidaId, jogadores = [] }) {
        if (!timesId || !partidaId) {
            throw new Error('Times_id e Partida_id são obrigatórios para salvar a escalação.');
        }

        if (!Array.isArray(jogadores)) {
            throw new Error('Jogo de jogadores inválido. Deve ser um array.');
        }

        if (jogadores.length > 14) {
            throw new Error('Máximo de 14 jogadores na escalação.');
        }

        const linhaCount = jogadores.filter((item) => Number(item.linha) === 1).length;
        const bancoCount = jogadores.filter((item) => Number(item.linha) === 0).length;

        if (linhaCount > 6) {
            throw new Error('Máximo de 6 jogadores em linha.');
        }

        if (bancoCount > 8) {
            throw new Error('Máximo de 8 jogadores no banco.');
        }
    }

    static salvarEscalacao({ timesId, partidaId, jogadores = [] }, db) {
        TimesPartida.validarEscalacao({ timesId, partidaId, jogadores });

        const deleteStmt = db.prepare('DELETE FROM TimesPartida WHERE Times_id = ? AND Partida_id = ?');
        const insertStmt = db.prepare(
            'INSERT OR REPLACE INTO TimesPartida (Times_id, Partida_id, Jogadores_id, linha) VALUES (?, ?, ?, ?)'
        );

        deleteStmt.run(timesId, partidaId);
        jogadores.forEach((player) => {
            insertStmt.run(timesId, partidaId, Number(player.jogadorId), Number(player.linha));
        });
    }

    static findEscalacaoByPartidaId(partidaId, timesId = null, db) {
        if (!partidaId) {
            return [];
        }

        const sql = `
            SELECT
                tp.Jogadores_id AS id,
                COALESCE(j.numCamisa, j.id) AS numero,
                j.nome AS nome,
                j.posicao_id AS posicao_id,
                tp.linha AS linha
            FROM TimesPartida tp
            JOIN Jogadores j ON j.id = tp.Jogadores_id
            WHERE tp.Partida_id = ?
            ${timesId ? 'AND tp.Times_id = ?' : ''}
            ORDER BY tp.linha DESC, j.numCamisa ASC, j.nome ASC
        `;

        const rows = timesId
            ? db.prepare(sql).all(partidaId, timesId)
            : db.prepare(sql).all(partidaId);

        return rows.map((row) => ({
            id: row.id,
            numero: String(row.numero).padStart(2, '0'),
            nome: row.nome || `Jogador ${row.id}`,
            posicao: row.posicao_id ? `Posição ${row.posicao_id}` : 'Sem posição',
            linha: Number(row.linha),
        }));
    }
}

module.exports = TimesPartida;
