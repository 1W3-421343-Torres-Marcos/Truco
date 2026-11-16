import { describe, expect, it } from 'vitest';
import { createGame, createInitialTrucoState } from './game.ts';
import {
  applyTrucoCall,
  applyTrucoQuiero,
  calculateMazoPoints,
  canPlayerCallTruco,
  canPlayerStillCallEnvido,
  getNextTrucoLevel,
  getTrucoAcceptedPoints,
  getTrucoDeclinedPoints,
} from './truco.ts';

describe('cantos de truco y posesión del quiero (Etapa 3.3)', () => {
  it('avanza niveles correctamente con getNextTrucoLevel', () => {
    expect(getNextTrucoLevel(null)).toBe('truco');
    expect(getNextTrucoLevel('truco')).toBe('retruco');
    expect(getNextTrucoLevel('retruco')).toBe('valeCuatro');
    expect(getNextTrucoLevel('valeCuatro')).toBeNull();
  });

  it('devuelve los puntos exactos de la tabla querido / no querido', () => {
    expect(getTrucoAcceptedPoints(null)).toBe(1);
    expect(getTrucoAcceptedPoints('truco')).toBe(2);
    expect(getTrucoAcceptedPoints('retruco')).toBe(3);
    expect(getTrucoAcceptedPoints('valeCuatro')).toBe(4);

    expect(getTrucoDeclinedPoints('truco')).toBe(1);
    expect(getTrucoDeclinedPoints('retruco')).toBe(2);
    expect(getTrucoDeclinedPoints('valeCuatro')).toBe(3);
  });

  it('permite cantar truco inicialmente y transfiere el quiero al aceptar', () => {
    const s0 = createInitialTrucoState();
    expect(canPlayerCallTruco(s0, 'human')).toBe('truco');
    expect(canPlayerCallTruco(s0, 'bot')).toBe('truco');

    const s1 = applyTrucoCall(s0, 'human', 'truco');
    expect(s1.pendingCall).toEqual({ level: 'truco', by: 'human' });
    expect(canPlayerCallTruco(s1, 'human')).toBeNull();
    expect(canPlayerCallTruco(s1, 'bot')).toBe('retruco');

    const s2 = applyTrucoQuiero(s1, 'bot');
    expect(s2).toEqual({
      acceptedLevel: 'truco',
      pendingCall: null,
      quieroOwner: 'bot',
    });

    // Solo bot tiene el quiero y puede cantar retruco
    expect(canPlayerCallTruco(s2, 'human')).toBeNull();
    expect(canPlayerCallTruco(s2, 'bot')).toBe('retruco');
  });

  it('permite subir directamente sin querer antes (truco -> retruco -> valeCuatro)', () => {
    const s0 = createInitialTrucoState();
    const s1 = applyTrucoCall(s0, 'human', 'truco');
    const s2 = applyTrucoCall(s1, 'bot', 'retruco');

    expect(s2.acceptedLevel).toBe('truco');
    expect(s2.pendingCall).toEqual({ level: 'retruco', by: 'bot' });
    expect(s2.quieroOwner).toBe('bot');

    const s3 = applyTrucoCall(s2, 'human', 'valeCuatro');
    expect(s3.acceptedLevel).toBe('retruco');
    expect(s3.pendingCall).toEqual({ level: 'valeCuatro', by: 'human' });

    // Nadie puede subir más allá de valeCuatro
    expect(canPlayerCallTruco(s3, 'bot')).toBeNull();
    expect(canPlayerCallTruco(s3, 'human')).toBeNull();

    const s4 = applyTrucoQuiero(s3, 'bot');
    expect(s4.acceptedLevel).toBe('valeCuatro');
    expect(s4.pendingCall).toBeNull();
    expect(canPlayerCallTruco(s4, 'bot')).toBeNull();
  });

  it('rechaza cantos o respuestas ilegales', () => {
    const s0 = createInitialTrucoState();
    expect(() => applyTrucoCall(s0, 'human', 'retruco')).toThrow(/no puede cantar/);
    expect(() => applyTrucoQuiero(s0, 'human')).toThrow(/No hay ningún canto/);

    const s1 = applyTrucoCall(s0, 'human', 'truco');
    expect(() => applyTrucoQuiero(s1, 'human')).toThrow(/propio canto/);
  });

  it('calcula los puntos al irse al mazo según 1ª baza, envido cantado y nivel de truco', () => {
    const baseHand = createGame({ targetScore: 30, seed: 10 }).hand;

    // 1) En 1ª baza sin envido cantado y sin haber jugado carta -> 1 truco + 1 envido = 2
    expect(canPlayerStillCallEnvido(baseHand, 'human')).toBe(true);
    expect(calculateMazoPoints(baseHand, 'human')).toEqual({
      trucoPoints: 1,
      envidoBonusForMazo: 1,
      totalPoints: 2,
    });

    // 2) En 1ª baza después de haber jugado su primera carta -> solo 1 punto
    const afterFirstCard = {
      ...baseHand,
      tricks: [
        {
          ...baseHand.tricks[0],
          cards: { human: baseHand.dealtCards.human[0] },
        },
        baseHand.tricks[1],
        baseHand.tricks[2],
      ] as const,
    };
    expect(canPlayerStillCallEnvido(afterFirstCard, 'human')).toBe(false);
    expect(calculateMazoPoints(afterFirstCard, 'human')).toEqual({
      trucoPoints: 1,
      envidoBonusForMazo: 0,
      totalPoints: 1,
    });

    // 3) En 1ª baza con envido ya cantado -> solo 1 punto
    const withEnvidoCalled = {
      ...baseHand,
      envidoCalledInHand: true,
    };
    expect(calculateMazoPoints(withEnvidoCalled, 'human')).toEqual({
      trucoPoints: 1,
      envidoBonusForMazo: 0,
      totalPoints: 1,
    });

    // 4) En 1ª baza con truco querido, sin envido cantado y sin haber tirado carta -> 2 + 1 = 3
    const withTrucoAccepted = {
      ...baseHand,
      truco: {
        acceptedLevel: 'truco' as const,
        pendingCall: null,
        quieroOwner: 'bot' as const,
      },
    };
    expect(calculateMazoPoints(withTrucoAccepted, 'human')).toEqual({
      trucoPoints: 2,
      envidoBonusForMazo: 1,
      totalPoints: 3,
    });

    // 5) En 2ª baza con retruco pendiente -> vale como no querido (2) y sin bonus (0)
    const inSecondTrickPendingRetruco = {
      ...baseHand,
      currentTrickIndex: 1 as const,
      truco: {
        acceptedLevel: 'truco' as const,
        pendingCall: { level: 'retruco' as const, by: 'bot' as const },
        quieroOwner: 'bot' as const,
      },
    };
    expect(calculateMazoPoints(inSecondTrickPendingRetruco, 'human')).toEqual({
      trucoPoints: 2,
      envidoBonusForMazo: 0,
      totalPoints: 2,
    });
  });
});
