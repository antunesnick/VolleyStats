// ATENÇÃO: Como tiramos o contextIsolation, não usamos mais o contextBridge!
const { ipcRenderer } = require("electron");

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
        delete: (id) => ipcRenderer.invoke('partidas:delete', id),
        findAll: () => ipcRenderer.invoke('partidas:findAll'),
        findByDateAndTeam: (filters, tournamentId) => ipcRenderer.invoke('partidas:findByDateAndTeam', filters, tournamentId),
        findById: (id) => ipcRenderer.invoke('partidas:findById', id),
        findByTournament: (tournamentId) => ipcRenderer.invoke('partidas:findByTournament', tournamentId),
        finalizar: (id, pts1, pts2) => ipcRenderer.invoke('partidas:finalizar', id, pts1, pts2)
    }
};

window.tournamentAPI = {
    list: () => ipcRenderer.invoke('tournaments:list'),
    create: (payload) => ipcRenderer.invoke('tournaments:create', payload),
    update: (payload) => ipcRenderer.invoke('tournaments:update', payload),
    delete: (id) => ipcRenderer.invoke('tournaments:delete', id),
};
