import { Router } from 'express';
import * as clientes from '../controllers/clientes.controller';
import { requireAuth } from '../middleware/auth';

export const clientesRouter = Router();

clientesRouter.use(requireAuth);

// Rutas auxiliares para la interfaz: van antes de "/:id" para que no se interpreten como un id
clientesRouter.get('/filtros', clientes.filtros);
clientesRouter.get('/resumen', clientes.resumen);

clientesRouter.get('/', clientes.listar);
clientesRouter.post('/', clientes.crear);
clientesRouter.get('/:id', clientes.obtener);
clientesRouter.put('/:id', clientes.actualizar);
clientesRouter.delete('/:id', clientes.eliminar);
clientesRouter.get('/:id/historico', clientes.historico);
