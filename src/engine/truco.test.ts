import { describe, expect, it } from 'vitest';
import { createInitialTrucoState } from './game.ts';
import {
  applyTrucoCall,
  applyTrucoQuiero,
  canPlayerCallTruco,
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
});
