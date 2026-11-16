import { createDeck, dealHands, shuffleDeck } from './cards.ts';
import { createRng } from './rng.ts';
import {
  otherPlayer,
  type GameState,
  type HandState,
  type PlayerId,
  type TargetScore,
  type TrickState,
  type TrucoState,
} from './types.ts';

function createEmptyTrick(leadPlayer: PlayerId): TrickState {
  return {
    cards: {},
    leadPlayer,
    winner: null,
  };
}

export function createInitialTrucoState(): TrucoState {
  return {
    acceptedLevel: null,
    pendingCall: null,
    quieroOwner: null,
  };
}

/**
 * Crea el estado inicial de una mano repartiendo con el RNG determinista.
 */
export function createHandState(
  manoPlayer: PlayerId,
  rngSeed: number,
  handNumber = 1,
): { hand: HandState; nextSeed: number } {
  const rng = createRng(rngSeed);
  const shuffled = shuffleDeck(createDeck(), rng);
  const { mano, pie } = dealHands(shuffled);

  const dealtCards = manoPlayer === 'human' ? { human: mano, bot: pie } : { human: pie, bot: mano };

  const hand: HandState = {
    handNumber,
    manoPlayer,
    turnPlayer: manoPlayer,
    dealtCards,
    remainingCards: {
      human: [...dealtCards.human],
      bot: [...dealtCards.bot],
    },
    tricks: [
      createEmptyTrick(manoPlayer),
      createEmptyTrick(manoPlayer),
      createEmptyTrick(manoPlayer),
    ],
    currentTrickIndex: 0,
    truco: createInitialTrucoState(),
    envidoCalledInHand: false,
    phase: 'playing',
    outcome: null,
  };

  return { hand, nextSeed: rng.getState() };
}

export interface CreateGameConfig {
  readonly targetScore: TargetScore;
  readonly seed: number;
  readonly firstMano?: PlayerId;
}

/**
 * Inicia una partida nueva de Truco.
 */
export function createGame(config: CreateGameConfig): GameState {
  const firstMano = config.firstMano ?? 'human';
  const { hand, nextSeed } = createHandState(firstMano, config.seed, 1);

  return {
    targetScore: config.targetScore,
    scores: { human: 0, bot: 0 },
    rngSeed: nextSeed,
    hand,
    winner: null,
  };
}

/**
 * Inicia la siguiente mano alternando el jugador mano.
 */
export function startNextHand(state: GameState): GameState {
  if (state.winner !== null) {
    throw new Error('No se puede iniciar una nueva mano cuando la partida ya tiene ganador');
  }
  if (state.hand.phase !== 'handEnded') {
    throw new Error('No se puede iniciar una nueva mano antes de que termine la mano actual');
  }

  const nextMano = otherPlayer(state.hand.manoPlayer);
  const { hand, nextSeed } = createHandState(nextMano, state.rngSeed, state.hand.handNumber + 1);

  return {
    ...state,
    rngSeed: nextSeed,
    hand,
  };
}

/**
 * Devuelve qué jugador debe actuar ahora mismo (o `null` si la mano o partida terminó).
 */
export function getActivePlayer(hand: HandState): PlayerId | null {
  if (hand.phase === 'handEnded') {
    return null;
  }
  if (hand.phase === 'awaitingTrucoResponse' && hand.truco.pendingCall !== null) {
    return otherPlayer(hand.truco.pendingCall.by);
  }
  return hand.turnPlayer;
}
