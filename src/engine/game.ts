import { cardId, createDeck, dealHands, shuffleDeck, type Card } from './cards.ts';
import {
  applyEnvidoCall,
  calculateEnvido,
  canPlayerCallEnvidoInHand,
  compareEnvido,
  createInitialEnvidoState,
  getEnvidoAcceptedPoints,
  getEnvidoDeclinedPoints,
} from './envido.ts';
import { createRng } from './rng.ts';
import { nextTrickLeadPlayer, resolveHandWinnerFromTricks, resolveTrickWinner } from './tricks.ts';
import {
  applyTrucoCall,
  applyTrucoQuiero,
  calculateMazoPoints,
  canPlayerCallTruco,
  getTrucoAcceptedPoints,
  getTrucoDeclinedPoints,
} from './truco.ts';
import {
  otherPlayer,
  type Action,
  type EnvidoOutcome,
  type EnvidoState,
  type GameState,
  type HandOutcome,
  type HandState,
  type PlayerId,
  type TargetScore,
  type TrickOutcome,
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
    envido: createInitialEnvidoState(),
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
  if (hand.phase === 'awaitingEnvidoResponse' && hand.envido.pendingBy !== null) {
    return otherPlayer(hand.envido.pendingBy);
  }
  if (hand.phase === 'awaitingTrucoResponse' && hand.truco.pendingCall !== null) {
    return otherPlayer(hand.truco.pendingCall.by);
  }
  return hand.turnPlayer;
}

/**
 * Devuelve todas las acciones legales para el jugador activo en el estado dado.
 */
export function getLegalActions(state: GameState): Action[] {
  if (state.winner !== null) {
    return [];
  }

  const { hand } = state;
  const activePlayer = getActivePlayer(hand);
  if (activePlayer === null) {
    return [];
  }

  const actions: Action[] = [];

  if (hand.phase === 'awaitingEnvidoResponse') {
    actions.push({ type: 'respondEnvido', response: 'quiero' });
    actions.push({ type: 'respondEnvido', response: 'noQuiero' });

    for (const call of canPlayerCallEnvidoInHand(hand, activePlayer)) {
      actions.push({ type: 'callEnvido', call });
    }

    actions.push({ type: 'foldToMazo' });
    return actions;
  }

  if (hand.phase === 'awaitingTrucoResponse') {
    for (const call of canPlayerCallEnvidoInHand(hand, activePlayer)) {
      actions.push({ type: 'callEnvido', call });
    }

    actions.push({ type: 'respondTruco', response: 'quiero' });
    actions.push({ type: 'respondTruco', response: 'noQuiero' });

    const nextLevel = canPlayerCallTruco(hand.truco, activePlayer);
    if (nextLevel !== null) {
      actions.push({ type: 'callTruco', level: nextLevel });
    }

    actions.push({ type: 'foldToMazo' });
    return actions;
  }

  // phase === 'playing'
  for (const card of hand.remainingCards[activePlayer]) {
    actions.push({ type: 'playCard', card });
  }

  for (const call of canPlayerCallEnvidoInHand(hand, activePlayer)) {
    actions.push({ type: 'callEnvido', call });
  }

  const nextTrucoLevel = canPlayerCallTruco(hand.truco, activePlayer);
  if (nextTrucoLevel !== null) {
    actions.push({ type: 'callTruco', level: nextTrucoLevel });
  }

  actions.push({ type: 'foldToMazo' });
  return actions;
}

function actionsEqual(a: Action, b: Action): boolean {
  if (a.type !== b.type) return false;
  if (a.type === 'playCard' && b.type === 'playCard') {
    return cardId(a.card) === cardId(b.card);
  }
  if (a.type === 'callEnvido' && b.type === 'callEnvido') {
    return a.call === b.call;
  }
  if (a.type === 'respondEnvido' && b.type === 'respondEnvido') {
    return a.response === b.response;
  }
  if (a.type === 'callTruco' && b.type === 'callTruco') {
    return a.level === b.level;
  }
  if (a.type === 'respondTruco' && b.type === 'respondTruco') {
    return a.response === b.response;
  }
  return true;
}

/**
 * Verifica si una acción es legal en el estado actual.
 */
export function isActionLegal(state: GameState, action: Action): boolean {
  return getLegalActions(state).some((legal) => actionsEqual(legal, action));
}

function awardHandAndFinish(
  state: GameState,
  hand: HandState,
  outcome: HandOutcome & { readonly trucoWinner: PlayerId },
): GameState {
  const totalPoints = outcome.trucoPoints + outcome.envidoBonusForMazo;
  const winnerPlayer = outcome.trucoWinner;
  const newWinnerScore = Math.min(state.targetScore, state.scores[winnerPlayer] + totalPoints);
  const newScores = {
    ...state.scores,
    [winnerPlayer]: newWinnerScore,
  };
  const gameWinner = newWinnerScore >= state.targetScore ? winnerPlayer : null;

  return {
    ...state,
    scores: newScores,
    winner: gameWinner,
    hand: {
      ...hand,
      phase: 'handEnded',
      outcome,
    },
  };
}

