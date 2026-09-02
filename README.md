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
pasta de dados do usuário do sistema operacional — não dentro do programa. Em
desenvolvimento, ficam na raiz do projeto.

## 🏐 Scout: a quem pertence o ponto

Durante o scout, cada ponto é creditado ao autor da **última ação registrada no
rally**. Se a última ação foi um ataque do camisa 6, o ponto é do camisa 6.

O fluxo de registro é: `Ctrl` + número da camisa → tecla da ação
(**S**aque, **A**taque, **B**loqueio, **R**ecepção, **D**efesa) → qualidade
(**A**, **B** ou **C**). Em seguida feche o rally no placar: `Shift + ↑` se a
sua equipe venceu o ponto, `Alt + ↑` se o ponto foi do adversário.

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
