const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ElectronAPI", {
	listarGinasios: () => ipcRenderer.invoke("ginasio:listar"),
	salvarGinasio: (dados) => ipcRenderer.invoke("ginasio:salvar", dados),
	editarGinasio: (id, dados) => ipcRenderer.invoke("ginasio:editar", id, dados),
	excluirGinasio: (id) => ipcRenderer.invoke("ginasio:excluir", id),
	pesquisarGinasio: (filtro) => ipcRenderer.invoke("ginasio:pesquisar", filtro),
});
