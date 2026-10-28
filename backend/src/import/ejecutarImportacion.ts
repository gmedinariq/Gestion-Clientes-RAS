import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import type { PrismaClient } from '@prisma/client';
import { hashContenido, importarCsv, type ResumenImportacion } from './csvImporter';

/**
 * Lee el CSV del disco, lo importa, guarda el resumen en la tabla "importaciones" y lo muestra por consola.
 * Con soloSiEsNuevo = true no hace nada si ese mismo fichero ya se importó antes
 * (es lo que se usa al arrancar el contenedor, para que reiniciar no reimporte datos).
 */
export async function ejecutarImportacion(prisma: PrismaClient, ruta: string, soloSiEsNuevo: boolean) {
  const contenido = readFileSync(ruta, 'utf-8');
  const hashArchivo = hashContenido(contenido);

  if (soloSiEsNuevo) {
    const previa = await prisma.importacion.findFirst({ where: { hashArchivo } });
    if (previa) {
      console.log(`[importación] ${basename(ruta)} ya se importó el ${previa.fecha.toISOString()}. Se omite.`);
      return null;
    }
  }

  const resumen = await importarCsv(prisma, contenido);
  await prisma.importacion.create({
    data: { archivo: basename(ruta), hashArchivo, ...resumen, incidencias: resumen.incidencias as object[] },
  });
  imprimirResumen(resumen);
  return resumen;
}

function imprimirResumen(r: ResumenImportacion) {
  console.log('[importación] Resumen');
  console.log(`  Filas leídas:       ${r.filasLeidas}`);
  console.log(`  Clientes creados:   ${r.clientesCreados}`);
  console.log(`  Contactos creados:  ${r.contactosCreados}`);
  console.log(`  Facturas creadas:   ${r.facturasCreadas}`);
  console.log(`  Duplicados:         ${r.duplicados}`);
  console.log(`  Filas rechazadas:   ${r.rechazadas}`);
  for (const i of r.incidencias) {
    console.log(`  - Línea ${i.fila} [${i.tipo}] ${i.mensaje}`);
  }
}
