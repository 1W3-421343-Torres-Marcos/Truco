import { describe, expect, it } from 'vitest';
import {
  CARD_NUMBERS,
  SUITS,
  cardId,
  compareCards,
  createDeck,
  dealHands,
  formatCard,
  getTrucoRank,
  shuffleDeck,
  type Card,
} from './cards.ts';
import { createRng } from './rng.ts';

describe('mazo y reparto', () => {
  it('corre en entorno Node puro, sin DOM', () => {
    expect(typeof globalThis.document).toBe('undefined');
  });

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

describe('jerarquía de truco y compareCards (exhaustivo)', () => {
  // Escalones de mayor (rank 14) a menor (rank 1) según skill `truco-reglas`
  const EXPECTED_TIERS: ReadonlyArray<{ rank: number; cards: readonly Card[] }> = [
    { rank: 14, cards: [{ suit: 'espada', number: 1 }] },
    { rank: 13, cards: [{ suit: 'basto', number: 1 }] },
    { rank: 12, cards: [{ suit: 'espada', number: 7 }] },
    { rank: 11, cards: [{ suit: 'oro', number: 7 }] },
    { rank: 10, cards: SUITS.map((suit) => ({ suit, number: 3 as const })) },
    { rank: 9, cards: SUITS.map((suit) => ({ suit, number: 2 as const })) },
    {
      rank: 8,
      cards: [
        { suit: 'oro', number: 1 },
        { suit: 'copa', number: 1 },
      ],
    },
    { rank: 7, cards: SUITS.map((suit) => ({ suit, number: 12 as const })) },
    { rank: 6, cards: SUITS.map((suit) => ({ suit, number: 11 as const })) },
    { rank: 5, cards: SUITS.map((suit) => ({ suit, number: 10 as const })) },
    {
      rank: 4,
      cards: [
        { suit: 'basto', number: 7 },
        { suit: 'copa', number: 7 },
      ],
    },
    { rank: 3, cards: SUITS.map((suit) => ({ suit, number: 6 as const })) },
    { rank: 2, cards: SUITS.map((suit) => ({ suit, number: 5 as const })) },
    { rank: 1, cards: SUITS.map((suit) => ({ suit, number: 4 as const })) },
  ];

  it('cubre exactamente las 40 cartas repartidas en los 14 escalones de jerarquía', () => {
    const allTierCards = EXPECTED_TIERS.flatMap((tier) => tier.cards);
    expect(allTierCards).toHaveLength(40);
    expect(new Set(allTierCards.map(cardId)).size).toBe(40);

    for (const tier of EXPECTED_TIERS) {
      for (const card of tier.cards) {
        expect(getTrucoRank(card)).toBe(tier.rank);
      }
    }
  });

  it('verifica las 1600 comparaciones pares (40x40): reflexividad, antisimetría y orden total', () => {
    for (let i = 0; i < EXPECTED_TIERS.length; i++) {
      const tierA = EXPECTED_TIERS[i]!;
      for (let j = 0; j < EXPECTED_TIERS.length; j++) {
        const tierB = EXPECTED_TIERS[j]!;
        const expectedResult = tierA.rank > tierB.rank ? 1 : tierA.rank < tierB.rank ? -1 : 0;

        for (const cardA of tierA.cards) {
          for (const cardB of tierB.cards) {
            expect(compareCards(cardA, cardB)).toBe(expectedResult);
            expect(compareCards(cardB, cardA)).toBe(
              expectedResult === 0 ? 0 : (-expectedResult as 1 | -1),
            );
          }
        }
      }
    }
  });
});
