import {
  createInitialMatchCounters,
  isDifficulty,
  isRecordObject,
  isValidMatchCounters,
} from './current-game.ts';
import { isValidGameRecord } from './history.ts';
import { CURRENT_SCHEMA_VERSION, type GameRecord } from './types.ts';

export type SchemaMigrationStep = (
  payload: Record<string, unknown>,
) => Record<string, unknown> | null;

/**
 * Migración de v0 (sin matchCounters o sin savedAt) a v1.
 */
const migrateV0ToV1: SchemaMigrationStep = (payload) => {
  if (typeof payload.id !== 'string' || typeof payload.startedAt !== 'string') {
    return null;
  }
  return {
    ...payload,
    schemaVersion: 1,
    savedAt: typeof payload.savedAt === 'string' ? payload.savedAt : payload.startedAt,
    matchCounters: isValidMatchCounters(payload.matchCounters)
      ? payload.matchCounters
      : createInitialMatchCounters(),
  };
};

export const DEFAULT_SAVED_GAME_MIGRATIONS: Readonly<Record<number, SchemaMigrationStep>> = {
  0: migrateV0ToV1,
};

export interface MigrateSavedGameOptions {
  readonly targetVersion?: number;
  readonly migrations?: Readonly<Record<number, SchemaMigrationStep>>;
}

/**
 * Ejecuta la cadena de migraciones sobre un `SavedGame` crudo hasta `targetVersion`
 * (por defecto `CURRENT_SCHEMA_VERSION`).
 * Devuelve `null` si el dato está corrupto o si no existe un camino de migración válido.
 */
export function migrateSavedGamePayload(
  raw: unknown,
  options?: MigrateSavedGameOptions,
): Record<string, unknown> | null {
  if (!isRecordObject(raw)) {
    return null;
  }

  const targetVersion = options?.targetVersion ?? CURRENT_SCHEMA_VERSION;
  const migrations = options?.migrations ?? DEFAULT_SAVED_GAME_MIGRATIONS;

  const rawVersion = typeof raw.schemaVersion === 'number' ? raw.schemaVersion : 0;
  if (!Number.isInteger(rawVersion) || rawVersion < 0 || rawVersion > targetVersion) {
    return null;
  }

  let current: Record<string, unknown> = { ...raw, schemaVersion: rawVersion };
  let version = rawVersion;

  while (version < targetVersion) {
    const step = migrations[version];
    if (!step) {
      return null;
    }
    const migrated = step(current);
    if (migrated === null) {
      return null;
    }
    version++;
    current = { ...migrated, schemaVersion: version };
  }

  return current;
}

/**
 * Migra un registro de historial de versiones anteriores completando campos faltantes
 * (el historial siempre se migra cuando tiene los datos mínimos).
 */
export function migrateHistoryRecordPayload(raw: unknown): GameRecord | null {
  if (isValidGameRecord(raw)) {
    return raw;
  }
  if (!isRecordObject(raw)) {
    return null;
  }
  if (typeof raw.id !== 'string' || raw.id.length === 0) return null;
  if (typeof raw.startedAt !== 'string') return null;
  if (!isDifficulty(raw.difficulty)) return null;
  if (raw.target !== 15 && raw.target !== 30) return null;
  if (raw.winner !== 'human' && raw.winner !== 'bot') return null;
  if (!isRecordObject(raw.finalScore)) return null;
  if (typeof raw.finalScore.human !== 'number' || typeof raw.finalScore.bot !== 'number') {
    return null;
  }

  const candidate: GameRecord = {
    id: raw.id,
    startedAt: raw.startedAt,
    endedAt: typeof raw.endedAt === 'string' ? raw.endedAt : raw.startedAt,
    durationSec: typeof raw.durationSec === 'number' && raw.durationSec >= 0 ? raw.durationSec : 0,
    difficulty: raw.difficulty,
    target: raw.target,
    finalScore: {
      human: raw.finalScore.human,
      bot: raw.finalScore.bot,
    },
    winner: raw.winner,
    handsPlayed: typeof raw.handsPlayed === 'number' && raw.handsPlayed >= 1 ? raw.handsPlayed : 1,
    abandoned: typeof raw.abandoned === 'boolean' ? raw.abandoned : false,
  };

  return isValidGameRecord(candidate) ? candidate : null;
}
