
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const CategoriaControl = require("./Controls/Categoria").default
const GinasioControlModule = require('./Control/GinasioControl');
const GinasioControl = GinasioControlModule.default || GinasioControlModule;
const PartidaControl = require('./Control/PartidaControl');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  // and load the index.html of the app.
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



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
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

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
