import { getTrucoRank, type Action, type Rng } from '../engine/index.ts';
import { BOT_CHARACTERS } from './characters.ts';
import type { Bot, PlayerView } from './types.ts';
import { getMyEnvidoPoints } from './view.ts';

function hasAnchoBravo(view: PlayerView): boolean {
  return view.myDealtCards.some(
    (c) => c.number === 1 && (c.suit === 'espada' || c.suit === 'basto'),
  );
}

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
 * Bot Fácil — "El Pibe":
 * - Juega una carta legal al azar (con leve preferencia por la más alta si ya perdió una baza).
 * - Canta envido solo con >= 28; truco solo con 1♠ o 1♣ en mano.
 * - Acepta cantos ~50 % al azar (salvo Falta Envido donde pide >= 30). Nunca miente.
 */
export const botFacil: Bot = {
  id: 'facil',
  character: BOT_CHARACTERS.facil,
  decide(view: PlayerView, rng: Rng): Action {
    if (view.legalActions.length === 0) {
      throw new Error('No hay acciones legales disponibles para decidir');
    }

    // 1. Respuesta a un canto de Envido pendiente
    if (view.phase === 'awaitingEnvidoResponse') {
      const myEnvido = getMyEnvidoPoints(view);
      const lastCall = view.envido.calls[view.envido.calls.length - 1]?.call;
      const quiero = findAction(view, 'respondEnvido', (a) => a.response === 'quiero');
      const noQuiero = findAction(view, 'respondEnvido', (a) => a.response === 'noQuiero');

      if (lastCall === 'faltaEnvido') {
        const acceptFalta = myEnvido >= 30 && rng.next() < 0.7;
        return (acceptFalta ? quiero : noQuiero) ?? view.legalActions[0]!;
      }

      // Acepta ~50 % al azar (un poco más si tiene >= 27, nunca miente subiendo)
      const acceptProb = myEnvido >= 27 ? 0.65 : 0.45;
      const accept = rng.next() < acceptProb;
      return (accept ? quiero : noQuiero) ?? view.legalActions[0]!;
    }

    // 2. Respuesta a un canto de Truco pendiente
    if (view.phase === 'awaitingTrucoResponse') {
      // Si tiene >= 28 y puede cantar envido primero, a veces lo canta
      const envidoFirst = findAction(view, 'callEnvido', (a) => a.call === 'envido');
      if (envidoFirst && getMyEnvidoPoints(view) >= 28 && rng.next() < 0.6) {
        return envidoFirst;
      }

      const quiero = findAction(view, 'respondTruco', (a) => a.response === 'quiero');
      const noQuiero = findAction(view, 'respondTruco', (a) => a.response === 'noQuiero');
      const accept = rng.next() < 0.5;
      return (accept ? quiero : noQuiero) ?? view.legalActions[0]!;
    }

    // 3. Turno normal de juego: considerar cantar Envido (solo con >= 28)
    const callEnvidoAction = findAction(view, 'callEnvido', (a) => a.call === 'envido');
    if (callEnvidoAction && getMyEnvidoPoints(view) >= 28 && rng.next() < 0.75) {
      return callEnvidoAction;
    }

    // 4. Considerar cantar Truco (solo con 1♠ o 1♣, nunca miente)
    const callTrucoAction = findAction(view, 'callTruco', (a) => a.level === 'truco');
    if (callTrucoAction && hasAnchoBravo(view) && rng.next() < 0.75) {
      return callTrucoAction;
    }

    // 5. Jugar una carta: al azar, con leve preferencia por la más alta si ya perdió una baza
    const playActions = view.legalActions.filter(
      (a): a is Extract<Action, { type: 'playCard' }> => a.type === 'playCard',
    );
    if (playActions.length > 0) {
      const lostATrick = view.tricks.some((t) => t.winner === view.rival);
      if (lostATrick && rng.next() < 0.6) {
        const sortedByRank = [...playActions].sort(
          (a, b) => getTrucoRank(b.card) - getTrucoRank(a.card),
        );
        return sortedByRank[0]!;
      }

      const randomIndex = rng.nextInt(playActions.length);
      return playActions[randomIndex]!;
    }

    return view.legalActions[0]!;
  },
};
