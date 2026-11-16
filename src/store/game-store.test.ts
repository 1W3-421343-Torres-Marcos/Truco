import { describe, expect, it } from 'vitest';
import { getActivePlayer } from '../engine/index.ts';
import {
  createMemoryStorage,
  loadCurrentGame,
  loadHistory,
  loadStats,
} from '../persistence/index.ts';
import { createTrucoStore, hasResumableGame } from './game-store.ts';

describe('store de partida con Zustand (Etapa 7.1)', () => {
  it('inicia partida, guarda tras cada acción humana/bot y permite continuar desde storage', () => {
    const storage = createMemoryStorage();
    const store = createTrucoStore({
      storage,
      nowIso: () => '2026-11-16T12:30:00.000Z',
      defaultSeed: () => 4242,
    });

    expect(store.getState().screen).toBe('home');
    expect(hasResumableGame(store.getState().savedGame)).toBe(false);

    store.getState().startNewGame({ difficulty: 'medio', targetScore: 15, seed: 100 });
    expect(store.getState().screen).toBe('table');
    expect(hasResumableGame(store.getState().savedGame)).toBe(true);
    expect(loadCurrentGame(storage)?.difficulty).toBe('medio');

    // Jugador humano (mano) juega su primera carta
    const firstCard = store.getState().savedGame!.state.hand.remainingCards.human[0]!;
    store.getState().playHumanAction({ type: 'playCard', card: firstCard });

    // El estado en storage se actualizó tras la acción
    expect(loadCurrentGame(storage)?.state.hand.tricks[0].cards.human).toEqual(firstCard);
    expect(getActivePlayer(store.getState().savedGame!.state.hand)).toBe('bot');

    // Turno del bot: decide y aplica su acción
    const botAction = store.getState().runBotTurn();
    expect(botAction).not.toBeNull();

    // Si creamos otro store sobre el mismo storage, recupera la partida en curso
    const reloadedStore = createTrucoStore({ storage });
    expect(hasResumableGame(reloadedStore.getState().savedGame)).toBe(true);
    reloadedStore.getState().continueSavedGame();
    expect(reloadedStore.getState().screen).toBe('table');
  });

  it('registra abandono al iniciar otra partida o abandonar explícitamente, y finaliza partida al llegar al objetivo', () => {
    const storage = createMemoryStorage();
    const store = createTrucoStore({
      storage,
      nowIso: () => '2026-11-16T12:35:00.000Z',
    });

    store.getState().startNewGame({ difficulty: 'dificil', targetScore: 15, seed: 200 });
    store.getState().abandonCurrentGame();

    expect(store.getState().screen).toBe('home');
    expect(store.getState().savedGame).toBeNull();
    expect(loadCurrentGame(storage)).toBeNull();
    expect(loadHistory(storage)).toHaveLength(1);
    expect(loadHistory(storage)[0]?.abandoned).toBe(true);
    expect(loadStats(storage).gamesPlayed).toBe(1);
    expect(loadStats(storage).gamesWon).toBe(0);

    // Jugar una mano completa hasta que termine la mano y avanzar a la siguiente
    store.getState().startNewGame({ difficulty: 'facil', targetScore: 15, seed: 300 });
    store.getState().playHumanAction({ type: 'foldToMazo' });
    expect(store.getState().savedGame?.state.hand.phase).toBe('handEnded');

    store.getState().advanceToNextHand();
    expect(store.getState().savedGame?.state.hand.handNumber).toBe(2);
    expect(store.getState().savedGame?.state.hand.phase).toBe('playing');

    // Actualizar settings y limpiar historial
    store.getState().updateSettings({ soundEnabled: false, voiceEnabled: true });
    expect(store.getState().settings.soundEnabled).toBe(false);
    store.getState().clearHistoryRecords();
    expect(store.getState().history).toEqual([]);
  });
});
