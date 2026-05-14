const ctx = () => {
  try { return new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
};

function tone(freq, type, duration, gainVal = 0.18) {
  const ac = ctx();
  if (!ac) return;
  const osc = ac.createOscillator();
  const g   = ac.createGain();
  osc.connect(g);
  g.connect(ac.destination);
  osc.type      = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(gainVal, ac.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
  osc.start();
  osc.stop(ac.currentTime + duration);
}

function chord(freqs, type, duration) {
  freqs.forEach((f, i) => setTimeout(() => tone(f, type, duration, 0.12), i * 60));
}

export const sound = {
  xp:          () => tone(880, 'sine', 0.18, 0.14),
  achievement: () => chord([523, 659, 784], 'triangle', 0.5),
  levelUp:     () => chord([392, 523, 659, 784], 'sine', 0.8),
  dismiss:     () => tone(330, 'sine', 0.12, 0.08),
};
