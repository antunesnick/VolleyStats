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
}

function ensureGinasioColumns() {
    const columns = db.prepare("PRAGMA table_info(Ginasios)").all().map((column) => column.name);

    if (!columns.includes('endereco')) {
        db.exec('ALTER TABLE Ginasios ADD COLUMN endereco VARCHAR(255)');
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

function initDatabase() {
    try {
        db.exec(`
          -- Ativa o suporte a chaves estrangeiras no SQLite
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------
-- Tabela posicao
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Posicoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(45)
);

-- -----------------------------------------------------
-- Tabela Jogadores
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Jogadores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cpf VARCHAR(12) UNIQUE,
  nome VARCHAR(70),
  dataNasc DATE,
  numCamisa INTEGER,
  rg VARCHAR(12) UNIQUE,
  altura FLOAT,
  posicao_id INTEGER NOT NULL,
  foto VARCHAR(50),
  categoria_id INTEGER,  
  Jogadorescol VARCHAR(45),
  FOREIGN KEY (posicao_id) REFERENCES posicao (id),
  FOREIGN KEY (categoria_id) REFERENCES Categorias (id)
);

-- -----------------------------------------------------
-- Tabela Categorias
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Categorias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(45),
  idadeMin INTEGER,
  idadeMax INTEGER
);

-- -----------------------------------------------------
-- Tabela Times
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Times (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome VARCHAR(45),
  imagem VARCHAR(50),
  cidade VARCHAR(45)
);

-- -----------------------------------------------------
-- Tabela TimesCategorias
-- -----------------------------------------------------
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

-- -----------------------------------------------------
-- Tabela Ginásios
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Ginasios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  Nome VARCHAR(45),
  Estado VARCHAR(45),
  Cidade VARCHAR(45)
);

-- -----------------------------------------------------
-- Tabela Torneios
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Torneios (
  id INTEGER PRIMARY KEY,
  Nome VARCHAR(45),
  Tipo INTEGER,
  DataInicio DATE,
  DataFim DATE
);

-- -----------------------------------------------------
-- Tabela Partida
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Partidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ginasio_id INTEGER NOT NULL,
  time1 INTEGER NOT NULL,
  time2 INTEGER NOT NULL,
  pontosTime1 INTEGER,
  pontosTime2 INTEGER,
  nome VARCHAR(100) NOT NULL,
  dataPartida DATE NOT NULL,
  tipo INTEGER,
  videoLink VARCHAR(1024),
  status VARCHAR(50) NOT NULL DEFAULT 'Agendada',
  externa INTEGER NOT NULL DEFAULT 0,
  torneio_id INTEGER NOT NULL,
  fase VARCHAR(45),
  FOREIGN KEY (ginasio_id) REFERENCES Ginasios (id),
  FOREIGN KEY (Time1) REFERENCES Times (id),
  FOREIGN KEY (Time2) REFERENCES Times (id),
  FOREIGN KEY (torneio_id) REFERENCES Torneios (id)
);

-- -----------------------------------------------------
-- Tabela Set
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS 'Set' (
  NumSet INTEGER NOT NULL,
  Partida_id INTEGER NOT NULL,
  PRIMARY KEY (NumSet, Partida_id),
  FOREIGN KEY (Partida_id) REFERENCES Partida (id)
);

-- -----------------------------------------------------
-- Tabela Ponto
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Ponto (
  pontoTime1 INTEGER NOT NULL,
  pontoTime2 INTEGER NOT NULL,
  NumSet INTEGER NOT NULL,
  Set_Partida_id INTEGER NOT NULL,
  PRIMARY KEY (pontoTime1, pontoTime2, NumSet, Set_Partida_id),
  FOREIGN KEY (NumSet, Set_Partida_id) REFERENCES 'Set' (NumSet, Partida_id)
);

-- -----------------------------------------------------
-- Tabela TipoAcao
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS TipoAcao (
  idTipoAcao INTEGER PRIMARY KEY,
  Nome VARCHAR(45)
);

-- -----------------------------------------------------
-- Tabela Acao
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS Acao (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  Ponto_pontoTime1 INTEGER NOT NULL,
  Ponto_pontoTime2 INTEGER NOT NULL,
  Ponto_Partida_id INTEGER NOT NULL,
  Jogador_id INTEGER NOT NULL,
  Qualidade TEXT CHECK(Qualidade IN ('A', 'B', 'C')),
  idTipoAcao INTEGER NOT NULL,
  FOREIGN KEY (Ponto_pontoTime1, Ponto_pontoTime2) REFERENCES Ponto (pontoTime1, pontoTime2),
  FOREIGN KEY (Jogador_id) REFERENCES Jogadores (id),
  FOREIGN KEY (idTipoAcao) REFERENCES TipoAcao (idTipoAcao)
);

-- -----------------------------------------------------
-- Tabela Substituicao
-- -----------------------------------------------------
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
  FOREIGN KEY (Torneio_idTorneio) REFERENCES Torneio (idTorneio),
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
  FOREIGN KEY (Partida_id) REFERENCES Partida (id)
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
  FOREIGN KEY (Partida_id) REFERENCES Partida (id) ON DELETE CASCADE,
  FOREIGN KEY (Jogadores_id) REFERENCES Jogadores (id) ON DELETE CASCADE
);
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