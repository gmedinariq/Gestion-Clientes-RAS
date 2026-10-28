// Error con código HTTP. Los servicios lo lanzan y errorHandler lo convierte en { error: "mensaje" }.
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const noEncontrado = (mensaje = 'Recurso no encontrado') => new HttpError(404, mensaje);
