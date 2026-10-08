import { describe, it, expect, beforeEach } from 'vitest';
import PontoControl from '../src/Control/PontoControl';
import EstatisticaControl from '../src/Control/EstatisticaControl';
import EstatisticaModel from '../src/Model/EstatisticaModel';
import AcaoAdversarioControl from '../src/Control/AcaoAdversarioControl';
import EstatisticaAnalista, {
  classificarAtaques,
  marcarSaque,
  origemDoRally,
} from '../src/Model/EstatisticaAnalista';
import { VENCEDOR } from '../src/Model/Ponto';
import { classificar } from '../src/Model/Qualidade';
import { db, resetarBanco, cenarioPartidaEscalada, TIPO_ACAO } from './helpers/fixtures';

const { MANDANTE, VISITANTE } = VENCEDOR;
const S = 1;
const A = 2;
const B = 3;
const R = 4;
const D = 5;

const rally = (p1, p2, vencedor, acoes = [], acoesAdversario = []) => ({
  pontoTime1: p1,
  pontoTime2: p2,
  vencedor,
  acoes: acoes.map(([idTipoAcao, qualidade]) => ({ idTipoAcao, qualidade })),
  acoesAdversario: acoesAdversario.map(([idTipoAcao, qualidade]) => ({ idTipoAcao, qualidade })),
});

describe('Analista: quem sacou cada rally', () => {
  it('le o saque das proprias acoes antes de qualquer inferencia', () => {
    const [r] = marcarSaque([rally(0, 0, MANDANTE, [[R, '+'], [A, '#']])], MANDANTE);
    // A formacao diz que nos sacamos, mas a recepcao escoutada prova o contrario.
    expect(r.sacando).toBe(VISITANTE);
  });

  it('usa o saque ou a recepcao do adversario quando a nossa equipe nao tem evidencia', () => {
    const [r1, r2] = marcarSaque([
      rally(0, 0, MANDANTE, [], [[S, '-']]),
      rally(1, 0, VISITANTE, [], [[R, '+']]),
    ]);
    expect(r1.sacando).toBe(VISITANTE);
    expect(r2.sacando).toBe(MANDANTE);
  });

  it('sem acao no rally, saca quem venceu o anterior', () => {
    const rallies = marcarSaque([
      rally(0, 0, VISITANTE, [[R, '=']]),
      rally(0, 1, MANDANTE),
      rally(1, 1, MANDANTE),
    ]);
    expect(rallies.map((r) => r.sacando)).toEqual([VISITANTE, VISITANTE, MANDANTE]);
  });

  it('no primeiro rally sem acao usa quem sacou primeiro; sem isso fica indefinido', () => {
    expect(marcarSaque([rally(0, 0, MANDANTE)], VISITANTE)[0].sacando).toBe(VISITANTE);
    expect(marcarSaque([rally(0, 0, MANDANTE)], null)[0].sacando).toBeNull();
  });
});

describe('Analista: ataque K1 x K2', () => {
  it('ataque depois da recepcao e K1 e carrega a qualidade do passe', () => {
    const ataques = classificarAtaques({ ...rally(0, 0, MANDANTE, [[R, '!'], [A, '#']]), sacando: VISITANTE });
    expect(ataques).toEqual([{ fase: 'K1', qualidade: '#', passe: '!' }]);
  });

  it('ataque depois de defesa ou de um ataque anterior e K2', () => {
    const ataques = classificarAtaques({
      ...rally(0, 0, MANDANTE, [[R, '+'], [A, '-'], [D, '+'], [A, '+'], [A, '#']]),
      sacando: VISITANTE,
    });
    expect(ataques.map((a) => a.fase)).toEqual(['K1', 'K2', 'K2']);
  });

  it('sem origem escoutada, decide pela fase do rally', () => {
    const recebendo = classificarAtaques({ ...rally(0, 0, MANDANTE, [[A, '#']]), sacando: VISITANTE });
    const sacando = classificarAtaques({ ...rally(0, 0, MANDANTE, [[A, '#']]), sacando: MANDANTE });
    const indefinido = classificarAtaques({ ...rally(0, 0, MANDANTE, [[A, '#']]), sacando: null });

    expect(recebendo[0].fase).toBe('K1');
    expect(sacando[0].fase).toBe('K2');
    expect(indefinido[0].fase).toBeNull();
  });
});

