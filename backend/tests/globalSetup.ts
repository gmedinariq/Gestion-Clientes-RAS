import { execSync } from 'node:child_process';

// Se ejecuta una vez antes de todos los tests: aplica las migraciones a la BD de test
// (si la BD no existe, Prisma la crea). "migrate deploy" nunca borra datos.
// DATABASE_URL apunta a la BD de test (lo fija vitest.config.ts).
export default function setup() {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' });
}
