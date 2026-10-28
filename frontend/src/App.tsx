// Rutas de la aplicación. Todo lo que está dentro de <RutaPrivada> exige sesión iniciada.

import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Cargando } from './components/Comunes';
import { LoginPage } from './pages/LoginPage';
import { ClientesPage } from './pages/ClientesPage';
import { ClienteDetallePage } from './pages/ClienteDetallePage';
import { ClienteFormPage } from './pages/ClienteFormPage';

function RutaPrivada() {
  const { usuario, cargando } = useAuth();
  if (cargando) return <Cargando texto="Comprobando sesión…" />;
  return usuario ? <Outlet /> : <Navigate to="/login" replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<RutaPrivada />}>
        <Route element={<Layout />}>
          <Route path="/clientes" element={<ClientesPage />} />
          <Route path="/clientes/nuevo" element={<ClienteFormPage />} />
          <Route path="/clientes/:id" element={<ClienteDetallePage />} />
          <Route path="/clientes/:id/editar" element={<ClienteFormPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/clientes" replace />} />
    </Routes>
  );
}
