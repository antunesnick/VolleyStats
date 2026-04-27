const db = require('../db/db');
const SubstituicaoModel = require('../Model/SubstituicaoModel');

/**
 * Controle para gerenciar substituições de atletas em partidas
 * Segue as regras oficiais de voleibol
 */
class SubstituicaoControl {
    isLibero(jogadorId) {
        const stmt = db.prepare(`
            SELECT p.nome AS posicaoNome
            FROM Jogadores j
            LEFT JOIN Posicoes p ON j.posicao_id = p.id
            WHERE j.id = ?
        `);
        const row = stmt.get(jogadorId);
        return row?.posicaoNome === 'Líbero';
    }

    async registrarSubstituicao(data) {
        try {
            if (data.pontoTime1 === undefined || data.pontoTime2 === undefined) {
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

            const substituicaoModel = new SubstituicaoModel();
            const jogadorEntra = db.prepare('SELECT id FROM Jogadores WHERE id = ?').get(data.jogadorEntra);
            const jogadorSai = db.prepare('SELECT id FROM Jogadores WHERE id = ?').get(data.jogadorSai);

            if (!jogadorEntra || !jogadorSai) {
                throw new Error('Um ou ambos os jogadores não foram encontrados');
            }

            const entradaEhLibero = this.isLibero(data.jogadorEntra);
            const saidaEhLibero = this.isLibero(data.jogadorSai);

            if (entradaEhLibero && saidaEhLibero) {
                throw new Error('Substituição inválida: líbero não pode trocar com líbero.');
            }

            if (!entradaEhLibero && !saidaEhLibero) {
                const normalCount = substituicaoModel.countNormalSubstitutionsInSet(
                    data.partidaId,
                    data.pontoTime1,
                    data.pontoTime2,
                    db
                );

                if (normalCount >= 6) {
                    return {
                        success: false,
                        message: 'Limite de 6 substituições por set atingido. Não é possível realizar mais substituições neste set.',
                        code: 'LIMIT_EXCEEDED'
                    };
                }
            }

            const history = substituicaoModel.findSubstitutionsInSet(
                data.partidaId,
                data.pontoTime1,
                data.pontoTime2,
                db
            );

            if (!entradaEhLibero && !saidaEhLibero) {
                const reservePairs = new Map();
                const starterPairs = new Map();

                history.forEach((sub) => {
                    if (!sub.JogadorEntra || !sub.JogadorSai) return;
                    if (!reservePairs.has(sub.JogadorEntra)) {
                        reservePairs.set(sub.JogadorEntra, sub.JogadorSai);
                    }
                    if (!starterPairs.has(sub.JogadorSai)) {
                        starterPairs.set(sub.JogadorSai, sub.JogadorEntra);
                    }
                });

                const existingReserveTarget = reservePairs.get(data.jogadorEntra);
                if (existingReserveTarget && existingReserveTarget !== data.jogadorSai) {
                    return {
                        success: false,
                        message: 'Reserva só pode entrar no lugar do jogador específico com quem iniciou a substituição.',
                        code: 'PAIRING_VIOLATION'
                    };
                }

                const existingStarterTarget = starterPairs.get(data.jogadorSai);
                if (existingStarterTarget && existingStarterTarget !== data.jogadorEntra) {
                    return {
                        success: false,
                        message: 'O titular só pode voltar ao lugar do jogador que o substituiu.',
                        code: 'PAIRING_VIOLATION'
                    };
                }

                const saindoHistorico = history.filter((sub) => sub.JogadorSai === data.jogadorSai).length;
                const retornandoHistorico = history.filter((sub) => sub.JogadorEntra === data.jogadorSai).length;

                if (saindoHistorico >= 1 && retornandoHistorico >= 1) {
                    return {
                        success: false,
                        message: 'O jogador titular já saiu e voltou uma vez neste set. Não é possível substituí-lo novamente.',
                        code: 'RETURN_LIMIT_EXCEEDED'
                    };
                }
            }

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
            if (data.pontoTime1 === undefined || data.pontoTime2 === undefined) {
                return {
                    success: false,
                    message: 'Pontuação dos times não definida',
                    permissaoSubstituir: false,
                    validacoes: {
                        limiteSuperado: false,
                        totalAtual: 0,
                        jogadoresValidos: false,
                        mensagens: ['Pontuação dos times não definida']
                    }
                };
            }

            if (!data.partidaId) {
                return {
                    success: false,
                    message: 'ID da partida não fornecido',
                    permissaoSubstituir: false,
                    validacoes: {
                        limiteSuperado: false,
                        totalAtual: 0,
                        jogadoresValidos: false,
                        mensagens: ['ID da partida não fornecido']
                    }
                };
            }

            if (!data.jogadorEntra || !data.jogadorSai) {
                return {
                    success: false,
                    message: 'Jogadores não definidos',
                    permissaoSubstituir: false,
                    validacoes: {
                        limiteSuperado: false,
                        totalAtual: 0,
                        jogadoresValidos: false,
                        mensagens: ['Jogadores não definidos']
                    }
                };
            }

            const substituicaoModel = new SubstituicaoModel();
            const playerStmt = db.prepare('SELECT id FROM Jogadores WHERE id = ?');
            const jogadorEntra = playerStmt.get(data.jogadorEntra);
            const jogadorSai = playerStmt.get(data.jogadorSai);

            const validacoes = {
                limiteSuperado: false,
                totalAtual: 0,
                jogadoresValidos: false,
                mensagens: []
            };

            if (jogadorEntra && jogadorSai) {
                validacoes.jogadoresValidos = true;
            } else {
                validacoes.mensagens.push('Um ou ambos os jogadores não foram encontrados');
            }

            if (data.jogadorEntra === data.jogadorSai) {
                validacoes.mensagens.push('Jogadores não podem ser iguais');
            }

            const entradaEhLibero = this.isLibero(data.jogadorEntra);
            const saidaEhLibero = this.isLibero(data.jogadorSai);

            if (entradaEhLibero && saidaEhLibero) {
                validacoes.mensagens.push('Substituição inválida: líbero não pode substituir líbero.');
            }

            if (!entradaEhLibero && !saidaEhLibero) {
                const normalCount = substituicaoModel.countNormalSubstitutionsInSet(
                    data.partidaId,
                    data.pontoTime1,
                    data.pontoTime2,
                    db
                );

                validacoes.totalAtual = normalCount;
                validacoes.limiteSuperado = normalCount >= 6;

                if (validacoes.limiteSuperado) {
                    validacoes.mensagens.push(`Limite de 6 substituições atingido (${normalCount} realizada(s))`);
                }

                const history = substituicaoModel.findSubstitutionsInSet(
                    data.partidaId,
                    data.pontoTime1,
                    data.pontoTime2,
                    db
                );

                const reservePairs = new Map();
                const starterPairs = new Map();

                history.forEach((sub) => {
                    if (!sub.JogadorEntra || !sub.JogadorSai) return;
                    if (!reservePairs.has(sub.JogadorEntra)) {
                        reservePairs.set(sub.JogadorEntra, sub.JogadorSai);
                    }
                    if (!starterPairs.has(sub.JogadorSai)) {
                        starterPairs.set(sub.JogadorSai, sub.JogadorEntra);
                    }
                });

                const existingReserveTarget = reservePairs.get(data.jogadorEntra);
                if (existingReserveTarget && existingReserveTarget !== data.jogadorSai) {
                    validacoes.mensagens.push('Reserva só pode entrar no lugar do jogador específico com quem iniciou a substituição.');
                }

                const existingStarterTarget = starterPairs.get(data.jogadorSai);
                if (existingStarterTarget && existingStarterTarget !== data.jogadorEntra) {
                    validacoes.mensagens.push('O titular só pode voltar ao lugar do jogador que o substituiu.');
                }

                const saindoHistorico = history.filter((sub) => sub.JogadorSai === data.jogadorSai).length;
                const retornandoHistorico = history.filter((sub) => sub.JogadorEntra === data.jogadorSai).length;
                if (saindoHistorico >= 1 && retornandoHistorico >= 1) {
                    validacoes.mensagens.push('O jogador titular já saiu e voltou uma vez neste set. Não é possível substituí-lo novamente.');
                }
            }

            const success = validacoes.mensagens.length === 0 && validacoes.jogadoresValidos;
            return {
                success,
                validacoes,
                permissaoSubstituir: success && !validacoes.limiteSuperado
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
