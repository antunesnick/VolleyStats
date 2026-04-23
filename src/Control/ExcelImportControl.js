import { dialog } from 'electron';
const xlsx = require('xlsx');
const fs = require('fs');

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
        try {
            // Integração futura com o seu PlayerControl para base de dados
            return { success: true };
        } catch (error) {
            return { success: false, error: 'Erro ao registar dados na base de dados.' };
        }
    }
}

export default ExcelImportControl;