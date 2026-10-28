// Pequeño envoltorio sobre fetch para llamar a la API.
// La cookie de sesión la envía el navegador automáticamente (misma web, misma cookie).

export interface DetalleError {
  campo: string;
  mensaje: string;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detalles: DetalleError[] = [],
  ) {
    super(message);
  }
}

/** Evento que se lanza cuando la API responde 401: la sesión ha caducado o no existe. */
export const EVENTO_SESION_CADUCADA = 'sesion-caducada';

export async function http<T>(ruta: string, opciones: RequestInit = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`/api${ruta}`, {
      ...opciones,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...opciones.headers },
    });
  } catch {
    throw new ApiError(0, 'No se puede conectar con el servidor. Comprueba tu conexión.');
  }

  if (respuesta.status === 204) return undefined as T;
  const cuerpo = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && !ruta.startsWith('/auth/login')) {
      window.dispatchEvent(new Event(EVENTO_SESION_CADUCADA));
    }
    throw new ApiError(respuesta.status, cuerpo?.error ?? 'Error inesperado', cuerpo?.detalles ?? []);
  }
  return cuerpo as T;
}
