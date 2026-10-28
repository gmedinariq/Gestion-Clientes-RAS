import type { RequestHandler } from 'express';
import { COOKIE_SESION } from '../config';
import { usuarioDeSesion } from '../services/auth.service';
import { HttpError } from '../utils/HttpError';

export interface UsuarioSesion {
  id: number;
  email: string;
  nombre: string;
}

// Añadimos "usuario" al tipo Request de Express (lo rellena requireAuth)
declare global {
  namespace Express {
    interface Request {
      usuario?: UsuarioSesion;
    }
  }
}

/**
 * Protege las rutas: si la cookie de sesión no es válida responde 401.
 * Equivale al atributo [Authorize] de ASP.NET Core.
 */
export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token: string | undefined = req.cookies?.[COOKIE_SESION];
  const usuario = token ? await usuarioDeSesion(token) : null;
  if (!usuario) throw new HttpError(401, 'Debes iniciar sesión');
  req.usuario = usuario;
  next();
};
