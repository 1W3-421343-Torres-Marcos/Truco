import { describe, expect, it } from 'vitest';
import { applyAction, createGame, createRng, isActionLegal, type Hand } from '../engine/index.ts';
import { botDificil, sampleRivalHands } from './bot-dificil.ts';
import { createPlayerView } from './view.ts';

describe('botDificil — "El Viejo Vizcacha" (Etapa 5.4)', () => {
  it('muestrea manos del rival sin incluir cartas propias ni cartas ya jugadas', () => {
    let state = createGame({ targetScore: 30, seed: 500, firstMano: 'human' });
    const firstHumanCard = state.hand.dealtCards.human[0];
    state = applyAction(state, { type: 'playCard', card: firstHumanCard });

    const view = createPlayerView(state, 'bot');
    const rng = createRng(123);
    const samples = sampleRivalHands(view, rng, 40);

    expect(samples).toHaveLength(40);
    for (const sample of samples) {
      expect(sample.dealt).toHaveLength(3);
      expect(sample.remaining).toHaveLength(2);
      // Debe incluir la carta que human ya jugó en la mesa
      expect(sample.dealt).toContainEqual(firstHumanCard);
      // Y ninguna carta de las repartidas al bot
      for (const botCard of view.myDealtCards) {
        expect(sample.dealt).not.toContainEqual(botCard);
      }
    }
  });

  it('decide en < 50 ms y aprovecha "a ley de juego" (a 1 punto de ganar canta Truco siempre)', () => {
    const botHand: Hand = [
      { suit: 'copa', number: 4 },
      { suit: 'oro', number: 5 },
      { suit: 'basto', number: 6 },
    ];
    const base = createGame({ targetScore: 15, seed: 70, firstMano: 'bot' });
    const stateAt14 = {
      ...base,
      scores: { human: 10, bot: 14 },
      hand: {
        ...base.hand,
        envidoCalledInHand: true,
        dealtCards: { ...base.hand.dealtCards, bot: botHand },
        remainingCards: { ...base.hand.remainingCards, bot: [...botHand] },
      },
    };

    const view = createPlayerView(stateAt14, 'bot');
    const rng = createRng(77);
    const t0 = performance.now();
    const action = botDificil.decide(view, rng);
    const elapsedMs = performance.now() - t0;

    expect(elapsedMs).toBeLessThan(50);
    expect(isActionLegal(stateAt14, action)).toBe(true);
    expect(action).toEqual({ type: 'callTruco', level: 'truco' });
  });

  it('nunca entrega el partido diciendo noQuiero si el noQuiero ya hace ganar al rival', () => {
    const base = createGame({ targetScore: 15, seed: 80, firstMano: 'human' });
    let state = {
      ...base,
      scores: { human: 14, bot: 8 },
    };
    state = applyAction(state, { type: 'callEnvido', call: 'envido' });

    const rng = createRng(99);
    const action = botDificil.decide(createPlayerView(state, 'bot'), rng);
    expect(action.type).toBe('respondEnvido');
    if (action.type === 'respondEnvido') {
      expect(action.response).toBe('quiero');
    }
  });
});
