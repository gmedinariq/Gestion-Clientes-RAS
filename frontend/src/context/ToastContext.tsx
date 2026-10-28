// Mensajes emergentes de éxito o error ("Cliente guardado correctamente").
// Uso: const { mostrar } = useToast(); mostrar('Texto', 'exito');

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

type TipoToast = 'exito' | 'error';
interface Toast {
  id: number;
  texto: string;
  tipo: TipoToast;
}

const ToastContext = createContext<{ mostrar: (texto: string, tipo?: TipoToast) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const mostrar = useCallback((texto: string, tipo: TipoToast = 'exito') => {
    const id = Date.now() + Math.random();
    setToasts((actuales) => [...actuales, { id, texto, tipo }]);
    setTimeout(() => setToasts((actuales) => actuales.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.tipo}`}>
            {t.tipo === 'exito' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
            {t.texto}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return contexto;
}
