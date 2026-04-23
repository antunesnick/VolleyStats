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
  if (!columns.includes('ginasio_id')) {
    db.exec('ALTER TABLE Partidas ADD COLUMN ginasio_id INTEGER');
  }
  if (!columns.includes('time1')) {
    db.exec('ALTER TABLE Partidas ADD COLUMN time1 INTEGER');
  }
  if (!columns.includes('time2')) {
    db.exec('ALTER TABLE Partidas ADD COLUMN time2 INTEGER');
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

function ensurePosicoesTable() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);

  if (!tables.includes('Posicoes') && tables.includes('posicao')) {
    db.exec('ALTER TABLE posicao RENAME TO Posicoes');
  }
}

function ensurePartidasTable() {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((row) => row.name);

  if (!tables.includes('Partidas') && tables.includes('Partida')) {
    db.exec('ALTER TABLE Partida RENAME TO Partidas');
  }
}

function renamePartidaColumnIfNeeded(oldName, newName) {
  const columns = db.prepare("PRAGMA table_info(Partidas)").all().map((column) => column.name);

  if (columns.includes(oldName) && !columns.includes(newName)) {
    db.exec(`ALTER TABLE Partidas RENAME COLUMN "${oldName}" TO ${newName}`);
  }
}

function migrateLegacyPartidasTableIfNeeded() {
  const columns = db.prepare("PRAGMA table_info(Partidas)").all().map((column) => column.name);
  const fkTables = db.prepare("PRAGMA foreign_key_list(Partidas)").all().map((fk) => fk.table);

  const hasLegacyColumns = columns.includes('Ginásio_id') || columns.includes('Time1') || columns.includes('Time2') || columns.includes('Torneio_idTorneio') || columns.includes('data');
  const hasLegacyFkTargets = fkTables.includes('Torneio') || fkTables.includes('Ginásio');

  if (!hasLegacyColumns && !hasLegacyFkTargets) {
    return;
  }

  const col = (preferred, legacy) => {
    if (columns.includes(preferred)) {
      return preferred;
    }
    if (legacy && columns.includes(legacy)) {
      return `"${legacy}"`;
    }
    return 'NULL';
  };

  db.exec('PRAGMA foreign_keys = OFF');

  const migrate = db.transaction(() => {
    db.exec('ALTER TABLE Partidas RENAME TO Partidas_legacy');

    db.exec(`
CREATE TABLE Partidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ginasio_id INTEGER,
  time1 INTEGER,
  time2 INTEGER,
  pontosTime1 INTEGER,
  pontosTime2 INTEGER,
  nome VARCHAR(45) NOT NULL,
  dataPartida DATE,
  tipo TEXT,
  status VARCHAR(45) NOT NULL DEFAULT 'AGENDADA',
  externa INTEGER NOT NULL DEFAULT 0,
  torneio_id INTEGER,
  fase VARCHAR(45),
  FOREIGN KEY (ginasio_id) REFERENCES Ginasios (id),
  FOREIGN KEY (time1) REFERENCES Times (id),
  FOREIGN KEY (time2) REFERENCES Times (id),
  FOREIGN KEY (torneio_id) REFERENCES Torneios (id)
);
    `);

    db.exec(`
INSERT INTO Partidas (id, ginasio_id, time1, time2, pontosTime1, pontosTime2, nome, dataPartida, tipo, status, externa, torneio_id, fase)
SELECT
  ${col('id')},
  ${col('ginasio_id', 'Ginásio_id')},
  ${col('time1', 'Time1')},
  ${col('time2', 'Time2')},
  ${col('pontosTime1')},
  ${col('pontosTime2')},
  ${col('nome')},
  ${col('dataPartida', 'data')},
  ${col('tipo')},
  COALESCE(${col('status')}, 'AGENDADA'),
  COALESCE(${col('externa')}, 0),
  ${col('torneio_id', 'Torneio_idTorneio')},
  ${col('fase')}
FROM Partidas_legacy;
    `);

    db.exec('DROP TABLE Partidas_legacy');
  });

  migrate();
  db.exec('PRAGMA foreign_keys = ON');
}

function initDatabase() {
    try {
        db.exec(`
          -- Ativa o suporte a chaves estrangeiras no SQLite
PRAGMA foreign_keys = ON;

-- -----------------------------------------------------
-- Tabela Posicoes
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
  FOREIGN KEY (posicao_id) REFERENCES Posicoes (id),
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
  ginasio_id INTEGER,
  time1 INTEGER,
  time2 INTEGER,
  pontosTime1 INTEGER,
  pontosTime2 INTEGER,
  nome VARCHAR(45) NOT NULL,
  dataPartida DATE,
  tipo INTEGER,
  status VARCHAR(45) NOT NULL DEFAULT 'AGENDADA',
  externa INTEGER NOT NULL DEFAULT 0,
  torneio_id INTEGER,
  fase VARCHAR(45),
  FOREIGN KEY (ginasio_id) REFERENCES Ginasios (id),
  FOREIGN KEY (time1) REFERENCES Times (id),
  FOREIGN KEY (time2) REFERENCES Times (id),
  FOREIGN KEY (torneio_id) REFERENCES Torneios (id)
);

-- -----------------------------------------------------
-- Tabela Set
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS 'Set' (
  NumSet INTEGER NOT NULL,
  Partida_id INTEGER NOT NULL,
  PRIMARY KEY (NumSet, Partida_id),
  FOREIGN KEY (Partida_id) REFERENCES Partidas (id)
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
  FOREIGN KEY (Torneio_idTorneio) REFERENCES Torneios (id),
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
        `);

        ensureTournamentColumns();
        ensurePosicoesTable();
        ensureGinasioColumns();
        ensurePartidasTable();
        migrateLegacyPartidasTableIfNeeded();
        renamePartidaColumnIfNeeded('Ginásio_id', 'ginasio_id');
        renamePartidaColumnIfNeeded('Time1', 'time1');
        renamePartidaColumnIfNeeded('Time2', 'time2');
        renamePartidaColumnIfNeeded('Torneio_idTorneio', 'torneio_id');
        renamePartidaColumnIfNeeded('data', 'dataPartida');
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