function updateTrickAtIndex(
  tricks: readonly [TrickState, TrickState, TrickState],
  index: 0 | 1 | 2,
  updated: TrickState,
): readonly [TrickState, TrickState, TrickState] {
  if (index === 0) return [updated, tricks[1], tricks[2]];
  if (index === 1) return [tricks[0], updated, tricks[2]];
  return [tricks[0], tricks[1], updated];
}

function applyPlayCard(state: GameState, activePlayer: PlayerId, card: Card): GameState {
  const { hand } = state;
  const remainingForPlayer = hand.remainingCards[activePlayer].filter(
    (c) => cardId(c) !== cardId(card),
  );
  const newRemainingCards = {
    ...hand.remainingCards,
    [activePlayer]: remainingForPlayer,
  };

  const currentTrick = hand.tricks[hand.currentTrickIndex];
  const updatedCards: Partial<Record<PlayerId, Card>> = {
    ...currentTrick.cards,
    [activePlayer]: card,
  };

  const humanCard = updatedCards.human;
  const botCard = updatedCards.bot;

  // Primera carta de la baza: pasa el turno al rival
  if (humanCard === undefined || botCard === undefined) {
    const partialTrick: TrickState = {
      ...currentTrick,
      cards: updatedCards,
    };
    const tricks = updateTrickAtIndex(hand.tricks, hand.currentTrickIndex, partialTrick);

    return {
      ...state,
      hand: {
        ...hand,
        remainingCards: newRemainingCards,
        tricks,
        turnPlayer: otherPlayer(activePlayer),
      },
    };
  }

  // Segunda carta de la baza: se resuelve la baza
  const trickWinner = resolveTrickWinner(humanCard, botCard);
  const completedTrick: TrickState = {
    ...currentTrick,
    cards: updatedCards,
    winner: trickWinner,
  };
  let tricks = updateTrickAtIndex(hand.tricks, hand.currentTrickIndex, completedTrick);

  const completedWinners: TrickOutcome[] = [];
  for (let i = 0; i <= hand.currentTrickIndex; i++) {
    const w = tricks[i]?.winner;
    if (w !== null && w !== undefined) {
      completedWinners.push(w);
    }
  }

  const handWinner = resolveHandWinnerFromTricks(completedWinners, hand.manoPlayer);
  if (handWinner !== null) {
    const trucoPoints = getTrucoAcceptedPoints(hand.truco.acceptedLevel);
    return awardHandAndFinish(
      state,
      {
        ...hand,
        remainingCards: newRemainingCards,
        tricks,
      },
      {
        reason: 'baza',
        trucoWinner: handWinner,
        trucoPoints,
        envidoBonusForMazo: 0,
      },
    );
  }

  const nextTrickIndex = (hand.currentTrickIndex + 1) as 1 | 2;
  const nextLead = nextTrickLeadPlayer(completedTrick, hand.manoPlayer);
  tricks = updateTrickAtIndex(tricks, nextTrickIndex, {
    ...tricks[nextTrickIndex],
    leadPlayer: nextLead,
  });

  return {
    ...state,
    hand: {
      ...hand,
      remainingCards: newRemainingCards,
      tricks,
      currentTrickIndex: nextTrickIndex,
      turnPlayer: nextLead,
    },
  };
}

/**
 * Aplica una acción legal sobre `state` y devuelve un nuevo `GameState` inmutable.
 */
