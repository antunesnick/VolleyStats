# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Sobre o projeto

VolleyStats é um app desktop (Electron) para scout ao vivo e gestão de uma equipe de vôlei: cadastro de times, jogadores, ginásios, categorias e torneios; registro de partidas com scout por atalhos de teclado; e emissão de relatórios em PDF. Projeto acadêmico, liderado por Nickolas Antunes Almeida (ver `README.md` para a equipe e o vídeo demonstrativo).

Código, comentários e nomes de identificadores são **em português**. Mantenha essa convenção ao escrever código novo.

## Comandos

```bash
npm start              # roda o app em dev (electron-forge start)
npm test               # suíte completa (vitest run)
npm run test:watch     # vitest em modo watch
npx vitest run tests/ponto-atleta.test.js          # um arquivo
npx vitest run -t "atribui o ponto ao autor"       # um teste pelo nome
npm run package        # empacota sem gerar instalador (valida o build)
npm run make           # gera instaladores (squirrel/zip/deb/rpm)
```

Não há linter configurado.

### better-sqlite3 é nativo: o ABI tem que bater

`better-sqlite3` só carrega no ABI para o qual foi compilado, e Node e Electron usam ABIs diferentes (hoje 137 e 143). Alternar entre testar e empacotar troca o ABI nos dois sentidos, e cada comando garante o seu — nenhuma ação manual é necessária. Para forçar: `npm run rebuild:node` / `npm run rebuild:electron`.

**A armadilha que isso resolve:** o electron-rebuild grava um marcador `.forge-meta` com o ABI compilado, e o Forge **pula** a recompilação quando o marcador já bate. Um `npm rebuild` (feito pelos testes) troca o binário **sem** atualizar o marcador — o Forge confia no dado desatualizado, pula o rebuild e empacota o binário do Node. O app compila, empacota, exibe zero erros e só quebra ao abrir, na máquina de quem recebeu o instalador (`NODE_MODULE_VERSION 137 ... requires 143`). Aconteceu de verdade nesta base.

Três travas, nessa ordem:

1. **`hooks.generateAssets`** (`forge.config.js`) apaga o `.forge-meta` antes da etapa *Preparing native dependencies*. Sem marcador o Forge sempre recompila, e o marcador volta a ser verdade. **Esta é a correção principal.**
2. **`afterCopy`** confere, via `node-abi`, se o binário copiado é o do ABI do Electron e derruba o empacotamento se não for.
3. **`pretest`** (`scripts/ensureNativeBuild.js`) recompila para o Node quando encontra um binário do Electron, e apaga o marcador.

Não remova essas travas — o bug não aparece em nenhum teste, só na entrega. E não confie no `.forge-meta` como prova do ABI do binário: ele só é confiável logo após uma recompilação forçada.

**Feche o app antes de rodar os testes.** Com o VolleyStats aberto, o Electron mantém o `.node` carregado e o Windows bloqueia o arquivo: o `pretest` falha com `EBUSY: resource busy or locked` / `EPERM: operation not permitted, unlink`. Não é problema de permissão nem de instalação — é só a janela aberta.

### Empacotamento

O plugin webpack do Electron Forge cria um `node_modules` **vazio** no app, assumindo que tudo foi empacotado pelo webpack. Como `better-sqlite3` está em `externals` (não pode ser bundlado), ele precisa ser copiado à mão — é o que faz o hook `packageAfterCopy` em `forge.config.js`, junto com `bindings` e `file-uri-to-path`.

O `.node` também é mantido fora do asar (`packagerConfig.asar.unpack`), porque o Electron não carrega binário nativo de dentro do arquivo. O hook verifica se o binário chegou ao pacote e falha o build se não chegou — sem isso o erro só apareceria na máquina do usuário.

**Ao adicionar qualquer dependência nativa nova, acrescente-a a `MODULOS_EXTERNOS` em `forge.config.js`.**

### Variáveis de ambiente

