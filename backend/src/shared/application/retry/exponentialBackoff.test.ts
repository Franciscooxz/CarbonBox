import { describe, expect, it } from 'vitest';
import { computeBackoffSeconds } from './exponentialBackoff';

const policy = { baseDelaySeconds: 10, factor: 4, maxDelaySeconds: 300 };

describe('computeBackoffSeconds', () => {
  it('crece exponencialmente con cada intento', () => {
    expect([1, 2, 3].map((attempt) => computeBackoffSeconds(attempt, policy))).toEqual([10, 40, 160]);
  });

  it('nunca supera el tope', () => {
    expect(computeBackoffSeconds(4, policy)).toBe(300);
    expect(computeBackoffSeconds(50, policy)).toBe(300);
  });

  it('trata intentos inválidos como el primero', () => {
    expect(computeBackoffSeconds(0, policy)).toBe(10);
    expect(computeBackoffSeconds(-3, policy)).toBe(10);
  });
});
