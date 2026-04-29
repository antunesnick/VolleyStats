class TimesPartida {
    constructor(time, partida) {
        this.time = time;
        this.partida = partida;
        this.linha = [];
        this.banco = [];
        this.maxLinha = 6;
        this.maxBanco = 8;
        this.maxTotal = 14;
    }

    totalJogadores() {
        return this.linha.length + this.banco.length;
    }

    adicionarJogadorLinha(jogador) {
        if (this.linha.length >= this.maxLinha) return false;
        if (this.totalJogadores() >= this.maxTotal) return false;
        if (this.linha.some((item) => item?.id === jogador?.id)) return false;
        if (this.banco.some((item) => item?.id === jogador?.id)) return false;
        this.linha.push(jogador);
        return true;
    }

    adicionarJogadorBanco(jogador) {
        if (this.banco.length >= this.maxBanco) return false;
        if (this.totalJogadores() >= this.maxTotal) return false;
        if (this.linha.some((item) => item?.id === jogador?.id)) return false;
        if (this.banco.some((item) => item?.id === jogador?.id)) return false;
        this.banco.push(jogador);
        return true;
    }

    removerJogadorLinha(jogador) {
        this.linha = this.linha.filter((item) => item?.id !== jogador?.id);
        return true;
    }

    removerJogadorBanco(jogador) {
        this.banco = this.banco.filter((item) => item?.id !== jogador?.id);
        return true;
    }

    realizarSubstituicao(jogadorSai, jogadorEntra) {
        const indexLinha = this.linha.findIndex((item) => item?.id === jogadorSai?.id);
        const indexBanco = this.banco.findIndex((item) => item?.id === jogadorEntra?.id);

        if (indexLinha > -1 && indexBanco > -1) {
            const [saindo] = this.linha.splice(indexLinha, 1);
            const [entrando] = this.banco.splice(indexBanco, 1);
            this.linha.push(entrando);
            this.banco.push(saindo);
            return true;
        }

        return false;
    }

    static jogadorNaLinha(jogador) {
        return this.linha.includes(jogador);
    }
}

module.exports = TimesPartida;