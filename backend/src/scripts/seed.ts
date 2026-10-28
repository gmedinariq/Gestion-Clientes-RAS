// Se ejecuta al arrancar el contenedor de la API (después de las migraciones):
//  1. Crea o actualiza el usuario de demostración con los datos de las variables de entorno.
//  2. Importa el CSV inicial si todavía no se ha importado.

import { prisma } from '../db';
import { config } from '../config';
import { hashPassword } from '../services/auth.service';
import { ejecutarImportacion } from '../import/ejecutarImportacion';

async function crearUsuarioDemo() {
  const { email, nombre, password } = config.demoUser;
  if (!email || !password) {
    console.warn('[seed] DEMO_USER_EMAIL o DEMO_USER_PASSWORD no definidos: no se crea usuario de demostración.');
    return;
  }
  if (password.length < 8) {
    throw new Error('DEMO_USER_PASSWORD debe tener al menos 8 caracteres');
  }
  const passwordHash = await hashPassword(password);
  await prisma.usuario.upsert({
    where: { email: email.toLowerCase() },
    update: { nombre, passwordHash },
    create: { email: email.toLowerCase(), nombre, passwordHash },
  });
  console.log(`[seed] Usuario de demostración listo: ${email}`);
}

async function main() {
  await crearUsuarioDemo();
  await ejecutarImportacion(prisma, config.csvPath, true);
}

main()
  .catch((error) => {
    console.error('[seed] Error:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
