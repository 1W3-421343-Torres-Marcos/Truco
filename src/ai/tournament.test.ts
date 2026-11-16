import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  createRng,
  getActivePlayer,
  isActionLegal,
  startNextHand,
  type PlayerId,
  type TargetScore,
} from '../engine/index.ts';
import { getBot } from './index.ts';
import type { Difficulty } from './types.ts';
import { createOpponentProfile, createPlayerView, updateOpponentProfile } from './view.ts';

function runSeries(
  humanBotDifficulty: Difficulty,
  machineBotDifficulty: Difficulty,
  gamesCount: number,
  seed: number,
  targetScore: TargetScore = 15,
): { humanWins: number; botWins: number; humanWinRate: number } {
  const rng = createRng(seed);
  const humanBot = getBot(humanBotDifficulty);
  const machineBot = getBot(machineBotDifficulty);

  let humanWins = 0;
  let botWins = 0;

  for (let g = 0; g < gamesCount; g++) {
    let state = createGame({
      targetScore,
      seed: rng.nextInt(0x7fffffff),
      firstMano: g % 2 === 0 ? 'human' : 'bot',
    });

    let profileOfBot = createOpponentProfile();
    let profileOfHuman = createOpponentProfile();

    while (state.winner === null) {
      while (state.hand.phase !== 'handEnded') {
        const active: PlayerId = getActivePlayer(state.hand)!;
        const bot = active === 'human' ? humanBot : machineBot;
        const profile = active === 'human' ? profileOfBot : profileOfHuman;
        const view = createPlayerView(state, active, profile);
        const action = bot.decide(view, rng);

        expect(isActionLegal(state, action)).toBe(true);
        state = applyAction(state, action);
      }

      profileOfBot = updateOpponentProfile(profileOfBot, state.hand, 'bot');
      profileOfHuman = updateOpponentProfile(profileOfHuman, state.hand, 'human');

      if (state.winner !== null) {
        if (state.winner === 'human') {
          humanWins++;
        } else {
          botWins++;
        }
        break;
      }

      state = startNextHand(state);
    }
  }

  return {
    humanWins,
    botWins,
    humanWinRate: humanWins / gamesCount,
  };
}

describe('torneo automático y fuzz entre bots (Etapa 5.5)', () => {
  it('Medio ("Don Ramón") supera > 60 % a Fácil ("El Pibe") en 1000 partidas', () => {
    const result = runSeries('medio', 'facil', 1_000, 202601);
    expect(result.humanWins + result.botWins).toBe(1_000);
    expect(result.humanWinRate).toBeGreaterThan(0.6);
  }, 30_000);

  it('Difícil ("El Viejo Vizcacha") supera > 60 % a Medio ("Don Ramón") en 1000 partidas', () => {
    const result = runSeries('dificil', 'medio', 1_000, 202602);
    expect(result.humanWins + result.botWins).toBe(1_000);
    expect(result.humanWinRate).toBeGreaterThan(0.6);
  }, 60_000);

  it('Difícil ("El Viejo Vizcacha") supera > 75 % a Fácil ("El Pibe") en 1000 partidas', () => {
    const result = runSeries('dificil', 'facil', 1_000, 202603);
    expect(result.humanWins + result.botWins).toBe(1_000);
    expect(result.humanWinRate).toBeGreaterThan(0.75);
  }, 60_000);
});
