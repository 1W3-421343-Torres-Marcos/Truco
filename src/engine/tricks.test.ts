import { describe, expect, it } from 'vitest';
import { nextTrickLeadPlayer, resolveHandWinnerFromTricks, resolveTrickWinner } from './tricks.ts';

describe('resolución de bazas y reglas de parda (Etapa 3.2)', () => {
  it('resolveTrickWinner identifica ganador human, bot o parda', () => {
    expect(resolveTrickWinner({ suit: 'espada', number: 1 }, { suit: 'basto', number: 1 })).toBe(
      'human',
    );
    expect(resolveTrickWinner({ suit: 'copa', number: 4 }, { suit: 'oro', number: 7 })).toBe('bot');
    expect(resolveTrickWinner({ suit: 'espada', number: 3 }, { suit: 'oro', number: 3 })).toBe(
      'parda',
    );
  });

  it('nextTrickLeadPlayer da la salida al ganador de la baza anterior o al mano si fue parda', () => {
    expect(nextTrickLeadPlayer({ cards: {}, leadPlayer: 'human', winner: 'bot' }, 'human')).toBe(
      'bot',
    );
    expect(nextTrickLeadPlayer({ cards: {}, leadPlayer: 'bot', winner: 'human' }, 'bot')).toBe(
      'human',
    );
    expect(nextTrickLeadPlayer({ cards: {}, leadPlayer: 'human', winner: 'parda' }, 'bot')).toBe(
      'bot',
    );
  });

  it('no define ganador con 0 o 1 baza jugada', () => {
    expect(resolveHandWinnerFromTricks([], 'human')).toBeNull();
    expect(resolveHandWinnerFromTricks(['human'], 'human')).toBeNull();
    expect(resolveHandWinnerFromTricks(['parda'], 'bot')).toBeNull();
  });

  it('resuelve victorias limpias 2-0 y 2-1', () => {
    expect(resolveHandWinnerFromTricks(['human', 'human'], 'bot')).toBe('human');
    expect(resolveHandWinnerFromTricks(['bot', 'bot'], 'human')).toBe('bot');
    expect(resolveHandWinnerFromTricks(['human', 'bot'], 'human')).toBeNull();
    expect(resolveHandWinnerFromTricks(['human', 'bot', 'bot'], 'human')).toBe('bot');
    expect(resolveHandWinnerFromTricks(['bot', 'human', 'human'], 'bot')).toBe('human');
  });

  it('resuelve las 6 combinaciones de parda según truco-reglas', () => {
    // 1) 1ª parda, 2ª ganada por X -> gana X en 2ª baza
    expect(resolveHandWinnerFromTricks(['parda', 'human'], 'bot')).toBe('human');
    expect(resolveHandWinnerFromTricks(['parda', 'bot'], 'human')).toBe('bot');

    // 2) 1ª ganada por X, 2ª parda -> gana X en 2ª baza
    expect(resolveHandWinnerFromTricks(['human', 'parda'], 'bot')).toBe('human');
    expect(resolveHandWinnerFromTricks(['bot', 'parda'], 'human')).toBe('bot');

    // 3) 1ª parda, 2ª parda -> aún no define; define la 3ª
    expect(resolveHandWinnerFromTricks(['parda', 'parda'], 'human')).toBeNull();
    expect(resolveHandWinnerFromTricks(['parda', 'parda', 'human'], 'bot')).toBe('human');
    expect(resolveHandWinnerFromTricks(['parda', 'parda', 'bot'], 'human')).toBe('bot');

    // 4) 1ª parda, 2ª parda, 3ª parda -> gana el mano
    expect(resolveHandWinnerFromTricks(['parda', 'parda', 'parda'], 'human')).toBe('human');
    expect(resolveHandWinnerFromTricks(['parda', 'parda', 'parda'], 'bot')).toBe('bot');

    // 5) 1ª ganada por human, 2ª por bot, 3ª parda -> gana human (ganador de 1ª)
    expect(resolveHandWinnerFromTricks(['human', 'bot', 'parda'], 'bot')).toBe('human');

    // 6) 1ª ganada por bot, 2ª por human, 3ª parda -> gana bot (ganador de 1ª)
    expect(resolveHandWinnerFromTricks(['bot', 'human', 'parda'], 'human')).toBe('bot');
  });
});
