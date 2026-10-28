// Tipos de los datos que devuelve la API. Los importes llegan como texto ("1250.00") para no perder precisión.

export type Estado = 'Activo' | 'Inactivo';

export interface Usuario {
  id: number;
  email: string;
  nombre: string;
}

export interface Contacto {
  id: number;
  nombre: string;
  email: string | null;
  telefono: string | null;
}

export interface Factura {
  id: number;
  numero: string;
  fecha: string;
  baseImponible: string;
  ivaPorcentaje: string;
  ivaImporte: string;
  total: string;
}

export interface Cliente {
  id: number;
  empresa: string;
  cif: string;
  estado: Estado;
  direccion: string | null;
  cp: string | null;
  ciudad: string | null;
  pais: string | null;
  comercial: string | null;
  fechaAlta: string;
  actualizadoEn: string;
  facturacionAcumulada: string;
}

export interface ClienteListado extends Cliente {
  contactoPrincipal: Contacto | null;
}

export interface ClienteDetalle extends Cliente {
  contactos: Contacto[];
  facturas: Factura[];
}

export interface PaginaClientes {
  data: ClienteListado[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface EntradaHistorial {
  id: number;
  entidad: 'cliente' | 'contacto';
  registroId: number;
  accion: 'CREAR' | 'MODIFICAR' | 'ELIMINAR';
  campo: string | null;
  valorAnterior: string | null;
  valorNuevo: string | null;
  fecha: string;
  usuario: Usuario;
}

/** Datos que se envían al crear o editar un cliente */
export interface ClienteFormData {
  empresa: string;
  cif: string;
  estado: Estado;
  direccion: string;
  cp: string;
  ciudad: string;
  pais: string;
  comercial: string;
  fechaAlta: string;
  contactos: { id?: number; nombre: string; email: string; telefono: string }[];
}
