import Ponto from './Ponto';
import SetPartida from './SetPartida';
import { TIPO_ACAO_PARA_FUNDAMENTO, normalizarQualidade } from './Qualidade';
import { sqlEhErro, sqlEhNeutra, sqlEhPonto } from './SqlQualidade';

/**
 * Scout do time adversario.
 *
 * O que o analista quer daqui e a leitura que nao existia: quantos ataques o
 * adversario errou, quantos bloqueios pontuaram contra, onde a equipe ganha
 * ponto sem precisar fazer nada. Ate agora so a propria equipe era escoutada,
 * entao "erro do adversario" so aparecia como um numero somado no placar.
 *
 * Por que uma tabela propria e nao `Acao`:
 *
 *   - `Acao.Jogador_id` e NOT NULL e referencia `Jogadores`. Os atletas do
 *     adversario nao estao cadastrados, e cadastra-los para escoutar poluiria o
 *     elenco, o ranking e todo relatorio de jogador do sistema.
 *   - Aqui o atleta e so a camisa lida na quadra - e pode faltar, quando o
 *     analista nao consegue identificar quem jogou.
 *   - Separado, nenhum relatorio existente muda de numero: tudo que conta
 *     `Acao` continua contando apenas a propria equipe.
 *
 * A escala de qualidade e a mesma, sempre lida da perspectiva de QUEM EXECUTOU
 * a acao. Um ataque '=' do adversario e erro dele, ou seja, ponto nosso.
 */

/** Qualidade valida ou erro claro: o CHECK do banco recusaria em silencio. */
function exigirQualidade(qualidade) {
    const simbolo = normalizarQualidade(qualidade);
    if (!simbolo) {
        throw new Error(`Qualidade invalida para acao do adversario: "${qualidade}".`);
    }
    return simbolo;
}

function exigirTipoAcao(idTipoAcao) {
    const id = Number(idTipoAcao);
    if (!TIPO_ACAO_PARA_FUNDAMENTO[id]) {
        throw new Error(`Fundamento invalido para acao do adversario: "${idTipoAcao}".`);
    }
    return id;
}

/** Camisa opcional: NULL quando o analista nao identificou o atleta. */
function normalizarCamisa(numCamisa) {
    if (numCamisa === null || numCamisa === undefined || numCamisa === '') return null;
    const numero = Number(numCamisa);
    return Number.isFinite(numero) ? numero : null;
}

const SELECT_RESUMO = `
    A.idTipoAcao AS idTipoAcao,
    COUNT(*) AS total,
    SUM(CASE WHEN ${sqlEhPonto('A')} THEN 1 ELSE 0 END) AS pontos,
    SUM(CASE WHEN ${sqlEhErro('A')} THEN 1 ELSE 0 END) AS erros,
    SUM(CASE WHEN ${sqlEhNeutra('A')} THEN 1 ELSE 0 END) AS neutras
`;

const linhaResumo = (row) => ({
    idTipoAcao: Number(row.idTipoAcao),
    fundamento: TIPO_ACAO_PARA_FUNDAMENTO[Number(row.idTipoAcao)] || 'Outros',
    total: Number(row.total) || 0,
    pontos: Number(row.pontos) || 0,
    erros: Number(row.erros) || 0,
    neutras: Number(row.neutras) || 0,
});

