// Formulario para crear (/clientes/nuevo) o editar (/clientes/:id/editar) un cliente y sus contactos.
// Valida en el navegador para dar respuesta inmediata; la API vuelve a validar siempre (nunca nos fiamos del cliente).

import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { clientesApi } from '../api/clientes';
import { ApiError } from '../api/http';
import { useToast } from '../context/ToastContext';
import { Cargando, MensajeError } from '../components/Comunes';
import type { ClienteDetalle, ClienteFormData } from '../types';

type Errores = Record<string, string>;

const ETIQUETAS_CONTACTO = { nombre: 'Nombre', email: 'Email', telefono: 'Teléfono' };

const VACIO: ClienteFormData = {
  empresa: '',
  cif: '',
  estado: 'Activo',
  direccion: '',
  cp: '',
  ciudad: '',
  pais: 'España',
  comercial: '',
  fechaAlta: new Date().toISOString().slice(0, 10),
  contactos: [{ nombre: '', email: '', telefono: '' }],
};

function aFormulario(c: ClienteDetalle): ClienteFormData {
  return {
    empresa: c.empresa,
    cif: c.cif,
    estado: c.estado,
    direccion: c.direccion ?? '',
    cp: c.cp ?? '',
    ciudad: c.ciudad ?? '',
    pais: c.pais ?? '',
    comercial: c.comercial ?? '',
    fechaAlta: c.fechaAlta.slice(0, 10),
    contactos: c.contactos.map((k) => ({ id: k.id, nombre: k.nombre, email: k.email ?? '', telefono: k.telefono ?? '' })),
  };
}

/** Validación en el navegador. Las claves coinciden con las que devuelve la API ("contactos.0.email"). */
function validar(datos: ClienteFormData): Errores {
  const errores: Errores = {};
  if (!datos.empresa.trim()) errores.empresa = 'La empresa es obligatoria';
  const cif = datos.cif.replace(/[\s.-]/g, '').toUpperCase();
  if (!cif) errores.cif = 'El CIF es obligatorio';
  else if (!/^[A-Z0-9]{8,15}$/.test(cif)) errores.cif = 'CIF no válido (8-15 letras o números)';
  if (!datos.fechaAlta) errores.fechaAlta = 'La fecha de alta es obligatoria';

  datos.contactos.forEach((c, i) => {
    if (!c.nombre.trim()) errores[`contactos.${i}.nombre`] = 'El nombre es obligatorio';
    if (c.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim())) errores[`contactos.${i}.email`] = 'Email no válido';
    if (c.telefono.trim() && !/^\+?[\d\s().-]{6,}$/.test(c.telefono.trim()))
      errores[`contactos.${i}.telefono`] = 'Teléfono no válido (solo números, espacios y +)';
  });
  return errores;
}

