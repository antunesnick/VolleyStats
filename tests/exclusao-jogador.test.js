import { describe, it, expect, beforeEach } from 'vitest';
import PlayerControl from '../src/Control/PlayerControl';
import PontoControl from '../src/Control/PontoControl';
import Player from '../src/Model/Player';
import Ponto from '../src/Model/Ponto';
import {
  db,
  resetarBanco,
  cenarioPartidaEscalada,
  criarCategoria,
  criarJogador,
  criarTime,
  TIPO_ACAO,
} from './helpers/fixtures';

/**
 * Exclusao de atleta.
 *
 * `Acao.Jogador_id`, `Ponto.Jogador_id` e `Substituicao` referenciam
 * `Jogadores` sem ON DELETE, e o banco roda com foreign_keys = ON: apagar
 * direto um atleta ja escoutado estourava "FOREIGN KEY constraint failed" e o
 * card simplesmente nao sumia da tela.
 */
describe('Exclusao de jogador', () => {
  const control = () => PlayerControl.getInstance();
  let cenario;

  const jogadorDeCamisa = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  const gravar = (numero, tipoAcao, qualidade, { home = 0, away = 0 } = {}) =>
    PontoControl.getInstance().gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      1,
      home,
      away,
      jogadorDeCamisa(numero),
      tipoAcao,
      qualidade
    );

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  it('exclui um atleta que ja foi escalado e escoutado', async () => {
    const jogador = jogadorDeCamisa(6);
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 0, away: 0 });

    await control().deletePlayer(jogador.id);

    const restante = db.prepare('SELECT COUNT(*) AS total FROM Jogadores WHERE id = ?').get(jogador.id);
    expect(restante.total).toBe(0);
  });

  it('leva junto acoes, escalacao e substituicoes do atleta', async () => {
    const jogador = jogadorDeCamisa(6);
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 0, away: 0 });
    gravar(6, TIPO_ACAO.SAQUE, '=', { home: 1, away: 0 });

    await control().deletePlayer(jogador.id);

    const acoes = db.prepare('SELECT COUNT(*) AS total FROM Acao WHERE Jogador_id = ?').get(jogador.id);
    const escalacao = db
      .prepare('SELECT COUNT(*) AS total FROM TimesPartida WHERE Jogadores_id = ?')
      .get(jogador.id);

    expect(acoes.total).toBe(0);
    expect(escalacao.total).toBe(0);
  });

  it('nao mexe nas acoes dos outros atletas', async () => {
    const jogador = jogadorDeCamisa(6);
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 0, away: 0 });
    gravar(4, TIPO_ACAO.RECEPCAO, '#', { home: 1, away: 0 });

    await control().deletePlayer(jogador.id);

    const total = db.prepare('SELECT COUNT(*) AS total FROM Acao').get().total;
    expect(total).toBe(1);
  });

  /**
   * O dono do rally e o autor da ULTIMA acao. Apagando o atleta que fechou o
   * rally, o dono precisa recair sobre a acao que sobrou - e nao ficar nulo.
   */
  it('devolve o rally ao atleta da acao que sobrou', async () => {
    const atacante = jogadorDeCamisa(6);
    const levantador = jogadorDeCamisa(4);

    gravar(4, TIPO_ACAO.RECEPCAO, '#', { home: 3, away: 2 });
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 3, away: 2 });

    expect(Ponto.buscarDonoDoPonto(cenario.id, 1, 3, 2, db).jogadorId).toBe(atacante.id);

    await control().deletePlayer(atacante.id);

    expect(Ponto.buscarDonoDoPonto(cenario.id, 1, 3, 2, db).jogadorId).toBe(levantador.id);
  });

  it('deixa o rally sem dono quando nenhuma acao sobra', async () => {
    const atacante = jogadorDeCamisa(6);
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 3, away: 2 });

    await control().deletePlayer(atacante.id);

    expect(Ponto.buscarDonoDoPonto(cenario.id, 1, 3, 2, db).jogadorId).toBeNull();
  });

  it('conta o que a exclusao levaria junto, para a tela avisar antes', () => {
    const jogador = jogadorDeCamisa(6);
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 0, away: 0 });
    gravar(6, TIPO_ACAO.SAQUE, '=', { home: 1, away: 0 });

    const vinculos = Player.contarVinculos(jogador.id, db);

    expect(vinculos.acoes).toBe(2);
    expect(vinculos.partidas).toBe(1);
    expect(vinculos.escalacoes).toBe(1);
    expect(vinculos.total).toBeGreaterThan(0);
  });

  /**
   * `JogadoresTimes` e o vinculo atleta-time-categoria, gravado pelo cadastro
   * do time (e pelo seed de demonstracao) - nenhuma tela de scout passa por
   * ele. Como a FK nao tem ON DELETE, ele sozinho ja recusava a exclusao de um
   * atleta que nunca foi escalado nem escoutado.
   */
  describe('vinculo com time (JogadoresTimes)', () => {
    const vincularAoTime = (jogadorId, timeId, categoriaId) => {
      db.prepare('INSERT OR IGNORE INTO TimesCategorias (Times_id, Categorias_id) VALUES (?, ?)')
        .run(timeId, categoriaId);
      db.prepare(
        'INSERT INTO JogadoresTimes (Jogadores_id, Times_id, Categorias_id) VALUES (?, ?, ?)'
      ).run(jogadorId, timeId, categoriaId);
    };

    const criarJogadorDeTime = () => {
      const categoriaId = criarCategoria({ nome: `Cat ${Date.now()}` });
      const timeId = criarTime();
      const jogadorId = criarJogador({ categoriaId });
      vincularAoTime(jogadorId, timeId, categoriaId);
      return jogadorId;
    };

    it('exclui um atleta vinculado a um time, sem historico nenhum', async () => {
      const jogadorId = criarJogadorDeTime();

      await control().deletePlayer(jogadorId);

      const restante = db
        .prepare('SELECT COUNT(*) AS total FROM Jogadores WHERE id = ?')
        .get(jogadorId);
      expect(restante.total).toBe(0);
    });

    it('leva o vinculo com o time junto', async () => {
      const jogadorId = criarJogadorDeTime();

      await control().deletePlayer(jogadorId);

      const vinculo = db
        .prepare('SELECT COUNT(*) AS total FROM JogadoresTimes WHERE Jogadores_id = ?')
        .get(jogadorId);
      expect(vinculo.total).toBe(0);
    });

    it('conta o vinculo com o time para a tela avisar antes', () => {
      const jogadorId = criarJogadorDeTime();

      const vinculos = Player.contarVinculos(jogadorId, db);

      expect(vinculos.times).toBe(1);
      expect(vinculos.total).toBe(1);
    });
  });

  it('nao acusa vinculo nenhum para atleta sem historico', () => {
    const semHistorico = db
      .prepare('SELECT id FROM Jogadores WHERE numCamisa = ?')
      .get(7); // reserva, so escalado

    const vinculos = Player.contarVinculos(semHistorico.id, db);

    expect(vinculos.acoes).toBe(0);
    expect(vinculos.escalacoes).toBe(1);
  });
});
