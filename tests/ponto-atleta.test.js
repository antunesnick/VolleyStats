import { describe, it, expect, beforeEach } from 'vitest';
import Ponto, { VENCEDOR } from '../src/Model/Ponto';
import PontoControl from '../src/Control/PontoControl';
import EstatisticaModel from '../src/Model/EstatisticaModel';
import { db, resetarBanco, cenarioPartidaEscalada, TIPO_ACAO, criarJogador } from './helpers/fixtures';

/**
 * Regra de negocio central: cada ponto pertence a um atleta.
 * O dono do ponto e o autor da ULTIMA acao registrada naquele rally.
 */
describe('Atribuicao do ponto a um atleta', () => {
  let cenario;
  let control;

  const jogadorDeCamisa = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  const gravar = (numero, tipoAcao, qualidade, { set = 1, home = 0, away = 0 } = {}) =>
    control.gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      set,
      home,
      away,
      jogadorDeCamisa(numero),
      tipoAcao,
      qualidade
    );

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
    control = PontoControl.getInstance();
  });

  it('atribui o ponto ao autor da unica acao do rally', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 0, away: 0 });

    const dono = control.buscarDonoDoPonto(cenario.id, 1, 0, 0);

    expect(dono.jogadorNumero).toBe(6);
    expect(dono.jogadorNome).toBe('Titular 6');
  });

  it('atribui o ponto ao autor da ULTIMA acao quando o rally tem varias', () => {
    // Rally completo: recepcao do 4, levantamento implicito, ataque do 6.
    gravar(4, TIPO_ACAO.RECEPCAO, '#', { home: 3, away: 2 });
    gravar(2, TIPO_ACAO.DEFESA, '!', { home: 3, away: 2 });
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 3, away: 2 });

    const dono = control.buscarDonoDoPonto(cenario.id, 1, 3, 2);

    expect(dono.jogadorNumero).toBe(6);
  });

  it('rallys diferentes tem donos independentes', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 0, away: 0 });
    gravar(1, TIPO_ACAO.SAQUE, '#', { home: 1, away: 0 });

    expect(control.buscarDonoDoPonto(cenario.id, 1, 0, 0).jogadorNumero).toBe(6);
    expect(control.buscarDonoDoPonto(cenario.id, 1, 1, 0).jogadorNumero).toBe(1);
  });

  it('devolve o dono ao excluir a ultima acao do rally', () => {
    gravar(4, TIPO_ACAO.RECEPCAO, '#', { home: 5, away: 5 });
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 5, away: 5 });

    expect(control.buscarDonoDoPonto(cenario.id, 1, 5, 5).jogadorNumero).toBe(6);

    const acoes = control.buscarPontosPorSet(cenario.id, 1)[0].acoes;
    const ultimaAcao = acoes[acoes.length - 1];
    control.removerAcao(ultimaAcao.id);

    // Volta para o autor da acao anterior, nao fica orfao.
    expect(control.buscarDonoDoPonto(cenario.id, 1, 5, 5).jogadorNumero).toBe(4);
  });

  it('deixa o ponto sem dono quando todas as acoes do rally sao excluidas', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 2, away: 1 });

    const [rally] = control.buscarPontosPorSet(cenario.id, 1);
    control.removerAcao(rally.acoes[0].id);

    expect(control.buscarDonoDoPonto(cenario.id, 1, 2, 1).jogadorId).toBeNull();
  });

  it('expoe o dono junto com as acoes ao carregar o set', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 0, away: 0 });

    const [rally] = control.buscarPontosPorSet(cenario.id, 1);

    expect(rally.dono).toMatchObject({ numero: 6, nome: 'Titular 6' });
    expect(rally.acoes).toHaveLength(1);
  });

  it('troca o dono do ponto ao editar o autor da ultima acao', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 7, away: 4 });

    const [rally] = control.buscarPontosPorSet(cenario.id, 1);
    const doze = jogadorDeCamisa(2);

    new EstatisticaModel().editarAcao(cenario.id, {
      id: rally.acoes[0].id,
      jogadorId: doze.id,
      tipoAcaoId: TIPO_ACAO.ATAQUE.idTipoAcao,
      qualidade: '#',
    });

    expect(control.buscarDonoDoPonto(cenario.id, 1, 7, 4).jogadorNumero).toBe(2);
  });

  it('recalcula o dono ao excluir uma acao pela tela de estatisticas', () => {
    gravar(4, TIPO_ACAO.RECEPCAO, '#', { home: 9, away: 6 });
    gravar(6, TIPO_ACAO.ATAQUE, '#', { home: 9, away: 6 });

    const [rally] = control.buscarPontosPorSet(cenario.id, 1);
    const ultima = rally.acoes[rally.acoes.length - 1];

    new EstatisticaModel().excluirAcao(cenario.id, ultima.id);

    expect(control.buscarDonoDoPonto(cenario.id, 1, 9, 6).jogadorNumero).toBe(4);
  });

  it('recusa acao de jogador que nao esta em quadra', () => {
    const foraDaPartida = criarJogador({ nome: 'De fora', numCamisa: 99 });

    expect(() =>
      control.gravarPonto(
        { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
        1,
        0,
        0,
        { id: foraDaPartida, nome: 'De fora' },
        TIPO_ACAO.ATAQUE,
        '#'
      )
    ).toThrow(/não está na linha/);
  });
});

