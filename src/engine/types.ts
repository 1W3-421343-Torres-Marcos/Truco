import type { Card, Hand } from './cards.ts';

export const PLAYERS = ['human', 'bot'] as const;
export type PlayerId = (typeof PLAYERS)[number];

/**
 * Devuelve el jugador contrario.
 */
export function otherPlayer(player: PlayerId): PlayerId {
  return player === 'human' ? 'bot' : 'human';
}

export type TargetScore = 15 | 30;

export type TrickOutcome = PlayerId | 'parda';

export interface TrickState {
  readonly cards: Partial<Record<PlayerId, Card>>;
  readonly leadPlayer: PlayerId;
  readonly winner: TrickOutcome | null;
}

export type TrucoLevel = 'truco' | 'retruco' | 'valeCuatro';

export interface PendingTrucoCall {
  readonly level: TrucoLevel;
  readonly by: PlayerId;
}

export interface TrucoState {
  readonly acceptedLevel: TrucoLevel | null;
  readonly pendingCall: PendingTrucoCall | null;
  /** Único jugador habilitado para subir al siguiente nivel (quien aceptó el último canto). */
  readonly quieroOwner: PlayerId | null;
}

export interface HandOutcome {
  readonly reason: 'baza' | 'trucoNoQuerido' | 'mazo';
  readonly trucoWinner: PlayerId;
  readonly trucoPoints: number;
  readonly envidoBonusForMazo: number;
}

export type HandPhase = 'playing' | 'awaitingTrucoResponse' | 'handEnded';

export interface HandState {
  readonly handNumber: number;
  readonly manoPlayer: PlayerId;
  readonly turnPlayer: PlayerId;
  readonly dealtCards: Readonly<Record<PlayerId, Hand>>;
  readonly remainingCards: Readonly<Record<PlayerId, readonly Card[]>>;
  readonly tricks: readonly [TrickState, TrickState, TrickState];
  readonly currentTrickIndex: 0 | 1 | 2;
  readonly truco: TrucoState;
  readonly envidoCalledInHand: boolean;
  readonly phase: HandPhase;
  readonly outcome: HandOutcome | null;
}

export interface GameState {
  readonly targetScore: TargetScore;
  readonly scores: Readonly<Record<PlayerId, number>>;
  readonly rngSeed: number;
  readonly hand: HandState;
  readonly winner: PlayerId | null;
}

export type Action =
  | { readonly type: 'playCard'; readonly card: Card }
  | { readonly type: 'callTruco'; readonly level: TrucoLevel }
  | { readonly type: 'respondTruco'; readonly response: 'quiero' | 'noQuiero' }
  | { readonly type: 'foldToMazo' };
