// Error con código HTTP. Los servicios lo lanzan (throw) y el middleware errorHandler
// lo convierte en una respuesta JSON: { error: "mensaje" }.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public detalles?: unknown,
  ) {
    super(message);
  }
}

export const noEncontrado = (mensaje = 'Recurso no encontrado') => new HttpError(404, mensaje);
