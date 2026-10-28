import { Link, Outlet } from 'react-router-dom';
import { LogOut, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

/** Estructura común de las páginas privadas: cabecera con navegación y usuario + contenido. */
export function Layout() {
  const { usuario, logout } = useAuth();

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/clientes" className="marca">
          <span className="marca-logo">GC</span>
          <span>Gestión de Clientes</span>
        </Link>
        <nav className="topbar-nav">
          <Link to="/clientes" className="nav-link">
            <Users size={16} /> Clientes
          </Link>
        </nav>
        <div className="topbar-usuario">
          <span className="usuario-nombre" title={usuario?.email}>
            {usuario?.nombre}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>
            <LogOut size={16} /> <span className="ocultar-movil">Cerrar sesión</span>
          </button>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