| Variável | Efeito |
|---|---|
| `VOLLEYSTATS_DATA_DIR` | Diretório do banco e dos uploads. Definido automaticamente (userData quando empacotado, raiz do projeto em dev). |
| `VOLLEYSTATS_DB_PATH` | Caminho exato do arquivo `.db`. Os testes usam `:memory:`. |
| `VOLLEYSTATS_SQL_DEBUG=1` | Loga toda query SQL no console. Desligado por padrão. |
| `VOLLEYSTATS_SEED=0` | Desliga o seed de dados fictícios em desenvolvimento. |

## Testes

Vitest, em `tests/`. Cada arquivo roda em processo próprio (`pool: 'forks'`) e recebe um SQLite `:memory:` isolado — `tests/setup.js` define `VOLLEYSTATS_DB_PATH` antes de `src/db/db.js` abrir a conexão.

Use `tests/helpers/fixtures.js` para montar cenários. `resetarBanco()` no `beforeEach` dropa e recria o schema; `cenarioPartidaEscalada()` devolve uma partida com 6 titulares e 2 reservas já escalados, que é o que a maior parte dos testes de scout precisa.

Os testes cobrem: atribuição de ponto a atleta, regras de substituição, limites de escalação, regras de pontuação de set/partida, a escala de qualidade (inclusive o acordo entre a versão JS e a versão SQL), validação de encerramento de partida, métricas de scout, scout do adversário, CRUD de cadastros, cascata de exclusão de partida e cascata de exclusão de jogador.

## Arquitetura

Electron 40 + React 19 + `better-sqlite3` (síncrono), empacotado com Electron Forge + Webpack. MVC em `src/`:

```
src/config/     bootstrapPaths (1º import do main) + appPaths (caminhos graváveis)
src/main.js     processo principal: janela + handlers ipcMain
src/preload.js  injeta window.* e propaga VOLLEYSTATS_DATA_DIR ao renderer
src/View/       telas React
src/Control/    orquestração; é aqui que ficam as TRANSAÇÕES
src/Model/      entidades + SQL cru + regras de domínio
src/db/         conexão, schema, seed de demo
```

**Todo o `src/` é ESM.** Não introduza `require`/`module.exports`: sob Vite/Vitest, misturar os dois faz o mesmo arquivo ser instanciado duas vezes — o que abria **duas conexões SQLite distintas** e quebrava FKs de forma silenciosa. Foi um bug real; a unificação para ESM é o que o previne.

### ⚠️ Existem dois caminhos paralelos até o banco

A janela usa `nodeIntegration: true`, `contextIsolation: false`, `webSecurity: false` (`src/main.js`). O renderer tem Node completo, e o projeto usa as duas abordagens:

1. **Via IPC** — handlers em `main.js`, expostos como `window.api`, `window.ElectronAPI`, `window.tournamentAPI`, `window.excelAPI`, `window.reportAPI`. Cobre Partidas, Torneios, Categorias, Ginásios, Excel e Relatórios.
2. **Import direto do Control no componente React** — SQLite roda no processo de renderização.

`PlayerControl`, `PontoControl`, `TimesControl`, `EstatisticaControl`, `PositionControl`, `SubstituicaoControl`, `TimesPartidaControl` e `AcaoAdversarioControl` **não têm rota IPC**; só funcionam pelo caminho 2. E a mesma entidade é acessada pelos dois caminhos dependendo da tela (categorias via `window.ElectronAPI` em `GerenciarCategorias.js`, via `CategoriaControl` em `PlayerRanking.js`).

**Antes de corrigir um bug de dados, descubra por qual caminho aquela tela acessa o banco.** Migrar tudo para IPC é a próxima melhoria arquitetural relevante — hoje ela é viável porque a suíte de testes cobre a camada Model/Control.

### Transação é responsabilidade do Control

Models nunca abrem transação. Controls sempre abrem:

```js
const insertTransaction = db.transaction((obj) => model.insert(obj, db));
try { return insertTransaction(entidade); }
catch (error) { console.error("... Rollback.", error); throw error; }
```

