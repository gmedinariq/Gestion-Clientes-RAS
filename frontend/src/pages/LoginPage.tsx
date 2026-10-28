import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/http';
import { MensajeError } from '../components/Comunes';

export function LoginPage() {
  const { usuario, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to="/clientes" replace />;

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Introduce tu email y tu contraseña.');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se ha podido iniciar sesión.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="login-fondo">
      <form className="login-card" onSubmit={enviar} noValidate>
        <div className="login-cabecera">
          <span className="marca-logo marca-logo-grande">GC</span>
          <h1>Gestión de Clientes</h1>
          <p className="texto-suave">Inicia sesión para continuar</p>
        </div>

        {error && <MensajeError texto={error} />}

        <label className="campo">
          <span>Email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>

        <button className="btn btn-primario btn-bloque" type="submit" disabled={enviando}>
          <LogIn size={18} /> {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
