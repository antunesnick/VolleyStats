// See the Electron documentation for details on how to use preload scripts:

import { contextBridge, ipcRenderer } from "electron";

// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts
contextBridge.exposeInMainWorld("ElectronAPI", {
    mostrarAviso: (mensagem) => ipcRenderer.send('abrir-aviso', mensagem),
    salvarCategoria: (dados) => ipcRenderer.invoke('salvar-categoria', dados),
    listarCategorias: () => ipcRenderer.invoke('listar-categorias')
})

