import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../engine/index.ts';
import {
  clearCurrentGame,
  createSavedGame,
  loadCurrentGame,
  saveCurrentGame,
} from './current-game.ts';
import {
  MAX_HISTORY_RECORDS,
  appendGameRecord,
  clearHistory,
  createGameRecordFromSavedGame,
  loadHistory,
} from './history.ts';
import {
  DEFAULT_SETTINGS,
  accumulateHandCounters,
  createInitialStats,
  finishAndPersistGame,
  loadSettings,
  loadStats,
  saveSettings,
} from './stats-settings.ts';
import { createMemoryStorage } from './storage.ts';
import { STORAGE_KEYS, type GameRecord } from './types.ts';

describe('persistencia de partida en curso (Etapa 6.1)', () => {
  it('guarda, carga y borra una partida en curso idéntica tras aplicar acciones', () => {
    const storage = createMemoryStorage();
    let state = createGame({ targetScore: 30, seed: 2026 });
    state = applyAction(state, { type: 'callEnvido', call: 'envido' });

    const saved = createSavedGame({
      id: 'game-1',
      startedAt: '2026-11-16T12:00:00.000Z',
      savedAt: '2026-11-16T12:00:05.000Z',
      difficulty: 'medio',
      seed: 2026,
      state,
    });

    expect(loadCurrentGame(storage)).toBeNull();
    expect(saveCurrentGame(saved, storage)).toBe(true);

    const loaded = loadCurrentGame(storage);
    expect(loaded).toEqual(saved);

    clearCurrentGame(storage);
    expect(loadCurrentGame(storage)).toBeNull();
  });

  it('descarta y limpia datos corruptos en truco:v1:current sin lanzar excepción', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const storage = createMemoryStorage({
      [STORAGE_KEYS.current]: '{json truncado',
    });

    expect(loadCurrentGame(storage)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.current)).toBeNull();

    storage.setItem(STORAGE_KEYS.current, JSON.stringify({ schemaVersion: 1, invalid: true }));
    expect(loadCurrentGame(storage)).toBeNull();
    expect(storage.getItem(STORAGE_KEYS.current)).toBeNull();

    warnSpy.mockRestore();
  });
});

describe('historial de partidas terminadas (Etapa 6.2)', () => {
  it('agrega partidas con la más reciente primero, soporta abandono y limita a 500 registros', () => {
    const storage = createMemoryStorage();
    expect(loadHistory(storage)).toEqual([]);

    const state = createGame({ targetScore: 15, seed: 7 });
    const saved = createSavedGame({
      id: 'abandoned-1',
      startedAt: '2026-11-16T12:00:00.000Z',
      difficulty: 'dificil',
      seed: 7,
      state: { ...state, scores: { human: 10, bot: 4 } },
    });

    const abandonedRecord = createGameRecordFromSavedGame(saved, '2026-11-16T12:02:30.000Z', {
      abandoned: true,
    });
    expect(abandonedRecord.winner).toBe('bot');
    expect(abandonedRecord.abandoned).toBe(true);
    expect(abandonedRecord.durationSec).toBe(150);

    appendGameRecord(abandonedRecord, storage);
    expect(loadHistory(storage)).toEqual([abandonedRecord]);

    for (let i = 1; i <= 505; i++) {
      const rec: GameRecord = {
        id: `g-${i}`,
        startedAt: '2026-11-16T10:00:00.000Z',
        endedAt: '2026-11-16T10:05:00.000Z',
        durationSec: 300,
        difficulty: 'facil',
        target: 15,
        finalScore: { human: 15, bot: 8 },
        winner: 'human',
        handsPlayed: 6,
        abandoned: false,
      };
      appendGameRecord(rec, storage);
    }

    const history = loadHistory(storage);
    expect(history).toHaveLength(MAX_HISTORY_RECORDS);
    expect(history[0]?.id).toBe('g-505');

    clearHistory(storage);
    expect(loadHistory(storage)).toEqual([]);
  });
});

describe('estadísticas acumuladas y configuración (Etapa 6.3)', () => {
  it('actualiza rachas, desglose por dificultad, contadores de envido/truco y borra current al finalizar', () => {
    const storage = createMemoryStorage();
    expect(loadStats(storage)).toEqual(createInitialStats());

    let state = createGame({ targetScore: 15, seed: 33, firstMano: 'human' });
    state = applyAction(state, { type: 'callEnvido', call: 'envido' });
    state = applyAction(state, { type: 'respondEnvido', response: 'noQuiero' }); // human gana envido
    state = applyAction(state, { type: 'callTruco', level: 'truco' });
    state = applyAction(state, { type: 'respondTruco', response: 'noQuiero' }); // human gana truco

    const counters = accumulateHandCounters(
      { envidosPlayed: 0, envidosWon: 0, trucosPlayed: 0, trucosWon: 0 },
      state.hand,
    );
    expect(counters).toEqual({
      envidosPlayed: 1,
      envidosWon: 1,
      trucosPlayed: 1,
      trucosWon: 1,
    });

    const savedWin1 = createSavedGame({
      id: 'win-1',
      startedAt: '2026-11-16T12:00:00.000Z',
      difficulty: 'medio',
      seed: 33,
      state: { ...state, scores: { human: 15, bot: 7 }, winner: 'human' },
      matchCounters: counters,
    });
    saveCurrentGame(savedWin1, storage);

    const res1 = finishAndPersistGame(savedWin1, '2026-11-16T12:04:00.000Z', undefined, storage);
    expect(loadCurrentGame(storage)).toBeNull();
    expect(res1.stats.gamesPlayed).toBe(1);
    expect(res1.stats.gamesWon).toBe(1);
    expect(res1.stats.currentStreak).toBe(1);
    expect(res1.stats.bestStreak).toBe(1);
    expect(res1.stats.byDifficulty.medio).toEqual({ played: 1, won: 1 });
    expect(res1.stats.envidosWon).toBe(1);
    expect(res1.stats.trucosWon).toBe(1);

    // Segunda victoria seguida -> racha 2
    const savedWin2 = createSavedGame({
      ...savedWin1,
      id: 'win-2',
      difficulty: 'dificil',
    });
    const res2 = finishAndPersistGame(savedWin2, '2026-11-16T12:08:00.000Z', undefined, storage);
    expect(res2.stats.currentStreak).toBe(2);
    expect(res2.stats.bestStreak).toBe(2);

    // Abandono -> cuenta como derrota, corta currentStreak a 0 pero mantiene bestStreak en 2
    const savedAbandoned = createSavedGame({
      ...savedWin1,
      id: 'abandoned-2',
      difficulty: 'dificil',
    });
    const res3 = finishAndPersistGame(
      savedAbandoned,
      '2026-11-16T12:09:00.000Z',
      { abandoned: true },
      storage,
    );
    expect(res3.stats.gamesPlayed).toBe(3);
    expect(res3.stats.gamesWon).toBe(2);
    expect(res3.stats.currentStreak).toBe(0);
    expect(res3.stats.bestStreak).toBe(2);
    expect(res3.stats.byDifficulty.dificil).toEqual({ played: 2, won: 1 });
  });

  it('guarda y carga Settings con valores por defecto seguros', () => {
    const storage = createMemoryStorage();
    expect(loadSettings(storage)).toEqual(DEFAULT_SETTINGS);

    const custom = {
      soundEnabled: false,
      voiceEnabled: true,
      lastDifficulty: 'dificil' as const,
      lastTarget: 15 as const,
    };
    expect(saveSettings(custom, storage)).toBe(true);
    expect(loadSettings(storage)).toEqual(custom);
  });
});
