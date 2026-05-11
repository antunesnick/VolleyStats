import { dialog } from 'electron';
import db from '../db/db';
import ExcelImportModel from '../Model/ExcelImportModel';

const xlsx = require('xlsx');
const fs = require('fs');

import Player from '../Model/Player';
import Position from '../Model/Position';
import Acao from '../Model/Acao';
import ImportHistory from '../Model/ImportHistory'; 

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
            title: 'Selecione a folha de estatisticas',
            properties: ['openFile'],
            filters: [
                { name: 'Folhas Excel', extensions: ['xlsx', 'xls', 'csv'] }
            ]
        });

        if (canceled || filePaths.length === 0) {
            return { success: false, message: 'Importacao cancelada.' };
        }

        try {
            const filePath = filePaths[0];
            const fileBuffer = fs.readFileSync(filePath);
            const workbook = xlsx.read(fileBuffer, { type: 'buffer' });
            
            const abasPerfil = workbook.SheetNames.filter(n => n.toLowerCase().includes('equipe') || n.toLowerCase().includes('cards'));
            const mapaPosicoesPlanilha = {};

            for (const nomeAba of abasPerfil) {
                const ws = workbook.Sheets[nomeAba];
                const rowsAba = xlsx.utils.sheet_to_json(ws, { header: 1, defval: '', blankrows: true });
                
                const mapaColunasParaNomes = {}; 

                for (const row of rowsAba) {
                    if (!row) continue;

                    for (let c = 0; c < row.length; c++) {
                        const celula = removerAcentos(row[c]);

                        if (celula === 'nome:') {
                            const nome = String(row[c + 1] || '').trim();
                            if (nome) {
                                mapaColunasParaNomes[c] = removerAcentos(nome);
                            }
                        } else if (celula === 'posicao:') {
                            const posicao = String(row[c + 1] || '').trim();
                            const nomeAssociado = mapaColunasParaNomes[c];
                            
                            if (nomeAssociado && posicao) {
                                mapaPosicoesPlanilha[nomeAssociado] = posicao;
                            }
                        }
                    }
                }
            }

            let sheetName = workbook.SheetNames.find(nome => nome.toLowerCase().includes('temporada'));
            if (!sheetName) {
                return { success: false, error: 'Nao foi possivel localizar a aba "Temporada".' };
            }

            const worksheet = workbook.Sheets[sheetName];
            const rows = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: '', blankrows: true });

            let linhaCabecalhoIndex = -1;
            let indiceVP = -1;

            for (let i = 0; i < rows.length; i++) {
                if (!rows[i]) continue;
                const textRow = rows[i].map((cell) => String(cell).trim().toUpperCase());
                const vpIdx = textRow.indexOf('V-P');
                if (vpIdx !== -1 && textRow.includes('TOT')) {
                    linhaCabecalhoIndex = i;
                    indiceVP = vpIdx;
                    break;
                }
            }

            if (linhaCabecalhoIndex === -1 || indiceVP === -1) {
                return { success: false, error: 'Estrutura incorreta: o cabecalho com "Tot" e "V-P" nao foi encontrado na aba Temporada.' };
            }

            const iCamisa = indiceVP - 9;
            const iNome = indiceVP - 8;
            const iPtsTotais = indiceVP - 1;
            const iPtsSaque = indiceVP + 3;
            const iPosRecep = indiceVP + 6;
            const iPtsAtaque = indiceVP + 11;
            const iPtsBloqueio = indiceVP + 13;
            const dadosExtraidos = [];

            for (let i = linhaCabecalhoIndex + 1; i < rows.length; i++) {
                const row = rows[i];
                if (!row) continue;

                let camisa = row[iCamisa];
                let nome = row[iNome];

                if (!nome || String(nome).trim() === '') {
                    for (let col = iNome; col < iPtsTotais; col++) {
                        if (row[col] && String(row[col]).trim() !== '') {
                            nome = row[col];
                            camisa = row[col - 1];
                            break;
                        }
                    }
                }

                const nomeStr = String(nome || '').trim();
                
                if (nomeStr.toLowerCase().includes('total') || nomeStr.toLowerCase().includes('totais') || nomeStr.toLowerCase().includes('equipe')) {
                    break; 
                }
                
    
                if (nomeStr.length > 1 && nomeStr.toLowerCase() !== 'nome' && nomeStr.toLowerCase() !== 'undefined' && nomeStr !== 'null') {
                    const nomeNorm = removerAcentos(nomeStr);
                    
                    dadosExtraidos.push({
                        'Camisa': camisa || '-',
                        'Nome': nomeStr,
                        'Posicao': mapaPosicoesPlanilha[nomeNorm] || '', 
                        'Pontos Totais': row[iPtsTotais] || 0,
                        'Saque (Pts)': row[iPtsSaque] || 0,
                        'Recepção (Pos%)': row[iPosRecep] || 0,
                        'Ataque (Pts)': row[iPtsAtaque] || 0,
                        'Bloqueio (Pts)': row[iPtsBloqueio] || 0
                    });
                }
            }

            if (dadosExtraidos.length === 0) {
                return { success: false, error: 'Nenhum jogador encontrado na aba Temporada.' };
            }

            const nomeDoArquivo = filePath.split('\\').pop().split('/').pop();
            return { success: true, data: dadosExtraidos, fileName: nomeDoArquivo };
        } catch (error) {
            console.error('Erro ao ler folha de calculo:', error);
            return { success: false, error: 'Falha ao processar a folha Excel.' };
        }
    }

    // 2. RECEBE O nomeArquivo AQUI
    async salvarDados(dadosPlanilha, nomeArquivo) {
        if (!dadosPlanilha || dadosPlanilha.length === 0) {
            return { success: false, error: 'Nenhum dado valido para salvar.' };
        }

        try {
            const saveTransaction = db.transaction((dados) => {
                
                // 3. REGISTRA A IMPORTAÇÃO NO HISTÓRICO USANDO A MODEL
                const historico = new ImportHistory(null, nomeArquivo || 'Arquivo_Desconhecido.xlsx');
                const importacaoId = historico.insert(db);

                const playerModel = new Player();
                const positionModel = new Position();

            
                const jogadoresDB = playerModel.findAllPlayers(db);
                const mapaJogadores = {};
                for (const j of jogadoresDB) {
                    mapaJogadores[removerAcentos(j.nome)] = j.id;
                }

                const mapaPosicoesDB = {};
                try {
                    const posicoesDB = positionModel.getAllPositions(db); 
                    for (const p of posicoesDB) {
                        mapaPosicoesDB[removerAcentos(p.nome)] = p.id;
                    }
                } catch (e) {
                    console.warn("Aviso: Falha ao carregar a tabela Posicoes.", e.message);
                }

                let jogadoresAtualizados = 0;
                let acoesInseridas = 0;

                for (const row of dados) {
                    const nome = row['Nome'];
                    const camisa = row['Camisa'] !== '-' ? row['Camisa'] : null;
                    const posicaoPlanilha = row['Posicao'];
                    
                    if (!nome) continue;

                    const nomeNorm = removerAcentos(nome);
                    let jogadorId = mapaJogadores[nomeNorm];

                    // Se o jogador não existir cadastrar
                    if (!jogadorId) {
                        let pId = 1; // Default
                        
                        if (posicaoPlanilha) {
                            const posNorm = removerAcentos(posicaoPlanilha);
                            
                            if (mapaPosicoesDB[posNorm]) {
                                pId = mapaPosicoesDB[posNorm];
                            } else {
                                for (const [nomePosDB, idPosDB] of Object.entries(mapaPosicoesDB)) {
                                    if (nomePosDB.includes(posNorm) || posNorm.includes(nomePosDB) || (posNorm.startsWith('pont') && nomePosDB === 'ponteiro') || (posNorm.startsWith('lib') && nomePosDB === 'libero') || (posNorm === 'central' && nomePosDB === 'meio')) {
                                        pId = idPosDB;
                                        break;
                                    }
                                }
                            }
                        }

                        // Instancia a model de Player para padreos null
                        const novoJogador = new Player(null, null, nome, null, camisa, null, null, pId, null, null);
                        jogadorId = novoJogador.insertPlayer(db);
                        mapaJogadores[nomeNorm] = jogadorId; 
                    }

                    const inserirAcoesEmMassa = (quantidade, tipoAcaoId, qualidade) => {
                        const qtd = parseInt(quantidade) || 0;
                        
                        // mock pro acao jogador
                        const objJogador = { id: jogadorId };
                        const objTipoAcao = { idTipoAcao: tipoAcaoId };

                        for (let i = 0; i < qtd; i++) {
                            // 4. PASSA O importacaoId AQUI NA CRIAÇÃO DA AÇÃO
                            const novaAcao = new Acao(null, objJogador, objTipoAcao, qualidade, importacaoId);
                            novaAcao.criarAcao(db);
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
                message: `Importação concluída: ${resultado.jogadoresAtualizados} jogadores processados e ${resultado.acoesInseridas} ações guardadas com sucesso.` 
            };
        } catch (error) {
            console.error('Erro ao salvar dados do excel na base de dados:', error);
            return { success: false, error: 'Erro ao registrar dados na base de dados. Verifique a consola.' };
        }
    }

    // 5. NOVOS MÉTODOS PARA O HISTÓRICO COMUNICAREM COM A MODEL
    async listarImportacoes() {
        try {
            const logs = ImportHistory.findAll(db);
            return { success: true, data: logs };
        } catch (error) {
            console.error("Erro ao listar importações:", error);
            return { success: false, error: error.message };
        }
    }

    async reverterImportacao(idImportacao) {
        try {
            const revertTx = db.transaction((id) => {
                ImportHistory.delete(db, id);
            });
            revertTx(idImportacao);
            return { success: true, message: "Importação revertida com sucesso." };
        } catch (error) {
            console.error("Erro ao reverter importação:", error);
            return { success: false, error: error.message };
        }
    }
}

export default ExcelImportControl;
