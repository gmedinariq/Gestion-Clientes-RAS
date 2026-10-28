// Utilidades del histórico de modificaciones (requisito D).

import { prisma } from '../db';

export interface Cambio {
  campo: string;
  valorAnterior: string | null;
  valorNuevo: string | null;
}

/** Convierte un valor a texto para guardarlo en el histórico. Las fechas se guardan como AAAA-MM-DD. */
export function valorComoTexto(valor: unknown): string | null {
  if (valor === null || valor === undefined || valor === '') return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor);
}

/**
 * Compara dos versiones de un registro y devuelve solo los campos que han cambiado.
 * Si no cambia nada devuelve [], y así no se escribe nada en el histórico.
 */
export function calcularCambios<T extends object>(antes: T, despues: Partial<T>, campos: (keyof T & string)[]): Cambio[] {
  const cambios: Cambio[] = [];
  for (const campo of campos) {
    if (!(campo in despues)) continue; // campo no enviado: no se modifica
    const anterior = valorComoTexto(antes[campo]);
    const nuevo = valorComoTexto(despues[campo]);
    if (anterior !== nuevo) cambios.push({ campo, valorAnterior: anterior, valorNuevo: nuevo });
  }
  return cambios;
}

/** Histórico de un cliente (incluye los cambios de sus contactos), del más reciente al más antiguo. */
export function historialDeCliente(clienteId: number) {
  return prisma.historial.findMany({
    where: { clienteId },
    orderBy: [{ fecha: 'desc' }, { id: 'desc' }],
    include: { usuario: { select: { id: true, nombre: true, email: true } } },
  });
}
