import { PrismaClient } from '@prisma/client';

// Una única instancia de Prisma para toda la aplicación (gestiona el pool de conexiones).
export const prisma = new PrismaClient();
