import { AlertTriangle } from 'lucide-react';

interface Props {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  procesando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/** Ventana de confirmación (se usa antes de eliminar un cliente). */
export function ConfirmDialog({ titulo, mensaje, textoConfirmar = 'Eliminar', procesando, onConfirmar, onCancelar }: Props) {
  return (
    <div className="modal-fondo" onClick={onCancelar}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="modal-titulo" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icono">
          <AlertTriangle size={22} />
        </div>
        <h2 id="modal-titulo">{titulo}</h2>
        <p>{mensaje}</p>
        <div className="modal-acciones">
          <button className="btn btn-secundario" onClick={onCancelar} disabled={procesando}>
            Cancelar
          </button>
          <button className="btn btn-peligro" onClick={onConfirmar} disabled={procesando} autoFocus>
            {procesando ? 'Eliminando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
