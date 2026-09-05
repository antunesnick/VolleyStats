import Database from 'better-sqlite3';
import { getDatabasePath } from '../config/appPaths';

const dbPath = getDatabasePath();

// O log de toda query so e ligado sob demanda: em uso normal ele polui o
// console e custa desempenho no scout ao vivo.
const verbose = process.env.VOLLEYSTATS_SQL_DEBUG === '1' ? console.log : null;

const db = new Database(dbPath, { verbose });

db.pragma('foreign_keys = ON');

function getDatabase() {
    return db;
}

function ensureTournamentColumns() {
    const columns = db.prepare("PRAGMA table_info(Torneios)").all().map((column) => column.name);

    if (!columns.includes('inicio')) {
        db.exec('ALTER TABLE Torneios ADD COLUMN inicio DATE');
    }

    if (!columns.includes('termino')) {
        db.exec('ALTER TABLE Torneios ADD COLUMN termino DATE');
    }

    if (columns.includes('startDate')) {
        db.exec('UPDATE Torneios SET inicio = COALESCE(inicio, startDate)');
    }

    if (columns.includes('endDate')) {
        db.exec('UPDATE Torneios SET termino = COALESCE(termino, endDate)');
    }

    if (columns.includes('dataInicio')) {
        db.exec('UPDATE Torneios SET inicio = COALESCE(inicio, dataInicio)');
    }

    if (columns.includes('dataTermino')) {
        db.exec('UPDATE Torneios SET termino = COALESCE(termino, dataTermino)');
    }
}

function seedTipoAcao() {
    const tipos = [
        { id: 1, nome: 'Saque' },
        { id: 2, nome: 'Ataque' },
        { id: 3, nome: 'Bloqueio' },
        { id: 4, nome: 'Recepção' },
        { id: 5, nome: 'Defesa' },
    ];
    const insert = db.prepare('INSERT OR IGNORE INTO TipoAcao (idTipoAcao, Nome) VALUES (?, ?)');
    for (const tipo of tipos) {
        insert.run(tipo.id, tipo.nome);
    }
}

function ensurePartidaColumns() {
    const columns = db.prepare("PRAGMA table_info(Partidas)").all().map((column) => column.name);
    
    if (!columns.includes('nome')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN nome VARCHAR(100)');
    }
    // Adicionando as colunas que faltam para o PartidaModel funcionar
    if (!columns.includes('dataPartida')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN dataPartida DATE');
    }
    if (!columns.includes('tipo')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN tipo INTEGER');
    }
    if (!columns.includes('status')) {
        db.exec("ALTER TABLE Partidas ADD COLUMN status VARCHAR(50) DEFAULT 'AGENDADA'");
    }
    if (!columns.includes('externa')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN externa INTEGER DEFAULT 0');
    }
    if (!columns.includes('torneio_id')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN torneio_id INTEGER REFERENCES Torneios(id)');
    }

    if (!columns.includes('fase')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN fase VARCHAR(45)');
    }

    if (!columns.includes('videoLink')) {
      db.exec('ALTER TABLE Partidas ADD COLUMN videoLink VARCHAR(2048)');
    }

    // Formato da partida: 2 = melhor de 3, 3 = melhor de 5. Define quantos
    // pontos vale o set decisivo e quando a partida pode ser encerrada.
    // Partidas anteriores a esta coluna eram todas tratadas como melhor de 5.
    if (!columns.includes('setsParaVencer')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN setsParaVencer INTEGER DEFAULT 3');
        db.exec('UPDATE Partidas SET setsParaVencer = 3 WHERE setsParaVencer IS NULL');
    }
}

/**
 * Migra Acao.Qualidade da escala antiga de 3 niveis (A/B/C) para a escala de
 * 6 niveis do DataVolley (= / - ! + #).
 *
 * O CHECK antigo so aceita A, B e C, e SQLite nao permite alterar um CHECK -
 * a tabela precisa ser reconstruida. Nenhuma outra tabela referencia Acao, so
 * Acao referencia as outras, entao a reconstrucao e segura.
 *
 * Mapeamento: A -> # (ponto/perfeito), B -> ! (ok), C -> = (erro).
 */
