// Ficha del cliente: información general, contactos, facturas, facturación acumulada e histórico.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, History, Pencil, Trash2 } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { ApiError } from '../api/http';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Cargando, EstadoBadge, MensajeError } from '../components/Comunes';
import { formatoEuros, formatoFecha, formatoFechaHora, formatoPorcentaje } from '../utils/formato';
import type { ClienteDetalle, EntradaHistorial } from '../types';

// Nombres legibles de los campos que aparecen en el histórico
const NOMBRES_CAMPO: Record<string, string> = {
  empresa: 'Empresa',
  cif: 'CIF',
  estado: 'Estado',
  direccion: 'Dirección',
  cp: 'Código postal',
  ciudad: 'Ciudad',
  pais: 'País',
  comercial: 'Comercial',
  fechaAlta: 'Fecha de alta',
  nombre: 'Nombre',
  email: 'Email',
  telefono: 'Teléfono',
};

const ACCIONES: Record<EntradaHistorial['accion'], string> = {
  CREAR: 'Alta',
  MODIFICAR: 'Modificación',
  ELIMINAR: 'Baja',
};

function describirRegistro(h: EntradaHistorial) {
  return h.entidad === 'cliente' ? 'Cliente' : `Contacto #${h.registroId}`;
}

export function ClienteDetallePage() {
  const id = Number(useParams().id);
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [cliente, setCliente] = useState<ClienteDetalle | null>(null);
  const [historial, setHistorial] = useState<EntradaHistorial[]>([]);
  const [error, setError] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [eliminando, setEliminando] = useState(false);

  useEffect(() => {
    Promise.all([clientesApi.obtener(id), clientesApi.historico(id)])
      .then(([c, h]) => {
        setCliente(c);
        setHistorial(h);
      })
      .catch((e) => setError(e instanceof ApiError ? e.message : 'No se pudo cargar el cliente'));
  }, [id]);

  const eliminar = async () => {
    setEliminando(true);
    try {
      await clientesApi.eliminar(id);
      mostrar('Cliente eliminado');
      navigate('/clientes');
    } catch (e) {
      mostrar(e instanceof ApiError ? e.message : 'No se pudo eliminar el cliente', 'error');
      setEliminando(false);
      setConfirmando(false);
    }
  };

  if (error) {
    return (
      <>
        <Link to="/clientes" className="volver">
          <ArrowLeft size={16} /> Volver al listado
        </Link>
        <MensajeError texto={error} />
      </>
    );
  }
  if (!cliente) return <Cargando />;

  return (
    <>
      <Link to="/clientes" className="volver">
        <ArrowLeft size={16} /> Volver al listado
      </Link>

      <div className="cabecera-pagina">
        <div>
          <h1>
            {cliente.empresa} <EstadoBadge estado={cliente.estado} />
          </h1>
          <p className="texto-suave">
            CIF <span className="mono">{cliente.cif}</span> · Última modificación: {formatoFechaHora(cliente.actualizadoEn)}
          </p>
        </div>
        <div className="botones">
          <Link to={`/clientes/${id}/editar`} className="btn btn-primario">
            <Pencil size={16} /> Editar
          </Link>
          <button className="btn btn-peligro-suave" onClick={() => setConfirmando(true)}>
            <Trash2 size={16} /> Eliminar
          </button>
        </div>
      </div>

      <div className="rejilla-ficha">
        <section className="tarjeta">
          <h2>Información general</h2>
          <dl className="datos">
            <dt>Empresa</dt>
            <dd>{cliente.empresa}</dd>
            <dt>CIF</dt>
            <dd className="mono">{cliente.cif}</dd>
            <dt>Dirección</dt>
            <dd>{[cliente.direccion, cliente.cp].filter(Boolean).join(' · ') || '—'}</dd>
            <dt>Ciudad</dt>
            <dd>{cliente.ciudad ?? '—'}</dd>
            <dt>País</dt>
            <dd>{cliente.pais ?? '—'}</dd>
            <dt>Comercial</dt>
            <dd>{cliente.comercial ?? '—'}</dd>
            <dt>Fecha de alta</dt>
            <dd>{formatoFecha(cliente.fechaAlta)}</dd>
          </dl>
        </section>

        <section className="tarjeta tarjeta-destacada">
          <h2>Facturación acumulada</h2>
          <p className="importe-grande">{formatoEuros(cliente.facturacionAcumulada)}</p>
          <p className="texto-suave">
            Suma de las bases imponibles (sin IVA) de {cliente.facturas.length}{' '}
            {cliente.facturas.length === 1 ? 'factura' : 'facturas'}.
          </p>
        </section>
      </div>

      <section className="tarjeta">
        <h2>Contactos</h2>
        {cliente.contactos.length === 0 ? (
          <p className="texto-suave">Este cliente no tiene contactos.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {cliente.contactos.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.email ? <a href={`mailto:${c.email}`}>{c.email}</a> : '—'}</td>
                    <td>{c.telefono ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="tarjeta">
        <h2>Facturas</h2>
        {cliente.facturas.length === 0 ? (
          <p className="texto-suave">Este cliente no tiene facturas.</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla">
              <thead>
                <tr>
                  <th>Número</th>
                  <th>Fecha</th>
                  <th className="num">Base imponible</th>
                  <th className="num">IVA</th>
                  <th className="num">Cuota IVA</th>
                  <th className="num">Total</th>
                </tr>
              </thead>
              <tbody>
                {cliente.facturas.map((f) => (
                  <tr key={f.id}>
                    <td className="mono">{f.numero}</td>
                    <td>{formatoFecha(f.fecha)}</td>
                    <td className="num">{formatoEuros(f.baseImponible)}</td>
                    <td className="num">{formatoPorcentaje(f.ivaPorcentaje)}</td>
                    <td className="num">{formatoEuros(f.ivaImporte)}</td>
                    <td className="num">{formatoEuros(f.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2}>Facturación acumulada</td>
                  <td className="num">{formatoEuros(cliente.facturacionAcumulada)}</td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      <section className="tarjeta">
        <h2>
          <History size={18} /> Histórico de modificaciones
        </h2>
        {historial.length === 0 ? (
          <p className="texto-suave">Todavía no hay cambios registrados para este cliente (los datos importados del CSV no generan histórico).</p>
        ) : (
          <div className="tabla-contenedor">
            <table className="tabla tabla-compacta">
              <thead>
                <tr>
                  <th>Fecha y hora</th>
                  <th>Usuario</th>
                  <th>Acción</th>
                  <th>Registro</th>
                  <th>Campo</th>
                  <th>Valor anterior</th>
                  <th>Valor nuevo</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h) => (
                  <tr key={h.id}>
                    <td className="sin-salto">{formatoFechaHora(h.fecha)}</td>
                    <td>{h.usuario.nombre}</td>
                    <td>{ACCIONES[h.accion]}</td>
                    <td>{describirRegistro(h)}</td>
                    <td>{h.campo ? NOMBRES_CAMPO[h.campo] ?? h.campo : '—'}</td>
                    <td className="valor-anterior">{h.valorAnterior ?? '—'}</td>
                    <td className="valor-nuevo">{h.valorNuevo ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {confirmando && (
        <ConfirmDialog
          titulo="Eliminar cliente"
          mensaje={`¿Seguro que quieres eliminar "${cliente.empresa}"? Dejará de aparecer en la aplicación, pero se conservarán sus facturas y su histórico.`}
          procesando={eliminando}
          onConfirmar={eliminar}
          onCancelar={() => setConfirmando(false)}
        />
      )}
    </>
  );
}
