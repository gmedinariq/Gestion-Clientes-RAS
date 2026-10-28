// Importación del CSV real contra la base de datos de test.
import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { importarCsv } from '../src/import/csvImporter';
import { limpiarBD } from './helpers';

const CSV_REAL = readFileSync('data/clientes_antiguos.csv', 'utf-8');
const CABECERA = CSV_REAL.split('\n')[0];

describe('importarCsv', () => {
  beforeEach(limpiarBD);

  it('importa el CSV real agrupando clientes repetidos y descartando lo inválido', async () => {
    const resumen = await importarCsv(prisma, CSV_REAL);

    expect(resumen).toMatchObject({
      filasLeidas: 18,
      clientesCreados: 7, // "CONSTRUCCIONES EBRO, S.L." / "b-50123456" es el mismo cliente que la fila 2
      contactosCreados: 8, // Lucía y Raúl aparecen con el email en otro formato: no se duplican
      facturasCreadas: 14,
      duplicados: 1, // F-2026-0115 aparece dos veces
      rechazadas: 2, // F-2026-0108 (31/09/2026) y F-2026-0113 (sin base imponible)
    });
    expect(await prisma.cliente.count()).toBe(7);
    expect(await prisma.factura.count()).toBe(14);
  });

  it('asocia la fila sin CIF al cliente por el email del contacto', async () => {
    await importarCsv(prisma, CSV_REAL);
    const hotel = await prisma.cliente.findUniqueOrThrow({ where: { cif: 'A07123987' }, include: { facturas: true } });
    expect(hotel.facturas.map((f) => f.numero).sort()).toEqual(['F-2026-0104', 'F-2026-0111', 'F-2026-0114']);
  });

  it('calcula correctamente IVA y total de cada factura', async () => {
    await importarCsv(prisma, CSV_REAL);
    const factura = await prisma.factura.findUniqueOrThrow({ where: { numero: 'F-2026-0102' } });
    expect(factura.baseImponible.toFixed(2)).toBe('1875.60');
    expect(factura.ivaImporte.toFixed(2)).toBe('393.88');
    expect(factura.total.toFixed(2)).toBe('2269.48');
  });

  it('se puede repetir sin duplicar datos', async () => {
    await importarCsv(prisma, CSV_REAL);
    const segunda = await importarCsv(prisma, CSV_REAL);

    expect(segunda.clientesCreados).toBe(0);
    expect(segunda.facturasCreadas).toBe(0);
    expect(await prisma.cliente.count()).toBe(7);
    expect(await prisma.contacto.count()).toBe(8);
    expect(await prisma.factura.count()).toBe(14);
  });

  it('una fila incorrecta no impide importar el resto', async () => {
    const csv = [
      CABECERA,
      ';;Sin Empresa;;;;;;;;;;;;;', // fila sin CIF ni email: se rechaza
      'Nueva SL;B11111111;Ana;ana@nueva.es;600000000;;;Sevilla;España;Elena Sanz;Activo;01/01/2025;F-T-1;02/01/2025;100,00;21%',
    ].join('\n');

    const resumen = await importarCsv(prisma, csv);
    expect(resumen.rechazadas).toBe(1);
    expect(resumen.clientesCreados).toBe(1);
    expect(resumen.facturasCreadas).toBe(1);
    expect(resumen.incidencias[0]).toMatchObject({ fila: 2, tipo: 'rechazada' });
  });
});
