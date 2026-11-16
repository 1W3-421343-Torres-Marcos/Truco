import { useEffect } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BOT_CHARACTERS,
  cardId,
  formatCard,
  getActivePlayer,
  getLegalActions,
  useGameStore,
  type Action,
} from '../../store/index.ts';
import { SpanishCard } from '../cards/SpanishCard.tsx';
import { ActionBar } from '../components/ActionBar.tsx';
import { GauchoAvatar } from '../components/GauchoAvatar.tsx';
import { HandSummaryModal } from '../components/HandSummaryModal.tsx';
import { MatchstickScoreboard } from '../components/MatchstickScoreboard.tsx';
import { SpeechBubble } from '../components/SpeechBubble.tsx';
import { TrickBoard } from '../components/TrickBoard.tsx';
import styles from './TableScreen.module.css';

export function TableScreen() {
  const savedGame = useGameStore((s) => s.savedGame);
  const botSpeech = useGameStore((s) => s.botSpeech);
  const humanSpeech = useGameStore((s) => s.humanSpeech);
  const playHumanAction = useGameStore((s) => s.playHumanAction);
  const runBotTurn = useGameStore((s) => s.runBotTurn);
  const advanceToNextHand = useGameStore((s) => s.advanceToNextHand);
  const startNewGame = useGameStore((s) => s.startNewGame);
  const navigateTo = useGameStore((s) => s.navigateTo);

  const state = savedGame?.state ?? null;
  const activePlayer = state ? getActivePlayer(state.hand) : null;
  const reduceMotion = useReducedMotion();

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
        <div className={styles.rivalIdentity}>
          <GauchoAvatar difficulty={savedGame.difficulty} size={46} />
          <div className={styles.rivalHeader}>
            <span className={styles.rivalName}>
              {character.name} ({character.title})
            </span>
            <SpeechBubble text={botSpeech} speakerName={character.name} variant="bot" />
          </div>
        </div>

        <MatchstickScoreboard
          humanScore={state.scores.human}
          botScore={state.scores.bot}
          targetScore={state.targetScore}
          rivalName={character.name}
        />

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
        {hand.remainingCards.bot.map((botCard, idx) => (
          <motion.div
            key={`bot-card-${hand.handNumber}-${cardId(botCard)}`}
            initial={reduceMotion ? false : { opacity: 0, y: -24, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.22, delay: reduceMotion ? 0 : idx * 0.08 }}
          >
            {hand.phase === 'handEnded' ? (
              <SpanishCard suit={botCard.suit} number={botCard.number} size="sm" />
            ) : (
              <SpanishCard faceDown size="sm" />
            )}
          </motion.div>
        ))}
      </section>

      <section className={styles.centerZone} aria-label="Zona central de la mesa">
        <TrickBoard
          tricks={hand.tricks}
          currentTrickIndex={hand.currentTrickIndex}
          rivalName={character.name}
        />

        <HandSummaryModal
          state={state}
          rivalName={character.name}
          onNextHand={advanceToNextHand}
          onRematch={() =>
            startNewGame({
              difficulty: savedGame.difficulty,
              targetScore: state.targetScore,
            })
          }
          onGoHome={() => navigateTo('home')}
        />
      </section>

      <section className={styles.myHandSection} aria-label="Tus cartas">
        <SpeechBubble text={humanSpeech} speakerName="Vos" variant="human" />
        <div className={styles.myCardsRow}>
          {hand.remainingCards.human.map((card, idx) => {
            const id = cardId(card);
            const playAction = isHumanTurn ? canPlayCard(id) : undefined;
            const label = formatCard(card);
            return (
              <motion.button
                key={`${hand.handNumber}-${id}`}
                type="button"
                aria-label={label}
                disabled={!playAction}
                className={styles.cardButton}
                initial={reduceMotion ? false : { opacity: 0, y: 28, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.24, delay: reduceMotion ? 0 : idx * 0.08 }}
                whileTap={playAction && !reduceMotion ? { scale: 0.94 } : undefined}
                onClick={() => {
                  if (playAction) {
                    playHumanAction(playAction);
                  }
                }}
              >
                <SpanishCard suit={card.suit} number={card.number} size="md" />
              </motion.button>
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
