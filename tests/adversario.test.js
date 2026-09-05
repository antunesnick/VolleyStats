import { describe, it, expect, beforeEach } from 'vitest';
import AcaoAdversarioControl from '../src/Control/AcaoAdversarioControl';
import PontoControl from '../src/Control/PontoControl';
import PartidaControl from '../src/Control/PartidaControl';
import Ponto from '../src/Model/Ponto';
import { db, resetarBanco, cenarioPartidaEscalada, TIPO_ACAO } from './helpers/fixtures';

/**
 * Scout do adversario.
 *
 * O ponto de atencao aqui e a separacao: as acoes do adversario nao podem
 * escorrer para nenhuma contagem da propria equipe. Um numero de relatorio que
 * some o adversario junto e pior do que nao ter o recurso.
 */
describe('Scout do adversario', () => {
  const control = () => AcaoAdversarioControl.getInstance();
  let cenario;

  const gravar = (extra = {}) =>
    control().gravar({
      partidaId: cenario.id,
      numSet: 1,
      pontoTime1: 0,
      pontoTime2: 0,
      numCamisa: 7,
      idTipoAcao: TIPO_ACAO.ATAQUE.idTipoAcao,
      qualidade: '#',
      ...extra,
    });

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  it('grava uma acao do adversario pela camisa, sem jogador cadastrado', () => {
    const id = gravar();

    expect(id).toBeGreaterThan(0);

    const acoes = control().buscarPorSet(cenario.id, 1);
    expect(acoes).toHaveLength(1);
    expect(acoes[0]).toMatchObject({
      numCamisa: 7,
      qualidade: '#',
      tipoAcaoNome: 'Ataque',
    });
  });

  it('aceita adversario nao identificado', () => {
    gravar({ numCamisa: null });

    const [acao] = control().buscarPorSet(cenario.id, 1);
    expect(acao.numCamisa).toBeNull();
  });

  it('cria o rally para a acao aparecer no painel do set', () => {
    gravar({ pontoTime1: 5, pontoTime2: 3 });

    const rallies = PontoControl.getInstance().buscarPontosPorSet(cenario.id, 1);
    expect(rallies).toHaveLength(1);
    expect(rallies[0]).toMatchObject({ pontoTime1: 5, pontoTime2: 3 });
  });

  it('nao muda o dono do ponto da nossa equipe', () => {
    const jogador = { id: cenario.emQuadra[0] };

    // Acao da propria equipe primeiro: e ela que define o dono do rally.
    PontoControl.getInstance().gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      1,
      4,
      2,
      jogador,
      TIPO_ACAO.ATAQUE,
      '#'
    );

    gravar({ pontoTime1: 4, pontoTime2: 2, idTipoAcao: TIPO_ACAO.BLOQUEIO.idTipoAcao, qualidade: '=' });

    const dono = Ponto.buscarDonoDoPonto(cenario.id, 1, 4, 2, db);
    expect(dono.jogadorId).toBe(jogador.id);
  });

  it('nao entra na contagem de Acao da propria equipe', () => {
    gravar();
    gravar({ qualidade: '=' });

    const total = db.prepare('SELECT COUNT(*) AS total FROM Acao').get().total;
    expect(total).toBe(0);
  });

  /**
   * A qualidade e lida da perspectiva de quem executou: um ataque '=' do
   * adversario e erro DELE, e um '#' e ponto DELE. E o mesmo criterio de
   * `classificar()`, so que aplicado do outro lado da rede.
   */
  it('separa ponto, erro e neutra por fundamento', () => {
    gravar({ idTipoAcao: TIPO_ACAO.ATAQUE.idTipoAcao, qualidade: '#' });   // ponto dele
    gravar({ idTipoAcao: TIPO_ACAO.ATAQUE.idTipoAcao, qualidade: '=' });   // erro dele
    gravar({ idTipoAcao: TIPO_ACAO.ATAQUE.idTipoAcao, qualidade: '/' });   // bloqueado = erro dele
    gravar({ idTipoAcao: TIPO_ACAO.ATAQUE.idTipoAcao, qualidade: '+' });   // neutra
    gravar({ idTipoAcao: TIPO_ACAO.SAQUE.idTipoAcao, qualidade: '=' });    // erro de saque
    gravar({ idTipoAcao: TIPO_ACAO.RECEPCAO.idTipoAcao, qualidade: '#' }); // recepcao perfeita, nao e ponto

    const resumo = control().resumo(cenario.id);

    expect(resumo.totais).toMatchObject({ total: 6, pontos: 1, erros: 3, neutras: 2 });
    expect(resumo.porNome.Ataque).toMatchObject({ total: 4, pontos: 1, erros: 2, neutras: 1 });
    expect(resumo.porNome.Saque).toMatchObject({ total: 1, pontos: 0, erros: 1 });
    expect(resumo.porNome.Recepcao).toMatchObject({ total: 1, pontos: 0, erros: 0, neutras: 1 });
  });

  it('filtra o resumo por set', () => {
    gravar({ numSet: 1, qualidade: '=' });
    gravar({ numSet: 2, qualidade: '=' });
    gravar({ numSet: 2, qualidade: '=' });

    expect(control().resumo(cenario.id, 1).totais.erros).toBe(1);
    expect(control().resumo(cenario.id, 2).totais.erros).toBe(2);
    expect(control().resumo(cenario.id, null).totais.erros).toBe(3);
  });

  it('agrupa por camisa, com os nao identificados juntos', () => {
    gravar({ numCamisa: 7, qualidade: '#' });
    gravar({ numCamisa: 7, qualidade: '=' });
    gravar({ numCamisa: 12, qualidade: '=' });
    gravar({ numCamisa: null, qualidade: '=' });

    const porCamisa = control().resumo(cenario.id).porCamisa;

    expect(porCamisa.find((item) => item.numCamisa === 7)).toMatchObject({ total: 2, pontos: 1, erros: 1 });
    expect(porCamisa.find((item) => item.numCamisa === 12)).toMatchObject({ total: 1, erros: 1 });
    expect(porCamisa.find((item) => item.numCamisa === null)).toMatchObject({ total: 1, erros: 1 });
  });

  it('remove uma acao do adversario', () => {
    const id = gravar();
    gravar({ numCamisa: 9 });

    control().remover(id);

    const acoes = control().buscarPorSet(cenario.id, 1);
    expect(acoes).toHaveLength(1);
    expect(acoes[0].numCamisa).toBe(9);
  });

  it('recusa qualidade fora da escala', () => {
    expect(() => gravar({ qualidade: 'Z' })).toThrow();
  });

  it('recusa fundamento inexistente', () => {
    expect(() => gravar({ idTipoAcao: 99 })).toThrow();
  });

  it('some junto com a partida', async () => {
    gravar();
    await PartidaControl.getInstance().deletePartida(cenario.id);

    const total = db.prepare('SELECT COUNT(*) AS total FROM AcaoAdversario').get().total;
    expect(total).toBe(0);
  });
});
