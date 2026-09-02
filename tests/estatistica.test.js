import { describe, it, expect, beforeEach } from 'vitest';
import EstatisticaControl from '../src/Control/EstatisticaControl';
import EstatisticaModel from '../src/Model/EstatisticaModel';
import PontoControl from '../src/Control/PontoControl';
import { VENCEDOR } from '../src/Model/Ponto';
import { db, resetarBanco, cenarioPartidaEscalada, TIPO_ACAO } from './helpers/fixtures';

describe('Scout: metricas por jogador', () => {
  const model = new EstatisticaModel();
  let cenario;

  const jogadorDeCamisa = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  let rallyAtual = 0;
  const acao = (camisa, tipoAcao, qualidade) => {
    // Cada acao em um rally proprio, para nao sobrescrever o dono do ponto.
    PontoControl.getInstance().gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      1,
      rallyAtual++,
      0,
      jogadorDeCamisa(camisa),
      tipoAcao,
      qualidade
    );
  };

  const scoutDe = (camisa) => {
    const stats = model.buscarEstatisticasPartida(cenario.id);
    return stats.jogadores.find((j) => Number(j.numero) === camisa)?.scout;
  };

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
    rallyAtual = 0;
  });

  it('conta aces, erros e eficiencia de saque', () => {
    acao(1, TIPO_ACAO.SAQUE, '#');
    acao(1, TIPO_ACAO.SAQUE, '#');
    acao(1, TIPO_ACAO.SAQUE, '+');
    acao(1, TIPO_ACAO.SAQUE, '!');
    acao(1, TIPO_ACAO.SAQUE, '=');

    const saque = scoutDe(1).saque;

    expect(saque.total).toBe(5);
    expect(saque.aces).toBe(2);
    expect(saque.erros).toBe(1);
    // Pressao alta ("/" e "+") contra pressao baixa ("!" e "-").
    expect(saque.ab).toBe(1);
    expect(saque.cx).toBe(1);
    // (aces - erros) / tentativas
    expect(saque.eficiencia).toBeCloseTo(20, 1);
    expect(saque.positivoPct).toBeCloseTo(60, 1);
  });

  it('calcula percentual de recepcao positiva e perfeita', () => {
    acao(4, TIPO_ACAO.RECEPCAO, '#');
    acao(4, TIPO_ACAO.RECEPCAO, '#');
    acao(4, TIPO_ACAO.RECEPCAO, '+');
    acao(4, TIPO_ACAO.RECEPCAO, '!');
    acao(4, TIPO_ACAO.RECEPCAO, '=');

    const recepcao = scoutDe(4).recepcao;

    expect(recepcao.total).toBe(5);
    expect(recepcao.perfeita).toBe(2);
    expect(recepcao.positiva).toBe(1);
    expect(recepcao.erros).toBe(1);
    expect(recepcao.perfeitaPct).toBeCloseTo(40, 1);
    // Positiva = "#" + "+". O "!" e passe jogavel, mas nao positivo.
    expect(recepcao.positivaPct).toBeCloseTo(60, 1);
  });

  it('calcula eficiencia de ataque descontando erros e bloqueios sofridos', () => {
    acao(6, TIPO_ACAO.ATAQUE, '#');
    acao(6, TIPO_ACAO.ATAQUE, '#');
    acao(6, TIPO_ACAO.ATAQUE, '+');
    acao(6, TIPO_ACAO.ATAQUE, '/');
    acao(6, TIPO_ACAO.ATAQUE, '=');

    const ataque = scoutDe(6).ataque;

    expect(ataque.total).toBe(5);
    expect(ataque.pontos).toBe(2);
    expect(ataque.positivos).toBe(1);
    // "/" e ataque bloqueado: ponto do adversario, mesmo nao sendo "=".
    expect(ataque.bloqueados).toBe(1);
    expect(ataque.erros).toBe(1);
    expect(ataque.pontosPct).toBeCloseTo(40, 1);
    // (pontos - erros - bloqueados) / tentativas
    expect(ataque.eficiencia).toBeCloseTo(0, 1);
  });

  it('trata invasao no bloqueio como erro', () => {
    acao(6, TIPO_ACAO.BLOQUEIO, '#');
    acao(6, TIPO_ACAO.BLOQUEIO, '+');
    acao(6, TIPO_ACAO.BLOQUEIO, '/');
    acao(6, TIPO_ACAO.BLOQUEIO, '=');

    const bloqueio = scoutDe(6).bloqueio;

    expect(bloqueio.total).toBe(4);
    expect(bloqueio.pontos).toBe(1);
    expect(bloqueio.positivos).toBe(1);
    expect(bloqueio.erros).toBe(2);
    expect(bloqueio.eficiencia).toBeCloseTo(-25, 1);
  });

  it('aceita a escala antiga de A/B/C sem quebrar o relatorio', () => {
    // Bancos migrados nao tem mais A/B/C, mas a normalizacao continua
    // aceitando a letra para nao quebrar leitura de dado antigo em memoria.
    const scout = model.criarScoutVazio();
    model.aplicarAcaoNoScout(scout, 'Ataque', 'A');
    model.aplicarAcaoNoScout(scout, 'Ataque', 'C');

    expect(model.finalizarScout(scout).ataque.pontos).toBe(1);
    expect(scout.ataque.erros).toBe(1);
  });

  it('separa as estatisticas por jogador', () => {
    acao(1, TIPO_ACAO.SAQUE, '#');
    acao(6, TIPO_ACAO.ATAQUE, '#');

    expect(scoutDe(1).saque.aces).toBe(1);
    expect(scoutDe(6).ataque.pontos).toBe(1);
    expect(scoutDe(6).saque.total).toBe(0);
  });

  it('devolve estatistica vazia para partida sem scout', () => {
    const stats = model.buscarEstatisticasPartida(cenario.id);

    expect(stats.jogadores).toHaveLength(0);
    expect(stats.totals.acoes).toBe(0);
  });

  it('inclui os pontos atribuidos a cada atleta no relatorio da partida', () => {
    acao(6, TIPO_ACAO.ATAQUE, '#');
    PontoControl.getInstance().definirVencedorRally(cenario.id, 1, 0, 0, VENCEDOR.MANDANTE);
    acao(6, TIPO_ACAO.ATAQUE, '=');
    PontoControl.getInstance().definirVencedorRally(cenario.id, 1, 1, 0, VENCEDOR.VISITANTE);

    const stats = model.buscarEstatisticasPartida(cenario.id);
    const seis = stats.jogadores.find((j) => Number(j.numero) === 6);

    expect(seis.pontos).toBe(1);
    expect(seis.pontosCedidos).toBe(1);
    expect(stats.totals.pontosAtribuidos).toBe(1);
    expect(stats.totals.pontosCedidos).toBe(1);
  });
});

