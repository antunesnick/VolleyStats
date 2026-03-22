const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ElectronAPI", {
	listarGinasios: () => ipcRenderer.invoke("ginasio:listar"),
	salvarGinasio: (dados) => ipcRenderer.invoke("ginasio:salvar", dados),
	editarGinasio: (id, dados) => ipcRenderer.invoke("ginasio:editar", id, dados),
	excluirGinasio: (id) => ipcRenderer.invoke("ginasio:excluir", id),
	pesquisarGinasio: (filtro) => ipcRenderer.invoke("ginasio:pesquisar", filtro),
});

contextBridge.exposeInMainWorld('api', {
    partidas: {
        create: (data) => ipcRenderer.invoke('partidas:create', data),
        update: (data) => ipcRenderer.invoke('partidas:update', data),
        delete: (id) => ipcRenderer.invoke('partidas:delete', id),
        findAll: () => ipcRenderer.invoke('partidas:findAll'),
        finalizar: (id, pts1, pts2) => ipcRenderer.invoke('partidas:finalizar', id, pts1, pts2)
    }
});
