import { useState } from 'react';
import { useGameStore, type CardNumber, type Suit } from '../../store/index.ts';
import { SpanishCard } from '../cards/SpanishCard.tsx';
import styles from './RulesScreen.module.css';

interface TutorialLesson {
  readonly title: string;
  readonly prompt: string;
  readonly cards: ReadonlyArray<{ readonly suit: Suit; readonly number: CardNumber }>;
  readonly options: readonly string[];
  readonly correctIndex: number;
  readonly explanation: string;
}

const TUTORIAL_LESSONS: readonly TutorialLesson[] = [
  {
    title: 'Lección 1: Las cartas bravas',
    prompt:
      'El rival abrió la baza tirando el 7 de oro. Mirá tus 3 cartas: ¿con cuál le ganás la baza?',
    cards: [
      { suit: 'copa', number: 3 },
      { suit: 'espada', number: 7 },
      { suit: 'oro', number: 1 },
    ],
    options: [
      'Con el 1 de oro (ancho falso)',
      'Con el 7 de espada (siete bravo)',
      'Con el 3 de copa',
    ],
    correctIndex: 1,
    explanation:
      '¡Exacto! El 7 de espada (3ª carta más alta del juego) mata al 7 de oro (4ª más alta). El 3 y el 1 de oro están por debajo.',
  },
  {
    title: 'Lección 2: Cómo sumar el Envido',
    prompt:
      'Te tocaron el 7 de basto, el 6 de basto y el 12 de espada. ¿Cuántos tantos de envido tenés?',
    cards: [
      { suit: 'basto', number: 7 },
      { suit: 'basto', number: 6 },
      { suit: 'espada', number: 12 },
    ],
    options: [
      '13 tantos (7 + 6)',
      '27 tantos (20 + 7)',
      '33 tantos (20 + 7 + 6, el máximo posible)',
    ],
    correctIndex: 2,
    explanation:
      '¡Bien ahí! Al tener dos cartas del mismo palo (basto), sumás 20 + 7 + 6 = 33, que es el envido más alto del Truco sin Flor.',
  },
  {
    title: 'Lección 3: Cómo definen las pardas',
    prompt:
      'En la 1ª baza ganaste vos con un 2, y en la 2ª baza empataron (ambos tiraron un 3). ¿Cómo sigue la mano?',
    cards: [
      { suit: 'espada', number: 2 },
      { suit: 'copa', number: 3 },
      { suit: 'oro', number: 3 },
    ],
    options: [
      'Ganás la mano inmediatamente vos (sin jugar la 3ª baza)',
      'Se juega sí o sí la 3ª baza para desempatar',
      'Gana siempre el que es mano',
    ],
    correctIndex: 0,
    explanation:
      '¡Correcto! Cuando la 1ª baza tiene ganador y la 2ª sale parda, gana la mano quien ganó la 1ª baza.',
  },
  {
    title: 'Lección 4: "El envido está primero"',
    prompt:
      'Recién empieza la 1ª baza, todavía no tiraste tu primera carta y el rival te canta ¡Truco! de entrada. Tenés 31 de envido. ¿Qué podés hacer?',
    cards: [
      { suit: 'oro', number: 7 },
      { suit: 'oro', number: 4 },
      { suit: 'copa', number: 4 },
    ],
    options: [
      'Ya perdiste el derecho al envido porque cantaron Truco antes',
      'Podés cantar Envido primero; se resuelve el envido y después respondés al Truco',
      'Solo podés irte al mazo',
    ],
    correctIndex: 1,
    explanation:
      '¡Tal cual! En la 1ª baza "el envido está primero": podés responder con Envido, sumar tus tantos y recién después contestar el Truco pendiente.',
  },
];

