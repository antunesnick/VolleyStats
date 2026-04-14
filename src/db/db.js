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

function ensurePartidaColumns() {
    const columns = db.prepare("PRAGMA table_info(Partidas)").all().map((column) => column.name);
    if (!columns.includes('nome')) {
        db.exec('ALTER TABLE Partidas ADD COLUMN nome VARCHAR(100)');
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
                pontosTime1 INTEGER,
                pontosTime2 INTEGER,
                ginasio_id INTEGER,
                time1 INTEGER,
                time2 INTEGER,

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
        ensurePartidaColumns();
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