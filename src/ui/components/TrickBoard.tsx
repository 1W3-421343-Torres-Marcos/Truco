import { motion, useReducedMotion } from 'motion/react';
import { cardId, type TrickState } from '../../store/index.ts';
import { SpanishCard } from '../cards/SpanishCard.tsx';
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
  const reduceMotion = useReducedMotion();

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
                <motion.div
                  key={`bot-${idx}-${cardId(botCard)}`}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.72, y: -16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <SpanishCard suit={botCard.suit} number={botCard.number} size="sm" />
                </motion.div>
              ) : (
                <span className={styles.emptySlot}>—</span>
              )}
            </div>

            <div className={styles.slot}>
              <span className={styles.slotLabel}>Vos</span>
              {humanCard ? (
                <motion.div
                  key={`human-${idx}-${cardId(humanCard)}`}
                  initial={reduceMotion ? false : { opacity: 0, scale: 0.72, y: 16 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ duration: 0.22 }}
                >
                  <SpanishCard suit={humanCard.suit} number={humanCard.number} size="sm" />
                </motion.div>
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
