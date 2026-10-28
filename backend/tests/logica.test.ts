// Tests de funciones puras: histórico, facturación y validación (no necesitan base de datos).
import { describe, expect, it } from 'vitest';
import { calcularCambios } from '../src/services/historial.service';
import { sumarBases } from '../src/services/clientes.service';
import { clienteSchema, idSchema } from '../src/validation/cliente.schema';

describe('calcularCambios (histórico)', () => {
  const antes = { empresa: 'Acme SL', ciudad: 'Madrid', pais: null as string | null, fechaAlta: new Date('2025-01-14') };

  it('devuelve solo los campos que cambian, con valor anterior y nuevo', () => {
    const cambios = calcularCambios(antes, { ...antes, ciudad: 'Zaragoza' }, ['empresa', 'ciudad', 'pais', 'fechaAlta']);
    expect(cambios).toEqual([{ campo: 'ciudad', valorAnterior: 'Madrid', valorNuevo: 'Zaragoza' }]);
  });

  it('no registra nada si no cambia ningún valor', () => {
    const copia = { ...antes, fechaAlta: new Date('2025-01-14') }; // otra instancia de la misma fecha
    expect(calcularCambios(antes, copia, ['empresa', 'ciudad', 'pais', 'fechaAlta'])).toEqual([]);
  });

  it('trata null y vacío como "sin valor"', () => {
    expect(calcularCambios(antes, { pais: 'España' }, ['pais'])).toEqual([
      { campo: 'pais', valorAnterior: null, valorNuevo: 'España' },
    ]);
  });
});

describe('sumarBases (facturación acumulada)', () => {
  it('suma las bases imponibles sin errores de coma flotante', () => {
    // 0.1 + 0.2 con números normales daría 0.30000000000000004
    expect(sumarBases([{ baseImponible: '0.10' }, { baseImponible: '0.20' }])).toBe('0.30');
    expect(sumarBases([{ baseImponible: '1250.00' }, { baseImponible: '1875.60' }, { baseImponible: '529.50' }, { baseImponible: '520.80' }])).toBe('4175.90');
  });

  it('devuelve 0.00 si no hay facturas', () => {
    expect(sumarBases([])).toBe('0.00');
  });
});

describe('clienteSchema (validación)', () => {
  const valido = { empresa: 'Acme SL', cif: 'b-12345678', estado: 'Activo', pais: 'spain', ciudad: '  ' };

  it('normaliza los datos válidos', () => {
    const datos = clienteSchema.parse(valido);
    expect(datos.cif).toBe('B12345678');
    expect(datos.pais).toBe('España');
    expect(datos.ciudad).toBeNull();
  });

  it('rechaza datos obligatorios vacíos o incorrectos', () => {
    const resultado = clienteSchema.safeParse({ empresa: '', cif: '12', estado: 'Pendiente' });
    expect(resultado.success).toBe(false);
    const campos = resultado.error!.issues.map((i) => i.path.join('.'));
    expect(campos).toEqual(expect.arrayContaining(['empresa', 'cif', 'estado']));
  });

  it('acepta fechas de alta válidas, incluido el 29 de febrero de un año bisiesto', () => {
    expect(clienteSchema.parse({ ...valido, fechaAlta: '2026-10-28' }).fechaAlta).toBe('2026-10-28');
    expect(clienteSchema.parse({ ...valido, fechaAlta: '2024-02-29' }).fechaAlta).toBe('2024-02-29');
  });

  it('rechaza fechas de alta que no existen o con otro formato', () => {
    // Date.parse('2026-09-31') no falla: lo convierte en 1 de octubre. Por eso no se usa.
    for (const fechaAlta of ['2026-09-31', '2026-02-29', '2026-02-30', '2026-13-01', '2026-00-10', '31/09/2026', '2026-9-1']) {
      expect(clienteSchema.safeParse({ ...valido, fechaAlta }).success, fechaAlta).toBe(false);
    }
  });

  it('rechaza ids que no caben en un INTEGER de PostgreSQL', () => {
    expect(idSchema.safeParse('2147483647').success).toBe(true);
    expect(idSchema.safeParse('2147483648').success).toBe(false);
    expect(clienteSchema.safeParse({ ...valido, contactos: [{ id: 99999999999, nombre: 'Ana' }] }).success).toBe(false);
  });

  it('valida el email y el teléfono de los contactos', () => {
    const resultado = clienteSchema.safeParse({
      ...valido,
      contactos: [{ nombre: 'Ana', email: 'no-es-un-email', telefono: 'abc' }],
    });
    expect(resultado.success).toBe(false);
    const campos = resultado.error!.issues.map((i) => i.path.join('.'));
    expect(campos).toEqual(expect.arrayContaining(['contactos.0.email', 'contactos.0.telefono']));
  });
});
