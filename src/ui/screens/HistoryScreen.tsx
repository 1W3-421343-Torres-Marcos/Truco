import { BOT_CHARACTERS, useGameStore } from '../../store/index.ts';
import styles from './HistoryScreen.module.css';

export function HistoryScreen() {
  const history = useGameStore((s) => s.history);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const clearHistoryRecords = useGameStore((s) => s.clearHistoryRecords);

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-label="Historial de partidas">
        <header className={styles.header}>
          <h1 className={styles.title}>Historial de partidas</h1>
          <button type="button" className={styles.backButton} onClick={() => navigateTo('home')}>
            Volver
          </button>
        </header>

        {history.length === 0 ? (
          <p className={styles.empty}>Todavía no hay partidas terminadas.</p>
        ) : (
          <>
            <ul className={styles.list}>
              {history.map((rec) => {
                const character = BOT_CHARACTERS[rec.difficulty];
                const outcomeLabel = rec.abandoned
                  ? 'Abandonada (Derrota)'
                  : rec.winner === 'human'
                    ? 'Victoria'
                    : 'Derrota';
                return (
                  <li key={rec.id} className={styles.item}>
                    <div className={styles.itemTop}>
                      <span>
                        {outcomeLabel} vs. {character.name}
                      </span>
                      <span>
                        Vos {rec.finalScore.human} — {rec.finalScore.bot} {character.name}
                      </span>
                    </div>
                    <div className={styles.itemMeta}>
                      A {rec.target} pts · {rec.handsPlayed} mano(s) · {rec.durationSec}s
                    </div>
                  </li>
                );
              })}
            </ul>

            <button type="button" className={styles.clearButton} onClick={clearHistoryRecords}>
              Borrar historial
            </button>
          </>
        )}
      </section>
    </main>
  );
}
