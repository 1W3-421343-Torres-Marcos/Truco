import { create, type StoreApi, type UseBoundStore } from 'zustand';
import {
  createOpponentProfile,
  createPlayerView,
  getBot,
  pickBotPhrase,
  updateOpponentProfile,
  type OpponentProfile,
  type PhraseEvent,
} from '../ai/index.ts';
import {
  applyAction,
  createGame,
  createRng,
  getActivePlayer,
  startNextHand,
  type Action,
  type Difficulty,
  type GameState,
  type PlayerId,
  type TargetScore,
} from '../engine/index.ts';
import {
  accumulateHandCounters,
  clearHistory,
  createSavedGame,
  finishAndPersistGame,
  getDefaultStorage,
  loadCurrentGame,
  loadHistory,
  loadSettings,
  loadStats,
  saveCurrentGame,
  saveSettings,
  type GameRecord,
  type SavedGame,
  type Settings,
  type Stats,
  type StorageAdapter,
} from '../persistence/index.ts';

export type ScreenId = 'home' | 'newGame' | 'table' | 'history' | 'stats' | 'rules';

export interface StartNewGameOptions {
  readonly difficulty?: Difficulty;
  readonly targetScore?: TargetScore;
  readonly seed?: number;
  readonly firstMano?: PlayerId;
}

export interface GameStoreState {
  readonly screen: ScreenId;
  readonly savedGame: SavedGame | null;
  readonly opponentProfile: OpponentProfile;
  readonly botSpeech: string | null;
  readonly humanSpeech: string | null;
  readonly botRngSeed: number;
  readonly history: readonly GameRecord[];
  readonly stats: Stats;
  readonly settings: Settings;

  navigateTo(screen: ScreenId): void;
  startNewGame(options?: StartNewGameOptions): void;
  continueSavedGame(): void;
  abandonCurrentGame(): void;
  playHumanAction(action: Action): void;
  runBotTurn(): Action | null;
  advanceToNextHand(): void;
  updateSettings(partial: Partial<Settings>): void;
  clearHistoryRecords(): void;
}

function actionToPhraseEvent(action: Action): PhraseEvent | null {
  if (action.type === 'callEnvido') return action.call;
  if (action.type === 'respondEnvido') return action.response;
  if (action.type === 'callTruco') return action.level;
  if (action.type === 'respondTruco') return action.response;
  if (action.type === 'foldToMazo') return 'mazo';
  return null;
}

function actionToHumanSpeech(action: Action): string | null {
  if (action.type === 'callEnvido') {
    if (action.call === 'envido') return '¡Envido!';
    if (action.call === 'realEnvido') return '¡Real Envido!';
    return '¡Falta Envido!';
  }
  if (action.type === 'respondEnvido') {
    return action.response === 'quiero' ? '¡Quiero!' : 'No quiero';
  }
  if (action.type === 'callTruco') {
    if (action.level === 'truco') return '¡Truco!';
    if (action.level === 'retruco') return '¡Quiero Retruco!';
    return '¡Quiero Vale Cuatro!';
  }
  if (action.type === 'respondTruco') {
    return action.response === 'quiero' ? '¡Quiero!' : 'No quiero';
  }
  if (action.type === 'foldToMazo') {
    return 'Me voy al mazo';
  }
  return null;
}

export interface CreateTrucoStoreDeps {
  readonly storage?: StorageAdapter;
  readonly nowIso?: () => string;
  readonly defaultSeed?: () => number;
}

/**
 * Crea una instancia del store de Zustand conectando engine + ai + persistence.
 * Permite inyectar `storage`, `nowIso` y `defaultSeed` para tests deterministas.
 */
