/**
 * Generador pseudoaleatorio determinista (Mulberry32).
 * Sin Math.random. Estado de 32 bits sin signo serializable como número.
 */
export interface Rng {
  /** Devuelve un número en [0, 1). */
  next(): number;
  /** Devuelve un entero uniforme en [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
  /** Devuelve la semilla actual (entero de 32 bits sin signo) para persistencia. */
  getState(): number;
}

const UINT32_RANGE = 0x100000000;

/**
 * Avanza un paso del generador Mulberry32 de forma pura.
 */
export function nextSeed(seed: number): { value: number; seed: number } {
  const next = (seed + 0x6d2b79f5) >>> 0;
  let t = next;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const value = ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE;
  return { value, seed: next };
}

/**
 * Crea una instancia de Rng a partir de una semilla numérica.
 */
export function createRng(initialSeed: number): Rng {
  let currentSeed = initialSeed >>> 0;

  return {
    next(): number {
      const step = nextSeed(currentSeed);
      currentSeed = step.seed;
      return step.value;
    },
    nextInt(maxExclusive: number): number {
      if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
        throw new Error(`maxExclusive debe ser un entero positivo, recibido: ${maxExclusive}`);
      }
      return Math.floor(this.next() * maxExclusive);
    },
    getState(): number {
      return currentSeed;
    },
  };
}
