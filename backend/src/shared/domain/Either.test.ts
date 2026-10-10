import { describe, expect, it } from 'vitest';
import { Either, left, right } from './Either';

describe('Either', () => {
  it('left representa un error', () => {
    const result = left<string, number>('falló');
    expect(result.isLeft()).toBe(true);
    expect(result.isRight()).toBe(false);
    expect(result.value).toBe('falló');
  });

  it('right representa un éxito', () => {
    const result = right<number, string>(42);
    expect(result.isRight()).toBe(true);
    expect(result.value).toBe(42);
  });

  it('expone la API estática Either.left / Either.right del enunciado', () => {
    expect(Either.left('x').isLeft()).toBe(true);
    expect(Either.right(1).isRight()).toBe(true);
  });
});
