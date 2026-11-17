import { VIEW, PLAYER, TIMING, PALETTE, FEEL, SCORE, clamp } from './config.js';
import { mulberry32, range } from './random.js';
import { createPlayer, createEnemy, updatePlayer, updateEnemy, createProjectile, createEnemyBolt,
  updateProjectile, createShard, updateShard, createParticles, updateParticles,
  createFloatingText, updateFloatingTexts, updateOrbitingEmbers, segmentCircleHit } from './entities.js';
import { createDirector, updateDirector, reserveEnemySlots } from './waves.js';
import { drawChoices, applyUpgrade } from './upgrades.js';

function createScenery(seed) {
  const rng = mulberry32(seed ^ 0xa521ac);
  const trees = Array.from({ length: 44 }, (_, index) => {
    const bottom = index % 2 === 0;
    return { x: range(rng, -70, VIEW.width + 70), y: bottom ? range(rng, 860, 1075) : range(rng, 0, 185),
      height: range(rng, 110, 250), width: range(rng, 30, 76), bottom, phase: range(rng, 0, 6.28) };
  });
  return {
    trees,
    grass: Array.from({ length: 115 }, () => ({ x: range(rng, 45, 1395), y: range(rng, 175, 808), size: range(rng, 3, 12), phase: range(rng, 0, 6.28) })),
    stones: Array.from({ length: 25 }, () => ({ x: range(rng, 90, 1350), y: range(rng, 170, 790), size: range(rng, 4, 14), phase: range(rng, 0, 6.28) })),
    embers: Array.from({ length: 72 }, () => ({ x: range(rng, 0, VIEW.width), y: range(rng, 0, VIEW.height), speed: range(rng, 6, 22), size: range(rng, 1, 2.7), phase: range(rng, 0, 6.28) })),
    stars: Array.from({ length: 60 }, () => ({ x: range(rng, 30, 1410), y: range(rng, 15, 700), size: range(rng, 0.5, 1.6), phase: range(rng, 0, 6.28) })),
  };
}

export function createWorld(seed = 1, state = 'title') {
  return {
    seed: seed >>> 0, rng: mulberry32(seed), state, staged: false, elapsed: 0, visualTime: 0,
    player: createPlayer(), enemies: [], projectiles: [], bolts: [], shards: [], particles: [],
    texts: [], orbits: [], score: 0, kills: 0, combo: 0, comboTimer: 0, maxCombo: 0,
    director: createDirector(), nextId: 1, shake: 0, hurtFlash: 0, choices: [],
    upgradeStacks: {}, lastUpgrade: '', banner: null, scenery: createScenery(seed),
  };
}

export function comboMultiplier(world) { return 1 + Math.min(SCORE.comboMax, Math.floor(Math.max(0, world.combo - 1) / SCORE.comboBatch)) * SCORE.comboStep; }

function addParticles(world, x, y, color, count, power = 1) {
  const room = TIMING.particleCap - world.particles.length;
  if (room > 0) world.particles.push(...createParticles(x, y, color, Math.min(count, room), world.rng, power));
}

function addText(world, x, y, text, color, big = false) {
  if (world.texts.length < TIMING.textCap) world.texts.push(createFloatingText(x, y, text, color, big));
}

function dropShard(world, x, y, value) {
  if (world.shards.length < TIMING.shardCap) world.shards.push(createShard(x, y, value, world.rng));
  else {
    // Preserve experience when the field is full instead of deleting old rewards.
    let closest = world.shards[0];
    for (const shard of world.shards) {
      if (Math.hypot(shard.x - x, shard.y - y) < Math.hypot(closest.x - x, closest.y - y)) closest = shard;
    }
    closest.value += value;
  }
}

export function killEnemy(world, enemy, sfx) {
  if (enemy.dead) return;
  enemy.dead = true;
  world.kills++;
  world.combo++;
  world.comboTimer = TIMING.comboWindow;
  world.maxCombo = Math.max(world.maxCombo, world.combo);
  world.score += Math.round(enemy.score * comboMultiplier(world));
  sfx.die();
  addParticles(world, enemy.x, enemy.y, enemy.elite ? PALETTE.gold : enemy.color, enemy.elite ? 44 : 15, enemy.elite ? 1.7 : 1);
  addParticles(world, enemy.x, enemy.y, PALETTE.ember, 5);
  const drops = enemy.elite ? 8 : enemy.kind === 'brood' ? 3 : 1;
  for (let i = 0; i < drops; i++) dropShard(world, enemy.x + range(world.rng, -12, 12), enemy.y + range(world.rng, -12, 12), enemy.xp / drops);
  if (enemy.elite) {
    world.shake = FEEL.eliteShake;
    addText(world, enemy.x, enemy.y - enemy.radius - 25, 'ELITE BANISHED', PALETTE.gold, true);
  }
  if (enemy.kind === 'brood') {
    reserveEnemySlots(world, 3);
    for (let i = 0; i < 3; i++) {
      const angle = i * Math.PI * 2 / 3 + enemy.phase;
      const child = createEnemy('moth', enemy.x + Math.cos(angle) * 26, enemy.y + Math.sin(angle) * 26, world.rng, false, world.elapsed, world.nextId++);
      child.vx = Math.cos(angle) * 110;
      child.vy = Math.sin(angle) * 110;
      world.enemies.push(child);
    }
  }
}

