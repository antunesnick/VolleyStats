/*
 * Popula o developVS.db com um cenario de demonstracao completo.
 *
 * Rode com:  npm run seed:demo
 *
 * Serve para mostrar o sistema funcionando sem precisar cadastrar nada a mao:
 * um elenco de 12 atletas com as posicoes certas, um torneio, e tres partidas
 * em estagios diferentes - uma finalizada com scout completo (para os
 * relatorios terem numero), uma em andamento pronta para escoutar ao vivo, e
 * uma agendada para mostrar o fluxo desde a escalacao.
 *
 * TUDO passa pelos Controls do proprio sistema, nao por INSERT cru. E o que
 * garante que a rotacao, o dono do ponto e os sets ganhos fiquem coerentes -
 * um seed que escreve direto no banco produz um estado que o app nunca
 * produziria, e ai a demo mente.
 *
 * O banco antigo e salvo como developVS.db.bak antes de qualquer coisa.
 */
import fs from 'fs';
import path from 'path';

import db from '../src/db/db.js';
import PontoControl from '../src/Control/PontoControl.js';
import EscalacaoSetControl from '../src/Control/EscalacaoSetControl.js';
import AcaoAdversarioControl from '../src/Control/AcaoAdversarioControl.js';
import TimesPartida from '../src/Model/TimesPartida.js';
import Ponto from '../src/Model/Ponto.js';
import { LADO, ZONAS_REDE } from '../src/Model/Rotacao.js';

// ---------------------------------------------------------------- utilidades

/**
 * Gerador pseudo-aleatorio com semente fixa.
 *
 * A demo precisa ser a MESMA toda vez: se os numeros mudassem a cada execucao,
 * qualquer print ou roteiro de apresentacao ficaria desatualizado.
 */
let semente = 20260905;
const aleatorio = () => {
  semente = (semente * 1664525 + 1013904223) % 4294967296;
  return semente / 4294967296;
};
const escolher = (lista) => lista[Math.floor(aleatorio() * lista.length)];
const sorteio = (probabilidade) => aleatorio() < probabilidade;

const TIPO = { SAQUE: 1, ATAQUE: 2, BLOQUEIO: 3, RECEPCAO: 4, DEFESA: 5 };

// ------------------------------------------------------------------ cadastros

const inserirCategoria = (nome, idadeMin, idadeMax) =>
  Number(db.prepare('INSERT INTO Categorias (nome, idadeMin, idadeMax) VALUES (?, ?, ?)')
    .run(nome, idadeMin, idadeMax).lastInsertRowid);

const inserirGinasio = (nome, cidade, endereco) =>
  Number(db.prepare('INSERT INTO Ginasios (nome, estado, cidade, endereco) VALUES (?, ?, ?, ?)')
    .run(nome, 'SP', cidade, endereco).lastInsertRowid);

const inserirTime = (nome, cidade) =>
  Number(db.prepare('INSERT INTO Times (nome, cidade) VALUES (?, ?)').run(nome, cidade).lastInsertRowid);

const inserirTorneio = (nome, tipo, inicio, termino) =>
  Number(db.prepare('INSERT INTO Torneios (nome, tipo, inicio, termino) VALUES (?, ?, ?, ?)')
    .run(nome, tipo, inicio, termino).lastInsertRowid);

const idPosicao = (nome) => db.prepare('SELECT id FROM Posicoes WHERE nome = ?').get(nome).id;

