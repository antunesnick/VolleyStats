
const { app, BrowserWindow, ipcMain, protocol } = require('electron');
const path = require('node:path');
const CategoriaControl = require("./Control/CategoriaControl").default;
const GinasioControlModule = require('./Control/GinasioControl');
const GinasioControl = GinasioControlModule.default || GinasioControlModule;
const PartidaControl = require('./Control/PartidaControl');
const url = require('url');

if (require('electron-squirrel-startup')) {
  app.quit();
}

// 1. PRIVILÉGIOS PRECISAM ESTAR AQUI FORA (ANTES DO APP.WHENREADY)
protocol.registerSchemesAsPrivileged([
  { 
    scheme: 'local', 
    privileges: { 
      secure: true, 
      supportFetchAPI: true, 
      bypassCSP: true 
    } 
  }
]);

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,     
      contextIsolation: false,   
      webSecurity: false 
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

// Rotas IPC para Partidas
ipcMain.handle('partidas:create', async (event, data) => {
    return await PartidaControl.createPartida(data);
});

ipcMain.handle('partidas:update', async (event, data) => {
    return await PartidaControl.updatePartida(data);
});

ipcMain.handle('partidas:delete', async (event, id) => {
    return await PartidaControl.deletePartida(id);
});

ipcMain.handle('partidas:findAll', async () => {
    return await PartidaControl.findAllPartidas();
});

ipcMain.handle('partidas:finalizar', async (event, id, pontosTime1, pontosTime2) => {
    return await PartidaControl.finalizarPartida(id, pontosTime1, pontosTime2);
});



// 2. INICIALIZAÇÃO DO APP
app.whenReady().then(() => {
  protocol.registerFileProtocol('local', (request, callback) => {
    try {
      const fileUrl = request.url.replace('local://', 'file://');
      const filePath = url.fileURLToPath(fileUrl);
      
      callback({ path: filePath });
    } catch (err) {
      console.error("Erro ao processar imagem local:", err);
      callback({ error: -2 });
    }
  });


  ipcMain.handle('salvar-categoria', async (event, dados) => {
    try {
      return await CategoriaControl.cadastrarDados(dados);
    } catch (e) {
      throw e;
    }
  })

  ipcMain.handle('listar-categorias', async () => {
    try {
      return await CategoriaControl.listarCategorias();
    } catch (e) {
      throw e;
    }
  })

  ipcMain.handle('editar-categoria', async (event, id, dados) => {
    try {
      await CategoriaControl.editarCategoria(id, dados);
    } catch (e) {
      throw e;
    }
  })

  ipcMain.handle('excluir-categoria', async (event, id) => {
    try {
      await CategoriaControl.excluirCategoria(id);
    } catch (e) {
      throw e;
    }
  })



  ipcMain.handle('ginasio:listar', async () => {
    return GinasioControl.listarGinasios();
  });

  ipcMain.handle('ginasio:salvar', async (_event, dados) => {
    return GinasioControl.cadastrarDados(dados);
  });

  ipcMain.handle('ginasio:editar', async (_event, id, dados) => {
    return GinasioControl.editarGinasio(id, dados);
  });

  ipcMain.handle('ginasio:excluir', async (_event, id) => {
    return GinasioControl.excluirGinasio(id);
  });

  ipcMain.handle('ginasio:pesquisar', async (_event, filtro) => {
    return GinasioControl.pesquisarGinasio(filtro);
  });

  createWindow();



  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});