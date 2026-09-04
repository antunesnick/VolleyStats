import { describe, it, expect, beforeEach } from 'vitest';
import db from '../src/db/db';
import { resetarBanco, criarJogador } from './helpers/fixtures';
import {
  ESCALA,
  FUNDAMENTOS,
  FUNDAMENTO_PARA_TIPO_ACAO,
  MAPA_LEGADO,
  TIPO_ACAO_PARA_FUNDAMENTO,
  classificar,
  legendaDoFundamento,
  nomeQualidade,
  normalizarQualidade,
  rotularQualidade,
} from '../src/Model/Qualidade';
import { sqlContagemPorResultado, sqlEhErro, sqlEhNeutra, sqlEhPonto } from '../src/Model/SqlQualidade';

describe('Nomes da escala nos relatorios', () => {
  // Os relatorios nao mostram simbolo: quem le nao tem a legenda do scout na mao.
  it('da um nome a cada nivel da escala', () => {
    ESCALA.forEach((simbolo) => {
      expect(nomeQualidade(simbolo)).toBeTruthy();
    });

    const nomes = ESCALA.map((simbolo) => nomeQualidade(simbolo));
    expect(new Set(nomes).size).toBe(ESCALA.length);
  });

  it('nomeia tambem a escala antiga de 3 niveis', () => {
    expect(nomeQualidade('A')).toBe(nomeQualidade('#'));
    expect(nomeQualidade('C')).toBe(nomeQualidade('='));
  });

  it('devolve string vazia fora da escala', () => {
    expect(nomeQualidade('Z')).toBe('');
    expect(nomeQualidade(null)).toBe('');
  });

  // Com o fundamento em maos vale o significado especifico; sem ele, o nome do nivel.
  it('rotula pelo fundamento quando ele e conhecido', () => {
    expect(rotularQualidade('Saque', '#')).toBe('Ace');
    expect(rotularQualidade('Ataque', '/')).toBe('Bloqueado');
    expect(rotularQualidade('', '#')).toBe(nomeQualidade('#'));
    expect(rotularQualidade('Fundamento inexistente', '+')).toBe(nomeQualidade('+'));
  });
});

describe('Escala de qualidade', () => {
  it('aceita o simbolo novo e devolve ele mesmo', () => {
    ESCALA.forEach((simbolo) => {
      expect(normalizarQualidade(simbolo)).toBe(simbolo);
    });
  });

  // Partidas escoutadas antes da migracao gravaram A, B e C. Os relatorios
  // continuam lendo essas linhas, entao a traducao nao pode sumir.
  it('traduz a escala antiga de 3 niveis', () => {
    expect(normalizarQualidade('A')).toBe('#');
    expect(normalizarQualidade('B')).toBe('!');
    expect(normalizarQualidade('C')).toBe('=');
    expect(normalizarQualidade('a')).toBe(MAPA_LEGADO.A);
  });

  it('rejeita o que nao esta na escala', () => {
    expect(normalizarQualidade('Z')).toBeNull();
    expect(normalizarQualidade('')).toBeNull();
    expect(normalizarQualidade(null)).toBeNull();
  });

  it('mantem o mapa de fundamento e idTipoAcao coerente nos dois sentidos', () => {
    Object.entries(TIPO_ACAO_PARA_FUNDAMENTO).forEach(([id, fundamento]) => {
      expect(FUNDAMENTO_PARA_TIPO_ACAO[fundamento]).toBe(Number(id));
    });
    expect(Object.keys(FUNDAMENTO_PARA_TIPO_ACAO).sort()).toEqual([...FUNDAMENTOS].sort());
  });
});

