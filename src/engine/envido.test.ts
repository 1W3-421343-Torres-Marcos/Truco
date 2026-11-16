import { describe, expect, it } from 'vitest';
import { createDeck, type Card } from './cards.ts';
import {
  applyEnvidoCall,
  calculateEnvido,
  canPlayerCallEnvidoInHand,
  compareEnvido,
  createInitialEnvidoState,
  getAllowedNextEnvidoCalls,
  getCardEnvidoValue,
  getEnvidoAcceptedBasePoints,
  getEnvidoDeclinedPoints,
  hasEnvidoPair,
} from './envido.ts';
import { createGame } from './game.ts';
import type { EnvidoCall } from './types.ts';

describe('cálculo de envido (casos puntuales y exhaustivo)', () => {
  it('devuelve el valor individual de envido (1..7 o 0 para figuras)', () => {
    expect(getCardEnvidoValue({ suit: 'espada', number: 7 })).toBe(7);
    expect(getCardEnvidoValue({ suit: 'basto', number: 1 })).toBe(1);
    expect(getCardEnvidoValue({ suit: 'oro', number: 10 })).toBe(0);
    expect(getCardEnvidoValue({ suit: 'copa', number: 11 })).toBe(0);
    expect(getCardEnvidoValue({ suit: 'espada', number: 12 })).toBe(0);
  });

  it('calcula los ejemplos canónicos de truco-reglas', () => {
    // 7♠ 6♠ 1♣ → 33
    expect(
      calculateEnvido([
        { suit: 'espada', number: 7 },
        { suit: 'espada', number: 6 },
        { suit: 'basto', number: 1 },
      ]),
    ).toBe(33);

    // 12♠ 11♠ 4♣ → 20
    expect(
      calculateEnvido([
        { suit: 'espada', number: 12 },
        { suit: 'espada', number: 11 },
        { suit: 'basto', number: 4 },
      ]),
    ).toBe(20);

    // 7♠ 12♠ 3♦ → 27
    expect(
      calculateEnvido([
        { suit: 'espada', number: 7 },
        { suit: 'espada', number: 12 },
        { suit: 'oro', number: 3 },
      ]),
    ).toBe(27);

    // 5♣ 3♠ 12♦ → 5
    expect(
      calculateEnvido([
        { suit: 'basto', number: 5 },
        { suit: 'espada', number: 3 },
        { suit: 'oro', number: 12 },
      ]),
    ).toBe(5);

    // 10♣ 11♠ 12♦ → 0
    expect(
      calculateEnvido([
        { suit: 'basto', number: 10 },
        { suit: 'espada', number: 11 },
        { suit: 'oro', number: 12 },
      ]),
    ).toBe(0);
  });

  it('elige las 2 mejores cartas cuando las 3 son del mismo palo y es invariante al orden', () => {
    const c1: Card = { suit: 'oro', number: 4 };
    const c2: Card = { suit: 'oro', number: 7 };
    const c3: Card = { suit: 'oro', number: 6 };

    const permutations: Array<readonly [Card, Card, Card]> = [
      [c1, c2, c3],
      [c1, c3, c2],
      [c2, c1, c3],
      [c2, c3, c1],
      [c3, c1, c2],
      [c3, c2, c1],
    ];

    for (const perm of permutations) {
      expect(calculateEnvido(perm)).toBe(33);
    }

    expect(
      calculateEnvido([
        { suit: 'copa', number: 12 },
        { suit: 'copa', number: 10 },
        { suit: 'copa', number: 5 },
      ]),
    ).toBe(25);

    expect(
      calculateEnvido([
        { suit: 'basto', number: 12 },
        { suit: 'basto', number: 11 },
        { suit: 'basto', number: 10 },
      ]),
    ).toBe(20);
  });

  it('lanza error si se llama con una lista vacía', () => {
    expect(() => calculateEnvido([])).toThrow(/al menos una carta/);
  });

  it('resuelve empate a favor del mano en compareEnvido', () => {
    expect(compareEnvido(28, 27)).toBe('mano');
    expect(compareEnvido(27, 28)).toBe('pie');
    expect(compareEnvido(27, 27)).toBe('mano');
    expect(compareEnvido(0, 0)).toBe('mano');
    expect(compareEnvido(33, 33)).toBe('mano');
  });

  it('detecta si hay par del mismo palo con hasEnvidoPair', () => {
    expect(
      hasEnvidoPair([
        { suit: 'espada', number: 7 },
        { suit: 'espada', number: 2 },
        { suit: 'oro', number: 6 },
      ]),
    ).toEqual({ paired: true, suit: 'espada' });

    expect(
      hasEnvidoPair([
        { suit: 'espada', number: 7 },
        { suit: 'basto', number: 2 },
        { suit: 'oro', number: 6 },
      ]),
    ).toEqual({ paired: false, suit: null });
  });

  it('evalúa las 9880 manos posibles C(40,3): rango válido {0..7} U {20..33} y todos los puntajes alcanzables', () => {
    const deck = createDeck();
    const seenScores = new Set<number>();
    let totalHands = 0;

    for (let i = 0; i < deck.length; i++) {
      for (let j = i + 1; j < deck.length; j++) {
        for (let k = j + 1; k < deck.length; k++) {
          const hand = [deck[i]!, deck[j]!, deck[k]!] as const;
          const score = calculateEnvido(hand);
          const { paired } = hasEnvidoPair(hand);

          totalHands++;
          seenScores.add(score);

          if (paired) {
            expect(score).toBeGreaterThanOrEqual(20);
            expect(score).toBeLessThanOrEqual(33);
          } else {
            expect(score).toBeGreaterThanOrEqual(0);
            expect(score).toBeLessThanOrEqual(7);
          }
        }
      }
    }

    expect(totalHands).toBe(9880);

    // Puntajes posibles en el Truco sin Flor: 0..7 (8 valores) y 20..33 (14 valores) = 22 valores
    const expectedValidScores = [
      0, 1, 2, 3, 4, 5, 6, 7, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
    ];
    expect([...seenScores].sort((a, b) => a - b)).toEqual(expectedValidScores);
  });
});

