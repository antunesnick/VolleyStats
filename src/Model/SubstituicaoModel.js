/**
 * Model para Substituição de Atletas em Partidas
 * Segue as regras oficiais de voleibol:
 * - Máximo 6 substituições por set
 * - Um jogador substituto pode entrar várias vezes
 * - Sempre há 6 jogadores em campo
 */
class SubstituicaoModel {
    constructor(id = null, pontoTime1 = null, pontoTime2 = null, partidaId = null, jogadorEntra = null, jogadorSai = null) {
        this.id = id;
        this.pontoTime1 = pontoTime1;
        this.pontoTime2 = pontoTime2;
        this.partidaId = partidaId;
        this.jogadorEntra = jogadorEntra;  // ID do jogador que entra
        this.jogadorSai = jogadorSai;      // ID do jogador que sai
    }

    /**
     * Insere uma nova substituição no banco de dados
     * @param {SubstituicaoModel} substituicao
     * @param {Database} db
     * @returns {Object} Resultado da inserção
     */
    insert(substituicao, db) {
        try {
            const stmt = db.prepare(`
                INSERT INTO Substituicao (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id, JogadorEntra, JogadorSai)
                VALUES (?, ?, ?, ?, ?)
            `);

            const result = stmt.run(
                substituicao.pontoTime1,
                substituicao.pontoTime2,
                substituicao.partidaId,
                substituicao.jogadorEntra,
                substituicao.jogadorSai
            );

            return {
                id: result.lastInsertRowid,
                message: 'Substituição registrada com sucesso',
                success: true
            };
        } catch (error) {
            console.error('Erro ao inserir substituição:', error);
            throw error;
        }
    }

    /**
     * Busca todas as substituições de uma partida
     * @param {number} partidaId
     * @param {Database} db
     * @returns {Array} Lista de substituições
     */
    findByPartida(partidaId, db) {
        try {
            const stmt = db.prepare(`
                SELECT 
                    s.id,
                    s.Ponto_pontoTime1,
                    s.Ponto_pontoTime2,
                    s.Ponto_Partida_id,
                    s.JogadorEntra,
                    s.JogadorSai,
                    j_entra.nome as nomeJogadorEntra,
                    j_entra.numCamisa as camisaEntra,
                    j_sai.nome as nomeJogadorSai,
                    j_sai.numCamisa as camisaSai
                FROM Substituicao s
                LEFT JOIN Jogadores j_entra ON s.JogadorEntra = j_entra.id
                LEFT JOIN Jogadores j_sai ON s.JogadorSai = j_sai.id
                WHERE s.Ponto_Partida_id = ?
                ORDER BY s.Ponto_pontoTime1 DESC, s.Ponto_pontoTime2 DESC
            `);

            return stmt.all(partidaId);
        } catch (error) {
            console.error('Erro ao buscar substituições:', error);
            throw error;
        }
    }

    /**
     * Busca substituições de um time específico em uma partida
     * @param {number} partidaId
     * @param {number} timeId
     * @param {Database} db
     * @returns {Array} Lista de substituições do time
     */
    findByPartidaAndTime(partidaId, timeId, db) {
        try {
            const stmt = db.prepare(`
                SELECT 
                    s.id,
                    s.Ponto_pontoTime1,
                    s.Ponto_pontoTime2,
                    s.JogadorEntra,
                    s.JogadorSai,
                    j_entra.nome as nomeJogadorEntra,
                    j_entra.numCamisa as camisaEntra,
                    j_sai.nome as nomeJogadorSai,
                    j_sai.numCamisa as camisaSai
                FROM Substituicao s
                LEFT JOIN Jogadores j_entra ON s.JogadorEntra = j_entra.id
                LEFT JOIN Jogadores j_sai ON s.JogadorSai = j_sai.id
                LEFT JOIN JogadoresTimes jt_entra ON j_entra.id = jt_entra.Jogadores_id
                WHERE s.Ponto_Partida_id = ? AND jt_entra.Times_id = ?
                ORDER BY s.Ponto_pontoTime1 DESC, s.Ponto_pontoTime2 DESC
            `);

            return stmt.all(partidaId, timeId);
        } catch (error) {
            console.error('Erro ao buscar substituições do time:', error);
            throw error;
        }
    }

    /**
     * Busca uma substituição específica por ID
     * @param {number} id
     * @param {Database} db
     * @returns {Object} Dados da substituição
     */
    findById(id, db) {
        try {
            const stmt = db.prepare(`
                SELECT 
                    s.id,
                    s.Ponto_pontoTime1,
                    s.Ponto_pontoTime2,
                    s.Ponto_Partida_id,
                    s.JogadorEntra,
                    s.JogadorSai,
                    j_entra.nome as nomeJogadorEntra,
                    j_sai.nome as nomeJogadorSai
                FROM Substituicao s
                LEFT JOIN Jogadores j_entra ON s.JogadorEntra = j_entra.id
                LEFT JOIN Jogadores j_sai ON s.JogadorSai = j_sai.id
                WHERE s.id = ?
            `);

            return stmt.get(id);
        } catch (error) {
            console.error('Erro ao buscar substituição por ID:', error);
            throw error;
        }
    }

    /**
     * Deleta uma substituição
     * @param {number} id
     * @param {Database} db
     * @returns {Object} Resultado da exclusão
     */
    delete(id, db) {
        try {
            const stmt = db.prepare('DELETE FROM Substituicao WHERE id = ?');
            stmt.run(id);

            return {
                success: true,
                message: 'Substituição removida com sucesso'
            };
        } catch (error) {
            console.error('Erro ao deletar substituição:', error);
            throw error;
        }
    }

