import { formatCard, type TrickState } from '../../store/index.ts';
import styles from './TrickBoard.module.css';

export interface TrickBoardProps {
  readonly tricks: readonly [TrickState, TrickState, TrickState];
  readonly currentTrickIndex: 0 | 1 | 2;
  readonly rivalName: string;
}

function getTrickStatusLabel(
  trick: TrickState,
  index: number,
  currentTrickIndex: number,
  rivalName: string,
): string {
  if (trick.winner === 'human') return 'Ganaste';
  if (trick.winner === 'bot') return `Ganó ${rivalName}`;
  if (trick.winner === 'parda') return 'Parda';
  if (index === currentTrickIndex) return 'En juego';
  return 'Pendiente';
}

export function TrickBoard({ tricks, currentTrickIndex, rivalName }: TrickBoardProps) {
  return (
    <section className={styles.board} aria-label="Bazas de la mano">
      {tricks.map((trick, idx) => {
        const isActive = idx === currentTrickIndex && trick.winner === null;
        const botCard = trick.cards.bot;
        const humanCard = trick.cards.human;
        const status = getTrickStatusLabel(trick, idx, currentTrickIndex, rivalName);

        return (
          <div
            key={`trick-${idx + 1}`}
            aria-label={`Baza ${idx + 1}`}
            className={`${styles.trickColumn} ${isActive ? styles.trickColumnActive : ''}`}
          >
            <div className={styles.trickHeader}>
              <span>Baza {idx + 1}</span>
              <span className={styles.badge}>{status}</span>
            </div>

            <div className={styles.slot}>
              <span className={styles.slotLabel}>{rivalName}</span>
              {botCard ? (
                <span className={styles.playedCard}>{formatCard(botCard)}</span>
              ) : (
                <span className={styles.emptySlot}>—</span>
              )}
            </div>

            <div className={styles.slot}>
              <span className={styles.slotLabel}>Vos</span>
              {humanCard ? (
                <span className={styles.playedCard}>{formatCard(humanCard)}</span>
              ) : (
                <span className={styles.emptySlot}>—</span>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
}
