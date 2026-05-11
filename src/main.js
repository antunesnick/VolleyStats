const { app, BrowserWindow, ipcMain, protocol, dialog } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const CategoriaControl = require("./Control/CategoriaControl").default;
const GinasioControlModule = require('./Control/GinasioControl');
const GinasioControl = GinasioControlModule.default || GinasioControlModule;
const PartidaControl = require('./Control/PartidaControl');
const url = require('url');
const xlsx = require('xlsx');
const ExcelImportControl = require('./Control/ExcelImportControl').default;

const { initDatabase } = require('./db/db');
const TournamentControl = require('./Control/TournamentControl').default;

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
    width: 1680,
    height: 1020,
    minWidth: 1280,
    minHeight: 800,
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
    return await PartidaControl.getInstance().createPartida(data);
});

ipcMain.handle('partidas:update', async (event, data) => {
    return await PartidaControl.getInstance().updatePartida(data);
});

ipcMain.handle('partidas:updateVideoLink', async (event, id, link) => {
  return await PartidaControl.getInstance().updateVideoLink(id, link);
});

ipcMain.handle('partidas:delete', async (event, id) => {
    return await PartidaControl.getInstance().deletePartida(id);
});

ipcMain.handle('partidas:findAll', async () => {
    return await PartidaControl.getInstance().findAllPartidas();
});

ipcMain.handle('partidas:findByDateAndTeam', async (event, filters, tournamentId) => {
    return await PartidaControl.getInstance().findPartidaByDateAndTeam(filters, tournamentId);
});

ipcMain.handle('partidas:findById', async (event, id) => {
    return await PartidaControl.getInstance().findPartidaById(id);
});

ipcMain.handle('partidas:findByTournament', async (event, tournamentId) => {
    return await PartidaControl.getInstance().findPartidaByTournamentId(tournamentId);
});

ipcMain.handle('partidas:finalizar', async (event, id, pontosTime1, pontosTime2) => {
    return await PartidaControl.getInstance().finalizarPartida(id, pontosTime1, pontosTime2);
});
ipcMain.handle('partidas:iniciar', async (event, id) => {
    return await PartidaControl.getInstance().iniciarPartida(id);
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

  initDatabase();


  ipcMain.handle('salvar-categoria', async (event, dados) => {
    try {
      return await CategoriaControl.getInstance().cadastrarDados(dados);
    } catch (e) {
      throw e;
    }
  })

  ipcMain.handle('listar-categorias', async () => {
    try {
      return await CategoriaControl.getInstance().listarCategorias();
    } catch (e) {
      throw e;
    }
  })

  ipcMain.handle('editar-categoria', async (event, id, dados) => {
    try {
      await CategoriaControl.getInstance().editarCategoria(id, dados);
    } catch (e) {
      throw e;
    }
  })

  ipcMain.handle('excluir-categoria', async (event, id) => {
    try {
      await CategoriaControl.getInstance().excluirCategoria(id);
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

  ipcMain.handle('tournaments:list', async () => TournamentControl.listTournaments());

  ipcMain.handle('tournaments:getById', async (_event, id) => {
    return TournamentControl.getTournamentById(id); 
  });

  ipcMain.handle('tournaments:create', async (_event, payload) => {
    return TournamentControl.createTournament(payload);
  });

  ipcMain.handle('tournaments:update', async (_event, payload) => {
    return TournamentControl.updateTournament(payload);
  });

  ipcMain.handle('tournaments:delete', async (_event, id) => {
    return TournamentControl.deleteTournament(id);
  });
  
  ipcMain.handle('excel:importar', async () => {
    return await ExcelImportControl.getInstance().importarExcel();
  });

  ipcMain.handle('excel:salvar', async (event, dados) => {
    return await ExcelImportControl.getInstance().salvarDados(dados);
  });

  ipcMain.handle('relatorio:salvarPdf', async (event, payload = {}) => {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    if (!sourceWindow) {
      throw new Error('Janela do relatorio nao encontrada.');
    }

    const nomeArquivo = typeof payload === 'string' ? payload : payload.nomeArquivo;
    const nomeSeguro = String(nomeArquivo || 'relatorio.pdf')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-');
    const defaultPath = nomeSeguro.toLowerCase().endsWith('.pdf')
      ? nomeSeguro
      : `${nomeSeguro}.pdf`;

    const { canceled, filePath } = await dialog.showSaveDialog(sourceWindow, {
      title: 'Salvar relatorio como PDF',
      defaultPath,
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (canceled || !filePath) {
      return { success: false, canceled: true };
    }

    const reportWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        offscreen: true,
      },
    });

    try {
      const html = typeof payload === 'object' && payload.html
        ? payload.html
        : '<html><body><h1>Relatorio</h1></body></html>';

      await reportWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);

      const pdfBuffer = await reportWindow.webContents.printToPDF({
        printBackground: true,
        landscape: true,
        pageSize: 'A4',
        margins: {
          marginType: 'default',
        },
      });

      await fs.writeFile(filePath, pdfBuffer);
    } finally {
      reportWindow.destroy();
    }

    return { success: true, filePath };
  });

  createWindow();

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
