import { VIEW, ARENA, ENEMIES, PLAYER, PALETTE, ELITE, DIRECTOR, clamp } from './config.js';
import { range } from './random.js';

export function createPlayer() {
  return {
    x: 720, y: 480, radius: PLAYER.radius, hp: PLAYER.hp, maxHp: PLAYER.hp,
    speed: PLAYER.speed, damage: PLAYER.damage, fireRate: PLAYER.fireRate,
    bulletSpeed: PLAYER.bulletSpeed, bulletLife: PLAYER.bulletLife, magnet: PLAYER.magnet,
    shots: 1, pierce: 0, regeneration: 0, xpGain: 1, orbitCount: 0,
    level: 1, xp: 0, xpNext: PLAYER.xpBase, aim: -Math.PI / 2,
    fireCooldown: 0, invulnerable: 0, muzzle: 0, vx: 0, vy: 0, walk: 0, moving: false,
  };
}

export function createEnemy(kind, x, y, rng, elite = false, elapsed = 0, id = 0) {
  const tuning = ENEMIES[kind];
  const healthScale = 1 + elapsed / 300 * DIRECTOR.healthGrowth;
  const hp = tuning.hp * healthScale * (elite ? ELITE.health : 1);
  return {
    id, kind, x, y, radius: tuning.radius * (elite ? ELITE.scale : 1), hp, maxHp: hp,
    speed: tuning.speed * (1 + elapsed / 300 * DIRECTOR.speedGrowth) * (elite ? ELITE.speed : 1),
    damage: tuning.damage * (elite ? ELITE.damage : 1), xp: tuning.xp * (elite ? ELITE.xp : 1),
    score: tuning.score * (elite ? ELITE.score : 1), color: tuning.color, elite, dead: false,
    phase: range(rng, 0, Math.PI * 2), age: 0, flash: 0, vx: 0, vy: 0,
    aim: 0, ai: 'roam', aiTimer: range(rng, 0.8, 2.8), dashX: 0, dashY: 0,
    shotTimer: range(rng, 1.2, 3.2), wantShoot: false, orbitCooldown: 0,
  };
}

export function updatePlayer(player, input, dt) {
  const direction = input.movement();
  player.moving = direction.x !== 0 || direction.y !== 0;
  if (player.moving) player.walk += dt * 12;
  player.x = clamp(player.x + (direction.x * player.speed + player.vx) * dt, ARENA.left + player.radius, ARENA.right - player.radius);
  player.y = clamp(player.y + (direction.y * player.speed + player.vy) * dt, ARENA.top + player.radius, ARENA.bottom - player.radius);
  player.vx *= Math.exp(-dt * 10);
  player.vy *= Math.exp(-dt * 10);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.muzzle = Math.max(0, player.muzzle - dt);
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.hp = Math.min(player.maxHp, player.hp + player.regeneration * dt);
}

export function updateEnemy(enemy, player, dt) {
  enemy.age += dt;
  enemy.flash = Math.max(0, enemy.flash - dt);
  enemy.orbitCooldown = Math.max(0, enemy.orbitCooldown - dt);
  const dx = player.x - enemy.x;
  const dy = player.y - enemy.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const nx = dx / distance;
  const ny = dy / distance;
  enemy.aim = Math.atan2(dy, dx);
  let moveX = nx;
  let moveY = ny;
  let speed = enemy.speed;

  if (enemy.kind === 'moth') {
    const wobble = Math.sin(enemy.age * 3.3 + enemy.phase) * 0.38;
    moveX -= ny * wobble;
    moveY += nx * wobble;
  } else if (enemy.kind === 'imp') {
    const tuning = ENEMIES.imp;
    enemy.aiTimer -= dt;
    if (enemy.ai === 'roam' && enemy.aiTimer <= 0 && distance < 600) {
      enemy.ai = 'charge';
      enemy.aiTimer = tuning.charge;
      enemy.dashX = nx;
      enemy.dashY = ny;
    } else if (enemy.ai === 'charge' && enemy.aiTimer <= 0) {
      enemy.ai = 'dash';
      enemy.aiTimer = tuning.dashTime;
    } else if (enemy.ai === 'dash' && enemy.aiTimer <= 0) {
      enemy.ai = 'roam';
      enemy.aiTimer = tuning.rest;
    }
    if (enemy.ai === 'charge') speed = 0;
    if (enemy.ai === 'dash') {
      moveX = enemy.dashX;
      moveY = enemy.dashY;
      speed = tuning.dashSpeed * (enemy.elite ? ELITE.dashSpeed : 1);
    }
  } else if (enemy.kind === 'wisp') {
    const tuning = ENEMIES.wisp;
    const approach = distance > tuning.range + 38 ? 1 : distance < tuning.range - 38 ? -1 : 0;
    const sway = Math.sin(enemy.age * 0.9 + enemy.phase) * 0.45;
    moveX = nx * approach - ny * sway;
    moveY = ny * approach + nx * sway;
    enemy.shotTimer -= dt;
    enemy.wantShoot = enemy.shotTimer <= 0 && distance < 650;
    if (enemy.wantShoot) enemy.shotTimer = tuning.shootEvery * (enemy.elite ? ELITE.fireInterval : 1);
  }
  enemy.x += (moveX * speed + enemy.vx) * dt;
  enemy.y += (moveY * speed + enemy.vy) * dt;
  // A dash can cross the clearing's edge; keep it close enough to rejoin the fight.
  enemy.x = clamp(enemy.x, ARENA.left - 90, ARENA.right + 90);
  enemy.y = clamp(enemy.y, ARENA.top - 90, ARENA.bottom + 90);
  enemy.vx *= Math.exp(-dt * 8);
  enemy.vy *= Math.exp(-dt * 8);
}

