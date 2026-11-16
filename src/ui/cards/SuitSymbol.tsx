import type { Suit } from '../../store/index.ts';

export interface SuitSymbolProps {
  readonly suit: Suit;
  readonly size?: number;
}

export function SuitSymbol({ suit, size = 28 }: SuitSymbolProps) {
  if (suit === 'oro') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" fill="#f2b705" stroke="#8a5a00" strokeWidth="2.2" />
        <circle cx="20" cy="20" r="11" fill="#ffd54f" stroke="#b27800" strokeWidth="1.4" />
        <path
          d="M20 5 L22 9 L18 9 Z M20 35 L22 31 L18 31 Z M5 20 L9 22 L9 18 Z M35 20 L31 22 L31 18 Z"
          fill="#8a5a00"
        />
        <circle cx="16.5" cy="18" r="1.4" fill="#6b4400" />
        <circle cx="23.5" cy="18" r="1.4" fill="#6b4400" />
        <path
          d="M16 23.5 Q20 26.5 24 23.5"
          fill="none"
          stroke="#6b4400"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  if (suit === 'copa') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <path d="M11 33 H29 L26 28 H14 Z" fill="#d49b27" stroke="#5b3a1e" strokeWidth="1.8" />
        <rect
          x="18"
          y="21"
          width="4"
          height="7"
          fill="#d49b27"
          stroke="#5b3a1e"
          strokeWidth="1.6"
        />
        <path
          d="M10 11 H30 C30 20 25 23 20 23 C15 23 10 20 10 11 Z"
          fill="#c0392b"
          stroke="#5b3a1e"
          strokeWidth="1.8"
        />
        <path d="M13 11 Q20 6 27 11" fill="#f2b705" stroke="#5b3a1e" strokeWidth="1.6" />
      </svg>
    );
  }

  if (suit === 'espada') {
    return (
      <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
        <path d="M20 4 L24 24 L20 27 L16 24 Z" fill="#cfd8dc" stroke="#263238" strokeWidth="1.8" />
        <line x1="20" y1="7" x2="20" y2="24" stroke="#78909c" strokeWidth="1.3" />
        <path
          d="M11 25 Q20 23 29 25 L27 28 Q20 26.5 13 28 Z"
          fill="#d49b27"
          stroke="#5b3a1e"
          strokeWidth="1.5"
        />
        <rect
          x="18.2"
          y="27.5"
          width="3.6"
          height="6"
          fill="#8b5a2b"
          stroke="#3e2723"
          strokeWidth="1.4"
        />
        <circle cx="20" cy="35" r="2.6" fill="#d49b27" stroke="#3e2723" strokeWidth="1.4" />
      </svg>
    );
  }

  // basto
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <path
        d="M16 6 C21 5 26 8 25 14 L23 34 C22 36 18 36 17 34 L14 14 C13 9 14 7 16 6 Z"
        fill="#795548"
        stroke="#3e2723"
        strokeWidth="1.8"
      />
      <path d="M18 11 L21 28" stroke="#4e342e" strokeWidth="1.3" strokeLinecap="round" />
      <path
        d="M14 16 C9 14 8 18 13 19 Z M25 14 C30 12 31 16 25 17 Z M24 23 C29 22 30 26 24 26 Z"
        fill="#4caf50"
        stroke="#1b5e20"
        strokeWidth="1.2"
      />
    </svg>
  );
}
