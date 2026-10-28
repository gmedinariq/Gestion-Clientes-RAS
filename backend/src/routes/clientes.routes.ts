import { Router } from 'express';
import * as clientes from '../controllers/clientes.controller';
import { requireAuth } from '../middleware/auth';

export const clientesRouter = Router();

// Todas las rutas de clientes exigen sesión iniciada
clientesRouter.use(requireAuth);

// Rutas auxiliares para la interfaz (van antes de "/:id" para que no se confundan con un id)
clientesRouter.get('/filtros', clientes.filtros);
clientesRouter.get('/resumen', clientes.resumen);

clientesRouter.get('/', clientes.listar);
clientesRouter.post('/', clientes.crear);
clientesRouter.get('/:id', clientes.obtener);
clientesRouter.put('/:id', clientes.actualizar);
clientesRouter.delete('/:id', clientes.eliminar);
clientesRouter.get('/:id/historico', clientes.historico);
