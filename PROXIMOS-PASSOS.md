# VolleyStats — próximos passos

Plano de evolução até um scout profissional, no espírito do DataVolley 4.
Escrito em 01/09/2026, depois da migração da escala de qualidade, da correção do ciclo de sets e da unificação dos relatórios em PDF.

Escala de esforço: **P** = uma sessão · **M** = duas a três sessões · **G** = uma semana ou mais.

---

## 1. Onde o projeto está hoje

O que já funciona de verdade:

- Scout ao vivo por atalhos, com a escala de 6 níveis do DataVolley (`= / - ! + #`) e legenda por fundamento na tela.
- Ciclo de set completo: encerrar, reabrir, sets ganhos derivados do banco e finalização automática da partida.
- Undo (`Ctrl+Z`) da ação e do ponto de placar.
- Regras de vôlei isoladas e testadas (`Model/RegrasSet.js`, `Model/Qualidade.js`, `Model/Substituicao.js`).
- Relatórios em PDF com um esqueleto único (`utils/relatorioPdf.js`).
- 161 testes automatizados cobrindo Model e Control.

Base de dados: 18 tabelas em `src/db/db.js`. O núcleo do scout é `Partidas → Set → Ponto → Acao`.

---

## 2. O que separa do DataVolley 4

A diferença não é de acabamento, é de **modelo de dados**. O DataVolley registra *onde* e *como* cada bola aconteceu; o VolleyStats registra *quem* e *quão bem*.

| Área | DataVolley 4 | VolleyStats hoje | Peso |
|---|---|---|---|
| Código de scout | jogador + fundamento + qualidade + **tipo de bola + zona de origem + zona de destino + jogada** | jogador + fundamento + qualidade | 🔴 alto |
| Rotação | posições P1–P6, rodízio automático, controle de líbero em quadra | escalação sem rotação | 🔴 alto |
| Equipes | escouta as duas | só a própria | 🔴 alto |
| Estatística | side-out, break point, K1/K2, eficiência **por rotação** | totais e por set | 🟡 médio |
| Vídeo | scout sincronizado por timecode, revisão lance a lance | só um link salvo na partida | 🟡 médio |
| Interrupções | tempos, tempos técnicos, cartões e sanções | não existem | 🟡 médio |
| Visualização | gráficos, mapas de calor, distribuição por zona | tudo em tabela | 🟢 baixo |
| Interoperabilidade | arquivo `.dvw` padrão do mercado | Excel próprio + PDF | 🟢 baixo |

---

## 3. Plano por fases

### Fase 1 — Fechar o que já foi começado (esforço P/M)

Coisas pequenas que hoje incomodam mais do que parecem.

**1.1 Diálogos nativos no scout** · P
`ControlePartida.js` ainda usa `window.alert` e `window.confirm`. No meio de uma partida, uma caixa cinza do Windows trava o teclado e quebra o ritmo do scout. Trocar pelo wrapper `utils/Alertas.js` (SweetAlert2) — e onde for só aviso, usar o toast `mostrarAviso()` que já existe na tela.
Cuidado: `confirm` é síncrono e `Alertas` é assíncrono; os handlers viram `async`.

**1.2 `GerenciarCategorias.js` usa `Swal.fire` cru** · P
Última tela fora do padrão. Passar para `Alertas`.

**1.3 Redo (`Ctrl+Shift+Z`)** · P
A pilha de undo já existe em `ControlePartida.js`. Falta a pilha inversa e limpá-la quando um lance novo é registrado.

**1.4 Linter** · P
Não há nenhum. Um ESLint com `eslint-plugin-react-hooks` pegaria a classe de bug que já apareceu duas vezes aqui: dependências erradas em `useHotkeys`/`useEffect` deixando estado velho no closure.

**1.5 Backup e restauração do banco** · P
Um app de scout guarda o trabalho de uma temporada inteira num arquivo só. Exportar/importar o `.db` pelo menu resolve, e é meia hora de trabalho.

