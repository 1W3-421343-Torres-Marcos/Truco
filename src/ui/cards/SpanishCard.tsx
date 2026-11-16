import { formatCard, type CardNumber, type Suit } from '../../store/index.ts';
import { CourtFigure } from './CourtFigure.tsx';
import styles from './SpanishCard.module.css';
import { SuitSymbol } from './SuitSymbol.tsx';

export type CardSize = 'sm' | 'md' | 'lg';

export interface SpanishCardProps {
  readonly suit?: Suit;
  readonly number?: CardNumber;
  readonly faceDown?: boolean;
  readonly size?: CardSize;
}

const SUIT_PINTAS: Readonly<Record<Suit, number>> = {
  oro: 0,
  copa: 1,
  espada: 2,
  basto: 3,
};

export function SpanishCard({
  suit = 'espada',
  number = 1,
  faceDown = false,
  size = 'md',
}: SpanishCardProps) {
  const sizeClass = styles[size];

  if (faceDown) {
    return (
      <div
        className={`${styles.card} ${sizeClass} ${styles.cardBack}`}
        aria-label="Carta boca abajo"
      >
        <div className={styles.backPattern}>
          <svg width="32" height="44" viewBox="0 0 32 44" aria-hidden="true">
            <polygon points="16,4 28,22 16,40 4,22" fill="none" stroke="#f4ead5" strokeWidth="2" />
            <polygon
              points="16,11 23,22 16,33 9,22"
              fill="#a0703c"
              stroke="#f4ead5"
              strokeWidth="1.4"
            />
          </svg>
        </div>
      </div>
    );
  }

  const cutsCount = SUIT_PINTAS[suit];
  const cuts = Array.from({ length: cutsCount }, (_, idx) => idx);
  const label = formatCard({ suit, number });
  const isAnchoBravo = number === 1 && (suit === 'espada' || suit === 'basto');
  const pipSize = size === 'sm' ? 16 : number === 1 ? 38 : number <= 3 ? 24 : 18;

  return (
    <div className={`${styles.card} ${sizeClass}`} role="img" aria-label={label}>
      <div className={styles.innerFrame} data-pintas={cutsCount}>
        {cutsCount > 0 && (
          <div className={styles.pintaBarTop} aria-hidden="true">
            {cuts.map((c) => (
              <span key={`top-${c}`} className={styles.pintaCut} />
            ))}
          </div>
        )}

        <div className={styles.cornerTop}>
          <span>{number}</span>
        </div>

        <div className={styles.centerArtwork}>
          {number >= 10 ? (
            size === 'sm' ? (
              <SuitSymbol suit={suit} size={22} />
            ) : (
              <CourtFigure suit={suit} number={number as 10 | 11 | 12} />
            )
          ) : number === 1 || size === 'sm' ? (
            <div className={`${styles.singlePip} ${isAnchoBravo ? styles.bravoHalo : ''}`}>
              <SuitSymbol suit={suit} size={pipSize} />
            </div>
          ) : (
            <div className={styles.pipsGrid}>
              {Array.from({ length: Math.min(number, 6) }, (_, idx) => (
                <SuitSymbol key={idx} suit={suit} size={pipSize} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.cornerBottom}>
          <span>{number}</span>
        </div>

        {cutsCount > 0 && (
          <div className={styles.pintaBarBottom} aria-hidden="true">
            {cuts.map((c) => (
              <span key={`bot-${c}`} className={styles.pintaCut} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
