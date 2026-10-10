export interface BackoffPolicy {
  /** Espera antes del primer reintento. */
  baseDelaySeconds: number;
  /** Cuánto se multiplica la espera en cada intento. */
  factor: number;
  /** Tope: nunca se espera más que esto. */
  maxDelaySeconds: number;
}

/**
 * Espera antes de reintentar tras el intento número `attempt` (1 = primer intento fallido).
 * Con base 10 s y factor 4: 10 s, 40 s, 160 s... hasta el tope. Esperar cada vez más le da tiempo a una
 * dependencia caída (p. ej. la base de datos) de recuperarse, en vez de golpearla con reintentos seguidos.
 */
export const computeBackoffSeconds = (attempt: number, policy: BackoffPolicy): number => {
  const safeAttempt = Math.max(1, Math.floor(attempt));
  const delay = policy.baseDelaySeconds * policy.factor ** (safeAttempt - 1);
  return Math.min(Math.round(delay), policy.maxDelaySeconds);
};
