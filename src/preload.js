// ATENÇÃO: Como tiramos o contextIsolation, não usamos mais o contextBridge!
const { ipcRenderer } = require("electron");

// O renderer acessa o SQLite direto (nodeIntegration ligado), entao precisa
// saber onde ficam os dados ANTES de qualquer Control importar src/db/db.js.
// O preload roda antes do bundle do React, e por isso este e o unico ponto
// onde da para definir a variavel a tempo.
try {
  process.env.VOLLEYSTATS_DATA_DIR = ipcRenderer.sendSync('app:getDataDir');
} catch (error) {
  console.error('Nao foi possivel obter o diretorio de dados do processo principal:', error);
}

// Injetamos direto no objeto window do navegador
window.ElectronAPI = {
    salvarCategoria: (dados) => ipcRenderer.invoke('salvar-categoria', dados),
    listarCategorias: () => ipcRenderer.invoke('listar-categorias'),
    editarCategoria: (id, dados) => ipcRenderer.invoke('editar-categoria', id, dados),
    excluirCategoria: (id) => ipcRenderer.invoke('excluir-categoria', id),
    
    listarGinasios: () => ipcRenderer.invoke("ginasio:listar"),
    salvarGinasio: (dados) => ipcRenderer.invoke("ginasio:salvar", dados),
    editarGinasio: (id, dados) => ipcRenderer.invoke("ginasio:editar", id, dados),
    excluirGinasio: (id) => ipcRenderer.invoke("ginasio:excluir", id),
    pesquisarGinasio: (filtro) => ipcRenderer.invoke("ginasio:pesquisar", filtro),
};

window.api = {
    partidas: {
        create: (data) => ipcRenderer.invoke('partidas:create', data),
        update: (data) => ipcRenderer.invoke('partidas:update', data),
        updateVideoLink: (id, link) => ipcRenderer.invoke('partidas:updateVideoLink', id, link),
        delete: (id) => ipcRenderer.invoke('partidas:delete', id),
        findAll: () => ipcRenderer.invoke('partidas:findAll'),
        findByDateAndTeam: (filters, tournamentId) => ipcRenderer.invoke('partidas:findByDateAndTeam', filters, tournamentId),
        findById: (id) => ipcRenderer.invoke('partidas:findById', id),
        findByTournament: (tournamentId) => ipcRenderer.invoke('partidas:findByTournament', tournamentId),
        iniciar: (id) => ipcRenderer.invoke('partidas:iniciar', id),
        finalizar: (id, pts1, pts2) => ipcRenderer.invoke('partidas:finalizar', id, pts1, pts2)
    }
};

window.tournamentAPI = {
    list: () => ipcRenderer.invoke('tournaments:list'),
    create: (payload) => ipcRenderer.invoke('tournaments:create', payload),
    update: (payload) => ipcRenderer.invoke('tournaments:update', payload),
    delete: (id) => ipcRenderer.invoke('tournaments:delete', id),
    getById: (id) => ipcRenderer.invoke('tournaments:getById', id),
};

window.excelAPI = {
    importar: () => ipcRenderer.invoke('excel:importar'),
    salvarDados: (dados, nomeArquivo) => ipcRenderer.invoke('excel:salvar', dados, nomeArquivo),
    listarHistorico: () => ipcRenderer.invoke('excel:listarHistorico'),
    reverter: (id) => ipcRenderer.invoke('excel:reverter', id)
};


window.reportAPI = {
    salvarPdf: (payload) => ipcRenderer.invoke('relatorio:salvarPdf', payload),
    torneioPartidas: (tournamentId) => ipcRenderer.invoke('relatorio:torneioPartidas', tournamentId),
    torneioRelatorio: (tournamentId, filtros) => ipcRenderer.invoke('relatorio:torneio', tournamentId, filtros),
    torneiosGeral: (filtros) => ipcRenderer.invoke('relatorio:torneiosGeral', filtros),
    ginasioRelatorio: (ginasioId, filtros) => ipcRenderer.invoke('relatorio:ginasio', ginasioId, filtros),
    categoriasRelatorio: (filtros) => ipcRenderer.invoke('relatorio:categorias', filtros)
};
