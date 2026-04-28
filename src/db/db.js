const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(process.cwd(), 'developVS.db');
console.log('Caminho do banco de dados:', dbPath);

const db = new Database(dbPath, {verbose: console.log});

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

    if (!columns.includes('videoLink')) {
      db.exec('ALTER TABLE Partidas ADD COLUMN videoLink VARCHAR(2048)');
    }
}

function ensureGinasioColumns() {
    const columns = db.prepare("PRAGMA table_info(Ginasios)").all().map((column) => column.name);

    if (!columns.includes('endereco')) {
        db.exec('ALTER TABLE Ginasios ADD COLUMN endereco VARCHAR(255)');
    }
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
                PRIMARY KEY (NumSet, Partida_id),
                FOREIGN KEY (Partida_id) REFERENCES Partidas (id)
            );

            CREATE TABLE IF NOT EXISTS Ponto (
                pontoTime1 INTEGER NOT NULL,
                pontoTime2 INTEGER NOT NULL,
                NumSet INTEGER NOT NULL,
                Set_Partida_id INTEGER NOT NULL,
                PRIMARY KEY (pontoTime1, pontoTime2, NumSet, Set_Partida_id),
                FOREIGN KEY (NumSet, Set_Partida_id) REFERENCES 'Set' (NumSet, Partida_id)
            );

            CREATE TABLE IF NOT EXISTS TipoAcao (
                idTipoAcao INTEGER PRIMARY KEY,
                Nome VARCHAR(45)
            );

           CREATE TABLE IF NOT EXISTS Acao (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            Ponto_pontoTime1 INTEGER NOT NULL,
            Ponto_pontoTime2 INTEGER NOT NULL,
            Ponto_Partida_id INTEGER NOT NULL,
            Ponto_NumSet INTEGER NOT NULL,
            Jogador_id INTEGER NOT NULL,
            Qualidade TEXT CHECK(Qualidade IN ('A', 'B', 'C')),
            idTipoAcao INTEGER NOT NULL,
            -- CORREÇÃO DA FOREIGN KEY AQUI:
            FOREIGN KEY (Ponto_pontoTime1, Ponto_pontoTime2, Ponto_NumSet, Ponto_Partida_id) REFERENCES Ponto (pontoTime1, pontoTime2, NumSet, Set_Partida_id),
            FOREIGN KEY (Jogador_id) REFERENCES Jogadores (id),
            FOREIGN KEY (idTipoAcao) REFERENCES TipoAcao (idTipoAcao)
            );

            CREATE TABLE IF NOT EXISTS Substituicao (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                Ponto_pontoTime1 INTEGER NOT NULL,
                Ponto_pontoTime2 INTEGER NOT NULL,
                Ponto_Partida_id INTEGER NOT NULL,
                JogadorEntra INTEGER NOT NULL,
                JogadorSai INTEGER NOT NULL,
                FOREIGN KEY (Ponto_pontoTime1, Ponto_pontoTime2) REFERENCES Ponto (pontoTime1, pontoTime2),
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
                FOREIGN KEY (Torneio_idTorneio) REFERENCES Torneios (idTorneio),
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



            INSERT OR IGNORE INTO Posicoes (nome) VALUES 
                ('Levantador'),
                ('Ponteiro'),
                ('Central'),
                ('Oposto'),
                ('Líbero');

            
            
            INSERT OR IGNORE INTO Times (id, nome, cidade) VALUES (1, 'Vôlei Prudente', 'Presidente Prudente');
            INSERT OR IGNORE INTO Times (id, nome, cidade) VALUES (2, 'Sada Cruzeiro', 'Belo Horizonte');
            INSERT OR IGNORE INTO Times (id, nome, cidade) VALUES (3, 'Vôlei Renata', 'Campinas');
        `);

        ensureTournamentColumns();
        ensureGinasioColumns();
        ensurePartidaColumns();
        seedTipoAcao();
        console.log('Banco de dados inicializado com sucesso (com dados mockados para testes).');
    } catch (e) {
        console.error("Erro ao inicializar o banco de dados:", e);
        throw e;
    }
}

initDatabase();

db.getDatabase = getDatabase;
db.initDatabase = initDatabase;
db.inicializarBanco = initDatabase;

module.exports = db;