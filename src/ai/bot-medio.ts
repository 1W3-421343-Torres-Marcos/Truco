import { compareCards, getTrucoRank, type Action, type Card, type Rng } from '../engine/index.ts';
import { BOT_CHARACTERS } from './characters.ts';
import type { Bot, PlayerView } from './types.ts';
import { getMyEnvidoPoints, handStrength } from './view.ts';

function findAction<T extends Action['type']>(
  view: PlayerView,
  type: T,
  predicate?: (action: Extract<Action, { type: T }>) => boolean,
): Extract<Action, { type: T }> | undefined {
  for (const action of view.legalActions) {
    if (action.type === type) {
      const typed = action as Extract<Action, { type: T }>;
      if (!predicate || predicate(typed)) {
        return typed;
      }
    }
  }
  return undefined;
}

/**
 * Elige qué carta jugar según la heurística clásica de nivel Medio:
 * - Si el rival ya tiró carta en esta baza: mata con la menor carta que gana;
 *   si no puede ganar y ganó la 1ª baza, emparda si puede; si no, tira la más baja.
 * - Si abre la 1ª baza (con 3 cartas): juega su carta intermedia.
 * - Si abre la 2ª o 3ª baza: juega su carta más alta para asegurar la baza.
 */
export function chooseMedioCard(view: PlayerView): Card {
  const sortedAsc = [...view.myRemainingCards].sort((a, b) => getTrucoRank(a) - getTrucoRank(b));
  const currentTrick = view.tricks[view.currentTrickIndex];
  const rivalCard = currentTrick.cards[view.rival];

  if (rivalCard !== undefined) {
    const winningCards = sortedAsc.filter((c) => compareCards(c, rivalCard) === 1);
    if (winningCards.length > 0) {
      return winningCards[0]!;
    }

    const tyingCards = sortedAsc.filter((c) => compareCards(c, rivalCard) === 0);
    const wonFirstTrick = view.tricks[0].winner === view.self;
    if (tyingCards.length > 0 && (wonFirstTrick || view.currentTrickIndex === 0)) {
      return tyingCards[0]!;
    }

    return sortedAsc[0]!;
  }

  // Abriendo la baza: en 1ª baza con 3 cartas tira la del medio; luego la más fuerte
  if (sortedAsc.length === 3) {
    return sortedAsc[1]!;
  }
  return sortedAsc[sortedAsc.length - 1]!;
}

/**
 * Evalúa la fuerza para el Truco según `handStrength` y bazas ganadas (skill `truco-ia`).
 */
function evaluateMedioTrucoScore(view: PlayerView): number {
  const myWins = view.tricks.filter((t) => t.winner === view.self).length;
  const rivalWins = view.tricks.filter((t) => t.winner === view.rival).length;

  let score = handStrength(view.myDealtCards);
  if (myWins > rivalWins) score += 0.2;
  if (rivalWins > myWins) score -= 0.18;

  return Math.max(0, Math.min(1, score));
}

/**
 * Bot Medio — "Don Ramón":
 * - Heurísticas clásicas de carta: en 1ª baza juega carta media; si es pie, mata con la menor que gana o tira la más baja.
 * - Envido: canta con >= 27, quiere con >= 25 (más conservador en buenas: >= 26).
 * - Falta envido solo si va perdiendo por mucho (>= 10) o tiene >= 31.
 * - Truco: canta/acepta según `handStrength` y bazas ganadas; miente ~10 % de las veces.
 */
