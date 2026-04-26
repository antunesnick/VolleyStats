const db = require('../db/db');
const SubstituicaoModel = require('../Model/SubstituicaoModel');

/**
 * Controle para gerenciar substituições de atletas em partidas
 * Segue as regras oficiais de voleibol
 */
class SubstituicaoControl {
    
    /**
     * Registra uma substituição de jogador
     * Validações aplicadas:
     * - Máximo 6 substituições por set
     * - Jogador que entra deve ser válido
     * - Jogador que sai deve estar em campo
     * 
     * @param {Object} data
     * @param {number} data.pontoTime1 - Pontuação do time 1 no ponto
     * @param {number} data.pontoTime2 - Pontuação do time 2 no ponto
     * @param {number} data.partidaId - ID da partida
     * @param {number} data.jogadorEntra - ID do jogador que entra
     * @param {number} data.jogadorSai - ID do jogador que sai
     * @returns {Promise<Object>} Resultado da substituição
     */
    async registrarSubstituicao(data) {
        try {
            // Validações de entrada
            if (!data.pontoTime1 !== undefined || !data.pontoTime2 !== undefined) {
                throw new Error('Pontuação dos times não definida');
            }
            if (!data.partidaId) {
                throw new Error('ID da partida não fornecido');
            }
            if (!data.jogadorEntra || !data.jogadorSai) {
                throw new Error('Jogadores não definidos');
            }
            if (data.jogadorEntra === data.jogadorSai) {
                throw new Error('Jogadores não podem ser iguais');
            }

            // Validar limite de substituições por set
            const substituicaoModel = new SubstituicaoModel();
            const totalNoSet = substituicaoModel.countTotalInSet(
                data.pontoTime1,
                data.pontoTime2,
                data.partidaId,
                db
            );

            if (totalNoSet >= 6) {
                return {
                    success: false,
                    message: 'Limite de 6 substituições por set atingido. Não é possível realizar mais substituições neste set.',
                    code: 'LIMIT_EXCEEDED'
                };
            }

            // Validar se jogadores existem
            const playerStmt = db.prepare('SELECT id FROM Jogadores WHERE id = ?');
            const jogadorEntra = playerStmt.get(data.jogadorEntra);
            const jogadorSai = playerStmt.get(data.jogadorSai);

            if (!jogadorEntra || !jogadorSai) {
                throw new Error('Um ou ambos os jogadores não foram encontrados');
            }

            // Criar transação para garantir consistência
            const substituicaoTransaction = db.transaction((substituicaoData) => {
                const substituicao = new SubstituicaoModel(
                    null,
                    substituicaoData.pontoTime1,
                    substituicaoData.pontoTime2,
                    substituicaoData.partidaId,
                    substituicaoData.jogadorEntra,
                    substituicaoData.jogadorSai
                );

                return substituicao.insert(substituicao, db);
            });

            const result = substituicaoTransaction(data);

            return {
                success: true,
                message: 'Substituição registrada com sucesso',
                substituicaoId: result.id,
                data: {
                    jogadorEntra: data.jogadorEntra,
                    jogadorSai: data.jogadorSai,
                    pontoTime1: data.pontoTime1,
                    pontoTime2: data.pontoTime2
                }
            };

        } catch (error) {
            console.error('Erro ao registrar substituição:', error);
            return {
                success: false,
                message: error.message,
                code: 'INTERNAL_ERROR'
            };
        }
    }

    /**
     * Busca o histórico de substituições de uma partida
     * @param {number} partidaId
     * @returns {Promise<Array>} Histórico de substituições
     */
    async obterHistoricoSubstituicoes(partidaId) {
        try {
            if (!partidaId) {
                throw new Error('ID da partida não fornecido');
            }

            const substituicaoModel = new SubstituicaoModel();
            const substituicoes = substituicaoModel.findByPartida(partidaId, db);

            return {
                success: true,
                total: substituicoes.length,
                data: substituicoes
            };

        } catch (error) {
            console.error('Erro ao obter histórico:', error);
            return {
                success: false,
                message: error.message,
                code: 'INTERNAL_ERROR'
            };
        }
    }

