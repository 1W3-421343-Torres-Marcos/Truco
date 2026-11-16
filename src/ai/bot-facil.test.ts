import { describe, expect, it } from 'vitest';
import { applyAction, createGame, createRng, isActionLegal, type Hand } from '../engine/index.ts';
import { botFacil } from './bot-facil.ts';
import { createPlayerView } from './view.ts';

describe('botFacil — "El Pibe" (Etapa 5.2)', () => {
  it('nunca canta envido con menos de 28 ni truco sin ancho bravo (no miente)', () => {
    const lowCards: Hand = [
      { suit: 'espada', number: 4 },
      { suit: 'basto', number: 5 },
      { suit: 'oro', number: 6 },
    ];
    const base = createGame({ targetScore: 15, seed: 1, firstMano: 'bot' });
    const state = {
      ...base,
      hand: {
        ...base.hand,
        dealtCards: { ...base.hand.dealtCards, bot: lowCards },
        remainingCards: { ...base.hand.remainingCards, bot: [...lowCards] },
      },
    };
    const view = createPlayerView(state, 'bot');
    const rng = createRng(100);

    for (let i = 0; i < 50; i++) {
      const action = botFacil.decide(view, rng);
      expect(isActionLegal(state, action)).toBe(true);
      expect(action.type).toBe('playCard');
    }
  });

  it('canta envido cuando tiene >= 28 y truco cuando tiene el 1 de espada', () => {
    const highCards: Hand = [
      { suit: 'espada', number: 1 },
      { suit: 'espada', number: 7 },
      { suit: 'oro', number: 4 },
    ]; // envido = 28 y tiene 1♠
    const base = createGame({ targetScore: 15, seed: 2, firstMano: 'bot' });
    const state = {
      ...base,
      hand: {
        ...base.hand,
        dealtCards: { ...base.hand.dealtCards, bot: highCards },
        remainingCards: { ...base.hand.remainingCards, bot: [...highCards] },
      },
    };
    const view = createPlayerView(state, 'bot');
    const rng = createRng(42);

    const actionTypes = new Set<string>();
    for (let i = 0; i < 30; i++) {
      const action = botFacil.decide(view, rng);
      expect(isActionLegal(state, action)).toBe(true);
      actionTypes.add(action.type);
    }
    expect(actionTypes.has('callEnvido')).toBe(true);

    // Si ya se jugó el envido, puede cantar truco por tener el 1 de espada
    const stateAfterEnvido = {
      ...state,
      hand: { ...state.hand, envidoCalledInHand: true },
    };
    const viewAfterEnvido = createPlayerView(stateAfterEnvido, 'bot');
    const trucoTypes = new Set<string>();
    for (let i = 0; i < 30; i++) {
      trucoTypes.add(botFacil.decide(viewAfterEnvido, rng).type);
    }
    expect(trucoTypes.has('callTruco')).toBe(true);
  });

  it('responde legalmente a cantos de envido y truco pendientes', () => {
    const state = createGame({ targetScore: 15, seed: 3, firstMano: 'human' });
    const rng = createRng(99);

    const sEnvido = applyAction(state, { type: 'callEnvido', call: 'envido' });
    const aEnvido = botFacil.decide(createPlayerView(sEnvido, 'bot'), rng);
    expect(isActionLegal(sEnvido, aEnvido)).toBe(true);

    const sFalta = applyAction(state, { type: 'callEnvido', call: 'faltaEnvido' });
    const aFalta = botFacil.decide(createPlayerView(sFalta, 'bot'), rng);
    expect(isActionLegal(sFalta, aFalta)).toBe(true);

    const sTruco = applyAction(state, { type: 'callTruco', level: 'truco' });
    const aTruco = botFacil.decide(createPlayerView(sTruco, 'bot'), rng);
    expect(isActionLegal(sTruco, aTruco)).toBe(true);

    expect(() =>
      botFacil.decide({ ...createPlayerView(state, 'bot'), legalActions: [] }, rng),
    ).toThrow(/No hay acciones legales/);
  });
});