export function applyAction(state: GameState, action: Action): GameState {
  if (!isActionLegal(state, action)) {
    throw new Error(`Acción ilegal en el estado actual: ${JSON.stringify(action)}`);
  }

  const { hand } = state;
  const activePlayer = getActivePlayer(hand)!;

  if (action.type === 'callEnvido') {
    const newEnvido = applyEnvidoCall(hand.envido, activePlayer, action.call);
    return {
      ...state,
      hand: {
        ...hand,
        envido: newEnvido,
        envidoCalledInHand: true,
        phase: 'awaitingEnvidoResponse',
      },
    };
  }

  if (action.type === 'respondEnvido') {
    const calls = hand.envido.calls.map((c) => c.call);
    let envidoOutcome: EnvidoOutcome;

    if (action.response === 'noQuiero') {
      const winner = hand.envido.pendingBy!;
      const points = getEnvidoDeclinedPoints(calls);
      envidoOutcome = {
        accepted: false,
        winner,
        points,
        manoPoints: null,
        piePoints: null,
      };
    } else {
      const manoPlayer = hand.manoPlayer;
      const piePlayer = otherPlayer(manoPlayer);
      const manoPoints = calculateEnvido(hand.dealtCards[manoPlayer]);
      const piePoints = calculateEnvido(hand.dealtCards[piePlayer]);
      const winnerRole = compareEnvido(manoPoints, piePoints);
      const winner = winnerRole === 'mano' ? manoPlayer : piePlayer;
      const points = getEnvidoAcceptedPoints(calls, state.scores, state.targetScore, winner);
      envidoOutcome = {
        accepted: true,
        winner,
        points,
        manoPoints,
        piePoints,
      };
    }

    const newWinnerScore = Math.min(
      state.targetScore,
      state.scores[envidoOutcome.winner] + envidoOutcome.points,
    );
    const newScores = {
      ...state.scores,
      [envidoOutcome.winner]: newWinnerScore,
    };
    const resolvedEnvido: EnvidoState = {
      ...hand.envido,
      pendingBy: null,
      outcome: envidoOutcome,
    };

    if (newWinnerScore >= state.targetScore) {
      return {
        ...state,
        scores: newScores,
        winner: envidoOutcome.winner,
        hand: {
          ...hand,
          envido: resolvedEnvido,
          truco: {
            ...hand.truco,
            pendingCall: null,
          },
          phase: 'handEnded',
          outcome: {
            reason: 'envido',
            trucoWinner: null,
            trucoPoints: 0,
            envidoBonusForMazo: 0,
          },
        },
      };
    }

    const nextPhase = hand.truco.pendingCall !== null ? 'awaitingTrucoResponse' : 'playing';
    return {
      ...state,
      scores: newScores,
      hand: {
        ...hand,
        envido: resolvedEnvido,
        phase: nextPhase,
      },
    };
  }

  if (action.type === 'callTruco') {
    const newTruco = applyTrucoCall(hand.truco, activePlayer, action.level);
    return {
      ...state,
      hand: {
        ...hand,
        truco: newTruco,
        phase: 'awaitingTrucoResponse',
      },
    };
  }

  if (action.type === 'respondTruco') {
    if (action.response === 'quiero') {
      const newTruco = applyTrucoQuiero(hand.truco, activePlayer);
      return {
        ...state,
        hand: {
          ...hand,
          truco: newTruco,
          phase: 'playing',
        },
      };
    }

    const pending = hand.truco.pendingCall!;
    const points = getTrucoDeclinedPoints(pending.level);
    return awardHandAndFinish(
      state,
      {
        ...hand,
        truco: {
          ...hand.truco,
          pendingCall: null,
        },
      },
      {
        reason: 'trucoNoQuerido',
        trucoWinner: pending.by,
        trucoPoints: points,
        envidoBonusForMazo: 0,
      },
    );
  }

  if (action.type === 'foldToMazo') {
    const rival = otherPlayer(activePlayer);
    let workingState = state;
    let workingHand = hand;

    // Si había un canto de envido pendiente, primero se resuelve como no querido ("primero envido, después truco")
    if (hand.phase === 'awaitingEnvidoResponse' && hand.envido.pendingBy !== null) {
      const calls = hand.envido.calls.map((c) => c.call);
      const envidoPoints = getEnvidoDeclinedPoints(calls);
      const envidoOutcome: EnvidoOutcome = {
        accepted: false,
        winner: rival,
        points: envidoPoints,
        manoPoints: null,
        piePoints: null,
      };
      const newRivalScore = Math.min(state.targetScore, state.scores[rival] + envidoPoints);
      const newScores = { ...state.scores, [rival]: newRivalScore };
      const resolvedEnvido: EnvidoState = {
        ...hand.envido,
        pendingBy: null,
        outcome: envidoOutcome,
      };

      if (newRivalScore >= state.targetScore) {
        return {
          ...state,
          scores: newScores,
          winner: rival,
          hand: {
            ...hand,
            envido: resolvedEnvido,
            truco: { ...hand.truco, pendingCall: null },
            phase: 'handEnded',
            outcome: {
              reason: 'envido',
              trucoWinner: null,
              trucoPoints: 0,
              envidoBonusForMazo: 0,
            },
          },
        };
      }

      workingState = { ...state, scores: newScores };
      workingHand = { ...hand, envido: resolvedEnvido };
    }

    const mazo = calculateMazoPoints(workingHand, activePlayer);
    return awardHandAndFinish(
      workingState,
      {
        ...workingHand,
        truco: {
          ...workingHand.truco,
          pendingCall: null,
        },
      },
      {
        reason: 'mazo',
        trucoWinner: rival,
        trucoPoints: mazo.trucoPoints,
        envidoBonusForMazo: mazo.envidoBonusForMazo,
      },
    );
  }

  return applyPlayCard(state, activePlayer, action.card);
}
