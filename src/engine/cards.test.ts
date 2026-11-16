import { describe, expect, it } from 'vitest';
import {
  CARD_NUMBERS,
  SUITS,
  cardId,
  createDeck,
  dealHands,
  formatCard,
  shuffleDeck,
} from './cards.ts';
import { createRng } from './rng.ts';

describe('mazo y reparto', () => {
  it('crea un mazo de 40 cartas únicas con los 4 palos y 10 números', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(40);

    const ids = new Set(deck.map(cardId));
    expect(ids.size).toBe(40);

    for (const suit of SUITS) {
      const ofSuit = deck.filter((c) => c.suit === suit);
      expect(ofSuit.map((c) => c.number)).toEqual([...CARD_NUMBERS]);
    }
  });

  it('formatea e identifica cartas correctamente', () => {
    expect(cardId({ suit: 'espada', number: 1 })).toBe('1-espada');
    expect(formatCard({ suit: 'basto', number: 7 })).toBe('7 de basto');
  });

  it('shuffleDeck es determinista según la semilla y no muta el mazo original', () => {
    const original = createDeck();
    const snapshot = [...original];

    const shuffled1 = shuffleDeck(original, createRng(777));
    const shuffled2 = shuffleDeck(original, createRng(777));
    const shuffledOther = shuffleDeck(original, createRng(888));

    expect(original).toEqual(snapshot);
    expect(shuffled1).toEqual(shuffled2);
    expect(shuffled1).not.toEqual(original);
    expect(shuffled1).not.toEqual(shuffledOther);
    expect(new Set(shuffled1.map(cardId)).size).toBe(40);
  });

  it('dealHands reparte 3 cartas al mano y 3 al pie alternadas sin repetirse', () => {
    const deck = shuffleDeck(createDeck(), createRng(101));
    const { mano, pie } = dealHands(deck);

    expect(mano).toEqual([deck[0], deck[2], deck[4]]);
    expect(pie).toEqual([deck[1], deck[3], deck[5]]);

    const dealtIds = new Set([...mano, ...pie].map(cardId));
    expect(dealtIds.size).toBe(6);
  });

  it('dealHands lanza error si el mazo tiene menos de 6 cartas', () => {
    const shortDeck = createDeck().slice(0, 5);
    expect(() => dealHands(shortDeck)).toThrow(/al menos 6 cartas/);
  });
});
