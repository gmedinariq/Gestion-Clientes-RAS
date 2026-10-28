// Formatos para España: 1.250,00 €, 14/01/2025...

const euros = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

export const formatoEuros = (importe: string | number) => euros.format(Number(importe));

export const formatoPorcentaje = (valor: string) => `${Number(valor).toLocaleString('es-ES')} %`;

/** Fechas sin hora (fecha de alta, fecha de factura): se muestran en UTC para que no cambie el día. */
export const formatoFecha = (iso: string) =>
  new Date(iso).toLocaleDateString('es-ES', { timeZone: 'UTC', day: '2-digit', month: '2-digit', year: 'numeric' });

/** Fecha y hora local (histórico, última modificación) */
export const formatoFechaHora = (iso: string) =>
  new Date(iso).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
