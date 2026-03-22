const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    partidas: {
        create: (data) => ipcRenderer.invoke('partidas:create', data),
        update: (data) => ipcRenderer.invoke('partidas:update', data),
        delete: (id) => ipcRenderer.invoke('partidas:delete', id),
        findAll: () => ipcRenderer.invoke('partidas:findAll'),
        finalizar: (id, pts1, pts2) => ipcRenderer.invoke('partidas:finalizar', id, pts1, pts2)
    }
});