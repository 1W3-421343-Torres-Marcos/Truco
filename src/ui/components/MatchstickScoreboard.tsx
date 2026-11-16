import type { TargetScore } from '../../store/index.ts';
import styles from './MatchstickScoreboard.module.css';

export interface MatchstickScoreboardProps {
  readonly humanScore: number;
  readonly botScore: number;
  readonly targetScore: TargetScore;
  readonly rivalName: string;
}

interface StickCoords {
  readonly x1: number;
  readonly y1: number;
  readonly x2: number;
  readonly y2: number;
}

const FIVE_STICKS: readonly StickCoords[] = [
  { x1: 4, y1: 18, x2: 4, y2: 4 }, // 1: izquierda
  { x1: 4, y1: 4, x2: 18, y2: 4 }, // 2: arriba
  { x1: 18, y1: 4, x2: 18, y2: 18 }, // 3: derecha
  { x1: 18, y1: 18, x2: 4, y2: 18 }, // 4: abajo
  { x1: 5, y1: 17, x2: 17, y2: 5 }, // 5: diagonal
];

function MatchGroup({ count }: { readonly count: number }) {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" className={styles.groupSvg} aria-hidden="true">
      <rect
        x="2"
        y="2"
        width="18"
        height="18"
        rx="2"
        fill="none"
        stroke="rgba(244, 234, 213, 0.14)"
        strokeWidth="1"
      />
      {FIVE_STICKS.slice(0, count).map((stick, idx) => (
        <g key={idx}>
          <line
            x1={stick.x1}
            y1={stick.y1}
            x2={stick.x2}
            y2={stick.y2}
            stroke="#e5c07b"
            strokeWidth="2.1"
            strokeLinecap="round"
          />
          <circle cx={stick.x2} cy={stick.y2} r="1.9" fill="#d32f2f" />
        </g>
      ))}
    </svg>
  );
}

function formatScoreTag(score: number, targetScore: TargetScore): string {
  if (targetScore === 15) return `${score}/15`;
  if (score < 15) return `${score} malas`;
  return `${score - 15} buenas (${score})`;
}

function PlayerMatchRow({
  label,
  score,
  targetScore,
}: {
  readonly label: string;
  readonly score: number;
  readonly targetScore: TargetScore;
}) {
  const totalGroups = targetScore === 30 ? 6 : 3;
  const groups = Array.from({ length: totalGroups }, (_, groupIdx) => {
    const remaining = score - groupIdx * 5;
    return Math.max(0, Math.min(5, remaining));
  });

  return (
    <div className={styles.row}>
      <div className={styles.playerInfo}>
        <span className={styles.playerName}>{label}</span>
        <strong className={styles.stageText}>{formatScoreTag(score, targetScore)}</strong>
      </div>

      <div className={styles.matchesRow} data-testid={`matches-${label}`}>
        {groups.slice(0, 3).map((cnt, idx) => (
          <MatchGroup key={`m-${idx}`} count={cnt} />
        ))}
        {targetScore === 30 && (
          <>
            <span className={styles.divider} title="División malas / buenas" />
            {groups.slice(3, 6).map((cnt, idx) => (
              <MatchGroup key={`b-${idx}`} count={cnt} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}

export function MatchstickScoreboard({
  humanScore,
  botScore,
  targetScore,
  rivalName,
}: MatchstickScoreboardProps) {
  return (
    <div className={styles.board} aria-label="Marcador">
      <PlayerMatchRow label="Vos" score={humanScore} targetScore={targetScore} />
      <PlayerMatchRow label={rivalName} score={botScore} targetScore={targetScore} />
    </div>
  );
}
