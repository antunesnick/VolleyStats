import db from '../../src/db/db';

/**
 * Fixtures minimas para os testes de dominio.
 *
 * Usam INSERT direto de proposito: o objetivo e montar um cenario valido em uma
 * linha, sem depender das camadas que estao sendo testadas.
 */

let contador = 0;
const proximo = () => (contador += 1);

/** Zera o banco entre testes. Chame no beforeEach. */
export function resetarBanco() {
  contador = 0;
  db.resetDatabase();
}

export function criarCategoria({ nome = 'Adulto', idadeMin = 18, idadeMax = 40 } = {}) {
  const info = db
    .prepare('INSERT INTO Categorias (nome, idadeMin, idadeMax) VALUES (?, ?, ?)')
    .run(nome, idadeMin, idadeMax);
  return info.lastInsertRowid;
}

export function criarGinasio({ nome, estado = 'SP', cidade = 'Presidente Prudente', endereco = 'Rua A, 1' } = {}) {
  const info = db
    .prepare('INSERT INTO Ginasios (nome, estado, cidade, endereco) VALUES (?, ?, ?, ?)')
    .run(nome || `Ginasio ${proximo()}`, estado, cidade, endereco);
  return info.lastInsertRowid;
}

export function criarTime({ nome, cidade = 'Presidente Prudente' } = {}) {
  const info = db
    .prepare('INSERT INTO Times (nome, cidade) VALUES (?, ?)')
    .run(nome || `Time ${proximo()}`, cidade);
  return info.lastInsertRowid;
}

export function idPosicao(nome = 'Ponteiro') {
  return db.prepare('SELECT id FROM Posicoes WHERE nome = ?').get(nome).id;
}