export const botMedio: Bot = {
  id: 'medio',
  character: BOT_CHARACTERS.medio,
  decide(view: PlayerView, rng: Rng): Action {
    if (view.legalActions.length === 0) {
      throw new Error('No hay acciones legales disponibles para decidir');
    }

    const myScore = view.scores[view.self];
    const rivalScore = view.scores[view.rival];
    const inBuenas = view.targetScore === 30 ? myScore >= 15 || rivalScore >= 15 : myScore >= 8;
    const scoreDeficit = rivalScore - myScore;

    // 1. Respuesta a Envido pendiente
    if (view.phase === 'awaitingEnvidoResponse') {
      const myEnvido = getMyEnvidoPoints(view);
      const calls = view.envido.calls.map((c) => c.call);
      const lastCall = calls[calls.length - 1];
      const quiero = findAction(view, 'respondEnvido', (a) => a.response === 'quiero');
      const noQuiero = findAction(view, 'respondEnvido', (a) => a.response === 'noQuiero');

      if (myEnvido >= 31 || (myEnvido >= 30 && scoreDeficit >= 10)) {
        const falta = findAction(view, 'callEnvido', (a) => a.call === 'faltaEnvido');
        if (falta && rng.next() < 0.65) return falta;
      }

      if (lastCall === 'faltaEnvido') {
        const minForFalta = scoreDeficit >= 10 ? 29 : 31;
        return (myEnvido >= minForFalta ? quiero : noQuiero) ?? view.legalActions[0]!;
      }
      if (lastCall === 'realEnvido' || calls.length >= 2) {
        const minForReal = inBuenas ? 28 : 27;
        return (myEnvido >= minForReal ? quiero : noQuiero) ?? view.legalActions[0]!;
      }

      const minForEnvido = inBuenas ? 26 : 25;
      return (myEnvido >= minForEnvido ? quiero : noQuiero) ?? view.legalActions[0]!;
    }

    // 2. Respuesta a Truco pendiente
    if (view.phase === 'awaitingTrucoResponse') {
      const myEnvido = getMyEnvidoPoints(view);
      if (myEnvido >= 27) {
        const envidoFirst = findAction(view, 'callEnvido', (a) => a.call === 'envido');
        if (envidoFirst) return envidoFirst;
      }

      const pendingLevel = view.truco.pendingCall?.level ?? 'truco';
      const capability = evaluateMedioTrucoScore(view);
      const bluff = rng.next() < 0.1;

      const quiero = findAction(view, 'respondTruco', (a) => a.response === 'quiero');
      const noQuiero = findAction(view, 'respondTruco', (a) => a.response === 'noQuiero');
      const raise = findAction(view, 'callTruco');

      if (raise && (capability >= 0.8 || bluff)) {
        return raise;
      }

      const threshold = pendingLevel === 'truco' ? 0.5 : pendingLevel === 'retruco' ? 0.65 : 0.75;
      if (capability >= threshold || (bluff && pendingLevel === 'truco')) {
        return quiero ?? view.legalActions[0]!;
      }
      return noQuiero ?? view.legalActions[0]!;
    }

    // 3. Turno normal de juego: considerar cantar Envido en 1ª baza
    const myEnvido = getMyEnvidoPoints(view);
    if (view.currentTrickIndex === 0 && !view.envidoCalledInHand) {
      if ((myEnvido >= 31 || (myEnvido >= 29 && scoreDeficit >= 10)) && rng.next() < 0.7) {
        const falta = findAction(view, 'callEnvido', (a) => a.call === 'faltaEnvido');
        if (falta) return falta;
      }
      if (myEnvido >= 27) {
        const envido = findAction(view, 'callEnvido', (a) => a.call === 'envido');
        if (envido) return envido;
      }
    }

    // 4. Considerar cantar o subir Truco (según handStrength y bazas ganadas, ~10 % mentira)
    const callTrucoAction = findAction(view, 'callTruco');
    const capability = evaluateMedioTrucoScore(view);
    const bluff = rng.next() < 0.1;

    if (callTrucoAction) {
      const minCap = callTrucoAction.level === 'truco' ? 0.65 : 0.78;
      if (capability >= minCap || bluff) {
        return callTrucoAction;
      }
    }

    // 5. Jugar carta según heurística clásica
    const playActions = view.legalActions.filter(
      (a): a is Extract<Action, { type: 'playCard' }> => a.type === 'playCard',
    );
    if (playActions.length > 0) {
      const targetCard = chooseMedioCard(view);
      const matched = playActions.find(
        (a) => a.card.suit === targetCard.suit && a.card.number === targetCard.number,
      );
      return matched ?? playActions[0]!;
    }

    return view.legalActions[0]!;
  },
};
