// Importador del CSV antiguo (clientes_antiguos.csv) a PostgreSQL.
//
// Cómo funciona:
//  1. Se lee el CSV (separador ";", UTF-8) y cada fila se normaliza con normalizarFila() (función pura).
//  2. Cada fila se guarda dentro de su propia transacción: si una fila falla, solo se pierde esa fila.
//  3. Clientes: se identifican por CIF normalizado. Facturas: por número (único en la BD).
//     Contactos: por email dentro del cliente (o por nombre si no hay email).
//  4. Se puede ejecutar las veces que se quiera: lo que ya existe no se duplica ni se sobrescribe.
//  5. Se devuelve (y se guarda en la tabla "importaciones") un resumen con todas las incidencias.

import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  calcularImportesFactura,
  capitalizarPalabras,
  claveEmpresa,
  digitosTelefono,
  limpiarTexto,
  normalizarCif,
  normalizarEmail,
  normalizarEstado,
  normalizarFecha,
  normalizarImporte,
  normalizarIva,
  normalizarPais,
} from './normalizers';

export type FilaCsv = Record<string, string>;

export interface Incidencia {
  fila: number; // número de línea en el CSV (la cabecera es la línea 1)
  tipo: 'rechazada' | 'duplicado' | 'aviso';
  mensaje: string;
}

export interface ResumenImportacion {
  filasLeidas: number;
  clientesCreados: number;
  contactosCreados: number;
  facturasCreadas: number;
  duplicados: number;
  rechazadas: number;
  incidencias: Incidencia[];
}

export interface FilaNormalizada {
  cliente: {
    empresa: string | null;
    cif: string | null;
    estado: 'Activo' | 'Inactivo' | null;
    direccion: string | null;
    cp: string | null;
    ciudad: string | null;
    pais: string | null;
    comercial: string | null;
    fechaAlta: Date | null;
  };
  contacto: { nombre: string; email: string | null; telefono: string | null } | null;
  numeroFactura: string | null;
  factura: {
    numero: string;
    fecha: Date;
    baseImponible: string;
    ivaPorcentaje: string;
    ivaImporte: string;
    total: string;
  } | null;
  errorFactura: string | null;
}

/** Lee el texto del CSV y devuelve una lista de objetos { columna: valor }. */
export function leerCsv(contenido: string): FilaCsv[] {
  return parse(contenido, {
    delimiter: ';',
    columns: true,
    bom: true,
    skip_empty_lines: true,
    relax_column_count: true, // una fila con columnas de menos no rompe la lectura completa
  });
}

/** Normaliza una fila del CSV sin tocar la base de datos. */
export function normalizarFila(raw: FilaCsv): FilaNormalizada {
  const cliente = {
    empresa: limpiarTexto(raw.empresa),
    cif: normalizarCif(raw.cif),
    estado: normalizarEstado(raw.estado),
    direccion: limpiarTexto(raw.direccion),
    cp: limpiarTexto(raw.cp),
    ciudad: limpiarTexto(raw.ciudad),
    pais: normalizarPais(raw.pais),
    comercial: capitalizarPalabras(raw.comercial),
    fechaAlta: normalizarFecha(raw.fecha_alta),
  };

  const nombreContacto = limpiarTexto(raw.contacto);
  const contacto = nombreContacto
    ? { nombre: nombreContacto, email: normalizarEmail(raw.email), telefono: limpiarTexto(raw.telefono) }
    : null;

  const numeroFactura = limpiarTexto(raw.factura)?.toUpperCase() ?? null;
  let factura: FilaNormalizada['factura'] = null;
  let errorFactura: string | null = null;

  if (numeroFactura) {
    const fecha = normalizarFecha(raw.fecha_factura);
    const base = normalizarImporte(raw.base_imponible);
    const iva = normalizarIva(raw.iva);
    const errores: string[] = [];
    if (!fecha) errores.push(`fecha de factura no válida ("${raw.fecha_factura ?? ''}")`);
    if (!base) errores.push(`base imponible vacía o no válida ("${raw.base_imponible ?? ''}")`);
    if (!iva) errores.push(`IVA vacío o no válido ("${raw.iva ?? ''}")`);

    if (errores.length > 0) {
      errorFactura = `Factura ${numeroFactura} no importada: ${errores.join('; ')}`;
    } else {
      factura = {
        numero: numeroFactura,
        fecha: fecha!,
        baseImponible: base!,
        ivaPorcentaje: iva!,
        ...calcularImportesFactura(base!, iva!),
      };
    }
  }

  return { cliente, contacto, numeroFactura, factura, errorFactura };
}