export function RulesScreen() {
  const navigateTo = useGameStore((s) => s.navigateTo);
  const [activeTab, setActiveTab] = useState<'rules' | 'tutorial'>('rules');
  const [lessonIndex, setLessonIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const lesson = TUTORIAL_LESSONS[lessonIndex]!;

  const selectLesson = (idx: number) => {
    setLessonIndex(idx);
    setSelectedOption(null);
  };

  return (
    <main className={styles.container}>
      <section className={styles.card} aria-label="Reglas y Tutorial del Truco">
        <header className={styles.header}>
          <h1 className={styles.title}>Reglas y Tutorial</h1>
          <button type="button" className={styles.backButton} onClick={() => navigateTo('home')}>
            Volver
          </button>
        </header>

        <div className={styles.tabs} role="tablist" aria-label="Secciones de ayuda">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'rules'}
            className={`${styles.tabButton} ${activeTab === 'rules' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('rules')}
          >
            Reglas y Tablas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'tutorial'}
            className={`${styles.tabButton} ${activeTab === 'tutorial' ? styles.tabButtonActive : ''}`}
            onClick={() => setActiveTab('tutorial')}
          >
            Tutorial Interactivo
          </button>
        </div>

        {activeTab === 'rules' ? (
          <>
            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>Jerarquía de cartas (de mayor a menor)</h2>
              <div className={styles.cardsShowcase}>
                <div className={styles.rankCardItem}>
                  <SpanishCard suit="espada" number={1} size="sm" />
                  <span>1º Macho</span>
                </div>
                <div className={styles.rankCardItem}>
                  <SpanishCard suit="basto" number={1} size="sm" />
                  <span>2º Hembra</span>
                </div>
                <div className={styles.rankCardItem}>
                  <SpanishCard suit="espada" number={7} size="sm" />
                  <span>3º Siete♠</span>
                </div>
                <div className={styles.rankCardItem}>
                  <SpanishCard suit="oro" number={7} size="sm" />
                  <span>4º Siete♦</span>
                </div>
              </div>
              <p className={styles.text}>
                1 de espada → 1 de basto → 7 de espada → 7 de oro → los 3 → los 2 → 1 de oro y 1 de
                copa → los 12 → los 11 → los 10 → 7 de basto y 7 de copa → los 6 → los 5 → los 4.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>El Envido (sin Flor)</h2>
              <p className={styles.text}>
                Se canta en la 1ª baza antes de tirar la primera carta. Con dos cartas del mismo
                palo sumás 20 más sus valores (10, 11 y 12 valen 0). Si empatan, gana el que es
                mano. Envido vale 2 pts (1 no querido), Real Envido 3 pts y Falta Envido en malas
                gana el partido y en buenas (o a 15) vale lo que le falta al puntero.
              </p>
            </div>

            <div className={styles.section}>
              <h2 className={styles.sectionTitle}>El Truco, las pardas e irse al mazo</h2>
              <p className={styles.text}>
                Gana la mano quien gana 2 de las 3 bazas (Truco = 2 pts, Retruco = 3 pts, Vale
                Cuatro = 4 pts). Si la 1ª baza sale parda, define la 2ª; si la 1ª tiene ganador y la
                2ª sale parda, gana quien ganó la 1ª. Irse al mazo en 1ª baza sin haberse cantado
                envido otorga 2 puntos al rival.
              </p>
            </div>
          </>
        ) : (
          <div className={styles.section} aria-label="Lección interactiva">
            <h2 className={styles.sectionTitle}>
              {lesson.title} ({lessonIndex + 1}/{TUTORIAL_LESSONS.length})
            </h2>
            <p className={styles.text}>{lesson.prompt}</p>

            <div className={styles.cardsShowcase}>
              {lesson.cards.map((c, idx) => (
                <SpanishCard key={idx} suit={c.suit} number={c.number} size="sm" />
              ))}
            </div>

            <div className={styles.quizOptions}>
              {lesson.options.map((opt, idx) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={selectedOption === idx}
                  className={`${styles.quizOption} ${selectedOption === idx ? styles.quizOptionSelected : ''}`}
                  onClick={() => setSelectedOption(idx)}
                >
                  {opt}
                </button>
              ))}
            </div>

            {selectedOption !== null && (
              <p
                role="status"
                className={
                  selectedOption === lesson.correctIndex
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong
                }
              >
                {selectedOption === lesson.correctIndex
                  ? lesson.explanation
                  : 'No es esa opción. ¡Probá con otra para ver la explicación!'}
              </p>
            )}

            <div className={styles.lessonNav}>
              <button
                type="button"
                className={styles.lessonButton}
                disabled={lessonIndex === 0}
                onClick={() => selectLesson(lessonIndex - 1)}
              >
                Lección anterior
              </button>
              <button
                type="button"
                className={styles.lessonButton}
                disabled={lessonIndex === TUTORIAL_LESSONS.length - 1}
                onClick={() => selectLesson(lessonIndex + 1)}
              >
                Siguiente lección
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
