import {
  type Action,
  type EnvidoCall,
  type HandState,
  type TrucoLevel,
} from '../../store/index.ts';
import styles from './ActionBar.module.css';

const ENVIDO_LABELS: Readonly<Record<EnvidoCall, string>> = {
  envido: 'Envido',
  realEnvido: 'Real Envido',
  faltaEnvido: 'Falta Envido',
};

const TRUCO_LABELS: Readonly<Record<TrucoLevel, string>> = {
  truco: '¡Truco!',
  retruco: '¡Quiero Retruco!',
  valeCuatro: '¡Quiero Vale Cuatro!',
};

export interface ActionBarProps {
  readonly hand: HandState;
  readonly rivalName: string;
  readonly legalActions: readonly Action[];
  readonly isHumanTurn: boolean;
  readonly onAction: (action: Action) => void;
}

export function ActionBar({
  hand,
  rivalName,
  legalActions,
  isHumanTurn,
  onAction,
}: ActionBarProps) {
  if (!isHumanTurn || hand.phase === 'handEnded') {
    return null;
  }

  const envidoCalls = legalActions.filter(
    (a): a is Extract<Action, { type: 'callEnvido' }> => a.type === 'callEnvido',
  );
  const trucoCalls = legalActions.filter(
    (a): a is Extract<Action, { type: 'callTruco' }> => a.type === 'callTruco',
  );
  const respondEnvidoActions = legalActions.filter(
    (a): a is Extract<Action, { type: 'respondEnvido' }> => a.type === 'respondEnvido',
  );
  const respondTrucoActions = legalActions.filter(
    (a): a is Extract<Action, { type: 'respondTruco' }> => a.type === 'respondTruco',
  );
  const foldAction = legalActions.find((a) => a.type === 'foldToMazo');

  const lastEnvidoCall = hand.envido.calls[hand.envido.calls.length - 1];
  const pendingTruco = hand.truco.pendingCall;

  return (
    <section className={styles.bar} aria-label="Acciones de canto">
      {hand.phase === 'awaitingEnvidoResponse' && lastEnvidoCall && (
        <div className={styles.promptBanner} role="status">
          {rivalName} cantó <strong>{ENVIDO_LABELS[lastEnvidoCall.call]}</strong>
        </div>
      )}

      {hand.phase === 'awaitingTrucoResponse' && pendingTruco && (
        <div className={styles.promptBanner} role="status">
          {rivalName} cantó <strong>{TRUCO_LABELS[pendingTruco.level]}</strong>
        </div>
      )}

      <div className={styles.row}>
        {respondEnvidoActions.map((act) => (
          <button
            key={`resp-env-${act.response}`}
            type="button"
            className={act.response === 'quiero' ? styles.quieroButton : styles.noQuieroButton}
            onClick={() => onAction(act)}
          >
            {act.response === 'quiero' ? '¡Quiero!' : 'No quiero'}
          </button>
        ))}

        {respondTrucoActions.map((act) => (
          <button
            key={`resp-tru-${act.response}`}
            type="button"
            className={act.response === 'quiero' ? styles.quieroButton : styles.noQuieroButton}
            onClick={() => onAction(act)}
          >
            {act.response === 'quiero' ? '¡Quiero!' : 'No quiero'}
          </button>
        ))}

        {envidoCalls.map((act) => (
          <button
            key={`call-env-${act.call}`}
            type="button"
            className={styles.actionButton}
            onClick={() => onAction(act)}
          >
            {ENVIDO_LABELS[act.call]}
          </button>
        ))}

        {trucoCalls.map((act) => (
          <button
            key={`call-tru-${act.level}`}
            type="button"
            className={styles.actionButton}
            onClick={() => onAction(act)}
          >
            {TRUCO_LABELS[act.level]}
          </button>
        ))}

        {foldAction && (
          <button type="button" className={styles.mazoButton} onClick={() => onAction(foldAction)}>
            Irse al mazo
          </button>
        )}
      </div>
    </section>
  );
}
