import type { GameState } from '../../store/index.ts';
import styles from './HandSummaryModal.module.css';

export interface HandSummaryModalProps {
  readonly state: GameState;
  readonly rivalName: string;
  readonly onNextHand: () => void;
  readonly onRematch: () => void;
  readonly onGoHome: () => void;
}

export function HandSummaryModal({
  state,
  rivalName,
  onNextHand,
  onRematch,
  onGoHome,
}: HandSummaryModalProps) {
  const { hand } = state;
  if (hand.phase !== 'handEnded' || !hand.outcome) {
    return null;
  }

  const envidoOutcome = hand.envido.outcome;
  const { outcome } = hand;

  const humanEnvido =
    envidoOutcome && envidoOutcome.accepted
      ? hand.manoPlayer === 'human'
        ? envidoOutcome.manoPoints
        : envidoOutcome.piePoints
      : null;
  const botEnvido =
    envidoOutcome && envidoOutcome.accepted
      ? hand.manoPlayer === 'bot'
        ? envidoOutcome.manoPoints
        : envidoOutcome.piePoints
      : null;

  const titleText =
    state.winner === 'human'
      ? '¡Ganaste el partido!'
      : state.winner === 'bot'
        ? `Ganó ${rivalName} el partido`
        : `Resumen de la mano #${hand.handNumber}`;

  return (
    <section className={styles.overlay} role="dialog" aria-label="Resumen de la mano">
      <h2 className={styles.title}>{titleText}</h2>

      <div className={styles.detailBox}>
        {envidoOutcome && (
          <p className={styles.line}>
            {envidoOutcome.accepted ? (
              <>
                <strong>Envido querido:</strong> Vos tenías {humanEnvido} · {rivalName}:{' '}
                {envidoOutcome.winner === 'human'
                  ? `“Son buenas (${botEnvido})”`
                  : `“Tengo ${botEnvido}”`}{' '}
                →{' '}
                <strong>
                  {envidoOutcome.winner === 'human' ? 'Vos sumás' : `${rivalName} suma`} +
                  {envidoOutcome.points}
                </strong>
              </>
            ) : (
              <>
                <strong>Envido no querido:</strong>{' '}
                {envidoOutcome.winner === 'human' ? 'Vos sumás' : `${rivalName} suma`} +
                {envidoOutcome.points}
              </>
            )}
          </p>
        )}

        {outcome.reason === 'envido' && (
          <p className={styles.line}>
            <strong>Fin de partida:</strong> El partido se definió con el envido.
          </p>
        )}

        {outcome.reason === 'mazo' && (
          <p className={styles.line}>
            <strong>Al mazo:</strong>{' '}
            {outcome.trucoWinner === 'human' ? `${rivalName} se fue al mazo` : 'Te fuiste al mazo'}{' '}
            →{' '}
            <strong>
              {outcome.trucoWinner === 'human' ? 'Vos sumás' : `${rivalName} suma`} +
              {outcome.trucoPoints} de truco
              {outcome.envidoBonusForMazo > 0 ? ' y +1 de envido no cantado' : ''}
            </strong>
          </p>
        )}

        {outcome.reason === 'trucoNoQuerido' && (
          <p className={styles.line}>
            <strong>Truco no querido:</strong>{' '}
            {outcome.trucoWinner === 'human' ? 'Vos sumás' : `${rivalName} suma`} +
            {outcome.trucoPoints}
          </p>
        )}

        {outcome.reason === 'baza' && (
          <p className={styles.line}>
            <strong>Truco (bazas):</strong> Ganó{' '}
            {outcome.trucoWinner === 'human' ? 'Vos' : rivalName} (+{outcome.trucoPoints})
          </p>
        )}
      </div>

      <p className={styles.scoreSummary}>
        Marcador: Vos {state.scores.human} — {state.scores.bot} {rivalName}
      </p>

      <div className={styles.actions}>
        {state.winner === null ? (
          <button type="button" className={styles.primaryButton} onClick={onNextHand}>
            Siguiente mano
          </button>
        ) : (
          <>
            <button type="button" className={styles.secondaryButton} onClick={onGoHome}>
              Volver al inicio
            </button>
            <button type="button" className={styles.primaryButton} onClick={onRematch}>
              Jugar revancha
            </button>
          </>
        )}
      </div>
    </section>
  );
}