describe('Regras para encerrar a partida', () => {
  const MD3 = 2;
  const MD5 = 3;
  const validar = (sets, setsParaVencer = MD5) =>
    EstatisticaControl.validarPontuacaoPartida(sets, setsParaVencer);
  const set = (numSet, home, away) => ({ numSet, home, away });

  beforeEach(resetarBanco);

  describe('melhor de 5', () => {
    it('aceita uma vitoria por 3 a 0', () => {
      const resultado = validar([set(1, 25, 20), set(2, 25, 18), set(3, 25, 10)]);

      expect(resultado.isValid).toBe(true);
      expect(resultado.resultado).toEqual({ home: 3, away: 0 });
    });

    it('aceita um tie-break em 5 sets', () => {
      const resultado = validar([
        set(1, 25, 20),
        set(2, 20, 25),
        set(3, 25, 12),
        set(4, 18, 25),
        set(5, 15, 13),
      ]);

      expect(resultado.resultado).toEqual({ home: 3, away: 2 });
    });

    // O set 3 de uma melhor de 5 e um set comum, de 25. So o ultimo set do
    // formato e o tie-break de 15 - a regra antiga tratava o 3 como decisivo
    // em qualquer formato, e por isso aceitava um 15x10 no meio da partida.
    it('exige 25 pontos no terceiro set', () => {
      expect(() => validar([set(1, 25, 20), set(2, 25, 18), set(3, 15, 10)]))
        .toThrow(/Set 3 precisa terminar com pelo menos 25/);
    });

    it('aceita 15 pontos apenas no quinto set', () => {
      expect(() =>
        validar([set(1, 25, 20), set(2, 20, 25), set(3, 25, 12), set(4, 18, 25), set(5, 15, 10)])
      ).not.toThrow();
    });

    it('recusa mais de 5 sets', () => {
      expect(() =>
        validar([
          set(1, 25, 20),
          set(2, 25, 18),
          set(3, 25, 10),
          set(4, 25, 20),
          set(5, 15, 10),
          set(6, 25, 20),
        ])
      ).toThrow(/maximo 5 sets/i);
    });

    it('recusa partida que continua depois de um time fazer 3 sets', () => {
      expect(() =>
        validar([set(1, 25, 20), set(2, 25, 18), set(3, 25, 10), set(4, 25, 20)])
      ).toThrow(/encerrar assim que/);
    });

    it('recusa partida sem vencedor de 3 sets', () => {
      expect(() => validar([set(1, 25, 20), set(2, 20, 25)])).toThrow(/vencer 3 sets/);
    });
  });

  describe('melhor de 3', () => {
    it('aceita uma vitoria por 2 a 0', () => {
      const resultado = validar([set(1, 25, 20), set(2, 25, 18)], MD3);

      expect(resultado.isValid).toBe(true);
      expect(resultado.resultado).toEqual({ home: 2, away: 0 });
    });

    it('aceita um tie-break em 3 sets', () => {
      const resultado = validar([set(1, 25, 20), set(2, 20, 25), set(3, 15, 12)], MD3);

      expect(resultado.resultado).toEqual({ home: 2, away: 1 });
    });

    it('trata o terceiro set como decisivo, de 15 pontos', () => {
      expect(() => validar([set(1, 25, 20), set(2, 20, 25), set(3, 15, 10)], MD3)).not.toThrow();
    });

    it('recusa mais de 3 sets', () => {
      expect(() =>
        validar([set(1, 25, 20), set(2, 20, 25), set(3, 15, 12), set(4, 25, 20)], MD3)
      ).toThrow(/maximo 3 sets/i);
    });

    it('recusa partida que continua depois de um time fazer 2 sets', () => {
      expect(() => validar([set(1, 25, 20), set(2, 25, 18), set(3, 15, 10)], MD3))
        .toThrow(/encerrar assim que/);
    });

    it('recusa partida sem vencedor de 2 sets', () => {
      expect(() => validar([set(1, 25, 20)], MD3)).toThrow(/vencer 2 sets/);
    });
  });

  describe('regras comuns aos dois formatos', () => {
    it('recusa set empatado', () => {
      expect(() => validar([set(1, 25, 25), set(2, 25, 18)], MD3)).toThrow(/empatado/);
    });

    it('exige diferenca minima de 2 pontos', () => {
      expect(() => validar([set(1, 25, 24), set(2, 25, 18)], MD3)).toThrow(/2 pontos/);
    });

    it('exige 25 pontos nos sets normais', () => {
      expect(() => validar([set(1, 20, 10), set(2, 25, 18)], MD3)).toThrow(/25 pontos/);
    });

    it('recusa sets fora de ordem', () => {
      expect(() => validar([set(1, 25, 20), set(3, 25, 18)], MD3)).toThrow(/ordem/);
    });

    it('recusa lista de sets vazia', () => {
      expect(() => validar([])).toThrow();
    });

    // Partidas gravadas antes da coluna setsParaVencer existir nao informam
    // formato; a validacao precisa continuar assumindo melhor de 5.
    it('assume melhor de 5 quando o formato nao e informado', () => {
      expect(() => EstatisticaControl.validarPontuacaoPartida([set(1, 25, 20), set(2, 25, 18)]))
        .toThrow(/vencer 3 sets/);
    });
  });
});

