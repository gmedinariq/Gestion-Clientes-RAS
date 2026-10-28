// Autenticación con sesiones en base de datos.
//  - Login: se comprueba la contraseña con bcrypt y se crea una sesión con un token aleatorio.
//  - El token viaja en una cookie HttpOnly (JavaScript del navegador no puede leerla).
//  - En la tabla "sesiones" solo se guarda el hash SHA-256 del token.

import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '../db';
import { config } from '../config';
import { HttpError } from '../utils/HttpError';

export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const hashPassword = (password: string) => bcrypt.hash(password, 12);

// Hash de una contraseña cualquiera: si el email no existe comparamos igualmente contra él,
// para que la respuesta tarde lo mismo y no se pueda averiguar qué emails están registrados.
const HASH_FICTICIO = bcrypt.hashSync('contraseña-ficticia', 12);

export async function login(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const correcta = await bcrypt.compare(password, usuario?.passwordHash ?? HASH_FICTICIO);
  if (!usuario || !correcta) {
    throw new HttpError(401, 'Email o contraseña incorrectos');
  }

  const token = randomBytes(32).toString('base64url');
  const expiraEn = new Date(Date.now() + config.sessionHours * 60 * 60 * 1000);
  await prisma.sesion.create({ data: { tokenHash: hashToken(token), usuarioId: usuario.id, expiraEn } });

  return { token, expiraEn, usuario: { id: usuario.id, email: usuario.email, nombre: usuario.nombre } };
}

export async function logout(token: string) {
  await prisma.sesion.deleteMany({ where: { tokenHash: hashToken(token) } });
}

/** Devuelve el usuario de una sesión válida, o null si no existe o ha caducado. */
export async function usuarioDeSesion(token: string) {
  const sesion = await prisma.sesion.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { usuario: { select: { id: true, email: true, nombre: true } } },
  });
  if (!sesion) return null;
  if (sesion.expiraEn < new Date()) {
    await prisma.sesion.delete({ where: { id: sesion.id } });
    return null;
  }
  return sesion.usuario;
}
