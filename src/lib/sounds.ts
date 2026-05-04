let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume if suspended (browsers auto-suspend on page load)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    return ctx;
  } catch {
    return null;
  }
}

function playTone(
  freq: number,
  endFreq: number,
  duration: number,
  volume: number,
  type: OscillatorType = 'sine',
  delayMs = 0
) {
  const context = getCtx();
  if (!context) return;

  const startAt = context.currentTime + delayMs / 1000;

  try {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type;
    osc.connect(gain);
    gain.connect(context.destination);

    osc.frequency.setValueAtTime(freq, startAt);
    if (endFreq !== freq) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(0.001, endFreq),
        startAt + duration
      );
    }
    gain.gain.setValueAtTime(volume, startAt);
    gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
    osc.start(startAt);
    osc.stop(startAt + duration + 0.05);
  } catch {
    // ignore
  }
}

export function playMoveSound() {
  playTone(900, 500, 0.06, 0.08, 'square');
}

export function playDragStartSound() {
  playTone(660, 520, 0.03, 0.03, 'triangle');
}

export function playDragDropSound() {
  playTone(720, 420, 0.04, 0.04, 'square');
}

export function playCaptureSound() {
  playTone(220, 110, 0.1, 0.14, 'sawtooth');
  playTone(180, 90, 0.08, 0.1, 'sawtooth', 40);
}

export function playCastleSound() {
  playTone(440, 600, 0.08, 0.09, 'triangle');
  playTone(600, 800, 0.08, 0.07, 'triangle', 80);
}

export function playCheckSound() {
  playTone(880, 880, 0.12, 0.1, 'sine');
  playTone(1100, 1100, 0.1, 0.08, 'sine', 130);
}

export function playGameEndSound() {
  playTone(523, 523, 0.4, 0.1, 'sine');
  playTone(440, 440, 0.4, 0.09, 'sine', 120);
  playTone(349, 349, 0.6, 0.1, 'sine', 240);
}

export function playPromotionSound() {
  playTone(523, 784, 0.2, 0.1, 'sine');
  playTone(659, 987, 0.2, 0.08, 'sine', 100);
  playTone(784, 1047, 0.2, 0.07, 'sine', 200);
}