describe('cantos de envido, secuencias y "el envido está primero" (Etapa 4.1)', () => {
  it('permite únicamente las subidas válidas según getAllowedNextEnvidoCalls', () => {
    expect(getAllowedNextEnvidoCalls([])).toEqual(['envido', 'realEnvido', 'faltaEnvido']);
    expect(getAllowedNextEnvidoCalls(['envido'])).toEqual(['envido', 'realEnvido', 'faltaEnvido']);
    expect(getAllowedNextEnvidoCalls(['envido', 'envido'])).toEqual(['realEnvido', 'faltaEnvido']);
    expect(getAllowedNextEnvidoCalls(['realEnvido'])).toEqual(['faltaEnvido']);
    expect(getAllowedNextEnvidoCalls(['envido', 'realEnvido'])).toEqual(['faltaEnvido']);
    expect(getAllowedNextEnvidoCalls(['envido', 'envido', 'realEnvido'])).toEqual(['faltaEnvido']);
    expect(getAllowedNextEnvidoCalls(['faltaEnvido'])).toEqual([]);
  });

  it('aplica la cadena más larga Envido -> Envido -> Real Envido -> Falta Envido y rechaza cantos inválidos', () => {
    let e = createInitialEnvidoState();
    e = applyEnvidoCall(e, 'human', 'envido');
    expect(() => applyEnvidoCall(e, 'human', 'envido')).toThrow(/propio canto/);

    e = applyEnvidoCall(e, 'bot', 'envido');
    expect(() => applyEnvidoCall(e, 'human', 'envido')).toThrow(/No se puede cantar envido/);

    e = applyEnvidoCall(e, 'human', 'realEnvido');
    expect(() => applyEnvidoCall(e, 'bot', 'realEnvido')).toThrow(/No se puede cantar realEnvido/);

    e = applyEnvidoCall(e, 'bot', 'faltaEnvido');
    expect(e.calls.map((c) => c.call)).toEqual(['envido', 'envido', 'realEnvido', 'faltaEnvido']);
    expect(() => applyEnvidoCall(e, 'human', 'faltaEnvido')).toThrow(
      /No se puede cantar faltaEnvido/,
    );

    const resolved = {
      ...e,
      outcome: {
        accepted: true,
        winner: 'human' as const,
        points: 15,
        manoPoints: 30,
        piePoints: 25,
      },
    };
    expect(() => applyEnvidoCall(resolved, 'human', 'envido')).toThrow(/ya fue resuelto/);
  });

  it('habilita canPlayerCallEnvidoInHand en turno normal y ante Truco en 1ª baza ("el envido está primero")', () => {
    const baseHand = createGame({ targetScore: 30, seed: 50 }).hand;

    // En 1ª baza, turno de human (mano): human puede cantar envido, bot todavía no
    expect(canPlayerCallEnvidoInHand(baseHand, 'human')).toEqual([
      'envido',
      'realEnvido',
      'faltaEnvido',
    ]);
    expect(canPlayerCallEnvidoInHand(baseHand, 'bot')).toEqual([]);

    // Si human canta Truco en 1ª baza, bot puede responder con Envido ("el envido está primero")
    const trucoPendingInTrick0 = {
      ...baseHand,
      phase: 'awaitingTrucoResponse' as const,
      truco: {
        acceptedLevel: null,
        pendingCall: { level: 'truco' as const, by: 'human' as const },
        quieroOwner: null,
      },
    };
    expect(canPlayerCallEnvidoInHand(trucoPendingInTrick0, 'bot')).toEqual([
      'envido',
      'realEnvido',
      'faltaEnvido',
    ]);
    expect(canPlayerCallEnvidoInHand(trucoPendingInTrick0, 'human')).toEqual([]);

    // En 2ª baza ya no se puede iniciar envido
    const inTrick1 = { ...baseHand, currentTrickIndex: 1 as const };
    expect(canPlayerCallEnvidoInHand(inTrick1, 'human')).toEqual([]);
  });

  it('verifica las 11 filas de la tabla de puntos querido / no querido (Etapa 4.2)', () => {
    const table: ReadonlyArray<{
      seq: readonly EnvidoCall[];
      querido: number | 'falta';
      noQuerido: number;
    }> = [
      { seq: ['envido'], querido: 2, noQuerido: 1 },
      { seq: ['envido', 'envido'], querido: 4, noQuerido: 2 },
      { seq: ['realEnvido'], querido: 3, noQuerido: 1 },
      { seq: ['envido', 'realEnvido'], querido: 5, noQuerido: 2 },
      { seq: ['envido', 'envido', 'realEnvido'], querido: 7, noQuerido: 4 },
      { seq: ['faltaEnvido'], querido: 'falta', noQuerido: 1 },
      { seq: ['envido', 'faltaEnvido'], querido: 'falta', noQuerido: 2 },
      { seq: ['envido', 'envido', 'faltaEnvido'], querido: 'falta', noQuerido: 4 },
      { seq: ['realEnvido', 'faltaEnvido'], querido: 'falta', noQuerido: 3 },
      { seq: ['envido', 'realEnvido', 'faltaEnvido'], querido: 'falta', noQuerido: 5 },
      {
        seq: ['envido', 'envido', 'realEnvido', 'faltaEnvido'],
        querido: 'falta',
        noQuerido: 7,
      },
    ];

    for (const row of table) {
      expect(getEnvidoAcceptedBasePoints(row.seq)).toBe(row.querido);
      expect(getEnvidoDeclinedPoints(row.seq)).toBe(row.noQuerido);
    }

    expect(() => getEnvidoAcceptedBasePoints([])).toThrow(/no puede estar vacía/);
    expect(() => getEnvidoDeclinedPoints([])).toThrow(/no puede estar vacía/);
  });
});
