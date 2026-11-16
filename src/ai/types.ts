import {
  DIFFICULTIES,
  type Action,
  type Card,
  type Difficulty,
  type EnvidoCallEntry,
  type Hand,
  type HandPhase,
  type PlayerId,
  type Rng,
  type TargetScore,
  type TrickState,
  type TrucoState,
} from '../engine/index.ts';

export { DIFFICULTIES, type Difficulty };

/**
 * Resultado del envido filtrado para un jugador: solo expone los puntos del rival
 * si el envido fue querido (`accepted === true`).
 */
export interface PublicEnvidoOutcome {
  readonly accepted: boolean;
  readonly winner: PlayerId;
  readonly points: number;
  readonly myRevealedPoints: number | null;
  readonly rivalRevealedPoints: number | null;
}

export interface PublicEnvidoState {
  readonly calls: readonly EnvidoCallEntry[];
  readonly pendingBy: PlayerId | null;
  readonly outcome: PublicEnvidoOutcome | null;
}

/**
 * Modelo acumulado de las tendencias observadas del rival durante la partida.
 */
export interface OpponentProfile {
  readonly handsObserved: number;
  readonly envidoCalls: number;
  readonly envidoBluffsObserved: number;
  readonly envidoShowdowns: number;
  readonly trucoCalls: number;
  readonly trucoBluffsObserved: number;
  readonly trucoShowdowns: number;
  readonly trucoResponsesTotal: number;
  readonly trucoFoldsOrDeclines: number;
}

/**
 * Estado visto por un jugador al decidir una acción.
 * NUNCA contiene las cartas ocultas del rival ni la semilla del RNG del motor.
 */
export interface PlayerView {
  readonly self: PlayerId;
  readonly rival: PlayerId;
  readonly targetScore: TargetScore;
  readonly scores: Readonly<Record<PlayerId, number>>;
  readonly handNumber: number;
  readonly manoPlayer: PlayerId;
  readonly turnPlayer: PlayerId;
  readonly myDealtCards: Hand;
  readonly myRemainingCards: readonly Card[];
  readonly rivalRemainingCardCount: number;
  readonly tricks: readonly [TrickState, TrickState, TrickState];
  readonly currentTrickIndex: 0 | 1 | 2;
  readonly truco: TrucoState;
  readonly envido: PublicEnvidoState;
  readonly envidoCalledInHand: boolean;
  readonly phase: HandPhase;
  readonly legalActions: readonly Action[];
  readonly opponentProfile: OpponentProfile;
}

export type PhraseEvent =
  | 'envido'
  | 'realEnvido'
  | 'faltaEnvido'
  | 'truco'
  | 'retruco'
  | 'valeCuatro'
  | 'quiero'
  | 'noQuiero'
  | 'mazo'
  | 'winHand';

export interface BotCharacter {
  readonly id: Difficulty;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly phrases: Readonly<Record<PhraseEvent, readonly string[]>>;
}

export interface Bot {
  readonly id: Difficulty;
  readonly character: BotCharacter;
  decide(view: PlayerView, rng: Rng): Action;
}
