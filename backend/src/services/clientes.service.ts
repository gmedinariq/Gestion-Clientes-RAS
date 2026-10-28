// Lógica de negocio de clientes: consultas, altas, modificaciones (con histórico) y borrado.
// Los controladores solo traducen HTTP <-> llamadas a estas funciones.

import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { HttpError, noEncontrado } from '../utils/HttpError';
import type { ClienteInput, FiltrosListado } from '../validation/cliente.schema';
import { calcularCambios, historialDeCliente } from './historial.service';

type Tx = Prisma.TransactionClient;

// Campos cuyo cambio se registra en el histórico
const CAMPOS_CLIENTE = ['empresa', 'cif', 'estado', 'direccion', 'cp', 'ciudad', 'pais', 'comercial', 'fechaAlta'] as const;
const CAMPOS_CONTACTO = ['nombre', 'email', 'telefono'] as const;

/** Facturación acumulada = suma de bases imponibles (sin IVA), con decimales exactos. */
export function sumarBases(facturas: { baseImponible: Prisma.Decimal | string }[]): string {
  return facturas.reduce((total, f) => total.add(f.baseImponible), new Prisma.Decimal(0)).toFixed(2);
}

const describirContacto = (c: { nombre: string; email: string | null }) =>
  c.email ? `${c.nombre} <${c.email}>` : c.nombre;

const hoy = () => new Date(new Date().toISOString().slice(0, 10));

// ---------- Consultas ----------

function construirFiltro({ q, estado, pais, comercial }: FiltrosListado): Prisma.ClienteWhereInput {
  const where: Prisma.ClienteWhereInput = { eliminadoEn: null };
  if (estado) where.estado = estado;
  if (pais) where.pais = { equals: pais, mode: 'insensitive' };
  if (comercial) where.comercial = { equals: comercial, mode: 'insensitive' };
  if (q) {
    const contiene = { contains: q, mode: 'insensitive' as const };
    where.OR = [
      { empresa: contiene },
      { cif: { contains: q.replace(/[\s.-]/g, ''), mode: 'insensitive' } },
      { contactos: { some: { OR: [{ nombre: contiene }, { email: contiene }] } } },
    ];
  }
  return where;
}

