import {
  otherPlayer,
  type HandState,
  type PlayerId,
  type TrucoLevel,
  type TrucoState,
} from './types.ts';

/**
 * Devuelve el siguiente nivel en la escalera del Truco, o `null` si ya está en `valeCuatro`.
 */
export function getNextTrucoLevel(current: TrucoLevel | null): TrucoLevel | null {
  if (current === null) return 'truco';
  if (current === 'truco') return 'retruco';
  if (current === 'retruco') return 'valeCuatro';
  return null;
}

/**
 * Determina qué canto de Truco puede hacer `player` dado el estado actual del Truco:
 * - Si hay un canto pendiente del rival, `player` puede subir al siguiente nivel
 *   (`retruco` ante `truco`, `valeCuatro` ante `retruco`).
 * - Si no hay canto pendiente y nunca se cantó nada, puede cantar `truco`.
 * - Si no hay canto pendiente y ya hay un canto querido, solo puede subir quien tiene
 *   el quiero (`quieroOwner === player`).
 */
export function canPlayerCallTruco(truco: TrucoState, player: PlayerId): TrucoLevel | null {
  if (truco.pendingCall !== null) {
    if (truco.pendingCall.by === player) {
      return null;
    }
    return getNextTrucoLevel(truco.pendingCall.level);
  }

  if (truco.acceptedLevel === null) {
    return 'truco';
  }

  if (truco.quieroOwner !== player) {
    return null;
  }

  return getNextTrucoLevel(truco.acceptedLevel);
}

/**
 * Aplica un canto o subida de apuesta (`truco`, `retruco`, `valeCuatro`).
 * Subir ante un canto pendiente implica aceptar primero el nivel anterior.
 */
export function applyTrucoCall(truco: TrucoState, player: PlayerId, level: TrucoLevel): TrucoState {
  const allowed = canPlayerCallTruco(truco, player);
  if (allowed !== level) {
    throw new Error(`El jugador ${player} no puede cantar ${level} en este estado`);
  }

  if (truco.pendingCall !== null) {
    return {
      acceptedLevel: truco.pendingCall.level,
      pendingCall: { level, by: player },
      quieroOwner: player,
    };
  }

  return {
    acceptedLevel: truco.acceptedLevel,
    pendingCall: { level, by: player },
    quieroOwner: truco.quieroOwner,
  };
}

/**
 * Aplica la respuesta "¡Quiero!" al canto de Truco pendiente.
 * El jugador que acepta pasa a ser `quieroOwner`.
 */
export function applyTrucoQuiero(truco: TrucoState, player: PlayerId): TrucoState {
  if (truco.pendingCall === null) {
    throw new Error('No hay ningún canto de Truco pendiente para querer');
  }
  if (otherPlayer(truco.pendingCall.by) !== player) {
    throw new Error(`El jugador ${player} no puede responder a su propio canto`);
  }

  return {
    acceptedLevel: truco.pendingCall.level,
    pendingCall: null,
    quieroOwner: player,
  };
}

/**
 * Puntos que suma el ganador de la mano según el nivel de Truco querido.
 */
export function getTrucoAcceptedPoints(level: TrucoLevel | null): number {
  if (level === null) return 1;
  if (level === 'truco') return 2;
  if (level === 'retruco') return 3;
  return 4;
}

/**
 * Puntos que suma quien cantó cuando el rival responde "No quiero".
 */
export function getTrucoDeclinedPoints(level: TrucoLevel): number {
  if (level === 'truco') return 1;
  if (level === 'retruco') return 2;
  return 3;
}

/**
 * Indica si `player` todavía tenía derecho a cantar Envido en esta mano:
 * - Estamos en la 1ª baza (`currentTrickIndex === 0`).
 * - Aún no se cantó envido en la mano (`!envidoCalledInHand`).
 * - `player` todavía no jugó su carta de la 1ª baza.
 */
export function canPlayerStillCallEnvido(hand: HandState, player: PlayerId): boolean {
  return (
    hand.currentTrickIndex === 0 &&
    !hand.envidoCalledInHand &&
    hand.tricks[0].cards[player] === undefined
  );
}

/**
 * Calcula los puntos que suma el rival cuando `foldingPlayer` se va al mazo:
 * - Valor del truco vigente: si hay canto pendiente se toma como "no querido";
 *   si no, el valor del nivel querido (o 1 si no se cantó).
 * - Si `foldingPlayer` se va en la 1ª baza sin haberse cantado envido y todavía
 *   podía cantarlo, el rival suma +1 adicional por el envido no cantado.
 */
export function calculateMazoPoints(
  hand: HandState,
  foldingPlayer: PlayerId,
): {
  trucoPoints: number;
  envidoBonusForMazo: number;
  totalPoints: number;
} {
  const trucoPoints =
    hand.truco.pendingCall !== null
      ? getTrucoDeclinedPoints(hand.truco.pendingCall.level)
      : getTrucoAcceptedPoints(hand.truco.acceptedLevel);

  const envidoBonusForMazo = canPlayerStillCallEnvido(hand, foldingPlayer) ? 1 : 0;

  return {
    trucoPoints,
    envidoBonusForMazo,
    totalPoints: trucoPoints + envidoBonusForMazo,
  };
}
