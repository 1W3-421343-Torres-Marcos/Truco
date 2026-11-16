import { useEffect } from 'react';
import {
  BOT_CHARACTERS,
  cardId,
  formatCard,
  getActivePlayer,
  getLegalActions,
  useGameStore,
  type Action,
} from '../../store/index.ts';
import { ActionBar } from '../components/ActionBar.tsx';
import { TrickBoard } from '../components/TrickBoard.tsx';
import styles from './TableScreen.module.css';

function formatStageLabel(score: number, target: 15 | 30): string {
  if (target === 15) return `${score}/15`;
  if (score < 15) return `${score} malas`;
  return `${score - 15} buenas (${score})`;
}

export function TableScreen() {
  const savedGame = useGameStore((s) => s.savedGame);
  const botSpeech = useGameStore((s) => s.botSpeech);
  const playHumanAction = useGameStore((s) => s.playHumanAction);
  const runBotTurn = useGameStore((s) => s.runBotTurn);
  const navigateTo = useGameStore((s) => s.navigateTo);

  const state = savedGame?.state ?? null;
  const activePlayer = state ? getActivePlayer(state.hand) : null;

  useEffect(() => {
    if (!state || state.winner !== null || activePlayer !== 'bot') {
      return;
    }
    const timer = window.setTimeout(() => {
      runBotTurn();
    }, 550);
    return () => window.clearTimeout(timer);
  }, [state, activePlayer, runBotTurn]);

  if (!savedGame || !state) {
    return null;
  }

  const character = BOT_CHARACTERS[savedGame.difficulty];
  const { hand } = state;
  const legalActions = getLegalActions(state);
  const isHumanTurn = activePlayer === 'human';

  const canPlayCard = (id: string): Extract<Action, { type: 'playCard' }> | undefined =>
    legalActions.find(
      (a): a is Extract<Action, { type: 'playCard' }> =>
        a.type === 'playCard' && cardId(a.card) === id,
    );

  return (
    <main className={styles.tablePage} aria-label="Mesa de Truco">
      <header className={styles.topBar}>
        <div className={styles.rivalHeader}>
          <span className={styles.rivalName}>
            {character.name} ({character.title})
          </span>
          {botSpeech && (
            <div className={styles.speechBubble} role="status" aria-live="polite">
              “{botSpeech}”
            </div>
          )}
        </div>

        <div className={styles.scoreboard} aria-label="Marcador">
          <div className={styles.scoreItem}>
            <span>Vos</span>
            <strong>{formatStageLabel(state.scores.human, state.targetScore)}</strong>
          </div>
          <div className={styles.scoreItem}>
            <span>{character.name}</span>
            <strong>{formatStageLabel(state.scores.bot, state.targetScore)}</strong>
          </div>
        </div>

        <button type="button" className={styles.navButton} onClick={() => navigateTo('home')}>
          Menú
        </button>
      </header>

      <div className={styles.statusStrip}>
        <span>
          Mano #{hand.handNumber} · Es mano:{' '}
          <strong>{hand.manoPlayer === 'human' ? 'Vos' : character.name}</strong>
        </span>
        <span>
          Turno:{' '}
          <strong>
            {hand.phase === 'handEnded'
              ? 'Mano terminada'
              : isHumanTurn
                ? 'Tu turno'
                : `${character.name} pensando...`}
          </strong>
        </span>
      </div>

      <section className={styles.botHandRow} aria-label="Cartas de la máquina">
        {hand.remainingCards.bot.map((_, idx) => (
          <div key={`bot-card-${idx}`} className={styles.cardBack}>
            Dorso
          </div>
        ))}
      </section>

      <section className={styles.centerZone} aria-label="Zona central de la mesa">
        <TrickBoard
          tricks={hand.tricks}
          currentTrickIndex={hand.currentTrickIndex}
          rivalName={character.name}
        />
      </section>

      <section className={styles.myHandSection} aria-label="Tus cartas">
        <div className={styles.myCardsRow}>
          {hand.remainingCards.human.map((card) => {
            const id = cardId(card);
            const playAction = isHumanTurn ? canPlayCard(id) : undefined;
            const label = formatCard(card);
            return (
              <button
                key={id}
                type="button"
                aria-label={label}
                disabled={!playAction}
                className={styles.cardButton}
                onClick={() => {
                  if (playAction) {
                    playHumanAction(playAction);
                  }
                }}
              >
                <span className={styles.cardCorner}>{card.number}</span>
                <span className={styles.cardSuit}>{card.suit}</span>
                <span className={styles.cardCorner}>{card.number}</span>
              </button>
            );
          })}
        </div>

        <ActionBar
          hand={hand}
          rivalName={character.name}
          legalActions={legalActions}
          isHumanTurn={isHumanTurn}
          onAction={playHumanAction}
        />
      </section>
    </main>
  );
}
