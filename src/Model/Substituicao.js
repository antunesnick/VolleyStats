import Evento from './Evento';
import db from '../db/db';
import Player from './Player';

const MAX_SUBSTITUICOES_POR_SET = 6;

class Substituicao extends Evento {
    /**
     * @param {Ponto}  ponto        - Objeto Ponto (contem .pontoTime1, .pontoTime2, .set.numSet, .set.partida.id)
     * @param {object} jogadorEntra - Objeto Jogador que entra (deve conter .id)
     * @param {object} jogadorSai   - Objeto Jogador que sai (deve conter .id)
     */
    constructor(ponto, jogadorEntra, jogadorSai) {
        super(ponto);
        this.jogadorEntra = jogadorEntra;
        this.jogadorSai = jogadorSai;
    }

    criarSubstituicao(database = db) {
        try {
            // FK completa: (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id)
            const sql = database.prepare(
                `INSERT INTO Substituicao 
                (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id, JogadorEntra, JogadorSai) 
                VALUES (?, ?, ?, ?, ?, ?)`
            );
            const info = sql.run(
                this.ponto.pontoTime1,
                this.ponto.pontoTime2,
                this.ponto.set.numSet,
                this.ponto.set.partida.id,
                this.jogadorEntra.id,
                this.jogadorSai.id
            );
            this.id = info.lastInsertRowid;
            return this.id;
        } catch (e) {
            throw e;
        }
    }

    static buscarSubstituicoesDoSet(partidaId, numSet) {
        if (!partidaId || !numSet) {
            return [];
        }

        return db.prepare(`
            SELECT
                s.id,
                s.Ponto_pontoTime1 AS pontoTime1,
                s.Ponto_pontoTime2 AS pontoTime2,
                s.Ponto_NumSet AS numSet,
                s.JogadorEntra,
                s.JogadorSai,
                jogadorEntra.nome AS jogadorEntraNome,
                jogadorEntra.numCamisa AS jogadorEntraNumero,
                jogadorSai.nome AS jogadorSaiNome,
                jogadorSai.numCamisa AS jogadorSaiNumero
            FROM Substituicao s
            LEFT JOIN Jogadores jogadorEntra ON jogadorEntra.id = s.JogadorEntra
            LEFT JOIN Jogadores jogadorSai ON jogadorSai.id = s.JogadorSai
            WHERE s.Ponto_Partida_id = ? AND s.Ponto_NumSet = ?
            ORDER BY s.id ASC
        `).all(Number(partidaId), Number(numSet));
    }

