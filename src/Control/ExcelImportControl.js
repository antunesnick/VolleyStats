import { dialog } from 'electron';
const xlsx = require('xlsx');
const fs = require('fs');
import db from '../db/db';

class ExcelImportControl {
    static #instance;

    static getInstance() {    
        if (!ExcelImportControl.#instance) {
            ExcelImportControl.#instance = new ExcelImportControl();
        }   
        return ExcelImportControl.#instance;
    }

    async importarExcel() {
        const { canceled, filePaths } = await dialog.showOpenDialog({
            title: 'Selecione a folha de estatísticas',
            properties: ['openFile'],
            filters: [
                { name: 'Folhas Excel', extensions: ['xlsx', 'xls', 'csv'] }
            ]
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, message: 'Importação cancelada.' };
        }

        try {
            const filePath = filePaths[0];
            
            const fileBuffer = fs.readFileSync(filePath);
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
            
            let sheetName = workbook.SheetNames.find(nome => nome.toLowerCase().includes('temporada'));
            if (!sheetName) {
                return { 
                    success: false, 
                    error: 'Não foi possível localizar a aba "Temporada". O sistema precisa dela para identificar o nome dos jogadores.' 
                };
            }
            
            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true });

            let linhaCabecalhoIndex = -1;
            let indiceVP = -1;

            // Radar Dinâmico Reforçado: Encontra a linha correta e o índice exato da coluna "V-P"
            for (let i = 0; i < rows.length; i++) {
                if (!rows[i]) continue;
                
                // Converte tudo para maiúsculas e limpa espaços para não falhar
                const textRow = rows[i].map(c => String(c).trim().toUpperCase());
                
                const vpIdx = textRow.indexOf('V-P');
                if (vpIdx !== -1 && textRow.includes('TOT')) {
                    linhaCabecalhoIndex = i;
                    indiceVP = vpIdx;
                    break;
                }
            }

            if (linhaCabecalhoIndex === -1 || indiceVP === -1) {
               return { 
                   success: false, 
                   error: 'Estrutura Incorreta: O cabeçalho com "Tot" e "V-P" não foi encontrado na aba Temporada.' 
               };
            }

            // ==========================================
            // Mapeamento Relativo (Imune a deslocamentos)
            // Calculamos a posição de cada estatística tendo o "V-P" como âncora zero
            // ==========================================
            const iCamisa       = indiceVP - 9;
            const iNome         = indiceVP - 8;
            const iPtsTotais    = indiceVP - 1;
            const iPtsSaque     = indiceVP + 3;
            const iPosRecep     = indiceVP + 6;
            const iPtsAtaque    = indiceVP + 11;
            const iPtsBloqueio  = indiceVP + 13;

            const dadosExtraidos = [];

            for (let i = linhaCabecalhoIndex + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;

                let camisa = row[iCamisa];
                let nome = row[iNome];

                // Segurança extra: Se o nome estiver vazio devido a alguma célula mesclada invulgar, procura nas casas ao lado
                if (!nome || String(nome).trim() === '') {
                    for(let col = iNome; col < iPtsTotais; col++) {
                        if (row[col] && String(row[col]).trim() !== '') {
                            nome = row[col];
                            camisa = row[col - 1]; // assume que a camisa está imediatamente antes
                            break;
                        }
                    }
                }

                const nomeStr = String(nome).trim();
                
                // Valida se capturou um nome real de jogador
                if (nomeStr !== '' && nomeStr.toLowerCase() !== 'nome' && nomeStr.toLowerCase() !== 'undefined' && nomeStr !== 'null') {
                    dadosExtraidos.push({
                        'Camisa': camisa || '-',
                        'Nome': nomeStr,
                        'Pontos Totais': row[iPtsTotais] || 0,
                        'Saque (Pts)': row[iPtsSaque] || 0,
                        'Recepção (Pos%)': row[iPosRecep] || 0,
                        'Ataque (Pts)': row[iPtsAtaque] || 0,
                        'Bloqueio (Pts)': row[iPtsBloqueio] || 0
                    });
                }
            }

