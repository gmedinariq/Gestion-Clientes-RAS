// Tests de los endpoints con supertest: hacen peticiones HTTP reales a la app Express (sin abrir puerto).
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { prisma } from '../src/db';
import { importarCsv } from '../src/import/csvImporter';
import { agenteAutenticado, app, crearUsuarioTest, limpiarBD, USUARIO_TEST } from './helpers';

const CSV_REAL = readFileSync('data/clientes_antiguos.csv', 'utf-8');

const nuevoCliente = {
  empresa: 'Talleres Pérez SL',
  cif: 'B99999999',
  estado: 'Activo',
  ciudad: 'Huesca',
  pais: 'España',
  comercial: 'Elena Sanz',
  contactos: [{ nombre: 'Pedro Pérez', email: 'pedro@talleresperez.es', telefono: '974 000 000' }],
};

beforeEach(async () => {
  await limpiarBD();
  await crearUsuarioTest();
  await importarCsv(prisma, CSV_REAL);
});

describe('Autenticación', () => {
  it('sin sesión no se puede acceder a los clientes (401)', async () => {
    await request(app).get('/api/clientes').expect(401);
    await request(app).get('/api/clientes/1').expect(401);
    await request(app).post('/api/clientes').send(nuevoCliente).expect(401);
    await request(app).get('/api/clientes/1/historico').expect(401);
    await request(app).put('/api/clientes/1').send(nuevoCliente).expect(401);
    await request(app).delete('/api/clientes/1').expect(401);
    await request(app).get('/api/clientes/filtros').expect(401);
    await request(app).get('/api/clientes/resumen').expect(401);
    await request(app).get('/api/clientes').set('Cookie', 'sid=token-inventado').expect(401);
    expect(await prisma.cliente.count({ where: { eliminadoEn: null } })).toBe(7); // nada se ha modificado
  });

  it('tras el logout, la cookie antigua deja de servir aunque se reenvíe', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: USUARIO_TEST.email, password: USUARIO_TEST.password });
    const cookie = login.headers['set-cookie'][0].split(';')[0]; // "sid=..."

    await request(app).get('/api/clientes').set('Cookie', cookie).expect(200);
    await request(app).post('/api/auth/logout').set('Cookie', cookie).expect(204);
    await request(app).get('/api/clientes').set('Cookie', cookie).expect(401);
  });

  it('una sesión caducada no da acceso', async () => {
    const login = await request(app).post('/api/auth/login').send({ email: USUARIO_TEST.email, password: USUARIO_TEST.password });
    const cookie = login.headers['set-cookie'][0].split(';')[0];
    await prisma.sesion.updateMany({ data: { expiraEn: new Date(Date.now() - 1000) } });

    await request(app).get('/api/clientes').set('Cookie', cookie).expect(401);
  });

  it('las respuestas no exponen el hash de la contraseña', async () => {
    const agente = await agenteAutenticado();
    const me = await agente.get('/api/auth/me').expect(200);
    expect(JSON.stringify(me.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: USUARIO_TEST.email, password: 'mala' });
    expect(res.status).toBe(401);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('el login crea una cookie HttpOnly y el logout invalida la sesión', async () => {
    const agente = request.agent(app);
    const res = await agente.post('/api/auth/login').send({ email: USUARIO_TEST.email, password: USUARIO_TEST.password });
    expect(res.status).toBe(200);
    expect(res.body.usuario.email).toBe(USUARIO_TEST.email);
    expect(res.body.usuario.passwordHash).toBeUndefined();
    expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/);

    await agente.get('/api/clientes').expect(200);
    await agente.post('/api/auth/logout').expect(204);
    await agente.get('/api/clientes').expect(401);
  });
});

