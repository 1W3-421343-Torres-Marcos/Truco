import type { Rng } from './rng.ts';

export const SUITS = ['espada', 'basto', 'oro', 'copa'] as const;
export type Suit = (typeof SUITS)[number];

export const CARD_NUMBERS = [1, 2, 3, 4, 5, 6, 7, 10, 11, 12] as const;
export type CardNumber = (typeof CARD_NUMBERS)[number];

export interface Card {
  readonly suit: Suit;
  readonly number: CardNumber;
}

export type Hand = readonly [Card, Card, Card];

/**
 * Crea el mazo español de 40 cartas (sin 8, 9 ni comodines) en orden canónico.
 */
export function createDeck(): readonly Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const number of CARD_NUMBERS) {
      deck.push({ suit, number });
    }
  }
  return deck;
}

/**
 * Identificador único estable de una carta (ej. "1-espada").
 */
export function cardId(card: Card): string {
  return `${card.number}-${card.suit}`;
}

/**
 * Nombre legible en español (ej. "1 de espada").
 */
export function formatCard(card: Card): string {
  return `${card.number} de ${card.suit}`;
}

/**
 * Mezcla un mazo de cartas con Fisher-Yates usando el Rng provisto.
 * No muta el mazo recibido.
 */
export function shuffleDeck(deck: readonly Card[], rng: Rng): Card[] {
  const copy = [...deck];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const current = copy[i];
    const target = copy[j];
    if (current !== undefined && target !== undefined) {
      copy[i] = target;
      copy[j] = current;
    }
  }
  return copy;
}

/**
 * Reparte 3 cartas al jugador mano y 3 al pie alternando una y una
 * sobre las primeras 6 cartas del mazo.
 */
export function dealHands(deck: readonly Card[]): { mano: Hand; pie: Hand } {
  const c0 = deck[0];
  const c1 = deck[1];
  const c2 = deck[2];
  const c3 = deck[3];
  const c4 = deck[4];
  const c5 = deck[5];
  if (!c0 || !c1 || !c2 || !c3 || !c4 || !c5) {
    throw new Error(
      `El mazo debe tener al menos 6 cartas para repartir (recibido: ${deck.length})`,
    );
  }
  return {
    mano: [c0, c2, c4],
    pie: [c1, c3, c5],
  };
}
