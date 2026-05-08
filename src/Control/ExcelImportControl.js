import { dialog } from 'electron';
import db from '../db/db';
import ExcelImportModel from '../Model/ExcelImportModel';

const xlsx = require('xlsx');
const fs = require('fs');

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
            const abasPerfil = workbook.SheetNames.filter((nome) => {
                const nomeNormalizado = removerAcentos(nome);
                return nomeNormalizado.includes('equipe') || nomeNormalizado.includes('cards');
            });
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

            const sheetName = workbook.SheetNames.find((nome) => removerAcentos(nome).includes('temporada'));
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

                const nomeStr = String(nome).trim();
                const nomeNormalizado = removerAcentos(nomeStr);

                if (nomeStr !== '' && nomeNormalizado !== 'nome' && nomeNormalizado !== 'undefined' && nomeNormalizado !== 'null') {
                    dadosExtraidos.push({
                        Camisa: camisa || '-',
                        Nome: nomeStr,
                        Posicao: mapaPosicoesPlanilha[nomeNormalizado] || '',
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

    async salvarDados(dadosPlanilha) {
        if (!dadosPlanilha || dadosPlanilha.length === 0) {
            return { success: false, error: 'Nenhum dado valido para salvar.' };
        }

        try {
            const saveTransaction = db.transaction((dados) => {
                return ExcelImportModel.salvarDados(dados, db);
            });
            const resultado = saveTransaction(dadosPlanilha);

            return {
                success: true,
                message: `Importacao concluida: ${resultado.jogadoresAtualizados} jogadores processados e ${resultado.acoesInseridas} acoes guardadas.`
            };
        } catch (error) {
            console.error('Erro ao salvar dados do excel na base de dados:', error);
            return { success: false, error: 'Erro ao registrar dados na base de dados. Verifique a consola.' };
        }
    }
}

export default ExcelImportControl;