describe('Analista: origem dos pontos', () => {
  it('rally ganho: ponto da ultima acao nossa, senao erro do adversario', () => {
    expect(origemDoRally(rally(0, 0, MANDANTE, [[R, '+'], [A, '#']]))).toBe('ataque');
    expect(origemDoRally(rally(0, 0, MANDANTE, [[S, '#']]))).toBe('saque');
    expect(origemDoRally(rally(0, 0, MANDANTE, [[S, '-']]))).toBe('erroAdversario');
    expect(origemDoRally(rally(0, 0, MANDANTE))).toBe('naoEscoutado');
  });

  it('rally perdido: separa o erro nosso do ponto conquistado pelo adversario', () => {
    expect(origemDoRally(rally(0, 0, VISITANTE, [[A, '/']]))).toBe('ataqueBloqueado');
    expect(origemDoRally(rally(0, 0, VISITANTE, [[A, '=']]))).toBe('erroAtaque');
    expect(origemDoRally(rally(0, 0, VISITANTE, [[S, '=']]))).toBe('erroSaque');
    expect(origemDoRally(rally(0, 0, VISITANTE, [[7, '=']]))).toBe('falta');
    expect(origemDoRally(rally(0, 0, VISITANTE, [[R, '-']]))).toBe('pontoAdversario');
  });
});

describe('Erro geral: tecla nova do scout', () => {
  let cenario;

  const jogador = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  const partida = () => ({ id: cenario.id, time1: cenario.time1, time2: cenario.time2 });

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  it('a mesma regra em JS e em SQL: falta e sempre erro', () => {
    expect(classificar('Erro geral', '=')).toBe('ERRO');
  });

  it('grava o tipo da falta e o relatorio separa por tipo', () => {
    const control = PontoControl.getInstance();
    control.gravarPonto(partida(), 1, 0, 0, jogador(3), TIPO_ACAO.ERRO_GERAL, '=', 'REDE');
    control.gravarPonto(partida(), 1, 0, 1, jogador(3), TIPO_ACAO.ERRO_GERAL, '=', 'REDE');
    control.gravarPonto(partida(), 1, 0, 2, jogador(1), TIPO_ACAO.ERRO_GERAL, '=', 'CONDUCAO');

    const stats = new EstatisticaModel().buscarEstatisticasPartida(cenario.id);
    const central = stats.jogadores.find((j) => Number(j.numero) === 3);

    expect(central.scout.errosGerais).toBe(2);
    expect(central.scout.errosGeraisPorTipo.REDE).toBe(2);
    expect(stats.totals.scout.errosGeraisPorTipo.CONDUCAO).toBe(1);
    expect(stats.totals.scout.errosTotais).toBe(3);

    const erros = EstatisticaAnalista.resumoDaPartida(cenario.id, db, stats.totals.scout).erros;
    expect(erros.linhas.find((l) => l.chave === 'REDE').total).toBe(2);
    expect(erros.total).toBe(3);
  });

  it('editar a falta para outro fundamento apaga o tipo da falta', () => {
    PontoControl.getInstance()
      .gravarPonto(partida(), 1, 0, 0, jogador(3), TIPO_ACAO.ERRO_GERAL, '=', 'ROTACAO');
    const acao = db.prepare('SELECT id, Jogador_id FROM Acao').get();
    const model = new EstatisticaModel();

    expect(() => model.editarAcao(cenario.id, { id: acao.id, jogadorId: acao.Jogador_id, tipoAcaoId: 7, qualidade: '#' }))
      .toThrow();

    model.editarAcao(cenario.id, { id: acao.id, jogadorId: acao.Jogador_id, tipoAcaoId: 7, qualidade: '=' });
    expect(db.prepare('SELECT tipoErro FROM Acao WHERE id = ?').get(acao.id).tipoErro).toBe('ROTACAO');

    model.editarAcao(cenario.id, { id: acao.id, jogadorId: acao.Jogador_id, tipoAcaoId: 2, qualidade: '=' });
    expect(db.prepare('SELECT tipoErro FROM Acao WHERE id = ?').get(acao.id).tipoErro).toBeNull();
  });

  it('recusa qualidade diferente de "=" e tipo de falta desconhecido', () => {
    const control = PontoControl.getInstance();
    expect(() => control.gravarPonto(partida(), 1, 0, 0, jogador(1), TIPO_ACAO.ERRO_GERAL, '#', 'REDE'))
      .toThrow();
    expect(() => control.gravarPonto(partida(), 1, 0, 0, jogador(1), TIPO_ACAO.ERRO_GERAL, '=', 'XYZ'))
      .toThrow();
    expect(() => control.gravarPonto(partida(), 1, 0, 0, jogador(1), TIPO_ACAO.ATAQUE, '=', 'REDE'))
      .toThrow();
  });
});

