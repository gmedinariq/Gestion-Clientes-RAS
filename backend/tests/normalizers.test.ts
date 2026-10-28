import { describe, expect, it } from 'vitest';
import {
  calcularImportesFactura,
  capitalizarPalabras,
  normalizarCif,
  normalizarEmail,
  normalizarEstado,
  normalizarFecha,
  normalizarImporte,
  normalizarIva,
  normalizarPais,
} from '../src/import/normalizers';

const iso = (d: Date | null) => d?.toISOString().slice(0, 10) ?? null;

describe('normalizarFecha', () => {
  it('acepta los formatos que aparecen en el CSV', () => {
    expect(iso(normalizarFecha('14/01/2025'))).toBe('2025-01-14');
    expect(iso(normalizarFecha('5/3/25'))).toBe('2025-03-05');
    expect(iso(normalizarFecha('12-06-2025'))).toBe('2025-06-12');
    expect(iso(normalizarFecha('2025-01-14'))).toBe('2025-01-14');
  });

  it('interpreta siempre día/mes (formato español)', () => {
    expect(iso(normalizarFecha('03/09/2026'))).toBe('2026-09-03');
  });

  it('rechaza fechas que no existen o vacías', () => {
    expect(normalizarFecha('31/09/2026')).toBeNull(); // septiembre tiene 30 días
    expect(normalizarFecha('29/02/2025')).toBeNull();
    expect(normalizarFecha('')).toBeNull();
    expect(normalizarFecha('mañana')).toBeNull();
  });
});

describe('normalizarImporte', () => {
  it('entiende el formato español con miles y decimales', () => {
    expect(normalizarImporte('1.875,60')).toBe('1875.60');
    expect(normalizarImporte('3.420,00')).toBe('3420.00');
    expect(normalizarImporte('415,25')).toBe('415.25');
  });

  it('distingue punto de miles ("1.250") de punto decimal ("640.5")', () => {
    expect(normalizarImporte('1.250')).toBe('1250.00');
    expect(normalizarImporte('2.300')).toBe('2300.00');
    expect(normalizarImporte('640.5')).toBe('640.50');
  });

  it('quita el símbolo del euro y los espacios', () => {
    expect(normalizarImporte('980,40 €')).toBe('980.40');
  });

  it('devuelve null si está vacío o no es un número', () => {
    expect(normalizarImporte('')).toBeNull();
    expect(normalizarImporte(undefined)).toBeNull();
    expect(normalizarImporte('abc')).toBeNull();
    expect(normalizarImporte('-50')).toBeNull();
  });
});

describe('normalizarIva', () => {
  it('acepta "21%", "21", "0" y "0%"', () => {
    expect(normalizarIva('21%')).toBe('21.00');
    expect(normalizarIva('21')).toBe('21.00');
    expect(normalizarIva('0')).toBe('0.00');
    expect(normalizarIva('0%')).toBe('0.00');
  });

  it('rechaza valores vacíos o fuera de rango', () => {
    expect(normalizarIva('')).toBeNull();
    expect(normalizarIva('150%')).toBeNull();
  });
});

describe('calcularImportesFactura', () => {
  it('calcula IVA y total redondeando a céntimos', () => {
    expect(calcularImportesFactura('1875.60', '21.00')).toEqual({ ivaImporte: '393.88', total: '2269.48' });
    expect(calcularImportesFactura('2300.00', '0.00')).toEqual({ ivaImporte: '0.00', total: '2300.00' });
  });
});

describe('normalización de textos', () => {
  it('unifica CIF, email, estado, país y comercial', () => {
    expect(normalizarCif('b-50123456')).toBe('B50123456');
    expect(normalizarEmail(' Lucia@ClinicaSonrisa.es')).toBe('lucia@clinicasonrisa.es');
    expect(normalizarEstado('ACTIVO')).toBe('Activo');
    expect(normalizarEstado('de baja')).toBeNull();
    expect(normalizarPais('Spain')).toBe('España');
    expect(normalizarPais('ESPAÑA')).toBe('España');
    expect(normalizarPais('PT')).toBe('Portugal');
    expect(normalizarPais('Italy')).toBe('Italia');
    expect(capitalizarPalabras('elena  sanz')).toBe('Elena Sanz');
  });
});
