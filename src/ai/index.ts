import { botDificil } from './bot-dificil.ts';
import { botFacil } from './bot-facil.ts';
import { botMedio } from './bot-medio.ts';
import type { Bot, Difficulty } from './types.ts';

export * from './types.ts';
export * from './view.ts';
export * from './characters.ts';
export * from './bot-facil.ts';
export * from './bot-medio.ts';
export * from './bot-dificil.ts';

export const BOTS: Readonly<Record<Difficulty, Bot>> = {
  facil: botFacil,
  medio: botMedio,
  dificil: botDificil,
};

/**
 * Devuelve la instancia del bot correspondiente al nivel de dificultad.
 */
export function getBot(difficulty: Difficulty): Bot {
  return BOTS[difficulty];
}
