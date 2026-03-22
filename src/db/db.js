const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'developVS.db');

const db = new Database(dbPath, { verbose: console.log });

db.pragma('foreign_keys = ON');

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
            tipo INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS Ginasios(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(80) NOT NULL,
            estado VARCHAR(80) NOT NULL,
            cidade VARCHAR(80)
        );

        CREATE TABLE IF NOT EXISTS Partidas(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            pontosTime1 INTEGER,
            pontosTime2 INTEGER,
            dataPartida DATE NOT NULL,
            tipo VARCHAR(45) NOT NULL,
            status VARCHAR(45) DEFAULT 'AGENDADA',
            externa BOOLEAN DEFAULT 0,
            ginasio_id INTEGER,
            time1 INTEGER,
            time2 INTEGER,
            FOREIGN KEY (ginasio_id) REFERENCES Ginasios (id),
            FOREIGN KEY (time1) REFERENCES Times (id),
            FOREIGN KEY (time2) REFERENCES Times(id)
        );
        CREATE TABLE IF NOT EXISTS Posicoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(45) UNIQUE NOT NULL
        );

        INSERT OR IGNORE INTO Posicoes (nome) VALUES 
            ('Levantador'),
            ('Ponteiro'),
            ('Central'),
            ('Oposto'),
            ('Líbero');

        CREATE TABLE IF NOT EXISTS Jogadores (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            cpf VARCHAR(12) UNIQUE,
            nome VARCHAR(70),
            dataNasc DATE,
            numCamisa INTEGER,
            rg VARCHAR(12) UNIQUE,
            altura FLOAT,
            posicao_id INTEGER NOT NULL,
            foto VARCHAR(255),
            FOREIGN KEY (posicao_id) REFERENCES Posicoes (id)
        );
    `);
} catch (e) {
    console.error("Erro ao criar as tabelas:", e);
    throw e;
}

export default db;