describe('Vencedor do rally', () => {
  let cenario;
  let control;

  const jogadorDeCamisa = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  const gravar = (numero, tipoAcao, qualidade, home, away) =>
    control.gravarPonto(
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
    control = PontoControl.getInstance();
  });

  it('assume MANDANTE por padrao, pois so se escuta a propria equipe', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', 0, 0);

    expect(control.buscarDonoDoPonto(cenario.id, 1, 0, 0).vencedor).toBe(VENCEDOR.MANDANTE);
  });

  it('marca o rally como VISITANTE quando o adversario pontua', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '=', 4, 4);
    control.definirVencedorRally(cenario.id, 1, 4, 4, VENCEDOR.VISITANTE);

    expect(control.buscarDonoDoPonto(cenario.id, 1, 4, 4).vencedor).toBe(VENCEDOR.VISITANTE);
  });

  it('limpa a marcacao quando o placar e desfeito', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', 4, 4);
    control.definirVencedorRally(cenario.id, 1, 4, 4, null);

    expect(control.buscarDonoDoPonto(cenario.id, 1, 4, 4).vencedor).toBeNull();
  });

  it('rejeita um vencedor invalido', () => {
    gravar(6, TIPO_ACAO.ATAQUE, '#', 0, 0);

    expect(() => control.definirVencedorRally(cenario.id, 1, 0, 0, 'QUALQUER')).toThrow(
      /Vencedor do rally invalido/
    );
  });

  it('ignora a marcacao de um rally que nao existe no banco', () => {
    expect(control.definirVencedorRally(cenario.id, 1, 20, 20, VENCEDOR.MANDANTE)).toBe(false);
  });
});

describe('Relatorio de pontos por atleta', () => {
  let cenario;
  let control;

  const jogadorDeCamisa = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  const rally = ({ home, away, camisa, tipoAcao = TIPO_ACAO.ATAQUE, qualidade = '#', vencedor = VENCEDOR.MANDANTE }) => {
    control.gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      1,
      home,
      away,
      jogadorDeCamisa(camisa),
      tipoAcao,
      qualidade
    );
    control.definirVencedorRally(cenario.id, 1, home, away, vencedor);
  };

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
    control = PontoControl.getInstance();
  });

  it('conta os pontos ganhos por atleta', () => {
    rally({ home: 0, away: 0, camisa: 6 });
    rally({ home: 1, away: 0, camisa: 6 });
    rally({ home: 2, away: 0, camisa: 1, tipoAcao: TIPO_ACAO.SAQUE });

    const ranking = control.buscarPontosPorAtleta(cenario.id);

    expect(ranking[0]).toMatchObject({ jogadorNumero: 6, pontos: 2, pontosCedidos: 0 });
    expect(ranking[1]).toMatchObject({ jogadorNumero: 1, pontos: 1, pontosCedidos: 0 });
  });

  it('separa ponto ganho de ponto cedido em vez de somar tudo como ponto', () => {
    rally({ home: 0, away: 0, camisa: 6 });
    // Erro de ataque do 6: o ponto foi para o adversario.
    rally({ home: 1, away: 0, camisa: 6, qualidade: '=', vencedor: VENCEDOR.VISITANTE });

    const [linhaDoSeis] = control.buscarPontosPorAtleta(cenario.id);

    expect(linhaDoSeis).toMatchObject({ jogadorNumero: 6, pontos: 1, pontosCedidos: 1 });
  });

  it('nao inclui atletas sem nenhum ponto atribuido', () => {
    rally({ home: 0, away: 0, camisa: 6 });

    const ranking = control.buscarPontosPorAtleta(cenario.id);

    expect(ranking).toHaveLength(1);
    expect(ranking[0].jogadorNumero).toBe(6);
  });

  it('soma pontos de todos os sets da partida', () => {
    rally({ home: 0, away: 0, camisa: 6 });

    control.gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      2,
      0,
      0,
      jogadorDeCamisa(6),
      TIPO_ACAO.ATAQUE,
      '#'
    );

    const [linhaDoSeis] = control.buscarPontosPorAtleta(cenario.id);
    expect(linhaDoSeis.pontos).toBe(2);
  });
});

