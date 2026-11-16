import { BOT_CHARACTERS, DIFFICULTIES, useGameStore } from '../../store/index.ts';
import styles from './StatsScreen.module.css';

function formatRate(won: number, played: number): string {
  if (played === 0) return '0 %';
  return `${Math.round((won / played) * 100)} %`;
}

export function StatsScreen() {
  const stats = useGameStore((s) => s.stats);
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-label="Estadísticas">
        <header className={styles.header}>
          <h1 className={styles.title}>Estadísticas</h1>
          <button type="button" className={styles.backButton} onClick={() => navigateTo('home')}>
            Volver
          </button>
        </header>

        <div className={styles.grid}>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.gamesPlayed}</span>
            <span className={styles.statLabel}>Partidas jugadas</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>
              {formatRate(stats.gamesWon, stats.gamesPlayed)}
            </span>
            <span className={styles.statLabel}>Victorias ({stats.gamesWon})</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.currentStreak}</span>
            <span className={styles.statLabel}>Racha actual</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>{stats.bestStreak}</span>
            <span className={styles.statLabel}>Mejor racha</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>
              {formatRate(stats.envidosWon, stats.envidosPlayed)}
            </span>
            <span className={styles.statLabel}>
              Envidos ({stats.envidosWon}/{stats.envidosPlayed})
            </span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statValue}>
              {formatRate(stats.trucosWon, stats.trucosPlayed)}
            </span>
            <span className={styles.statLabel}>
              Trucos ({stats.trucosWon}/{stats.trucosPlayed})
            </span>
          </div>
        </div>

        <h2 className={styles.subTitle}>Por rival</h2>
        <div className={styles.diffList}>
          {DIFFICULTIES.map((diff) => {
            const row = stats.byDifficulty[diff];
            const char = BOT_CHARACTERS[diff];
            return (
              <div key={diff} className={styles.diffRow}>
                <strong>{char.name}</strong>
                <span>
                  {row.won} ganadas de {row.played} ({formatRate(row.won, row.played)})
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
