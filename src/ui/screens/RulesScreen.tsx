import { useGameStore } from '../../store/index.ts';
import styles from './RulesScreen.module.css';

export function RulesScreen() {
  const navigateTo = useGameStore((s) => s.navigateTo);

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-label="Reglas del Truco">
        <header className={styles.header}>
          <h1 className={styles.title}>Reglas del Truco</h1>
          <button type="button" className={styles.backButton} onClick={() => navigateTo('home')}>
            Volver
          </button>
        </header>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Jerarquía de cartas (de mayor a menor)</h2>
          <p className={styles.text}>
            1 de espada → 1 de basto → 7 de espada → 7 de oro → los 3 → los 2 → 1 de oro y 1 de copa
            → los 12 → los 11 → los 10 → 7 de basto y 7 de copa → los 6 → los 5 → los 4.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>El Envido (sin Flor)</h2>
          <p className={styles.text}>
            Se canta en la 1ª baza antes de tirar la primera carta. Con dos cartas del mismo palo
            sumás 20 más sus valores (10, 11 y 12 valen 0). Si empatan, gana el que es mano. Falta
            Envido: en malas gana el partido; en buenas (o a 15) vale lo que le falta al que va
            ganando.
          </p>
        </div>

        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>El Truco y las pardas</h2>
          <p className={styles.text}>
            Gana la mano quien gana 2 de las 3 bazas. Si la 1ª baza sale parda, define la 2ª; si la
            1ª tiene ganador y la 2ª sale parda, gana quien ganó la 1ª. Irse al mazo en 1ª baza sin
            haberse cantado envido otorga 2 puntos al rival.
          </p>
        </div>
      </section>
    </main>
  );
}
