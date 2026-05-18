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

const db = require('./db/db');
const { initDatabase } = db;
const TournamentControl = require('./Control/TournamentControl').default;
const { gerarDadosFalsos } = require('./db/seed');

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
  gerarDadosFalsos();


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
    const torneioId = Number(tournamentId);
    if (!torneioId || Number.isNaN(torneioId)) {
      throw new Error('Torneio invalido para emitir relatorio.');
    }

    const torneio = db.prepare('SELECT id, nome, tipo, inicio, termino FROM Torneios WHERE id = ?').get(torneioId);
    if (!torneio) {
      throw new Error('Torneio nao encontrado.');
    }

    const partidas = db.prepare(`
      SELECT
        p.id,
        p.nome,
        p.dataPartida,
        p.status,
        p.pontosTime1,
        p.pontosTime2,
        p.fase,
        t1.nome AS time1Nome,
        t2.nome AS time2Nome,
        g.nome AS ginasioNome
      FROM Partidas p
      LEFT JOIN Times t1 ON t1.id = p.time1
      LEFT JOIN Times t2 ON t2.id = p.time2
      LEFT JOIN Ginasios g ON g.id = p.ginasio_id
      WHERE p.torneio_id = ?
      ORDER BY p.dataPartida DESC, p.id DESC
    `).all(torneioId);

    const timesMap = new Map();
    const ensureTime = (nome) => {
      const key = nome || 'Time nao definido';
      if (!timesMap.has(key)) {
        timesMap.set(key, {
          nome: key,
          jogos: 0,
          finalizadas: 0,
          vitorias: 0,
          derrotas: 0,
          empates: 0,
          setsGanhos: 0,
          setsPerdidos: 0,
          saldoSets: 0,
          taxaVitoria: 0,
        });
      }
      return timesMap.get(key);
    };

    const jogos = partidas.map((partida) => {
      const status = String(partida.status || 'AGENDADA').toUpperCase();
      const finalizada = status === 'FINALIZADA';
      const pontosTime1 = Number(partida.pontosTime1) || 0;
      const pontosTime2 = Number(partida.pontosTime2) || 0;
      const time1 = ensureTime(partida.time1Nome);
      const time2 = ensureTime(partida.time2Nome);

      time1.jogos += 1;
      time2.jogos += 1;

      if (finalizada) {
        time1.finalizadas += 1;
        time2.finalizadas += 1;
        time1.setsGanhos += pontosTime1;
        time1.setsPerdidos += pontosTime2;
        time2.setsGanhos += pontosTime2;
        time2.setsPerdidos += pontosTime1;

        if (pontosTime1 > pontosTime2) {
          time1.vitorias += 1;
          time2.derrotas += 1;
        } else if (pontosTime2 > pontosTime1) {
          time2.vitorias += 1;
          time1.derrotas += 1;
        } else {
          time1.empates += 1;
          time2.empates += 1;
        }
      }

      return {
        id: partida.id,
        nome: partida.nome,
        dataPartida: partida.dataPartida,
        status,
        fase: partida.fase || 'Sem fase',
        time1Nome: partida.time1Nome || 'Time 1',
        time2Nome: partida.time2Nome || 'Time 2',
        ginasioNome: partida.ginasioNome || 'Local nao definido',
        pontosTime1,
        pontosTime2,
        placar: finalizada ? `${pontosTime1} x ${pontosTime2}` : '--',
        vencedor: finalizada
          ? pontosTime1 > pontosTime2
            ? partida.time1Nome
            : pontosTime2 > pontosTime1
              ? partida.time2Nome
              : 'Empate'
          : 'Pendente',
      };
    });

    const times = Array.from(timesMap.values()).map((time) => ({
      ...time,
      saldoSets: time.setsGanhos - time.setsPerdidos,
      taxaVitoria: time.finalizadas > 0
        ? Number(((time.vitorias / time.finalizadas) * 100).toFixed(1))
        : 0,
    })).sort((a, b) => (
      b.vitorias - a.vitorias
      || b.taxaVitoria - a.taxaVitoria
      || b.saldoSets - a.saldoSets
      || String(a.nome).localeCompare(String(b.nome), 'pt-BR', { sensitivity: 'base' })
    ));

    const melhorJogador = db.prepare(`
      SELECT
        j.id,
        j.nome,
        j.numCamisa,
        COUNT(a.id) AS totalAcoes,
        SUM(CASE WHEN a.Qualidade = 'A' THEN 1 ELSE 0 END) AS acoesA,
        SUM(CASE WHEN a.Qualidade = 'B' THEN 1 ELSE 0 END) AS acoesB,
        SUM(CASE WHEN a.Qualidade = 'C' THEN 1 ELSE 0 END) AS acoesC,
        SUM(CASE WHEN ta.Nome = 'Saque' THEN 1 ELSE 0 END) AS saques,
        SUM(CASE WHEN ta.Nome = 'Ataque' THEN 1 ELSE 0 END) AS ataques,
        SUM(CASE WHEN ta.Nome = 'Bloqueio' THEN 1 ELSE 0 END) AS bloqueios
      FROM Acao a
      INNER JOIN Jogadores j ON j.id = a.Jogador_id
      LEFT JOIN TipoAcao ta ON ta.idTipoAcao = a.idTipoAcao
      INNER JOIN Partidas p ON p.id = a.Ponto_Partida_id
      WHERE p.torneio_id = ?
      GROUP BY j.id, j.nome, j.numCamisa
      ORDER BY acoesA DESC, totalAcoes DESC, j.nome ASC
      LIMIT 1
    `).get(torneioId) || null;

    return {
      torneio,
      resumo: {
        totalPartidas: jogos.length,
        finalizadas: jogos.filter((jogo) => jogo.status === 'FINALIZADA').length,
        agendadas: jogos.filter((jogo) => jogo.status !== 'FINALIZADA').length,
      },
      melhorTime: times[0] || null,
      melhorJogador,
      times,
      jogos,
    };
  });

  ipcMain.handle('relatorio:ginasio', async (_event, ginasioId) => {
    return GinasioControl.relatorioGinasio(ginasioId);
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
