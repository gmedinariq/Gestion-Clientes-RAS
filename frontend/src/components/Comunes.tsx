// Componentes pequeños reutilizados en varias páginas.

import { AlertCircle, Loader2 } from 'lucide-react';
import type { Estado } from '../types';

export function EstadoBadge({ estado }: { estado: Estado }) {
  return <span className={`badge ${estado === 'Activo' ? 'badge-activo' : 'badge-inactivo'}`}>{estado}</span>;
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <div className="cargando">
      <Loader2 className="girar" size={22} /> {texto}
    </div>
  );
}

export function MensajeError({ texto }: { texto: string }) {
  return (
    <div className="alerta alerta-error" role="alert">
      <AlertCircle size={18} /> {texto}
    </div>
  );
}

interface PaginacionProps {
  pagina: number;
  totalPaginas: number;
  total: number;
  onCambiar: (pagina: number) => void;
}

export function Paginacion({ pagina, totalPaginas, total, onCambiar }: PaginacionProps) {
  return (
    <div className="paginacion">
      <span className="texto-suave">
        {total} {total === 1 ? 'cliente' : 'clientes'} · Página {pagina} de {totalPaginas}
      </span>
      <div className="paginacion-botones">
        <button className="btn btn-secundario btn-sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)}>
          Anterior
        </button>
        <button className="btn btn-secundario btn-sm" disabled={pagina >= totalPaginas} onClick={() => onCambiar(pagina + 1)}>
          Siguiente
        </button>
      </div>
    </div>
  );
}