class AcaoAdversario {
    /**
     * Grava uma acao do adversario no rally corrente.
     *
     * O rally (`Ponto`) e criado junto, como na acao da propria equipe, para o
     * lance aparecer no painel lateral mesmo quando o unico registro daquele
     * rally veio do adversario.
     */
    static gravar({ partidaId, numSet, pontoTime1, pontoTime2, numCamisa, idTipoAcao, qualidade }, db) {
        const partida = Number(partidaId);
        const set = Number(numSet);

        if (!partida || !set) {
            throw new Error('Partida e set sao obrigatorios para escoutar o adversario.');
        }

        const tipo = exigirTipoAcao(idTipoAcao);
        const simbolo = exigirQualidade(qualidade);
        const camisa = normalizarCamisa(numCamisa);

        const home = Number(pontoTime1) || 0;
        const away = Number(pontoTime2) || 0;

        const ponto = new Ponto(home, away, new SetPartida(set, { id: partida }));
        ponto.criarPonto(db);

        const info = db.prepare(`
            INSERT INTO AcaoAdversario
                (Partida_id, NumSet, Ponto_pontoTime1, Ponto_pontoTime2, numCamisa, Qualidade, idTipoAcao)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(partida, set, home, away, camisa, simbolo, tipo);

        return Number(info.lastInsertRowid);
    }

    static deletarPorId(id, db) {
        const info = db.prepare('DELETE FROM AcaoAdversario WHERE id = ?').run(Number(id));
        return { success: info.changes > 0, changes: info.changes };
    }

    /** Acoes do adversario de um set, para o painel lateral do scout. */
    static buscarPorSet(partidaId, numSet, db) {
        return db.prepare(`
            SELECT
                A.id,
                A.numCamisa,
                A.Qualidade AS qualidade,
                A.idTipoAcao,
                A.Ponto_pontoTime1 AS pontoTime1,
                A.Ponto_pontoTime2 AS pontoTime2,
                T.Nome AS tipoAcaoNome
            FROM AcaoAdversario A
            LEFT JOIN TipoAcao T ON T.idTipoAcao = A.idTipoAcao
            WHERE A.Partida_id = ? AND A.NumSet = ?
            ORDER BY A.id ASC
        `).all(Number(partidaId), Number(numSet));
    }

    /**
     * Contagem por fundamento. `numSet = null` soma a partida inteira.
     *
     * `pontos` sao os rallies que o adversario fechou a favor dele; `erros` os
     * que ele entregou. Do ponto de vista da nossa equipe a leitura se inverte:
     * o erro do adversario e ponto nosso - por isso a tela rotula essa coluna
     * como "pontos que ganhamos".
     */
    static resumoPorFundamento(partidaId, db, numSet = null) {
        const filtroSet = numSet === null || numSet === undefined ? '' : 'AND A.NumSet = ?';
        const params = [Number(partidaId)];
        if (filtroSet) params.push(Number(numSet));

        const rows = db.prepare(`
            SELECT ${SELECT_RESUMO}
            FROM AcaoAdversario A
            WHERE A.Partida_id = ? ${filtroSet}
            GROUP BY A.idTipoAcao
            ORDER BY A.idTipoAcao ASC
        `).all(...params);

        return rows.map(linhaResumo);
    }

    /** Mesma contagem, quebrada pela camisa do adversario. */
    static resumoPorCamisa(partidaId, db, numSet = null) {
        const filtroSet = numSet === null || numSet === undefined ? '' : 'AND A.NumSet = ?';
        const params = [Number(partidaId)];
        if (filtroSet) params.push(Number(numSet));

        const rows = db.prepare(`
            SELECT
                A.numCamisa AS numCamisa,
                COUNT(*) AS total,
                SUM(CASE WHEN ${sqlEhPonto('A')} THEN 1 ELSE 0 END) AS pontos,
                SUM(CASE WHEN ${sqlEhErro('A')} THEN 1 ELSE 0 END) AS erros,
                SUM(CASE WHEN ${sqlEhNeutra('A')} THEN 1 ELSE 0 END) AS neutras
            FROM AcaoAdversario A
            WHERE A.Partida_id = ? ${filtroSet}
            GROUP BY A.numCamisa
            ORDER BY pontos DESC, total DESC, A.numCamisa ASC
        `).all(...params);

        return rows.map((row) => ({
            numCamisa: row.numCamisa === null ? null : Number(row.numCamisa),
            total: Number(row.total) || 0,
            pontos: Number(row.pontos) || 0,
            erros: Number(row.erros) || 0,
            neutras: Number(row.neutras) || 0,
        }));
    }

    /**
     * Resumo pronto para a tela: totais, um bloco por fundamento e o ranking
     * de camisas. `numSet = null` soma a partida inteira.
     */
    static resumoDaPartida(partidaId, db, numSet = null) {
        const porFundamento = AcaoAdversario.resumoPorFundamento(partidaId, db, numSet);
        const porCamisa = AcaoAdversario.resumoPorCamisa(partidaId, db, numSet);

        const totais = porFundamento.reduce(
            (acc, item) => ({
                total: acc.total + item.total,
                pontos: acc.pontos + item.pontos,
                erros: acc.erros + item.erros,
                neutras: acc.neutras + item.neutras,
            }),
            { total: 0, pontos: 0, erros: 0, neutras: 0 }
        );

        // Indexado pelo nome do fundamento: a tela monta uma linha fixa por
        // fundamento, inclusive os que ainda nao tiveram nenhuma acao.
        const porNome = Object.fromEntries(porFundamento.map((item) => [item.fundamento, item]));

        return { totais, porFundamento, porNome, porCamisa };
    }

    /** Apaga o scout do adversario de uma partida (cascata de exclusao). */
    static deletarPorPartida(partidaId, db) {
        db.prepare('DELETE FROM AcaoAdversario WHERE Partida_id = ?').run(Number(partidaId));
    }
}

export default AcaoAdversario;