    static isLibero(jogadorId) {
        const jogador = Player.buscarJogador(jogadorId);
        const posicao = String(jogador?.posicaoNome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

        return posicao.includes('libero');
    }

    static montarParesNormais(substituicoes) {
        const pares = [];

        substituicoes
            .filter((item) => !Substituicao.isLibero(item.JogadorEntra) && !Substituicao.isLibero(item.JogadorSai))
            .forEach((item) => {
                const jogadorEntra = Number(item.JogadorEntra);
                const jogadorSai = Number(item.JogadorSai);
                const par = pares.find((current) => (
                    (current.titular === jogadorSai && current.reserva === jogadorEntra)
                    || (current.titular === jogadorEntra && current.reserva === jogadorSai)
                ));

                if (par) {
                    par.movimentos.push({ jogadorEntra, jogadorSai });
                    return;
                }

                pares.push({
                    titular: jogadorSai,
                    reserva: jogadorEntra,
                    movimentos: [{ jogadorEntra, jogadorSai }],
                });
            });

        return pares;
    }

    static validarParSubstituicao({ jogadorEntra, jogadorSai, pares }) {
        const entra = Number(jogadorEntra);
        const sai = Number(jogadorSai);
        const parDoEntra = pares.find((par) => par.titular === entra || par.reserva === entra);
        const parDoSai = pares.find((par) => par.titular === sai || par.reserva === sai);

        if (!parDoEntra && !parDoSai) {
            return null;
        }

        if (!parDoEntra || !parDoSai || parDoEntra !== parDoSai) {
            return 'SubstituiÃ§Ã£o irregular: o reserva sÃ³ pode sair para o mesmo titular que ele substituiu.';
        }

        const par = parDoSai;
        const titularSaindo = par.titular === sai && par.reserva === entra;
        const titularVoltando = par.reserva === sai && par.titular === entra;

        if (!titularSaindo && !titularVoltando) {
            return 'SubstituiÃ§Ã£o irregular: este par de jogadores nÃ£o respeita a ordem da troca original.';
        }

        if (titularSaindo) {
            return 'SubstituiÃ§Ã£o irregular: o titular jÃ¡ saiu neste set e sÃ³ poderia voltar no lugar do mesmo reserva.';
        }

        if (titularVoltando && par.movimentos.length >= 2) {
            return 'SubstituiÃ§Ã£o irregular: o titular jÃ¡ voltou uma vez neste set.';
        }

        return null;
    }

    static validarSubstituicao({ partidaId, jogadorEntra, jogadorSai, numSet = 1 }) {
        const mensagens = [];

        if (!partidaId) {
            mensagens.push('Partida nÃ£o identificada.');
        }

        if (!jogadorEntra || !jogadorSai) {
            mensagens.push('Selecione o jogador que entra e o jogador que sai.');
        }

        if (Number(jogadorEntra) === Number(jogadorSai)) {
            mensagens.push('O jogador que entra deve ser diferente do jogador que sai.');
        }

        if (mensagens.length > 0) {
            return {
                permissaoSubstituir: false,
                validacoes: { mensagens },
            };
        }

        const substituicoes = Substituicao.buscarSubstituicoesDoSet(partidaId, numSet);
        const isTrocaLibero = Substituicao.isLibero(jogadorEntra) || Substituicao.isLibero(jogadorSai);

        if (!isTrocaLibero) {
            const substituicoesNormais = substituicoes.filter((item) => (
                !Substituicao.isLibero(item.JogadorEntra) && !Substituicao.isLibero(item.JogadorSai)
            ));

            if (substituicoesNormais.length >= MAX_SUBSTITUICOES_POR_SET) {
                mensagens.push(`Limite de ${MAX_SUBSTITUICOES_POR_SET} substituiÃ§Ãµes por set atingido.`);
            }

            const pares = Substituicao.montarParesNormais(substituicoes);
            const erroPar = Substituicao.validarParSubstituicao({ jogadorEntra, jogadorSai, pares });

            if (erroPar) {
                mensagens.push(erroPar);
            }
        }

        return {
            permissaoSubstituir: mensagens.length === 0,
            validacoes: { mensagens },
        };
    }

    static registrarSubstituicao({ pontoTime1 = 0, pontoTime2 = 0, partidaId, jogadorEntra, jogadorSai, numSet = 1 }, database = db) {
        const validacao = Substituicao.validarSubstituicao({ partidaId, jogadorEntra, jogadorSai, numSet });

        if (!validacao.permissaoSubstituir) {
            return {
                success: false,
                message: validacao.validacoes.mensagens[0],
            };
        }

        database.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)')
            .run(Number(numSet), Number(partidaId));

        database.prepare(`
            INSERT OR IGNORE INTO Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id)
            VALUES (?, ?, ?, ?)
        `).run(Number(pontoTime1), Number(pontoTime2), Number(numSet), Number(partidaId));

        const info = database.prepare(`
            INSERT INTO Substituicao (
                Ponto_pontoTime1,
                Ponto_pontoTime2,
                Ponto_NumSet,
                Ponto_Partida_id,
                JogadorEntra,
                JogadorSai
            ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
            Number(pontoTime1),
            Number(pontoTime2),
            Number(numSet),
            Number(partidaId),
            Number(jogadorEntra),
            Number(jogadorSai),
        );

        return {
            success: true,
            id: info.lastInsertRowid,
        };
    }
}

export default Substituicao;