/**
 * Base do Ctrl+Z do scout: a tela guarda o id da ultima acao gravada e, para
 * desfazer, manda apagar essa acao. O dono do ponto tem que voltar sozinho para
 * o autor da acao anterior.
 */
describe('Desfazer a ultima acao', () => {
  let cenario;
  let control;

  const jogadorDeCamisa = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  const gravar = (numero, tipoAcao, qualidade) =>
    control.gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      1,
      0,
      0,
      jogadorDeCamisa(numero),
      tipoAcao,
      qualidade
    );

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
    control = PontoControl.getInstance();
  });

  it('devolve o id da acao recem gravada', () => {
    const ponto = gravar(1, TIPO_ACAO.SAQUE, '#');
    const acaoId = ponto.ultimaAcaoGravada();

    expect(acaoId).toBeTypeOf('number');
    expect(db.prepare('SELECT id FROM Acao WHERE id = ?').get(acaoId)).toBeTruthy();
  });

  it('apaga a acao e devolve o ponto ao autor da acao anterior', () => {
    gravar(4, TIPO_ACAO.RECEPCAO, '#');
    const ultimo = gravar(6, TIPO_ACAO.ATAQUE, '#');

    expect(control.buscarDonoDoPonto(cenario.id, 1, 0, 0).jogadorNumero).toBe(6);

    control.removerAcao(ultimo.ultimaAcaoGravada());

    expect(control.buscarDonoDoPonto(cenario.id, 1, 0, 0).jogadorNumero).toBe(4);
  });

  // O rally continua existindo (o placar e a chave dele); o que fica sem dono
  // e o Ponto.Jogador_id.
  it('deixa o rally sem dono quando a unica acao e desfeita', () => {
    const ponto = gravar(1, TIPO_ACAO.SAQUE, '#');

    control.removerAcao(ponto.ultimaAcaoGravada());

    expect(control.buscarDonoDoPonto(cenario.id, 1, 0, 0).jogadorId).toBeNull();
    expect(db.prepare('SELECT COUNT(*) AS n FROM Acao').get().n).toBe(0);
  });

  it('desfazer duas vezes seguidas apaga as duas ultimas acoes', () => {
    const primeira = gravar(1, TIPO_ACAO.SAQUE, '+');
    const segunda = gravar(4, TIPO_ACAO.RECEPCAO, '+');
    const terceira = gravar(6, TIPO_ACAO.ATAQUE, '#');

    control.removerAcao(terceira.ultimaAcaoGravada());
    control.removerAcao(segunda.ultimaAcaoGravada());

    expect(db.prepare('SELECT COUNT(*) AS n FROM Acao').get().n).toBe(1);
    expect(control.buscarDonoDoPonto(cenario.id, 1, 0, 0).jogadorNumero).toBe(1);
    expect(db.prepare('SELECT id FROM Acao').get().id).toBe(primeira.ultimaAcaoGravada());
  });
});
