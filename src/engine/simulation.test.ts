import { describe, expect, it } from 'vitest';
import {
  applyAction,
  createGame,
  getActivePlayer,
  getLegalActions,
  startNextHand,
} from './game.ts';
import { createRng } from './rng.ts';
import type { TargetScore } from './types.ts';

describe('simulación masiva del engine (Etapa 4.5)', () => {
  it('simula 10.000 manos aleatorias (a 15 y a 30) sin errores ni estados inválidos', () => {
    const rng = createRng(20261116);
    const totalHandsTarget = 10_000;
    let handsSimulated = 0;
    let gamesCompleted = 0;
    const outcomeReasons = new Set<string>();

    while (handsSimulated < totalHandsTarget) {
      const targetScore: TargetScore = handsSimulated < 5_000 ? 15 : 30;
      let state = createGame({
        targetScore,
        seed: rng.nextInt(0x7fffffff),
        firstMano: handsSimulated % 2 === 0 ? 'human' : 'bot',
      });

      while (handsSimulated < totalHandsTarget) {
        let stepsInHand = 0;
        let prevHumanScore = state.scores.human;
        let prevBotScore = state.scores.bot;

        while (state.hand.phase !== 'handEnded') {
          stepsInHand++;
          expect(stepsInHand).toBeLessThanOrEqual(25);
          expect(state.winner).toBeNull();
          expect(getActivePlayer(state.hand)).not.toBeNull();

          const legalActions = getLegalActions(state);
          expect(legalActions.length).toBeGreaterThan(0);

          const chosen = legalActions[rng.nextInt(legalActions.length)]!;
          state = applyAction(state, chosen);

          // Puntajes enteros, nunca bajan ni superan targetScore
          expect(Number.isInteger(state.scores.human)).toBe(true);
          expect(Number.isInteger(state.scores.bot)).toBe(true);
          expect(state.scores.human).toBeGreaterThanOrEqual(prevHumanScore);
          expect(state.scores.bot).toBeGreaterThanOrEqual(prevBotScore);
          expect(state.scores.human).toBeLessThanOrEqual(targetScore);
          expect(state.scores.bot).toBeLessThanOrEqual(targetScore);

          prevHumanScore = state.scores.human;
          prevBotScore = state.scores.bot;
        }

        handsSimulated++;
        expect(state.hand.outcome).not.toBeNull();
        outcomeReasons.add(state.hand.outcome!.reason);
        expect(getLegalActions(state)).toEqual([]);

        if (state.winner !== null) {
          expect(state.scores[state.winner]).toBe(targetScore);
          gamesCompleted++;
          break;
        }

        expect(state.scores.human).toBeLessThan(targetScore);
        expect(state.scores.bot).toBeLessThan(targetScore);
        state = startNextHand(state);
      }
    }

    expect(handsSimulated).toBe(totalHandsTarget);
    expect(gamesCompleted).toBeGreaterThan(500);
    expect(outcomeReasons).toEqual(new Set(['baza', 'trucoNoQuerido', 'mazo', 'envido']));
  });
});
