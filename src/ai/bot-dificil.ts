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

const MONTE_CARLO_SAMPLES = 140;

interface SampledRivalHand {
  readonly dealt: Hand;
  readonly remaining: readonly Card[];
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
 * Evalúa qué tan verosímil (0..1) es una mano candidata del rival según las pistas observadas:
 * - Si el envido fue querido, los puntos mostrados son exactos.
 * - Si el rival cantó envido, sesga hacia manos con envido alto (ajustado por opponentProfile).
 * - Si el rival pudo cantar envido al abrir y no lo hizo, sesga hacia envido < 27.
 * - Si el rival cantó truco, sesga hacia mayor handStrength.
 */
function candidateLikelihood(candidateDealt: Hand, view: PlayerView): number {
  const candEnvido = calculateEnvido(candidateDealt);
  const profile = view.opponentProfile;
  const envidoBluffRate =
    profile.envidoShowdowns >= 3
      ? Math.max(0.05, profile.envidoBluffsObserved / profile.envidoShowdowns)
      : 0.08;

  // 1. Si el envido ya se mostró en mesa, debe coincidir exactamente
  if (view.envido.outcome?.accepted === true && view.envido.outcome.rivalRevealedPoints !== null) {
    return candEnvido === view.envido.outcome.rivalRevealedPoints ? 1 : 0.01;
  }

  let weight = 1;

  // 2. Si el rival cantó o subió envido
  const rivalEnvidoCalls = view.envido.calls.filter((c) => c.by === view.rival);
  if (rivalEnvidoCalls.length > 0) {
    const lastRivalCall = rivalEnvidoCalls[rivalEnvidoCalls.length - 1]!.call;
    const minExpected =
      lastRivalCall === 'faltaEnvido' ? 30 : lastRivalCall === 'realEnvido' ? 28 : 26;
    if (candEnvido >= minExpected) {
      weight *= 1;
    } else {
      weight *= envidoBluffRate;
    }
  } else if (
    !view.envidoCalledInHand &&
    (view.currentTrickIndex > 0 || view.tricks[0].cards[view.rival] !== undefined)
  ) {
    // El rival ya tiró su 1ª carta sin cantar envido -> improbable que tenga >= 27
    if (candEnvido >= 27) {
      weight *= 0.12;
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
        : 0.12;
    const strength = handStrength(candidateDealt);
    weight *= strength >= 0.55 ? 1 : trucoBluffRate + strength * 0.4;
  }

  return weight;
}

/**
 * Muestrea N manos posibles del rival condicionadas a la historia observada de la mano.
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
    let chosenRemaining = drawRandomCards(unseenCards, missingCount, rng);
    let candidateDealt = [...rivalPlayedCards, ...chosenRemaining].slice(0, 3) as unknown as Hand;

    // Rejection sampling ligero (hasta 5 intentos por muestra para mantener < 15 ms)
    for (let attempt = 0; attempt < 5; attempt++) {
      const likelihood = candidateLikelihood(candidateDealt, view);
      if (rng.next() <= likelihood) {
        break;
      }
      chosenRemaining = drawRandomCards(unseenCards, missingCount, rng);
      candidateDealt = [...rivalPlayedCards, ...chosenRemaining].slice(0, 3) as unknown as Hand;
    }

    samples.push({
      dealt: candidateDealt,
      remaining: chosenRemaining,
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
 * Estima por Monte Carlo la probabilidad de ganar el Envido contra las manos muestreadas.
 */
function estimateEnvidoWinProb(view: PlayerView, samples: readonly SampledRivalHand[]): number {
  if (samples.length === 0) return 0.5;
  const myEnvido = getMyEnvidoPoints(view);
  const selfIsMano = view.manoPlayer === view.self;

  let wins = 0;
  for (const sample of samples) {
    const rivalEnvido = calculateEnvido(sample.dealt);
    const manoPts = selfIsMano ? myEnvido : rivalEnvido;
    const piePts = selfIsMano ? rivalEnvido : myEnvido;
    const winnerRole = compareEnvido(manoPts, piePts);
    if ((winnerRole === 'mano' && selfIsMano) || (winnerRole === 'pie' && !selfIsMano)) {
      wins++;
    }
  }
  return wins / samples.length;
}

/**
 * Estima por Monte Carlo la probabilidad de ganar la mano (el Truco) desde el estado actual.
 */
function estimateTrucoWinProb(
  view: PlayerView,
  samples: readonly SampledRivalHand[],
  forcedFirstMyCard?: Card,
): number {
  if (samples.length === 0) return 0.5;
  let wins = 0;
  for (const sample of samples) {
    if (simulateHandRollout(view, view.myRemainingCards, sample.remaining, forcedFirstMyCard)) {
      wins++;
    }
  }
  return wins / samples.length;
}

function decideEnvidoResponse(
  view: PlayerView,
  samples: readonly SampledRivalHand[],
  rng: Rng,
): Action {
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

  // Evaluar si conviene subir la apuesta cuando la probabilidad de ganar es muy alta
  if (winProb >= 0.82) {
    const raiseOrder: readonly EnvidoCall[] = ['faltaEnvido', 'realEnvido', 'envido'];
    for (const targetCall of raiseOrder) {
      const raiseAction = findAction(view, 'callEnvido', (a) => a.call === targetCall);
      if (!raiseAction) continue;
      if (targetCall === 'faltaEnvido' && winProb >= 0.9) {
        return raiseAction;
      }
      if (targetCall !== 'faltaEnvido' && (winProb >= 0.84 || rng.next() < 0.2)) {
        return raiseAction;
      }
    }
  }

  // Farol ocasional subiendo envido cuando el rival tiende a achicarse
  if (winProb >= 0.48 && rng.next() < 0.12) {
    const smallRaise = findAction(
      view,
      'callEnvido',
      (a) => a.call === 'envido' || a.call === 'realEnvido',
    );
    if (smallRaise) return smallRaise;
  }

  // Valor esperado de querer vs no querer (con penalización extra si perder el envido le da el partido al rival)
  const effectiveLoss =
    rivalScore + acceptedLoss >= view.targetScore ? acceptedLoss * 1.6 : acceptedLoss;
  const effectiveGain =
    myScore + acceptedGain >= view.targetScore ? acceptedGain * 1.4 : acceptedGain;

  const evQuiero = winProb * effectiveGain - (1 - winProb) * effectiveLoss;
  const evNoQuiero = -declinedCost;

  if (evQuiero >= evNoQuiero) {
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

  // "El envido está primero": si nos conviene cantar envido antes de responder el truco
  const envidoWinProb = estimateEnvidoWinProb(view, samples);
  const myEnvido = getMyEnvidoPoints(view);
  if (envidoWinProb >= 0.62 || myEnvido >= 27) {
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

  // Si no querer ya entrega la partida, querer siempre que tengamos alguna chance
  if (rivalScore + declinedCost >= view.targetScore) {
    return quiero ?? view.legalActions[0]!;
  }

  const trucoWinProb = estimateTrucoWinProb(view, samples);

  // Subir a retruco / valeCuatro por valor o con farol selectivo (~20 %)
  const canBluffRaise =
    view.tricks[0].winner === view.self && trucoWinProb >= 0.42 && rng.next() < 0.2;
  if (raise && (trucoWinProb >= 0.76 || canBluffRaise)) {
    return raise;
  }

  const effectiveLoss =
    rivalScore + acceptedPoints >= view.targetScore ? acceptedPoints * 1.4 : acceptedPoints;
  const effectiveGain =
    myScore + acceptedPoints >= view.targetScore ? acceptedPoints * 1.3 : acceptedPoints;
  const evQuiero = trucoWinProb * effectiveGain - (1 - trucoWinProb) * effectiveLoss;
  const evNoQuiero = -declinedCost;

  if (evQuiero >= evNoQuiero) {
    return quiero ?? view.legalActions[0]!;
  }
  return noQuiero ?? view.legalActions[0]!;
}

/**
 * Bot Difícil — "El Viejo Vizcacha":
 * - Muestreo Monte Carlo (N=140) condicionado a los cantos y cartas vistas.
 * - Cálculo de Valor Esperado (EV) en envido y truco ajustado por el marcador.
 * - Mentiras estratégicas (~20-25 %) y explotación de tendencias del rival.
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
      return decideEnvidoResponse(view, samples, rng);
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

      // Si somos pie y el rival (mano) ya jugó carta sin cantar envido, explotamos con envido más bajo o robo
      const rivalPassedEnvido = view.tricks[0].cards[view.rival] !== undefined;

      if (envidoWinProb >= 0.88 && (myEnvido >= 31 || scoreDeficit >= 10)) {
        const falta = findAction(view, 'callEnvido', (a) => a.call === 'faltaEnvido');
        if (falta) return falta;
      }
      if (envidoWinProb >= 0.78 && myEnvido >= 29) {
        const real = findAction(view, 'callEnvido', (a) => a.call === 'realEnvido');
        if (real) return real;
      }
      if (
        envidoWinProb >= 0.6 ||
        myEnvido >= 27 ||
        (rivalPassedEnvido && (myEnvido >= 24 || rng.next() < 0.25))
      ) {
        const envido = findAction(view, 'callEnvido', (a) => a.call === 'envido');
        if (envido) return envido;
      }
    }

    // 4. Evaluar cada carta legal mediante rollouts Monte Carlo
    const playActions = view.legalActions.filter(
      (a): a is Extract<Action, { type: 'playCard' }> => a.type === 'playCard',
    );

    let bestCardAction = playActions[0];
    let bestWinProb = -1;

    for (const action of playActions) {
      const winProb = estimateTrucoWinProb(view, samples, action.card);
      // En caso de probabilidad muy similar (< 0.015), preferir conservar la carta más alta
      // (es decir, jugar la de menor rank que logra el mismo resultado)
      const rankTieBreaker = -getTrucoRank(action.card) * 0.001;
      const adjustedScore = winProb + rankTieBreaker;

      if (adjustedScore > bestWinProb) {
        bestWinProb = adjustedScore;
        bestCardAction = action;
      }
    }

    const overallWinProb = Math.max(0, Math.min(1, bestWinProb));

    // 5. Considerar cantar Truco / Retruco / Vale Cuatro (por valor, "a ley de juego" o mentira ~22 %)
    const callTrucoAction = findAction(view, 'callTruco');
    if (callTrucoAction) {
      const declinedGain = getTrucoDeclinedPoints(callTrucoAction.level);
      const freeCallAtMatchPoint = myScore + declinedGain >= view.targetScore;
      const positionalBluff =
        (view.tricks[0].winner === view.self || view.currentTrickIndex === 2) &&
        overallWinProb >= 0.32 &&
        rng.next() < 0.22;

      const valueThreshold = callTrucoAction.level === 'truco' ? 0.64 : 0.74;
      if (freeCallAtMatchPoint || overallWinProb >= valueThreshold || positionalBluff) {
        return callTrucoAction;
      }
    }

    // 6. Irse al mazo si la probabilidad de ganar es 0 en 2ª/3ª baza y no estamos faroleando
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