function ensureAcaoEscalaQualidade() {
    const schema = db.prepare(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'Acao'"
    ).get();

    // Sem a escala antiga no CHECK nao ha o que migrar - inclusive em bancos
    // novos, que ja nascem com a escala nova no CREATE TABLE.
    if (!schema?.sql || !/'A'\s*,\s*'B'\s*,\s*'C'/.test(schema.sql)) {
        return;
    }

    // PRAGMA foreign_keys nao tem efeito dentro de transacao, por isso o
    // desligamento fica fora dela (procedimento padrao de ALTER do SQLite).
    db.pragma('foreign_keys = OFF');

    try {
        db.transaction(() => {
            db.exec(`
                CREATE TABLE Acao_nova (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    Ponto_pontoTime1 INTEGER,
                    Ponto_pontoTime2 INTEGER,
                    Ponto_Partida_id INTEGER,
                    Ponto_NumSet INTEGER,
                    Jogador_id INTEGER NOT NULL,
                    importacao_id INTEGER,
                    Qualidade TEXT CHECK(Qualidade IN ('=', '/', '-', '!', '+', '#')),
                    idTipoAcao INTEGER NOT NULL,
                    FOREIGN KEY (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id) REFERENCES Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id),
                    FOREIGN KEY (Jogador_id) REFERENCES Jogadores (id),
                    FOREIGN KEY (idTipoAcao) REFERENCES TipoAcao (idTipoAcao),
                    FOREIGN KEY (importacao_id) REFERENCES ImportacaoHistorico(id) ON DELETE CASCADE
                );

                INSERT INTO Acao_nova (
                    id, Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id,
                    Ponto_NumSet, Jogador_id, importacao_id, Qualidade, idTipoAcao
                )
                SELECT
                    id, Ponto_pontoTime1, Ponto_pontoTime2, Ponto_Partida_id,
                    Ponto_NumSet, Jogador_id, importacao_id,
                    CASE Qualidade
                        WHEN 'A' THEN '#'
                        WHEN 'B' THEN '!'
                        WHEN 'C' THEN '='
                        ELSE NULL
                    END,
                    idTipoAcao
                FROM Acao;

                DROP TABLE Acao;
                ALTER TABLE Acao_nova RENAME TO Acao;
            `);
        })();

        const violacoes = db.pragma('foreign_key_check');
        if (violacoes.length > 0) {
            console.error('Migracao da escala de qualidade deixou FKs invalidas:', violacoes);
        }
    } finally {
        db.pragma('foreign_keys = ON');
    }
}

/**
 * Atribuicao do ponto a um atleta.
 *
 * Jogador_id  - atleta responsavel pela ultima acao do rally. E ele que "leva"
 *               o ponto nos relatorios.
 * vencedor    - quem ganhou o rally ('MANDANTE' | 'VISITANTE'). Sem isso um erro
 *               de ataque seria contado como ponto a favor do atleta.
 */
function ensureSetColumns() {
    const columns = db.prepare('PRAGMA table_info("Set")').all().map((column) => column.name);

    if (!columns.includes('pontosTime1')) {
        db.exec('ALTER TABLE "Set" ADD COLUMN pontosTime1 INTEGER');
    }

    if (!columns.includes('pontosTime2')) {
        db.exec('ALTER TABLE "Set" ADD COLUMN pontosTime2 INTEGER');
    }

    if (!columns.includes('encerrado')) {
        db.exec('ALTER TABLE "Set" ADD COLUMN encerrado INTEGER DEFAULT 0');
        // Sets de partidas ja finalizadas contam como encerrados: e a unica
        // leitura possivel de um placar gravado numa partida que acabou.
        db.exec(`
            UPDATE "Set"
            SET encerrado = 1
            WHERE pontosTime1 IS NOT NULL
              AND pontosTime2 IS NOT NULL
              AND pontosTime1 <> pontosTime2
              AND Partida_id IN (SELECT id FROM Partidas WHERE status = 'FINALIZADA')
        `);
    }
}

function ensurePontoColumns() {
    const columns = db.prepare('PRAGMA table_info(Ponto)').all().map((column) => column.name);

    if (!columns.includes('Jogador_id')) {
        db.exec('ALTER TABLE Ponto ADD COLUMN Jogador_id INTEGER REFERENCES Jogadores(id)');
    }

    if (!columns.includes('vencedor')) {
        db.exec("ALTER TABLE Ponto ADD COLUMN vencedor TEXT");
    }
}

function ensureGinasioColumns() {
    const columns = db.prepare("PRAGMA table_info(Ginasios)").all().map((column) => column.name);

    if (!columns.includes('endereco')) {
        db.exec('ALTER TABLE Ginasios ADD COLUMN endereco VARCHAR(255)');
    }
}