    /**
     * Conta o número de substituições em um determinado ponto
     * @param {number} pontoTime1
     * @param {number} pontoTime2
     * @param {number} partidaId
     * @param {Database} db
     * @returns {number} Quantidade de substituições
     */
    countByPonto(pontoTime1, pontoTime2, partidaId, db) {
        try {
            const stmt = db.prepare(`
                SELECT COUNT(*) as total FROM Substituicao
                WHERE Ponto_pontoTime1 = ? AND Ponto_pontoTime2 = ? AND Ponto_Partida_id = ?
            `);

            const result = stmt.get(pontoTime1, pontoTime2, partidaId);
            return result?.total || 0;
        } catch (error) {
            console.error('Erro ao contar substituições:', error);
            throw error;
        }
    }

    findByPlayer(partidaId, jogadorId, db) {
        try {
            const stmt = db.prepare(`
                SELECT s.*,
                    j_entra.posicao_id AS posicaoEntra,
                    j_sai.posicao_id AS posicaoSai
                FROM Substituicao s
                LEFT JOIN Jogadores j_entra ON s.JogadorEntra = j_entra.id
                LEFT JOIN Jogadores j_sai ON s.JogadorSai = j_sai.id
                WHERE s.Ponto_Partida_id = ? AND (s.JogadorEntra = ? OR s.JogadorSai = ?)
                ORDER BY s.Ponto_pontoTime1 ASC, s.Ponto_pontoTime2 ASC
            `);
            return stmt.all(partidaId, jogadorId, jogadorId);
        } catch (error) {
            console.error('Erro ao buscar substituições por jogador:', error);
            throw error;
        }
    }

    findSubstitutionsInSet(partidaId, pontoTime1, pontoTime2, db) {
        try {
            const stmt = db.prepare(`
                SELECT s.*,
                    j_entra.posicao_id AS posicaoEntra,
                    j_sai.posicao_id AS posicaoSai
                FROM Substituicao s
                LEFT JOIN Jogadores j_entra ON s.JogadorEntra = j_entra.id
                LEFT JOIN Jogadores j_sai ON s.JogadorSai = j_sai.id
                WHERE s.Ponto_Partida_id = ?
                  AND ((s.Ponto_pontoTime1 < ?)
                       OR (s.Ponto_pontoTime1 = ? AND s.Ponto_pontoTime2 <= ?)
                       OR (s.Ponto_pontoTime2 < ?)
                       OR (s.Ponto_pontoTime2 = ? AND s.Ponto_pontoTime1 <= ?))
                ORDER BY s.Ponto_pontoTime1 ASC, s.Ponto_pontoTime2 ASC
            `);
            return stmt.all(partidaId, pontoTime1, pontoTime2, pontoTime1, pontoTime2, pontoTime1, pontoTime2);
        } catch (error) {
            console.error('Erro ao buscar substituições do set:', error);
            throw error;
        }
    }

    countNormalSubstitutionsInSet(partidaId, pontoTime1, pontoTime2, db) {
        try {
            const stmt = db.prepare(`
                SELECT COUNT(*) as total
                FROM Substituicao s
                LEFT JOIN Jogadores j_entra ON s.JogadorEntra = j_entra.id
                LEFT JOIN Jogadores j_sai ON s.JogadorSai = j_sai.id
                LEFT JOIN Posicoes p_entra ON j_entra.posicao_id = p_entra.id
                LEFT JOIN Posicoes p_sai ON j_sai.posicao_id = p_sai.id
                WHERE s.Ponto_Partida_id = ?
                  AND ((s.Ponto_pontoTime1 < ?)
                       OR (s.Ponto_pontoTime1 = ? AND s.Ponto_pontoTime2 <= ?)
                       OR (s.Ponto_pontoTime2 < ?)
                       OR (s.Ponto_pontoTime2 = ? AND s.Ponto_pontoTime1 <= ?))
                  AND p_entra.nome != 'Líbero'
                  AND p_sai.nome != 'Líbero'
            `);
            const result = stmt.get(partidaId, pontoTime1, pontoTime2, pontoTime1, pontoTime2, pontoTime1, pontoTime2);
            return result?.total || 0;
        } catch (error) {
            console.error('Erro ao contar substituições normais do set:', error);
            throw error;
        }
    }

    /**
     * Conta o total de substituições até um determinado ponto (para respeitar limite de 6 por set)
     * @param {number} pontoTime1
     * @param {number} pontoTime2
     * @param {number} partidaId
     * @param {Database} db
     * @returns {number} Total de substituições no set
     */
    countTotalInSet(pontoTime1, pontoTime2, partidaId, db) {
        try {
            // Determinar qual é o ponto do set (cada set vai até 25 ou 26)
            const stmt = db.prepare(`
                SELECT COUNT(*) as total FROM Substituicao
                WHERE Ponto_Partida_id = ? 
                AND ((Ponto_pontoTime1 <= ? AND Ponto_pontoTime2 <= ?) OR 
                     (Ponto_pontoTime1 <= ? OR Ponto_pontoTime2 <= ?))
            `);

            const result = stmt.get(partidaId, pontoTime1, pontoTime2, pontoTime1, pontoTime2);
            return result?.total || 0;
        } catch (error) {
            console.error('Erro ao contar substituições do set:', error);
            throw error;
        }
    }
}

module.exports = SubstituicaoModel;
