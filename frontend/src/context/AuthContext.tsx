// Estado global de la sesión: qué usuario ha iniciado sesión (o null). Se lee con useAuth().

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/clientes';
import { EVENTO_SESION_CADUCADA } from '../api/http';
import type { Usuario } from '../types';

interface AuthContextValue {
  usuario: Usuario | null;
  cargando: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la aplicación preguntamos a la API si ya hay una sesión activa (cookie)
  useEffect(() => {
    authApi
      .me()
      .then((r) => setUsuario(r.usuario))
      .catch(() => setUsuario(null))
      .finally(() => setCargando(false));
  }, []);

  // Si cualquier llamada devuelve 401, la sesión ha caducado: volvemos al login
  useEffect(() => {
    const alCaducar = () => setUsuario(null);
    window.addEventListener(EVENTO_SESION_CADUCADA, alCaducar);
    return () => window.removeEventListener(EVENTO_SESION_CADUCADA, alCaducar);
  }, []);

  const login = async (email: string, password: string) => {
    const r = await authApi.login(email, password);
    setUsuario(r.usuario);
  };

  const logout = async () => {
    await authApi.logout().catch(() => undefined);
    setUsuario(null);
  };

  return <AuthContext.Provider value={{ usuario, cargando, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return contexto;
}