describe('Significado do simbolo por fundamento', () => {
  // O mesmo simbolo muda de sentido conforme o fundamento; e o ponto inteiro
  // da escala do DataVolley e a fonte mais provavel de regressao.
  it('so saque, ataque e bloqueio encerram o rally a favor da equipe', () => {
    expect(classificar('Saque', '#')).toBe('PONTO');
    expect(classificar('Ataque', '#')).toBe('PONTO');
    expect(classificar('Bloqueio', '#')).toBe('PONTO');
    expect(classificar('Recepcao', '#')).toBe('NEUTRO');
    expect(classificar('Defesa', '#')).toBe('NEUTRO');
  });

  it('trata a bola barrada como erro so onde ela perde o ponto', () => {
    expect(classificar('Ataque', '/')).toBe('ERRO');
    expect(classificar('Bloqueio', '/')).toBe('ERRO');
    // No saque "/" e uma boa bola: o adversario nao conseguiu atacar.
    expect(classificar('Saque', '/')).toBe('NEUTRO');
    expect(classificar('Recepcao', '/')).toBe('NEUTRO');
  });

  it('trata "=" como erro em todos os fundamentos', () => {
    FUNDAMENTOS.forEach((fundamento) => {
      expect(classificar(fundamento, '=')).toBe('ERRO');
    });
  });

  it('aceita o nome do fundamento acentuado ou nao', () => {
    expect(classificar('Recepção', '=')).toBe('ERRO');
    expect(classificar('recepcao', '=')).toBe('ERRO');
  });

  it('monta a legenda da tela com as seis teclas na ordem', () => {
    const legenda = legendaDoFundamento('Ataque');

    expect(legenda.map((item) => item.tecla)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(legenda.map((item) => item.simbolo)).toEqual([...ESCALA]);
    expect(legenda.every((item) => item.texto.length > 0)).toBe(true);
    expect(legenda.at(-1)).toMatchObject({ simbolo: '#', resultado: 'PONTO' });
  });
});

describe('SQL e JS classificam a acao do mesmo jeito', () => {
  beforeEach(() => {
    resetarBanco();
  });

  // A regra existe duas vezes: em Qualidade.classificar (JS) e em SqlQualidade
  // (dentro das queries de relatorio). Este teste e o que garante que uma nao
  // pode mudar sem a outra.
  const combinacoes = FUNDAMENTOS.flatMap((fundamento) =>
    ESCALA.map((simbolo) => ({ fundamento, simbolo }))
  );

  it('concorda em todas as combinacoes de fundamento e simbolo', () => {
    const jogadorId = criarJogador({ numCamisa: 7 });
    const inserir = db.prepare('INSERT INTO Acao (Jogador_id, idTipoAcao, Qualidade) VALUES (?, ?, ?)');

    const esperado = combinacoes.map(({ fundamento, simbolo }) => {
      const info = inserir.run(jogadorId, FUNDAMENTO_PARA_TIPO_ACAO[fundamento], simbolo);
      return { id: Number(info.lastInsertRowid), fundamento, simbolo, resultado: classificar(fundamento, simbolo) };
    });

    const linhas = db
      .prepare(`
        SELECT A.id,
               ${sqlEhPonto('A')} AS ehPonto,
               ${sqlEhErro('A')} AS ehErro,
               ${sqlEhNeutra('A')} AS ehNeutra
        FROM Acao A
      `)
      .all();

    const porId = new Map(linhas.map((linha) => [linha.id, linha]));

    // Compara as listas inteiras de uma vez: o diff do vitest aponta direto a
    // combinacao divergente, em vez de falhar na primeira e esconder o resto.
    const descrever = ({ fundamento, simbolo }, resultado) => `${fundamento} "${simbolo}" -> ${resultado}`;

    const obtido = esperado.map((combinacao) => {
      const { ehPonto, ehErro, ehNeutra } = porId.get(combinacao.id);
      // As tres condicoes precisam ser mutuamente exclusivas e cobrir tudo.
      expect(ehPonto + ehErro + ehNeutra).toBe(1);
      return descrever(combinacao, ehPonto ? 'PONTO' : ehErro ? 'ERRO' : 'NEUTRO');
    });

    expect(obtido).toEqual(esperado.map((combinacao) => descrever(combinacao, combinacao.resultado)));
  });

  it('conta ponto, neutra e erro sem deixar nenhuma acao de fora', () => {
    const jogadorId = criarJogador({ numCamisa: 9 });
    const inserir = db.prepare('INSERT INTO Acao (Jogador_id, idTipoAcao, Qualidade) VALUES (?, ?, ?)');
    combinacoes.forEach(({ fundamento, simbolo }) => {
      inserir.run(jogadorId, FUNDAMENTO_PARA_TIPO_ACAO[fundamento], simbolo);
    });

    const total = db
      .prepare(`SELECT ${sqlContagemPorResultado('A')} FROM Acao A`)
      .get();

    const contarJs = (alvo) =>
      combinacoes.filter(({ fundamento, simbolo }) => classificar(fundamento, simbolo) === alvo).length;

    expect(total.acoesPonto).toBe(contarJs('PONTO'));
    expect(total.acoesErro).toBe(contarJs('ERRO'));
    expect(total.acoesNeutra).toBe(contarJs('NEUTRO'));
    expect(total.acoesPonto + total.acoesErro + total.acoesNeutra).toBe(combinacoes.length);
  });

  it('o banco recusa um simbolo fora da escala', () => {
    const jogadorId = criarJogador({ numCamisa: 11 });

    expect(() =>
      db.prepare('INSERT INTO Acao (Jogador_id, idTipoAcao, Qualidade) VALUES (?, ?, ?)').run(jogadorId, 2, 'A')
    ).toThrow(/CHECK constraint/i);
  });
});