describe('GET /api/clientes', () => {
  it('pagina los resultados y calcula la facturación', async () => {
    const agente = await agenteAutenticado();
    const res = await agente.get('/api/clientes?page=1&pageSize=5').expect(200);
    expect(res.body).toMatchObject({ total: 7, page: 1, pageSize: 5, totalPages: 2 });
    expect(res.body.data).toHaveLength(5);

    const ebro = res.body.data.find((c: { cif: string }) => c.cif === 'B50123456');
    expect(ebro.facturacionAcumulada).toBe('4175.90');
    expect(ebro.contactoPrincipal.nombre).toBe('Marta Gil');
  });

  it('busca por empresa, contacto, CIF y email', async () => {
    const agente = await agenteAutenticado();
    const buscar = async (q: string) =>
      (await agente.get('/api/clientes').query({ q })).body.data.map((c: { empresa: string }) => c.empresa);

    expect(await buscar('ebro')).toEqual(['Construcciones Ebro SL']);
    expect(await buscar('pablo ruiz')).toEqual(['Construcciones Ebro SL']); // segundo contacto
    expect(await buscar('b-28765432')).toEqual(['Clínica Dental Sonrisa SLP']);
    expect(await buscar('joao.silva@')).toEqual(['Vinhos do Porto Lda']);
  });

  it('filtra por estado, país y comercial', async () => {
    const agente = await agenteAutenticado();
    expect((await agente.get('/api/clientes?estado=Inactivo')).body.total).toBe(1);
    expect((await agente.get('/api/clientes?pais=Portugal')).body.total).toBe(1);
    expect((await agente.get('/api/clientes?comercial=Carmen Vega')).body.total).toBe(3);
    expect((await agente.get('/api/clientes?comercial=Carmen Vega&estado=Activo')).body.total).toBe(2);
  });

  it('responde 400 si los parámetros no son válidos', async () => {
    const agente = await agenteAutenticado();
    await agente.get('/api/clientes?estado=Pendiente').expect(400);
    await agente.get('/api/clientes?pageSize=1000').expect(400);
  });
});

describe('GET /api/clientes/:id', () => {
  it('devuelve la ficha con contactos, facturas y facturación acumulada', async () => {
    const agente = await agenteAutenticado();
    const { id } = await prisma.cliente.findUniqueOrThrow({ where: { cif: 'B50123456' } });
    const res = await agente.get(`/api/clientes/${id}`).expect(200);

    expect(res.body.contactos.map((c: { nombre: string }) => c.nombre)).toEqual(['Marta Gil', 'Pablo Ruiz']);
    expect(res.body.facturas).toHaveLength(4);
    expect(res.body.facturacionAcumulada).toBe('4175.90');
    expect(res.body.actualizadoEn).toBeDefined();
  });

  it('responde 404 si no existe y 400 si el id no es válido', async () => {
    const agente = await agenteAutenticado();
    await agente.get('/api/clientes/99999').expect(404);
    await agente.get('/api/clientes/abc').expect(400);
    await agente.get('/api/clientes/99999999999').expect(400); // fuera de rango de INTEGER: no debe dar 500
  });
});

describe('POST /api/clientes', () => {
  it('crea un cliente con sus contactos', async () => {
    const agente = await agenteAutenticado();
    const res = await agente.post('/api/clientes').send(nuevoCliente).expect(201);
    expect(res.body).toMatchObject({ empresa: 'Talleres Pérez SL', cif: 'B99999999', facturacionAcumulada: '0.00' });
    expect(res.body.contactos).toHaveLength(1);
  });

  it('rechaza un CIF que ya existe (409), aunque esté escrito distinto', async () => {
    const agente = await agenteAutenticado();
    const res = await agente.post('/api/clientes').send({ ...nuevoCliente, cif: 'b-50.123.456' }).expect(409);
    expect(res.body.error).toMatch(/Ya existe un cliente con el CIF B50123456/);
  });

  it('valida los datos y explica los errores (400)', async () => {
    const agente = await agenteAutenticado();
    const res = await agente.post('/api/clientes').send({ empresa: '', cif: 'X', estado: 'Activo' }).expect(400);
    expect(res.body.detalles.map((d: { campo: string }) => d.campo)).toEqual(expect.arrayContaining(['empresa', 'cif']));
  });

  it('rechaza una fecha de alta inexistente y acepta una válida', async () => {
    const agente = await agenteAutenticado();
    const res = await agente.post('/api/clientes').send({ ...nuevoCliente, fechaAlta: '2026-09-31' }).expect(400);
    expect(res.body.detalles[0].campo).toBe('fechaAlta');
    expect(await prisma.cliente.count({ where: { cif: 'B99999999' } })).toBe(0);

    const ok = await agente.post('/api/clientes').send({ ...nuevoCliente, fechaAlta: '2024-02-29' }).expect(201);
    expect(ok.body.fechaAlta.slice(0, 10)).toBe('2024-02-29');
  });

  it('responde 400 (no 500) a cuerpos que no son JSON válido', async () => {
    const agente = await agenteAutenticado();
    await agente.post('/api/clientes').set('Content-Type', 'application/json').send('{"empresa": ').expect(400);
    await agente.post('/api/clientes').set('Content-Type', 'text/plain').send('hola').expect(400);
  });
});