### Modelo de dados do scout

20 tabelas em `src/db/db.js`. O núcleo:

```
Partidas ──< 'Set' (NumSet, Partida_id)
               └──< Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id)
                       │      + Jogador_id  (dono do ponto)
                       │      + vencedor    ('MANDANTE' | 'VISITANTE')
                       ├──< Acao         (Jogador_id, idTipoAcao, Qualidade = / - ! + #)
                       └──< Substituicao (JogadorEntra, JogadorSai)
```

**`Ponto` não tem `id`.** A chave primária é o próprio placar — um rally é "o ponto em que o placar virou 15×12 no set 2 da partida 7". `Acao` e `Substituicao` referenciam essa chave composta de 4 colunas.

Uma ação escoutada = uma linha em `Acao` = `{qual rally, qual jogador, qual tipo, qual qualidade}`. `TipoAcao` é fixo: `1=Saque, 2=Ataque, 3=Bloqueio, 4=Recepção, 5=Defesa`.

O adversário fica em **`AcaoAdversario`**, tabela separada — `Acao.Jogador_id` é `NOT NULL` e referencia `Jogadores`, e os atletas do adversário não são (nem devem ser) cadastrados. Lá o atleta é só `numCamisa`, e pode ser `NULL` (adversário não identificado). A separação é o que mantém todo relatório existente com o mesmo número: nada que conta `Acao` passa a contar o adversário. `Model/AcaoAdversario.js` + `Control/AcaoAdversarioControl.js`.

As FKs de `Acao` → `Ponto` são **nullable de propósito**: linhas vindas da importação de Excel não têm rally associado.

Armadilha de nomenclatura: `Partidas.pontosTime1/2` guarda **sets ganhos**; `Ponto.pontoTime1/2` guarda **pontos dentro do set**.

### Regra: cada ponto pertence a um atleta

`Ponto.Jogador_id` é o autor da **última ação registrada no rally** — é ele que "leva" o ponto nos relatórios.

- `Ponto.sincronizarDonoDoPonto()` regrava o dono a partir da última `Acao` existente. É chamado depois de **gravar** e depois de **excluir** uma ação, então o dono é sempre derivado do estado atual do banco, nunca de um valor que possa ficar velho.
- `Ponto.vencedor` diz quem ganhou o rally. Sem isso um erro de ataque contaria como ponto a favor do atleta. O padrão é `MANDANTE` (só se escuta a própria equipe); `ControlePartida.aplicarPonto()` corrige para `VISITANTE` quando o analista usa `Alt + ↑`.
- Relatórios consomem `Ponto.buscarPontosPorAtleta()`, que devolve `pontos` e `pontosCedidos` por atleta. `EstatisticaModel.aplicarPontosPorAtleta()` enxerta esses números em cada jogador de `buscarEstatisticasPartida()`.

Ao mexer no placar use **sempre** `aplicarPonto(side, delta)` em `ControlePartida.js` — atalhos e cliques passam por ele, e é ele que marca o vencedor do rally antes de incrementar. Escrever direto em `atualizarPlacarSet` pula essa marcação.

### Escala de qualidade: 6 níveis, no padrão DataVolley

`Model/Qualidade.js` é a fonte única da escala `= / - ! + #` (pior → melhor, teclas `1..6`). O símbolo gravado é o mesmo em todos os fundamentos, mas **o significado depende do fundamento** — por isso a classificação nunca é feita a partir do símbolo sozinho:

- `#` só encerra o rally a favor da equipe em Saque, Ataque e Bloqueio. Uma recepção `#` é perfeita e o rally continua.
- `/` é **erro** em Ataque (bloqueado) e Bloqueio (invasão), mas no Saque é uma boa bola — o adversário não montou ataque.

Quem precisa dessa decisão usa `classificar(fundamento, qualidade)` → `PONTO | ERRO | NEUTRO`; a tela do scout usa `legendaDoFundamento()`, e os relatórios resumidos usam os baldes `Ponto / Neutra / Erro`.

