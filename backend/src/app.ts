// Construye la aplicación Express (sin arrancar el servidor), así los tests pueden usarla con supertest.

import express from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { authRouter } from './routes/auth.routes';
import { clientesRouter } from './routes/clientes.routes';
import { errorHandler, rutaNoEncontrada } from './middleware/errorHandler';

export function crearApp() {
  const app = express();

  app.set('trust proxy', 1); // la API está detrás de nginx: así se obtiene la IP real del usuario
  app.use(helmet()); // cabeceras HTTP de seguridad
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => {
    res.json({ estado: 'ok' });
  });
  app.use('/api/auth', authRouter);
  app.use('/api/clientes', clientesRouter);

  app.use(rutaNoEncontrada);
  app.use(errorHandler);
  return app;
}