function ensureTorneioTimesSchema() {
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'TorneioTimes'").get();

    if (!table?.sql || !table.sql.includes('REFERENCES Torneios (idTorneio)')) {
        return;
    }

    db.exec(`
        PRAGMA foreign_keys = OFF;
        DROP TABLE TorneioTimes;
        CREATE TABLE TorneioTimes (
            Torneio_idTorneio INTEGER NOT NULL,
            Times_id INTEGER NOT NULL,
            pontuacao INTEGER,
            fase INTEGER,
            PRIMARY KEY (Torneio_idTorneio, Times_id),
            FOREIGN KEY (Torneio_idTorneio) REFERENCES Torneios (id) ON DELETE CASCADE,
            FOREIGN KEY (Times_id) REFERENCES Times (id)
        );
        PRAGMA foreign_keys = ON;
    `);
}

function initDatabase() {
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS Categorias(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(80) NOT NULL,
                idadeMin INTEGER NOT NULL,
                idadeMax INTEGER NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Times(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(80) NOT NULL,
                imagem VARCHAR(255),
                cidade VARCHAR(45) NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Torneios(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(80) NOT NULL,
                tipo INTEGER NOT NULL,
                inicio DATE,
                termino DATE
            );
            
            CREATE TABLE IF NOT EXISTS Ginasios(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(80) NOT NULL,
                estado VARCHAR(80) NOT NULL,
                cidade VARCHAR(80) NOT NULL,
                endereco VARCHAR(255)
            );

            CREATE TABLE IF NOT EXISTS Partidas(
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(100),
                dataPartida DATE,
                tipo INTEGER,
                status VARCHAR(50) DEFAULT 'AGENDADA',
                externa INTEGER DEFAULT 0,
                pontosTime1 INTEGER,
                pontosTime2 INTEGER,
                -- Sets que uma equipe precisa vencer: 2 = melhor de 3, 3 = melhor de 5.
                setsParaVencer INTEGER DEFAULT 3,
                torneio_id INTEGER,
                ginasio_id INTEGER,
                time1 INTEGER,
                time2 INTEGER,

                FOREIGN KEY (torneio_id) REFERENCES Torneios (id),
                FOREIGN KEY (ginasio_id) REFERENCES Ginasios (id),
                FOREIGN KEY (time1) REFERENCES Times (id),
                FOREIGN KEY (time2) REFERENCES Times (id)
            );

            -- POSICOES CRIADA ANTES DE JOGADORES
            CREATE TABLE IF NOT EXISTS Posicoes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nome VARCHAR(45) UNIQUE NOT NULL
            );

            CREATE TABLE IF NOT EXISTS Jogadores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                cpf VARCHAR(14) UNIQUE, 
                nome VARCHAR(70),
                dataNasc DATE,
                numCamisa INTEGER,
                rg VARCHAR(14) UNIQUE, 
                altura FLOAT,
                posicao_id INTEGER NOT NULL,
                categoria_id INTEGER,  
                foto VARCHAR(255),
                FOREIGN KEY (posicao_id) REFERENCES Posicoes (id),
                FOREIGN KEY (categoria_id) REFERENCES Categorias (id)
            );

            CREATE TABLE IF NOT EXISTS TimesPartida (
                Times_id INTEGER NOT NULL,
                Partida_id INTEGER NOT NULL,
                Jogadores_id INTEGER NOT NULL,
                linha TINYINT,
                
                -- Definição da Chave Primária Composta
                PRIMARY KEY (Times_id, Partida_id, Jogadores_id),
                
                -- Relações (Chaves Estrangeiras)
                FOREIGN KEY (Times_id) REFERENCES Times (id) ON DELETE CASCADE,
                FOREIGN KEY (Partida_id) REFERENCES Partidas (id) ON DELETE CASCADE,
                FOREIGN KEY (Jogadores_id) REFERENCES Jogadores (id) ON DELETE CASCADE
            );

            -------------------------------------------------------
            -- Tabela TimesCategorias
            -- ----------------------------------------------------
            CREATE TABLE IF NOT EXISTS TimesCategorias (
            Times_id INTEGER NOT NULL,
            Categorias_id INTEGER NOT NULL,
            PRIMARY KEY (Times_id, Categorias_id),
            FOREIGN KEY (Times_id) REFERENCES Times (id),
            FOREIGN KEY (Categorias_id) REFERENCES Categorias (id)
            );

            -- -----------------------------------------------------
            -- Tabela JogadoresTimes
            -- -----------------------------------------------------
            CREATE TABLE IF NOT EXISTS JogadoresTimes (
            Jogadores_id INTEGER NOT NULL,
            Times_id INTEGER NOT NULL,
            Categorias_id INTEGER NOT NULL,
            PRIMARY KEY (Jogadores_id, Times_id, Categorias_id),
            FOREIGN KEY (Jogadores_id) REFERENCES Jogadores (id),
            FOREIGN KEY (Times_id, Categorias_id) REFERENCES TimesCategorias (Times_id, Categorias_id)
            );

            CREATE TABLE IF NOT EXISTS 'Set' (
                NumSet INTEGER NOT NULL,
                Partida_id INTEGER NOT NULL,
                pontosTime1 INTEGER,
                pontosTime2 INTEGER,
                -- 1 quando o analista fechou o set. Sem isso nao da para
                -- distinguir "20x18 em andamento" de "25x18 terminado", e a
                -- contagem de sets ganhos vira chute.
                encerrado INTEGER DEFAULT 0,
                PRIMARY KEY (NumSet, Partida_id),
                FOREIGN KEY (Partida_id) REFERENCES Partidas (id)
            );

            CREATE TABLE IF NOT EXISTS Ponto (
                pontoTime1 INTEGER NOT NULL,
                pontoTime2 INTEGER NOT NULL,
                NumSet INTEGER NOT NULL,
                Set_Partida_id INTEGER NOT NULL,
                -- Atleta dono do ponto: autor da ultima acao registrada no rally.
                Jogador_id INTEGER,
                -- 'MANDANTE' | 'VISITANTE': quem venceu o rally.
                vencedor TEXT,
                PRIMARY KEY (pontoTime1, pontoTime2, NumSet, Set_Partida_id),
                FOREIGN KEY (NumSet, Set_Partida_id) REFERENCES 'Set' (NumSet, Partida_id),
                FOREIGN KEY (Jogador_id) REFERENCES Jogadores (id)
            );

            CREATE TABLE IF NOT EXISTS TipoAcao (
                idTipoAcao INTEGER PRIMARY KEY,
                Nome VARCHAR(45)
            );
            
            CREATE TABLE IF NOT EXISTS ImportacaoHistorico (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nomeArquivo VARCHAR(255) NOT NULL,
                dataImportacao DATETIME DEFAULT CURRENT_TIMESTAMP
            );

           CREATE TABLE IF NOT EXISTS Acao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Ponto_pontoTime1 INTEGER , -- REMOVIDO NOT NULL PARA DADOS IMPORTADOS 28/04
            Ponto_pontoTime2 INTEGER , -- REMOVIDO NOT NULL PARA DADOS IMPORTADOS 28/04
            Ponto_Partida_id INTEGER , -- REMOVIDO NOT NULL PARA DADOS IMPORTADOS 28/04
            Ponto_NumSet INTEGER ,     -- REMOVIDO NOT NULL PARA DADOS IMPORTADOS 28/04
            Jogador_id INTEGER NOT NULL,
            importacao_id INTEGER,
            -- Escala de 6 niveis do DataVolley, do erro ao ponto.
            Qualidade TEXT CHECK(Qualidade IN ('=', '/', '-', '!', '+', '#')),
            idTipoAcao INTEGER NOT NULL,
            -- CORREÇÃO DA FOREIGN KEY AQUI:
            FOREIGN KEY (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id) REFERENCES Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id),
            FOREIGN KEY (Jogador_id) REFERENCES Jogadores (id),
            FOREIGN KEY (idTipoAcao) REFERENCES TipoAcao (idTipoAcao),
            FOREIGN KEY (importacao_id) REFERENCES ImportacaoHistorico(id) ON DELETE CASCADE
            );

            -- Scout do adversario.
            --
            -- Fica fora de Acao de proposito: Acao.Jogador_id e NOT NULL e
            -- referencia Jogadores, e os atletas do adversario nao estao
            -- cadastrados (nem devem estar - eles nao sao da equipe). Aqui o
            -- atleta e apenas o numero da camisa lido na quadra, e pode ate
            -- faltar quando o analista nao consegue identificar quem jogou.
            --
            -- A separacao tambem mantem todo relatorio existente correto sem
            -- mudanca nenhuma: nada que conta Acao passa a contar o adversario.
            CREATE TABLE IF NOT EXISTS AcaoAdversario (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Partida_id INTEGER NOT NULL,
                NumSet INTEGER NOT NULL,
                -- Rally em que a acao aconteceu. Nullable pelo mesmo motivo de
                -- Acao: uma linha pode existir sem rally correspondente.
                Ponto_pontoTime1 INTEGER,
                Ponto_pontoTime2 INTEGER,
                -- Camisa lida na quadra. NULL = adversario nao identificado.
                numCamisa INTEGER,
                -- Mesma escala de 6 niveis de Acao, lida da perspectiva de quem
                -- executou: um ataque '=' do adversario e erro DELE.
                Qualidade TEXT CHECK(Qualidade IN ('=', '/', '-', '!', '+', '#')),
                idTipoAcao INTEGER NOT NULL,
                FOREIGN KEY (Partida_id) REFERENCES Partidas (id) ON DELETE CASCADE,
                FOREIGN KEY (idTipoAcao) REFERENCES TipoAcao (idTipoAcao)
            );

            CREATE INDEX IF NOT EXISTS idx_acao_adversario_partida
                ON AcaoAdversario (Partida_id, NumSet);

            CREATE TABLE IF NOT EXISTS Substituicao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Ponto_pontoTime1 INTEGER NOT NULL,
                Ponto_pontoTime2 INTEGER NOT NULL,
                Ponto_NumSet INTEGER NOT NULL,
                Ponto_Partida_id INTEGER NOT NULL,
                JogadorEntra INTEGER NOT NULL,
                JogadorSai INTEGER NOT NULL,
                FOREIGN KEY (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id) REFERENCES Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id),
                FOREIGN KEY (JogadorEntra) REFERENCES Jogadores (id),
                FOREIGN KEY (JogadorSai) REFERENCES Jogadores (id)
            );

            -- -----------------------------------------------------
            -- Tabela TorneioTimes
            -- -----------------------------------------------------
            CREATE TABLE IF NOT EXISTS TorneioTimes (
                Torneio_idTorneio INTEGER NOT NULL,
                Times_id INTEGER NOT NULL,
                pontuacao INTEGER,
                fase INTEGER,
                PRIMARY KEY (Torneio_idTorneio, Times_id),
                FOREIGN KEY (Torneio_idTorneio) REFERENCES Torneios (id) ON DELETE CASCADE,
                FOREIGN KEY (Times_id) REFERENCES Times (id)
            );

            -- -----------------------------------------------------
            -- Tabela LinksPartida
            -- -----------------------------------------------------
            CREATE TABLE IF NOT EXISTS LinksPartida (
                numLink INTEGER NOT NULL,
                url VARCHAR(45) NOT NULL,
                Partida_id INTEGER NOT NULL,
                PRIMARY KEY (numLink, Partida_id),
                FOREIGN KEY (Partida_id) REFERENCES Partidas (id)
            );



            -- Tabela de dominio: as 5 posicoes do volei. Nao e dado de demo.
            INSERT OR IGNORE INTO Posicoes (nome) VALUES
                ('Levantador'),
                ('Ponteiro'),
                ('Central'),
                ('Oposto'),
                ('Líbero');
        `);

        ensureTournamentColumns();
        ensureGinasioColumns();
        ensurePartidaColumns();
        ensureSetColumns();
        ensurePontoColumns();
        ensureTorneioTimesSchema();
        ensureAcaoEscalaQualidade();
        seedTipoAcao();
    } catch (e) {
        console.error("Erro ao inicializar o banco de dados:", e);
        throw e;
    }
}

/**
 * Zera o banco e recria o schema. Usado pelos testes para isolar cada caso;
 * nao e chamado em producao.
 */
function resetDatabase() {
    db.pragma('foreign_keys = OFF');

    const tabelas = db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
        .all();

    for (const { name } of tabelas) {
        db.exec(`DROP TABLE IF EXISTS "${name}"`);
    }

    db.pragma('foreign_keys = ON');
    initDatabase();
}

initDatabase();

db.getDatabase = getDatabase;
db.initDatabase = initDatabase;
db.inicializarBanco = initDatabase;
db.resetDatabase = resetDatabase;

export { getDatabase, initDatabase, resetDatabase, ensureAcaoEscalaQualidade };
export default db;
