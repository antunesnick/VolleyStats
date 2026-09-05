# 🏐 VolleyStats
**PROJETO LIDERADO E GERIDO POR NICKOLAS ANTUNES ALMEIDA.**

O **VolleyStats** é uma aplicação desenvolvida com o objetivo de auxiliar no gerenciamento e análise de estatísticas de partidas de voleibol. A plataforma permite o registro de informações relevantes dos jogos, oferecendo uma visão organizada do desempenho de equipes e atletas.

O projeto foi desenvolvido como parte das atividades acadêmicas da disciplina, aplicando conceitos de desenvolvimento de software, banco de dados e organização de informações esportivas em uma solução prática e funcional.

## ✨ Principais funcionalidades

* Cadastro e gerenciamento de equipes;
* Cadastro de jogadores;
* Registro de partidas;
* Controle de estatísticas individuais e coletivas;
* Consulta de informações de desempenho;
* Interface intuitiva para acompanhamento dos dados.

## 🚀 Como executar

Requer Node.js 20+ e npm.

```bash
npm install     # instala as dependências
npm start       # abre o aplicativo
npm test        # roda a suíte de testes
npm run make    # gera o instalador em out/
```

> `better-sqlite3` é um módulo nativo e precisa ser compilado para o ABI certo:
> `npm test` compila para o Node e `npm run package` / `npm run make` compilam
> para o Electron, cada um automaticamente antes de rodar. Nenhuma ação manual
> é necessária — basta usar os scripts acima em vez de chamar as ferramentas
> diretamente.

### Onde ficam os dados

No aplicativo instalado, o banco (`developVS.db`) e as imagens enviadas ficam na
pasta de dados do usuário do sistema operacional — **não dentro do programa**.
Em desenvolvimento, ficam na raiz do projeto.

No Windows são duas pastas distintas:

| O quê | Onde |
| --- | --- |
| Dados (banco + uploads) | `%APPDATA%olleystats` |
| Programa instalado | `%LOCALAPPDATA%olleystats` |

Essa separação é o que faz a atualização preservar o histórico: o instalador só
mexe na segunda pasta.

## 📦 Como gerar o instalador para entregar

Cinco passos, do zero ao arquivo que vai para o analista:

```bash
# 1. Feche o VolleyStats. Com a janela aberta o Windows trava o .node e o build falha.
# 2. Suba a versão (patch para correção, minor para funcionalidade nova):
npm version 1.1.1 --no-git-tag-version
# 3. Garanta que nada quebrou:
npm test
# 4. Gere o instalador:
npm run make
```

O arquivo a enviar é:

```
out/make/squirrel.windows/x64/volleystats-<versão> Setup.exe
```

Só esse `.exe` — o `.nupkg` e o `RELEASES` ao lado dele servem para atualização
automática pela rede, que este projeto não usa.

Do lado do analista: fechar o VolleyStats e executar o `Setup.exe`. Não precisa
desinstalar a versão anterior, e **não deve** — desinstalar não apaga
`%APPDATA%olleystats`, mas o caminho seguro é simplesmente instalar por cima.

### Por que subir a versão importa

O instalador é do Squirrel, que identifica a atualização **pelo número da
versão**. Entregar duas builds diferentes com o mesmo número deixa a instalação
ambígua e dificulta saber, depois, qual build está na máquina do analista.
Suba a versão a cada entrega, mesmo para uma correção de uma linha.

Subir a versão **não** move a pasta de dados: ela vem do nome do app
(`name`/`productName` no `package.json`), não do número da versão. Trocar esse
nome, sim, faria o app procurar o banco em outro lugar e abrir vazio — não
troque.

### Por que o banco antigo continua servindo

O `src/db/db.js` roda a cada inicialização `CREATE TABLE IF NOT EXISTS` mais uma
série de funções `ensure*Columns`, que conferem o `PRAGMA table_info` e aplicam
`ALTER TABLE ADD COLUMN` quando falta alguma coluna. Um banco gravado por uma
versão antiga se atualiza sozinho ao abrir, sem migração manual e sem perder
linha nenhuma.

### Se o build falhar

| Sintoma | Causa |
| --- | --- |
| `EBUSY` / `EPERM` no `.node` | O VolleyStats está aberto. Feche e rode de novo. |
| `NODE_MODULE_VERSION 137 ... requires 143` ao abrir o app instalado | O binário nativo foi empacotado no ABI errado. `npm run rebuild:electron` e `npm run make` de novo. |
| Erro copiando para `out/` | Antivírus ou editor segurando a pasta. `VOLLEYSTATS_OUT_DIR=out-nova npm run make`. |

## 🏐 Scout: a quem pertence o ponto

Durante o scout, cada ponto é creditado ao autor da **última ação registrada no
rally**. Se a última ação foi um ataque do camisa 6, o ponto é do camisa 6.

O fluxo de registro é: `Ctrl` + número da camisa → tecla da ação
(**S**aque, **A**taque, **B**loqueio, **R**ecepção, **D**efesa) → qualidade
(`1` a `6`, do erro ao ponto, no padrão DataVolley). Trocando o `Ctrl` por
`Alt` no número da camisa, o lance inteiro é registrado para o adversário.
Em seguida feche o rally no placar: `Shift + ↑` se a sua equipe venceu o ponto,
`Alt + ↑` se o ponto foi do adversário.

Essa marcação é o que separa, nos relatórios, o **ponto conquistado** do
**ponto cedido** — sem ela um erro de ataque seria contado como ponto a favor do
atleta. Apenas os atletas escalados da própria equipe recebem pontos.

## 👥 Integrantes da Equipe

| Nome                         | RA        |
| ---------------------------- | --------- |
| Arthur Guarizi Gasparim      | 102418284 |
| Daniel Rodrigues Ortiz       | 102418772 |
| Jose Vitor Vernize Martos    | 102418578 |
| Nickolas Antunes Almeida     | 102419957 |
| Pedro Victor da Silva Passos | 102410178 |

## 🎥 Demonstração

Para visualizar o funcionamento completo da aplicação, acesse o [vídeo demonstrativo](https://vimeo.com/1199614751?share=copy&fl=sv&fe=ci)

## 🎯 Objetivo do Projeto

O VolleyStats foi criado para facilitar o acompanhamento e a análise de dados estatísticos em partidas de voleibol, permitindo que equipes, treinadores e organizadores tenham acesso a informações relevantes para avaliação de desempenho e tomada de decisões.
