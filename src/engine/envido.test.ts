import { describe, expect, it } from 'vitest';
import { calculateEnvido, compareEnvido, getCardEnvidoValue, hasEnvidoPair } from './envido.ts';

describe('cálculo de envido', () => {
  it('devuelve el valor individual de envido (1..7 o 0 para figuras)', () => {
    expect(getCardEnvidoValue({ suit: 'espada', number: 7 })).toBe(7);
    expect(getCardEnvidoValue({ suit: 'basto', number: 1 })).toBe(1);
    expect(getCardEnvidoValue({ suit: 'oro', number: 10 })).toBe(0);
    expect(getCardEnvidoValue({ suit: 'copa', number: 11 })).toBe(0);
    expect(getCardEnvidoValue({ suit: 'espada', number: 12 })).toBe(0);
  });

  it('calcula los ejemplos canónicos de truco-reglas', () => {
    // 7♠ 6♠ 1♣ → 33
    expect(
      calculateEnvido([
        { suit: 'espada', number: 7 },
        { suit: 'espada', number: 6 },
        { suit: 'basto', number: 1 },
      ]),
    ).toBe(33);

    // 12♠ 11♠ 4♣ → 20
    expect(
      calculateEnvido([
        { suit: 'espada', number: 12 },
        { suit: 'espada', number: 11 },
        { suit: 'basto', number: 4 },
      ]),
    ).toBe(20);

    // 7♠ 12♠ 3♦ → 27
    expect(
      calculateEnvido([
        { suit: 'espada', number: 7 },
        { suit: 'espada', number: 12 },
        { suit: 'oro', number: 3 },
      ]),
    ).toBe(27);

    // 5♣ 3♠ 12♦ → 5
    expect(
      calculateEnvido([
        { suit: 'basto', number: 5 },
        { suit: 'espada', number: 3 },
        { suit: 'oro', number: 12 },
      ]),
    ).toBe(5);

    // 10♣ 11♠ 12♦ → 0
    expect(
      calculateEnvido([
        { suit: 'basto', number: 10 },
        { suit: 'espada', number: 11 },
        { suit: 'oro', number: 12 },
      ]),
    ).toBe(0);
  });

  it('elige las 2 mejores cartas cuando las 3 son del mismo palo (sin Flor)', () => {
    expect(
      calculateEnvido([
        { suit: 'oro', number: 4 },
        { suit: 'oro', number: 7 },
        { suit: 'oro', number: 6 },
      ]),
    ).toBe(33);

    expect(
      calculateEnvido([
        { suit: 'copa', number: 12 },
        { suit: 'copa', number: 10 },
        { suit: 'copa', number: 5 },
      ]),
    ).toBe(25);
  });

  it('lanza error si se llama con una lista vacía', () => {
    expect(() => calculateEnvido([])).toThrow(/al menos una carta/);
  });

  it('resuelve empate a favor del mano en compareEnvido', () => {
    expect(compareEnvido(28, 27)).toBe('mano');
    expect(compareEnvido(27, 28)).toBe('pie');
    expect(compareEnvido(27, 27)).toBe('mano');
  });

  it('detecta si hay par del mismo palo con hasEnvidoPair', () => {
    expect(
      hasEnvidoPair([
        { suit: 'espada', number: 7 },
        { suit: 'espada', number: 2 },
        { suit: 'oro', number: 6 },
      ]),
    ).toEqual({ paired: true, suit: 'espada' });

    expect(
      hasEnvidoPair([
        { suit: 'espada', number: 7 },
        { suit: 'basto', number: 2 },
        { suit: 'oro', number: 6 },
      ]),
    ).toEqual({ paired: false, suit: null });
  });
});