**Símbolo não vai para a tela nem para o relatório.** Quem lê um relatório não tem a legenda do scout na mão, então a saída é sempre por nome: `nomeQualidade(simbolo)` dá o nome genérico do nível (`= Erro`, `/ Ruim`, `- Negativa`, `! Regular`, `+ Positiva`, `# Excelente`), usado nas colunas que somam fundamentos diferentes; `rotularQualidade(fundamento, qualidade)` dá o significado dentro do fundamento (`descrever()`) e cai no nome genérico quando o fundamento não é conhecido. O símbolo cru só aparece onde ensina a digitação: o buffer do scout e a tabela do `HelpModal`.

**A mesma regra existe duas vezes**, porque parte dos relatórios agrega no SQL: `Model/SqlQualidade.js` reproduz `classificar()` como fragmento de `CASE WHEN`. Mudar uma sem a outra é o erro esperado aqui — `tests/qualidade.test.js` compara as duas em todas as 30 combinações de fundamento × símbolo e falha se divergirem.

A coluna `Acao.Qualidade` tem `CHECK` para os 6 símbolos, então gravar a letra antiga estoura no banco. `normalizarQualidade()` continua traduzindo `A → #`, `B → !`, `C → =` na **leitura** de linhas antigas.

### Regras de pontuação: `Model/RegrasSet.js`

Funções puras (placar + formato → decisão), sem banco nem tela: `pontosParaVencerSet`, `avaliarSet`, `podeIncrementar`, `avaliarPartida`. Cuidado com a armadilha que elas resolvem: **não é "set 3 e set 5 valem 15"** — só o último set do formato é de 15, então numa melhor de 5 o set 3 é um set comum de 25.

### Ciclo de vida do set

Um set só vira resultado quando é **encerrado**. `Ponto.avancarSet()` é o único caminho que fecha um set: grava o placar final, marca `Set.encerrado = 1` e regrava `Partidas.pontosTime1/2` a partir de `buscarSetsGanhos()`.

**Sets ganhos são derivados, nunca incrementados.** `buscarSetsGanhos()` conta os sets com `encerrado = 1` — por isso encerrar o mesmo set duas vezes só regrava o placar, e reabrir (`reabrirSet`) devolve a contagem correta sozinho. O contador manual que existia na tela (`atualizarSetsGanhos`, com deltas) foi removido: ele desencontrava do placar dos sets no primeiro erro de clique.

Na tela, `ControlePartida` chama `avancarSet` no botão **Encerrar set**, cria a linha do próximo set já zerada (`atualizarPlacarSet(proximo, 0, 0)`, para o set aparecer no encerramento e nos relatórios antes da primeira ação) e só então muda `currentSet`. Um set encerrado recusa ponto e ação até ser reaberto. Ao abrir uma partida, a tela cai no primeiro set em aberto — não no set 1.

Quando `avaliarPartida()` diz que a partida acabou, a tela oferece o encerramento via `window.api.partidas.finalizar(id, setsGanhos.home, setsGanhos.away)`.

### Fluxo de scout (`View/Partida/ControlePartida.js`)

Buffer de teclado em 3 estágios via `react-hotkeys-hook`:

1. Segura **Ctrl** + digita o número da camisa (`ctrl+0..9`, até 3 dígitos)
2. Solta Ctrl → tecla do fundamento: **S / A / B / R / D**
3. Tecla da qualidade: **1..6** (do erro ao ponto) → grava e limpa o buffer

Ex.: `12` + `A` + `6` grava um `#` de ataque. Placar: `Shift+↑/↓` (mandante), `Alt+↑/↓` (visitante). `Esc` limpa. Documentado ao usuário em `Partida/HelpModal.js`.

Como as teclas do estágio 3 são dígitos sem modificador e as do estágio 1 são `ctrl+dígito`, os dois handlers não colidem — o `react-hotkeys-hook` exige que os modificadores batam exatamente.

