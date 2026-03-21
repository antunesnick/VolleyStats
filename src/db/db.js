const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const DB_FILE_NAME = 'developVS.db';

let db = null;

function getUserDataDirectory() {
    try {
        return app.getPath('userData');
    } catch (_error) {
        // Fallback for non-Electron execution contexts.
        return path.resolve(process.cwd(), '.data');
    }
}

function getDatabase() {
    if (db) {
        return db;
    }

    const userDataDir = getUserDataDirectory();
    fs.mkdirSync(userDataDir, { recursive: true });

    const dbPath = path.join(userDataDir, DB_FILE_NAME);

    db = new Database(dbPath, { verbose: console.log });
    db.pragma('foreign_keys = ON');
    return db;
}

function initDatabase() {
    try {
        const database = getDatabase();

        database.exec(`
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
                inicio DATE NOT NULL,
                termino DATE NOT NULL
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
        `);

    } catch (error) {
        throw error;
    }
}

module.exports = {
    getDatabase,
    initDatabase,
};