export function damageEnemy(world, enemy, damage, knockX, knockY, sfx) {
  if (enemy.dead) return;
  enemy.hp -= damage;
  enemy.flash = FEEL.hitFlash;
  enemy.vx += knockX * (enemy.elite ? FEEL.eliteKnockback : FEEL.knockback);
  enemy.vy += knockY * (enemy.elite ? FEEL.eliteKnockback : FEEL.knockback);
  addParticles(world, enemy.x, enemy.y, PALETTE.gold, 3);
  addText(world, enemy.x + range(world.rng, -9, 9), enemy.y - enemy.radius, Math.round(damage), PALETTE.cream);
  sfx.hit();
  if (enemy.hp <= 0) killEnemy(world, enemy, sfx);
}

export function hurtPlayer(world, damage, source, sfx) {
  const player = world.player;
  if (player.invulnerable > 0 || world.state !== 'playing') return false;
  player.hp = Math.max(0, player.hp - damage);
  player.invulnerable = PLAYER.invulnerability;
  const dx = player.x - source.x;
  const dy = player.y - source.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  player.vx = dx / length * PLAYER.knockback;
  player.vy = dy / length * PLAYER.knockback;
  world.shake = FEEL.hurtShake;
  world.hurtFlash = FEEL.hurtFlash;
  addParticles(world, player.x, player.y, PALETTE.danger, 18);
  addText(world, player.x, player.y - 36, `−${Math.round(damage)}`, PALETTE.danger, true);
  sfx.hurt();
  if (player.hp <= 0) finishGame(world, false, sfx);
  return true;
}

export function finishGame(world, won, sfx) {
  if (world.state === 'victory' || world.state === 'gameover') return;
  world.state = won ? 'victory' : 'gameover';
  if (won) {
    world.elapsed = TIMING.dawn;
    world.score += Math.round(world.player.hp) * SCORE.dawnHp + world.player.level * SCORE.dawnLevel;
    world.hurtFlash = 0;
    world.shake = 0;
    addParticles(world, world.player.x, world.player.y, PALETTE.gold, 65, 2);
    sfx.win();
  } else sfx.lose();
  world.banner = null;
}

export function beginLevelUp(world, sfx) {
  const player = world.player;
  if (player.xp + 1e-8 < player.xpNext) return false;
  player.xp -= player.xpNext;
  player.level++;
  player.xpNext = Math.round(PLAYER.xpBase * PLAYER.xpGrowth ** (player.level - 1));
  world.state = 'levelup';
  world.choices = drawChoices(world);
  world.shake = 0;
  sfx.levelup();
  return true;
}

export function chooseUpgrade(world, index, sfx) {
  if (world.state !== 'levelup' || !applyUpgrade(world, index)) return false;
  sfx.click();
  world.state = 'playing';
  world.banner = { text: world.lastUpgrade.toUpperCase(), detail: 'Your light grows stronger', life: 2, color: PALETTE.gold };
  beginLevelUp(world, sfx);
  return true;
}

