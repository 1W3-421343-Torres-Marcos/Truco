import { describe, expect, it } from 'vitest';

describe('entorno de tests del engine', () => {
  it('corre en Node, sin DOM', () => {
    expect(typeof globalThis.document).toBe('undefined');
  });
});
