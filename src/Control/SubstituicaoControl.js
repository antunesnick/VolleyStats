import db from '../db/db';

const MAX_SUBSTITUICOES_POR_SET = 6;

class SubstituicaoControl {
  static #instance;

  static getInstance() {
    if (!SubstituicaoControl.#instance) {
      SubstituicaoControl.#instance = new SubstituicaoControl();
    }

    return SubstituicaoControl.#instance;
  }

  buscarJogador(jogadorId) {
    if (!jogadorId) {
      return null;
    }

    return db.prepare(`
      SELECT
        j.id,
        j.nome,
        j.posicao_id,
        p.nome AS posicaoNome
      FROM Jogadores j
      LEFT JOIN Posicoes p ON p.id = j.posicao_id
      WHERE j.id = ?
    `).get(Number(jogadorId));
  }

  isLibero(jogadorId) {
    const jogador = this.buscarJogador(jogadorId);
    const posicao = String(jogador?.posicaoNome || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

    return posicao.includes('libero');
  }

  buscarSubstituicoesDoSet(partidaId, numSet) {
    if (!partidaId || !numSet) {
      return [];
    }

    return db.prepare(`
      SELECT id, JogadorEntra, JogadorSai
      FROM Substituicao
      WHERE Ponto_Partida_id = ? AND Ponto_NumSet = ?
      ORDER BY id ASC
    `).all(Number(partidaId), Number(numSet));
  }

  montarParesNormais(substituicoes) {
    const pares = [];

    substituicoes
      .filter((item) => !this.isLibero(item.JogadorEntra) && !this.isLibero(item.JogadorSai))
      .forEach((item) => {
        const jogadorEntra = Number(item.JogadorEntra);
        const jogadorSai = Number(item.JogadorSai);
        const par = pares.find((current) => (
          (current.titular === jogadorSai && current.reserva === jogadorEntra)
          || (current.titular === jogadorEntra && current.reserva === jogadorSai)
        ));

        if (par) {
          par.movimentos.push({ jogadorEntra, jogadorSai });
          return;
        }

        pares.push({
          titular: jogadorSai,
          reserva: jogadorEntra,
          movimentos: [{ jogadorEntra, jogadorSai }],
        });
      });

    return pares;
  }

  validarParSubstituicao({ jogadorEntra, jogadorSai, pares }) {
    const entra = Number(jogadorEntra);
    const sai = Number(jogadorSai);
    const parDoEntra = pares.find((par) => par.titular === entra || par.reserva === entra);
    const parDoSai = pares.find((par) => par.titular === sai || par.reserva === sai);

    if (!parDoEntra && !parDoSai) {
      return null;
    }

    if (!parDoEntra || !parDoSai || parDoEntra !== parDoSai) {
      return 'Substituição irregular: o reserva só pode sair para o mesmo titular que ele substituiu.';
    }

    const par = parDoSai;
    const titularSaindo = par.titular === sai && par.reserva === entra;
    const titularVoltando = par.reserva === sai && par.titular === entra;

    if (!titularSaindo && !titularVoltando) {
      return 'Substituição irregular: este par de jogadores não respeita a ordem da troca original.';
    }

    if (titularSaindo) {
      return 'Substituição irregular: o titular já saiu neste set e só poderia voltar no lugar do mesmo reserva.';
    }

    if (titularVoltando && par.movimentos.length >= 2) {
      return 'Substituição irregular: o titular já voltou uma vez neste set.';
    }

    return null;
  }

  validarSubstituicao({ partidaId, jogadorEntra, jogadorSai, numSet = 1 }) {
    const mensagens = [];

    if (!partidaId) {
      mensagens.push('Partida não identificada.');
    }

    if (!jogadorEntra || !jogadorSai) {
      mensagens.push('Selecione o jogador que entra e o jogador que sai.');
    }

    if (Number(jogadorEntra) === Number(jogadorSai)) {
      mensagens.push('O jogador que entra deve ser diferente do jogador que sai.');
    }

    if (mensagens.length > 0) {
      return {
        permissaoSubstituir: false,
        validacoes: { mensagens },
      };
    }

    const substituicoes = this.buscarSubstituicoesDoSet(partidaId, numSet);
    const isTrocaLibero = this.isLibero(jogadorEntra) || this.isLibero(jogadorSai);

    if (!isTrocaLibero) {
      const substituicoesNormais = substituicoes.filter((item) => (
        !this.isLibero(item.JogadorEntra) && !this.isLibero(item.JogadorSai)
      ));

      if (substituicoesNormais.length >= MAX_SUBSTITUICOES_POR_SET) {
        mensagens.push(`Limite de ${MAX_SUBSTITUICOES_POR_SET} substituições por set atingido.`);
      }

      const pares = this.montarParesNormais(substituicoes);
      const erroPar = this.validarParSubstituicao({ jogadorEntra, jogadorSai, pares });

      if (erroPar) {
        mensagens.push(erroPar);
      }
    }

    return {
      permissaoSubstituir: mensagens.length === 0,
      validacoes: { mensagens },
    };
  }

  registrarSubstituicao({ pontoTime1 = 0, pontoTime2 = 0, partidaId, jogadorEntra, jogadorSai, numSet = 1 }) {
    const validacao = this.validarSubstituicao({ partidaId, jogadorEntra, jogadorSai, numSet });

    if (!validacao.permissaoSubstituir) {
      return {
        success: false,
        message: validacao.validacoes.mensagens[0],
      };
    }

    try {
      const transaction = db.transaction(() => {
        db.prepare('INSERT OR IGNORE INTO "Set" (NumSet, Partida_id) VALUES (?, ?)')
          .run(Number(numSet), Number(partidaId));

        db.prepare(`
          INSERT OR IGNORE INTO Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id)
          VALUES (?, ?, ?, ?)
        `).run(Number(pontoTime1), Number(pontoTime2), Number(numSet), Number(partidaId));

        const info = db.prepare(`
          INSERT INTO Substituicao (
            Ponto_pontoTime1,
            Ponto_pontoTime2,
            Ponto_NumSet,
            Ponto_Partida_id,
            JogadorEntra,
            JogadorSai
          ) VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          Number(pontoTime1),
          Number(pontoTime2),
          Number(numSet),
          Number(partidaId),
          Number(jogadorEntra),
          Number(jogadorSai),
        );

        return info.lastInsertRowid;
      });

      return {
        success: true,
        id: transaction(),
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Erro ao registrar substituição.',
      };
    }
  }
}

export default SubstituicaoControl;
