const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('tournamentAPI', {
	list: () => ipcRenderer.invoke('tournaments:list'),
	create: (payload) => ipcRenderer.invoke('tournaments:create', payload),
	update: (payload) => ipcRenderer.invoke('tournaments:update', payload),
	delete: (id) => ipcRenderer.invoke('tournaments:delete', id),
});
