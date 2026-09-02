import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    // Cada arquivo de teste roda em seu proprio processo, entao cada um ganha
    // um banco :memory: isolado (db.js abre a conexao no import).
    pool: 'forks',
  },
});
