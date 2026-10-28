// Validación de los datos que llegan a la API, con Zod.
// Equivale a los DataAnnotations / FluentValidation de ASP.NET: si algo no cumple el esquema,
// .parse() lanza un ZodError y el errorHandler responde 400 con la lista de campos erróneos.

import { z } from 'zod';
import { limpiarTexto, normalizarCif, normalizarFecha, normalizarPais } from '../import/normalizers';

// Mayor valor de una columna INTEGER de PostgreSQL. Un id mayor haría fallar la consulta (error 500).
const MAX_ID = 2147483647;

/** Texto opcional: "" o solo espacios se guarda como null. */
const textoOpcional = (max: number) =>
  z
    .string()
    .max(max, `Máximo ${max} caracteres`)
    .nullish()
    .transform((v) => limpiarTexto(v));

export const contactoSchema = z.object({
  id: z.number().int().positive().max(MAX_ID).optional(), // si viene, es un contacto existente que se actualiza
  nombre: z.string().trim().min(1, 'El nombre del contacto es obligatorio').max(150),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(200)
    .nullish()
    .transform((v) => v || null)
    .refine((v) => v === null || z.email().safeParse(v).success, 'Email no válido'),
  telefono: textoOpcional(30).refine(
    (v) => v === null || /^\+?[\d\s().-]{6,}$/.test(v),
    'Teléfono no válido (solo números, espacios y +)',
  ),
});

export const clienteSchema = z.object({
  empresa: z.string().trim().min(1, 'La empresa es obligatoria').max(200),
  cif: z
    .string({ error: 'El CIF es obligatorio' })
    .transform((v) => normalizarCif(v) ?? '')
    .pipe(z.string().regex(/^[A-Z0-9]{8,15}$/, 'CIF no válido (8-15 letras o números)')),
  estado: z.enum(['Activo', 'Inactivo'], { error: 'El estado debe ser Activo o Inactivo' }),
  direccion: textoOpcional(200),
  cp: textoOpcional(10),
  ciudad: textoOpcional(100),
  pais: textoOpcional(100).transform((v) => normalizarPais(v)),
  comercial: textoOpcional(100),
  // Fecha de alta en formato AAAA-MM-DD. Si no se envía: al crear se usa la fecha de hoy
  // y al actualizar se conserva la que tenía.
  // No se usa Date.parse(): acepta fechas inexistentes ("2026-09-31" -> 1 de octubre).
  // normalizarFecha() es la misma comprobación estricta que usa el importador del CSV.
  fechaAlta: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha de alta no válida (AAAA-MM-DD)')
    .refine((v) => normalizarFecha(v) !== null, 'La fecha de alta no existe')
    .optional(),
  // Lista completa de contactos. En PUT: los que traen id se actualizan, los que no traen id se crean
  // y los que ya no aparecen se borran. Si no se envía "contactos", los contactos no se tocan.
  contactos: z.array(contactoSchema).max(20, 'Máximo 20 contactos').optional(),
});

export type ClienteInput = z.infer<typeof clienteSchema>;
export type ContactoInput = z.infer<typeof contactoSchema>;

export const listadoSchema = z.object({
  q: z.string().trim().max(100).optional(),
  estado: z.enum(['Activo', 'Inactivo']).optional(),
  pais: z.string().trim().max(100).optional(),
  comercial: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export type FiltrosListado = z.infer<typeof listadoSchema>;

export const idSchema = z.coerce
  .number({ error: 'Id no válido' })
  .int('Id no válido')
  .positive('Id no válido')
  .max(MAX_ID, 'Id no válido');

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'El email es obligatorio').max(200),
  password: z.string().min(1, 'La contraseña es obligatoria').max(200),
});
