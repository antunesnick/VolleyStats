const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(process.cwd(), 'developVS.db');
console.log('Caminho do banco de dados:', dbPath);

const db = new Database(dbPath, { verbose: console.log });

db.pragma('foreign_keys = ON');

try {
    db.exec(`
        -- 1. TABELA DE CATEGORIAS
        CREATE TABLE IF NOT EXISTS Categorias(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(80) UNIQUE NOT NULL, -- Trava para não duplicar
            idadeMin INTEGER NOT NULL,
            idadeMax INTEGER NOT NULL
        );

        -- Inserindo categorias fixas
        INSERT OR IGNORE INTO Categorias (nome, idadeMin, idadeMax) VALUES 
            ('Sub-15', 13, 15),
            ('Sub-17', 16, 17),
            ('Sub-19', 18, 19),
            ('Sub-21', 20, 21),
            ('Adulto', 22, 99);

        -- 2. TABELA DE TIMES
        CREATE TABLE IF NOT EXISTS Times(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(80) NOT NULL,
            imagem VARCHAR(255),
            cidade VARCHAR(45) NOT NULL
        );

        -- 3. TABELA DE TORNEIOS
        CREATE TABLE IF NOT EXISTS Torneios(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(80) NOT NULL,
            tipo INTEGER NOT NULL
        );

        -- 4. TABELA DE GINÁSIOS
        CREATE TABLE IF NOT EXISTS Ginasios(
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(80) NOT NULL,
            estado VARCHAR(80) NOT NULL,
            cidade VARCHAR(80) NOT NULL,
            endereco VARCHAR(255)
        );

        -- 5. TABELA DE PARTIDAS
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
            FOREIGN KEY (time2) REFERENCES Times (id)
        );

        -- 6. TABELA DE POSIÇÕES
        CREATE TABLE IF NOT EXISTS Posicoes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            nome VARCHAR(45) UNIQUE NOT NULL
        );

        -- Inserindo posições fixas
        INSERT OR IGNORE INTO Posicoes (nome) VALUES 
            ('Levantador'),
            ('Ponteiro'),
            ('Central'),
            ('Oposto'),
            ('Líbero');

        -- 7. TABELA DE JOGADORES
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

        -- 8. DADOS MOCKADOS PARA TESTE (Opcional, mas útil)
        INSERT OR IGNORE INTO Ginasios (id, nome, estado, cidade) VALUES (1, 'Ginásio de Esportes Watal Ishibashi', 'SP', 'Presidente Prudente');
        INSERT OR IGNORE INTO Times (id, nome, cidade) VALUES (1, 'Vôlei Prudente', 'Presidente Prudente');
        INSERT OR IGNORE INTO Times (id, nome, cidade) VALUES (2, 'Sada Cruzeiro', 'Belo Horizonte');
        INSERT OR IGNORE INTO Times (id, nome, cidade) VALUES (3, 'Vôlei Renata', 'Campinas');
    `);
    
    console.log("Tabelas criadas e dados iniciais inseridos com sucesso!");
} catch (e) {
    console.error("Erro ao inicializar as tabelas:", e);
    throw e;
}

export default db;