export function createProjectile(player, angle, id) {
  const x = player.x + Math.cos(angle) * 27;
  const y = player.y + Math.sin(angle) * 27;
  return { id, x, y, previousX: x, previousY: y, vx: Math.cos(angle) * player.bulletSpeed,
    vy: Math.sin(angle) * player.bulletSpeed, radius: PLAYER.bulletRadius,
    damage: player.damage, life: player.bulletLife, remainingHits: 1 + player.pierce,
    hit: new Set(), dead: false, angle };
}

export function createEnemyBolt(enemy, player) {
  const angle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
  const speed = ENEMIES.wisp.boltSpeed * (enemy.elite ? ELITE.boltSpeed : 1);
  return { x: enemy.x, y: enemy.y, previousX: enemy.x, previousY: enemy.y,
    vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: enemy.elite ? 9 : 7,
    damage: enemy.damage, life: 6, dead: false, phase: enemy.phase };
}

export function updateProjectile(projectile, dt) {
  projectile.previousX = projectile.x;
  projectile.previousY = projectile.y;
  projectile.x += projectile.vx * dt;
  projectile.y += projectile.vy * dt;
  projectile.life -= dt;
  if (projectile.life <= 0 || projectile.x < -80 || projectile.x > VIEW.width + 80 || projectile.y < 60 || projectile.y > VIEW.height - 20) projectile.dead = true;
}

export function createShard(x, y, value, rng) {
  const angle = range(rng, 0, Math.PI * 2);
  const speed = range(rng, 24, 82);
  return { x, y, value, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
    age: 0, phase: range(rng, 0, Math.PI * 2), magnetized: false, dead: false };
}

export function updateShard(shard, player, dt) {
  shard.age += dt;
  const dx = player.x - shard.x;
  const dy = player.y - shard.y;
  const distance = Math.hypot(dx, dy);
  if (distance < player.magnet) shard.magnetized = true;
  if (shard.magnetized) {
    const speed = 360 + shard.age * 30;
    const travel = Math.min(distance, speed * dt);
    shard.x += dx / Math.max(1, distance) * travel;
    shard.y += dy / Math.max(1, distance) * travel;
  } else {
    shard.x = clamp(shard.x + shard.vx * dt, ARENA.left, ARENA.right);
    shard.y = clamp(shard.y + shard.vy * dt, ARENA.top, ARENA.bottom);
    shard.vx *= Math.exp(-dt * 4);
    shard.vy *= Math.exp(-dt * 4);
  }
  return Math.hypot(player.x - shard.x, player.y - shard.y) < player.radius + 9;
}

export function createParticles(x, y, color, count, rng, power = 1) {
  return Array.from({ length: count }, () => {
    const angle = range(rng, 0, Math.PI * 2);
    const speed = range(rng, 30, 150) * power;
    const life = range(rng, 0.22, 0.7);
    return { x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      radius: range(rng, 1.5, 4), life, maxLife: life, color };
  });
}

export function updateParticles(particles, dt) {
  for (const particle of particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.vx *= Math.exp(-dt * 3);
    particle.vy *= Math.exp(-dt * 3);
    particle.life -= dt;
  }
  return particles.filter(particle => particle.life > 0);
}

export function createFloatingText(x, y, text, color = PALETTE.gold, big = false) {
  return { x, y, text: String(text), color, big, life: 0.85, maxLife: 0.85 };
}

export function updateFloatingTexts(texts, dt) {
  for (const text of texts) { text.y -= dt * 35; text.life -= dt; }
  return texts.filter(text => text.life > 0);
}

export function updateOrbitingEmbers(world) {
  const player = world.player;
  world.orbits = Array.from({ length: player.orbitCount }, (_, index) => {
    const angle = world.elapsed * PLAYER.orbitSpeed + index * Math.PI * 2 / player.orbitCount;
    return { x: player.x + Math.cos(angle) * PLAYER.orbitRadius,
      y: player.y + Math.sin(angle) * PLAYER.orbitRadius, radius: 11, angle,
      damage: PLAYER.orbitDamage + player.damage * PLAYER.orbitScaling };
  });
}

export function segmentCircleHit(projectile, target, radius) {
  const dx = projectile.x - projectile.previousX;
  const dy = projectile.y - projectile.previousY;
  const lengthSquared = dx * dx + dy * dy;
  const t = lengthSquared ? clamp(((target.x - projectile.previousX) * dx + (target.y - projectile.previousY) * dy) / lengthSquared, 0, 1) : 0;
  return Math.hypot(target.x - projectile.previousX - dx * t, target.y - projectile.previousY - dy * t) <= radius;
}
