export const VIEW = { width: 1440, height: 900 };
export const ARENA = { left: 64, right: 1376, top: 158, bottom: 796 };
export const PALETTE = {
  night: '#0b1026', dawn: '#dba493', ember: '#ff9a3c', gold: '#ffd166',
  teal: '#39d0c4', cream: '#f5ead9', danger: '#ef476f', muted: '#a6a9bc',
  panel: '#11182c', violet: '#b7a1f0', ink: '#060b18',
};
export const TIMING = {
  dawn: 300, maxDt: 1 / 30, eliteEvery: 45, comboWindow: 3, surgeLength: 7,
  lullStart: 54, enemyCap: 90, particleCap: 560, projectileCap: 160, shardCap: 320,
  boltCap: 100, textCap: 90,
};
export const PLAYER = {
  radius: 16, speed: 226, hp: 100, damage: 23, fireRate: 3.8, bulletSpeed: 630,
  bulletLife: 1.55, bulletRadius: 5, magnet: 94, invulnerability: 0.8,
  knockback: 125, xpBase: 14, xpGrowth: 1.32, orbitRadius: 59, orbitDamage: 19,
  shotSpread: 0.14, muzzleTime: 0.075, orbitSpeed: 2.25, orbitCooldown: 0.36, orbitScaling: 0.38,
};
export const ELITE = { health: 4.5, scale: 1.6, speed: 1.1, damage: 1.45, xp: 7, score: 12, dashSpeed: 1.14, boltSpeed: 1.22, fireInterval: 0.65 };
export const DIRECTOR = {
  firstSpawn: 1.25, baseInterval: 1.38, acceleration: 0.0036, minInterval: 0.22,
  healthGrowth: 0.9, speedGrowth: 0.32, lull: 0.28, surge: 1.65,
  safeDistance: 220, jitterMin: 0.82, jitterMax: 1.18,
  phases: [
    { until: 16, mix: [1, 0, 0, 0] }, { until: 35, mix: [0.74, 0.26, 0, 0] },
    { until: 58, mix: [0.56, 0.29, 0.15, 0] }, { until: Infinity, mix: [0.38, 0.27, 0.18, 0.17] },
  ],
};
export const FEEL = { hitFlash: 0.115, knockback: 80, eliteKnockback: 26, hurtShake: 7, eliteShake: 9, hurtFlash: 0.25 };
export const SCORE = { comboBatch: 5, comboStep: 0.5, comboMax: 3, dawnHp: 10, dawnLevel: 100 };
export const ENEMIES = {
  moth: { name: 'Moth', radius: 17, hp: 30, speed: 72, damage: 11, xp: 3, score: 10, color: '#8fa6c8' },
  imp: { name: 'Imp', radius: 19, hp: 57, speed: 52, damage: 17, xp: 5, score: 20, color: '#ef7995', charge: 0.75, dashSpeed: 340, dashTime: 0.45, rest: 2.4 },
  brood: { name: 'Brood', radius: 29, hp: 112, speed: 35, damage: 21, xp: 9, score: 35, color: '#ae95d5' },
  wisp: { name: 'Wisp', radius: 18, hp: 54, speed: 60, damage: 13, xp: 6, score: 25, color: '#71c8d6', range: 265, shootEvery: 3.4, boltSpeed: 132 },
};
export const UPGRADE_TUNING = {
  damage: 0.22, fireRate: 0.16, speed: 0.09, health: 22, heal: 34, magnet: 36,
  projectilesMax: 4, regeneration: 0.7, xpGain: 0.18, orbitMax: 3,
};
export const MUSIC = { beat: 0.42, volume: 0.13, notes: [146.83, 174.61, 220, 261.63, 220, 174.61, 130.81, 174.61] };
export const FONT = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
export function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function timeLabel(seconds, roundUp = true) {
  const whole = Math.max(0, roundUp ? Math.ceil(seconds) : Math.floor(seconds));
  return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}
