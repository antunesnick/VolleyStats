import db from './db';

const gerarDadosFalsos = () => {
    // 1. Verifica se já existem Categorias cadastradas. Se sim, o banco não está vazio.
    const rowCount = db.prepare('SELECT COUNT(*) as count FROM Categorias').get();
    if (rowCount.count > 0) {
        console.log("Banco de dados já contém dados. Seed ignorado.");
        return;
    }

    console.log("Iniciando injeção de dados falsos (Mock)...");

    const insertTx = db.transaction(() => {
        // 1. INSERIR CATEGORIAS
        const stmtCat = db.prepare('INSERT INTO Categorias (nome, idadeMin, idadeMax) VALUES (?, ?, ?)');
        const catSub15 = stmtCat.run('Sub-15', 12, 15).lastInsertRowid;
        const catSub19 = stmtCat.run('Sub-19', 16, 19).lastInsertRowid;
        const catAdulto = stmtCat.run('Adulto', 20, 99).lastInsertRowid;

        // 2. INSERIR POSIÇÕES E TIPOS DE AÇÃO (Pode já ter sido inserido no initDatabase, por isso usamos INSERT IGNORE ou try catch)
        try { db.prepare("INSERT INTO Posicoes (nome) VALUES ('Levantador'), ('Ponteiro'), ('Central'), ('Oposto'), ('Líbero')").run(); } catch(e){}
        try { db.prepare("INSERT INTO TipoAcao (idTipoAcao, Nome) VALUES (1, 'Saque'), (2, 'Ataque'), (3, 'Bloqueio'), (4, 'Recepção'), (5, 'Defesa'), (6, 'Levantamento')").run(); } catch(e){}

        // 3. INSERIR GINÁSIOS
        const stmtGinasio = db.prepare('INSERT INTO Ginasios (nome, estado, cidade, endereco) VALUES (?, ?, ?, ?)');
        const ginWatal = stmtGinasio.run('Ginásio Watal Ishibashi', 'SP', 'Presidente Prudente', 'R. X, 123').lastInsertRowid;
        const ginPUM = stmtGinasio.run('Ginásio PUM', 'SP', 'Presidente Prudente', 'R. Y, 456').lastInsertRowid;
        const ginSesi = stmtGinasio.run('Ginásio SESI', 'SP', 'Bauru', 'Av. Z, 789').lastInsertRowid;

        // 4. INSERIR TIMES
        const stmtTime = db.prepare('INSERT INTO Times (nome, imagem, cidade) VALUES (?, ?, ?)');
        const timePrudente = stmtTime.run('Vôlei Prudente', null, 'Presidente Prudente').lastInsertRowid;
        const timeBauru = stmtTime.run('Sesi Bauru', null, 'Bauru').lastInsertRowid;
        const timeOsasco = stmtTime.run('Osasco Vôlei', null, 'Osasco').lastInsertRowid;
        const timeCampinas = stmtTime.run('Campinas Vôlei', null, 'Campinas').lastInsertRowid;

        // 5. VINCULAR TIMES ÀS CATEGORIAS
        const stmtTimeCat = db.prepare('INSERT INTO TimesCategorias (Times_id, Categorias_id) VALUES (?, ?)');
        stmtTimeCat.run(timePrudente, catAdulto);
        stmtTimeCat.run(timeBauru, catAdulto);
        stmtTimeCat.run(timeOsasco, catAdulto);
        stmtTimeCat.run(timeCampinas, catAdulto);

        // 6. INSERIR TORNEIOS
        const stmtTorneio = db.prepare('INSERT INTO Torneios (nome, tipo, inicio, termino) VALUES (?, ?, ?, ?)');
        // 1: Pontos Corridos, 2: Mata-Mata, 3: Pontos+Mata-Mata
        const torPaulista = stmtTorneio.run('Campeonato Paulista', 1, '2026-03-01', '2026-06-30').lastInsertRowid; 
        const torCopaFunada = stmtTorneio.run('Copa Funada', 2, '2026-04-10', '2026-04-20').lastInsertRowid;

        // 7. INSERIR PARTIDAS
        const stmtPartida = db.prepare(`
            INSERT INTO Partidas (nome, dataPartida, tipo, status, externa, pontosTime1, pontosTime2, torneio_id, ginasio_id, time1, time2) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        // Partida 1: Finalizada
        const partida1 = stmtPartida.run('Prudente x Bauru', '2026-03-10', 1, 'FINALIZADA', 0, 3, 1, torPaulista, ginWatal, timePrudente, timeBauru).lastInsertRowid;
        // Partida 2: Agendada
        const partida2 = stmtPartida.run('Osasco x Prudente', '2026-05-15', 1, 'AGENDADA', 1, 0, 0, torPaulista, ginSesi, timeOsasco, timePrudente).lastInsertRowid;
        // Partida 3: Finalizada (Copa Funada)
        const partida3 = stmtPartida.run('Prudente x Campinas', '2026-04-12', 2, 'FINALIZADA', 0, 2, 0, torCopaFunada, ginPUM, timePrudente, timeCampinas).lastInsertRowid;

        // 8. INSERIR JOGADORES NO PRUDENTE E GERAR AÇÕES
        const stmtJogador = db.prepare('INSERT INTO Jogadores (nome, numCamisa, posicao_id, categoria_id) VALUES (?, ?, ?, ?)');
        const stmtJT = db.prepare('INSERT INTO JogadoresTimes (Jogadores_id, Times_id, Categorias_id) VALUES (?, ?, ?)');
        const stmtAcao = db.prepare('INSERT INTO Acao (Jogador_id, idTipoAcao, Qualidade, Ponto_Partida_id) VALUES (?, ?, ?, ?)');

        // Arrays para os testes
        const nomes = ["Caio Góes", "Gustavo Uyema", "Nickolas Antunes", "Pedro Henrique", "João Ricardo"];
        const posIds = [1, 2, 3, 2, 4]; // Levantador, Ponteiro, Central, Ponteiro, Oposto
        const acoesIds = [1, 2, 3, 4, 5]; // Saque, Ataque, Bloqueio, Recepção, Defesa
        const qualidades = ['=', '/', '-', '!', '+', '#'];

        for(let i=0; i<nomes.length; i++) {
            // Cria Jogador
            const jId = stmtJogador.run(nomes[i], i+1, posIds[i], catAdulto).lastInsertRowid;
            // Vincula ao Prudente
            stmtJT.run(jId, timePrudente, catAdulto);

            // Gera entre 15 e 30 ações aleatórias para esse jogador na Partida 1
            const numAcoes = Math.floor(Math.random() * 15) + 15;
            for(let a=0; a<numAcoes; a++) {
                const acaoRnd = acoesIds[Math.floor(Math.random() * acoesIds.length)];
                const qualRnd = qualidades[Math.floor(Math.random() * qualidades.length)];
                // Insere estatística da Partida 1
                stmtAcao.run(jId, acaoRnd, qualRnd, partida1);
            }
            
            // Gera mais algumas ações na Partida 3
            for(let a=0; a<10; a++) {
                stmtAcao.run(jId, 2, '#', partida3); // Injeta ataques positivos
            }
        }

        console.log("Mock de dados gerado com sucesso! ✅");
    });

    try {
        insertTx();
    } catch (e) {
        console.error("Erro ao gerar mock de dados:", e);
    }
};

export { gerarDadosFalsos };