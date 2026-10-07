/*
 * Gera docs/VolleyStats-Manual-do-Analista.pdf a partir de docs/manual-analista.html.
 *
 * Rode com:  npm run manual
 *
 * POR QUE ISSO E UM SCRIPT E NAO UM PASSO MANUAL
 *
 * O PDF era gerado imprimindo o HTML no navegador a mao. Como nao havia nada
 * amarrando os dois, o PDF ficou tres releases atras do sistema - descrevendo
 * uma versao sem scout do adversario e sem rotacao, que e justamente o material
 * que vai para a mao do analista. Com um comando, atualizar o manual passa a
 * ser parte de mexer no manual.
 *
 * As margens ficam AQUI, e nao no CSS, porque o `@page { margin: 0 }` do HTML
 * deixa o controle para quem imprime - era assim que o PDF original saia do
 * dialogo do Chrome. O printToPDF do Electron usa o mesmo motor (Skia/Chromium)
 * que gerou o arquivo anterior, entao o resultado e equivalente.
 *
 * CommonJS de proposito: roda pelo Electron direto, sem passar pelo Babel/Vite.
 */
const { app, BrowserWindow } = require('electron');
const fs = require('fs');
const path = require('path');

// Aceita entrada/saida por argumento, o que permite gerar uma versao de
// comparacao sem sobrescrever o manual publicado.
const [entradaArg, saidaArg] = process.argv.slice(2).filter((a) => !a.startsWith('-'));

const HTML = entradaArg || path.join(__dirname, '..', 'docs', 'manual-analista.html');
const PDF = saidaArg || path.join(__dirname, '..', 'docs', 'VolleyStats-Manual-do-Analista.pdf');

async function gerar() {
  const janela = new BrowserWindow({ show: false, width: 1200, height: 1600 });

  await janela.loadFile(HTML);

  // A versao do app entra no documento na hora de gerar. Ela estava escrita a
  // mao em tres lugares do HTML e ja tinha ficado duas versoes para tras - o
  // manual anunciava 1.0.0 enquanto o instalador entregue era outro.
  const versao = require(path.join(__dirname, '..', 'package.json')).version;
  await janela.webContents.executeJavaScript(
    'document.querySelectorAll(".versao-app").forEach(function (el) { el.textContent = '
      + JSON.stringify(versao)
      + '; }); true'
  );

  // As fontes precisam estar prontas antes de medir a pagina, senao a quebra
  // sai calculada com a fonte de fallback e o PDF ganha paginas fantasma.
  await janela.webContents.executeJavaScript('document.fonts.ready.then(() => true)');

  const pdf = await janela.webContents.printToPDF({
    pageSize: 'A4',
    printBackground: true,
    margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 },
  });

  fs.writeFileSync(PDF, pdf);

  const paginas = (pdf.toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length;
  console.log(`Manual gerado: ${PDF}`);
  console.log(`${paginas} paginas, ${(pdf.length / 1024 / 1024).toFixed(2)} MB`);

  janela.destroy();
}

app.whenReady()
  .then(gerar)
  .then(() => app.exit(0))
  .catch((erro) => {
    console.error('Falha ao gerar o manual:', erro);
    app.exit(1);
  });
