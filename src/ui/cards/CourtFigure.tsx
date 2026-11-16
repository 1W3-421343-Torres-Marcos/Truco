import type { Suit } from '../../store/index.ts';
import { SuitSymbol } from './SuitSymbol.tsx';

export interface CourtFigureProps {
  readonly suit: Suit;
  readonly number: 10 | 11 | 12;
}

const SUIT_ACCENT: Readonly<Record<Suit, string>> = {
  oro: '#d49b27',
  copa: '#b22222',
  espada: '#3b6998',
  basto: '#3a7d44',
};

const ROLE_LABEL: Readonly<Record<10 | 11 | 12, string>> = {
  10: 'Sota',
  11: 'Caballo',
  12: 'Rey',
};

export function CourtFigure({ suit, number }: CourtFigureProps) {
  const accent = SUIT_ACCENT[suit];

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2px',
      }}
      aria-hidden="true"
    >
      <svg width="46" height="54" viewBox="0 0 60 70">
        {/* Corona / Sombrero */}
        {number === 12 ? (
          <path
            d="M18 18 L21 9 L30 15 L39 9 L42 18 Z"
            fill="#f2b705"
            stroke="#5b3a1e"
            strokeWidth="1.8"
          />
        ) : number === 11 ? (
          <path d="M16 18 Q30 8 44 18 Z" fill={accent} stroke="#5b3a1e" strokeWidth="1.8" />
        ) : (
          <ellipse
            cx="30"
            cy="15"
            rx="13"
            ry="5"
            fill={accent}
            stroke="#5b3a1e"
            strokeWidth="1.6"
          />
        )}

        {/* Rostro */}
        <circle cx="30" cy="26" r="8.5" fill="#f5d0a9" stroke="#5b3a1e" strokeWidth="1.6" />
        <circle cx="27.5" cy="25" r="1.2" fill="#2b1d0e" />
        <circle cx="32.5" cy="25" r="1.2" fill="#2b1d0e" />
        {number === 12 && (
          <path d="M25 30 Q30 34 35 30" fill="none" stroke="#5b3a1e" strokeWidth="1.6" />
        )}

        {/* Poncho / Capa */}
        <path d="M14 64 L19 36 H41 L46 64 Z" fill={accent} stroke="#5b3a1e" strokeWidth="1.8" />
        <path d="M25 36 L30 50 L35 36" fill="#f4ead5" stroke="#5b3a1e" strokeWidth="1.2" />

        {/* Silueta de caballo para el 11 */}
        {number === 11 && (
          <path
            d="M10 66 Q16 50 28 54 L48 66 Z"
            fill="#8b5a2b"
            stroke="#3e2723"
            strokeWidth="1.6"
          />
        )}
      </svg>
      <SuitSymbol suit={suit} size={22} />
      <span style={{ fontSize: '0.62rem', fontWeight: 700, opacity: 0.85 }}>
        {ROLE_LABEL[number]}
      </span>
    </div>
  );
}
