const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { initDatabase } = require('./db/db');
const { TournamentDAO } = require('./Model/TournamentDAO');
const { Tournament } = require('./Model/Tournament');

const tournamentDAO = new TournamentDAO();

if (require('electron-squirrel-startup')) {
  app.quit();
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1680,
    height: 1020,
    minWidth: 1280,
    minHeight: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
};

function registerTournamentIpcHandlers() {
  ipcMain.handle('tournaments:list', async () => tournamentDAO.getAllTournaments());

  ipcMain.handle('tournaments:create', async (_event, payload) => {
    const tournament = new Tournament(
      null,
      payload.name,
      payload.type,
      payload.startDate,
      payload.endDate
    );
    return tournamentDAO.createTournament(tournament);
  });

  ipcMain.handle('tournaments:update', async (_event, payload) => {
    const tournament = new Tournament(
      payload.id,
      payload.name,
      payload.type,
      payload.startDate,
      payload.endDate
    );
    return tournamentDAO.modifyTournament(tournament);
  });

  ipcMain.handle('tournaments:delete', async (_event, id) => {
    const numericId = Number(id);
    if (!numericId || Number.isNaN(numericId)) {
      throw new Error('ID do torneio invalido.');
    }
    tournamentDAO.deleteTournament(numericId);
    return true;
  });
}


app.whenReady().then(() => {
  initDatabase();
  registerTournamentIpcHandlers();
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
