import { describe, expect, it } from 'vitest';
import { applyAction, createGame, createRng, isActionLegal, type Hand } from '../engine/index.ts';
import { botMedio, chooseMedioCard } from './bot-medio.ts';
import { createPlayerView } from './view.ts';

describe('botMedio — "Don Ramón" (Etapa 5.3)', () => {
  it('en 1ª baza como mano juega la carta intermedia y como pie mata con la menor que gana o achica', () => {
    const botHand: Hand = [
      { suit: 'espada', number: 1 }, // rank 14
      { suit: 'copa', number: 3 }, // rank 10 (media)
      { suit: 'oro', number: 4 }, // rank 1 (baja)
    ];
    const humanHand: Hand = [
      { suit: 'basto', number: 12 }, // rank 7
      { suit: 'espada', number: 7 }, // rank 12
      { suit: 'basto', number: 5 },
    ];

    // Caso A: bot es mano -> abre con la carta del medio (3 de copa)
    const gMano = createGame({ targetScore: 30, seed: 10, firstMano: 'bot' });
    const sMano = {
      ...gMano,
      hand: {
        ...gMano.hand,
        dealtCards: { human: humanHand, bot: botHand },
        remainingCards: { human: [...humanHand], bot: [...botHand] },
      },
    };
    expect(chooseMedioCard(createPlayerView(sMano, 'bot'))).toEqual({
      suit: 'copa',
      number: 3,
    });

    // Caso B: human es mano y tira un 12 (rank 7) -> bot mata con el 3 (rank 10), no gasta el 1♠
    let sPie = createGame({ targetScore: 30, seed: 11, firstMano: 'human' });
    sPie = {
      ...sPie,
      hand: {
        ...sPie.hand,
        dealtCards: { human: humanHand, bot: botHand },
        remainingCards: { human: [...humanHand], bot: [...botHand] },
      },
    };
    const after12 = applyAction(sPie, { type: 'playCard', card: humanHand[0] });
    expect(chooseMedioCard(createPlayerView(after12, 'bot'))).toEqual({
      suit: 'copa',
      number: 3,
    });

    // Caso C: si ninguna carta de bot puede ganar, tira la más baja (achica)
    const weakBotHand: Hand = [
      { suit: 'copa', number: 10 },
      { suit: 'oro', number: 6 },
      { suit: 'basto', number: 4 },
    ];
    const sWeak = {
      ...sPie,
      hand: {
        ...sPie.hand,
        dealtCards: { human: humanHand, bot: weakBotHand },
        remainingCards: { human: [...humanHand], bot: [...weakBotHand] },
      },
    };
    const after7Espada = applyAction(sWeak, { type: 'playCard', card: humanHand[1] });
    expect(chooseMedioCard(createPlayerView(after7Espada, 'bot'))).toEqual({
      suit: 'basto',
      number: 4,
    });
  });

  it('canta envido con >= 27, responde "el envido está primero" y regula según malas/buenas', () => {
    const rng = createRng(2026);
    const hand28: Hand = [
      { suit: 'oro', number: 7 },
      { suit: 'oro', number: 1 },
      { suit: 'basto', number: 4 },
    ]; // 28 de envido

    const base = createGame({ targetScore: 30, seed: 20, firstMano: 'bot' });
    const state = {
      ...base,
      hand: {
        ...base.hand,
        dealtCards: { ...base.hand.dealtCards, bot: hand28 },
        remainingCards: { ...base.hand.remainingCards, bot: [...hand28] },
      },
    };

    const action = botMedio.decide(createPlayerView(state, 'bot'), rng);
    expect(action).toEqual({ type: 'callEnvido', call: 'envido' });

    // Si human es mano y canta Truco de entrada, Don Ramón con 28 canta Envido primero
    const sHumanMano = {
      ...createGame({ targetScore: 30, seed: 21, firstMano: 'human' }),
    };
    const sTruco = applyAction(
      {
        ...sHumanMano,
        hand: {
          ...sHumanMano.hand,
          dealtCards: { ...sHumanMano.hand.dealtCards, bot: hand28 },
          remainingCards: { ...sHumanMano.hand.remainingCards, bot: [...hand28] },
        },
      },
      { type: 'callTruco', level: 'truco' },
    );
    const resp = botMedio.decide(createPlayerView(sTruco, 'bot'), rng);
    expect(resp).toEqual({ type: 'callEnvido', call: 'envido' });

    // Con 25 de envido: en malas quiere, en buenas no quiere
    const hand25: Hand = [
      { suit: 'copa', number: 5 },
      { suit: 'copa', number: 12 },
      { suit: 'basto', number: 4 },
    ];
    const sEnvidoMalas = applyAction(
      {
        ...sHumanMano,
        scores: { human: 5, bot: 5 },
        hand: {
          ...sHumanMano.hand,
          dealtCards: { ...sHumanMano.hand.dealtCards, bot: hand25 },
          remainingCards: { ...sHumanMano.hand.remainingCards, bot: [...hand25] },
        },
      },
      { type: 'callEnvido', call: 'envido' },
    );
    expect(botMedio.decide(createPlayerView(sEnvidoMalas, 'bot'), rng)).toEqual({
      type: 'respondEnvido',
      response: 'quiero',
    });

    const sEnvidoBuenas = {
      ...sEnvidoMalas,
      scores: { human: 20, bot: 20 },
    };
    expect(botMedio.decide(createPlayerView(sEnvidoBuenas, 'bot'), rng)).toEqual({
      type: 'respondEnvido',
      response: 'noQuiero',
    });

    expect(
      isActionLegal(sEnvidoBuenas, botMedio.decide(createPlayerView(sEnvidoBuenas, 'bot'), rng)),
    ).toBe(true);
  });
});
