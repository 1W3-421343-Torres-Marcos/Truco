import { describe, expect, it } from 'vitest';
import { applyAction, cardId, createGame, createRng, type Hand } from '../engine/index.ts';
import { BOT_CHARACTERS, pickBotPhrase } from './characters.ts';
import { DIFFICULTIES } from './types.ts';
import {
  createOpponentProfile,
  createPlayerView,
  getMyEnvidoPoints,
  handStrength,
  updateOpponentProfile,
} from './view.ts';

describe('PlayerView, handStrength y personajes (Etapa 5.1)', () => {
  it('createPlayerView oculta por completo las cartas no jugadas del rival y la semilla', () => {
    const state = createGame({ targetScore: 30, seed: 1234, firstMano: 'human' });
    const botView = createPlayerView(state, 'bot');

    expect(botView.self).toBe('bot');
    expect(botView.rival).toBe('human');
    expect(botView.myDealtCards).toEqual(state.hand.dealtCards.bot);
    expect(botView.rivalRemainingCardCount).toBe(3);

    // Serializamos botView y verificamos que ninguna de las 3 cartas ocultas del humano esté presente
    const serializedView = JSON.stringify(botView);
    for (const hiddenHumanCard of state.hand.dealtCards.human) {
      expect(serializedView).not.toContain(JSON.stringify(hiddenHumanCard));
      expect(botView.myDealtCards.map(cardId)).not.toContain(cardId(hiddenHumanCard));
    }
    expect('rngSeed' in botView).toBe(false);
  });

  it('revela los puntos de envido del rival en PlayerView solo cuando el envido fue querido', () => {
    let state = createGame({ targetScore: 30, seed: 99, firstMano: 'human' });
    state = applyAction(state, { type: 'callEnvido', call: 'envido' });

    const declined = applyAction(state, { type: 'respondEnvido', response: 'noQuiero' });
    const declinedView = createPlayerView(declined, 'bot');
    expect(declinedView.envido.outcome?.rivalRevealedPoints).toBeNull();

    const accepted = applyAction(state, { type: 'respondEnvido', response: 'quiero' });
    const acceptedView = createPlayerView(accepted, 'bot');
    expect(acceptedView.envido.outcome?.rivalRevealedPoints).toBeTypeOf('number');
    expect(getMyEnvidoPoints(acceptedView)).toBe(acceptedView.envido.outcome?.myRevealedPoints);
  });

  it('calcula handStrength normalizado en [0, 1] ordenando manos fuertes sobre débiles', () => {
    const lowestHand: Hand = [
      { suit: 'copa', number: 4 },
      { suit: 'oro', number: 4 },
      { suit: 'basto', number: 4 },
    ];
    const highestHand: Hand = [
      { suit: 'espada', number: 1 },
      { suit: 'basto', number: 1 },
      { suit: 'espada', number: 7 },
    ];
    const mediumHand: Hand = [
      { suit: 'copa', number: 3 },
      { suit: 'oro', number: 12 },
      { suit: 'basto', number: 5 },
    ];

    expect(handStrength([])).toBe(0);
    expect(handStrength([lowestHand[0]])).toBe(0);
    expect(handStrength([highestHand[0]])).toBe(1);
    expect(handStrength([highestHand[0], lowestHand[0]])).toBeCloseTo(0.6, 5);
    expect(handStrength(lowestHand)).toBe(0);
    expect(handStrength(highestHand)).toBeGreaterThan(0.92);
    expect(handStrength(mediumHand)).toBeGreaterThan(handStrength(lowestHand));
    expect(handStrength(highestHand)).toBeGreaterThan(handStrength(mediumHand));
  });

  it('actualiza OpponentProfile al terminar una mano y selecciona frases por personaje', () => {
    let state = createGame({ targetScore: 30, seed: 77, firstMano: 'human' });
    state = applyAction(state, { type: 'callEnvido', call: 'envido' });
    state = applyAction(state, { type: 'respondEnvido', response: 'quiero' });
    state = applyAction(state, { type: 'callTruco', level: 'truco' });
    state = applyAction(state, { type: 'respondTruco', response: 'noQuiero' });

    const profile0 = createOpponentProfile();
    const profile1 = updateOpponentProfile(profile0, state.hand, 'human');
    expect(profile1.handsObserved).toBe(1);
    expect(profile1.envidoCalls).toBe(1);
    expect(profile1.envidoShowdowns).toBe(1);
    expect(profile1.trucoCalls).toBe(1);

    const rng = createRng(12);
    for (const diff of DIFFICULTIES) {
      expect(BOT_CHARACTERS[diff].name.length).toBeGreaterThan(0);
      const phrase = pickBotPhrase(diff, 'truco', rng);
      expect(phrase.length).toBeGreaterThan(0);
    }
  });
});