Regras de vôlei em `Model/Substituicao.js`: líbero isento, máximo 6 substituições por set, e o reserva só volta pelo titular que substituiu. `Model/Ponto.gravarPonto` valida via `TimesPartida.jogadorNaLinha` que o jogador está em quadra.

**Undo (`Ctrl+Z`)**: `ControlePartida` mantém uma pilha em memória (máx. 50) com os lances que o analista digita — a ação da equipe (`{ tipo: 'acao', acaoId }`), a ação do adversário (`{ tipo: 'acaoAdversario', acaoAdversarioId }`) e o ponto de placar (`{ tipo: 'placar', side, delta }`). Desfazer uma ação chama `removerAcao`, que já regrava o dono do ponto; desfazer um ponto passa pelo próprio `aplicarPonto` invertido, para a marcação do vencedor do rally voltar junto com o número. A pilha só desfaz lances do set aberto na tela, e morre ao fechar a tela — é um desfazer de digitação, não histórico da partida.

Os handlers do scout são memoizados por `[buffer]`, então leem set e placar de `currentSetRef`/`scoreRef`, nunca do estado da renderização — que pode estar atrasado.

Avisos durante o scout usam `mostrarAviso()` (balão flutuante no topo). O `substituicaoMessage` **só aparece dentro do modal de substituição**; não o use para recado de scout.

**Scout do adversário**: trocar `Ctrl` por `Alt` no número da camisa (`alt+0..9`) manda o lance inteiro para o outro lado da rede — mesma convenção que o placar já usa (`Shift` = mandante, `Alt` = visitante), então não há um segundo mapa de teclas. Quem decide o alvo é o **primeiro** modificador apertado; o resto do fluxo (fundamento, qualidade) é idêntico. `Alt + 0` grava como adversário não identificado. O lance vai para `AcaoAdversario` e **não** mexe em `Ponto.Jogador_id`: o dono do ponto continua sendo sempre um atleta da própria equipe.

O dígito vem de `event.code` (`Digit1`/`Numpad1`), não de `event.key`: com um modificador segurado, alguns layouts geram outro caractere.

Limitações intencionais (não são bugs): substituição e encerramento de set ficam fora do undo — os dois têm correção própria (tela de escalação e botão "Reabrir set"); e o adversário é escoutado por camisa, sem escalação, substituição ou dono de ponto.

### Navegação: híbrida rota + estado

`App.js` declara 6 rotas em `HashRouter`, mas o fluxo principal é composição de componentes aninhados:

```
Home2.js ──navigate()──> /categorias, /ginasios, /times
   └── <TournamentView>        (inline)
          └── <GerenciarPartidas>   (inline, prop isEmbedded)
                 └── <ControlePartida>   (overlay fixed z-[5000])
                        └── <EstatisticaView>   (modal)
```

O URL fica em `#/` durante todo o fluxo. O estado entre níveis trafega por `sessionStorage` (`volleystats.activePage`, `volleystats.selectedTournamentId`, `volleystats.activeMatch`) — **não há Context API nem store**. Por isso os arquivos de View são grandes (`Tournament.js` ~1780 linhas, `Home2.js` ~1820).

### Caminhos graváveis

Um app empacotado roda de dentro do asar, que é somente leitura. `src/config/appPaths.js` resolve o diretório de dados em runtime:

- **Empacotado**: `app.getPath('userData')`
- **Dev**: raiz do projeto, preservando o `developVS.db` existente

`src/config/bootstrapPaths.js` **precisa ser o primeiro import do `main.js`** — `src/db/db.js` abre a conexão no momento em que é importado. No renderer, `preload.js` recebe o mesmo diretório via `ipcRenderer.sendSync('app:getDataDir')`, porque o preload roda antes do bundle do React.

Uploads (fotos de jogadores, logos de times) vão para `getUploadsDir()` e são servidos pelo protocolo custom **`local://`** registrado em `main.js`.

### Migrações de schema: auto-cura no boot

