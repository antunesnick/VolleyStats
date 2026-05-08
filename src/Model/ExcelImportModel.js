const removerAcentos = (texto) => {
    if (!texto) return '';
    return texto.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
};

class ExcelImportModel {
    static encontrarValor(row, chaveParcial) {
        const chave = Object.keys(row).find((item) => removerAcentos(item).includes(chaveParcial));
        return chave ? row[chave] : undefined;
    }

    static salvarDados(dadosPlanilha, db) {
        const jogadoresDB = db.prepare('SELECT id, nome FROM Jogadores').all();
        const mapaJogadores = {};
        for (const jogador of jogadoresDB) {
            mapaJogadores[removerAcentos(jogador.nome)] = jogador.id;
        }

        const mapaPosicoesDB = {};
        try {
            const posicoesDB = db.prepare('SELECT id, nome FROM Posicoes').all();
            for (const posicao of posicoesDB) {
                mapaPosicoesDB[removerAcentos(posicao.nome)] = posicao.id;
            }
        } catch (e) {
            console.warn('Aviso: Falha ao carregar a tabela Posicoes.', e.message);
        }

        const insertJogador = db.prepare('INSERT INTO Jogadores (nome, numCamisa, posicao_id) VALUES (?, ?, ?)');
        const insertAcao = db.prepare(`
            INSERT INTO Acao (Jogador_id, idTipoAcao, Qualidade, Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id, Ponto_NumSet)
            VALUES (?, ?, ?, NULL, NULL, NULL, NULL)
        `);

        let jogadoresAtualizados = 0;
        let acoesInseridas = 0;

        for (const row of dadosPlanilha) {
            const nome = row.Nome;
            const camisa = row.Camisa !== '-' ? row.Camisa : null;
            const posicaoPlanilha = row.Posicao;

            if (!nome) continue;

            const nomeNorm = removerAcentos(nome);
            let jogadorId = mapaJogadores[nomeNorm];

            if (!jogadorId) {
                let posicaoId = 1;

                if (posicaoPlanilha) {
                    const posNorm = removerAcentos(posicaoPlanilha);

                    if (mapaPosicoesDB[posNorm]) {
                        posicaoId = mapaPosicoesDB[posNorm];
                    } else {
                        for (const [nomePosDB, idPosDB] of Object.entries(mapaPosicoesDB)) {
                            if (
                                nomePosDB.includes(posNorm)
                                || posNorm.includes(nomePosDB)
                                || (posNorm.startsWith('pont') && nomePosDB === 'ponteiro')
                                || (posNorm.startsWith('lib') && nomePosDB === 'libero')
                                || (posNorm === 'central' && nomePosDB === 'meio')
                            ) {
                                posicaoId = idPosDB;
                                break;
                            }
                        }
                    }
                }

                const info = insertJogador.run(nome, camisa, posicaoId);
                jogadorId = info.lastInsertRowid;
                mapaJogadores[nomeNorm] = jogadorId;
            }

            const inserirAcoesEmMassa = (quantidade, tipoAcaoId, qualidade) => {
                const qtd = parseInt(quantidade) || 0;
                for (let i = 0; i < qtd; i++) {
                    insertAcao.run(jogadorId, tipoAcaoId, qualidade);
                    acoesInseridas++;
                }
            };

            inserirAcoesEmMassa(row['Saque (Pts)'], 1, 'A');
            inserirAcoesEmMassa(row['Ataque (Pts)'], 2, 'A');
            inserirAcoesEmMassa(row['Bloqueio (Pts)'], 3, 'A');
            inserirAcoesEmMassa(ExcelImportModel.encontrarValor(row, 'recep'), 4, 'B');

            jogadoresAtualizados++;
        }

        return { jogadoresAtualizados, acoesInseridas };
    }
}

export default ExcelImportModel;
