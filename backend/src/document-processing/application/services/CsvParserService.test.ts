import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CsvParserService } from './CsvParserService';

const parser = new CsvParserService();
const csv = (text: string): Buffer => Buffer.from(text, 'utf8');
const sample = (name: string): Buffer => fs.readFileSync(path.resolve(__dirname, '../../../../../', name));

describe('CsvParserService', () => {
  it('parsea el sample-data.csv completo sin errores', () => {
    const result = parser.parse(sample('sample-data.csv'));
    expect(result.isRight()).toBe(true);
    if (result.isRight()) {
      expect(result.value.totalRows).toBe(60);
      expect(result.value.validRows).toHaveLength(60);
      expect(result.value.rowErrors).toHaveLength(0);
    }
  });

  it('reporta cada error de sample-data-con-errores.csv con su número de fila', () => {
    const result = parser.parse(sample('sample-data-con-errores.csv'));
    if (result.isLeft()) throw new Error(result.value.message);
    const { totalRows, validRows, rowErrors } = result.value;

    expect(totalRows).toBe(9);
    expect(validRows.map((row) => row.category)).toEqual(['Electricity', 'Air Travel']);
    expect(rowErrors).toEqual([
      { rowNumber: 3, message: 'amount debe ser mayor que 0' },
      { rowNumber: 4, message: 'category no puede estar vacío' },
      { rowNumber: 5, message: 'amount debe ser un número' },
      { rowNumber: 6, message: 'unit no puede estar vacío' },
      { rowNumber: 7, message: 'date no es una fecha real' },
      { rowNumber: 8, message: 'date debe tener formato YYYY-MM-DD' },
      { rowNumber: 9, message: 'amount debe ser mayor que 0' },
    ]);
  });

  it('convierte tipos: amount a número y date a medianoche UTC', () => {
    const result = parser.parse(csv('category,amount,unit,date\nElectricity,150.5,kWh,2024-01-15\n'));
    if (result.isLeft()) throw new Error(result.value.message);
    const [row] = result.value.validRows;
    expect(row?.amount).toBe(150.5);
    expect(row?.date.toISOString()).toBe('2024-01-15T00:00:00.000Z');
  });

  it('tolera BOM, mayúsculas y espacios en el header', () => {
    const result = parser.parse(csv('﻿ Category , AMOUNT,unit ,Date\nWater,1,m3,2024-01-01\n'));
    expect(result.isRight()).toBe(true);
  });

  it('acepta 29 de febrero en año bisiesto y lo rechaza en año normal', () => {
    const result = parser.parse(csv('category,amount,unit,date\nA,1,u,2024-02-29\nB,1,u,2023-02-29\n'));
    if (result.isLeft()) throw new Error(result.value.message);
    expect(result.value.validRows).toHaveLength(1);
    expect(result.value.rowErrors[0]?.rowNumber).toBe(3);
  });

  it('reporta filas con número incorrecto de columnas', () => {
    const result = parser.parse(csv('category,amount,unit,date\nA,1,u\n'));
    if (result.isLeft()) throw new Error(result.value.message);
    expect(result.value.rowErrors[0]?.message).toContain('4 columnas');
  });

  it.each([
    ['sample-data-vacio.csv', 'vacío'],
    ['sample-data-solo-header.csv', 'no contiene filas'],
    ['sample-data-header-invalido.csv', 'Header inválido'],
  ])('falla el archivo completo para %s', (file, fragment) => {
    const result = parser.parse(sample(file));
    expect(result.isLeft()).toBe(true);
    if (result.isLeft()) expect(result.value.message).toContain(fragment);
  });

  it('convierte un CSV mal formado en Left en vez de lanzar', () => {
    const result = parser.parse(csv('category,amount,unit,date\n"sin cerrar,1,u,2024-01-01\n'));
    expect(result.isLeft()).toBe(true);
  });
});