function separateEnemies(enemies) {
  for (let i = 0; i < enemies.length; i++) {
    if (enemies[i].dead) continue;
    for (let j = i + 1; j < enemies.length; j++) {
      if (enemies[j].dead) continue;
      const a = enemies[i];
      const b = enemies[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const distance = Math.hypot(dx, dy);
      const minDistance = (a.radius + b.radius) * 0.8;
      if (distance > 0.01 && distance < minDistance) {
        const correction = (minDistance - distance) * 0.12;
        a.x -= dx / distance * correction;
        a.y -= dy / distance * correction;
        b.x += dx / distance * correction;
        b.y += dy / distance * correction;
      }
    }
  }
}

function fireWeapon(world, sfx) {
  const player = world.player;
  if (world.projectiles.length + player.shots > TIMING.projectileCap) return;
  for (let i = 0; i < player.shots; i++) {
    const angle = player.aim + (i - (player.shots - 1) / 2) * PLAYER.shotSpread;
    world.projectiles.push(createProjectile(player, angle, world.nextId++));
  }
  player.fireCooldown = 1 / player.fireRate;
  player.muzzle = PLAYER.muzzleTime;
  sfx.shoot();
  addParticles(world, player.x + Math.cos(player.aim) * 29, player.y + Math.sin(player.aim) * 29, PALETTE.gold, 2, 0.4);
}

export function updateWorld(world, input, dt, sfx) {
  if (world.state !== 'playing' || world.staged) return;
  dt = clamp(dt, 0, TIMING.maxDt);
  world.elapsed = Math.min(TIMING.dawn, world.elapsed + dt);
  world.visualTime += dt;
  world.comboTimer = Math.max(0, world.comboTimer - dt);
  if (world.comboTimer <= 0) world.combo = 0;
  world.shake *= Math.exp(-dt * 14);
  world.hurtFlash = Math.max(0, world.hurtFlash - dt);
  if (world.banner) { world.banner.life -= dt; if (world.banner.life <= 0) world.banner = null; }
  if (world.elapsed >= TIMING.dawn) { finishGame(world, true, sfx); return; }

  updatePlayer(world.player, input, dt);
  updateDirector(world, dt, sfx);
  for (const enemy of world.enemies) {
    updateEnemy(enemy, world.player, dt);
    if (enemy.wantShoot && world.bolts.length < TIMING.boltCap) {
      world.bolts.push(createEnemyBolt(enemy, world.player));
      enemy.wantShoot = false;
    }
  }
  separateEnemies(world.enemies);
  const player = world.player;
  if (input.mouse.moved) player.aim = input.aimAngle(player);
  else if (world.enemies.length) {
    let target = world.enemies[0];
    for (const enemy of world.enemies) {
      if (Math.hypot(enemy.x - player.x, enemy.y - player.y) < Math.hypot(target.x - player.x, target.y - player.y)) target = enemy;
    }
    player.aim = Math.atan2(target.y - player.y, target.x - player.x);
  }
  if (input.firing() && player.fireCooldown <= 0) fireWeapon(world, sfx);

  for (const shot of world.projectiles) {
    updateProjectile(shot, dt);
    if (shot.dead) continue;
    for (const enemy of world.enemies) {
      if (enemy.dead || shot.hit.has(enemy.id)) continue;
      if (segmentCircleHit(shot, enemy, shot.radius + enemy.radius)) {
        shot.hit.add(enemy.id);
        damageEnemy(world, enemy, shot.damage, Math.cos(shot.angle), Math.sin(shot.angle), sfx);
        if (--shot.remainingHits <= 0) { shot.dead = true; break; }
      }
    }
  }
  updateOrbitingEmbers(world);
  for (const orbit of world.orbits) {
    for (const enemy of world.enemies) {
      if (!enemy.dead && enemy.orbitCooldown <= 0 && Math.hypot(orbit.x - enemy.x, orbit.y - enemy.y) < orbit.radius + enemy.radius) {
        enemy.orbitCooldown = PLAYER.orbitCooldown;
        const length = Math.max(1, Math.hypot(enemy.x - player.x, enemy.y - player.y));
        damageEnemy(world, enemy, orbit.damage, (enemy.x - player.x) / length, (enemy.y - player.y) / length, sfx);
      }
    }
  }
  for (const enemy of world.enemies) {
    if (!enemy.dead && Math.hypot(enemy.x - player.x, enemy.y - player.y) < enemy.radius + player.radius - 4) hurtPlayer(world, enemy.damage, enemy, sfx);
  }
  for (const bolt of world.bolts) {
    updateProjectile(bolt, dt);
    if (!bolt.dead && segmentCircleHit(bolt, player, bolt.radius + player.radius)) {
      bolt.dead = true;
      hurtPlayer(world, bolt.damage, bolt, sfx);
      addParticles(world, bolt.x, bolt.y, PALETTE.violet, 7);
    }
  }
  for (const shard of world.shards) {
    if (updateShard(shard, player, dt)) {
      shard.dead = true;
      player.xp += shard.value * player.xpGain;
      addParticles(world, shard.x, shard.y, PALETTE.teal, 5, 0.6);
      sfx.pickup();
    }
  }
  world.enemies = world.enemies.filter(enemy => !enemy.dead);
  world.projectiles = world.projectiles.filter(shot => !shot.dead);
  world.bolts = world.bolts.filter(bolt => !bolt.dead);
  world.shards = world.shards.filter(shard => !shard.dead);
  world.particles = updateParticles(world.particles, dt);
  world.texts = updateFloatingTexts(world.texts, dt);
  if (world.state === 'playing') beginLevelUp(world, sfx);
}
