import { PLAYER, UPGRADE_TUNING as T } from './config.js';
import { shuffle } from './random.js';

export const UPGRADES = [
  { id: 'damage', name: 'Brighter flame', icon: '✦', category: 'FIREPOWER', color: '#ff9a3c',
    description: '+22% base shot damage. Give the dark something to fear.',
    effect: '+22% DAMAGE', apply: player => { player.damage += PLAYER.damage * T.damage; } },
  { id: 'fireRate', name: 'Quickened wick', icon: '»', category: 'FIREPOWER', color: '#ff9a3c',
    description: 'Fire 16% faster. A steady stream of small, fierce suns.',
    effect: '+16% FIRE RATE', apply: player => { player.fireRate *= 1 + T.fireRate; } },
  { id: 'speed', name: 'Lightfoot', icon: '↟', category: 'SURVIVAL', color: '#b7a1f0',
    description: 'Move 9% faster. Slip through the shadows before they close.',
    effect: '+9% MOVE SPEED', apply: player => { player.speed *= 1 + T.speed; } },
  { id: 'health', name: 'Second breath', icon: '♥', category: 'SURVIVAL', color: '#ef7995',
    description: '+22 maximum health, and restore 34 health right now.',
    effect: '+22 MAX HP · HEAL 34', apply: player => { player.maxHp += T.health; player.hp = Math.min(player.maxHp, player.hp + T.heal); } },
  { id: 'magnet', name: 'Embercall', icon: '⌁', category: 'GATHERING', color: '#39d0c4',
    description: 'Gather shards from 36 pixels farther away. Let them come to you.',
    effect: '+36 MAGNET RANGE', apply: player => { player.magnet += T.magnet; } },
  { id: 'projectiles', name: 'Forked fire', icon: '⋮', category: 'FIREPOWER', color: '#ffd166',
    description: 'One extra ember per shot. Up to four projectiles in a fan.',
    effect: '+1 PROJECTILE', available: player => player.shots < T.projectilesMax,
    apply: player => { player.shots = Math.min(T.projectilesMax, player.shots + 1); } },
  { id: 'pierce', name: 'Through the dark', icon: '➤', category: 'FIREPOWER', color: '#ffd166',
    description: 'Each shot passes through one more enemy. Make every ember count.',
    effect: '+1 PIERCING', apply: player => { player.pierce++; } },
  { id: 'regeneration', name: 'Living lantern', icon: '✚', category: 'SURVIVAL', color: '#ef7995',
    description: 'Recover 0.7 health each second. A little warmth goes a long way.',
    effect: '+0.7 HP / SECOND', apply: player => { player.regeneration += T.regeneration; } },
  { id: 'xpGain', name: 'Hungry spark', icon: '◆', category: 'GATHERING', color: '#39d0c4',
    description: 'Ember shards grant 18% more experience. Grow into the night.',
    effect: '+18% XP GAIN', apply: player => { player.xpGain += T.xpGain; } },
  { id: 'orbit', name: 'Little sun', icon: '◌', category: 'FIREPOWER', color: '#ff9a3c',
    description: 'An ember circles you, burning nearby enemies. Up to three companions.',
    effect: '+1 ORBITING EMBER', available: player => player.orbitCount < T.orbitMax,
    apply: player => { player.orbitCount = Math.min(T.orbitMax, player.orbitCount + 1); } },
];

export function drawChoices(world) {
  return shuffle(world.rng, UPGRADES.filter(upgrade => !upgrade.available || upgrade.available(world.player))).slice(0, 3);
}

export function applyUpgrade(world, index) {
  const upgrade = world.choices[index];
  if (!upgrade || (upgrade.available && !upgrade.available(world.player))) return false;
  upgrade.apply(world.player);
  world.upgradeStacks[upgrade.id] = (world.upgradeStacks[upgrade.id] || 0) + 1;
  world.lastUpgrade = upgrade.name;
  world.choices = [];
  world.shake = 0;
  world.player.fireCooldown = 0.12;
  return true;
}
