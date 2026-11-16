import type { Difficulty, GameState, PlayerId, TargetScore } from '../engine/index.ts';

export const CURRENT_SCHEMA_VERSION = 1;

export const STORAGE_KEYS = {
  current: 'truco:v1:current',
  history: 'truco:v1:history',
  stats: 'truco:v1:stats',
  settings: 'truco:v1:settings',
} as const;

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface MatchCounters {
  readonly envidosPlayed: number;
  readonly envidosWon: number;
  readonly trucosPlayed: number;
  readonly trucosWon: number;
}

export interface SavedGame {
  readonly schemaVersion: number;
  readonly id: string;
  readonly startedAt: string;
  readonly savedAt: string;
  readonly difficulty: Difficulty;
  readonly seed: number;
  readonly state: GameState;
  readonly matchCounters: MatchCounters;
}

export interface GameRecord {
  readonly id: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly durationSec: number;
  readonly difficulty: Difficulty;
  readonly target: TargetScore;
  readonly finalScore: { readonly human: number; readonly bot: number };
  readonly winner: PlayerId;
  readonly handsPlayed: number;
  readonly abandoned: boolean;
}

export interface DifficultyStats {
  readonly played: number;
  readonly won: number;
}

export interface Stats {
  readonly gamesPlayed: number;
  readonly gamesWon: number;
  readonly currentStreak: number;
  readonly bestStreak: number;
  readonly byDifficulty: Readonly<Record<Difficulty, DifficultyStats>>;
  readonly envidosWon: number;
  readonly envidosPlayed: number;
  readonly trucosWon: number;
  readonly trucosPlayed: number;
}

export interface Settings {
  readonly soundEnabled: boolean;
  readonly voiceEnabled: boolean;
  readonly lastDifficulty: Difficulty;
  readonly lastTarget: TargetScore;
}
