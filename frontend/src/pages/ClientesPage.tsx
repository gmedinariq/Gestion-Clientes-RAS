// Listado de clientes: indicadores, buscador, filtros, tabla, paginación y acciones.
// Los filtros se guardan en la URL (?q=ebro&estado=Activo&page=2): así se pueden compartir
// y se conservan al volver atrás desde la ficha de un cliente.

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { ApiError } from '../api/http';
import { useToast } from '../context/ToastContext';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Cargando, EstadoBadge, MensajeError, Paginacion } from '../components/Comunes';
import { formatoEuros } from '../utils/formato';
import type { ClienteListado, PaginaClientes } from '../types';

const TAMANO_PAGINA = 10;

export function ClientesPage() {
  const navigate = useNavigate();
  const { mostrar } = useToast();
  const [params, setParams] = useSearchParams();

  const filtros = {
    q: params.get('q') ?? '',
    estado: params.get('estado') ?? '',
    pais: params.get('pais') ?? '',
    comercial: params.get('comercial') ?? '',
    page: Number(params.get('page') ?? 1),
  };

  const [busqueda, setBusqueda] = useState(filtros.q);
  const [pagina, setPagina] = useState<PaginaClientes | null>(null);
  const [opciones, setOpciones] = useState<{ paises: string[]; comerciales: string[] }>({ paises: [], comerciales: [] });
  const [resumen, setResumen] = useState<{ totalClientes: number; clientesActivos: number; facturacionTotal: string } | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aEliminar, setAEliminar] = useState<ClienteListado | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [recargar, setRecargar] = useState(0);

  /** Cambia uno o varios filtros en la URL. Cualquier cambio de filtro vuelve a la página 1. */
  const cambiarFiltros = (cambios: Record<string, string>) => {
    const nuevos = new URLSearchParams(params);
    for (const [clave, valor] of Object.entries(cambios)) {
      if (valor) nuevos.set(clave, valor);
      else nuevos.delete(clave);
    }
    if (!('page' in cambios)) nuevos.delete('page');
    setParams(nuevos);
  };

  // Búsqueda con "debounce": se lanza 300 ms después de que el usuario deje de escribir
  useEffect(() => {
    if (busqueda === filtros.q) return;
    const temporizador = setTimeout(() => cambiarFiltros({ q: busqueda.trim() }), 300);
    return () => clearTimeout(temporizador);
  }, [busqueda]);

  // Opciones de los desplegables e indicadores (se recargan tras eliminar)
  useEffect(() => {
    clientesApi.filtros().then(setOpciones).catch(() => undefined);
    clientesApi.resumen().then(setResumen).catch(() => undefined);
  }, [recargar]);

  // Carga del listado cada vez que cambian los filtros de la URL
  useEffect(() => {
    let cancelado = false; // evita mostrar una respuesta antigua si llega después de una más nueva
    setCargando(true);
    setError('');
    clientesApi
      .listar({ ...filtros, pageSize: TAMANO_PAGINA })
      .then((r) => !cancelado && setPagina(r))
      .catch((e) => !cancelado && setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado'))
      .finally(() => !cancelado && setCargando(false));
    return () => {
      cancelado = true;
    };
  }, [params.toString(), recargar]);

  const confirmarEliminar = async () => {
    if (!aEliminar) return;
    setEliminando(true);
    try {
      await clientesApi.eliminar(aEliminar.id);
      mostrar(`Cliente "${aEliminar.empresa}" eliminado`);
      setAEliminar(null);
      setRecargar((n) => n + 1);
    } catch (e) {
      mostrar(e instanceof ApiError ? e.message : 'No se pudo eliminar el cliente', 'error');
    } finally {
      setEliminando(false);
    }
  };

  const hayFiltros = filtros.q || filtros.estado || filtros.pais || filtros.comercial;

  return (
    <>
      <div className="cabecera-pagina">
        <div>
          <h1>Clientes</h1>
          <p className="texto-suave">Consulta y gestiona la cartera de clientes</p>
        </div>
        <Link to="/clientes/nuevo" className="btn btn-primario">
          <Plus size={18} /> Nuevo cliente
        </Link>
      </div>

      {resumen && (
        <section className="indicadores">
          <div className="indicador">
            <span className="indicador-titulo">Total clientes</span>
            <span className="indicador-valor">{resumen.totalClientes}</span>
          </div>
          <div className="indicador">
            <span className="indicador-titulo">Clientes activos</span>
            <span className="indicador-valor">{resumen.clientesActivos}</span>
          </div>
          <div className="indicador">
            <span className="indicador-titulo">Facturación acumulada (sin IVA)</span>
            <span className="indicador-valor">{formatoEuros(resumen.facturacionTotal)}</span>
          </div>
        </section>
      )}

      <section className="tarjeta">
        <div className="filtros">
          <div className="buscador">
            <Search size={18} />
            <input
              type="search"
              placeholder="Buscar por empresa, contacto, CIF o email"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              aria-label="Buscar clientes"
            />
          </div>
          <select value={filtros.estado} onChange={(e) => cambiarFiltros({ estado: e.target.value })} aria-label="Estado">
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
          <select value={filtros.pais} onChange={(e) => cambiarFiltros({ pais: e.target.value })} aria-label="País">
            <option value="">Todos los países</option>
            {opciones.paises.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <select value={filtros.comercial} onChange={(e) => cambiarFiltros({ comercial: e.target.value })} aria-label="Comercial">
            <option value="">Todos los comerciales</option>
            {opciones.comerciales.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          {hayFiltros && (
            <button
              className="btn btn-ghost"
              onClick={() => {
                setBusqueda('');
                setParams(new URLSearchParams());
              }}
            >
              <X size={16} /> Limpiar
            </button>
          )}
        </div>

        {error && <MensajeError texto={error} />}
        {cargando && !pagina && <Cargando />}

        {pagina && (
          <div className={`tabla-contenedor ${cargando ? 'actualizando' : ''}`}>
            <table className="tabla">
              <thead>
                <tr>
                  <th>Empresa</th>
                  <th>CIF</th>
                  <th>Contacto principal</th>
                  <th>Ciudad</th>
                  <th>País</th>
                  <th>Estado</th>
                  <th>Comercial</th>
                  <th className="num">Facturación</th>
                  <th className="acciones">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pagina.data.length === 0 && (
                  <tr>
                    <td colSpan={9} className="vacio">
                      No hay clientes que coincidan con la búsqueda.
                    </td>
                  </tr>
                )}
                {pagina.data.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/clientes/${c.id}`} className="enlace-fuerte">
                        {c.empresa}
                      </Link>
                    </td>
                    <td className="mono">{c.cif}</td>
                    <td>
                      {c.contactoPrincipal ? (
                        <>
                          {c.contactoPrincipal.nombre}
                          {c.contactoPrincipal.email && <div className="texto-suave texto-pequeno">{c.contactoPrincipal.email}</div>}
                        </>
                      ) : (
                        <span className="texto-suave">—</span>
                      )}
                    </td>
                    <td>{c.ciudad ?? '—'}</td>
                    <td>{c.pais ?? '—'}</td>
                    <td>
                      <EstadoBadge estado={c.estado} />
                    </td>
                    <td>{c.comercial ?? '—'}</td>
                    <td className="num">{formatoEuros(c.facturacionAcumulada)}</td>
                    <td className="acciones">
                      <button className="btn-icono" title="Ver ficha" aria-label={`Ver ${c.empresa}`} onClick={() => navigate(`/clientes/${c.id}`)}>
                        <Eye size={17} />
                      </button>
                      <button className="btn-icono" title="Editar" aria-label={`Editar ${c.empresa}`} onClick={() => navigate(`/clientes/${c.id}/editar`)}>
                        <Pencil size={17} />
                      </button>
                      <button className="btn-icono btn-icono-peligro" title="Eliminar" aria-label={`Eliminar ${c.empresa}`} onClick={() => setAEliminar(c)}>
                        <Trash2 size={17} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagina && pagina.total > 0 && (
          <Paginacion
            pagina={pagina.page}
            totalPaginas={pagina.totalPages}
            total={pagina.total}
            onCambiar={(p) => cambiarFiltros({ page: String(p) })}
          />
        )}
      </section>

      {aEliminar && (
        <ConfirmDialog
          titulo="Eliminar cliente"
          mensaje={`¿Seguro que quieres eliminar "${aEliminar.empresa}"? Dejará de aparecer en la aplicación, pero se conservarán sus facturas y su histórico.`}
          procesando={eliminando}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setAEliminar(null)}
        />
      )}
    </>
  );
}
