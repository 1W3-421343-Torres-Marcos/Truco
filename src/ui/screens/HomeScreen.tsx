import { BOT_CHARACTERS, hasResumableGame, useGameStore } from '../../store/index.ts';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const savedGame = useGameStore((s) => s.savedGame);
  const settings = useGameStore((s) => s.settings);
  const navigateTo = useGameStore((s) => s.navigateTo);
  const continueSavedGame = useGameStore((s) => s.continueSavedGame);
  const updateSettings = useGameStore((s) => s.updateSettings);

  const canResume = hasResumableGame(savedGame);
  const rivalName = savedGame ? BOT_CHARACTERS[savedGame.difficulty].name : '';

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-label="Menú principal">
        <header className={styles.header}>
          <h1 className={styles.title}>Truco Argentino</h1>
          <p className={styles.subtitle}>Mano a mano en el campo</p>
        </header>

        {canResume && savedGame && (
          <div className={styles.resumeBox}>
            <p className={styles.resumeInfo}>
              Partida en curso contra {rivalName} ({savedGame.state.scores.human} a{' '}
              {savedGame.state.scores.bot}, a {savedGame.state.targetScore})
            </p>
            <button type="button" className={styles.primaryButton} onClick={continueSavedGame}>
              Continuar partida
            </button>
          </div>
        )}

        <nav className={styles.menu} aria-label="Navegación principal">
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => navigateTo('newGame')}
          >
            Nueva partida
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigateTo('history')}
          >
            Historial
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigateTo('stats')}
          >
            Estadísticas
          </button>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => navigateTo('rules')}
          >
            Reglas
          </button>
        </nav>

        <footer className={styles.footerToggles}>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => updateSettings({ soundEnabled: !settings.soundEnabled })}
          >
            Sonido: {settings.soundEnabled ? 'Activado' : 'Silenciado'}
          </button>
          <button
            type="button"
            className={styles.toggleButton}
            onClick={() => updateSettings({ voiceEnabled: !settings.voiceEnabled })}
          >
            Voz: {settings.voiceEnabled ? 'Activada' : 'Desactivada'}
          </button>
        </footer>
      </section>
    </main>
  );
}
