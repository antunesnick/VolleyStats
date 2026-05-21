import db from '../db/db.js';
class Categoria{
    constructor(nome, idadeMin, idadeMax){
        this.nome = nome
        this.idadeMin = idadeMin
        this.idadeMax = idadeMax
    }

    validarIdade(idadeMin, idadeMax){
        if(idadeMin < 12 || idadeMax < 13){
            return 'Idade mínima e máxima devem ser maiores ou iguais a 12 e 13, respectivamente.'
        }
        if(idadeMin > idadeMax){
            return 'Idade mínima não pode ser maior que a idade máxima.';
        }
        return null;
    }

    async criarCategoria(){
        const erro = this.validarIdade(this.idadeMin, this.idadeMax);
        if(erro){
            throw new Error(erro);
        }
        try {
            const sql = db.prepare('INSERT INTO Categorias (nome, idadeMin, idadeMax) VALUES (?, ?, ?)');
            const info = sql.run(this.nome, this.idadeMin, this.idadeMax);
            return info.lastInsertRowid;
        } catch (e) {
            throw e;
        }
    }

    async buscarTodas(){
        try {
            const sql = db.prepare('SELECT * FROM Categorias ORDER BY nome');
            return sql.all();
        } catch (e) {
            throw e;
        }
    }

    async buscarRelatorioGeral(filtros = {}){
        try {
            const timeId = filtros.timeId ? Number(filtros.timeId) : null;
            const posicaoId = filtros.posicaoId ? Number(filtros.posicaoId) : null;
            const torneioId = filtros.torneioId ? Number(filtros.torneioId) : null;
            const whereJogadores = [];
            const paramsJogadores = [];

            if (timeId) {
                whereJogadores.push('tp.Times_id = ?');
                paramsJogadores.push(timeId);
            }

            if (posicaoId) {
                whereJogadores.push('j.posicao_id = ?');
                paramsJogadores.push(posicaoId);
            }

            if (torneioId) {
                whereJogadores.push('pa.torneio_id = ?');
                paramsJogadores.push(torneioId);
            }

            const whereSql = whereJogadores.length > 0 ? `WHERE ${whereJogadores.join(' AND ')}` : '';
            const categorias = db.prepare(`
                SELECT
                    c.id,
                    c.nome,
                    c.idadeMin,
                    c.idadeMax,
                    COUNT(fj.id) AS totalJogadores
                FROM Categorias c
                LEFT JOIN (
                    SELECT DISTINCT
                        j.id,
                        j.categoria_id
                    FROM Jogadores j
                    LEFT JOIN TimesPartida tp ON tp.Jogadores_id = j.id
                    LEFT JOIN Partidas pa ON pa.id = tp.Partida_id
                    ${whereSql}
                ) fj ON fj.categoria_id = c.id
                GROUP BY c.id
                ORDER BY c.idadeMin ASC, c.nome ASC
            `).all(...paramsJogadores);

            const filtrosAplicados = {
                timeId,
                timeNome: timeId ? db.prepare('SELECT nome FROM Times WHERE id = ?').get(timeId)?.nome || null : null,
                posicaoId,
                posicaoNome: posicaoId ? db.prepare('SELECT nome FROM Posicoes WHERE id = ?').get(posicaoId)?.nome || null : null,
                torneioId,
                torneioNome: torneioId ? db.prepare('SELECT nome FROM Torneios WHERE id = ?').get(torneioId)?.nome || null : null,
            };

            const opcoes = {
                times: db.prepare('SELECT id, nome FROM Times ORDER BY nome ASC').all(),
                posicoes: db.prepare('SELECT id, nome FROM Posicoes ORDER BY nome ASC').all(),
                torneios: db.prepare('SELECT id, nome FROM Torneios ORDER BY nome ASC').all(),
            };

            const totalCategorias = categorias.length;
            const totalJogadores = categorias.reduce((acc, categoria) => acc + (Number(categoria.totalJogadores) || 0), 0);
            const categoriasComJogadores = categorias.filter((categoria) => Number(categoria.totalJogadores) > 0).length;
            const categoriasSemJogadores = totalCategorias - categoriasComJogadores;
            const idadesMinimas = categorias.map((categoria) => Number(categoria.idadeMin)).filter(Number.isFinite);
            const idadesMaximas = categorias.map((categoria) => Number(categoria.idadeMax)).filter(Number.isFinite);
            const amplitudes = categorias.map((categoria) => ({
                ...categoria,
                amplitude: (Number(categoria.idadeMax) || 0) - (Number(categoria.idadeMin) || 0),
            }));

            const categoriaMaisJogadores = [...categorias].sort((a, b) => {
                const diff = (Number(b.totalJogadores) || 0) - (Number(a.totalJogadores) || 0);
                return diff !== 0 ? diff : String(a.nome || '').localeCompare(String(b.nome || ''));
            })[0] || null;

            const maiorFaixaEtaria = [...amplitudes].sort((a, b) => {
                const diff = b.amplitude - a.amplitude;
                return diff !== 0 ? diff : String(a.nome || '').localeCompare(String(b.nome || ''));
            })[0] || null;

            const menorFaixaEtaria = [...amplitudes].sort((a, b) => {
                const diff = a.amplitude - b.amplitude;
                return diff !== 0 ? diff : String(a.nome || '').localeCompare(String(b.nome || ''));
            })[0] || null;

            const somaAmplitude = amplitudes.reduce((acc, categoria) => acc + categoria.amplitude, 0);

            return {
                resumo: {
                    totalCategorias,
                    totalJogadores,
                    categoriasComJogadores,
                    categoriasSemJogadores,
                    menorIdade: idadesMinimas.length ? Math.min(...idadesMinimas) : 0,
                    maiorIdade: idadesMaximas.length ? Math.max(...idadesMaximas) : 0,
                    mediaJogadoresPorCategoria: totalCategorias > 0 ? Number((totalJogadores / totalCategorias).toFixed(1)) : 0,
                    mediaAmplitudeFaixa: totalCategorias > 0 ? Number((somaAmplitude / totalCategorias).toFixed(1)) : 0,
                },
                destaques: {
                    categoriaMaisJogadores,
                    maiorFaixaEtaria,
                    menorFaixaEtaria,
                },
                filtrosAplicados,
                opcoes,
                categorias: amplitudes,
            };
        } catch (e) {
            throw e;
        }
    }

    async editarCategoria(id){
        const erro = this.validarIdade(this.idadeMin, this.idadeMax);
        if(erro){
            throw new Error(erro);
        }
        try {
            const sql = db.prepare('UPDATE Categorias SET nome = ?, idadeMin = ?, idadeMax = ? WHERE id = ?');
            sql.run(this.nome, this.idadeMin, this.idadeMax, id);
        } catch (e) {
            throw e;
        }
    }

    async excluirCategoria(id){
        try {
            const sql = db.prepare('DELETE FROM Categorias WHERE id = ?');
            sql.run(id);
        } catch (e) {
            throw e;
        }
    }
}

export default Categoria;

