// See the Electron documentation for details on how to use preload scripts:

import { contextBridge, ipcRenderer } from "electron";

// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

contextBridge.exposeInMainWorld("ElectronAPI", {
    salvarCategoria: (dados) => ipcRenderer.invoke('salvar-categoria', dados),
    listarCategorias: () => ipcRenderer.invoke('listar-categorias'),
    editarCategoria: (id, dados) => ipcRenderer.invoke('editar-categoria', id, dados),
    excluirCategoria: (id) => ipcRenderer.invoke('excluir-categoria', id),
    
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