// Resultado de procesar una fila; se suma al resumen solo si la transacción se confirma.
interface ResultadoFila {
  clienteCreado: boolean;
  contactoCreado: boolean;
  facturaCreada: boolean;
  duplicado: boolean;
  rechazada: boolean;
  incidencias: Incidencia[];
}

type Tx = Prisma.TransactionClient;

export async function importarCsv(prisma: PrismaClient, contenido: string): Promise<ResumenImportacion> {
  const filas = leerCsv(contenido);
  const resumen: ResumenImportacion = {
    filasLeidas: filas.length,
    clientesCreados: 0,
    contactosCreados: 0,
    facturasCreadas: 0,
    duplicados: 0,
    rechazadas: 0,
    incidencias: [],
  };

  for (const [indice, raw] of filas.entries()) {
    const numeroFila = indice + 2; // +1 por la cabecera, +1 porque las líneas empiezan en 1
    try {
      const fila = normalizarFila(raw);
      const r = await prisma.$transaction((tx) => procesarFila(tx, fila, numeroFila));
      resumen.clientesCreados += Number(r.clienteCreado);
      resumen.contactosCreados += Number(r.contactoCreado);
      resumen.facturasCreadas += Number(r.facturaCreada);
      resumen.duplicados += Number(r.duplicado);
      resumen.rechazadas += Number(r.rechazada);
      resumen.incidencias.push(...r.incidencias);
    } catch (error) {
      // Error inesperado: se descarta solo esta fila (la transacción se deshace) y se sigue.
      resumen.rechazadas++;
      resumen.incidencias.push({
        fila: numeroFila,
        tipo: 'rechazada',
        mensaje: `Error inesperado al guardar la fila: ${(error as Error).message}`,
      });
    }
  }

  return resumen;
}

async function procesarFila(tx: Tx, fila: FilaNormalizada, numeroFila: number): Promise<ResultadoFila> {
  const r: ResultadoFila = {
    clienteCreado: false,
    contactoCreado: false,
    facturaCreada: false,
    duplicado: false,
    rechazada: false,
    incidencias: [],
  };
  const aviso = (tipo: Incidencia['tipo'], mensaje: string) => r.incidencias.push({ fila: numeroFila, tipo, mensaje });

  // 1. Cliente
  const cliente = await resolverCliente(tx, fila, r, aviso);
  if (!cliente) {
    r.rechazada = true;
    return r;
  }

  // 2. Contacto
  if (fila.contacto) {
    r.contactoCreado = await asegurarContacto(tx, cliente.id, fila.contacto, aviso);
  }

  // 3. Factura
  if (!fila.numeroFactura) {
    aviso('aviso', `La fila no tiene factura: solo se importan el cliente y el contacto.`);
    return r;
  }
  const existente = await tx.factura.findUnique({ where: { numero: fila.numeroFactura } });
  if (existente) {
    if (existente.clienteId === cliente.id) {
      r.duplicado = true;
      aviso('duplicado', `Factura ${fila.numeroFactura} repetida: ya estaba importada, se ignora.`);
    } else {
      r.rechazada = true;
      aviso('rechazada', `Factura ${fila.numeroFactura} ya existe asociada a otro cliente; no se importa.`);
    }
  } else if (fila.errorFactura || !fila.factura) {
    r.rechazada = true;
    aviso('rechazada', fila.errorFactura ?? `Factura ${fila.numeroFactura} incompleta.`);
  } else {
    await tx.factura.create({ data: { ...fila.factura, clienteId: cliente.id } });
    r.facturaCreada = true;
  }
  return r;
}

