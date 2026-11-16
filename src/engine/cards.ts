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

/**
 * Devuelve el rango de poder de una carta en el Truco (1 = más baja, 14 = más alta).
 * Ver tabla en skill `truco-reglas`.
 */
export function getTrucoRank(card: Card): number {
  const { suit, number } = card;
  if (number === 1 && suit === 'espada') return 14;
  if (number === 1 && suit === 'basto') return 13;
  if (number === 7 && suit === 'espada') return 12;
  if (number === 7 && suit === 'oro') return 11;

  switch (number) {
    case 3:
      return 10;
    case 2:
      return 9;
    case 1:
      return 8; // 1 de oro, 1 de copa (anchos falsos)
    case 12:
      return 7;
    case 11:
      return 6;
    case 10:
      return 5;
    case 7:
      return 4; // 7 de basto, 7 de copa (sietes falsos)
    case 6:
      return 3;
    case 5:
      return 2;
    case 4:
      return 1;
  }
}

/**
 * Compara dos cartas según la jerarquía del Truco.
 * Devuelve `1` si gana `cardA`, `-1` si gana `cardB`, `0` si es parda.
 */
export function compareCards(cardA: Card, cardB: Card): 1 | 0 | -1 {
  const rankA = getTrucoRank(cardA);
  const rankB = getTrucoRank(cardB);
  if (rankA > rankB) return 1;
  if (rankA < rankB) return -1;
  return 0;
}
