import { describe, expect, it } from 'vitest';
import { cardId, type Card, type Hand } from './cards.ts';
import {
  applyAction,
  createGame,
  getActivePlayer,
  getLegalActions,
  isActionLegal,
  startNextHand,
} from './game.ts';
import { otherPlayer, type GameState, type PlayerId } from './types.ts';

function withCustomHands(
  base: GameState,
  humanHand: Hand,
  botHand: Hand,
  manoPlayer: PlayerId = 'human',
): GameState {
  return {
    ...base,
    hand: {
      ...base.hand,
      manoPlayer,
      turnPlayer: manoPlayer,
      dealtCards: { human: humanHand, bot: botHand },
      remainingCards: { human: [...humanHand], bot: [...botHand] },
      tricks: [
        { cards: {}, leadPlayer: manoPlayer, winner: null },
        { cards: {}, leadPlayer: manoPlayer, winner: null },
        { cards: {}, leadPlayer: manoPlayer, winner: null },
      ],
    },
  };
}

describe('estado de partida y mano (Etapa 3.1)', () => {
  it('otherPlayer alterna entre human y bot', () => {
    expect(otherPlayer('human')).toBe('bot');
    expect(otherPlayer('bot')).toBe('human');
  });

  it('crea un estado inicial serializable a JSON y determinista con semilla', () => {
    const g1 = createGame({ targetScore: 30, seed: 2026 });
    const g2 = createGame({ targetScore: 30, seed: 2026 });

    expect(g1).toEqual(g2);
    expect(JSON.parse(JSON.stringify(g1))).toEqual(g1);

    expect(g1.hand.manoPlayer).toBe('human');
    expect(g1.hand.turnPlayer).toBe('human');
    expect(getActivePlayer(g1.hand)).toBe('human');
    expect(g1.hand.remainingCards.human).toHaveLength(3);
    expect(g1.hand.remainingCards.bot).toHaveLength(3);

    const uniqueDealt = new Set([
      ...g1.hand.dealtCards.human.map(cardId),
      ...g1.hand.dealtCards.bot.map(cardId),
    ]);
    expect(uniqueDealt.size).toBe(6);
  });

  it('permite elegir que el bot sea mano en la primera mano', () => {
    const game = createGame({ targetScore: 15, seed: 42, firstMano: 'bot' });
    expect(game.hand.manoPlayer).toBe('bot');
    expect(game.hand.turnPlayer).toBe('bot');
    expect(getActivePlayer(game.hand)).toBe('bot');
  });

  it('alterna manoPlayer al iniciar la siguiente mano con startNextHand', () => {
    const g1 = createGame({ targetScore: 30, seed: 100 });
    expect(() => startNextHand(g1)).toThrow(/antes de que termine/);

    const endedState = applyAction(g1, { type: 'foldToMazo' });
    expect(getActivePlayer(endedState.hand)).toBeNull();
    expect(getLegalActions(endedState)).toEqual([]);

    const g2 = startNextHand(endedState);
    expect(g2.hand.handNumber).toBe(2);
    expect(g2.hand.manoPlayer).toBe('bot');
    expect(g2.hand.turnPlayer).toBe('bot');
    expect(g2.rngSeed).not.toBe(endedState.rngSeed);

    expect(() => startNextHand({ ...endedState, winner: 'human' })).toThrow(/ya tiene ganador/);
    expect(getLegalActions({ ...g1, winner: 'human' })).toEqual([]);
  });
});

