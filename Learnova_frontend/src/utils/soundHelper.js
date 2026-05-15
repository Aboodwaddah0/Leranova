// Singleton AudioContext shared across all sound calls.
// A new AudioContext created programmatically is "suspended" by the browser's
// autoplay policy — sounds are only emitted once the context is "running",
// which requires a prior user gesture.  We hook into any click/key/touch event
// to resume it as early as possible.

let _ctx = null;

function _getCtx() {
  if (!_ctx) {
    try {
      _ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {
      return null;
    }
  }
  return _ctx;
}

function _resume() {
  const ac = _getCtx();
  if (ac && ac.state === 'suspended') {
    ac.resume().catch(() => {});
  }
}

// Resume on the earliest possible user gesture so subsequent tone() calls find
// the context in the "running" state.
if (typeof document !== 'undefined') {
  const unlock = () => {
    _resume();
    document.removeEventListener('click',      unlock, true);
    document.removeEventListener('keydown',    unlock, true);
    document.removeEventListener('touchstart', unlock, true);
    document.removeEventListener('pointerdown', unlock, true);
  };
  document.addEventListener('click',       unlock, true);
  document.addEventListener('keydown',     unlock, true);
  document.addEventListener('touchstart',  unlock, true);
  document.addEventListener('pointerdown', unlock, true);
}

function tone(freq, type, duration, gainVal = 0.18) {
  const ac = _getCtx();
  if (!ac) return;
  // If the context is still suspended (no user gesture yet), try a resume and
  // bail — we would rather emit no sound than throw an error.
  if (ac.state !== 'running') {
    ac.resume().catch(() => {});
    return;
  }
  try {
    const osc = ac.createOscillator();
    const g   = ac.createGain();
    osc.connect(g);
    g.connect(ac.destination);
    osc.type              = type;
    osc.frequency.value   = freq;
    g.gain.setValueAtTime(gainVal, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    osc.start();
    osc.stop(ac.currentTime + duration);
  } catch {
    // Ignore any edge-case errors (e.g. context closed after page unload)
  }
}

function chord(freqs, type, duration) {
  freqs.forEach((f, i) => setTimeout(() => tone(f, type, duration, 0.12), i * 60));
}

export const sound = {
  xp:          () => tone(880, 'sine',     0.18, 0.14),
  achievement: () => chord([523, 659, 784],      'triangle', 0.5),
  levelUp:     () => chord([392, 523, 659, 784], 'sine',     0.8),
  dismiss:     () => tone(330, 'sine',     0.12, 0.08),
};