    /**
     * Busca substituições de um time específico em uma partida
     * @param {number} partidaId
     * @param {number} timeId
     * @returns {Promise<Object>} Substituições do time
     */
    async obterSubstituicoesDoTime(partidaId, timeId) {
        try {
            if (!partidaId || !timeId) {
                throw new Error('ID da partida ou time não fornecido');
            }

            const substituicaoModel = new SubstituicaoModel();
            const substituicoes = substituicaoModel.findByPartidaAndTime(partidaId, timeId, db);

            return {
                success: true,
                total: substituicoes.length,
                data: substituicoes
            };

        } catch (error) {
            console.error('Erro ao obter substituições do time:', error);
            return {
                success: false,
                message: error.message,
                code: 'INTERNAL_ERROR'
            };
        }
    }

    /**
     * Valida se uma substituição pode ser realizada
     * @param {Object} data
     * @returns {Promise<Object>} Validação com detalhes
     */
    async validarSubstituicao(data) {
        try {
            const substituicaoModel = new SubstituicaoModel();

            // Validação 1: Limite de substituições
            const totalNoSet = substituicaoModel.countTotalInSet(
                data.pontoTime1,
                data.pontoTime2,
                data.partidaId,
                db
            );

            const validacoes = {
                limiteSuperado: totalNoSet >= 6,
                totalAtual: totalNoSet,
                jogadoresValidos: false,
                mensagens: []
            };

            // Validação 2: Existência dos jogadores
            const playerStmt = db.prepare('SELECT id, nome FROM Jogadores WHERE id = ?');
            const jogadorEntra = playerStmt.get(data.jogadorEntra);
            const jogadorSai = playerStmt.get(data.jogadorSai);

            if (jogadorEntra && jogadorSai) {
                validacoes.jogadoresValidos = true;
            } else {
                validacoes.mensagens.push('Um ou ambos os jogadores não foram encontrados');
            }

            // Validação 3: Jogadores diferentes
            if (data.jogadorEntra === data.jogadorSai) {
                validacoes.mensagens.push('Jogadores não podem ser iguais');
            }

            // Resumo
            if (validacoes.limiteSuperado) {
                validacoes.mensagens.push(`Limite de 6 substituições atingido (${totalNoSet} realizada(s))`);
            }

            return {
                success: validacoes.mensagens.length === 0,
                validacoes: validacoes,
                permissaoSubstituir: !validacoes.limiteSuperado && validacoes.jogadoresValidos
            };

        } catch (error) {
            console.error('Erro ao validar substituição:', error);
            return {
                success: false,
                message: error.message,
                permissaoSubstituir: false
            };
        }
    }

    /**
     * Remove uma substituição do registro (para desfazer)
     * @param {number} substituicaoId
     * @returns {Promise<Object>} Resultado da remoção
     */
    async removerSubstituicao(substituicaoId) {
        try {
            if (!substituicaoId) {
                throw new Error('ID da substituição não fornecido');
            }

            const deleteTransaction = db.transaction((id) => {
                const substituicaoModel = new SubstituicaoModel();
                return substituicaoModel.delete(id, db);
            });

            const result = deleteTransaction(substituicaoId);
            return {
                success: true,
                message: 'Substituição removida com sucesso',
                ...result
            };

        } catch (error) {
            console.error('Erro ao remover substituição:', error);
            return {
                success: false,
                message: error.message,
                code: 'INTERNAL_ERROR'
            };
        }
    }

    /**
     * Obtém estatísticas de substituições de uma partida
     * @param {number} partidaId
     * @returns {Promise<Object>} Estatísticas
     */
    async obterEstatisticasSubstituicoes(partidaId) {
        try {
            if (!partidaId) {
                throw new Error('ID da partida não fornecido');
            }

            const substituicaoModel = new SubstituicaoModel();
            const substituicoes = substituicaoModel.findByPartida(partidaId, db);

            // Contar por jogador
            const porJogador = {};
            substituicoes.forEach(sub => {
                if (!porJogador[sub.JogadorEntra]) {
                    porJogador[sub.JogadorEntra] = { entrou: 0, saiu: 0, nome: sub.nomeJogadorEntra };
                }
                if (!porJogador[sub.JogadorSai]) {
                    porJogador[sub.JogadorSai] = { entrou: 0, saiu: 0, nome: sub.nomeJogadorSai };
                }
                porJogador[sub.JogadorEntra].entrou++;
                porJogador[sub.JogadorSai].saiu++;
            });

            return {
                success: true,
                totalSubstituicoes: substituicoes.length,
                porJogador: porJogador,
                detalhes: substituicoes
            };

        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            return {
                success: false,
                message: error.message,
                code: 'INTERNAL_ERROR'
            };
        }
    }
}

module.exports = SubstituicaoControl;
