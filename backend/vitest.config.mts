import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

// Los tests usan una base de datos propia (clientes_test) para no tocar los datos de la aplicación.
// Por defecto apunta al PostgreSQL de docker compose, con las variables POSTGRES_* del entorno
// o del .env de la raíz (solo se leen esas claves). TEST_DATABASE_URL tiene prioridad.
const ficheroEnv = new URL('../.env', import.meta.url);
const envRaiz = existsSync(ficheroEnv) ? parseEnv(readFileSync(ficheroEnv, 'utf8')) : {};
const variable = (nombre: string) => process.env[nombre] || envRaiz[nombre] || '';

function urlTest() {
  if (process.env.TEST_DATABASE_URL) return process.env.TEST_DATABASE_URL;
  const password = variable('POSTGRES_PASSWORD');
  if (!password) {
    throw new Error('Define POSTGRES_PASSWORD en el .env de la raíz o TEST_DATABASE_URL para ejecutar los tests');
  }
  const usuario = variable('POSTGRES_USER') || 'clientes';
  const puerto = variable('POSTGRES_PORT') || '55432';
  return `postgresql://${encodeURIComponent(usuario)}:${encodeURIComponent(password)}@localhost:${puerto}/clientes_test`;
}

const TEST_DATABASE_URL = urlTest();

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
