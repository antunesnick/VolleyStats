// PRECISA ser o primeiro import: define o diretorio de dados antes de
// src/db/db.js abrir a conexao com o SQLite.
import './config/bootstrapPaths';

import { app, BrowserWindow, ipcMain, protocol } from 'electron';
import url from 'url';
import squirrelStartup from 'electron-squirrel-startup';

import CategoriaControl from './Control/CategoriaControl';
import GinasioControl from './Control/GinasioControl';
import PartidaControl from './Control/PartidaControl';
import ExcelImportControl from './Control/ExcelImportControl';
import RelatorioControl from './Control/RelatorioControl';
import TournamentControl from './Control/TournamentControl';
import { initDatabase } from './db/db';
import { gerarDadosFalsos } from './db/seed';

if (squirrelStartup) {
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
    autoHideMenuBar: true,
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

  // Dados ficticios servem para desenvolver. Uma build empacotada comeca vazia.
  if (!app.isPackaged && process.env.VOLLEYSTATS_SEED !== '0') {
    gerarDadosFalsos();
  }


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

  ipcMain.handle('relatorio:torneioPartidas', async (_event, tournamentId) => {
    return TournamentControl.emitirRelatorioPartidas(tournamentId);
  });

  ipcMain.handle('relatorio:torneio', async (_event, tournamentId, filtros = {}) => {
    return TournamentControl.emitirRelatorioTorneio(tournamentId, filtros);
  });

  ipcMain.handle('relatorio:torneiosGeral', async (_event, filtros = {}) => {
    return TournamentControl.emitirRelatorioGeralTorneios(filtros);
  });

  ipcMain.handle('relatorio:ginasio', async (_event, ginasioId, filtros = {}) => {
    return GinasioControl.relatorioGinasio(ginasioId, filtros);
  });

  ipcMain.handle('relatorio:categorias', async (_event, filtros = {}) => {
    return CategoriaControl.getInstance().relatorioGeralCategorias(filtros);
  });
  
  ipcMain.handle('excel:importar', async () => {
    return await ExcelImportControl.getInstance().importarExcel();
  });

  ipcMain.handle('excel:salvar', async (event, dados, nomeArquivo) => {
    return await ExcelImportControl.getInstance().salvarDados(dados, nomeArquivo);
  });

  ipcMain.handle('excel:listarHistorico', async () => {
    return await ExcelImportControl.getInstance().listarImportacoes();
  });

  ipcMain.handle('excel:reverter', async (event, id) => {
    return await ExcelImportControl.getInstance().reverterImportacao(id);
  });


  ipcMain.handle('relatorio:salvarPdf', async (event, payload = {}) => {
    return RelatorioControl.salvarPdf(event, payload);
  });

  // O renderer precisa do mesmo diretorio de dados para abrir o banco.
  // Sincrono de proposito: o preload roda antes do bundle do React.
  ipcMain.on('app:getDataDir', (event) => {
    event.returnValue = process.env.VOLLEYSTATS_DATA_DIR;
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
