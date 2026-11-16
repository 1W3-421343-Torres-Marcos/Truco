import {
  calculateEnvido,
  getActivePlayer,
  getLegalActions,
  getTrucoRank,
  otherPlayer,
  type Card,
  type GameState,
  type HandState,
  type PlayerId,
} from '../engine/index.ts';
import type { OpponentProfile, PlayerView, PublicEnvidoOutcome } from './types.ts';

/**
 * Crea un perfil inicial vacío del comportamiento del rival.
 */
export function createOpponentProfile(): OpponentProfile {
  return {
    handsObserved: 0,
    envidoCalls: 0,
    envidoBluffsObserved: 0,
    envidoShowdowns: 0,
    trucoCalls: 0,
    trucoBluffsObserved: 0,
    trucoShowdowns: 0,
    trucoResponsesTotal: 0,
    trucoFoldsOrDeclines: 0,
  };
}

/**
 * Calcula la fuerza promedio ponderada de una lista de cartas normalizada en [0, 1].
 * Basada en `getTrucoRank` (1..14), dando más peso a las 2 cartas más altas (ya que 2 bazas ganan la mano).
 */
export function handStrength(cards: readonly Card[]): number {
  if (cards.length === 0) return 0;

  const normalizedRanks = cards.map((c) => (getTrucoRank(c) - 1) / 13).sort((a, b) => b - a);

  if (normalizedRanks.length === 1) {
    return normalizedRanks[0]!;
  }
  if (normalizedRanks.length === 2) {
    return normalizedRanks[0]! * 0.6 + normalizedRanks[1]! * 0.4;
  }

  return normalizedRanks[0]! * 0.45 + normalizedRanks[1]! * 0.4 + normalizedRanks[2]! * 0.15;
}

/**
 * Actualiza el perfil del rival usando únicamente información que se hizo pública
 * al finalizar la mano (envido cantado/mostrado y cartas que efectivamente se jugaron en la mesa).
 */
export function updateOpponentProfile(
  profile: OpponentProfile,
  finishedHand: HandState,
  rival: PlayerId,
): OpponentProfile {
  const rivalCalledEnvido = finishedHand.envido.calls.some((c) => c.by === rival);
  let envidoShowdowns = profile.envidoShowdowns;
  let envidoBluffsObserved = profile.envidoBluffsObserved;

  if (rivalCalledEnvido && finishedHand.envido.outcome?.accepted === true) {
    envidoShowdowns++;
    const rivalEnvido =
      finishedHand.manoPlayer === rival
        ? finishedHand.envido.outcome.manoPoints
        : finishedHand.envido.outcome.piePoints;
    if (rivalEnvido !== null && rivalEnvido < 24) {
      envidoBluffsObserved++;
    }
  }

  const rivalPlayedCards: Card[] = [];
  for (const trick of finishedHand.tricks) {
    const c = trick.cards[rival];
    if (c !== undefined) {
      rivalPlayedCards.push(c);
    }
  }

  const rivalCalledTruco =
    finishedHand.truco.acceptedLevel !== null ||
    finishedHand.truco.pendingCall?.by === rival ||
    (finishedHand.outcome?.reason === 'trucoNoQuerido' &&
      finishedHand.outcome.trucoWinner === rival);
  let trucoShowdowns = profile.trucoShowdowns;
  let trucoBluffsObserved = profile.trucoBluffsObserved;

  if (rivalCalledTruco && rivalPlayedCards.length >= 2) {
    trucoShowdowns++;
    if (handStrength(rivalPlayedCards) < 0.35) {
      trucoBluffsObserved++;
    }
  }

  let trucoResponsesTotal = profile.trucoResponsesTotal;
  let trucoFoldsOrDeclines = profile.trucoFoldsOrDeclines;
  if (
    finishedHand.outcome?.reason === 'trucoNoQuerido' &&
    finishedHand.outcome.trucoWinner !== rival
  ) {
    trucoResponsesTotal++;
    trucoFoldsOrDeclines++;
  } else if (finishedHand.truco.acceptedLevel !== null) {
    trucoResponsesTotal++;
  }

  return {
    handsObserved: profile.handsObserved + 1,
    envidoCalls: profile.envidoCalls + (rivalCalledEnvido ? 1 : 0),
    envidoBluffsObserved,
    envidoShowdowns,
    trucoCalls: profile.trucoCalls + (rivalCalledTruco ? 1 : 0),
    trucoBluffsObserved,
    trucoShowdowns,
    trucoResponsesTotal,
    trucoFoldsOrDeclines,
  };
}

/**
 * Construye una `PlayerView` inmutable desde la perspectiva de `perspective` (por defecto el jugador activo),
 * eliminando todas las cartas ocultas del rival y la semilla del mazo.
 */
export function createPlayerView(
  state: GameState,
  perspective?: PlayerId,
  opponentProfile: OpponentProfile = createOpponentProfile(),
): PlayerView {
  const self = perspective ?? getActivePlayer(state.hand) ?? 'bot';
  const rival = otherPlayer(self);
  const { hand } = state;

  let publicEnvidoOutcome: PublicEnvidoOutcome | null = null;
  if (hand.envido.outcome !== null) {
    const raw = hand.envido.outcome;
    if (raw.accepted) {
      const selfIsMano = hand.manoPlayer === self;
      publicEnvidoOutcome = {
        accepted: true,
        winner: raw.winner,
        points: raw.points,
        myRevealedPoints: selfIsMano ? raw.manoPoints : raw.piePoints,
        rivalRevealedPoints: selfIsMano ? raw.piePoints : raw.manoPoints,
      };
    } else {
      publicEnvidoOutcome = {
        accepted: false,
        winner: raw.winner,
        points: raw.points,
        myRevealedPoints: null,
        rivalRevealedPoints: null,
      };
    }
  }

  // Clonamos las bazas únicamente con las cartas ya jugadas en mesa
  const publicTricks = [
    { ...hand.tricks[0], cards: { ...hand.tricks[0].cards } },
    { ...hand.tricks[1], cards: { ...hand.tricks[1].cards } },
    { ...hand.tricks[2], cards: { ...hand.tricks[2].cards } },
  ] as const;

  return {
    self,
    rival,
    targetScore: state.targetScore,
    scores: { ...state.scores },
    handNumber: hand.handNumber,
    manoPlayer: hand.manoPlayer,
    turnPlayer: hand.turnPlayer,
    myDealtCards: [...hand.dealtCards[self]] as const,
    myRemainingCards: [...hand.remainingCards[self]],
    rivalRemainingCardCount: hand.remainingCards[rival].length,
    tricks: publicTricks,
    currentTrickIndex: hand.currentTrickIndex,
    truco: {
      acceptedLevel: hand.truco.acceptedLevel,
      pendingCall: hand.truco.pendingCall ? { ...hand.truco.pendingCall } : null,
      quieroOwner: hand.truco.quieroOwner,
    },
    envido: {
      calls: hand.envido.calls.map((c) => ({ ...c })),
      pendingBy: hand.envido.pendingBy,
      outcome: publicEnvidoOutcome,
    },
    envidoCalledInHand: hand.envido.calls.length > 0 || hand.envidoCalledInHand,
    phase: hand.phase,
    legalActions: getActivePlayer(hand) === self ? getLegalActions(state) : [],
    opponentProfile,
  };
}

/**
 * Helper para obtener los puntos de envido propios desde `PlayerView`.
 */
export function getMyEnvidoPoints(view: PlayerView): number {
  return calculateEnvido(view.myDealtCards);
}
