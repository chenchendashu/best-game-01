import { MUSIC } from './config.js';

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let noteIndex = 0;
  const lastSound = new Map();

  function tone(frequency, duration, type = 'sine', volume = 0.1, endFrequency = frequency, delay = 0) {
    if (!context || context.state !== 'running') return;
    const now = context.currentTime + delay;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain).connect(master);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function chord(notes, duration, volume, stagger = 0.08) {
    notes.forEach((frequency, index) => tone(frequency, duration, 'sine', volume, frequency, index * stagger));
  }
  function limited(name, interval, play) {
    if (!context || muted) return;
    const now = context.currentTime;
    if (now - (lastSound.get(name) ?? -Infinity) < interval) return;
    lastSound.set(name, now);
    play();
  }
  function musicBeat() {
    if (!context || context.state !== 'running' || muted) return;
    const note = MUSIC.notes[noteIndex % MUSIC.notes.length];
    tone(note * 2, 0.7, 'sine', MUSIC.volume * 0.13);
    if (noteIndex % 4 === 0) {
      tone(note / 2, 2.8, 'sine', MUSIC.volume * 0.23);
      tone(note / 2 * 1.004, 2.8, 'triangle', MUSIC.volume * 0.12);
    }
    noteIndex++;
  }
  function unlock() {
    if (!context) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      context = new AudioContext();
      master = context.createGain();
      master.gain.value = muted ? 0 : 0.72;
      master.connect(context.destination);
      musicTimer = window.setInterval(musicBeat, MUSIC.beat * 1000);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
  }
  function toggleMute() {
    muted = !muted;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 0.72, context.currentTime, 0.025);
    return muted;
  }
  const sfx = {
    shoot: () => limited('shoot', 0.05, () => tone(620, 0.1, 'triangle', 0.075, 190)),
    hit: () => limited('hit', 0.055, () => tone(175, 0.065, 'square', 0.026, 70)),
    die: () => limited('die', 0.06, () => { tone(170, 0.15, 'triangle', 0.09, 40); tone(480, 0.08, 'sine', 0.035, 90); }),
    pickup: () => limited('pickup', 0.07, () => tone(1046.5, 0.14, 'sine', 0.046, 1396.9)),
    levelup: () => chord([523.25, 659.25, 783.99, 1046.5], 0.48, 0.12, 0.1),
    hurt: () => { tone(90, 0.25, 'triangle', 0.23, 25); tone(60, 0.15, 'sine', 0.16, 30); },
    sting: () => chord([146.83, 155.56, 293.66], 0.9, 0.13, 0.12),
    win: () => chord([523.25, 659.25, 783.99, 1046.5, 1318.51], 1, 0.15, 0.14),
    lose: () => chord([293.66, 261.63, 220, 146.83], 0.8, 0.12, 0.2),
    click: () => tone(880, 0.1, 'sine', 0.09, 660),
  };
  return { unlock, toggleMute, sfx, get muted() { return muted; },
    dispose() { if (musicTimer) window.clearInterval(musicTimer); if (context) context.close(); },
  };
}
