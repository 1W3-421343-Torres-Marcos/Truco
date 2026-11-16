import { DIFFICULTIES, PLAYERS, type Difficulty, type GameState } from '../engine/index.ts';
import { migrateSavedGamePayload } from './migrations.ts';
import { getDefaultStorage, safeReadJson, safeRemoveKey, safeWriteJson } from './storage.ts';
import {
  CURRENT_SCHEMA_VERSION,
  STORAGE_KEYS,
  type MatchCounters,
  type SavedGame,
  type StorageAdapter,
} from './types.ts';

export function createInitialMatchCounters(): MatchCounters {
  return {
    envidosPlayed: 0,
    envidosWon: 0,
    trucosPlayed: 0,
    trucosWon: 0,
  };
}

export function isRecordObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isDifficulty(value: unknown): value is Difficulty {
  return typeof value === 'string' && (DIFFICULTIES as readonly string[]).includes(value);
}

export function isValidMatchCounters(value: unknown): value is MatchCounters {
  if (!isRecordObject(value)) return false;
  return (
    typeof value.envidosPlayed === 'number' &&
    typeof value.envidosWon === 'number' &&
    typeof value.trucosPlayed === 'number' &&
    typeof value.trucosWon === 'number'
  );
}

export function isValidGameState(value: unknown): value is GameState {
  if (!isRecordObject(value)) return false;
  const targetScore = value.targetScore;
  if (targetScore !== 15 && targetScore !== 30) return false;
  if (typeof value.rngSeed !== 'number') return false;
  if (value.winner !== null && !(PLAYERS as readonly string[]).includes(value.winner as string)) {
    return false;
  }

  const scores = value.scores;
  if (!isRecordObject(scores)) return false;
  if (typeof scores.human !== 'number' || typeof scores.bot !== 'number') return false;

  const hand = value.hand;
  if (!isRecordObject(hand)) return false;
  if (typeof hand.handNumber !== 'number') return false;
  if (!(PLAYERS as readonly string[]).includes(hand.manoPlayer as string)) return false;
  if (!(PLAYERS as readonly string[]).includes(hand.turnPlayer as string)) return false;
  if (
    hand.currentTrickIndex !== 0 &&
    hand.currentTrickIndex !== 1 &&
    hand.currentTrickIndex !== 2
  ) {
    return false;
  }
  if (!Array.isArray(hand.tricks) || hand.tricks.length !== 3) return false;

  return true;
}

export function isValidSavedGame(value: unknown): value is SavedGame {
  if (!isRecordObject(value)) return false;
  return (
    value.schemaVersion === CURRENT_SCHEMA_VERSION &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.startedAt === 'string' &&
    typeof value.savedAt === 'string' &&
    isDifficulty(value.difficulty) &&
    typeof value.seed === 'number' &&
    isValidGameState(value.state) &&
    isValidMatchCounters(value.matchCounters)
  );
}

export interface CreateSavedGameParams {
  readonly id: string;
  readonly startedAt: string;
  readonly savedAt?: string;
  readonly difficulty: Difficulty;
  readonly seed: number;
  readonly state: GameState;
  readonly matchCounters?: MatchCounters;
}

/**
 * Construye un objeto `SavedGame` con la versión de esquema actual.
 */
export function createSavedGame(params: CreateSavedGameParams): SavedGame {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    id: params.id,
    startedAt: params.startedAt,
    savedAt: params.savedAt ?? params.startedAt,
    difficulty: params.difficulty,
    seed: params.seed,
    state: params.state,
    matchCounters: params.matchCounters ?? createInitialMatchCounters(),
  };
}

/**
 * Guarda la partida en curso en `truco:v1:current`.
 */
export function saveCurrentGame(
  saved: SavedGame,
  storage: StorageAdapter = getDefaultStorage(),
): boolean {
  return safeWriteJson(STORAGE_KEYS.current, saved, storage);
}

/**
 * Carga la partida en curso desde `truco:v1:current`.
 * Si no existe o está corrupta, la descarta y devuelve `null`.
 */
export function loadCurrentGame(storage: StorageAdapter = getDefaultStorage()): SavedGame | null {
  const raw = safeReadJson(STORAGE_KEYS.current, storage);
  if (raw === null) {
    return null;
  }
  const migrated = migrateSavedGamePayload(raw);
  if (migrated === null || !isValidSavedGame(migrated)) {
    console.warn('[persistence] Partida en curso inválida o no migrable; se descarta.');
    safeRemoveKey(STORAGE_KEYS.current, storage);
    return null;
  }
  return migrated;
}

/**
 * Borra la partida en curso de `truco:v1:current`.
 */
export function clearCurrentGame(storage: StorageAdapter = getDefaultStorage()): void {
  safeRemoveKey(STORAGE_KEYS.current, storage);
}
