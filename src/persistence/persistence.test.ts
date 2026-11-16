import { describe, expect, it, vi } from 'vitest';
import { applyAction, createGame } from '../engine/index.ts';
import {
  clearCurrentGame,
  createSavedGame,
  loadCurrentGame,
  saveCurrentGame,
} from './current-game.ts';
import { createMemoryStorage } from './storage.ts';
import { STORAGE_KEYS } from './types.ts';

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
