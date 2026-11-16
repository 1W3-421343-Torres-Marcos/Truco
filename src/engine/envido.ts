import { SUITS, type Card, type Suit } from './cards.ts';

/**
 * Valor de una carta para el cálculo de Envido:
 * - Del 1 al 7 vale su número.
 * - Las figuras (10, 11, 12) valen 0.
 */
export function getCardEnvidoValue(card: Card): number {
  if (card.number >= 10) return 0;
  return card.number;
}

/**
 * Calcula los puntos de Envido de una mano (usualmente 3 cartas, sin Flor):
 * - Si hay >= 2 cartas del mismo palo: 20 + la suma de las 2 de mayor valor de envido de ese palo.
 * - Si todas son de distinto palo: el mayor valor individual (0..7).
 */
export function calculateEnvido(cards: readonly Card[]): number {
  if (cards.length === 0) {
    throw new Error('Se requiere al menos una carta para calcular el envido');
  }

  let bestScore = 0;

  for (const suit of SUITS) {
    const suitValues = cards
      .filter((c) => c.suit === suit)
      .map(getCardEnvidoValue)
      .sort((a, b) => b - a);

    const first = suitValues[0];
    const second = suitValues[1];

    if (first !== undefined && second !== undefined) {
      bestScore = Math.max(bestScore, 20 + first + second);
    } else if (first !== undefined) {
      bestScore = Math.max(bestScore, first);
    }
  }

  return bestScore;
}

/**
 * Determina el ganador del Envido entre el jugador `mano` y el jugador `pie`.
 * En caso de empate gana el `mano`.
 */
export function compareEnvido(manoPoints: number, piePoints: number): 'mano' | 'pie' {
  return manoPoints >= piePoints ? 'mano' : 'pie';
}

/**
 * Helper para inspeccionar si una mano tiene cartas ligadas del mismo palo para el envido.
 */
export function hasEnvidoPair(cards: readonly Card[]): { paired: boolean; suit: Suit | null } {
  for (const suit of SUITS) {
    const count = cards.filter((c) => c.suit === suit).length;
    if (count >= 2) {
      return { paired: true, suit };
    }
  }
  return { paired: false, suit: null };
}
