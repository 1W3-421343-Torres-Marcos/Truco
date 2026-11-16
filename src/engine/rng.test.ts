import { describe, expect, it } from 'vitest';
import { createRng, nextSeed } from './rng.ts';

describe('rng (Mulberry32)', () => {
  it('produce la misma secuencia para la misma semilla', () => {
    const rngA = createRng(12345);
    const rngB = createRng(12345);

    const seqA = Array.from({ length: 10 }, () => rngA.next());
    const seqB = Array.from({ length: 10 }, () => rngB.next());

    expect(seqA).toEqual(seqB);
    expect(rngA.getState()).toBe(rngB.getState());
  });

  it('produce secuencias distintas para semillas distintas', () => {
    const rngA = createRng(1);
    const rngB = createRng(2);

    expect(rngA.next()).not.toBe(rngB.next());
  });

  it('permite reanudar la secuencia desde getState()', () => {
    const rng = createRng(42);
    rng.next();
    rng.next();
    const savedState = rng.getState();

    const expectedNext = rng.next();
    const resumedRng = createRng(savedState);

    expect(resumedRng.next()).toBe(expectedNext);
  });

  it('nextSeed es pura y genera valores en [0, 1)', () => {
    let seed = 999;
    for (let i = 0; i < 100; i++) {
      const step = nextSeed(seed);
      expect(step.value).toBeGreaterThanOrEqual(0);
      expect(step.value).toBeLessThan(1);
      seed = step.seed;
    }
  });

  it('nextInt devuelve enteros en [0, maxExclusive) y valida el argumento', () => {
    const rng = createRng(2026);
    for (let i = 0; i < 100; i++) {
      const value = rng.nextInt(40);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(40);
    }

    expect(() => rng.nextInt(0)).toThrow();
    expect(() => rng.nextInt(-3)).toThrow();
    expect(() => rng.nextInt(2.5)).toThrow();
  });
});
