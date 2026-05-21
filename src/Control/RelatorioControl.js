const { BrowserWindow, dialog } = require('electron');
const fs = require('node:fs/promises');

class RelatorioControl {
  static #instance;

  static getInstance() {
    if (!RelatorioControl.#instance) {
      RelatorioControl.#instance = new RelatorioControl();
    }

    return RelatorioControl.#instance;
  }

  normalizarNomeArquivo(nomeArquivo) {
    const nomeSeguro = String(nomeArquivo || 'relatorio.pdf')
      .replace(/[<>:"/\\|?*]/g, '-')
      .replace(/\s+/g, '-');

    return nomeSeguro.toLowerCase().endsWith('.pdf')
      ? nomeSeguro
      : `${nomeSeguro}.pdf`;
  }

  async salvarPdf(event, payload = {}) {
    const sourceWindow = BrowserWindow.fromWebContents(event.sender);
    if (!sourceWindow) {
      throw new Error('Janela do relatorio nao encontrada.');
    }

    const nomeArquivo = typeof payload === 'string' ? payload : payload.nomeArquivo;
    const defaultPath = this.normalizarNomeArquivo(nomeArquivo);
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
  }
}

export default RelatorioControl.getInstance();