export function criarJogador({
  nome,
  numCamisa,
  posicao = 'Ponteiro',
  categoriaId = null,
  cpf = null,
  rg = null,
  altura = 1.9,
  dataNasc = '2000-01-01',
} = {}) {
  const seq = proximo();
  const info = db
    .prepare(`
      INSERT INTO Jogadores (cpf, nome, dataNasc, numCamisa, rg, altura, posicao_id, categoria_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .run(
      cpf,
      nome || `Jogador ${seq}`,
      dataNasc,
      numCamisa ?? seq,
      rg,
      altura,
      idPosicao(posicao),
      categoriaId
    );
  return info.lastInsertRowid;
}

export function criarPartida({
  nome = 'Partida de teste',
  time1,
  time2,
  ginasioId = null,
  torneioId = null,
  dataPartida = '2026-03-10',
  status = 'AGENDADA',
  tipo = 1,
} = {}) {
  const casa = time1 ?? criarTime({ nome: `Mandante ${proximo()}` });
  const fora = time2 ?? criarTime({ nome: `Visitante ${proximo()}` });

  const info = db
    .prepare(`
      INSERT INTO Partidas (nome, dataPartida, tipo, status, externa, ginasio_id, time1, time2, torneio_id)
      VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?)
    `)
    .run(nome, dataPartida, tipo, status, ginasioId, casa, fora, torneioId);

  return { id: Number(info.lastInsertRowid), time1: casa, time2: fora };
}

/** Coloca jogadores em quadra (linha = 1) ou no banco (linha = 0). */
export function escalar({ timeId, partidaId, emQuadra = [], noBanco = [] }) {
  const stmt = db.prepare(
    'INSERT OR REPLACE INTO TimesPartida (Times_id, Partida_id, Jogadores_id, linha) VALUES (?, ?, ?, ?)'
  );
  emQuadra.forEach((jogadorId) => stmt.run(timeId, partidaId, jogadorId, 1));
  noBanco.forEach((jogadorId) => stmt.run(timeId, partidaId, jogadorId, 0));
}

export function criarTorneio({ nome = 'Torneio de teste', tipo = 1, inicio = '2026-03-01', termino = '2026-03-30' } = {}) {
  const info = db
    .prepare('INSERT INTO Torneios (nome, tipo, inicio, termino) VALUES (?, ?, ?, ?)')
    .run(nome, tipo, inicio, termino);
  return Number(info.lastInsertRowid);
}

/**
 * Cenario pronto: uma partida com 6 jogadores do mandante em quadra e 2 no banco.
 * Devolve tudo que os testes de scout precisam.
 */
export function cenarioPartidaEscalada() {
  const categoriaId = criarCategoria();
  const ginasioId = criarGinasio();
  const partida = criarPartida({ ginasioId });

  const emQuadra = [1, 2, 3, 4, 5, 6].map((numero) =>
    criarJogador({ nome: `Titular ${numero}`, numCamisa: numero, categoriaId })
  );
  const noBanco = [7, 8].map((numero) =>
    criarJogador({ nome: `Reserva ${numero}`, numCamisa: numero, categoriaId })
  );

  escalar({ timeId: partida.time1, partidaId: partida.id, emQuadra, noBanco });

  return { ...partida, categoriaId, ginasioId, emQuadra, noBanco };
}

/**
 * Declara a formacao inicial de um set, por zona.
 *
 * `zonas` e um array de 6 posicoes na ordem Z1..Z6 com o id do atleta, e
 * `levantadorNaZona` diz qual delas e o slot-ancora.
 */
export function escalarPorZona({
  partidaId,
  numSet = 1,
  zonas = [],
  levantadorNaZona = 1,
  sacaPrimeiro = 'MANDANTE',
}) {
  db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)')
    .run(numSet, partidaId);
  db.prepare('UPDATE "Set" SET sacaPrimeiro = ? WHERE NumSet = ? AND Partida_id = ?')
    .run(sacaPrimeiro, numSet, partidaId);

  db.prepare('DELETE FROM EscalacaoSet WHERE Partida_id = ? AND NumSet = ?')
    .run(partidaId, numSet);

  const stmt = db.prepare(
    'INSERT INTO EscalacaoSet (Partida_id, NumSet, zona, Jogadores_id, levantador) VALUES (?, ?, ?, ?, ?)'
  );

  zonas.forEach((jogadorId, indice) => {
    const zona = indice + 1;
    stmt.run(partidaId, numSet, zona, jogadorId, zona === levantadorNaZona ? 1 : 0);
  });
}

/**
 * Cenario de rotacao 5-1 pronto.
 *
 * O levantador comeca na zona 1 (rotacao R1) e o oposto na 4, que e a diagonal
 * dele - o par que a dupla substituicao troca. No banco ficam um levantador
 * reserva e um oposto reserva, que e o que a dupla exige.
 */
export function cenarioRotacao({ sacaPrimeiro = 'MANDANTE' } = {}) {
  const categoriaId = criarCategoria();
  const ginasioId = criarGinasio();
  const partida = criarPartida({ ginasioId });

  const levantador = criarJogador({ nome: 'Levantador', numCamisa: 1, posicao: 'Levantador', categoriaId });
  const ponteiro2 = criarJogador({ nome: 'Ponteiro 2', numCamisa: 2, posicao: 'Ponteiro', categoriaId });
  const central3 = criarJogador({ nome: 'Central 3', numCamisa: 3, posicao: 'Central', categoriaId });
  const oposto = criarJogador({ nome: 'Oposto', numCamisa: 4, posicao: 'Oposto', categoriaId });
  const ponteiro5 = criarJogador({ nome: 'Ponteiro 5', numCamisa: 5, posicao: 'Ponteiro', categoriaId });
  const central6 = criarJogador({ nome: 'Central 6', numCamisa: 6, posicao: 'Central', categoriaId });

  const levantadorReserva = criarJogador({ nome: 'Levantador reserva', numCamisa: 7, posicao: 'Levantador', categoriaId });
  const opostoReserva = criarJogador({ nome: 'Oposto reserva', numCamisa: 8, posicao: 'Oposto', categoriaId });
  const libero = criarJogador({ nome: 'Libero', numCamisa: 9, posicao: 'Líbero', categoriaId });

  // Ordem Z1..Z6: levantador na 1, oposto na 4 (diagonal).
  const zonas = [levantador, ponteiro2, central3, oposto, ponteiro5, central6];

  escalar({
    timeId: partida.time1,
    partidaId: partida.id,
    emQuadra: zonas,
    noBanco: [levantadorReserva, opostoReserva, libero],
  });

  escalarPorZona({ partidaId: partida.id, numSet: 1, zonas, levantadorNaZona: 1, sacaPrimeiro });

  return {
    ...partida,
    categoriaId,
    ginasioId,
    zonas,
    levantador,
    oposto,
    levantadorReserva,
    opostoReserva,
    libero,
  };
}

/** Objeto TipoAcao no formato que a Model espera. */
export const TIPO_ACAO = Object.freeze({
  SAQUE: { idTipoAcao: 1 },
  ATAQUE: { idTipoAcao: 2 },
  BLOQUEIO: { idTipoAcao: 3 },
  RECEPCAO: { idTipoAcao: 4 },
  DEFESA: { idTipoAcao: 5 },
});

export { db };
