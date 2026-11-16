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

describe('getLegalActions y applyAction (Etapa 3.5)', () => {
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

  it('lista las acciones iniciales legales (3 cartas, cantar truco e irse al mazo)', () => {
    const g0 = withCustomHands(createGame({ targetScore: 15, seed: 1 }), humanCards, botCards);
    const legal = getLegalActions(g0);

    expect(legal).toEqual([
      { type: 'playCard', card: humanCards[0] },
      { type: 'playCard', card: humanCards[1] },
      { type: 'playCard', card: humanCards[2] },
      { type: 'callTruco', level: 'truco' },
      { type: 'foldToMazo' },
    ]);

    const fakeCard: Card = { suit: 'oro', number: 12 };
    expect(isActionLegal(g0, { type: 'playCard', card: fakeCard })).toBe(false);
    expect(() => applyAction(g0, { type: 'playCard', card: fakeCard })).toThrow(/Acción ilegal/);
  });

  it('juega una mano 2-0 preservando las cartas de bazas anteriores y suma puntos', () => {
    let state = withCustomHands(createGame({ targetScore: 15, seed: 1 }), humanCards, botCards);

    // Baza 1: human juega 1 espada, bot juega 4 copa -> gana human
    state = applyAction(state, { type: 'playCard', card: humanCards[0] });
    expect(state.hand.turnPlayer).toBe('bot');
    expect(state.hand.tricks[0].cards.human).toEqual(humanCards[0]);

    state = applyAction(state, { type: 'playCard', card: botCards[0] });
    expect(state.hand.tricks[0].winner).toBe('human');
    expect(state.hand.currentTrickIndex).toBe(1);
    expect(state.hand.turnPlayer).toBe('human');

    // Baza 2: human juega 1 basto, bot juega 4 oro -> gana human 2-0 y termina la mano
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
    // Ambas bazas siguen visibles en state.hand.tricks
    expect(state.hand.tricks[0].cards).toEqual({ human: humanCards[0], bot: botCards[0] });
    expect(state.hand.tricks[1].cards).toEqual({ human: humanCards[1], bot: botCards[1] });
  });
});
