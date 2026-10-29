// Importación manual: npm run importar [ruta-del-csv]
// Es idempotente: lo que ya existe no se duplica (aparece como "duplicado" en el resumen).

import { prisma } from '../db';
import { config } from '../config';
import { ejecutarImportacion } from '../import/ejecutarImportacion';

const ruta = process.argv[2] ?? config.csvPath;

ejecutarImportacion(prisma, ruta, false)
  .catch((error) => {
    console.error('[importación] Error:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
