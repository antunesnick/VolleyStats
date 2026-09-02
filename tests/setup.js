// Roda antes de qualquer arquivo de teste, portanto antes de src/db/db.js ser
// importado - que e quando a conexao com o SQLite e aberta.
//
// Sem isso os testes escreveriam no developVS.db real do desenvolvedor.
process.env.VOLLEYSTATS_DB_PATH = ':memory:';
delete process.env.VOLLEYSTATS_SQL_DEBUG;
