import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import styles from './SpeechBubble.module.css';

export interface SpeechBubbleProps {
  readonly text: string | null;
  readonly speakerName: string;
  readonly variant?: 'bot' | 'human';
}

export function SpeechBubble({ text, speakerName, variant = 'bot' }: SpeechBubbleProps) {
  const reduceMotion = useReducedMotion();

  return (
    <AnimatePresence mode="wait">
      {text && (
        <motion.div
          key={`${variant}-${text}`}
          role="status"
          aria-live="polite"
          aria-label={`Dicho de ${speakerName}`}
          className={`${styles.bubble} ${styles[variant]}`}
          initial={reduceMotion ? false : { opacity: 0, scale: 0.85, y: 4 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.18 }}
        >
          “{text}”
        </motion.div>
      )}
    </AnimatePresence>
  );
}