describe('Analista: resumo da partida a partir do banco', () => {
  let cenario;

  const jogador = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  it('calcula side-out, break-point, K1 x K2 e origem num set escoutado', () => {
    const control = PontoControl.getInstance();
    const partida = { id: cenario.id, time1: cenario.time1, time2: cenario.time2 };
    const acao = (p1, p2, camisa, tipo, qualidade) =>
      control.gravarPonto(partida, 1, p1, p2, jogador(camisa), tipo, qualidade);
    const vence = (p1, p2, lado) => control.definirVencedorRally(cenario.id, 1, p1, p2, lado);

    // 0x0: recebemos (passe perfeito) e viramos de primeira -> side-out.
    acao(0, 0, 2, TIPO_ACAO.RECEPCAO, '#');
    acao(0, 0, 4, TIPO_ACAO.ATAQUE, '#');
    vence(0, 0, MANDANTE);
    // 1x0: sacamos, defendemos e erramos o contra-ataque -> break perdido.
    acao(1, 0, 4, TIPO_ACAO.SAQUE, '-');
    acao(1, 0, 5, TIPO_ACAO.DEFESA, '+');
    acao(1, 0, 4, TIPO_ACAO.ATAQUE, '=');
    vence(1, 0, VISITANTE);
    // 1x1: recebemos mal e o ataque foi bloqueado -> side-out perdido.
    acao(1, 1, 2, TIPO_ACAO.RECEPCAO, '-');
    acao(1, 1, 4, TIPO_ACAO.ATAQUE, '/');
    vence(1, 1, VISITANTE);
    // 1x2: nada escoutado, so o placar -> ainda recebendo; ganhamos.
    vence(1, 2, MANDANTE);
    // 2x2: sacamos e o adversario errou -> break.
    AcaoAdversarioControl.getInstance().gravar({
      partidaId: cenario.id, numSet: 1, pontoTime1: 2, pontoTime2: 2,
      numCamisa: 9, idTipoAcao: 2, qualidade: '=',
    });
    vence(2, 2, MANDANTE);

    const resumo = EstatisticaControl.buscarAnalise(cenario.id);

    expect(resumo.fases.recebidos).toBe(3);
    expect(resumo.fases.sideOuts).toBe(2);
    expect(resumo.fases.sacados).toBe(2);
    expect(resumo.fases.breaks).toBe(1);
    expect(resumo.fases.sideOutPct).toBeCloseTo(66.7, 1);
    expect(resumo.fases.breakPct).toBeCloseTo(50, 1);
    expect(resumo.ralliesSemSaque).toBe(0);

    expect(resumo.ataques.k1.total).toBe(2);
    expect(resumo.ataques.k1.pontos).toBe(1);
    expect(resumo.ataques.k1.bloqueados).toBe(1);
    expect(resumo.ataques.k2.total).toBe(1);
    expect(resumo.ataques.k2.erros).toBe(1);

    const passe = Object.fromEntries(resumo.ataques.porPasse.map((faixa) => [faixa.chave, faixa]));
    expect(passe.bom.total).toBe(1);
    expect(passe.bom.eficiencia).toBe(100);
    expect(passe.ruim.total).toBe(1);
    expect(passe.ruim.eficiencia).toBe(-100);

    const ganhos = Object.fromEntries(resumo.origens.ganhos.itens.map((item) => [item.chave, item.total]));
    const cedidos = Object.fromEntries(resumo.origens.cedidos.itens.map((item) => [item.chave, item.total]));
    expect(ganhos).toMatchObject({ ataque: 1, erroAdversario: 1, naoEscoutado: 1 });
    expect(cedidos).toMatchObject({ erroAtaque: 1, ataqueBloqueado: 1 });
    expect(resumo.origens.errosNaoForcados.total).toBe(1);

    expect(resumo.porSet).toHaveLength(1);
    expect(resumo.porSet[0].sideOutPct).toBeCloseTo(66.7, 1);
  });
});
