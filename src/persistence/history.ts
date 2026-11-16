import { PLAYERS } from '../engine/index.ts';
import { isDifficulty, isRecordObject } from './current-game.ts';
import { migrateHistoryRecordPayload } from './migrations.ts';
import { getDefaultStorage, safeReadJson, safeRemoveKey, safeWriteJson } from './storage.ts';
import { STORAGE_KEYS, type GameRecord, type SavedGame, type StorageAdapter } from './types.ts';

export const MAX_HISTORY_RECORDS = 500;

export function isValidGameRecord(value: unknown): value is GameRecord {
  if (!isRecordObject(value)) return false;
  if (typeof value.id !== 'string' || value.id.length === 0) return false;
  if (typeof value.startedAt !== 'string' || typeof value.endedAt !== 'string') return false;
  if (typeof value.durationSec !== 'number' || value.durationSec < 0) return false;
  if (!isDifficulty(value.difficulty)) return false;
  if (value.target !== 15 && value.target !== 30) return false;
  if (!(PLAYERS as readonly string[]).includes(value.winner as string)) return false;
  if (typeof value.handsPlayed !== 'number' || value.handsPlayed < 1) return false;
  if (typeof value.abandoned !== 'boolean') return false;

  const finalScore = value.finalScore;
  if (!isRecordObject(finalScore)) return false;
  if (typeof finalScore.human !== 'number' || typeof finalScore.bot !== 'number') return false;

  return true;
}

/**
 * Carga el historial de partidas terminadas desde `truco:v1:history` (más reciente primero).
 * Filtra entradas corruptas o descarta el arreglo si la estructura no es válida.
 */
export function loadHistory(storage: StorageAdapter = getDefaultStorage()): GameRecord[] {
  const raw = safeReadJson(STORAGE_KEYS.history, storage);
  if (raw === null) {
    return [];
  }
  if (!Array.isArray(raw)) {
    console.warn('[persistence] El historial no es un arreglo válido; se descarta.');
    safeRemoveKey(STORAGE_KEYS.history, storage);
    return [];
  }

  const valid: GameRecord[] = [];
  for (const item of raw) {
    const migrated = migrateHistoryRecordPayload(item);
    if (migrated !== null) {
      valid.push(migrated);
    }
  }
  if (valid.length !== raw.length) {
    console.warn('[persistence] Se filtraron registros corruptos del historial.');
    safeWriteJson(STORAGE_KEYS.history, valid.slice(0, MAX_HISTORY_RECORDS), storage);
  }
  return valid.slice(0, MAX_HISTORY_RECORDS);
}

/**
 * Agrega una partida terminada al inicio del historial (máximo 500 registros).
 */
export function appendGameRecord(
  record: GameRecord,
  storage: StorageAdapter = getDefaultStorage(),
): GameRecord[] {
  const current = loadHistory(storage);
  const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(
    0,
    MAX_HISTORY_RECORDS,
  );
  safeWriteJson(STORAGE_KEYS.history, updated, storage);
  return updated;
}

/**
 * Borra el historial de partidas de `truco:v1:history`.
 */
export function clearHistory(storage: StorageAdapter = getDefaultStorage()): void {
  safeRemoveKey(STORAGE_KEYS.history, storage);
}

/**
 * Construye un `GameRecord` a partir de un `SavedGame` finalizado o abandonado.
 * Si `abandoned === true`, se registra como derrota (`winner: 'bot'`).
 */
export function createGameRecordFromSavedGame(
  saved: SavedGame,
  endedAt: string,
  options?: { readonly abandoned?: boolean },
): GameRecord {
  const abandoned = options?.abandoned === true;
  const startMs = Date.parse(saved.startedAt);
  const endMs = Date.parse(endedAt);
  const durationSec =
    Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs
      ? Math.round((endMs - startMs) / 1000)
      : 0;

  const winner = abandoned
    ? 'bot'
    : (saved.state.winner ??
      (saved.state.scores.human >= saved.state.scores.bot ? 'human' : 'bot'));

  return {
    id: saved.id,
    startedAt: saved.startedAt,
    endedAt,
    durationSec,
    difficulty: saved.difficulty,
    target: saved.state.targetScore,
    finalScore: {
      human: saved.state.scores.human,
      bot: saved.state.scores.bot,
    },
    winner,
    handsPlayed: saved.state.hand.handNumber,
    abandoned,
  };
}
