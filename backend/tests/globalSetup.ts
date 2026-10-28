import { execSync } from 'node:child_process';

// Aplica las migraciones a la BD de test antes de los tests (Prisma la crea si no existe).
// "migrate deploy" nunca borra datos. DATABASE_URL la fija vitest.config.mts.
export default function setup() {
  execSync('npx prisma migrate deploy', { stdio: 'pipe' });
}
