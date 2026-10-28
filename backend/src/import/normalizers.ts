// Funciones puras para limpiar los valores del CSV antiguo.
// No acceden a la base de datos, así que son fáciles de probar (tests/normalizers.test.ts).
// Regla general: si un valor no se puede interpretar con seguridad, se devuelve null
// y el importador lo registra como incidencia. Nunca se inventan datos.

import { Prisma } from '@prisma/client';

/** Quita espacios al principio/final y colapsa espacios dobles. Devuelve null si queda vacío. */
export function limpiarTexto(valor: string | undefined | null): string | null {
  if (valor == null) return null;
  const limpio = valor.replace(/\s+/g, ' ').trim();
  return limpio === '' ? null : limpio;
}

/** "b-50123456" -> "B50123456". Quita espacios, guiones y puntos y pasa a mayúsculas. */
export function normalizarCif(valor: string | undefined | null): string | null {
  const texto = limpiarTexto(valor);
  if (!texto) return null;
  return texto.replace(/[\s.\-]/g, '').toUpperCase();
}

/** " Lucia@ClinicaSonrisa.es" -> "lucia@clinicasonrisa.es" */
export function normalizarEmail(valor: string | undefined | null): string | null {
  const texto = limpiarTexto(valor);
  return texto ? texto.toLowerCase() : null;
}

/** Solo los dígitos del teléfono (sin prefijo +34), para comparar si dos teléfonos son el mismo. */
export function digitosTelefono(valor: string | null): string {
  const digitos = (valor ?? '').replace(/\D/g, '');
  return digitos.startsWith('34') && digitos.length === 11 ? digitos.slice(2) : digitos;
}

/** "elena  sanz" -> "Elena Sanz" */
export function capitalizarPalabras(valor: string | undefined | null): string | null {
  const texto = limpiarTexto(valor);
  if (!texto) return null;
  return texto
    .toLowerCase()
    .split(' ')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

/** "ACTIVO", "activo", " Activo " -> "Activo". Devuelve null si no es Activo/Inactivo. */
export function normalizarEstado(valor: string | undefined | null): 'Activo' | 'Inactivo' | null {
  const texto = limpiarTexto(valor)?.toLowerCase();
  if (texto === 'activo') return 'Activo';
  if (texto === 'inactivo') return 'Inactivo';
  return null;
}

// Variantes de país encontradas en el CSV -> nombre en español.
// Si aparece un país que no está en la lista, se guarda capitalizado tal cual.
const PAISES: Record<string, string> = {
  'españa': 'España',
  'espana': 'España',
  'spain': 'España',
  'es': 'España',
  'italia': 'Italia',
  'italy': 'Italia',
  'it': 'Italia',
  'portugal': 'Portugal',
  'pt': 'Portugal',
  'francia': 'Francia',
  'france': 'Francia',
  'fr': 'Francia',
};

export function normalizarPais(valor: string | undefined | null): string | null {
  const texto = limpiarTexto(valor);
  if (!texto) return null;
  return PAISES[texto.toLowerCase()] ?? capitalizarPalabras(texto);
}

/**
 * Convierte una fecha del CSV a Date (UTC, sin hora). Formatos aceptados:
 *   14/01/2025 · 5/3/25 · 12-06-2025 · 2025-01-14
 * Siempre se interpreta día/mes/año (formato español), nunca mes/día.
 * Devuelve null si el formato no es reconocible o la fecha no existe (p. ej. 31/09/2026).
 */
export function normalizarFecha(valor: string | undefined | null): Date | null {
  const texto = limpiarTexto(valor);
  if (!texto) return null;

  let dia: number;
  let mes: number;
  let anio: number;

  const iso = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const espanol = texto.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2}|\d{4})$/);

  if (iso) {
    [anio, mes, dia] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  } else if (espanol) {
    [dia, mes, anio] = [Number(espanol[1]), Number(espanol[2]), Number(espanol[3])];
    if (espanol[3].length === 2) anio += 2000; // "25" -> 2025
  } else {
    return null;
  }

  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Si el día no existe, Date "se desborda" (31/09 -> 01/10). Lo detectamos comparando.
  const esValida =
    fecha.getUTCFullYear() === anio && fecha.getUTCMonth() === mes - 1 && fecha.getUTCDate() === dia;
  return esValida ? fecha : null;
}

/**
 * Convierte un importe del CSV a decimal exacto con 2 decimales (como texto, p. ej. "1250.00").
 * Formatos encontrados: "1.250" · "1.875,60" · "640.5" · "980,40 €" · "3.420,00"
 *  - Si lleva coma, la coma es el decimal y los puntos son separador de miles (formato español).
 *  - Si solo lleva punto: "1.250" (grupos de 3 cifras) son miles; "640.5" es un decimal.
 * Devuelve null si está vacío, no es un número o es negativo.
 */
export function normalizarImporte(valor: string | undefined | null): string | null {
  let texto = limpiarTexto(valor);
  if (!texto) return null;
  texto = texto.replace(/€/g, '').replace(/\s/g, '');

  if (texto.includes(',')) {
    texto = texto.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(\.\d{3})+$/.test(texto)) {
    texto = texto.replace(/\./g, '');
  }

  if (!/^\d+(\.\d+)?$/.test(texto)) return null;
  return new Prisma.Decimal(texto).toFixed(2);
}

/** "21%", "21", "0" -> "21.00", "0.00". Devuelve null si no es un porcentaje entre 0 y 100. */
export function normalizarIva(valor: string | undefined | null): string | null {
  const texto = limpiarTexto(valor)?.replace('%', '').replace(',', '.').trim();
  if (!texto || !/^\d+(\.\d+)?$/.test(texto)) return null;
  const iva = new Prisma.Decimal(texto);
  if (iva.greaterThan(100)) return null;
  return iva.toFixed(2);
}

/** Calcula cuota de IVA y total a partir de la base y el porcentaje, redondeando a céntimos. */
export function calcularImportesFactura(base: string, ivaPorcentaje: string) {
  const baseDec = new Prisma.Decimal(base);
  const ivaImporte = baseDec.mul(ivaPorcentaje).div(100).toDecimalPlaces(2);
  const total = baseDec.add(ivaImporte);
  return { ivaImporte: ivaImporte.toFixed(2), total: total.toFixed(2) };
}

/** Texto comparable de un nombre de empresa: "CONSTRUCCIONES EBRO, S.L." == "Construcciones Ebro SL" */
export function claveEmpresa(valor: string | null): string {
  return (valor ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita tildes
    .replace(/[^a-z0-9]/g, '');
}