async function resolverCliente(
  tx: Tx,
  fila: FilaNormalizada,
  r: ResultadoFila,
  aviso: (tipo: Incidencia['tipo'], mensaje: string) => void,
) {
  const datos = fila.cliente;

  // Sin CIF: solo lo asociamos si el email del contacto ya pertenece a un cliente conocido.
  if (!datos.cif) {
    const email = fila.contacto?.email;
    const contacto = email
      ? await tx.contacto.findFirst({ where: { email, cliente: { eliminadoEn: null } }, include: { cliente: true } })
      : null;
    if (!contacto) {
      aviso('rechazada', `Fila sin CIF y sin un contacto conocido: no se puede identificar al cliente "${datos.empresa ?? ''}".`);
      return null;
    }
    aviso(
      'aviso',
      `Fila sin CIF ("${datos.empresa ?? ''}"): se asocia a ${contacto.cliente.empresa} (${contacto.cliente.cif}) porque el email ${email} pertenece a ese cliente.`,
    );
    return contacto.cliente;
  }

  const existente = await tx.cliente.findUnique({ where: { cif: datos.cif } });
  if (existente) {
    if (existente.eliminadoEn) {
      aviso('rechazada', `El cliente ${datos.cif} fue eliminado en la aplicación; no se vuelve a importar.`);
      return null;
    }
    avisarDiferencias(existente, datos, aviso);
    return existente;
  }

  // Cliente nuevo: estos campos son obligatorios y no se inventan.
  const faltan: string[] = [];
  if (!datos.empresa) faltan.push('empresa');
  if (!datos.estado) faltan.push('estado (Activo/Inactivo)');
  if (!datos.fechaAlta) faltan.push('fecha de alta válida');
  if (faltan.length > 0) {
    aviso('rechazada', `No se puede crear el cliente ${datos.cif}: falta ${faltan.join(', ')}.`);
    return null;
  }

  r.clienteCreado = true;
  return tx.cliente.create({
    data: {
      empresa: datos.empresa!,
      cif: datos.cif,
      estado: datos.estado!,
      direccion: datos.direccion,
      cp: datos.cp,
      ciudad: datos.ciudad,
      pais: datos.pais,
      comercial: datos.comercial,
      fechaAlta: datos.fechaAlta!,
    },
  });
}

/** Si la misma empresa aparece con datos distintos, se conservan los primeros y se avisa. */
function avisarDiferencias(
  existente: { empresa: string; cif: string; ciudad: string | null; pais: string | null; comercial: string | null; estado: string },
  datos: FilaNormalizada['cliente'],
  aviso: (tipo: Incidencia['tipo'], mensaje: string) => void,
) {
  const distintos: string[] = [];
  const iguales = (a: string | null, b: string | null) => !b || claveEmpresa(a) === claveEmpresa(b);
  if (!iguales(existente.empresa, datos.empresa)) distintos.push(`empresa "${datos.empresa}"`);
  if (!iguales(existente.ciudad, datos.ciudad)) distintos.push(`ciudad "${datos.ciudad}"`);
  if (!iguales(existente.pais, datos.pais)) distintos.push(`país "${datos.pais}"`);
  if (!iguales(existente.comercial, datos.comercial)) distintos.push(`comercial "${datos.comercial}"`);
  if (datos.estado && existente.estado !== datos.estado) distintos.push(`estado "${datos.estado}"`);
  if (distintos.length > 0) {
    aviso('aviso', `El cliente ${existente.cif} aparece con datos distintos (${distintos.join(', ')}); se conservan los de su primera aparición.`);
  }
}

async function asegurarContacto(
  tx: Tx,
  clienteId: number,
  contacto: NonNullable<FilaNormalizada['contacto']>,
  aviso: (tipo: Incidencia['tipo'], mensaje: string) => void,
): Promise<boolean> {
  const existente = await tx.contacto.findFirst({
    where: contacto.email
      ? { clienteId, email: contacto.email }
      : { clienteId, nombre: { equals: contacto.nombre, mode: 'insensitive' } },
  });
  if (!existente) {
    await tx.contacto.create({ data: { ...contacto, clienteId } });
    return true;
  }
  if (contacto.telefono && digitosTelefono(existente.telefono) !== digitosTelefono(contacto.telefono)) {
    aviso('aviso', `El contacto ${existente.nombre} aparece con otro teléfono (${contacto.telefono}); se conserva ${existente.telefono}.`);
  }
  return false;
}

/** Huella del fichero: permite saber si ese mismo CSV ya se importó. */
export function hashContenido(contenido: string): string {
  return createHash('sha256').update(contenido).digest('hex');
}
