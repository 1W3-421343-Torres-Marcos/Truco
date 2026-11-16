import { useState } from 'react';
import {
  BOT_CHARACTERS,
  DIFFICULTIES,
  hasResumableGame,
  useGameStore,
  type Difficulty,
  type TargetScore,
} from '../../store/index.ts';
import styles from './NewGameScreen.module.css';

const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  facil: 'Fácil',
  medio: 'Medio',
  dificil: 'Difícil',
};

export function NewGameScreen() {
  const settings = useGameStore((s) => s.settings);
  const savedGame = useGameStore((s) => s.savedGame);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const navigateTo = useGameStore((s) => s.navigateTo);

  const [difficulty, setDifficulty] = useState<Difficulty>(settings.lastDifficulty);
  const [targetScore, setTargetScore] = useState<TargetScore>(settings.lastTarget);

  const willAbandonExisting = hasResumableGame(savedGame);

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-label="Configurar nueva partida">
        <h1 className={styles.title}>Nueva partida</h1>

        {willAbandonExisting && (
          <p className={styles.warning} role="alert">
            Tenés una partida en curso. Si empezás una nueva, la actual se registrará como
            abandonada.
          </p>
        )}

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>Elegí tu rival (dificultad)</legend>
          {DIFFICULTIES.map((diff) => {
            const character = BOT_CHARACTERS[diff];
            const selected = difficulty === diff;
            return (
              <button
                key={diff}
                type="button"
                aria-pressed={selected}
                className={`${styles.characterOption} ${selected ? styles.characterOptionSelected : ''}`}
                onClick={() => setDifficulty(diff)}
              >
                <span className={styles.characterHeader}>
                  {character.name} — {DIFFICULTY_LABELS[diff]} ({character.title})
                </span>
                <span className={styles.characterDesc}>{character.description}</span>
              </button>
            );
          })}
        </fieldset>

        <fieldset className={styles.fieldset}>
          <legend className={styles.legend}>¿A cuántos puntos?</legend>
          <div className={styles.targetRow}>
            {([15, 30] as const).map((pts) => {
              const selected = targetScore === pts;
              return (
                <button
                  key={pts}
                  type="button"
                  aria-pressed={selected}
                  className={`${styles.targetButton} ${selected ? styles.targetButtonSelected : ''}`}
                  onClick={() => setTargetScore(pts)}
                >
                  A {pts} {pts === 30 ? '(malas y buenas)' : 'puntos'}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className={styles.actions}>
          <button type="button" className={styles.backButton} onClick={() => navigateTo('home')}>
            Volver
          </button>
          <button
            type="button"
            className={styles.startButton}
            onClick={() => startNewGame({ difficulty, targetScore })}
          >
            ¡Repartir!
          </button>
        </div>
      </section>
    </main>
  );
}