const inserirJogador = ({ nome, numCamisa, posicao, altura, dataNasc, categoriaId }) =>
  Number(db.prepare(`
    INSERT INTO Jogadores (nome, dataNasc, numCamisa, altura, posicao_id, categoria_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(nome, dataNasc, numCamisa, altura, idPosicao(posicao), categoriaId).lastInsertRowid);

const inserirPartida = ({ nome, data, status, time1, time2, torneioId, ginasioId, setsParaVencer = 3 }) =>
  Number(db.prepare(`
    INSERT INTO Partidas
      (nome, dataPartida, tipo, status, externa, pontosTime1, pontosTime2, setsParaVencer, torneio_id, ginasio_id, time1, time2)
    VALUES (?, ?, 1, ?, 0, 0, 0, ?, ?, ?, ?, ?)
  `).run(nome, data, status, setsParaVencer, torneioId, ginasioId, time1, time2).lastInsertRowid);

// ------------------------------------------------------------------- cenario

console.log('Preparando o cenario de demonstracao...\n');

const caminhoDb = path.resolve('developVS.db');
if (fs.existsSync(caminhoDb)) {
  fs.copyFileSync(caminhoDb, `${caminhoDb}.bak`);
  console.log(`Banco anterior salvo em ${caminhoDb}.bak`);
}

db.resetDatabase();

const catAdulto = inserirCategoria('Adulto', 18, 40);
inserirCategoria('Sub-21', 18, 21);
inserirCategoria('Sub-17', 15, 17);

const ginPrudente = inserirGinasio('Ginásio Municipal', 'Presidente Prudente', 'Av. Coronel Marcondes, 1000');
const ginBauru = inserirGinasio('Ginásio Panela de Pressão', 'Bauru', 'Rua Rio Branco, 250');
inserirGinasio('Ginásio José Liberatti', 'Osasco', 'Av. dos Autonomistas, 4000');

// O nome importa: a tela de scout so abre para partidas do "Vôlei Prudente".
const nosso = inserirTime('Vôlei Prudente', 'Presidente Prudente');
const bauru = inserirTime('Sesi Bauru', 'Bauru');
const osasco = inserirTime('Osasco Vôlei', 'Osasco');
const campinas = inserirTime('Campinas Vôlei', 'Campinas');

[nosso, bauru, osasco, campinas].forEach((time) => {
  db.prepare('INSERT OR IGNORE INTO TimesCategorias (Times_id, Categorias_id) VALUES (?, ?)')
    .run(time, catAdulto);
});

const torneio = inserirTorneio('Campeonato Paulista 2026', 1, '2026-03-01', '2026-06-30');
[nosso, bauru, osasco, campinas].forEach((time) => {
  db.prepare('INSERT OR IGNORE INTO TorneioTimes (Torneio_idTorneio, Times_id) VALUES (?, ?)')
    .run(torneio, time);
});

/*
 * 12 atletas, com a composicao que um 5-1 de verdade exige:
 * 2 levantadores (o titular e o reserva da dupla substituicao), 2 opostos
 * (idem), 4 ponteiros, 3 centrais e 1 libero.
 */
const ELENCO = [
  { numCamisa: 1, nome: 'Caio Góes', posicao: 'Levantador', altura: 1.88 },
  { numCamisa: 2, nome: 'Gustavo Uyema', posicao: 'Ponteiro', altura: 1.92 },
  { numCamisa: 3, nome: 'Nickolas Antunes', posicao: 'Central', altura: 2.01 },
  { numCamisa: 4, nome: 'Pedro Henrique', posicao: 'Ponteiro', altura: 1.94 },
  { numCamisa: 5, nome: 'João Ricardo', posicao: 'Oposto', altura: 1.98 },
  { numCamisa: 6, nome: 'Rafael Lima', posicao: 'Central', altura: 2.03 },
  { numCamisa: 7, nome: 'Bruno Alves', posicao: 'Levantador', altura: 1.85 },
  { numCamisa: 8, nome: 'Diego Martins', posicao: 'Oposto', altura: 1.96 },
  { numCamisa: 9, nome: 'Lucas Ferreira', posicao: 'Líbero', altura: 1.79 },
  { numCamisa: 10, nome: 'Thiago Souza', posicao: 'Ponteiro', altura: 1.9 },
  { numCamisa: 11, nome: 'Marcelo Dias', posicao: 'Central', altura: 1.99 },
  { numCamisa: 12, nome: 'André Rocha', posicao: 'Ponteiro', altura: 1.93 },
];

const atletas = {};
ELENCO.forEach((atleta, indice) => {
  const id = inserirJogador({
    ...atleta,
    dataNasc: `${1996 + (indice % 8)}-0${1 + (indice % 9)}-1${indice % 10}`,
    categoriaId: catAdulto,
  });
  atletas[atleta.numCamisa] = { id, ...atleta };
  db.prepare('INSERT OR IGNORE INTO JogadoresTimes (Jogadores_id, Times_id, Categorias_id) VALUES (?, ?, ?)')
    .run(id, nosso, catAdulto);
});

const porCamisa = (n) => atletas[n];

// Os 6 que rodam, na ordem das zonas Z1..Z6, e o banco.
const TITULARES_ZONAS = [1, 2, 3, 5, 4, 6]; // levantador na Z1, oposto na Z4 (diagonal)
const BANCO = [7, 8, 9, 10, 11, 12];

console.log(`Elenco: ${ELENCO.length} atletas do Vôlei Prudente.`);

// ------------------------------------------------------- montagem das partidas

/**
 * Grava quem esta em quadra e quem esta no banco.
 *
 * Precisa ser refeito depois de cada substituicao: `gravarPonto` recusa atleta
 * que nao esta na linha, entao sem isso o scout pararia no primeiro lance de
 * quem acabou de entrar - o mesmo cuidado que a tela tem.
 */
function escalar(partidaId, emQuadra = TITULARES_ZONAS) {
  const banco = ELENCO.map((a) => a.numCamisa).filter((n) => !emQuadra.includes(n));

  TimesPartida.salvarEscalacao({
    timesId: nosso,
    partidaId,
    jogadores: [
      ...emQuadra.map((n) => ({ jogadorId: porCamisa(n).id, linha: 1 })),
      ...banco.map((n) => ({ jogadorId: porCamisa(n).id, linha: 0 })),
    ],
  }, db);
}

const camisaPorId = () => {
  const mapa = new Map();
  Object.values(atletas).forEach((a) => mapa.set(a.id, a.numCamisa));
  return mapa;
};

/** Declara a formacao por zona do set. `giro` muda por onde o set comeca. */
function declararFormacao(partidaId, numSet, giro = 0, sacaPrimeiro = LADO.MANDANTE) {
  const zonas = TITULARES_ZONAS.map((camisa, indice) => {
    const zonaBase = indice + 1;
    // Gira a formacao inteira: e o que uma equipe faz para escolher por onde
    // comecar cada set.
    let zona = zonaBase;
    for (let i = 0; i < giro; i += 1) zona = zona === 1 ? 6 : zona - 1;
    return { zona, jogadorId: porCamisa(camisa).id, levantador: indice === 0 ? 1 : 0 };
  });

  EscalacaoSetControl.getInstance().salvar({ partidaId, numSet, zonas, sacaPrimeiro });
}

const ATACANTES = [2, 4, 5, 10, 12];
const CENTRAIS = [3, 6, 11];
const RECEPTORES = [2, 4, 10];

/** Uma sequencia de acoes plausivel para um rally, terminando no resultado. */
function acoesDoRally({ ganhamos, recebendo, emQuadra }) {
  const disponivel = (lista) => lista.filter((n) => emQuadra.includes(n));
  const atacante = escolher(disponivel(ATACANTES).length ? disponivel(ATACANTES) : emQuadra);
  const central = escolher(disponivel(CENTRAIS).length ? disponivel(CENTRAIS) : emQuadra);
  const receptor = escolher(disponivel(RECEPTORES).length ? disponivel(RECEPTORES) : emQuadra);

  const acoes = [];

  if (recebendo) {
    acoes.push({ camisa: receptor, tipo: TIPO.RECEPCAO, qualidade: escolher(['#', '+', '+', '!', '-']) });
  } else {
    acoes.push({ camisa: escolher(emQuadra), tipo: TIPO.SAQUE, qualidade: escolher(['+', '!', '-', '/']) });
  }

  if (sorteio(0.35)) {
    acoes.push({ camisa: escolher(emQuadra), tipo: TIPO.DEFESA, qualidade: escolher(['+', '!', '-']) });
  }

  // A ultima acao define o dono do ponto, entao ela precisa combinar com o
  // resultado do rally - senao o relatorio credita ponto a quem errou.
  if (ganhamos) {
    if (sorteio(0.25)) {
      acoes.push({ camisa: central, tipo: TIPO.BLOQUEIO, qualidade: '#' });
    } else {
      acoes.push({ camisa: atacante, tipo: TIPO.ATAQUE, qualidade: '#' });
    }
  } else if (sorteio(0.55)) {
    // Perdemos por erro nosso: o ultimo toque foi um ataque errado ou bloqueado.
    acoes.push({ camisa: atacante, tipo: TIPO.ATAQUE, qualidade: escolher(['=', '/']) });
  }
  // Nos outros casos o ponto foi do adversario sem erro nosso: nenhuma acao
  // nossa fecha o rally, e o lance do adversario e registrado a parte.

  return acoes;
}

/**
 * Escouta um set inteiro ate o placar final informado.
 *
 * Segue exatamente o caminho da tela: grava as acoes do rally, marca o vencedor
 * e so entao avanca o placar.
 */
function escoutarSet({ partida, numSet, placarFinal, emQuadra: quadraInicial, usarDuplaSub = false }) {
  const control = PontoControl.getInstance();
  const escalacao = EscalacaoSetControl.getInstance();
  const adversario = AcaoAdversarioControl.getInstance();
  const dados = { id: partida.id, time1: partida.time1, time2: partida.time2 };
  const paraCamisa = camisaPorId();

  let emQuadra = [...quadraInicial];
  let home = 0;
  let away = 0;
  let sacando = escalacao.buscarSacaPrimeiro(partida.id, numSet);
  // Uma dupla por set: aplicar e desfazer ja consome 4 das 6 substituicoes, e
  // o titular so pode voltar uma vez.
  let duplaFeita = false;

  /** Aplica ou desfaz a dupla e mantem a linha em quadra em dia. */
  const moverDupla = () => {
    const sugestao = escalacao.sugerirDuplaSubstituicao(
      partida.id,
      numSet,
      ELENCO.map((a) => a.numCamisa)
        .filter((n) => !emQuadra.includes(n))
        .map((n) => ({ id: porCamisa(n).id }))
    );

    if (!sugestao || !sugestao.trocaAncora.jogadorEntra || !sugestao.trocaDiagonal.jogadorEntra) {
      return false;
    }

    const resultado = escalacao.registrarDuplaSubstituicao({
      partidaId: partida.id,
      numSet,
      pontoTime1: home,
      pontoTime2: away,
      trocas: [sugestao.trocaAncora, sugestao.trocaDiagonal],
    });

    if (!resultado.success) return false;

    [sugestao.trocaAncora, sugestao.trocaDiagonal].forEach((troca) => {
      const sai = paraCamisa.get(Number(troca.jogadorSai));
      const entra = paraCamisa.get(Number(troca.jogadorEntra));
      emQuadra = emQuadra.map((n) => (n === sai ? entra : n));
    });

    escalar(partida.id, emQuadra);
    return true;
  };

  while (home < placarFinal.home || away < placarFinal.away) {
    // Distribui as vitorias ao longo do set em vez de empilhar no fim.
    const faltamNossos = placarFinal.home - home;
    const faltamDeles = placarFinal.away - away;
    const ganhamos = faltamDeles <= 0 ? true : faltamNossos <= 0 ? false : sorteio(faltamNossos / (faltamNossos + faltamDeles));

    const recebendo = sacando === LADO.VISITANTE;

    acoesDoRally({ ganhamos, recebendo, emQuadra }).forEach((acao) => {
      control.gravarPonto(
        dados,
        numSet,
        home,
        away,
        porCamisa(acao.camisa),
        { idTipoAcao: acao.tipo },
        acao.qualidade
      );
    });

    // Scout do adversario: nem todo rally, para o resumo ficar realista.
    if (sorteio(0.45)) {
      adversario.gravar({
        partidaId: partida.id,
        numSet,
        pontoTime1: home,
        pontoTime2: away,
        numCamisa: sorteio(0.15) ? null : escolher([1, 4, 7, 9, 11, 13, 17]),
        idTipoAcao: escolher([TIPO.SAQUE, TIPO.ATAQUE, TIPO.BLOQUEIO]),
        qualidade: ganhamos ? escolher(['=', '/', '-']) : escolher(['#', '#', '+']),
      });
    }

    control.definirVencedorRally(
      partida.id,
      numSet,
      home,
      away,
      ganhamos ? LADO.MANDANTE : LADO.VISITANTE
    );

    if (ganhamos) home += 1;
    else away += 1;
    control.atualizarPlacarSet(partida.id, numSet, home, away);

    sacando = ganhamos ? LADO.MANDANTE : LADO.VISITANTE;

    // O tecnico dobra quando o levantador chega a rede e desfaz quando ele
    // volta ao fundo. E o que enche o corte "com dupla x sem dupla" do
    // relatorio - sem isso a linha mais interessante dele fica zerada.
    if (usarDuplaSub && home < placarFinal.home && away < placarFinal.away) {
      const estados = Ponto.buscarEstadosDeRotacao(partida.id, numSet, db);
      const atual = estados[estados.length - 1];

      if (atual) {
        const naRede = ZONAS_REDE.includes(Number(atual.rotacao));

        if (naRede && !atual.duplaSub && !duplaFeita) {
          duplaFeita = moverDupla();
        } else if (!naRede && atual.duplaSub) {
          moverDupla();
        }
      }
    }
  }
}

// ------------------------------------------- Partida 1: finalizada, 3 x 1

const partida1 = {
  id: inserirPartida({
    nome: 'Vôlei Prudente x Sesi Bauru',
    data: '2026-03-14',
    status: 'FINALIZADA',
    time1: nosso,
    time2: bauru,
    torneioId: torneio,
    ginasioId: ginPrudente,
  }),
  time1: nosso,
  time2: bauru,
};

escalar(partida1.id);

const SETS_PARTIDA_1 = [
  { placar: { home: 25, away: 21 }, giro: 0, saca: LADO.MANDANTE },
  { placar: { home: 23, away: 25 }, giro: 2, saca: LADO.VISITANTE },
  { placar: { home: 25, away: 18 }, giro: 4, saca: LADO.MANDANTE },
  { placar: { home: 25, away: 22 }, giro: 1, saca: LADO.VISITANTE },
];

SETS_PARTIDA_1.forEach((set, indice) => {
  const numSet = indice + 1;
  declararFormacao(partida1.id, numSet, set.giro, set.saca);
  escoutarSet({
    partida: partida1,
    numSet,
    placarFinal: set.placar,
    emQuadra: TITULARES_ZONAS,
    // Nos dois primeiros sets a equipe dobra; nos outros nao. E o que permite
    // comparar as duas situacoes no relatorio.
    usarDuplaSub: numSet <= 2,
  });

  // O proximo set comeca com os titulares de volta.
  escalar(partida1.id);
  PontoControl.getInstance().avancarSet(partida1.id, numSet, set.placar.home, set.placar.away);
});

db.prepare("UPDATE Partidas SET status = 'FINALIZADA' WHERE id = ?").run(partida1.id);
console.log('Partida 1 (finalizada): Vôlei Prudente 3 x 1 Sesi Bauru — scout e rotação completos.');

// -------------------------------- Partida 2: em andamento, pronta para scout

const partida2 = {
  id: inserirPartida({
    nome: 'Vôlei Prudente x Osasco Vôlei',
    data: '2026-04-18',
    status: 'EM_ANDAMENTO',
    time1: nosso,
    time2: osasco,
    torneioId: torneio,
    ginasioId: ginPrudente,
  }),
  time1: nosso,
  time2: osasco,
};

escalar(partida2.id);

// Set 1 fechado, set 2 em andamento: e o estado em que a demo fica mais
// interessante - ja tem numero para mostrar e ainda da para escoutar ao vivo.
declararFormacao(partida2.id, 1, 0, LADO.MANDANTE);
escoutarSet({ partida: partida2, numSet: 1, placarFinal: { home: 25, away: 19 }, emQuadra: TITULARES_ZONAS });
PontoControl.getInstance().avancarSet(partida2.id, 1, 25, 19);

declararFormacao(partida2.id, 2, 3, LADO.VISITANTE);
escoutarSet({ partida: partida2, numSet: 2, placarFinal: { home: 14, away: 11 }, emQuadra: TITULARES_ZONAS });

// Uma dupla substituicao em vigor, para o indicador e o relatorio mostrarem o
// corte "com dupla x sem dupla" logo de cara.
const dupla = EscalacaoSetControl.getInstance().sugerirDuplaSubstituicao(
  partida2.id,
  2,
  BANCO.map((n) => ({ id: porCamisa(n).id }))
);

if (dupla && !dupla.desfazendo && dupla.trocaAncora.jogadorEntra && dupla.trocaDiagonal.jogadorEntra) {
  const resultado = EscalacaoSetControl.getInstance().registrarDuplaSubstituicao({
    partidaId: partida2.id,
    numSet: 2,
    pontoTime1: 14,
    pontoTime2: 11,
    trocas: [dupla.trocaAncora, dupla.trocaDiagonal],
  });
  console.log(
    resultado.success
      ? '  · dupla substituição registrada no set 2 (levantador na rede)'
      : `  · dupla substituição não aplicada: ${resultado.message}`
  );
}

console.log('Partida 2 (em andamento): set 1 fechado 25x19, set 2 em 14x11 — pronta para escoutar.');

// ------------------------------------ Partida 3: agendada, so com escalação

const partida3 = inserirPartida({
  nome: 'Vôlei Prudente x Campinas Vôlei',
  data: '2026-05-09',
  status: 'AGENDADA',
  time1: nosso,
  time2: campinas,
  torneioId: torneio,
  ginasioId: ginBauru,
});

escalar(partida3);
console.log('Partida 3 (agendada): escalação pronta, sem formação — mostra o fluxo do zero.');

// Uma partida entre outros times, para o torneio ter tabela de verdade.
const partida4 = inserirPartida({
  nome: 'Sesi Bauru x Osasco Vôlei',
  data: '2026-04-02',
  status: 'FINALIZADA',
  time1: bauru,
  time2: osasco,
  torneioId: torneio,
  ginasioId: ginBauru,
});
db.prepare('UPDATE Partidas SET pontosTime1 = 3, pontosTime2 = 1 WHERE id = ?').run(partida4);

// -------------------------------------------------------------------- resumo

const conta = (tabela) => db.prepare(`SELECT COUNT(*) c FROM "${tabela}"`).get().c;

console.log('\nPronto.');
console.log(`  jogadores ....... ${conta('Jogadores')}`);
console.log(`  partidas ........ ${conta('Partidas')}`);
console.log(`  rallies ......... ${conta('Ponto')}`);
console.log(`  ações da equipe . ${conta('Acao')}`);
console.log(`  ações do rival .. ${conta('AcaoAdversario')}`);
console.log(`  formações ....... ${conta('EscalacaoSet')} (${conta('EscalacaoSet') / 6} sets com rotação)`);
console.log('\nRode `npm start` e abra o torneio "Campeonato Paulista 2026".');
