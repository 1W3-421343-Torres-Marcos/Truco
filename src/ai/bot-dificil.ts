import {
  calculateEnvido,
  cardId,
  compareCards,
  compareEnvido,
  createDeck,
  getEnvidoAcceptedPoints,
  getEnvidoDeclinedPoints,
  getTrucoAcceptedPoints,
  getTrucoDeclinedPoints,
  getTrucoRank,
  nextTrickLeadPlayer,
  resolveHandWinnerFromTricks,
  resolveTrickWinner,
  type Action,
  type Card,
  type EnvidoCall,
  type Hand,
  type PlayerId,
  type Rng,
  type TrickOutcome,
  type TrickState,
} from '../engine/index.ts';
import { BOT_CHARACTERS } from './characters.ts';
import type { Bot, PlayerView } from './types.ts';
import { getMyEnvidoPoints, handStrength } from './view.ts';

const MONTE_CARLO_SAMPLES = 90;

export interface SampledRivalHand {
  readonly dealt: Hand;
  readonly remaining: readonly Card[];
  readonly weight: number;
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
 * Obtiene las cartas que el rival ya jugó en la mesa y el mazo de cartas no vistas.
 */
function getObservationContext(view: PlayerView): {
  rivalPlayedCards: Card[];
  unseenCards: Card[];
} {
  const rivalPlayedCards: Card[] = [];
  for (const trick of view.tricks) {
    const c = trick.cards[view.rival];
    if (c !== undefined) {
      rivalPlayedCards.push(c);
    }
  }

  const knownIds = new Set<string>([
    ...view.myDealtCards.map(cardId),
    ...rivalPlayedCards.map(cardId),
  ]);

  const unseenCards = createDeck().filter((c) => !knownIds.has(cardId(c)));
  return { rivalPlayedCards, unseenCards };
}

function drawRandomCards(pool: readonly Card[], count: number, rng: Rng): Card[] {
  const copy = [...pool];
  const result: Card[] = [];
  for (let i = 0; i < count && copy.length > 0; i++) {
    const idx = rng.nextInt(copy.length);
    result.push(copy[idx]!);
    copy[idx] = copy[copy.length - 1]!;
    copy.pop();
  }
  return result;
}

/**
 * Peso de verosimilitud Bayesiana para una mano candidata del rival según las pistas observadas:
 * - Si el envido fue querido, los puntos mostrados son exactos.
 * - Si el rival cantó envido, pondera alto las manos con envido >= 27 (ajustado por opponentProfile).
 * - Si el rival pudo cantar envido al abrir y no lo hizo, pondera bajo las manos con envido >= 27.
 * - Si el rival cantó truco, pondera según handStrength y tasa de farol observada.
 */
function candidateLikelihood(candidateDealt: Hand, view: PlayerView): number {
  const candEnvido = calculateEnvido(candidateDealt);
  const profile = view.opponentProfile;
  const envidoBluffRate =
    profile.envidoShowdowns >= 3
      ? Math.max(0.02, profile.envidoBluffsObserved / profile.envidoShowdowns)
      : 0.04;

  // 1. Si el envido ya se mostró en mesa, debe coincidir con el puntaje revelado
  if (view.envido.outcome?.accepted === true && view.envido.outcome.rivalRevealedPoints !== null) {
    return candEnvido === view.envido.outcome.rivalRevealedPoints ? 1 : 0.001;
  }

  let weight = 1;

  // 2. Si el rival cantó o subió envido
  const rivalEnvidoCalls = view.envido.calls.filter((c) => c.by === view.rival);
  if (rivalEnvidoCalls.length > 0) {
    const lastRivalCall = rivalEnvidoCalls[rivalEnvidoCalls.length - 1]!.call;
    const minExpected =
      lastRivalCall === 'faltaEnvido' ? 30 : lastRivalCall === 'realEnvido' ? 29 : 27;
    if (candEnvido >= minExpected) {
      weight *= 1;
    } else if (candEnvido >= minExpected - 1) {
      weight *= 0.15;
    } else {
      weight *= envidoBluffRate;
    }
  } else if (
    !view.envidoCalledInHand &&
    (view.currentTrickIndex > 0 || view.tricks[0].cards[view.rival] !== undefined)
  ) {
    // El rival ya tiró su 1ª carta sin cantar envido -> muy improbable que tenga >= 27
    if (candEnvido >= 27) {
      weight *= 0.04;
    }
  }

  // 3. Si el rival cantó o subió truco
  const rivalCalledTruco =
    view.truco.pendingCall?.by === view.rival ||
    (view.truco.acceptedLevel !== null && view.truco.quieroOwner === view.self);
  if (rivalCalledTruco) {
    const trucoBluffRate =
      profile.trucoShowdowns >= 3
        ? Math.max(0.08, profile.trucoBluffsObserved / profile.trucoShowdowns)
        : 0.1;
    const strength = handStrength(candidateDealt);
    weight *= strength >= 0.58 ? 1 : trucoBluffRate;
  }

  return weight;
}

/**
 * Muestrea N manos posibles del rival con importancia ponderada según la historia observada.
 */
export function sampleRivalHands(
  view: PlayerView,
  rng: Rng,
  sampleCount = MONTE_CARLO_SAMPLES,
): SampledRivalHand[] {
  const { rivalPlayedCards, unseenCards } = getObservationContext(view);
  const missingCount = Math.max(0, 3 - rivalPlayedCards.length);
  const samples: SampledRivalHand[] = [];

  for (let i = 0; i < sampleCount; i++) {
    const chosenRemaining = drawRandomCards(unseenCards, missingCount, rng);
    const candidateDealt = [...rivalPlayedCards, ...chosenRemaining].slice(0, 3) as unknown as Hand;
    const weight = candidateLikelihood(candidateDealt, view);

    samples.push({
      dealt: candidateDealt,
      remaining: chosenRemaining,
      weight,
    });
  }

  return samples;
}

function chooseRolloutCard(
  remaining: readonly Card[],
  leadCardOnTable: Card | undefined,
  wonFirstTrick: boolean,
  trickIndex: number,
): Card {
  const sortedAsc = [...remaining].sort((a, b) => getTrucoRank(a) - getTrucoRank(b));
  if (leadCardOnTable !== undefined) {
    const winners = sortedAsc.filter((c) => compareCards(c, leadCardOnTable) === 1);
    if (winners.length > 0) return winners[0]!;
    const ties = sortedAsc.filter((c) => compareCards(c, leadCardOnTable) === 0);
    if (ties.length > 0 && (wonFirstTrick || trickIndex === 0)) return ties[0]!;
    return sortedAsc[0]!;
  }
  if (sortedAsc.length === 3) return sortedAsc[1]!;
  return sortedAsc[sortedAsc.length - 1]!;
}

/**
 * Simula el resto de las bazas de la mano entre `myRemaining` y `rivalRemaining`
 * (opcionalmente forzando `forcedFirstMyCard` en el turno actual de `view.self`).
 * Devuelve `true` si `view.self` gana la mano.
 */
function simulateHandRollout(
  view: PlayerView,
  myRemainingInput: readonly Card[],
  rivalRemainingInput: readonly Card[],
  forcedFirstMyCard?: Card,
): boolean {
  let myRem = [...myRemainingInput];
  let rivalRem = [...rivalRemainingInput];

  const completedWinners: TrickOutcome[] = [];
  for (let i = 0; i < view.currentTrickIndex; i++) {
    const w = view.tricks[i]?.winner;
    if (w !== null && w !== undefined) {
      completedWinners.push(w);
    }
  }

  let trickIdx: 0 | 1 | 2 = view.currentTrickIndex;
  let currentCards: Partial<Record<PlayerId, Card>> = {
    ...view.tricks[trickIdx].cards,
  };
  let leadPlayer: PlayerId = view.tricks[trickIdx].leadPlayer;
  let usedForced = false;

  while (trickIdx <= 2) {
    const firstActor = leadPlayer;
    const secondActor: PlayerId = firstActor === 'human' ? 'bot' : 'human';

    for (const actor of [firstActor, secondActor]) {
      if (currentCards[actor] !== undefined) continue;

      const otherActor: PlayerId = actor === 'human' ? 'bot' : 'human';
      const leadCard = currentCards[otherActor];

      if (actor === view.self) {
        let chosen: Card;
        if (!usedForced && forcedFirstMyCard !== undefined) {
          chosen = forcedFirstMyCard;
          usedForced = true;
        } else {
          chosen = chooseRolloutCard(myRem, leadCard, completedWinners[0] === view.self, trickIdx);
        }
        currentCards[actor] = chosen;
        myRem = myRem.filter((c) => cardId(c) !== cardId(chosen));
      } else {
        const chosen = chooseRolloutCard(
          rivalRem,
          leadCard,
          completedWinners[0] === view.rival,
          trickIdx,
        );
        currentCards[actor] = chosen;
        rivalRem = rivalRem.filter((c) => cardId(c) !== cardId(chosen));
      }
    }

    const humanCard = currentCards.human!;
    const botCard = currentCards.bot!;
    const trickWinner = resolveTrickWinner(humanCard, botCard);
    completedWinners.push(trickWinner);

    const handWinner = resolveHandWinnerFromTricks(completedWinners, view.manoPlayer);
    if (handWinner !== null) {
      return handWinner === view.self;
    }

    if (trickIdx === 2) break;
    const completedTrick: TrickState = {
      cards: currentCards,
      leadPlayer,
      winner: trickWinner,
    };
    leadPlayer = nextTrickLeadPlayer(completedTrick, view.manoPlayer);
    trickIdx = (trickIdx + 1) as 1 | 2;
    currentCards = {};
  }

  return view.manoPlayer === view.self;
}

/**
 * Estima por Monte Carlo ponderado la probabilidad de ganar el Envido.
 */
function estimateEnvidoWinProb(view: PlayerView, samples: readonly SampledRivalHand[]): number {
  if (samples.length === 0) return 0.5;
  const myEnvido = getMyEnvidoPoints(view);
  const selfIsMano = view.manoPlayer === view.self;

  let weightedWins = 0;
  let totalWeight = 0;
  for (const sample of samples) {
    const rivalEnvido = calculateEnvido(sample.dealt);
    const manoPts = selfIsMano ? myEnvido : rivalEnvido;
    const piePts = selfIsMano ? rivalEnvido : myEnvido;
    const winnerRole = compareEnvido(manoPts, piePts);
    if ((winnerRole === 'mano' && selfIsMano) || (winnerRole === 'pie' && !selfIsMano)) {
      weightedWins += sample.weight;
    }
    totalWeight += sample.weight;
  }
  return totalWeight > 0 ? weightedWins / totalWeight : 0.5;
}

/**
 * Estima por Monte Carlo ponderado la probabilidad de ganar la mano (el Truco).
 */
function estimateTrucoWinProb(
  view: PlayerView,
  samples: readonly SampledRivalHand[],
  forcedFirstMyCard?: Card,
): number {
  if (samples.length === 0) return 0.5;
  let weightedWins = 0;
  let totalWeight = 0;
  for (const sample of samples) {
    if (simulateHandRollout(view, view.myRemainingCards, sample.remaining, forcedFirstMyCard)) {
      weightedWins += sample.weight;
    }
    totalWeight += sample.weight;
  }
  return totalWeight > 0 ? weightedWins / totalWeight : 0.5;
}

function decideEnvidoResponse(view: PlayerView, samples: readonly SampledRivalHand[]): Action {
  const myScore = view.scores[view.self];
  const rivalScore = view.scores[view.rival];
  const calls = view.envido.calls.map((c) => c.call);
  const declinedCost = getEnvidoDeclinedPoints(calls);
  const acceptedGain = getEnvidoAcceptedPoints(calls, view.scores, view.targetScore, view.self);
  const acceptedLoss = getEnvidoAcceptedPoints(calls, view.scores, view.targetScore, view.rival);

  const quiero = findAction(view, 'respondEnvido', (a) => a.response === 'quiero');
  const noQuiero = findAction(view, 'respondEnvido', (a) => a.response === 'noQuiero');

  // Si decir "no quiero" ya le da el partido al rival, siempre conviene querer
  if (rivalScore + declinedCost >= view.targetScore) {
    return quiero ?? view.legalActions[0]!;
  }

  const winProb = estimateEnvidoWinProb(view, samples);
  const myEnvido = getMyEnvidoPoints(view);

  // Subir la apuesta cuando la probabilidad de ganar es muy alta
  if (winProb >= 0.8 && myEnvido >= 29) {
    const raiseOrder: readonly EnvidoCall[] = ['faltaEnvido', 'realEnvido', 'envido'];
    for (const targetCall of raiseOrder) {
      const raiseAction = findAction(view, 'callEnvido', (a) => a.call === targetCall);
      if (!raiseAction) continue;
      if (targetCall === 'faltaEnvido' && (myEnvido >= 32 || (myEnvido >= 30 && winProb >= 0.9))) {
        return raiseAction;
      }
      if (targetCall !== 'faltaEnvido') {
        return raiseAction;
      }
    }
  }

  const effectiveLoss =
    rivalScore + acceptedLoss >= view.targetScore ? acceptedLoss * 1.8 : acceptedLoss;
  const effectiveGain =
    myScore + acceptedGain >= view.targetScore ? acceptedGain * 1.4 : acceptedGain;

  const evQuiero = winProb * effectiveGain - (1 - winProb) * effectiveLoss;
  const evNoQuiero = -declinedCost;

  if (evQuiero >= evNoQuiero && winProb >= 0.36) {
    return quiero ?? view.legalActions[0]!;
  }
  return noQuiero ?? view.legalActions[0]!;
}

function decideTrucoResponse(
  view: PlayerView,
  samples: readonly SampledRivalHand[],
  rng: Rng,
): Action {
  const myScore = view.scores[view.self];
  const rivalScore = view.scores[view.rival];

  // "El envido está primero": si tenemos buen envido o ventaja clara, cantarlo antes
  const envidoWinProb = estimateEnvidoWinProb(view, samples);
  const myEnvido = getMyEnvidoPoints(view);
  if (myEnvido >= 26 || envidoWinProb >= 0.65) {
    const preferredCall: EnvidoCall =
      myEnvido >= 32 ? 'faltaEnvido' : myEnvido >= 29 ? 'realEnvido' : 'envido';
    const envidoFirst =
      findAction(view, 'callEnvido', (a) => a.call === preferredCall) ??
      findAction(view, 'callEnvido', (a) => a.call === 'envido');
    if (envidoFirst) {
      return envidoFirst;
    }
  }

  const pendingLevel = view.truco.pendingCall?.level ?? 'truco';
  const declinedCost = getTrucoDeclinedPoints(pendingLevel);
  const acceptedPoints = getTrucoAcceptedPoints(pendingLevel);

  const quiero = findAction(view, 'respondTruco', (a) => a.response === 'quiero');
  const noQuiero = findAction(view, 'respondTruco', (a) => a.response === 'noQuiero');
  const raise = findAction(view, 'callTruco');

  // Si no querer ya entrega la partida, querer siempre
  if (rivalScore + declinedCost >= view.targetScore) {
    return quiero ?? view.legalActions[0]!;
  }

  const trucoWinProb = estimateTrucoWinProb(view, samples);

  // Subir a retruco / valeCuatro por valor alto o farol en posición ganadora
  const canBluffRaise =
    view.tricks[0].winner === view.self && trucoWinProb >= 0.55 && rng.next() < 0.15;
  if (raise && (trucoWinProb >= 0.78 || canBluffRaise)) {
    return raise;
  }

  const effectiveLoss =
    rivalScore + acceptedPoints >= view.targetScore ? acceptedPoints * 1.5 : acceptedPoints;
  const effectiveGain =
    myScore + acceptedPoints >= view.targetScore ? acceptedPoints * 1.35 : acceptedPoints;
  const evQuiero = trucoWinProb * effectiveGain - (1 - trucoWinProb) * effectiveLoss;
  const evNoQuiero = -declinedCost;

  if (evQuiero >= evNoQuiero && trucoWinProb >= 0.38) {
    return quiero ?? view.legalActions[0]!;
  }
  return noQuiero ?? view.legalActions[0]!;
}

/**
 * Bot Difícil — "El Viejo Vizcacha":
 * - Muestreo Monte Carlo ponderado (N=90) condicionado a los cantos y cartas vistas.
 * - Cálculo de Valor Esperado (EV) en envido y truco ajustado por el marcador.
 * - Robo de envido como pie cuando el mano no cantó y mentiras selectivas (~20 %) en posición.
 * - Selección de carta que maximiza la probabilidad de ganar la mano ahorrando poder.
 */
export const botDificil: Bot = {
  id: 'dificil',
  character: BOT_CHARACTERS.dificil,
  decide(view: PlayerView, rng: Rng): Action {
    if (view.legalActions.length === 0) {
      throw new Error('No hay acciones legales disponibles para decidir');
    }

    const samples = sampleRivalHands(view, rng, MONTE_CARLO_SAMPLES);

    // 1. Respuesta a Envido pendiente
    if (view.phase === 'awaitingEnvidoResponse') {
      return decideEnvidoResponse(view, samples);
    }

    // 2. Respuesta a Truco pendiente
    if (view.phase === 'awaitingTrucoResponse') {
      return decideTrucoResponse(view, samples, rng);
    }

    const myScore = view.scores[view.self];
    const rivalScore = view.scores[view.rival];
    const scoreDeficit = rivalScore - myScore;

    // 3. Considerar iniciar Envido en 1ª baza
    if (view.currentTrickIndex === 0 && !view.envidoCalledInHand) {
      const envidoWinProb = estimateEnvidoWinProb(view, samples);
      const myEnvido = getMyEnvidoPoints(view);
      const rivalPassedEnvido = view.tricks[0].cards[view.rival] !== undefined;

      if (myEnvido >= 32 || (myEnvido >= 30 && scoreDeficit >= 8 && envidoWinProb >= 0.85)) {
        const falta = findAction(view, 'callEnvido', (a) => a.call === 'faltaEnvido');
        if (falta) return falta;
      }
      if (myEnvido >= 29 && envidoWinProb >= 0.78) {
        const real = findAction(view, 'callEnvido', (a) => a.call === 'realEnvido');
        if (real) return real;
      }
      // Como mano canta con >= 26; como pie cuando el mano pasó sin cantar, canta con >= 23 o roba ~35 %
      if (myEnvido >= 26 || (rivalPassedEnvido && (myEnvido >= 23 || rng.next() < 0.35))) {
        const envido = findAction(view, 'callEnvido', (a) => a.call === 'envido');
        if (envido) return envido;
      }
    }

    // 4. Evaluar cada carta legal mediante rollouts Monte Carlo ponderados
    const playActions = view.legalActions.filter(
      (a): a is Extract<Action, { type: 'playCard' }> => a.type === 'playCard',
    );

    let bestCardAction = playActions[0];
    let bestWinProb = -1;

    for (const action of playActions) {
      const winProb = estimateTrucoWinProb(view, samples, action.card);
      // En caso de probabilidad similar, preferir conservar la carta más alta para bazas futuras
      const rankTieBreaker = -getTrucoRank(action.card) * 0.002;
      const adjustedScore = winProb + rankTieBreaker;

      if (adjustedScore > bestWinProb) {
        bestWinProb = adjustedScore;
        bestCardAction = action;
      }
    }

    const overallWinProb = Math.max(0, Math.min(1, bestWinProb));

    // 5. Considerar cantar Truco / Retruco / Vale Cuatro (por valor, "a ley de juego" o mentira en posición)
    const callTrucoAction = findAction(view, 'callTruco');
    if (callTrucoAction) {
      const declinedGain = getTrucoDeclinedPoints(callTrucoAction.level);
      const freeCallAtMatchPoint = myScore + declinedGain >= view.targetScore;
      const positionalBluff =
        view.currentTrickIndex >= 1 &&
        view.tricks[0].winner === view.self &&
        overallWinProb >= 0.4 &&
        rng.next() < 0.22;

      const valueThreshold = callTrucoAction.level === 'truco' ? 0.65 : 0.76;
      if (freeCallAtMatchPoint || overallWinProb >= valueThreshold || positionalBluff) {
        return callTrucoAction;
      }
    }

    // 6. Irse al mazo si la probabilidad de ganar es prácticamente 0 en 2ª/3ª baza
    if (
      view.currentTrickIndex >= 1 &&
      overallWinProb <= 0.02 &&
      view.tricks[view.currentTrickIndex].cards[view.rival] !== undefined
    ) {
      const mazo = findAction(view, 'foldToMazo');
      if (mazo) return mazo;
    }

    return bestCardAction ?? view.legalActions[0]!;
  },
};
