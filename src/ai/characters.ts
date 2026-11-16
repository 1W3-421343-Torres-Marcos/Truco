import type { Rng } from '../engine/index.ts';
import type { BotCharacter, Difficulty, PhraseEvent } from './types.ts';

export const BOT_CHARACTERS: Readonly<Record<Difficulty, BotCharacter>> = {
  facil: {
    id: 'facil',
    name: 'El Pibe',
    title: 'Gaucho aprendiz',
    description: 'Recién está aprendiendo a orejear las cartas. Juega de frente y nunca miente.',
    phrases: {
      envido: ['¡Envido!', 'A ver si ligo... ¡Envido!'],
      realEnvido: ['¡Real Envido!'],
      faltaEnvido: ['¡Falta Envido, che!'],
      truco: ['¡Truco!', '¡Tengo una buena, Truco!'],
      retruco: ['¡Quiero Retruco!'],
      valeCuatro: ['¡Quiero Vale Cuatro!'],
      quiero: ['¡Quiero!', 'Vamos a ver qué tenés, ¡quiero!'],
      noQuiero: ['No quiero...', 'Paso, che, no quiero.'],
      mazo: ['Me voy al mazo, no ligué nada.', 'Al mazo... la próxima será.'],
      winHand: ['¡Miralo al Pibe, eh!', '¡Esa baza vino para acá!'],
    },
  },
  medio: {
    id: 'medio',
    name: 'Don Ramón',
    title: 'Puestero tranquilo',
    description:
      'Ceba amargo y juega con oficio. Cuida los porotos en las buenas y rara vez miente.',
    phrases: {
      envido: ['¡Envido, compañero!', 'Despacito por las piedras... ¡Envido!'],
      realEnvido: ['¡Real Envido, canejo!'],
      faltaEnvido: ['¡Falta Envido y que sea lo que Dios quiera!'],
      truco: ['¡Truco!', 'No se me achique... ¡Truco!'],
      retruco: ['¡Quiero Retruco, paisano!'],
      valeCuatro: ['¡Quiero Vale Cuatro!'],
      quiero: ['¡Quiero!', 'Venga esa mano, ¡quiero!'],
      noQuiero: ['No quiero, son buenas.', 'Deje nomás, no quiero.'],
      mazo: ['Me voy al mazo a tomar un amargo.', 'Al mazo, hay que saber desensillar a tiempo.'],
      winHand: ['Con paciencia se gana el truco.', 'Otro poroto pa’l lado del rancho.'],
    },
  },
  dificil: {
    id: 'dificil',
    name: 'El Viejo Vizcacha',
    title: 'Zorro de pulpería',
    description: 'Sabe qué cartas salieron, te lee las mañas y te corre con un cuatro de copas.',
    phrases: {
      envido: ['¡Envido, m’hijo!', 'A ver si me asusta... ¡Envido!'],
      realEnvido: ['¡Real Envido, sin titubear!'],
      faltaEnvido: ['¡Falta Envido, y vaya preparando el lomo!'],
      truco: ['¡Truco!', 'Con este ancho le cierro el tranquero... ¡Truco!'],
      retruco: ['¡Quiero Retruco, m’hijo!'],
      valeCuatro: ['¡Quiero Vale Cuatro, m’hijo!'],
      quiero: ['¡Quiero, y cante nomás!', '¡Quiero! A mí no me va a correr con la vaina.'],
      noQuiero: ['No quiero, guarde esa mentira pa’ otro.', 'Son buenas... por ahora.'],
      mazo: [
        'Me voy al mazo, pero no se me confíe.',
        'Al mazo... el zorro pierde el pelo pero no las mañas.',
      ],
      winHand: [
        'Hacete amigo del juez... ¡y del Viejo Vizcacha!',
        '¿Vio, m’hijo? Más sabe el diablo por viejo.',
      ],
    },
  },
};

/**
 * Elige de forma determinista una frase del personaje para el evento indicado.
 */
export function pickBotPhrase(difficulty: Difficulty, event: PhraseEvent, rng: Rng): string {
  const list = BOT_CHARACTERS[difficulty].phrases[event];
  const index = rng.nextInt(list.length);
  return list[index] ?? list[0] ?? '';
}