export function ClienteFormPage() {
  const { id } = useParams();
  const esEdicion = id !== undefined;
  const navigate = useNavigate();
  const { mostrar } = useToast();

  const [datos, setDatos] = useState<ClienteFormData>(VACIO);
  const [errores, setErrores] = useState<Errores>({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(esEdicion);
  const [guardando, setGuardando] = useState(false);
  const [opciones, setOpciones] = useState<{ paises: string[]; comerciales: string[] }>({ paises: [], comerciales: [] });

  useEffect(() => {
    clientesApi.filtros().then(setOpciones).catch(() => undefined);
    if (!esEdicion) return;
    clientesApi
      .obtener(Number(id))
      .then((c) => setDatos(aFormulario(c)))
      .catch((e) => setErrorGeneral(e instanceof ApiError ? e.message : 'No se pudo cargar el cliente'))
      .finally(() => setCargando(false));
  }, [id, esEdicion]);

  const cambiar = (campo: keyof ClienteFormData, valor: string) => setDatos((d) => ({ ...d, [campo]: valor }));

  const cambiarContacto = (indice: number, campo: 'nombre' | 'email' | 'telefono', valor: string) =>
    setDatos((d) => ({
      ...d,
      contactos: d.contactos.map((c, i) => (i === indice ? { ...c, [campo]: valor } : c)),
    }));

  const anadirContacto = () => setDatos((d) => ({ ...d, contactos: [...d.contactos, { nombre: '', email: '', telefono: '' }] }));

  const quitarContacto = (indice: number) => setDatos((d) => ({ ...d, contactos: d.contactos.filter((_, i) => i !== indice) }));

  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    setErrorGeneral('');
    const erroresLocales = validar(datos);
    setErrores(erroresLocales);
    if (Object.keys(erroresLocales).length > 0) {
      setErrorGeneral('Revisa los campos marcados en rojo.');
      return;
    }

    setGuardando(true);
    try {
      const guardado = esEdicion ? await clientesApi.actualizar(Number(id), datos) : await clientesApi.crear(datos);
      mostrar(esEdicion ? 'Cambios guardados correctamente' : 'Cliente creado correctamente');
      navigate(`/clientes/${guardado.id}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrorGeneral(err.message);
        // Errores de validación de la API asociados a cada campo
        setErrores(Object.fromEntries(err.detalles.map((d) => [d.campo, d.mensaje])));
      } else {
        setErrorGeneral('No se pudo guardar el cliente');
      }
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <Cargando />;

  /** Campo de texto con su etiqueta y su mensaje de error */
  const campoTexto = (campo: keyof ClienteFormData, etiqueta: string, extra: { obligatorio?: boolean; lista?: string; tipo?: string } = {}) => (
    <label className={`campo ${errores[campo] ? 'campo-error' : ''}`}>
      <span>
        {etiqueta}
        {extra.obligatorio && <span className="obligatorio"> *</span>}
      </span>
      <input
        type={extra.tipo ?? 'text'}
        value={datos[campo] as string}
        onChange={(e) => cambiar(campo, e.target.value)}
        list={extra.lista}
        aria-invalid={Boolean(errores[campo])}
      />
      {errores[campo] && <small className="error-campo">{errores[campo]}</small>}
    </label>
  );

  return (
    <>
      <Link to={esEdicion ? `/clientes/${id}` : '/clientes'} className="volver">
        <ArrowLeft size={16} /> Volver
      </Link>
      <div className="cabecera-pagina">
        <h1>{esEdicion ? 'Editar cliente' : 'Nuevo cliente'}</h1>
      </div>

      <form onSubmit={guardar} noValidate className="formulario">
        {errorGeneral && <MensajeError texto={errorGeneral} />}

        <section className="tarjeta">
          <h2>Datos del cliente</h2>
          <div className="rejilla-campos">
            {campoTexto('empresa', 'Empresa o razón social', { obligatorio: true })}
            {campoTexto('cif', 'CIF', { obligatorio: true })}
            <label className="campo">
              <span>
                Estado<span className="obligatorio"> *</span>
              </span>
              <select value={datos.estado} onChange={(e) => cambiar('estado', e.target.value)}>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </label>
            {campoTexto('fechaAlta', 'Fecha de alta', { obligatorio: true, tipo: 'date' })}
            {campoTexto('comercial', 'Comercial asignado', { lista: 'lista-comerciales' })}
            {campoTexto('direccion', 'Dirección')}
            {campoTexto('cp', 'Código postal')}
            {campoTexto('ciudad', 'Ciudad')}
            {campoTexto('pais', 'País', { lista: 'lista-paises' })}
          </div>
          <datalist id="lista-paises">
            {opciones.paises.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <datalist id="lista-comerciales">
            {opciones.comerciales.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </section>

        <section className="tarjeta">
          <div className="cabecera-seccion">
            <h2>Contactos</h2>
            <button type="button" className="btn btn-secundario btn-sm" onClick={anadirContacto}>
              <Plus size={16} /> Añadir contacto
            </button>
          </div>
          {datos.contactos.length === 0 && <p className="texto-suave">Sin contactos.</p>}
          {datos.contactos.map((c, i) => (
            <div className="fila-contacto" key={c.id ?? `nuevo-${i}`}>
              {(['nombre', 'email', 'telefono'] as const).map((campo) => {
                const clave = `contactos.${i}.${campo}`;
                return (
                  <label key={campo} className={`campo ${errores[clave] ? 'campo-error' : ''}`}>
                    <span>
                      {ETIQUETAS_CONTACTO[campo]}
                      {campo === 'nombre' && <span className="obligatorio"> *</span>}
                    </span>
                    <input
                      type={campo === 'email' ? 'email' : campo === 'telefono' ? 'tel' : 'text'}
                      value={c[campo]}
                      onChange={(e) => cambiarContacto(i, campo, e.target.value)}
                      aria-invalid={Boolean(errores[clave])}
                    />
                    {errores[clave] && <small className="error-campo">{errores[clave]}</small>}
                  </label>
                );
              })}
              <button type="button" className="btn-icono btn-icono-peligro" title="Quitar contacto" aria-label="Quitar contacto" onClick={() => quitarContacto(i)}>
                <Trash2 size={17} />
              </button>
            </div>
          ))}
        </section>

        <div className="botones botones-formulario">
          <Link to={esEdicion ? `/clientes/${id}` : '/clientes'} className="btn btn-secundario">
            Cancelar
          </Link>
          <button type="submit" className="btn btn-primario" disabled={guardando}>
            <Save size={16} /> {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </form>
    </>
  );
}
