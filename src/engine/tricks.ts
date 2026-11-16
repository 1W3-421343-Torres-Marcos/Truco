import { compareCards, type Card } from './cards.ts';
import type { PlayerId, TrickOutcome, TrickState } from './types.ts';

/**
 * Determina el ganador de una baza dadas las cartas jugadas por ambos jugadores.
 */
export function resolveTrickWinner(humanCard: Card, botCard: Card): TrickOutcome {
  const cmp = compareCards(humanCard, botCard);
  if (cmp === 1) return 'human';
  if (cmp === -1) return 'bot';
  return 'parda';
}

/**
 * Determina qué jugador debe tirar primero en la siguiente baza:
 * - Quien ganó la baza anterior.
 * - Si la baza anterior fue parda, empieza el jugador `manoPlayer`.
 */
export function nextTrickLeadPlayer(completedTrick: TrickState, manoPlayer: PlayerId): PlayerId {
  if (completedTrick.winner === 'human' || completedTrick.winner === 'bot') {
    return completedTrick.winner;
  }
  return manoPlayer;
}

/**
 * Determina si la mano ya tiene un ganador a partir de los resultados de las bazas
 * completadas (1, 2 o 3 bazas), aplicando todas las reglas de parda de `truco-reglas`:
 *
 * - Si un jugador ganó 2 bazas → gana ese jugador.
 * - 1ª parda y 2ª ganada por X → gana X (no se juega la 3ª).
 * - 1ª ganada por X y 2ª parda → gana X (no se juega la 3ª).
 * - 1ª parda, 2ª parda y 3ª ganada por X → gana X.
 * - 1ª parda, 2ª parda y 3ª parda → gana el mano (`manoPlayer`).
 * - 1ª ganada por X, 2ª ganada por Y y 3ª parda → gana X (quien ganó la 1ª).
 * - Si aún no está decidida → devuelve `null`.
 */
export function resolveHandWinnerFromTricks(
  trickWinners: readonly TrickOutcome[],
  manoPlayer: PlayerId,
): PlayerId | null {
  const t1 = trickWinners[0];
  const t2 = trickWinners[1];
  const t3 = trickWinners[2];

  // Con 0 o 1 baza nunca está decidida la mano
  if (t1 === undefined || t2 === undefined) {
    return null;
  }

  const humanWins = trickWinners.filter((w) => w === 'human').length;
  const botWins = trickWinners.filter((w) => w === 'bot').length;

  if (humanWins >= 2) return 'human';
  if (botWins >= 2) return 'bot';

  // Reglas en 2ª baza con una parda:
  // - 1ª parda y 2ª tiene ganador -> gana quien ganó la 2ª
  if (t1 === 'parda' && t2 !== 'parda') {
    return t2;
  }
  // - 1ª tiene ganador y 2ª es parda -> gana quien ganó la 1ª
  if (t1 !== 'parda' && t2 === 'parda') {
    return t1;
  }

  // Si llegamos acá tras la 2ª baza, o bien (t1 === 'parda' && t2 === 'parda')
  // o bien cada jugador ganó una baza (1-1). En ambos casos define la 3ª baza.
  if (t3 === undefined) {
    return null;
  }

  // En 3ª baza:
  if (t3 !== 'parda') {
    return t3;
  }

  // 3ª baza fue parda:
  // - Si las tres fueron parda -> gana el mano
  if (t1 === 'parda') {
    return manoPlayer;
  }

  // - Si 1ª fue de X, 2ª de Y y 3ª parda -> gana X (quien ganó la 1ª)
  return t1;
}
