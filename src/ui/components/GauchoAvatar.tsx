import { BOT_CHARACTERS, type Difficulty } from '../../store/index.ts';
import styles from './GauchoAvatar.module.css';

export interface GauchoAvatarProps {
  readonly difficulty: Difficulty;
  readonly size?: number;
}

export function GauchoAvatar({ difficulty, size = 48 }: GauchoAvatarProps) {
  const character = BOT_CHARACTERS[difficulty];

  return (
    <span
      className={styles.avatar}
      style={{ width: `${size}px`, height: `${size}px` }}
      role="img"
      aria-label={`Avatar de ${character.name}`}
    >
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <rect width="64" height="64" fill="#e9dcc0" />

        {difficulty === 'facil' && (
          <>
            {/* El Pibe: pañuelo celeste, rostro joven con sonrisa y gorra campera */}
            <path d="M14 64 C16 48 48 48 50 64 Z" fill="#6cace4" stroke="#2b1d0e" strokeWidth="2" />
            <polygon points="26,48 32,58 38,48" fill="#4a8bc2" />
            <circle cx="32" cy="34" r="13" fill="#f3cfa6" stroke="#2b1d0e" strokeWidth="2" />
            <circle cx="27.5" cy="33" r="1.8" fill="#2b1d0e" />
            <circle cx="36.5" cy="33" r="1.8" fill="#2b1d0e" />
            <path
              d="M26 39 Q32 44 38 39"
              fill="none"
              stroke="#2b1d0e"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Gorra con visera */}
            <path
              d="M17 26 Q32 14 46 25 L52 28 L17 28 Z"
              fill="#8b5a2b"
              stroke="#2b1d0e"
              strokeWidth="2"
            />
          </>
        )}

        {difficulty === 'medio' && (
          <>
            {/* Don Ramón: gaucho con boina vasca, bigote tupido y mate */}
            <path d="M12 64 C15 47 49 47 52 64 Z" fill="#8b5a2b" stroke="#2b1d0e" strokeWidth="2" />
            <polygon points="25,47 32,57 39,47" fill="#b22222" />
            <circle cx="32" cy="34" r="13" fill="#eab885" stroke="#2b1d0e" strokeWidth="2" />
            <circle cx="27.5" cy="32" r="1.7" fill="#2b1d0e" />
            <circle cx="36.5" cy="32" r="1.7" fill="#2b1d0e" />
            {/* Bigote */}
            <path d="M23 39 Q28 36 32 39 Q36 36 41 39 Q36 42 32 40 Q28 42 23 39 Z" fill="#3e2723" />
            {/* Boina vasca */}
            <ellipse
              cx="31"
              cy="21"
              rx="17"
              ry="6"
              fill="#2b1d0e"
              stroke="#2b1d0e"
              strokeWidth="1.5"
            />
            <line x1="31" y1="13" x2="33" y2="16" stroke="#2b1d0e" strokeWidth="2" />
            {/* Mate y bombilla en esquina */}
            <ellipse
              cx="50"
              cy="52"
              rx="6"
              ry="7"
              fill="#5b3a1e"
              stroke="#2b1d0e"
              strokeWidth="1.6"
            />
            <line x1="48" y1="46" x2="43" y2="37" stroke="#cfd8dc" strokeWidth="2.2" />
          </>
        )}

        {difficulty === 'dificil' && (
          <>
            {/* El Viejo Vizcacha: poncho con guarda, barba canosa, guiño pícaro y chambergo */}
            <path d="M10 64 C14 46 50 46 54 64 Z" fill="#a0703c" stroke="#2b1d0e" strokeWidth="2" />
            <path d="M22 48 L32 62 L42 48" fill="none" stroke="#f4ead5" strokeWidth="2.5" />
            <circle cx="32" cy="34" r="13" fill="#e2b07e" stroke="#2b1d0e" strokeWidth="2" />
            {/* Barba canosa */}
            <path
              d="M20 36 Q32 52 44 36 Q39 45 32 45 Q25 45 20 36 Z"
              fill="#dcdcdc"
              stroke="#5b3a1e"
              strokeWidth="1.4"
            />
            {/* Guiño pícaro en ojo izquierdo, ojo derecho abierto */}
            <path d="M25 32 Q27.5 30 30 32" fill="none" stroke="#2b1d0e" strokeWidth="2" />
            <circle cx="36.5" cy="32" r="1.8" fill="#2b1d0e" />
            <path d="M26 39 Q32 42 38 38" fill="none" stroke="#2b1d0e" strokeWidth="1.8" />
            {/* Sombrero chambergo criollo */}
            <ellipse
              cx="32"
              cy="22"
              rx="21"
              ry="4"
              fill="#5b3a1e"
              stroke="#2b1d0e"
              strokeWidth="1.8"
            />
            <path
              d="M20 22 L23 12 H41 L44 22 Z"
              fill="#5b3a1e"
              stroke="#2b1d0e"
              strokeWidth="1.8"
            />
            <rect x="21.5" y="19" width="21" height="2.5" fill="#b22222" />
          </>
        )}
      </svg>
    </span>
  );
}
