import type { HandState } from '../engine/index.ts';
import { clearCurrentGame, isDifficulty, isRecordObject } from './current-game.ts';
import { appendGameRecord, createGameRecordFromSavedGame } from './history.ts';
import { getDefaultStorage, safeReadJson, safeRemoveKey, safeWriteJson } from './storage.ts';
import {
  STORAGE_KEYS,
  type DifficultyStats,
  type GameRecord,
  type MatchCounters,
  type SavedGame,
  type Settings,
  type Stats,
  type StorageAdapter,
} from './types.ts';

export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  voiceEnabled: false,
  lastDifficulty: 'medio',
  lastTarget: 30,
};

export function createInitialStats(): Stats {
  return {
    gamesPlayed: 0,
    gamesWon: 0,
    currentStreak: 0,
    bestStreak: 0,
    byDifficulty: {
      facil: { played: 0, won: 0 },
      medio: { played: 0, won: 0 },
      dificil: { played: 0, won: 0 },
    },
    envidosWon: 0,
    envidosPlayed: 0,
    trucosWon: 0,
    trucosPlayed: 0,
  };
}

function isValidDifficultyStats(value: unknown): value is DifficultyStats {
  if (!isRecordObject(value)) return false;
  return (
    typeof value.played === 'number' &&
    value.played >= 0 &&
    typeof value.won === 'number' &&
    value.won >= 0
  );
}

export function isValidStats(value: unknown): value is Stats {
  if (!isRecordObject(value)) return false;
  if (typeof value.gamesPlayed !== 'number' || value.gamesPlayed < 0) return false;
  if (typeof value.gamesWon !== 'number' || value.gamesWon < 0) return false;
  if (typeof value.currentStreak !== 'number' || value.currentStreak < 0) return false;
  if (typeof value.bestStreak !== 'number' || value.bestStreak < 0) return false;
  if (typeof value.envidosWon !== 'number' || value.envidosWon < 0) return false;
  if (typeof value.envidosPlayed !== 'number' || value.envidosPlayed < 0) return false;
  if (typeof value.trucosWon !== 'number' || value.trucosWon < 0) return false;
  if (typeof value.trucosPlayed !== 'number' || value.trucosPlayed < 0) return false;

  const byDiff = value.byDifficulty;
  if (!isRecordObject(byDiff)) return false;
  return (
    isValidDifficultyStats(byDiff.facil) &&
    isValidDifficultyStats(byDiff.medio) &&
    isValidDifficultyStats(byDiff.dificil)
  );
}

/**
 * Carga las estadísticas acumuladas desde `truco:v1:stats` (o devuelve estadísticas en cero si no existen).
 */
export function loadStats(storage: StorageAdapter = getDefaultStorage()): Stats {
  const raw = safeReadJson(STORAGE_KEYS.stats, storage);
  if (raw === null) {
    return createInitialStats();
  }
  if (!isValidStats(raw)) {
    console.warn('[persistence] Estadísticas corruptas; se reinician.');
    safeRemoveKey(STORAGE_KEYS.stats, storage);
    return createInitialStats();
  }
  return raw;
}

/**
 * Guarda las estadísticas acumuladas en `truco:v1:stats`.
 */
export function saveStats(stats: Stats, storage: StorageAdapter = getDefaultStorage()): boolean {
  return safeWriteJson(STORAGE_KEYS.stats, stats, storage);
}

/**
 * Acumula los contadores de envido y truco de una mano finalizada sobre `counters`.
 */
export function accumulateHandCounters(
  counters: MatchCounters,
  finishedHand: HandState,
): MatchCounters {
  let envidosPlayed = counters.envidosPlayed;
  let envidosWon = counters.envidosWon;
  if (finishedHand.envido.outcome !== null) {
    envidosPlayed++;
    if (finishedHand.envido.outcome.winner === 'human') {
      envidosWon++;
    }
  }

  let trucosPlayed = counters.trucosPlayed;
  let trucosWon = counters.trucosWon;
  const trucoWasCalled =
    finishedHand.truco.acceptedLevel !== null || finishedHand.outcome?.reason === 'trucoNoQuerido';
  if (trucoWasCalled) {
    trucosPlayed++;
    if (finishedHand.outcome?.trucoWinner === 'human') {
      trucosWon++;
    }
  }

  return {
    envidosPlayed,
    envidosWon,
    trucosPlayed,
    trucosWon,
  };
}

/**
 * Calcula el nuevo objeto `Stats` tras finalizar (o abandonar) una partida.
 */
export function applyGameResultToStats(
  stats: Stats,
  record: GameRecord,
  counters: MatchCounters,
): Stats {
  const humanWon = record.winner === 'human' && !record.abandoned;
  const currentStreak = humanWon ? stats.currentStreak + 1 : 0;
  const bestStreak = Math.max(stats.bestStreak, currentStreak);
  const prevDiff = stats.byDifficulty[record.difficulty];

  return {
    gamesPlayed: stats.gamesPlayed + 1,
    gamesWon: stats.gamesWon + (humanWon ? 1 : 0),
    currentStreak,
    bestStreak,
    byDifficulty: {
      ...stats.byDifficulty,
      [record.difficulty]: {
        played: prevDiff.played + 1,
        won: prevDiff.won + (humanWon ? 1 : 0),
      },
    },
    envidosPlayed: stats.envidosPlayed + counters.envidosPlayed,
    envidosWon: stats.envidosWon + counters.envidosWon,
    trucosPlayed: stats.trucosPlayed + counters.trucosPlayed,
    trucosWon: stats.trucosWon + counters.trucosWon,
  };
}

/**
 * Registra el fin o abandono de una partida en curso:
 * 1) Agrega `GameRecord` a `history`.
 * 2) Actualiza `stats`.
 * 3) Limpia `current`.
 */
export function finishAndPersistGame(
  saved: SavedGame,
  endedAt: string,
  options?: { readonly abandoned?: boolean },
  storage: StorageAdapter = getDefaultStorage(),
): { record: GameRecord; stats: Stats } {
  const record = createGameRecordFromSavedGame(saved, endedAt, options);
  appendGameRecord(record, storage);

  const prevStats = loadStats(storage);
  const nextStats = applyGameResultToStats(prevStats, record, saved.matchCounters);
  saveStats(nextStats, storage);

  clearCurrentGame(storage);
  return { record, stats: nextStats };
}

export function isValidSettings(value: unknown): value is Settings {
  if (!isRecordObject(value)) return false;
  return (
    typeof value.soundEnabled === 'boolean' &&
    typeof value.voiceEnabled === 'boolean' &&
    isDifficulty(value.lastDifficulty) &&
    (value.lastTarget === 15 || value.lastTarget === 30)
  );
}

/**
 * Carga la configuración del usuario desde `truco:v1:settings` (o `DEFAULT_SETTINGS` si no existe).
 */
export function loadSettings(storage: StorageAdapter = getDefaultStorage()): Settings {
  const raw = safeReadJson(STORAGE_KEYS.settings, storage);
  if (raw === null) {
    return DEFAULT_SETTINGS;
  }
  if (!isValidSettings(raw)) {
    console.warn('[persistence] Configuración inválida; se restaura por defecto.');
    safeRemoveKey(STORAGE_KEYS.settings, storage);
    return DEFAULT_SETTINGS;
  }
  return raw;
}

/**
 * Guarda la configuración del usuario en `truco:v1:settings`.
 */
export function saveSettings(
  settings: Settings,
  storage: StorageAdapter = getDefaultStorage(),
): boolean {
  return safeWriteJson(STORAGE_KEYS.settings, settings, storage);
}
