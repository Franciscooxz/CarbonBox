import { describe, expect, it } from 'vitest';
import { FileName } from './FileName';

describe('FileName', () => {
  it('acepta un .csv válido (sin importar mayúsculas) y recorta espacios', () => {
    const result = FileName.create('  Datos.CSV ');
    expect(result.isRight()).toBe(true);
    if (result.isRight()) expect(result.value.value).toBe('Datos.CSV');
  });

  it.each([
    ['', 'vacío'],
    ['datos.xlsx', '.csv'],
    ['../secreto.csv', '/'],
    ['carpeta\\datos.csv', '/'],
    [`${'a'.repeat(252)}.csv`, '255'],
  ])('rechaza "%s"', (raw, expectedFragment) => {
    const result = FileName.create(raw);
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain(expectedFragment);
  });
});
