const { app, BrowserWindow, protocol } = require('electron'); 
const path = require('path');
const url = require('url'); // Importação segura do URL

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
    width: 800,
    height: 600,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false 
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  mainWindow.webContents.openDevTools();
};

// 2. INICIALIZAÇÃO DO APP
app.whenReady().then(() => {
  
  // 3. REGISTRO DO PROTOCOLO SEGURO (Lida com as barras do Windows perfeitamente)
  protocol.registerFileProtocol('local', (request, callback) => {
    try {
      // Troca o local:// por file:// e pede pro Node descobrir o caminho exato do HD
      const fileUrl = request.url.replace('local://', 'file://');
      const filePath = url.fileURLToPath(fileUrl);
      
      callback({ path: filePath });
    } catch (err) {
      console.error("Erro ao processar imagem local:", err);
      callback({ error: -2 }); // Código de erro: Arquivo não encontrado
    }
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