export async function listarClientes(filtros: FiltrosListado) {
  const { page, pageSize } = filtros;
  const where = construirFiltro(filtros);

  const [total, clientes] = await prisma.$transaction([
    prisma.cliente.count({ where }),
    prisma.cliente.findMany({
      where,
      orderBy: [{ empresa: 'asc' }, { id: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { contactos: { orderBy: { id: 'asc' }, take: 1 } }, // contacto principal = el primero
    }),
  ]);

  // Facturación de los clientes de esta página en una sola consulta (SUM ... GROUP BY cliente_id)
  const sumas = await prisma.factura.groupBy({
    by: ['clienteId'],
    where: { clienteId: { in: clientes.map((c) => c.id) } },
    _sum: { baseImponible: true },
  });
  const facturacion = new Map(sumas.map((s) => [s.clienteId, s._sum.baseImponible]));

  return {
    data: clientes.map(({ contactos, ...cliente }) => ({
      ...cliente,
      contactoPrincipal: contactos[0] ?? null,
      facturacionAcumulada: (facturacion.get(cliente.id) ?? new Prisma.Decimal(0)).toFixed(2),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function obtenerCliente(id: number) {
  const cliente = await prisma.cliente.findFirst({
    where: { id, eliminadoEn: null },
    include: {
      contactos: { orderBy: { id: 'asc' } },
      facturas: { orderBy: [{ fecha: 'desc' }, { numero: 'desc' }] },
    },
  });
  if (!cliente) throw noEncontrado('Cliente no encontrado');
  return { ...cliente, facturacionAcumulada: sumarBases(cliente.facturas) };
}

export async function obtenerHistorial(id: number) {
  const cliente = await prisma.cliente.findUnique({ where: { id }, select: { id: true } });
  if (!cliente) throw noEncontrado('Cliente no encontrado');
  return historialDeCliente(id);
}

/** Valores distintos de país y comercial, para rellenar los desplegables de filtros. */
export async function opcionesFiltro() {
  const [paises, comerciales] = await Promise.all([
    prisma.cliente.findMany({
      where: { eliminadoEn: null, pais: { not: null } },
      distinct: ['pais'],
      select: { pais: true },
      orderBy: { pais: 'asc' },
    }),
    prisma.cliente.findMany({
      where: { eliminadoEn: null, comercial: { not: null } },
      distinct: ['comercial'],
      select: { comercial: true },
      orderBy: { comercial: 'asc' },
    }),
  ]);
  return { paises: paises.map((p) => p.pais), comerciales: comerciales.map((c) => c.comercial) };
}

/** Indicadores del panel: total de clientes, activos y facturación acumulada. */
export async function resumen() {
  const [totalClientes, clientesActivos, facturacion] = await Promise.all([
    prisma.cliente.count({ where: { eliminadoEn: null } }),
    prisma.cliente.count({ where: { eliminadoEn: null, estado: 'Activo' } }),
    prisma.factura.aggregate({ where: { cliente: { eliminadoEn: null } }, _sum: { baseImponible: true } }),
  ]);
  return {
    totalClientes,
    clientesActivos,
    facturacionTotal: (facturacion._sum.baseImponible ?? new Prisma.Decimal(0)).toFixed(2),
  };
}

// ---------- Escrituras ----------

async function comprobarCifLibre(tx: Tx, cif: string, idActual?: number) {
  const otro = await tx.cliente.findUnique({ where: { cif } });
  if (otro && otro.id !== idActual) {
    throw new HttpError(
      409,
      otro.eliminadoEn
        ? `El CIF ${cif} pertenece a un cliente eliminado`
        : `Ya existe un cliente con el CIF ${cif}`,
    );
  }
}

export async function crearCliente(datos: ClienteInput, usuarioId: number) {
  const { contactos = [], fechaAlta, ...campos } = datos;

  const id = await prisma.$transaction(async (tx) => {
    await comprobarCifLibre(tx, campos.cif);
    const cliente = await tx.cliente.create({
      data: {
        ...campos,
        fechaAlta: fechaAlta ? new Date(fechaAlta) : hoy(),
        contactos: { create: contactos.map(({ id: _id, ...c }) => c) },
      },
    });
    await tx.historial.create({
      data: {
        clienteId: cliente.id,
        entidad: 'cliente',
        registroId: cliente.id,
        accion: 'CREAR',
        valorNuevo: `${cliente.empresa} (${cliente.cif})`,
        usuarioId,
      },
    });
    return cliente.id;
  });

  return obtenerCliente(id);
}

/**
 * Actualiza un cliente y sus contactos. Todo ocurre en UNA transacción:
 * o se guardan los cambios y su histórico, o no se guarda nada.
 */
export async function actualizarCliente(id: number, datos: ClienteInput, usuarioId: number) {
  const { contactos, fechaAlta, ...campos } = datos;

  await prisma.$transaction(async (tx) => {
    const actual = await tx.cliente.findFirst({ where: { id, eliminadoEn: null }, include: { contactos: true } });
    if (!actual) throw noEncontrado('Cliente no encontrado');
    if (campos.cif !== actual.cif) await comprobarCifLibre(tx, campos.cif, id);

    const nuevos = { ...campos, fechaAlta: fechaAlta ? new Date(fechaAlta) : actual.fechaAlta };
    const comun = { clienteId: id, usuarioId };
    const historial: Prisma.HistorialCreateManyInput[] = [];

    // 1. Campos del cliente que han cambiado
    for (const cambio of calcularCambios(actual, nuevos, [...CAMPOS_CLIENTE])) {
      historial.push({ ...comun, entidad: 'cliente', registroId: id, accion: 'MODIFICAR', ...cambio });
    }

    // 2. Contactos (solo si se han enviado)
    if (contactos) {
      const existentes = new Map(actual.contactos.map((c) => [c.id, c]));
      const conservados = new Set<number>();

      for (const { id: contactoId, ...contacto } of contactos) {
        if (contactoId === undefined) {
          const creado = await tx.contacto.create({ data: { ...contacto, clienteId: id } });
          historial.push({ ...comun, entidad: 'contacto', registroId: creado.id, accion: 'CREAR', valorNuevo: describirContacto(creado) });
          continue;
        }
        const previo = existentes.get(contactoId);
        if (!previo) throw new HttpError(400, `El contacto ${contactoId} no pertenece a este cliente`);
        conservados.add(contactoId);

        const cambios = calcularCambios(previo, contacto, [...CAMPOS_CONTACTO]);
        if (cambios.length > 0) {
          await tx.contacto.update({ where: { id: contactoId }, data: contacto });
          for (const cambio of cambios) {
            historial.push({ ...comun, entidad: 'contacto', registroId: contactoId, accion: 'MODIFICAR', ...cambio });
          }
        }
      }

      for (const previo of actual.contactos) {
        if (conservados.has(previo.id)) continue;
        await tx.contacto.delete({ where: { id: previo.id } });
        historial.push({ ...comun, entidad: 'contacto', registroId: previo.id, accion: 'ELIMINAR', valorAnterior: describirContacto(previo) });
      }
    }

    // 3. Si no ha cambiado nada, no se toca la BD (ni la fecha de modificación ni el histórico)
    if (historial.length === 0) return;

    await tx.cliente.update({ where: { id }, data: { ...nuevos, actualizadoEn: new Date() } });
    await tx.historial.createMany({ data: historial });
  });

  return obtenerCliente(id);
}

/**
 * Borrado lógico: el cliente se marca como eliminado (eliminado_en) y deja de aparecer en la aplicación,
 * pero se conservan sus facturas (documentos fiscales) y su histórico.
 */
export async function eliminarCliente(id: number, usuarioId: number) {
  await prisma.$transaction(async (tx) => {
    const actual = await tx.cliente.findFirst({ where: { id, eliminadoEn: null } });
    if (!actual) throw noEncontrado('Cliente no encontrado');
    await tx.cliente.update({ where: { id }, data: { eliminadoEn: new Date() } });
    await tx.historial.create({
      data: {
        clienteId: id,
        entidad: 'cliente',
        registroId: id,
        accion: 'ELIMINAR',
        valorAnterior: `${actual.empresa} (${actual.cif})`,
        usuarioId,
      },
    });
  });
}