---

### Fase 2 — Rotação e posições em quadra (esforço G) — **a mudança de maior impacto**

Sem rotação não existe estatística por rotação, e é ela que técnico usa para decidir escalação e ordem de saque.

O que muda:

- **Schema**: `TimesPartida` (ou uma tabela nova `EscalacaoSet`) passa a guardar a posição P1–P6 de cada atleta **por set**, mais quem começou sacando.
- **Model**: um `Rotacao.js` puro, no estilo do `RegrasSet.js` — recebe a escalação inicial e a sequência de pontos, devolve a rotação corrente. Rodízio acontece quando a equipe **recupera** o saque, nunca quando mantém.
- **Regra**: com rotação dá para validar o que hoje passa batido — atleta de trás atacando à frente da linha de 3 m, líbero em posição de frente, ordem de saque errada.
- **Tela**: a quadra em `ControlePartida.js` já desenha 6 posições (`VolleyballCourt`); passaria a refletir a rotação real em vez de uma formação fixa.
- **Relatório**: eficiência de side-out por rotação — a tabela que todo técnico abre primeiro.

Ordem sugerida: schema → `Rotacao.js` com testes → tela → relatório. O `Rotacao.js` isolado e testado é o que torna o resto seguro.

---

### Fase 3 — Código de scout completo (esforço G)

Hoje uma ação é `{jogador, fundamento, qualidade}`. O DataVolley grava também:

- **zona de origem e de destino** (quadra dividida em 1–9);
- **tipo de bola** (no ataque: tempo 1, 2, 3, pipe, segunda linha);
- **jogada/combinação**.

O que muda:

- `Acao` ganha colunas `zonaOrigem`, `zonaDestino`, `tipoBola` — todas **nullable**, porque as ações já gravadas não têm essa informação (mesmo raciocínio das FKs nullable da importação de Excel).
- Seguir o padrão de migração do projeto: acrescentar ao `CREATE TABLE` **e** a uma função `ensure*Columns` em `db.js`.
- O buffer de teclado ganha estágios opcionais: `12 A # 4 6` = camisa 12, ataque, ponto, da zona 4 para a zona 6. Opcional é a palavra-chave — quem quiser scout rápido continua parando na qualidade.
- Uma quadra clicável ao lado do buffer resolve para quem não decora as zonas.

Ganho direto: distribuição de ataque por zona, eficiência por zona de saque, mapa de recepção — as tabelas que hoje não têm como existir.

---

### Fase 4 — Escoutar as duas equipes (esforço M/G)

Hoje `Ponto.vencedor` já distingue ponto conquistado de ponto cedido, mas as ações só existem para a nossa equipe.

- `Acao` já tem `Jogador_id`; falta o adversário existir como elenco na partida (`TimesPartida` do time 2 é criado mas não usado no scout).
- O buffer precisa de um prefixo de equipe (o DataVolley usa `a`/`*` antes do número).
- Todos os relatórios passam a filtrar por equipe.

Depende da Fase 2 se a rotação do adversário também for registrada.

---

### Fase 5 — Estatística de nível profissional (esforço M)

Com rotação e zonas no banco, o que falta é só cálculo:

- **Side-out %** (ponto na primeira bola após recepção) e **break point %** — os dois números que decidem set.
- **K1/K2** (complexo I e II) separados.
- **Eficiência por rotação** (6 linhas por set).
- **Sequência de pontos** (runs) — quantos pontos seguidos, e em que rotação.

Tudo isso cabe em `EstatisticaModel.js` seguindo o padrão de `finalizarScout()`, e é altamente testável — deve nascer com teste, como as regras de set nasceram.

---

### Fase 6 — Vídeo sincronizado (esforço G)

`Partidas.videoLink` já existe. Falta gravar o **timecode** de cada rally (`Ponto.tempoVideo`) e um player que pule para o lance ao clicar na ação no painel lateral.

