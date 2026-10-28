import type { CookieOptions, Request, Response } from 'express';
import { COOKIE_SESION, config } from '../config';
import * as authService from '../services/auth.service';
import { loginSchema } from '../validation/cliente.schema';

const opcionesCookie: CookieOptions = {
  httpOnly: true, // no accesible desde JavaScript -> protege frente a robo de sesión por XSS
  sameSite: 'strict', // no se envía en peticiones desde otras webs -> protege frente a CSRF
  secure: config.cookieSecure, // solo por HTTPS (activar en producción)
  path: '/',
};

export async function login(req: Request, res: Response) {
  const { email, password } = loginSchema.parse(req.body);
  const { token, expiraEn, usuario } = await authService.login(email, password);
  res.cookie(COOKIE_SESION, token, { ...opcionesCookie, expires: expiraEn });
  res.json({ usuario });
}

export async function logout(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.[COOKIE_SESION];
  if (token) await authService.logout(token);
  res.clearCookie(COOKIE_SESION, opcionesCookie);
  res.status(204).end();
}

export function me(req: Request, res: Response) {
  res.json({ usuario: req.usuario });
}
