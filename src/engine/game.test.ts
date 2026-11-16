import { describe, expect, it } from 'vitest';
import { cardId } from './cards.ts';
import { createGame, getActivePlayer, startNextHand } from './game.ts';
import { otherPlayer } from './types.ts';

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

    const endedState = {
      ...g1,
      hand: {
        ...g1.hand,
        phase: 'handEnded' as const,
        outcome: {
          reason: 'mazo' as const,
          trucoWinner: 'human' as const,
          trucoPoints: 2,
          envidoBonusForMazo: 1,
        },
      },
    };

    expect(getActivePlayer(endedState.hand)).toBeNull();

    const g2 = startNextHand(endedState);
    expect(g2.hand.handNumber).toBe(2);
    expect(g2.hand.manoPlayer).toBe('bot');
    expect(g2.hand.turnPlayer).toBe('bot');
    expect(g2.rngSeed).not.toBe(endedState.rngSeed);

    expect(() => startNextHand({ ...endedState, winner: 'human' })).toThrow(/ya tiene ganador/);
  });
});