describe('getLegalActions y applyAction (Etapa 3.5 y 3.6)', () => {
  const humanCards: Hand = [
    { suit: 'espada', number: 1 },
    { suit: 'basto', number: 1 },
    { suit: 'espada', number: 7 },
  ];
  const botCards: Hand = [
    { suit: 'copa', number: 4 },
    { suit: 'oro', number: 4 },
    { suit: 'basto', number: 4 },
  ];

  it('lista las acciones iniciales legales (3 cartas, 3 envidos, cantar truco e irse al mazo)', () => {
    const g0 = withCustomHands(createGame({ targetScore: 15, seed: 1 }), humanCards, botCards);
    const legal = getLegalActions(g0);

    expect(legal).toEqual([
      { type: 'playCard', card: humanCards[0] },
      { type: 'playCard', card: humanCards[1] },
      { type: 'playCard', card: humanCards[2] },
      { type: 'callEnvido', call: 'envido' },
      { type: 'callEnvido', call: 'realEnvido' },
      { type: 'callEnvido', call: 'faltaEnvido' },
      { type: 'callTruco', level: 'truco' },
      { type: 'foldToMazo' },
    ]);

    const fakeCard: Card = { suit: 'oro', number: 12 };
    expect(isActionLegal(g0, { type: 'playCard', card: fakeCard })).toBe(false);
    expect(() => applyAction(g0, { type: 'playCard', card: fakeCard })).toThrow(/Acción ilegal/);
  });

  it('juega una mano 2-0 preservando las cartas de bazas anteriores y suma puntos', () => {
    let state = withCustomHands(createGame({ targetScore: 15, seed: 1 }), humanCards, botCards);

    state = applyAction(state, { type: 'playCard', card: humanCards[0] });
    expect(state.hand.turnPlayer).toBe('bot');
    expect(state.hand.tricks[0].cards.human).toEqual(humanCards[0]);

    state = applyAction(state, { type: 'playCard', card: botCards[0] });
    expect(state.hand.tricks[0].winner).toBe('human');
    expect(state.hand.currentTrickIndex).toBe(1);
    expect(state.hand.turnPlayer).toBe('human');

    state = applyAction(state, { type: 'playCard', card: humanCards[1] });
    state = applyAction(state, { type: 'playCard', card: botCards[1] });

    expect(state.hand.phase).toBe('handEnded');
    expect(state.hand.outcome).toEqual({
      reason: 'baza',
      trucoWinner: 'human',
      trucoPoints: 1,
      envidoBonusForMazo: 0,
    });
    expect(state.scores.human).toBe(1);
    expect(state.hand.tricks[0].cards).toEqual({ human: humanCards[0], bot: botCards[0] });
    expect(state.hand.tricks[1].cards).toEqual({ human: humanCards[1], bot: botCards[1] });
  });

  it('resuelve en flujo completo los escenarios de parda (1ª parda, 2ª parda, 3ª parda)', () => {
    // 1) 1ª parda, 2ª define para bot (termina en 2 bazas)
    const h1: Hand = [
      { suit: 'espada', number: 3 },
      { suit: 'copa', number: 4 },
      { suit: 'oro', number: 12 },
    ];
    const b1: Hand = [
      { suit: 'oro', number: 3 },
      { suit: 'espada', number: 1 },
      { suit: 'basto', number: 4 },
    ];
    let s1 = withCustomHands(createGame({ targetScore: 15, seed: 1 }), h1, b1, 'human');
    s1 = applyAction(s1, { type: 'playCard', card: h1[0] });
    s1 = applyAction(s1, { type: 'playCard', card: b1[0] });
    expect(s1.hand.tricks[0].winner).toBe('parda');
    expect(s1.hand.turnPlayer).toBe('human'); // parda -> sigue saliendo el mano

    s1 = applyAction(s1, { type: 'playCard', card: h1[1] });
    s1 = applyAction(s1, { type: 'playCard', card: b1[1] });
    expect(s1.hand.phase).toBe('handEnded');
    expect(s1.hand.outcome?.trucoWinner).toBe('bot');

    // 2) 1ª ganada por human, 2ª ganada por bot, 3ª parda -> gana human (ganador de 1ª)
    const h2: Hand = [
      { suit: 'espada', number: 1 },
      { suit: 'copa', number: 4 },
      { suit: 'espada', number: 2 },
    ];
    const b2: Hand = [
      { suit: 'oro', number: 4 },
      { suit: 'basto', number: 1 },
      { suit: 'oro', number: 2 },
    ];
    let s2 = withCustomHands(createGame({ targetScore: 15, seed: 2 }), h2, b2, 'bot');
    // Baza 1: sale bot (4 oro), mata human (1 espada)
    s2 = applyAction(s2, { type: 'playCard', card: b2[0] });
    s2 = applyAction(s2, { type: 'playCard', card: h2[0] });
    expect(s2.hand.turnPlayer).toBe('human');
    // Baza 2: sale human (4 copa), mata bot (1 basto)
    s2 = applyAction(s2, { type: 'playCard', card: h2[1] });
    s2 = applyAction(s2, { type: 'playCard', card: b2[1] });
    expect(s2.hand.turnPlayer).toBe('bot');
    // Baza 3: sale bot (2 oro), empata human (2 espada) -> gana human por haber ganado la 1ª
    s2 = applyAction(s2, { type: 'playCard', card: b2[2] });
    s2 = applyAction(s2, { type: 'playCard', card: h2[2] });
    expect(s2.hand.phase).toBe('handEnded');
    expect(s2.hand.outcome?.trucoWinner).toBe('human');

    // 3) Triple parda -> gana el mano ('bot')
    const h3: Hand = [
      { suit: 'espada', number: 3 },
      { suit: 'espada', number: 2 },
      { suit: 'espada', number: 12 },
    ];
    const b3: Hand = [
      { suit: 'oro', number: 3 },
      { suit: 'oro', number: 2 },
      { suit: 'oro', number: 12 },
    ];
    let s3 = withCustomHands(createGame({ targetScore: 15, seed: 3 }), h3, b3, 'bot');
    for (let i = 0; i < 3; i++) {
      s3 = applyAction(s3, { type: 'playCard', card: b3[i]! });
      s3 = applyAction(s3, { type: 'playCard', card: h3[i]! });
    }
    expect(s3.hand.phase).toBe('handEnded');
    expect(s3.hand.outcome?.trucoWinner).toBe('bot');
  });

  it('ejecuta la escalera Truco -> Retruco -> Vale Cuatro y respeta el dueño del quiero', () => {
    let state = withCustomHands(createGame({ targetScore: 15, seed: 5 }), humanCards, botCards);

    // Human canta truco, bot quiere
    state = applyAction(state, { type: 'callTruco', level: 'truco' });
    expect(getActivePlayer(state.hand)).toBe('bot');
    state = applyAction(state, { type: 'respondTruco', response: 'quiero' });
    expect(getActivePlayer(state.hand)).toBe('human');

    // En turno de human: human NO puede cantar retruco porque el quiero lo tiene bot
    expect(isActionLegal(state, { type: 'callTruco', level: 'retruco' })).toBe(false);

    // Human juega su primera carta; ahora es turno de bot, que sí tiene el quiero
    state = applyAction(state, { type: 'playCard', card: humanCards[0] });
    expect(isActionLegal(state, { type: 'callTruco', level: 'retruco' })).toBe(true);

    // Bot canta retruco, human sube en el acto a valeCuatro, bot quiere
    state = applyAction(state, { type: 'callTruco', level: 'retruco' });
    expect(getActivePlayer(state.hand)).toBe('human');
    state = applyAction(state, { type: 'callTruco', level: 'valeCuatro' });
    expect(getActivePlayer(state.hand)).toBe('bot');
    state = applyAction(state, { type: 'respondTruco', response: 'quiero' });

    // Terminan las bazas y human gana 4 puntos
    state = applyAction(state, { type: 'playCard', card: botCards[0] });
    state = applyAction(state, { type: 'playCard', card: humanCards[1] });
    state = applyAction(state, { type: 'playCard', card: botCards[1] });

    expect(state.hand.outcome?.trucoPoints).toBe(4);
    expect(state.scores.human).toBe(4);
  });

  it('otorga los puntos de noQuiero y declara ganador de la partida al llegar a targetScore', () => {
    let state = withCustomHands(createGame({ targetScore: 15, seed: 8 }), humanCards, botCards);
    state = { ...state, scores: { human: 14, bot: 10 } };

    state = applyAction(state, { type: 'callTruco', level: 'truco' });
    state = applyAction(state, { type: 'callTruco', level: 'retruco' });
    // Human dice noQuiero al retruco -> bot suma 2 puntos (de 10 a 12)
    const declinedByHuman = applyAction(state, { type: 'respondTruco', response: 'noQuiero' });
    expect(declinedByHuman.scores.bot).toBe(12);
    expect(declinedByHuman.winner).toBeNull();

    // Si en cambio human sube a valeCuatro y bot se va al mazo -> human suma 3 (topeado en 15) y gana
    let state2 = applyAction(state, { type: 'callTruco', level: 'valeCuatro' });
    state2 = applyAction(state2, { type: 'foldToMazo' });
    expect(state2.scores.human).toBe(15);
    expect(state2.winner).toBe('human');
  });

  it('resuelve "el envido está primero": ante Truco en 1ª baza permite cantar Envido y luego retoma el Truco', () => {
    // human tiene 28 de envido (1♠ + 7♠ = 28), bot tiene 0 (tres 4 de distinto palo = 4)
    let state = withCustomHands(createGame({ targetScore: 30, seed: 9 }), humanCards, botCards);

    // Human canta Truco en 1ª baza
    state = applyAction(state, { type: 'callTruco', level: 'truco' });
    expect(state.hand.phase).toBe('awaitingTrucoResponse');
    expect(getActivePlayer(state.hand)).toBe('bot');

    // Bot responde con Envido ("el envido está primero")
    expect(isActionLegal(state, { type: 'callEnvido', call: 'envido' })).toBe(true);
    state = applyAction(state, { type: 'callEnvido', call: 'envido' });
    expect(state.hand.phase).toBe('awaitingEnvidoResponse');
    expect(getActivePlayer(state.hand)).toBe('human');

    // Human sube a Real Envido y bot quiere -> gana human (28 vs 4) y suma 5 puntos
    state = applyAction(state, { type: 'callEnvido', call: 'realEnvido' });
    expect(getActivePlayer(state.hand)).toBe('bot');
    state = applyAction(state, { type: 'respondEnvido', response: 'quiero' });

    expect(state.scores.human).toBe(5);
    expect(state.hand.envido.outcome).toEqual({
      accepted: true,
      winner: 'human',
      points: 5,
      manoPoints: 28,
      piePoints: 4,
    });

    // Como había un Truco pendiente, vuelve a awaitingTrucoResponse para que bot responda al Truco
    expect(state.hand.phase).toBe('awaitingTrucoResponse');
    expect(getActivePlayer(state.hand)).toBe('bot');
    expect(isActionLegal(state, { type: 'callEnvido', call: 'envido' })).toBe(false);

    // Bot dice noQuiero al Truco -> human suma 1 punto más (total 6) y termina la mano
    state = applyAction(state, { type: 'respondTruco', response: 'noQuiero' });
    expect(state.scores.human).toBe(6);
    expect(state.hand.phase).toBe('handEnded');
  });

  it('finaliza la partida en el acto si el Envido alcanza el puntaje objetivo (Falta Envido o puntos normales)', () => {
    let state = withCustomHands(createGame({ targetScore: 30, seed: 11 }), humanCards, botCards);
    state = { ...state, scores: { human: 5, bot: 10 } };

    // En malas (< 15), Falta Envido querida gana el partido entero
    state = applyAction(state, { type: 'callEnvido', call: 'faltaEnvido' });
    state = applyAction(state, { type: 'respondEnvido', response: 'quiero' });

    expect(state.scores.human).toBe(30);
    expect(state.winner).toBe('human');
    expect(state.hand.phase).toBe('handEnded');
    expect(state.hand.outcome).toEqual({
      reason: 'envido',
      trucoWinner: null,
      trucoPoints: 0,
      envidoBonusForMazo: 0,
    });

    // También si se va al mazo con un envido pendiente: primero cuenta el envido no querido
    let s2 = withCustomHands(createGame({ targetScore: 15, seed: 12 }), humanCards, botCards);
    s2 = { ...s2, scores: { human: 14, bot: 14 } };
    s2 = applyAction(s2, { type: 'callEnvido', call: 'envido' });
    // Bot se va al mazo con el envido pendiente -> human llega a 15 por el envido y gana antes del truco
    const s2End = applyAction(s2, { type: 'foldToMazo' });
    expect(s2End.scores.human).toBe(15);
    expect(s2End.winner).toBe('human');
    expect(s2End.hand.outcome?.reason).toBe('envido');

    // Y si al irse al mazo con envido pendiente aún no alcanza el objetivo por el envido, suma envido + mazo
    let s3 = withCustomHands(createGame({ targetScore: 15, seed: 13 }), humanCards, botCards);
    s3 = applyAction(s3, { type: 'callEnvido', call: 'envido' });
    s3 = applyAction(s3, { type: 'foldToMazo' });
    // 1 de envido no querido + 1 de truco al mazo = 2
    expect(s3.scores.human).toBe(2);
    expect(s3.hand.outcome?.reason).toBe('mazo');
  });
});
