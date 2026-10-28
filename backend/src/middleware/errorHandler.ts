import type { ErrorRequestHandler, RequestHandler } from 'express';
import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { HttpError } from '../utils/HttpError';

// Gestión centralizada de errores: cualquier error lanzado en una ruta acaba aquí.
// Express 5 captura también los errores de funciones async, sin necesidad de try/catch.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Datos de entrada no válidos (validación con Zod)
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Datos no válidos',
      detalles: err.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
    return;
  }

  // Errores controlados lanzados por nuestro código
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, detalles: err.detalles });
    return;
  }

  // Violación de una restricción UNIQUE en PostgreSQL (p. ej. CIF repetido)
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
    res.status(409).json({ error: 'Ya existe un registro con esos datos' });
    return;
  }

  // JSON mal formado en el cuerpo de la petición
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo de la petición no es un JSON válido' });
    return;
  }

  // Error inesperado: se registra en el log, pero al cliente no se le dan detalles internos
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
};

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
};
