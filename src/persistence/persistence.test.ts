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