            if (dadosExtraidos.length === 0) {
                return { success: false, error: `Nenhum jogador encontrado. Coluna Nome detetada no índice ${iNome}. Verifique se a folha não está protegida contra leitura.` };
            }

            const nomeDoArquivo = filePath.split('\\').pop().split('/').pop();

            return { success: true, data: dadosExtraidos, fileName: nomeDoArquivo };
        } catch (error) {
            console.error("Erro ao ler folha de cálculo:", error);
            return { success: false, error: 'Falha ao processar o ficheiro Excel.' };
        }
    }

 async salvarDados(dadosPlanilha) {
        if (!dadosPlanilha || dadosPlanilha.length === 0) {
            return { success: false, error: 'Nenhum dado válido para salvar.' };
        }
        try {
            // Utilizamos uma transaction para garantir que nada fique inconsistente caso dê erro no meio
            const saveTransaction = db.transaction((dados) => {
                const findJogador = db.prepare('SELECT id FROM Jogadores WHERE lower(nome) = lower(?)');
                // Atribui posição_id = 1 como padrão para evitar quebra de Foreign Key
                const insertJogador = db.prepare('INSERT INTO Jogadores (nome, numCamisa, posicao_id) VALUES (?, ?, 1)');
                
                // Prepara a inserção na tabela Acao com os campos Ponto como nulos
                const insertAcao = db.prepare(`
                    INSERT INTO Acao (Jogador_id, idTipoAcao, Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id, Ponto_NumSet) 
                    VALUES (?, ?, NULL, NULL, NULL, NULL)
                `);

                let jogadoresAtualizados = 0;
                let acoesInseridas = 0;

                for (const row of dados) {
                    const nome = row['Nome'];
                    const camisa = row['Camisa'] !== '-' ? row['Camisa'] : null;
                    
                    if (!nome) continue;

                    let jogador = findJogador.get(nome);
                    let jogadorId;

                    // Verifica se o jogador já existe, se não, cadastra
                    if (jogador) {
                        jogadorId = jogador.id;
                    } else {
                        const info = insertJogador.run(nome, camisa);
                        jogadorId = info.lastInsertRowid;
                    }

                    // Helper para inserir "X" linhas da mesma ação (para representar a estatística)
                    const inserirAcoesEmMassa = (quantidade, tipoAcaoId) => {
                        const qtd = parseInt(quantidade) || 0;
                        for (let i = 0; i < qtd; i++) {
                            insertAcao.run(jogadorId, tipoAcaoId);
                            acoesInseridas++;
                        }
                    };

                    // Tipos de ação mapeados do seu script: 
                    // 1: Saque, 2: Ataque, 3: Bloqueio, 4: Recepção
                    inserirAcoesEmMassa(row['Saque (Pts)'], 1);
                    inserirAcoesEmMassa(row['Ataque (Pts)'], 2);
                    inserirAcoesEmMassa(row['Bloqueio (Pts)'], 3);
                    inserirAcoesEmMassa(row['Recepção (Pos%)'], 4); // Lança o valor como número de ações positivas

                    jogadoresAtualizados++;
                }

                return { jogadoresAtualizados, acoesInseridas };
            });

            // Executa a transação
            const resultado = saveTransaction(dadosPlanilha);

            return { 
                success: true, 
                message: `Importação concluída: ${resultado.jogadoresAtualizados} jogadores processados, resultando em ${resultado.acoesInseridas} ações importadas para o banco.` 
            };
        } catch (error) {
            console.error("Erro ao salvar dados do excel no banco:", error);
            return { success: false, error: 'Erro ao registrar dados no banco de dados. Verifique o console.' };
        }
    }
}

export default ExcelImportControl;