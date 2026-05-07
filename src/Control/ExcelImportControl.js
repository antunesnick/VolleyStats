import { dialog } from 'electron';
const xlsx = require('xlsx');
const fs = require('fs');
import db from '../db/db';

// Função utilitária para remover acentos e padronizar textos
const removerAcentos = (texto) => {
    if (!texto) return '';
    return texto.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
};

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
            
            // 1. Ler as abas de perfis (Equipe ou Cards Atletas) para capturar as posições
            // Busca em qualquer aba que contenha esses nomes
            const abasPerfil = workbook.SheetNames.filter(n => n.toLowerCase().includes('equipe') || n.toLowerCase().includes('cards'));
            const mapaPosicoesPlanilha = {};

            for (let nomeAba of abasPerfil) {
                const ws = workbook.Sheets[nomeAba];
                const rowsAba = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true });
                
                // Mapeia qual coluna pertence a qual jogador (resolve o problema de jogadores lado a lado)
                const mapaColunasParaNomes = {}; 

                for (let row of rowsAba) {
                    if (!row) continue;
                    for (let c = 0; c < row.length; c++) {
                        const celula = String(row[c]).trim().toLowerCase();
                        
                        if (celula === 'nome:') {
                            const nome = String(row[c + 1] || '').trim();
                            if (nome) {
                                mapaColunasParaNomes[c] = removerAcentos(nome);
                            }
                        } 
                        else if (celula === 'posição:' || celula === 'posicao:') {
                            const posicao = String(row[c + 1] || '').trim();
                            const nomeAssociado = mapaColunasParaNomes[c];
                            
                            // Se a posição não for vazia e houver um nome mapeado nesta coluna
                            if (nomeAssociado && posicao) {
                                mapaPosicoesPlanilha[nomeAssociado] = posicao;
                            }
                        }
                    }
                }
            }

            // 2. Ler a aba "Temporada" para extrair estatísticas numéricas
            let sheetName = workbook.SheetNames.find(nome => nome.toLowerCase().includes('temporada'));
            if (!sheetName) {
                return { success: false, error: 'Não foi possível localizar a aba "Temporada".' };
            }
            
            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true });

            let linhaCabecalhoIndex = -1;
            let indiceVP = -1;

            for (let i = 0; i < rows.length; i++) {
                if (!rows[i]) continue;
                const textRow = rows[i].map(c => String(c).trim().toUpperCase());
                const vpIdx = textRow.indexOf('V-P');
                if (vpIdx !== -1 && textRow.includes('TOT')) {
                    linhaCabecalhoIndex = i;
                    indiceVP = vpIdx;
                    break;
                }
            }

            if (linhaCabecalhoIndex === -1 || indiceVP === -1) {
               return { success: false, error: 'Estrutura Incorreta: O cabeçalho com "Tot" e "V-P" não foi encontrado na aba Temporada.' };
            }

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

                if (!nome || String(nome).trim() === '') {
                    for(let col = iNome; col < iPtsTotais; col++) {
                        if (row[col] && String(row[col]).trim() !== '') {
                            nome = row[col];
                            camisa = row[col - 1]; 
                            break;
                        }
                    }
                }

                const nomeStr = String(nome).trim();
                
                if (nomeStr !== '' && nomeStr.toLowerCase() !== 'nome' && nomeStr.toLowerCase() !== 'undefined' && nomeStr !== 'null') {
                    const nomeNorm = removerAcentos(nomeStr);
                    
                    dadosExtraidos.push({
                        'Camisa': camisa || '-',
                        'Nome': nomeStr,
                        'Posicao': mapaPosicoesPlanilha[nomeNorm] || '', // Agora a extração não falhará
                        'Pontos Totais': row[iPtsTotais] || 0,
                        'Saque (Pts)': row[iPtsSaque] || 0,
                        'Recepção (Pos%)': row[iPosRecep] || 0,
                        'Ataque (Pts)': row[iPtsAtaque] || 0,
                        'Bloqueio (Pts)': row[iPtsBloqueio] || 0
                    });
                }
            }

            if (dadosExtraidos.length === 0) {
                return { success: false, error: `Nenhum jogador encontrado na aba Temporada.` };
            }

            const nomeDoArquivo = filePath.split('\\').pop().split('/').pop();
            return { success: true, data: dadosExtraidos, fileName: nomeDoArquivo };
        } catch (error) {
            console.error("Erro ao ler folha de cálculo:", error);
            return { success: false, error: 'Falha ao processar a folha Excel.' };
        }
    }

    async salvarDados(dadosPlanilha) {
        if (!dadosPlanilha || dadosPlanilha.length === 0) {
            return { success: false, error: 'Nenhum dado válido para salvar.' };
        }

        try {
            const saveTransaction = db.transaction((dados) => {
                
                // 1. Mapear jogadores existentes para evitar criar duplicados devido a acentos
                const jogadoresDB = db.prepare('SELECT id, nome FROM Jogadores').all();
                const mapaJogadores = {};
                for (const j of jogadoresDB) {
                    mapaJogadores[removerAcentos(j.nome)] = j.id;
                }

                // 2. Mapear as Posições existentes no Banco de Dados
                const mapaPosicoesDB = {};
                try {
                    const posicoesDB = db.prepare('SELECT id, nome FROM Posicoes').all(); 
                    for (const p of posicoesDB) {
                        mapaPosicoesDB[removerAcentos(p.nome)] = p.id;
                    }
                } catch (e) {
                    console.warn("Aviso: Falha ao carregar a tabela Posicoes.", e.message);
                }

                const insertJogador = db.prepare('INSERT INTO Jogadores (nome, numCamisa, posicao_id) VALUES (?, ?, ?)');
                const insertAcao = db.prepare(`
                    INSERT INTO Acao (Jogador_id, idTipoAcao, Qualidade, Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id, Ponto_NumSet) 
                    VALUES (?, ?, ?, NULL, NULL, NULL, NULL)
                `);

                let jogadoresAtualizados = 0;
                let acoesInseridas = 0;

                for (const row of dados) {

                    const nome = row['Nome'];
                    const camisa = row['Camisa'] !== '-' ? row['Camisa'] : null;
                    const posicaoPlanilha = row['Posicao'];
                    
                    if (!nome) continue;

                    const nomeNorm = removerAcentos(nome);
                    let jogadorId = mapaJogadores[nomeNorm];

                    // Se o jogador não existir na base de dados, cadastra-o
                    if (!jogadorId) {
                        let pId = 1; // Default de segurança (Levantador)
                        
                        // Verifica e atribui a posição correspondente da planilha
                        if (posicaoPlanilha) {
                            const posNorm = removerAcentos(posicaoPlanilha);
                            
                            // Tenta correspondência exata primeiro
                            if (mapaPosicoesDB[posNorm]) {
                                pId = mapaPosicoesDB[posNorm];
                            } else {
                                // Tenta correspondência parcial (ex: "Ponta" -> "Ponteiro")
                                for (const [nomePosDB, idPosDB] of Object.entries(mapaPosicoesDB)) {
                                    if (nomePosDB.includes(posNorm) || posNorm.includes(nomePosDB) || (posNorm.startsWith('pont') && nomePosDB === 'ponteiro') || (posNorm.startsWith('lib') && nomePosDB === 'libero') || (posNorm === 'central' && nomePosDB === 'meio')) {
                                        pId = idPosDB;
                                        break;
                                    }
                                }
                            }
                        }

                        const info = insertJogador.run(nome, camisa, pId);
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
                    inserirAcoesEmMassa(row['Recepção (Pos%)'], 4, 'B'); 

                    jogadoresAtualizados++;
                }

                return { jogadoresAtualizados, acoesInseridas };
            });

            const resultado = saveTransaction(dadosPlanilha);

            return { 
                success: true, 
                message: `Importação concluída: ${resultado.jogadoresAtualizados} jogadores processados e ${resultado.acoesInseridas} ações guardadas.` 
            };
        } catch (error) {
            console.error("Erro ao salvar dados do excel na base de dados:", error);
            return { success: false, error: 'Erro ao registrar dados na base de dados. Verifique a consola.' };
        }
    }
}

export default ExcelImportControl;