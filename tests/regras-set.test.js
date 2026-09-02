import { describe, it, expect } from 'vitest';
import {
  MELHOR_DE_3,
  MELHOR_DE_5,
  avaliarPartida,
  avaliarSet,
  ehSetDecisivo,
  normalizarSetsParaVencer,
  podeIncrementar,
  pontosParaVencerSet,
  totalDeSets,
} from '../src/Model/RegrasSet';

describe('Formato da partida', () => {
  it('reconhece melhor de 3 e melhor de 5', () => {
    expect(totalDeSets(MELHOR_DE_3)).toBe(3);
    expect(totalDeSets(MELHOR_DE_5)).toBe(5);
  });

  it('aceita o total de sets como sinonimo do formato', () => {
    expect(normalizarSetsParaVencer(5)).toBe(MELHOR_DE_5);
  });

  it('assume melhor de 5 quando o formato nao foi informado', () => {
    expect(normalizarSetsParaVencer(null)).toBe(MELHOR_DE_5);
    expect(normalizarSetsParaVencer(undefined)).toBe(MELHOR_DE_5);
    expect(normalizarSetsParaVencer('qualquer coisa')).toBe(MELHOR_DE_5);
  });
});

describe('Pontos para vencer o set', () => {
  // O erro que essa regra corrige: tratar "set 3" como decisivo em qualquer
  // formato. Numa melhor de 5 o set 3 e um set comum, de 25 pontos.
  it('numa melhor de 5, so o quinto set e de 15 pontos', () => {
    expect(pontosParaVencerSet(1, MELHOR_DE_5)).toBe(25);
    expect(pontosParaVencerSet(3, MELHOR_DE_5)).toBe(25);
    expect(pontosParaVencerSet(4, MELHOR_DE_5)).toBe(25);
    expect(pontosParaVencerSet(5, MELHOR_DE_5)).toBe(15);
  });

  it('numa melhor de 3, o terceiro set e de 15 pontos', () => {
    expect(pontosParaVencerSet(1, MELHOR_DE_3)).toBe(25);
    expect(pontosParaVencerSet(2, MELHOR_DE_3)).toBe(25);
    expect(pontosParaVencerSet(3, MELHOR_DE_3)).toBe(15);
  });

  it('marca corretamente qual set e o decisivo', () => {
    expect(ehSetDecisivo(3, MELHOR_DE_3)).toBe(true);
    expect(ehSetDecisivo(3, MELHOR_DE_5)).toBe(false);
    expect(ehSetDecisivo(5, MELHOR_DE_5)).toBe(true);
  });
});

describe('Encerramento do set', () => {
  it('fecha o set em 25 com dois pontos de vantagem', () => {
    const avaliacao = avaliarSet(25, 20, 1, MELHOR_DE_5);

    expect(avaliacao.encerrado).toBe(true);
    expect(avaliacao.vencedor).toBe('home');
  });

  it('nao fecha o set em 25x24: falta a vantagem de 2', () => {
    const avaliacao = avaliarSet(25, 24, 1, MELHOR_DE_5);

    expect(avaliacao.encerrado).toBe(false);
    expect(avaliacao.vencedor).toBeNull();
    expect(avaliacao.faltamParaFechar).toBe(1);
  });

  it('segue aberto enquanto a diferenca for de um ponto, sem teto', () => {
    expect(avaliarSet(30, 29, 1, MELHOR_DE_5).encerrado).toBe(false);
    expect(avaliarSet(31, 29, 1, MELHOR_DE_5).encerrado).toBe(true);
  });

  it('fecha o tie-break em 15', () => {
    expect(avaliarSet(15, 13, 5, MELHOR_DE_5).encerrado).toBe(true);
    expect(avaliarSet(15, 14, 5, MELHOR_DE_5).encerrado).toBe(false);
    // Mesmo placar, mas no set 3 de uma melhor de 5 ainda falta muito.
    expect(avaliarSet(15, 13, 3, MELHOR_DE_5).encerrado).toBe(false);
  });

  it('avisa quando o set esta em set point', () => {
    expect(avaliarSet(24, 20, 1, MELHOR_DE_5).emSetPoint).toBe(true);
    expect(avaliarSet(24, 24, 1, MELHOR_DE_5).emSetPoint).toBe(false);
    expect(avaliarSet(20, 18, 1, MELHOR_DE_5).emSetPoint).toBe(false);
  });
});

describe('Trava do placar', () => {
  it('bloqueia somar ponto depois do set decidido', () => {
    expect(podeIncrementar(25, 20, 1, MELHOR_DE_5)).toBe(false);
  });

  it('libera somar ponto em 25x24, que ainda esta em disputa', () => {
    expect(podeIncrementar(25, 24, 1, MELHOR_DE_5)).toBe(true);
  });

  it('bloqueia o tie-break a partir de 15 com dois de vantagem', () => {
    expect(podeIncrementar(15, 12, 3, MELHOR_DE_3)).toBe(false);
    expect(podeIncrementar(14, 12, 3, MELHOR_DE_3)).toBe(true);
  });
});

describe('Encerramento da partida', () => {
  it('encerra uma melhor de 3 em 2 a 0', () => {
    const avaliacao = avaliarPartida(2, 0, MELHOR_DE_3);

    expect(avaliacao.encerrada).toBe(true);
    expect(avaliacao.vencedor).toBe('home');
    expect(avaliacao.proximoSet).toBeNull();
  });

  it('nao encerra uma melhor de 5 em 2 a 0', () => {
    const avaliacao = avaliarPartida(2, 0, MELHOR_DE_5);

    expect(avaliacao.encerrada).toBe(false);
    expect(avaliacao.proximoSet).toBe(3);
  });

  it('aponta o proximo set a disputar', () => {
    expect(avaliarPartida(1, 1, MELHOR_DE_3).proximoSet).toBe(3);
    expect(avaliarPartida(2, 2, MELHOR_DE_5).proximoSet).toBe(5);
  });
});
