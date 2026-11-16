import { SUITS, type Card, type Suit } from './cards.ts';
import {
  otherPlayer,
  type EnvidoCall,
  type EnvidoState,
  type HandState,
  type PlayerId,
  type TargetScore,
} from './types.ts';

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

/**
 * Crea el estado inicial del Envido para una mano nueva.
 */
export function createInitialEnvidoState(): EnvidoState {
  return {
    calls: [],
    pendingBy: null,
    outcome: null,
  };
}

/**
 * Devuelve los cantos de Envido permitidos para iniciar o subir una secuencia:
 * - Secuencia vacía: ['envido', 'realEnvido', 'faltaEnvido']
 * - ['envido']: ['envido', 'realEnvido', 'faltaEnvido']
 * - ['envido', 'envido']: ['realEnvido', 'faltaEnvido']
 * - Terminada en 'realEnvido': ['faltaEnvido']
 * - Terminada en 'faltaEnvido': []
 */
export function getAllowedNextEnvidoCalls(calls: readonly EnvidoCall[]): EnvidoCall[] {
  if (calls.length === 0) {
    return ['envido', 'realEnvido', 'faltaEnvido'];
  }
  const last = calls[calls.length - 1];
  if (last === 'faltaEnvido') {
    return [];
  }
  if (last === 'realEnvido') {
    return ['faltaEnvido'];
  }
  // last === 'envido'
  if (calls.length === 1) {
    return ['envido', 'realEnvido', 'faltaEnvido'];
  }
  return ['realEnvido', 'faltaEnvido'];
}

/**
 * Determina qué cantos de Envido puede hacer `player` en el estado actual de la mano:
 * - Si hay un canto de Envido pendiente del rival (`phase === 'awaitingEnvidoResponse'`),
 *   puede subir con cualquiera de `getAllowedNextEnvidoCalls`.
 * - Si aún no se cantó Envido en la mano (`!envidoCalledInHand`), estamos en la 1ª baza
 *   (`currentTrickIndex === 0`) y `player` no tiró su primera carta:
 *   - Puede iniciar Envido en su turno (`phase === 'playing' && turnPlayer === player`).
 *   - O puede cantar Envido ante un canto inicial de `truco` en 1ª baza
 *     (`phase === 'awaitingTrucoResponse' && truco.pendingCall?.level === 'truco'`),
 *     aplicando la regla "el envido está primero".
 */
export function canPlayerCallEnvidoInHand(hand: HandState, player: PlayerId): EnvidoCall[] {
  if (hand.phase === 'awaitingEnvidoResponse') {
    if (hand.envido.pendingBy === null || hand.envido.pendingBy === player) {
      return [];
    }
    return getAllowedNextEnvidoCalls(hand.envido.calls.map((c) => c.call));
  }

  const canInitiate =
    hand.currentTrickIndex === 0 &&
    !hand.envidoCalledInHand &&
    hand.tricks[0].cards[player] === undefined;

  if (!canInitiate) {
    return [];
  }

  if (hand.phase === 'playing' && hand.turnPlayer === player) {
    return getAllowedNextEnvidoCalls([]);
  }

  if (
    hand.phase === 'awaitingTrucoResponse' &&
    hand.truco.pendingCall !== null &&
    hand.truco.pendingCall.level === 'truco' &&
    otherPlayer(hand.truco.pendingCall.by) === player
  ) {
    return getAllowedNextEnvidoCalls([]);
  }

  return [];
}

/**
 * Registra un nuevo canto de Envido dentro de `EnvidoState`.
 */
export function applyEnvidoCall(
  envido: EnvidoState,
  player: PlayerId,
  call: EnvidoCall,
): EnvidoState {
  if (envido.outcome !== null) {
    throw new Error('El envido ya fue resuelto en esta mano');
  }
  if (envido.pendingBy === player) {
    throw new Error(`El jugador ${player} no puede subir su propio canto de envido`);
  }

  const allowed = getAllowedNextEnvidoCalls(envido.calls.map((c) => c.call));
  if (!allowed.includes(call)) {
    throw new Error(
      `No se puede cantar ${call} después de [${envido.calls.map((c) => c.call).join(', ')}]`,
    );
  }

  return {
    calls: [...envido.calls, { call, by: player }],
    pendingBy: player,
    outcome: null,
  };
}

function getNonFaltaCallPoints(call: EnvidoCall): number {
  if (call === 'envido') return 2;
  if (call === 'realEnvido') return 3;
  throw new Error('faltaEnvido no tiene puntaje fijo sin contexto de marcador');
}

/**
 * Calcula los puntos de "no querido" para cualquier secuencia válida de Envido.
 * Regla general: suma lo querido de la secuencia sin el último canto (o 1 si era el 1º).
 */
export function getEnvidoDeclinedPoints(calls: readonly EnvidoCall[]): number {
  if (calls.length === 0) {
    throw new Error('La secuencia de envido no puede estar vacía');
  }
  if (calls.length === 1) {
    return 1;
  }
  let sum = 0;
  for (let i = 0; i < calls.length - 1; i++) {
    sum += getNonFaltaCallPoints(calls[i]!);
  }
  return sum;
}

/**
 * Calcula los puntos base de "querido" de una secuencia de Envido:
 * - Si contiene `faltaEnvido`, devuelve `'falta'` (depende del marcador).
 * - Si no, devuelve la suma (2 por cada `envido`, 3 por `realEnvido`).
 */
export function getEnvidoAcceptedBasePoints(calls: readonly EnvidoCall[]): number | 'falta' {
  if (calls.length === 0) {
    throw new Error('La secuencia de envido no puede estar vacía');
  }
  if (calls.includes('faltaEnvido')) {
    return 'falta';
  }
  let sum = 0;
  for (const call of calls) {
    sum += getNonFaltaCallPoints(call);
  }
  return sum;
}

/**
 * Calcula cuántos puntos vale la Falta Envido:
 * - Partida a 30 con el puntero en malas (< 15): quien gana el envido gana el partido
 *   (suma lo que le falta al ganador para llegar a 30, o 30 si no se especifica ganador).
 * - Partida a 30 con el puntero en buenas (>= 15): vale `30 - puntaje del que va ganando`.
 * - Partida a 15: vale `15 - puntaje del que va ganando`.
 */
export function calculateFaltaEnvidoPoints(
  scores: Readonly<Record<PlayerId, number>>,
  targetScore: TargetScore,
  envidoWinner?: PlayerId,
): number {
  const leaderScore = Math.max(scores.human, scores.bot);

  if (targetScore === 15) {
    return 15 - leaderScore;
  }

  // Partida a 30: buenas (>= 15)
  if (leaderScore >= 15) {
    return 30 - leaderScore;
  }

  // Partida a 30: malas (< 15) -> gana el partido entero
  if (envidoWinner !== undefined) {
    return 30 - scores[envidoWinner];
  }
  return 30;
}

/**
 * Calcula los puntos de "querido" de una secuencia de Envido resolviendo Falta Envido si aplica.
 */
export function getEnvidoAcceptedPoints(
  calls: readonly EnvidoCall[],
  scores: Readonly<Record<PlayerId, number>>,
  targetScore: TargetScore,
  envidoWinner?: PlayerId,
): number {
  const base = getEnvidoAcceptedBasePoints(calls);
  if (base === 'falta') {
    return calculateFaltaEnvidoPoints(scores, targetScore, envidoWinner);
  }
  return base;
}
