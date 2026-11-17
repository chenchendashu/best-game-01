import { PLAYER, PALETTE } from './config.js';
import { range, pick } from './random.js';
import { createWorld } from './world.js';
import { createEnemy, createProjectile, createEnemyBolt, createShard, createParticles, createFloatingText, updateOrbitingEmbers } from './entities.js';
import { drawChoices } from './upgrades.js';

function stageBattle(world) {
  world.state = 'playing';
  world.elapsed = 137.8;
  world.visualTime = 38;
  Object.assign(world.player, { x: 710, y: 488, hp: 83, maxHp: 122, level: 8,
    xp: 43, xpNext: Math.round(PLAYER.xpBase * PLAYER.xpGrowth ** 7), damage: 43,
    fireRate: 6.6, shots: 3, pierce: 1, magnet: 166, orbitCount: 2, aim: -0.44, muzzle: 0.045 });
  world.score = 12580;
  world.kills = 187;
  world.combo = 17;
  world.comboTimer = 2.3;
  world.maxCombo = 27;
  world.upgradeStacks = { damage: 3, fireRate: 2, projectiles: 2, pierce: 1, orbit: 2 };
  world.director.minute = 2;
  world.director.nextElite = 180;
  const positions = [
    [314, 296], [1086, 562], [492, 270], [934, 317], [420, 579], [1134, 414],
    [1040, 679], [214, 468], [637, 676], [1220, 269], [846, 647], [773, 265],
    [515, 714], [1174, 712], [202, 669], [346, 712], [1300, 590], [579, 394],
    [866, 429], [989, 503], [430, 421], [327, 558], [1081, 245], [656, 229],
  ];
  positions.forEach(([x, y], index) => {
    const kind = index === 5 ? 'brood' : index === 3 ? 'imp' : pick(world.rng, ['moth', 'moth', 'imp', 'brood', 'wisp']);
    const enemy = createEnemy(kind, x + range(world.rng, -12, 12), y + range(world.rng, -12, 12), world.rng, index === 5, world.elapsed, world.nextId++);
    enemy.age = range(world.rng, 2, 9);
    enemy.aim = Math.atan2(world.player.y - enemy.y, world.player.x - enemy.x);
    if (index === 3) { enemy.ai = 'charge'; enemy.dashX = -0.77; enemy.dashY = 0.64; }
    if (enemy.elite) enemy.hp *= 0.64;
    if (index === 18) enemy.flash = 0.1;
    world.enemies.push(enemy);
  });
  for (let i = 0; i < 28; i++) {
    const angle = range(world.rng, 0, Math.PI * 2);
    const distance = range(world.rng, 83, 340);
    const shard = createShard(world.player.x + Math.cos(angle) * distance, world.player.y + Math.sin(angle) * distance * 0.62, 4, world.rng);
    shard.age = 3;
    world.shards.push(shard);
  }
  for (let i = 0; i < 9; i++) {
    const angle = world.player.aim + (i % 3 - 1) * 0.14;
    const distance = 83 + Math.floor(i / 3) * 77;
    const shot = createProjectile(world.player, angle, world.nextId++);
    shot.x = world.player.x + Math.cos(angle) * distance;
    shot.y = world.player.y + Math.sin(angle) * distance;
    world.projectiles.push(shot);
  }
  for (const [x, y] of [[1092, 593], [496, 293], [962, 267]]) {
    const bolt = createEnemyBolt({ x, y, elite: false, damage: 13, phase: 0 }, world.player);
    bolt.x += bolt.vx * 0.8;
    bolt.y += bolt.vy * 0.8;
    world.bolts.push(bolt);
  }
  for (const [x, y, color] of [[866, 429, PALETTE.gold], [568, 528, PALETTE.teal], [998, 362, PALETTE.ember]]) {
    world.particles.push(...createParticles(x, y, color, 19, world.rng));
  }
  world.texts.push(createFloatingText(866, 397, '43', PALETTE.gold, true), createFloatingText(895, 376, '43', PALETTE.cream));
  updateOrbitingEmbers(world);
}

export function createStagedScene(params) {
  const scene = params.get('scene');
  if (!['title', 'battle', 'levelup', 'gameover'].includes(scene)) return null;
  const requestedSeed = Number(params.get('seed') ?? 42);
  const seed = Number.isFinite(requestedSeed) ? requestedSeed >>> 0 : 42;
  const world = createWorld(seed);
  world.staged = true;
  world.visualTime = 18;
  if (scene === 'title') return world;
  stageBattle(world);
  if (scene === 'levelup') {
    world.state = 'levelup';
    world.player.level = 9;
    world.player.xp = 9;
    world.player.xpNext = Math.round(PLAYER.xpBase * PLAYER.xpGrowth ** 8);
    world.choices = drawChoices(world);
  } else if (scene === 'gameover') {
    world.state = 'gameover';
    world.elapsed = 236.4;
    world.player.hp = 0;
    world.player.level = 12;
    world.kills = 312;
    world.score = 23045;
    world.maxCombo = 29;
    world.combo = 0;
    world.projectiles = [];
    world.texts = [];
    world.orbits = [];
  }
  return world;
}
