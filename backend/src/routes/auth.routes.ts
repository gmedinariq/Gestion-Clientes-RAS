import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as auth from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';

// Máximo 10 intentos de login cada 15 minutos por IP (frena ataques de fuerza bruta)
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skip: () => process.env.NODE_ENV === 'test',
  message: { error: 'Demasiados intentos de inicio de sesión. Inténtalo de nuevo en unos minutos.' },
});

export const authRouter = Router();

authRouter.post('/login', limiteLogin, auth.login);
authRouter.post('/logout', auth.logout);
authRouter.get('/me', requireAuth, auth.me);
