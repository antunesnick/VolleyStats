class TimesPartida {
    constructor(time, partida) {
        this.time = time;
        this.partida = partida;
        this.linha = [];
        this.banco = [];
    }

    adicionarJogadorLinha(jogador) {
        this.linha.push(jogador);
    }

    adicionarJogadorBanco(jogador) {
        this.banco.push(jogador);
    }

    realizarSubstituicao(jogadorSai, jogadorEntra) {
        const indexLinha = this.linha.indexOf(jogadorSai);
        const indexBanco = this.banco.indexOf(jogadorEntra);

        // Se o jogador a sair estiver em quadra e o outro no banco, inverte
        if (indexLinha > -1 && indexBanco > -1) {
            this.linha.splice(indexLinha, 1);
            this.banco.splice(indexBanco, 1);
            
            this.linha.push(jogadorEntra);
            this.banco.push(jogadorSai);
        }
    }
}

module.exports = TimesPartida;