É o recurso que mais impressiona em demonstração e o que mais ajuda o atleta a entender o próprio erro. Mas depende de o vídeo estar acessível localmente ou por URL estável — vale checar antes com quem filma os jogos.

---

### Fase 7 — Interrupções e súmula (esforço M)

Tempos, tempos técnicos, cartões e sanções. Duas tabelas novas ligadas ao rally, no mesmo padrão de `Substituicao`. Fecha o caminho para gerar a **súmula oficial** da partida em PDF — que o módulo `utils/relatorioPdf.js` já sabe montar.

---

### Fase 8 — Visualização (esforço M)

Nenhum gráfico no app hoje. Com zonas registradas, o que vale a pena:

- mapa de calor de ataque e de saque na quadra (SVG puro resolve, sem dependência nova);
- barra de evolução do placar ao longo do set;
- comparativo de rotação.

Fica por último de propósito: gráfico sem os dados das Fases 2 e 3 não tem o que mostrar.

---

## 4. Dívidas técnicas que atrapalham o caminho

| Dívida | Por que atrapalha | Esforço |
|---|---|---|
| **Dois caminhos até o banco** (IPC vs. import direto do Control no React) | Antes de corrigir qualquer bug de dados é preciso descobrir por qual caminho a tela acessa o banco. Sete Controls não têm rota IPC. Migrar tudo para IPC é viável hoje porque a suíte cobre Model/Control. | G |
| **Sem migração versionada** | `db.js` se auto-cura com `ensure*Columns`. Funciona, mas as Fases 2 e 3 acrescentam várias colunas — uma tabela de versão de schema evita erro silencioso. | M |
| **Arquivos de View gigantes** (`Tournament.js` ~1780 linhas, `Home2.js` ~1900) | Estado trafega por `sessionStorage`, sem Context nem store. Cada tela nova aumenta o problema. | G |
| **`developVS.db` versionado** | Entrou antes do `.gitignore`. Cada execução suja o `git status`. | P |
| **Sem teste de UI** | 161 testes, nenhum de componente. Os dois últimos bugs (aviso invisível, logo sobreposto) eram de View e passariam por qualquer suíte atual. | M |

---

## 5. Se eu tivesse que escolher a ordem

1. **Fase 1 inteira** — é rápida e tira o incômodo diário.
2. **Fase 2 (rotação)** — é a fundação. Sem ela, metade da estatística profissional não tem como existir.
3. **Fase 5 (side-out, break point, por rotação)** — colhe o valor da Fase 2 com pouco esforço.
4. **Fase 3 (zonas)** — a segunda fundação, e o que abre a Fase 8.
5. O resto conforme a necessidade real do time.

**Regra que vem valendo neste projeto:** regra de vôlei nasce como função pura em `src/Model/`, com teste, antes de encostar na tela. `RegrasSet.js` e `Qualidade.js` foram feitos assim e é por isso que o ciclo de set e a escala de qualidade puderam mudar sem quebrar nada.

---

## 6. Anotações da sessão de hoje

- Corrigido: o wordmark "VolleyStats" era sobreposto pelos botões do menu. O bloco da marca encolhia (`flex-shrink` padrão), o texto vazava da caixa e os botões — que vêm depois no DOM — eram pintados por cima. Agora o header usa `flex-wrap` e a marca é `shrink-0`; o menu quebra para uma segunda linha em janela estreita. Mesmo ajuste aplicado ao header de `Tournament.js`, que tinha o mesmo padrão com nome de torneio longo.
- **Falta testar na interface**: gerar um PDF de cada tipo (partida, jogador, time, torneio, categorias, ginásio) para conferir o visual depois da unificação, e o `Ctrl+Z` durante um scout ao vivo.
- Lembrete: feche o app antes de rodar `npm test` — com a janela aberta o Windows trava o `better_sqlite3.node` e o rebuild falha com `EBUSY`/`EPERM`.