describe('PUT /api/clientes/:id e histórico', () => {
  it('registra en el histórico cada campo modificado, con usuario y valores', async () => {
    const agente = await agenteAutenticado();
    const creado = (await agente.post('/api/clientes').send(nuevoCliente)).body;
    const contacto = creado.contactos[0];

    await agente
      .put(`/api/clientes/${creado.id}`)
      .send({
        ...nuevoCliente,
        ciudad: 'Zaragoza',
        estado: 'Inactivo',
        contactos: [{ ...contacto, telefono: '974 111 111' }, { nombre: 'Nueva Persona' }],
      })
      .expect(200);

    const historial = (await agente.get(`/api/clientes/${creado.id}/historico`).expect(200)).body;
    const cambios = historial
      .filter((h: { accion: string }) => h.accion === 'MODIFICAR')
      .map((h: { entidad: string; campo: string; valorAnterior: string; valorNuevo: string }) => [h.entidad, h.campo, h.valorAnterior, h.valorNuevo]);

    expect(cambios).toEqual(
      expect.arrayContaining([
        ['cliente', 'ciudad', 'Huesca', 'Zaragoza'],
        ['cliente', 'estado', 'Activo', 'Inactivo'],
        ['contacto', 'telefono', '974 000 000', '974 111 111'],
      ]),
    );
    expect(cambios).toHaveLength(3);
    expect(historial.some((h: { entidad: string; accion: string }) => h.entidad === 'contacto' && h.accion === 'CREAR')).toBe(true);
    expect(historial[0].usuario.email).toBe(USUARIO_TEST.email);
  });

  it('no registra nada si no cambia ningún valor', async () => {
    const agente = await agenteAutenticado();
    const creado = (await agente.post('/api/clientes').send(nuevoCliente)).body;
    const antes = await prisma.historial.count({ where: { clienteId: creado.id } });

    const res = await agente.put(`/api/clientes/${creado.id}`).send({ ...nuevoCliente, contactos: creado.contactos }).expect(200);

    expect(await prisma.historial.count({ where: { clienteId: creado.id } })).toBe(antes);
    expect(res.body.actualizadoEn).toBe(creado.actualizadoEn);
  });

  it('si algo falla, no se guarda ni el cambio ni el histórico (transacción)', async () => {
    const agente = await agenteAutenticado();
    const creado = (await agente.post('/api/clientes').send(nuevoCliente)).body;

    // El contacto 99999 no pertenece al cliente: la petición falla después de haber calculado cambios
    await agente
      .put(`/api/clientes/${creado.id}`)
      .send({ ...nuevoCliente, ciudad: 'Teruel', contactos: [{ id: 99999, nombre: 'X' }] })
      .expect(400);

    const cliente = await prisma.cliente.findUniqueOrThrow({ where: { id: creado.id } });
    expect(cliente.ciudad).toBe('Huesca');
    expect(await prisma.historial.count({ where: { clienteId: creado.id, accion: 'MODIFICAR' } })).toBe(0);
  });
});

describe('DELETE /api/clientes/:id', () => {
  it('hace un borrado lógico: desaparece del listado pero conserva facturas e histórico', async () => {
    const agente = await agenteAutenticado();
    const { id } = await prisma.cliente.findUniqueOrThrow({ where: { cif: 'B50123456' } });

    await agente.delete(`/api/clientes/${id}`).expect(204);
    await agente.get(`/api/clientes/${id}`).expect(404);
    expect((await agente.get('/api/clientes')).body.total).toBe(6);

    expect(await prisma.factura.count({ where: { clienteId: id } })).toBe(4);
    const historial = (await agente.get(`/api/clientes/${id}/historico`).expect(200)).body;
    expect(historial[0]).toMatchObject({ accion: 'ELIMINAR' });

    await agente.delete(`/api/clientes/${id}`).expect(404);
  });
});
