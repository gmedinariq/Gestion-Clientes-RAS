// Funciones para cada endpoint de la API. Los componentes usan estas funciones, nunca fetch directamente.

import { http } from './http';
import type { ClienteDetalle, ClienteFormData, EntradaHistorial, PaginaClientes, Usuario } from '../types';

export interface FiltrosClientes {
  q?: string;
  estado?: string;
  pais?: string;
  comercial?: string;
  page?: number;
  pageSize?: number;
}

/** Convierte los filtros en query string, omitiendo los vacíos: { q: 'ebro', pais: '' } -> "?q=ebro" */
function aQueryString(filtros: FiltrosClientes): string {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(filtros)) {
    if (valor !== undefined && valor !== '') params.set(clave, String(valor));
  }
  const texto = params.toString();
  return texto ? `?${texto}` : '';
}

/** Convierte los campos vacíos del formulario en null antes de enviarlos */
function aPayload(datos: ClienteFormData) {
  const vacioANull = (v: string) => (v.trim() === '' ? null : v.trim());
  return {
    ...datos,
    direccion: vacioANull(datos.direccion),
    cp: vacioANull(datos.cp),
    ciudad: vacioANull(datos.ciudad),
    pais: vacioANull(datos.pais),
    comercial: vacioANull(datos.comercial),
    fechaAlta: datos.fechaAlta || undefined,
    contactos: datos.contactos.map((c) => ({
      ...c,
      email: vacioANull(c.email),
      telefono: vacioANull(c.telefono),
    })),
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    http<{ usuario: Usuario }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => http<void>('/auth/logout', { method: 'POST' }),
  me: () => http<{ usuario: Usuario }>('/auth/me'),
};

export const clientesApi = {
  listar: (filtros: FiltrosClientes) => http<PaginaClientes>(`/clientes${aQueryString(filtros)}`),
  obtener: (id: number) => http<ClienteDetalle>(`/clientes/${id}`),
  crear: (datos: ClienteFormData) =>
    http<ClienteDetalle>('/clientes', { method: 'POST', body: JSON.stringify(aPayload(datos)) }),
  actualizar: (id: number, datos: ClienteFormData) =>
    http<ClienteDetalle>(`/clientes/${id}`, { method: 'PUT', body: JSON.stringify(aPayload(datos)) }),
  eliminar: (id: number) => http<void>(`/clientes/${id}`, { method: 'DELETE' }),
  historico: (id: number) => http<EntradaHistorial[]>(`/clientes/${id}/historico`),
  filtros: () => http<{ paises: string[]; comerciales: string[] }>('/clientes/filtros'),
  resumen: () => http<{ totalClientes: number; clientesActivos: number; facturacionTotal: string }>('/clientes/resumen'),
};
