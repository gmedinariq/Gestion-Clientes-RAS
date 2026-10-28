import request from 'supertest';
import { prisma } from '../src/db';
import { crearApp } from '../src/app';
import { hashPassword } from '../src/services/auth.service';

export const app = crearApp();

export const USUARIO_TEST = { email: 'test@empresa.local', nombre: 'Usuario Test', password: 'Clave-de-test-123' };

/** Vacía todas las tablas y reinicia los contadores de id. Solo funciona sobre una BD de test. */
export async function limpiarBD() {
  const [{ bd }] = await prisma.$queryRaw<{ bd: string }[]>`SELECT current_database() AS bd`;
  if (!bd.includes('test')) {
    throw new Error(`Los tests solo pueden vaciar una base de datos de test (conectado a "${bd}")`);
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE historial_cambios, facturas, contactos, sesiones, clientes, usuarios, importaciones RESTART IDENTITY CASCADE',
  );
}

export async function crearUsuarioTest() {
  const { email, nombre, password } = USUARIO_TEST;
  return prisma.usuario.create({ data: { email, nombre, passwordHash: await hashPassword(password) } });
}

/** Devuelve un "agente" de supertest que conserva la cookie de sesión entre peticiones. */
export async function agenteAutenticado() {
  const agente = request.agent(app);
  await agente.post('/api/auth/login').send({ email: USUARIO_TEST.email, password: USUARIO_TEST.password }).expect(200);
  return agente;
}
