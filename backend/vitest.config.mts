import { defineConfig } from 'vitest/config';

// Los tests usan una base de datos propia (clientes_test) para no tocar los datos de la aplicación.
// Por defecto apunta al PostgreSQL de docker compose (puerto 55432 del equipo).
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://clientes:clientes_dev@localhost:55432/clientes_test';

// globalSetup (migraciones) se ejecuta en este mismo proceso, así que también necesita la URL
process.env.DATABASE_URL = TEST_DATABASE_URL;

export default defineConfig({
  test: {
    env: { DATABASE_URL: TEST_DATABASE_URL, NODE_ENV: 'test' },
    globalSetup: './tests/globalSetup.ts',
    fileParallelism: false, // los ficheros comparten la base de datos: se ejecutan uno detrás de otro
    testTimeout: 20000,
  },
});
