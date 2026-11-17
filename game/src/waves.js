import { ARENA, TIMING, DIRECTOR as D } from './config.js';
import { range, pick } from './random.js';
import { createEnemy } from './entities.js';

export function createDirector() { return { spawnTimer: D.firstSpawn, nextElite: TIMING.eliteEvery, minute: 0, surge: false }; }

export function waveIntensity(elapsed) {
  const phase = elapsed % 60;
  if (phase >= TIMING.lullStart) return D.lull;
  if (elapsed >= 60 && phase < TIMING.surgeLength) return D.surge;
  return 1;
}

export function chooseKind(rng, elapsed) {
  const roll = rng();
  const phase = D.phases.find(candidate => elapsed < candidate.until);
  const kinds = ['moth', 'imp', 'brood', 'wisp'];
  let threshold = 0;
  for (let index = 0; index < kinds.length; index++) {
    threshold += phase.mix[index];
    if (roll < threshold) return kinds[index];
  }
  return 'wisp';
}

export function spawnPosition(rng, player) {
  // Enter through the perimeter, never directly on the keeper.
  for (let attempt = 0; attempt < 8; attempt++) {
    const side = Math.floor(rng() * 4);
    const x = side === 0 ? ARENA.left - 30 : side === 1 ? ARENA.right + 30 : range(rng, ARENA.left, ARENA.right);
    const y = side === 2 ? ARENA.top - 25 : side === 3 ? ARENA.bottom + 25 : range(rng, ARENA.top, ARENA.bottom);
    if (Math.hypot(x - player.x, y - player.y) > D.safeDistance) return { x, y };
  }
  return { x: player.x < 720 ? ARENA.right + 30 : ARENA.left - 30, y: 450 };
}

function addEnemy(world, kind, elite) {
  if (world.enemies.length >= TIMING.enemyCap) return false;
  const position = spawnPosition(world.rng, world.player);
  world.enemies.push(createEnemy(kind, position.x, position.y, world.rng, elite, world.elapsed, world.nextId++));
  return true;
}

export function reserveEnemySlots(world, count) {
  const living = world.enemies.filter(enemy => !enemy.dead);
  const excess = Math.max(0, living.length + count - TIMING.enemyCap);
  if (!excess) return;
  // Retire the farthest ordinary shadows so splits and elites remain intact at the cap.
  living.sort((a, b) => Number(a.elite) - Number(b.elite) ||
    Math.hypot(b.x - world.player.x, b.y - world.player.y) - Math.hypot(a.x - world.player.x, a.y - world.player.y));
  for (const enemy of living.slice(0, excess)) enemy.dead = true;
}

export function updateDirector(world, dt, sfx) {
  const director = world.director;
  const minute = Math.floor(world.elapsed / 60);
  director.surge = minute > 0 && world.elapsed % 60 < TIMING.surgeLength;
  if (minute > director.minute) {
    director.minute = minute;
    world.banner = { text: 'THE NIGHT CLOSES IN', detail: `Wave ${minute + 1} · keep the lantern burning`, life: 3.2, color: '#ff9a3c' };
  }
  if (world.elapsed >= director.nextElite) {
    // Reserve room for the scheduled elite even when the clearing is crowded.
    reserveEnemySlots(world, 1);
    world.enemies = world.enemies.filter(enemy => !enemy.dead);
    const kind = pick(world.rng, ['moth', 'imp', 'brood', 'wisp']);
    addEnemy(world, kind, true);
    director.nextElite += TIMING.eliteEvery;
    world.banner = { text: 'A SHADOW STIRS', detail: `Elite ${kind} approaches`, life: 3.3, color: '#ef476f' };
    sfx.sting();
  }
  director.spawnTimer -= dt;
  if (director.spawnTimer <= 0) {
    const interval = Math.max(D.minInterval, D.baseInterval - world.elapsed * D.acceleration);
    director.spawnTimer += interval / waveIntensity(world.elapsed) * range(world.rng, D.jitterMin, D.jitterMax);
    addEnemy(world, chooseKind(world.rng, world.elapsed), false);
  }
}