export function createTrucoStore(
  deps?: CreateTrucoStoreDeps,
): UseBoundStore<StoreApi<GameStoreState>> {
  const storage = deps?.storage ?? getDefaultStorage();
  const nowIso = deps?.nowIso ?? (() => new Date().toISOString());
  const defaultSeed = deps?.defaultSeed ?? (() => Date.now() & 0x7fffffff);

  const initialSaved = loadCurrentGame(storage);
  const initialHistory = loadHistory(storage);
  const initialStats = loadStats(storage);
  const initialSettings = loadSettings(storage);

  return create<GameStoreState>((set, get) => {
    function commitGameStateTransition(
      prevSaved: SavedGame,
      nextState: GameState,
      botSpeech: string | null,
      humanSpeech: string | null,
      nextBotRngSeed: number,
    ): void {
      const timestamp = nowIso();
      let matchCounters = prevSaved.matchCounters;
      let opponentProfile = get().opponentProfile;

      if (nextState.hand.phase === 'handEnded') {
        matchCounters = accumulateHandCounters(matchCounters, nextState.hand);
        opponentProfile = updateOpponentProfile(opponentProfile, nextState.hand, 'human');
      }

      const updatedSaved: SavedGame = {
        ...prevSaved,
        savedAt: timestamp,
        state: nextState,
        matchCounters,
      };

      if (nextState.winner !== null) {
        const { stats } = finishAndPersistGame(updatedSaved, timestamp, undefined, storage);
        set({
          savedGame: updatedSaved,
          opponentProfile,
          botSpeech,
          humanSpeech,
          botRngSeed: nextBotRngSeed,
          history: loadHistory(storage),
          stats,
        });
        return;
      }

      saveCurrentGame(updatedSaved, storage);
      set({
        savedGame: updatedSaved,
        opponentProfile,
        botSpeech,
        humanSpeech,
        botRngSeed: nextBotRngSeed,
      });
    }

    return {
      screen: 'home',
      savedGame: initialSaved,
      opponentProfile: createOpponentProfile(),
      botSpeech: null,
      humanSpeech: null,
      botRngSeed: initialSaved ? (initialSaved.seed ^ 0x5a5a5a5a) >>> 0 : 20261116,
      history: initialHistory,
      stats: initialStats,
      settings: initialSettings,

      navigateTo(screen: ScreenId): void {
        set({ screen });
      },

      startNewGame(options?: StartNewGameOptions): void {
        const current = get();
        const timestamp = nowIso();

        // Si había una partida activa sin terminar, registrarla primero como abandonada
        if (current.savedGame !== null && current.savedGame.state.winner === null) {
          finishAndPersistGame(current.savedGame, timestamp, { abandoned: true }, storage);
        }

        const difficulty = options?.difficulty ?? current.settings.lastDifficulty;
        const targetScore = options?.targetScore ?? current.settings.lastTarget;
        const seed = options?.seed ?? defaultSeed();
        const firstMano = options?.firstMano ?? 'human';

        const nextSettings: Settings = {
          ...current.settings,
          lastDifficulty: difficulty,
          lastTarget: targetScore,
        };
        saveSettings(nextSettings, storage);

        const state = createGame({ targetScore, seed, firstMano });
        const saved = createSavedGame({
          id: `match-${seed}-${timestamp}`,
          startedAt: timestamp,
          savedAt: timestamp,
          difficulty,
          seed,
          state,
        });
        saveCurrentGame(saved, storage);

        set({
          screen: 'table',
          savedGame: saved,
          opponentProfile: createOpponentProfile(),
          botSpeech: null,
          humanSpeech: null,
          botRngSeed: (seed ^ 0x5a5a5a5a) >>> 0,
          history: loadHistory(storage),
          stats: loadStats(storage),
          settings: nextSettings,
        });
      },

      continueSavedGame(): void {
        const { savedGame } = get();
        if (savedGame !== null && savedGame.state.winner === null) {
          set({ screen: 'table' });
        }
      },

      abandonCurrentGame(): void {
        const { savedGame } = get();
        if (savedGame === null || savedGame.state.winner !== null) {
          set({ screen: 'home', savedGame: null });
          return;
        }
        const timestamp = nowIso();
        const { stats } = finishAndPersistGame(savedGame, timestamp, { abandoned: true }, storage);
        set({
          screen: 'home',
          savedGame: null,
          botSpeech: null,
          humanSpeech: null,
          history: loadHistory(storage),
          stats,
        });
      },

      playHumanAction(action: Action): void {
        const { savedGame, botRngSeed, botSpeech } = get();
        if (savedGame === null || savedGame.state.winner !== null) {
          throw new Error('No hay una partida activa en curso');
        }
        if (getActivePlayer(savedGame.state.hand) !== 'human') {
          throw new Error('No es el turno del jugador humano');
        }

        const nextState = applyAction(savedGame.state, action);
        const humanSpeech = actionToHumanSpeech(action);
        commitGameStateTransition(savedGame, nextState, botSpeech, humanSpeech, botRngSeed);
      },

      runBotTurn(): Action | null {
        const { savedGame, opponentProfile, botRngSeed, humanSpeech } = get();
        if (savedGame === null || savedGame.state.winner !== null) {
          return null;
        }
        if (getActivePlayer(savedGame.state.hand) !== 'bot') {
          return null;
        }

        const rng = createRng(botRngSeed);
        const view = createPlayerView(savedGame.state, 'bot', opponentProfile);
        const bot = getBot(savedGame.difficulty);
        const chosenAction = bot.decide(view, rng);
        const nextState = applyAction(savedGame.state, chosenAction);

        let phraseEvent = actionToPhraseEvent(chosenAction);
        if (
          phraseEvent === null &&
          nextState.hand.phase === 'handEnded' &&
          nextState.hand.outcome?.trucoWinner === 'bot'
        ) {
          phraseEvent = 'winHand';
        }

        const speech =
          phraseEvent !== null
            ? pickBotPhrase(savedGame.difficulty, phraseEvent, rng)
            : get().botSpeech;

        commitGameStateTransition(savedGame, nextState, speech, humanSpeech, rng.getState());
        return chosenAction;
      },

      advanceToNextHand(): void {
        const { savedGame } = get();
        if (
          savedGame === null ||
          savedGame.state.winner !== null ||
          savedGame.state.hand.phase !== 'handEnded'
        ) {
          return;
        }

        const nextState = startNextHand(savedGame.state);
        const updatedSaved: SavedGame = {
          ...savedGame,
          savedAt: nowIso(),
          state: nextState,
        };
        saveCurrentGame(updatedSaved, storage);
        set({
          savedGame: updatedSaved,
          botSpeech: null,
          humanSpeech: null,
        });
      },

      updateSettings(partial: Partial<Settings>): void {
        const nextSettings: Settings = {
          ...get().settings,
          ...partial,
        };
        saveSettings(nextSettings, storage);
        set({ settings: nextSettings });
      },

      clearHistoryRecords(): void {
        clearHistory(storage);
        set({ history: [] });
      },
    };
  });
}

export const useGameStore = createTrucoStore();

/**
 * Selector helper: indica si hay una partida en curso que se puede continuar.
 */
export function hasResumableGame(savedGame: SavedGame | null): boolean {
  return savedGame !== null && savedGame.state.winner === null;
}