describe('Relatorio separado por set', () => {
  const model = new EstatisticaModel();
  let cenario;

  const jogadorDeCamisa = (numero) =>
    db.prepare('SELECT id, nome, numCamisa FROM Jogadores WHERE numCamisa = ?').get(numero);

  const acao = (numSet, home, away, camisa, tipoAcao, qualidade) =>
    PontoControl.getInstance().gravarPonto(
      { id: cenario.id, time1: cenario.time1, time2: cenario.time2 },
      numSet,
      home,
      away,
      jogadorDeCamisa(camisa),
      tipoAcao,
      qualidade
    );

  const setDe = (stats, numSet) => stats.sets.find((s) => s.numSet === numSet);

  beforeEach(() => {
    resetarBanco();
    cenario = cenarioPartidaEscalada();
  });

  it('nao mistura acoes de sets diferentes', () => {
    acao(1, 0, 0, 6, TIPO_ACAO.ATAQUE, '#');
    acao(1, 1, 0, 6, TIPO_ACAO.ATAQUE, '#');
    acao(2, 0, 0, 6, TIPO_ACAO.ATAQUE, '=');

    const stats = model.buscarEstatisticasPartida(cenario.id);

    expect(setDe(stats, 1).scout.ataque.pontos).toBe(2);
    expect(setDe(stats, 1).scout.ataque.erros).toBe(0);
    expect(setDe(stats, 2).scout.ataque.pontos).toBe(0);
    expect(setDe(stats, 2).scout.ataque.erros).toBe(1);
  });

  it('mostra a queda de rendimento de um atleta de um set para o outro', () => {
    // Set 1: ataca bem. Set 2: erra tudo. E essa comparacao que o analista quer.
    acao(1, 0, 0, 6, TIPO_ACAO.ATAQUE, '#');
    acao(1, 1, 0, 6, TIPO_ACAO.ATAQUE, '#');
    acao(2, 0, 0, 6, TIPO_ACAO.ATAQUE, '=');
    acao(2, 0, 1, 6, TIPO_ACAO.ATAQUE, '/');

    const stats = model.buscarEstatisticasPartida(cenario.id);
    const noSet = (numSet) => setDe(stats, numSet).jogadores.find((j) => Number(j.numero) === 6);

    expect(noSet(1).scout.ataque.eficiencia).toBeCloseTo(100, 1);
    expect(noSet(2).scout.ataque.eficiencia).toBeCloseTo(-100, 1);
    // O total da partida continua sendo a soma dos dois sets.
    const geral = stats.jogadores.find((j) => Number(j.numero) === 6);
    expect(geral.scout.ataque.total).toBe(4);
    expect(geral.scout.ataque.eficiencia).toBeCloseTo(0, 1);
  });

  it('atribui os pontos de cada set ao atleta certo', () => {
    acao(1, 0, 0, 6, TIPO_ACAO.ATAQUE, '#');
    PontoControl.getInstance().definirVencedorRally(cenario.id, 1, 0, 0, VENCEDOR.MANDANTE);
    acao(2, 0, 0, 6, TIPO_ACAO.ATAQUE, '=');
    PontoControl.getInstance().definirVencedorRally(cenario.id, 2, 0, 0, VENCEDOR.VISITANTE);

    const stats = model.buscarEstatisticasPartida(cenario.id);

    expect(setDe(stats, 1).pontosAtribuidos).toBe(1);
    expect(setDe(stats, 1).pontosCedidos).toBe(0);
    expect(setDe(stats, 2).pontosAtribuidos).toBe(0);
    expect(setDe(stats, 2).pontosCedidos).toBe(1);
  });

  it('lista os jogadores dentro de cada set', () => {
    acao(1, 0, 0, 6, TIPO_ACAO.ATAQUE, '#');
    acao(2, 0, 0, 1, TIPO_ACAO.SAQUE, '#');

    const stats = model.buscarEstatisticasPartida(cenario.id);

    expect(setDe(stats, 1).jogadores.map((j) => Number(j.numero))).toEqual([6]);
    expect(setDe(stats, 2).jogadores.map((j) => Number(j.numero))).toEqual([1]);
    expect(stats.jogadores).toHaveLength(2);
  });
});