Não há migração versionada. `db.js` roda a cada inicialização `CREATE TABLE IF NOT EXISTS` + `ensureTournamentColumns()`, `ensurePartidaColumns()`, `ensurePontoColumns()`, `ensureGinasioColumns()`, `ensureTorneioTimesSchema()`, que checam `PRAGMA table_info` e fazem `ALTER TABLE ADD COLUMN` idempotente.

**Para adicionar uma coluna, siga esse padrão**: acrescente ao `CREATE TABLE` (bancos novos) *e* a uma função `ensure*Columns` (bancos existentes). Só o `CREATE TABLE` não basta.

`resetDatabase()` (usado apenas pelos testes) dropa tudo e recria.

### Camada Model: convenções

- Alguns models importam o `db` singleton no topo (`Categoria`, `GinasioModel`, `Player`, `Times`, `Substituicao`, `EstatisticaModel`); outros recebem `db` como parâmetro (`PartidaModel`, `Ponto`, `Position`, `TimesPartida`, `Acao`, `SetPartida`). `TournamentDAO` usa injeção via construtor.
- `Tournament.js` / `TournamentDAO.js` é o único par com separação DAO real: o DAO faz SQL cru, o `Tournament` agrega em JS.
- `Times.js` e `GinasioModel.js` têm métodos em português e aliases em inglês que só delegam.
- `try { ... } catch (e) { throw e; }` inútil ainda aparece em vários métodos. Não replique.

### Estilo visual

Tailwind v4 em quase tudo — tema vermelho/preto, `#DC2626` como acento. Exceções: `PlayerView/` e `PlayerRegister/` usam styled-components (`PleayerStyles.js` — o typo no nome do arquivo está preservado nos imports).

Alertas: prefira o wrapper `src/utils/Alertas.js` (SweetAlert2). `GerenciarCategorias.js` ainda usa `Swal.fire` cru e `ControlePartida.js` usa `window.alert`/`confirm` nativos.

Sem biblioteca de gráficos — toda estatística é tabela. Não há pasta `components/` compartilhada: `StatCard`, `ReportMetric` e `PlayerAvatar` ainda estão duplicados em vários arquivos.

### Relatórios em PDF: `src/utils/relatorioPdf.js`

Toda tela que emite PDF monta HTML e chama `window.reportAPI.salvarPdf`, que renderiza numa `BrowserWindow` offscreen via `printToPDF`. O esqueleto é único:

- `escapeHtml(valor)` — **sempre** em texto vindo do banco;
- `montarDocumento({ titulo, eyebrow, subtitulo, aside, corpo })` — `<head>`, folha de estilo e cabeçalho. `subtitulo` aceita string ou lista de linhas; `aside` é o canto direito do cabeçalho (avatar do time/jogador);
- `blocoMetricas(itens, { colunas })`, `blocoDestaques(itens, { colunas })` — cartões de número e de texto;
- `blocoTabela({ titulo, colunas, linhas, vazio, compacta, estreita })` — `linhas` são `<tr>` já montados pela tela, porque as tabelas vão de 3 a 40 colunas. **O `colspan` da linha vazia é derivado de `colunas`** — antes ele era digitado à mão e já tinha desencontrado do cabeçalho. `compacta` reduz fonte e padding (o scout de 40 colunas só cabe assim); `estreita` limita a largura;
- `nomeArquivoRelatorio(...partes)` e `salvarRelatorioPdf({ nomeArquivo, html })`.

Ao criar um relatório novo, use esses blocos: não escreva `<style>` nem `escapeHtml` na tela. `tests/relatorio-pdf.test.js` cobre o módulo.

## Dívidas conhecidas

1. **Dois caminhos até o banco** (ver acima).
2. **Diálogos inconsistentes** — `Alertas` vs. `Swal.fire` vs. `window.alert`. `ControlePartida` ainda usa `alert`/`confirm` nativos.
3. `developVS.db` está versionado apesar de `*.db` estar no `.gitignore` (entrou antes da regra).
4. Sem biblioteca de gráficos: toda estatística é tabela.
