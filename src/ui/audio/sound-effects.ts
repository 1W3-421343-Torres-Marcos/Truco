import type { Difficulty, Settings } from '../../store/index.ts';

let sharedAudioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new Ctx();
    }
    if (sharedAudioCtx.state === 'suspended') {
      void sharedAudioCtx.resume();
    }
    return sharedAudioCtx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  durationSec: number,
  type: OscillatorType = 'triangle',
  gainPeak = 0.12,
  delaySec = 0,
): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  try {
    const startAt = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startAt);

    gain.gain.setValueAtTime(0.0001, startAt);
    gain.gain.exponentialRampToValueAtTime(gainPeak, startAt + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startAt);
    osc.stop(startAt + durationSec + 0.01);
  } catch {
    // Ignorar en entornos sin soporte de Web Audio
  }
}

/**
 * Efecto corto de barajar y repartir las 3 cartas sobre la mesa.
 */
export function playDealSound(settings: Settings): void {
  if (!settings.soundEnabled) return;
  playTone(210, 0.055, 'triangle', 0.08, 0);
  playTone(260, 0.055, 'triangle', 0.08, 0.07);
  playTone(310, 0.06, 'triangle', 0.09, 0.14);
}

/**
 * Efecto de apoyar / golpear la carta sobre la mesa de madera.
 */
export function playCardSound(settings: Settings): void {
  if (!settings.soundEnabled) return;
  playTone(155, 0.075, 'sine', 0.14, 0);
  playTone(95, 0.09, 'triangle', 0.12, 0.01);
}

/**
 * Acorde corto al cantar Envido o Truco.
 */
export function playCallSound(settings: Settings): void {
  if (!settings.soundEnabled) return;
  playTone(330, 0.12, 'triangle', 0.1, 0);
  playTone(440, 0.16, 'triangle', 0.1, 0.06);
}

/**
 * Efecto de festejo / mate al cerrar una mano.
 */
export function playWinSound(settings: Settings): void {
  if (!settings.soundEnabled) return;
  playTone(392, 0.12, 'sine', 0.1, 0);
  playTone(494, 0.12, 'sine', 0.1, 0.09);
  playTone(587, 0.2, 'triangle', 0.12, 0.18);
}

const VOICE_PARAMS: Readonly<Record<Difficulty, { pitch: number; rate: number }>> = {
  facil: { pitch: 1.12, rate: 1.06 },
  medio: { pitch: 0.96, rate: 0.95 },
  dificil: { pitch: 0.82, rate: 0.9 },
};

/**
 * Pronuncia la frase del personaje mediante `window.speechSynthesis` (voz es-AR si existe, si no es-*),
 * únicamente cuando tanto el sonido como la voz están habilitados en Settings.
 */
export function speakBotPhrase(text: string, difficulty: Difficulty, settings: Settings): void {
  if (!settings.soundEnabled || !settings.voiceEnabled) return;
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const synth = window.speechSynthesis;
    if (!synth || typeof SpeechSynthesisUtterance === 'undefined') return;

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = synth.getVoices ? synth.getVoices() : [];
    const arVoice =
      voices.find((v) => v.lang.toLowerCase().startsWith('es-ar')) ??
      voices.find((v) => v.lang.toLowerCase().startsWith('es'));
    if (arVoice) {
      utterance.voice = arVoice;
    }
    utterance.lang = arVoice?.lang ?? 'es-AR';
    utterance.pitch = VOICE_PARAMS[difficulty].pitch;
    utterance.rate = VOICE_PARAMS[difficulty].rate;
    synth.speak(utterance);
  } catch {
    // Ignorar si speechSynthesis no está disponible
  }
}
