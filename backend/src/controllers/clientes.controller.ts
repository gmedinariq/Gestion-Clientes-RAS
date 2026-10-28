// Los controladores solo traducen HTTP: validan la entrada, llaman al servicio y devuelven la respuesta.

import type { Request, Response } from 'express';
import * as clientesService from '../services/clientes.service';
import { clienteSchema, idSchema, listadoSchema } from '../validation/cliente.schema';

export async function listar(req: Request, res: Response) {
  const filtros = listadoSchema.parse(req.query);
  res.json(await clientesService.listarClientes(filtros));
}

export async function obtener(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  res.json(await clientesService.obtenerCliente(id));
}

export async function crear(req: Request, res: Response) {
  const datos = clienteSchema.parse(req.body);
  const cliente = await clientesService.crearCliente(datos, req.usuario!.id);
  res.status(201).location(`/api/clientes/${cliente.id}`).json(cliente);
}

export async function actualizar(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  const datos = clienteSchema.parse(req.body);
  res.json(await clientesService.actualizarCliente(id, datos, req.usuario!.id));
}

export async function eliminar(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  await clientesService.eliminarCliente(id, req.usuario!.id);
  res.status(204).end();
}

export async function historico(req: Request, res: Response) {
  const id = idSchema.parse(req.params.id);
  res.json(await clientesService.obtenerHistorial(id));
}

export async function filtros(_req: Request, res: Response) {
  res.json(await clientesService.opcionesFiltro());
}

export async function resumen(_req: Request, res: Response) {
  res.json(await clientesService.resumen());
}
