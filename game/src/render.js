import { VIEW, PALETTE as C, FONT, TIMING, PLAYER, clamp, lerp, timeLabel } from './config.js';
import { comboMultiplier } from './world.js';

const TAU = Math.PI * 2;

export function uiLayout(state) {
  const sound = { id: 'mute', x: 1216, y: 38, width: 178, height: 38 };
  if (state === 'title') return [{ id: 'start', x: 94, y: 518, width: 364, height: 70 }, sound];
  if (state === 'levelup') return [0, 1, 2].map(index => ({ id: `upgrade${index}`, x: 228 + index * 336, y: 334, width: 312, height: 338 }));
  if (state === 'paused') return [{ id: 'resume', x: 544, y: 528, width: 352, height: 68 }];
  if (state === 'victory' || state === 'gameover') return [{ id: 'restart', x: 530, y: 676, width: 380, height: 68 }];
  return [{ id: 'pause', x: 1104, y: 853, width: 113, height: 30 }, { id: 'mute', x: 1230, y: 853, width: 155, height: 30 }];
}

export function hitUI(state, mouse) {
  return uiLayout(state).find(rect => mouse.x >= rect.x && mouse.x <= rect.x + rect.width && mouse.y >= rect.y && mouse.y <= rect.y + rect.height)?.id ?? null;
}

function pathRound(ctx, x, y, width, height, radius = 12) {
  ctx.beginPath();
  ctx.roundRect(x, y, width, height, radius);
}

function panel(ctx, x, y, width, height, fill = '#11182ce8', stroke = '#ffffff16', radius = 16) {
  pathRound(ctx, x, y, width, height, radius);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}

function text(ctx, value, x, y, size = 18, color = C.cream, weight = 400, align = 'left') {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = color;
  ctx.fillText(value, x, y);
}

function label(ctx, value, x, y, color = C.muted, size = 11, spacing = 2, align = 'left') {
  ctx.font = `650 ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  const characters = [...value];
  const width = characters.reduce((sum, character) => sum + ctx.measureText(character).width + spacing, -spacing);
  let at = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  for (const character of characters) { ctx.fillText(character, at, y); at += ctx.measureText(character).width + spacing; }
}

function wrapText(ctx, value, x, y, maxWidth, size = 16, color = C.muted, lineHeight = 24) {
  ctx.font = `400 ${size}px ${FONT}`;
  const words = value.split(' ');
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxWidth) {
      text(ctx, line, x, y, size, color);
      line = word;
      y += lineHeight;
    } else line = next;
  }
  text(ctx, line, x, y, size, color);
}

function mixColor(a, b, amount) {
  const rgb = hex => [1, 3, 5].map(at => parseInt(hex.slice(at, at + 2), 16));
  const first = rgb(a);
  const second = rgb(b);
  return `rgb(${first.map((value, index) => Math.round(lerp(value, second[index], amount))).join(',')})`;
}

function glow(ctx, x, y, radius, color, strength = 1) {
  ctx.save();
  ctx.globalAlpha = strength;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, `${color.slice(0, 7)}00`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function pine(ctx, tree, color) {
  const { x, y, height, width } = tree;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - height);
  for (let level = 0; level < 4; level++) {
    const offset = height * (0.27 + level * 0.19);
    const spread = width * (0.43 + level * 0.22);
    ctx.lineTo(x - spread, y - height + offset);
    ctx.lineTo(x - spread * 0.45, y - height + offset - height * 0.05);
  }
  ctx.lineTo(x - width, y - 10);
  ctx.lineTo(x - 6, y - 10);
  ctx.lineTo(x - 6, y + 15);
  ctx.lineTo(x + 6, y + 15);
  ctx.lineTo(x + 6, y - 10);
  ctx.lineTo(x + width, y - 10);
  for (let level = 3; level >= 0; level--) {
    const offset = height * (0.27 + level * 0.19);
    const spread = width * (0.43 + level * 0.22);
    ctx.lineTo(x + spread * 0.45, y - height + offset - height * 0.05);
    ctx.lineTo(x + spread, y - height + offset);
  }
  ctx.closePath();
  ctx.fill();
}

function bareTree(ctx, x, y, height, flip = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(flip, 1);
  ctx.fillStyle = '#080e1f';
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-13, -height * 0.45);
  ctx.lineTo(-67, -height * 0.69);
  ctx.lineTo(-80, -height * 0.95);
  ctx.lineTo(-64, -height * 0.72);
  ctx.lineTo(-11, -height * 0.55);
  ctx.lineTo(-2, -height);
  ctx.lineTo(9, -height * 0.59);
  ctx.lineTo(53, -height * 0.81);
  ctx.lineTo(84, -height * 0.87);
  ctx.lineTo(57, -height * 0.76);
  ctx.lineTo(13, -height * 0.49);
  ctx.lineTo(24, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function clearingRings(ctx, x, y, scale = 1, bright = false) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale * 0.55);
  ctx.strokeStyle = bright ? '#ffd16638' : '#567b7b20';
  ctx.lineWidth = 1.2;
  for (const radius of [145, 171, 246, 266]) {
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, TAU);
    ctx.stroke();
  }
  for (let i = 0; i < 24; i++) {
    const angle = i * TAU / 24;
    const r = i % 3 === 0 ? 240 : 252;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * r, Math.sin(angle) * r);
    ctx.lineTo(Math.cos(angle) * 260, Math.sin(angle) * 260);
    ctx.stroke();
    if (i % 3 === 0) {
      ctx.save();
      ctx.translate(Math.cos(angle) * 203, Math.sin(angle) * 203);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(-4, -6); ctx.lineTo(5, 0); ctx.lineTo(-4, 6); ctx.stroke();
      ctx.restore();
    }
  }
  ctx.restore();
}

function drawBackground(ctx, world) {
  const progress = clamp(world.elapsed / TIMING.dawn, 0, 1);
  const dawn = progress ** 2.8;
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  sky.addColorStop(0, mixColor(C.night, '#dba493', dawn));
  sky.addColorStop(0.45, mixColor('#132239', '#897384', dawn));
  sky.addColorStop(1, mixColor('#0c1726', '#655c66', dawn));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);

  ctx.save();
  ctx.globalAlpha = (1 - dawn) * 0.48;
  for (const star of world.scenery.stars) {
    ctx.fillStyle = '#b2c4dc';
    ctx.globalAlpha = (0.2 + Math.sin(world.visualTime * 0.4 + star.phase) * 0.12) * (1 - dawn);
    ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, TAU); ctx.fill();
  }
  ctx.restore();
  glow(ctx, 780, 460, 570, '#3b6b6148', 0.7);
  glow(ctx, 1240, 90, 420, '#f5bd9860', dawn);
  clearingRings(ctx, 720, 480, 1.5);

  ctx.save();
  for (const grass of world.scenery.grass) {
    const sway = Math.sin(world.visualTime * 0.7 + grass.phase) * 2;
    ctx.strokeStyle = '#6f9c8921';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(grass.x - 3, grass.y); ctx.quadraticCurveTo(grass.x - 7, grass.y - grass.size / 2, grass.x - 4 + sway, grass.y - grass.size);
    ctx.moveTo(grass.x, grass.y + 2); ctx.quadraticCurveTo(grass.x + 3, grass.y - grass.size / 2, grass.x + 1 + sway, grass.y - grass.size * 1.3);
    ctx.moveTo(grass.x + 4, grass.y); ctx.lineTo(grass.x + 7 + sway, grass.y - grass.size * 0.7);
    ctx.stroke();
  }
  for (const stone of world.scenery.stones) {
    ctx.fillStyle = '#25394775';
    ctx.strokeStyle = '#68838b24';
    ctx.beginPath();
    ctx.moveTo(stone.x - stone.size, stone.y + 3);
    ctx.lineTo(stone.x - stone.size * 0.7, stone.y - stone.size * 0.6);
    ctx.lineTo(stone.x + stone.size * 0.3, stone.y - stone.size * 0.8);
    ctx.lineTo(stone.x + stone.size, stone.y);
    ctx.lineTo(stone.x + stone.size * 0.6, stone.y + 4);
    ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  ctx.restore();

  for (const tree of world.scenery.trees) pine(ctx, tree, tree.bottom ? '#09111eea' : '#0c1425b8');
  bareTree(ctx, 24, 840, 660);
  bareTree(ctx, 1418, 840, 710, -1);
  const vignette = ctx.createRadialGradient(720, 470, 230, 720, 470, 820);
  vignette.addColorStop(0, '#00000000');
  vignette.addColorStop(1, '#0509159c');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawAmbient(ctx, world) {
  for (const ember of world.scenery.embers) {
    const y = ((ember.y - world.visualTime * ember.speed) % 900 + 900) % 900;
    const x = ember.x + Math.sin(world.visualTime * 0.4 + ember.phase) * 14;
    const opacity = 0.16 + (Math.sin(world.visualTime * 0.8 + ember.phase) + 1) * 0.16;
    glow(ctx, x, y, ember.size * 5, '#ff9a3c35', opacity);
    ctx.globalAlpha = opacity;
    ctx.fillStyle = C.gold;
    ctx.beginPath(); ctx.arc(x, y, ember.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawLantern(ctx, x, y, scale = 1, lit = true) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  if (lit) glow(ctx, 0, 0, 32, '#ffd16675');
  ctx.strokeStyle = lit ? C.gold : '#8a8096';
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.arc(0, -15, 5, Math.PI, TAU); ctx.stroke();
  ctx.fillStyle = lit ? '#7c592c' : '#333348';
  ctx.beginPath(); ctx.moveTo(-8, -10); ctx.lineTo(-5, -14); ctx.lineTo(5, -14); ctx.lineTo(8, -10); ctx.closePath(); ctx.fill(); ctx.stroke();
  const glass = ctx.createLinearGradient(-6, 0, 6, 0);
  glass.addColorStop(0, lit ? '#b46a2d' : '#22283d');
  glass.addColorStop(0.5, lit ? '#ffe8a3' : '#42465a');
  glass.addColorStop(1, lit ? '#ff9a3c' : '#22283d');
  panel(ctx, -7, -9, 14, 18, glass, lit ? C.gold : '#8a8096', 2);
  ctx.fillStyle = lit ? C.gold : '#8a8096';
  ctx.fillRect(-8, 9, 16, 3);
  ctx.beginPath(); ctx.moveTo(0, -7); ctx.quadraticCurveTo(-5, 2, -1, 5); ctx.quadraticCurveTo(6, 6, 0, -7); ctx.fillStyle = lit ? '#fff7d2' : '#47485d'; ctx.fill();
  ctx.restore();
}

function drawPlayer(ctx, player, world, scale = 1) {
  const bob = player.moving ? Math.sin(player.walk) * 1.5 : Math.sin(world.visualTime * 2) * 0.55;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.scale(scale, scale);
  if (player.invulnerable > 0 && Math.floor(player.invulnerable * 18) % 2 === 0) ctx.globalAlpha = 0.48;
  ctx.fillStyle = '#04081180';
  ctx.beginPath(); ctx.ellipse(1, 17, 20, 7, 0, 0, TAU); ctx.fill();
  ctx.translate(0, bob);
  const cloak = ctx.createLinearGradient(-16, -13, 16, 22);
  cloak.addColorStop(0, '#527c81'); cloak.addColorStop(0.5, '#253c51'); cloak.addColorStop(1, '#18263d');
  ctx.fillStyle = cloak;
  ctx.strokeStyle = '#8aa098'; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(-10, -8); ctx.quadraticCurveTo(-17, -2, -19, 18); ctx.quadraticCurveTo(0, 25, 19, 18); ctx.quadraticCurveTo(15, -4, 8, -8); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.strokeStyle = '#ffd1669a';
  ctx.beginPath(); ctx.moveTo(-14, 16); ctx.quadraticCurveTo(0, 22, 14, 16); ctx.stroke();
  ctx.fillStyle = '#0c1426';
  ctx.beginPath(); ctx.ellipse(0, -11, 11, 13, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = '#75a09b'; ctx.stroke();
  ctx.fillStyle = '#b9b2a0';
  ctx.beginPath(); ctx.ellipse(0, -10, 6, 7, 0, 0, TAU); ctx.fill();
  ctx.fillStyle = '#1b2032'; ctx.fillRect(-4, -12, 8, 2);
  ctx.fillStyle = C.gold; ctx.fillRect(-4, -11, 2, 1.5); ctx.fillRect(2, -11, 2, 1.5);
  ctx.strokeStyle = '#43606b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
  const lanternX = Math.cos(player.aim) * 25;
  const lanternY = Math.sin(player.aim) * 21 - 2;
  ctx.beginPath(); ctx.moveTo(Math.sign(lanternX || 1) * 8, -2); ctx.lineTo(lanternX, lanternY - 5); ctx.stroke();
  drawLantern(ctx, lanternX, lanternY, 0.9, player.hp > 0);
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(0, 1, 2.2, 0, TAU); ctx.fill();
  if (player.muzzle > 0) glow(ctx, lanternX, lanternY, 38, '#fff2bdaa', player.muzzle / PLAYER.muzzleTime);
  ctx.restore();
}

function drawEnemy(ctx, enemy, time, alpha = 1) {
  const radius = enemy.radius;
  if (enemy.kind === 'imp' && enemy.ai === 'charge') {
    ctx.save();
    ctx.strokeStyle = '#ef476f72'; ctx.lineWidth = 2;
    ctx.setLineDash([5, 8]);
    ctx.beginPath(); ctx.moveTo(enemy.x, enemy.y); ctx.lineTo(enemy.x + enemy.dashX * 145, enemy.y + enemy.dashY * 145); ctx.stroke();
    ctx.setLineDash([]);
    glow(ctx, enemy.x, enemy.y, radius * 2.5, '#ef476f60', 0.5 + Math.sin(time * 25) * 0.3);
    ctx.restore();
  }
  if (enemy.elite) {
    glow(ctx, enemy.x, enemy.y, radius * 2.6, '#ff9a3c25');
    ctx.save();
    ctx.strokeStyle = '#ffd16677'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(enemy.x, enemy.y, radius + 9, time * 0.2, time * 0.2 + Math.PI * 1.7); ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(enemy.x, enemy.y);
  ctx.fillStyle = '#04081175';
  ctx.beginPath(); ctx.ellipse(0, radius * 0.7, radius * 0.9, radius * 0.35, 0, 0, TAU); ctx.fill();
  ctx.rotate((enemy.aim || 0) + Math.PI / 2);
  ctx.scale(radius / (enemy.kind === 'brood' ? 29 : enemy.kind === 'imp' ? 19 : enemy.kind === 'wisp' ? 18 : 17), radius / (enemy.kind === 'brood' ? 29 : enemy.kind === 'imp' ? 19 : enemy.kind === 'wisp' ? 18 : 17));
  const flashed = enemy.flash > 0;
  ctx.strokeStyle = flashed ? C.cream : `${enemy.color}a5`;
  ctx.fillStyle = flashed ? '#f5ead9' : '#1b2340';
  ctx.lineWidth = 1.4;

  if (enemy.kind === 'moth') {
    const flap = 1 + Math.sin(time * 7 + enemy.phase) * 0.13;
    ctx.save(); ctx.scale(flap, 1);
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(side * 3, -8); ctx.bezierCurveTo(side * 9, -20, side * 26, -22, side * 25, -5); ctx.bezierCurveTo(side * 29, 11, side * 14, 17, side * 3, 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(side * 7, -8); ctx.lineTo(side * 19, -5); ctx.lineTo(side * 12, 6); ctx.strokeStyle = flashed ? C.cream : '#8fa6c83a'; ctx.stroke(); ctx.strokeStyle = flashed ? C.cream : `${enemy.color}a5`;
    }
    ctx.restore();
    ctx.fillStyle = flashed ? C.cream : '#354663'; ctx.beginPath(); ctx.ellipse(0, 0, 5, 13, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `${enemy.color}ad`; ctx.beginPath(); ctx.moveTo(-2, -10); ctx.lineTo(-8, -18); ctx.moveTo(2, -10); ctx.lineTo(8, -18); ctx.stroke();
    ctx.fillStyle = C.gold; ctx.fillRect(-3, -7, 2, 3); ctx.fillRect(1, -7, 2, 3);
  } else if (enemy.kind === 'imp') {
    ctx.beginPath(); ctx.moveTo(-12, -4); ctx.lineTo(-15, -24); ctx.lineTo(-5, -13); ctx.quadraticCurveTo(0, -16, 5, -13); ctx.lineTo(15, -24); ctx.lineTo(12, -4); ctx.lineTo(21, 4); ctx.lineTo(13, 10); ctx.lineTo(10, 20); ctx.lineTo(0, 13); ctx.lineTo(-10, 20); ctx.lineTo(-13, 10); ctx.lineTo(-21, 4); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = enemy.ai === 'charge' ? C.cream : C.danger;
    ctx.beginPath(); ctx.moveTo(-9, -7); ctx.lineTo(-2, -4); ctx.lineTo(-7, -1); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(9, -7); ctx.lineTo(2, -4); ctx.lineTo(7, -1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#ef799594'; ctx.beginPath(); ctx.moveTo(2, 7); ctx.lineTo(6, 6); ctx.stroke();
  } else if (enemy.kind === 'brood') {
    ctx.strokeStyle = flashed ? C.cream : '#ae95d599';
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(side * 18, -12 + i * 12); ctx.lineTo(side * 32, -4 + i * 10); ctx.lineTo(side * 35, 4 + i * 9); ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(-23, 6); ctx.bezierCurveTo(-33, -9, -20, -31, -5, -26); ctx.bezierCurveTo(15, -36, 36, -7, 24, 13); ctx.bezierCurveTo(17, 32, -20, 31, -23, 6); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = flashed ? C.cream : '#5b4b77';
    for (const [x, y, r] of [[-10, 4, 8], [8, 8, 9], [2, -10, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#c3ace8';
    for (const x of [-9, 0, 9]) { ctx.beginPath(); ctx.arc(x, -13 + Math.abs(x) * 0.25, 2.3, 0, TAU); ctx.fill(); }
  } else {
    const wave = Math.sin(time * 4 + enemy.phase) * 3;
    const flame = ctx.createLinearGradient(0, -23, 0, 27);
    flame.addColorStop(0, flashed ? C.cream : '#559cae'); flame.addColorStop(0.45, flashed ? C.cream : '#243954'); flame.addColorStop(1, '#151e3c00');
    ctx.fillStyle = flame;
    ctx.beginPath(); ctx.moveTo(0, -24); ctx.bezierCurveTo(-25, -3, -18, 8, -12, 27); ctx.lineTo(-3 + wave, 15); ctx.lineTo(3, 32); ctx.lineTo(10 + wave, 14); ctx.bezierCurveTo(24, 6, 20, -8, 0, -24); ctx.closePath(); ctx.fill(); ctx.stroke();
    glow(ctx, 0, -4, 16, '#71c8d648');
    ctx.fillStyle = '#b5f4ea'; ctx.beginPath(); ctx.ellipse(0, -5, 5, 7, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#142a40'; ctx.beginPath(); ctx.ellipse(0, -5, 1.5, 4, 0, 0, TAU); ctx.fill();
  }
  ctx.restore();
  if (enemy.elite) {
    const width = radius * 2 + 14;
    const y = enemy.y - radius - 23;
    panel(ctx, enemy.x - width / 2, y, width, 5, '#090d1d', '#ffd16638', 3);
    panel(ctx, enemy.x - width / 2, y, width * clamp(enemy.hp / enemy.maxHp, 0, 1), 5, C.gold, null, 3);
    label(ctx, `ELITE ${enemy.kind.toUpperCase()}`, enemy.x, y - 7, C.gold, 8, 1.1, 'center');
  }
}

function drawShard(ctx, shard, time) {
  const size = Math.min(8.5, 4 + Math.sqrt(shard.value) * 0.6);
  const y = shard.y + Math.sin(time * 3 + shard.phase) * 2;
  glow(ctx, shard.x, y, size * 4, '#39d0c440');
  ctx.save(); ctx.translate(shard.x, y); ctx.rotate(Math.sin(time + shard.phase) * 0.3);
  ctx.fillStyle = '#39d0c4'; ctx.strokeStyle = '#c2ffed'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, -size); ctx.lineTo(size * 0.65, 0); ctx.lineTo(0, size); ctx.lineTo(-size * 0.65, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}

function drawCombat(ctx, world) {
  const player = world.player;
  const lightRadius = 185 + Math.sin(world.visualTime * 3.1) * 5;
  glow(ctx, player.x, player.y, lightRadius, '#ffb95324');
  glow(ctx, player.x, player.y, 73, '#ffd1661b');
  if (player.orbitCount) {
    ctx.strokeStyle = '#ff9a3c1f'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(player.x, player.y, PLAYER.orbitRadius, 0, TAU); ctx.stroke();
  }
  for (const shard of world.shards) drawShard(ctx, shard, world.visualTime);
  for (const enemy of [...world.enemies].sort((a, b) => a.y - b.y)) drawEnemy(ctx, enemy, world.visualTime);
  for (const shot of world.projectiles) {
    glow(ctx, shot.x, shot.y, 20, '#ff9a3c70');
    ctx.strokeStyle = '#ff9a3c8c'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(shot.x - Math.cos(shot.angle) * 17, shot.y - Math.sin(shot.angle) * 17); ctx.lineTo(shot.x, shot.y); ctx.stroke();
    ctx.fillStyle = '#fff0bb'; ctx.beginPath(); ctx.arc(shot.x, shot.y, shot.radius, 0, TAU); ctx.fill();
  }
  for (const bolt of world.bolts) {
    glow(ctx, bolt.x, bolt.y, 25, '#b7a1f040');
    ctx.strokeStyle = '#b7a1f07c'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(bolt.x - bolt.vx * 0.13, bolt.y - bolt.vy * 0.13); ctx.lineTo(bolt.x, bolt.y); ctx.stroke();
    ctx.fillStyle = '#263456'; ctx.beginPath(); ctx.arc(bolt.x, bolt.y, bolt.radius, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b7a1f0'; ctx.stroke();
    ctx.fillStyle = '#dfd4fa'; ctx.beginPath(); ctx.arc(bolt.x, bolt.y, 2, 0, TAU); ctx.fill();
  }
  drawPlayer(ctx, player, world, 1.12);
  for (const orbit of world.orbits) {
    glow(ctx, orbit.x, orbit.y, 34, '#ff9a3c65');
    ctx.strokeStyle = '#ff9a3c90'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(player.x, player.y, PLAYER.orbitRadius, orbit.angle - 0.25, orbit.angle); ctx.stroke();
    ctx.fillStyle = C.ember; ctx.beginPath(); ctx.arc(orbit.x, orbit.y, 9, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff2b4'; ctx.beginPath(); ctx.arc(orbit.x - 2, orbit.y - 2, 4, 0, TAU); ctx.fill();
  }
  for (const particle of world.particles) {
    ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
    ctx.fillStyle = particle.color;
    ctx.beginPath(); ctx.arc(particle.x, particle.y, particle.radius * (0.5 + particle.life / particle.maxLife * 0.5), 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
  for (const floating of world.texts) {
    ctx.globalAlpha = clamp(floating.life / 0.25, 0, 1);
    text(ctx, floating.text, floating.x, floating.y, floating.big ? 20 : 15, floating.color, 700, 'center');
  }
  ctx.globalAlpha = 1;
}

function keycap(ctx, value, x, y, width = 27, color = '#c6c7d0') {
  panel(ctx, x, y, width, 27, '#ffffff07', '#ffffff21', 5);
  text(ctx, value, x + width / 2, y + 19, 12, color, 550, 'center');
}

function drawSound(ctx, muted, rect, hovered, compact = false) {
  if (hovered) panel(ctx, rect.x, rect.y, rect.width, rect.height, '#ffffff09', null, 7);
  const x = rect.x + 14;
  const y = rect.y + rect.height / 2;
  ctx.strokeStyle = muted ? C.muted : C.gold;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x - 5, y - 4); ctx.lineTo(x, y - 4); ctx.lineTo(x + 5, y - 9); ctx.lineTo(x + 5, y + 9); ctx.lineTo(x, y + 4); ctx.lineTo(x - 5, y + 4); ctx.closePath(); ctx.stroke();
  if (muted) { ctx.beginPath(); ctx.moveTo(x + 9, y - 4); ctx.lineTo(x + 16, y + 4); ctx.moveTo(x + 16, y - 4); ctx.lineTo(x + 9, y + 4); ctx.stroke(); }
  else { ctx.beginPath(); ctx.arc(x + 5, y, 9, -0.8, 0.8); ctx.stroke(); ctx.beginPath(); ctx.arc(x + 5, y, 14, -0.7, 0.7); ctx.stroke(); }
  label(ctx, muted ? 'SOUND OFF' : 'SOUND ON', x + 29, y + 4, muted ? C.muted : '#d7c9a9', compact ? 9 : 10, 1);
  keycap(ctx, 'M', rect.x + rect.width - 30, y - 12, 25);
}

function bar(ctx, x, y, width, height, amount, color, track = '#060c19') {
  panel(ctx, x, y, width, height, track, '#ffffff0f', height / 2);
  if (amount > 0) panel(ctx, x, y, Math.max(height, width * clamp(amount, 0, 1)), height, color, null, height / 2);
}

function drawHUD(ctx, world, audio, hover) {
  const player = world.player;
  panel(ctx, 40, 28, 1360, 108, '#0a1122e0', '#b6c8e11d', 18);
  drawLantern(ctx, 77, 76, 1.4);
  label(ctx, 'LANTERN KEEPER', 110, 60, C.cream, 10, 1.8);
  text(ctx, `${Math.ceil(player.hp)} / ${player.maxHp}`, 373, 60, 13, C.muted, 500, 'right');
  bar(ctx, 110, 75, 263, 10, player.hp / player.maxHp, player.hp / player.maxHp < 0.3 ? C.danger : '#ef7995');
  label(ctx, player.regeneration ? `+${player.regeneration.toFixed(1)} HP / SEC` : 'KEEP THE FLAME ALIVE', 110, 108, player.hp / player.maxHp < 0.3 ? '#ef7995' : '#8992a8', 8, 1.3);

  const dawn = ctx.createLinearGradient(467, 0, 938, 0);
  dawn.addColorStop(0, '#46537d'); dawn.addColorStop(0.55, '#c77b7f'); dawn.addColorStop(1, '#ffd4a0');
  label(ctx, 'DAWN APPROACHES', 476, 56, C.muted, 9, 1.7);
  text(ctx, timeLabel(TIMING.dawn - world.elapsed), 951, 56, 18, C.cream, 650, 'right');
  bar(ctx, 476, 71, 475, 11, world.elapsed / TIMING.dawn, dawn, '#252c45');
  ctx.strokeStyle = '#ffd166a0'; ctx.lineWidth = 1.3;
  const sunX = 476 + 475 * clamp(world.elapsed / TIMING.dawn, 0.015, 0.985);
  ctx.beginPath(); ctx.arc(sunX, 76, 5, 0, TAU); ctx.stroke();
  label(ctx, world.director.surge ? 'SURGE · THE SHADOWS GATHER' : world.elapsed % 60 >= TIMING.lullStart ? 'A BREATH BEFORE THE STORM' : 'SURVIVE UNTIL THE FIRST LIGHT', 476, 106, world.director.surge ? C.ember : '#8992a8', 8, 1.2);

  ctx.strokeStyle = '#ffffff14'; ctx.beginPath(); ctx.moveTo(1010, 51); ctx.lineTo(1010, 113); ctx.stroke();
  label(ctx, 'SCORE', 1060, 57, C.muted, 9, 1.7);
  text(ctx, world.score.toLocaleString('en-US'), 1060, 93, 29, C.gold, 700);
  label(ctx, 'BANISHED', 1330, 57, C.muted, 9, 1.7, 'right');
  text(ctx, String(world.kills), 1330, 93, 29, C.cream, 650, 'right');

  panel(ctx, 40, 817, 1360, 74, '#0a1122e0', '#b6c8e11d', 14);
  panel(ctx, 57, 830, 83, 43, '#39d0c410', '#39d0c43c', 9);
  label(ctx, 'LEVEL', 72, 844, '#84b9bd', 8, 1.2);
  text(ctx, String(player.level).padStart(2, '0'), 126, 861, 23, C.teal, 700, 'right');
  label(ctx, 'EMBER SHARDS', 160, 839, '#84b9bd', 8, 1.3);
  text(ctx, `${Math.floor(player.xp)} / ${player.xpNext} XP`, 1049, 839, 10, '#84b9bd', 550, 'right');
  bar(ctx, 160, 850, 889, 6, player.xp / player.xpNext, C.teal);
  label(ctx, `DMG ${Math.round(player.damage)}    RATE ${player.fireRate.toFixed(1)}/S    SHOTS ${player.shots}    PIERCE ${player.pierce}    SPEED ${Math.round(player.speed)}    ORBITS ${player.orbitCount}`, 160, 875, '#7f8da5', 8, 1);
  const layout = uiLayout('playing');
  if (hover === 'pause') panel(ctx, layout[0].x, layout[0].y, layout[0].width, layout[0].height, '#ffffff09', null, 7);
  keycap(ctx, 'P', 1112, 855, 25);
  label(ctx, 'PAUSE', 1149, 875, '#a6a9bc', 9, 1);
  drawSound(ctx, audio.muted, layout[1], hover === 'mute', true);

  if (world.combo >= 2 && world.comboTimer > 0) {
    panel(ctx, 62, 162, 175, 68, '#0b1523c9', '#ffd16631', 12);
    label(ctx, `${world.combo} KILL CHAIN`, 77, 183, C.gold, 8, 1.2);
    text(ctx, `×${comboMultiplier(world).toFixed(1)}`, 77, 212, 26, C.cream, 750);
    label(ctx, 'SCORE', 149, 207, C.muted, 8, 1);
    bar(ctx, 77, 219, 145, 3, world.comboTimer / TIMING.comboWindow, C.gold);
  }
  if (world.banner) {
    ctx.save(); ctx.globalAlpha = clamp(world.banner.life, 0, 1);
    panel(ctx, 493, 155, 454, 58, '#0a1122cd', `${world.banner.color}42`, 11);
    label(ctx, world.banner.text, 720, 179, world.banner.color, 11, 1.8, 'center');
    text(ctx, world.banner.detail, 720, 198, 12, C.muted, 400, 'center'); ctx.restore();
  }
}

function button(ctx, rect, value, hover, suffix = '↗') {
  glow(ctx, rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width * 0.7, '#ff9a3c14', hover ? 1 : 0.5);
  const gradient = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.height);
  gradient.addColorStop(0, hover ? '#ffe4a2' : '#ffda87'); gradient.addColorStop(1, hover ? '#ffc163' : '#f2b55b');
  panel(ctx, rect.x, rect.y, rect.width, rect.height, gradient, '#fff2c590', 12);
  text(ctx, value, rect.x + 26, rect.y + rect.height / 2 + 7, 20, '#34231e', 750);
  if (suffix) text(ctx, suffix, rect.x + rect.width - 28, rect.y + rect.height / 2 + 8, 25, '#634025', 400, 'right');
}

function drawTitle(ctx, world, audio, hover) {
  const shade = ctx.createLinearGradient(0, 0, 1140, 0);
  shade.addColorStop(0, '#0b1026f2'); shade.addColorStop(0.53, '#0b1026c9'); shade.addColorStop(1, '#0b102600');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  drawLantern(ctx, 108, 67, 1.05);
  label(ctx, 'A LITTLE LIGHT AGAINST THE NIGHT', 133, 73, '#c6c4c0', 10, 1.8);
  drawSound(ctx, audio.muted, uiLayout('title')[1], hover === 'mute');

  const heroX = 1050;
  const heroY = 520;
  clearingRings(ctx, heroX, heroY + 76, 1.12, true);
  glow(ctx, heroX, heroY, 285, '#ff9a3c20');
  glow(ctx, heroX + 70, heroY - 20, 135, '#ffd16625');
  const silhouettes = [
    { kind: 'moth', x: 966, y: 295, radius: 27, color: '#8fa6c8', phase: 2, aim: 1.2 },
    { kind: 'imp', x: 1258, y: 573, radius: 24, color: '#ef7995', phase: 4, aim: -2.8 },
    { kind: 'wisp', x: 1238, y: 363, radius: 27, color: '#71c8d6', phase: 1, aim: 2.2 },
    { kind: 'brood', x: 892, y: 697, radius: 35, color: '#ae95d5', phase: 3, aim: -0.8 },
  ];
  for (const enemy of silhouettes) drawEnemy(ctx, { ...enemy, x: enemy.x + Math.sin(world.visualTime * 0.35 + enemy.phase) * 14, y: enemy.y + Math.cos(world.visualTime * 0.3 + enemy.phase) * 10, flash: 0, elite: false, ai: 'roam' }, world.visualTime, 0.62);
  drawPlayer(ctx, { ...world.player, x: heroX, y: heroY, aim: -0.18 }, world, 3.5);
  for (let i = 0; i < 12; i++) {
    const angle = i * 2.4 + world.visualTime * 0.12;
    const radius = 100 + i * 7;
    const x = heroX + Math.cos(angle) * radius;
    const y = heroY + Math.sin(angle) * radius * 0.75;
    glow(ctx, x, y, 14, '#ffd16638');
    ctx.fillStyle = '#ffd166b0'; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
  }
  label(ctx, 'THE CLEARING IS YOURS. HOLD IT.', 96, 228, C.ember, 11, 2.5);
  ctx.save();
  ctx.shadowColor = '#ff9a3c26'; ctx.shadowBlur = 32;
  text(ctx, 'EMBERFALL', 88, 350, 108, C.cream, 850);
  ctx.restore();
  label(ctx, 'SURVIVE UNTIL DAWN', 98, 397, C.gold, 17, 5);
  text(ctx, 'One lantern. Five minutes. A forest full of shadows.', 97, 461, 18, '#d5d1d0', 450);
  button(ctx, uiLayout('title')[0], 'Enter the clearing', hover === 'start');
  label(ctx, 'CLICK OR PRESS ENTER TO BEGIN', 99, 618, '#afb0bd', 10, 1.5);

  keycap(ctx, 'W A S D', 98, 667, 80); text(ctx, '/', 188, 686, 14, '#64738b'); keycap(ctx, '↑ ← ↓ →', 205, 667, 91);
  text(ctx, 'Move', 314, 686, 14, '#c1c2ca');
  keycap(ctx, 'MOUSE', 98, 707, 80); text(ctx, 'Aim · hold to fire', 188, 726, 14, '#c1c2ca');
  keycap(ctx, 'SPACE', 382, 707, 63); text(ctx, 'Fire', 458, 726, 14, '#c1c2ca');
  keycap(ctx, 'P', 98, 747); text(ctx, 'Pause', 137, 766, 14, '#c1c2ca'); keycap(ctx, 'M', 232, 747); text(ctx, 'Mute', 271, 766, 14, '#c1c2ca');
  ctx.strokeStyle = '#ffffff1a'; ctx.beginPath(); ctx.moveTo(96, 822); ctx.lineTo(1344, 822); ctx.stroke();
  label(ctx, 'GATHER EMBERS. GROW STRONGER. GREET THE SUN.', 98, 855, '#8c99ad', 9, 1.5);
  label(ctx, 'AN ORIGINAL ARENA SURVIVAL', 1344, 855, '#8c99ad', 9, 1.5, 'right');
}

function overlay(ctx, opacity = 0.82) {
  ctx.fillStyle = `rgba(7, 12, 27, ${opacity})`;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const gradient = ctx.createRadialGradient(720, 400, 40, 720, 400, 620);
  gradient.addColorStop(0, '#21334a35'); gradient.addColorStop(1, '#080d1e00');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
}

function drawLevelUp(ctx, world, hover) {
  overlay(ctx);
  glow(ctx, 720, 224, 240, '#ffd16612');
  drawLantern(ctx, 720, 161, 1.6);
  label(ctx, `LEVEL ${world.player.level} · A NEW SPARK`, 720, 216, C.gold, 11, 2.5, 'center');
  text(ctx, 'Your light grows.', 720, 277, 51, C.cream, 750, 'center');
  text(ctx, 'Choose a gift to carry into the dark.', 720, 310, 17, '#aeb4c6', 400, 'center');

  const cards = uiLayout('levelup');
  world.choices.forEach((upgrade, index) => {
    const card = cards[index];
    const hovered = hover === card.id;
    const stack = world.upgradeStacks[upgrade.id] || 0;
    if (hovered) glow(ctx, card.x + card.width / 2, card.y + card.height / 2, 235, `${upgrade.color}16`);
    const fill = ctx.createLinearGradient(0, card.y, 0, card.y + card.height);
    fill.addColorStop(0, hovered ? '#263047' : '#192237'); fill.addColorStop(1, '#11192b');
    panel(ctx, card.x, card.y, card.width, card.height, fill, hovered ? `${upgrade.color}b0` : '#c2d1eb2a', 17);
    ctx.fillStyle = upgrade.color; pathRound(ctx, card.x + 22, card.y, card.width - 44, 3, 1); ctx.fill();
    panel(ctx, card.x + 24, card.y + 26, 68, 68, `${upgrade.color}12`, `${upgrade.color}34`, 16);
    text(ctx, upgrade.icon, card.x + 58, card.y + 76, 38, upgrade.color, 500, 'center');
    keycap(ctx, String(index + 1), card.x + card.width - 52, card.y + 28, 27, '#e3ded3');
    if (stack) label(ctx, `RANK ${stack + 1}`, card.x + card.width - 25, card.y + 104, '#8e9bb2', 8, 1.2, 'right');
    label(ctx, upgrade.category, card.x + 26, card.y + 133, upgrade.color, 9, 1.8);
    text(ctx, upgrade.name, card.x + 26, card.y + 169, 25, C.cream, 680);
    wrapText(ctx, upgrade.description, card.x + 26, card.y + 201, card.width - 52, 15, '#adb6c9', 23);
    ctx.strokeStyle = '#ffffff13'; ctx.beginPath(); ctx.moveTo(card.x + 26, card.y + 285); ctx.lineTo(card.x + card.width - 26, card.y + 285); ctx.stroke();
    label(ctx, upgrade.effect, card.x + 26, card.y + 311, upgrade.color, 10, 1.1);
  });
  label(ctx, 'CLICK A CARD OR PRESS 1 / 2 / 3', 720, 716, '#9fa9bc', 10, 2, 'center');
  text(ctx, 'The night waits while you choose.', 720, 744, 14, '#697992', 400, 'center');
  label(ctx, `${timeLabel(world.elapsed, false)} SURVIVED    ·    ${world.kills} SHADOWS BANISHED`, 720, 811, '#7f8da5', 9, 1.6, 'center');
}

function drawPaused(ctx, hover) {
  overlay(ctx, 0.84);
  drawLantern(ctx, 720, 258, 2);
  label(ctx, 'PAUSED', 720, 333, C.gold, 12, 3, 'center');
  text(ctx, 'A moment of quiet.', 720, 401, 52, C.cream, 750, 'center');
  text(ctx, 'Catch your breath. The clearing can wait.', 720, 443, 18, '#aeb4c6', 400, 'center');
  button(ctx, uiLayout('paused')[0], 'Back to the clearing', hover === 'resume', '→');
  label(ctx, 'CLICK OR PRESS P / ENTER TO RESUME', 720, 634, '#8d9ab0', 10, 1.6, 'center');
}

function drawEnd(ctx, world, hover) {
  const won = world.state === 'victory';
  overlay(ctx, won ? 0.65 : 0.86);
  glow(ctx, 720, 230, 260, won ? '#ffd1662c' : '#b7a1f010');
  if (won) {
    ctx.strokeStyle = '#ffd16650'; ctx.lineWidth = 1;
    for (let i = 0; i < 12; i++) {
      const angle = i * TAU / 12;
      ctx.beginPath(); ctx.moveTo(720 + Math.cos(angle) * 62, 210 + Math.sin(angle) * 62); ctx.lineTo(720 + Math.cos(angle) * 77, 210 + Math.sin(angle) * 77); ctx.stroke();
    }
  }
  drawLantern(ctx, 720, 210, 2.2, won);
  label(ctx, won ? 'THE FOREST REMEMBERS YOUR LIGHT' : 'THE LANTERN WENT QUIET', 720, 298, won ? C.gold : '#b7a1f0', 11, 2.2, 'center');
  text(ctx, won ? 'You brought the dawn.' : 'The night took its due.', 720, 369, 58, C.cream, 750, 'center');
  text(ctx, won ? 'Five minutes of courage. A whole forest of morning.' : 'Every ember was a little act of defiance.', 720, 411, 18, '#aeb4c6', 400, 'center');

  panel(ctx, 306, 463, 828, 133, '#151d30d9', won ? '#ffd16635' : '#b7a1f029', 17);
  const stats = [
    ['FINAL SCORE', world.score.toLocaleString('en-US'), C.gold],
    ['TIME SURVIVED', timeLabel(world.elapsed, false), C.cream],
    ['BANISHED', String(world.kills), C.cream],
    ['LEVEL REACHED', String(world.player.level).padStart(2, '0'), C.teal],
  ];
  stats.forEach(([name, value, color], index) => {
    const x = 409 + index * 207;
    if (index) { ctx.strokeStyle = '#ffffff10'; ctx.beginPath(); ctx.moveTo(x - 103, 491); ctx.lineTo(x - 103, 568); ctx.stroke(); }
    label(ctx, name, x, 502, '#8e9bb2', 9, 1.2, 'center');
    text(ctx, value, x, 554, 34, color, 700, 'center');
  });
  text(ctx, won ? 'The lantern is still burning.' : 'There is still a dawn worth fighting for.', 720, 635, 15, '#9ca7bd', 400, 'center');
  button(ctx, uiLayout(world.state)[0], won ? 'A new night awaits' : 'Rekindle the lantern', hover === 'restart', '↻');
  text(ctx, 'Click or press Enter to play again', 720, 778, 14, '#9da8bd', 450, 'center');
  label(ctx, `BEST CHAIN: ${world.maxCombo}    ·    SEED: ${world.seed}`, 720, 853, '#66758d', 8, 1.4, 'center');
}

function drawAim(ctx, world, mouse) {
  if (!mouse.moved || world.state !== 'playing') return;
  ctx.save();
  ctx.strokeStyle = '#ffd16696'; ctx.lineWidth = 1;
  const { x, y } = mouse;
  ctx.beginPath(); ctx.arc(x, y, 9, 0, TAU); ctx.stroke();
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
    ctx.beginPath(); ctx.moveTo(x + dx * 13, y + dy * 13); ctx.lineTo(x + dx * 18, y + dy * 18); ctx.stroke();
  }
  ctx.fillStyle = C.gold; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
  ctx.restore();
}

export function render(ctx, world, input, audio) {
  const hover = input.mouse.moved ? hitUI(world.state, input.mouse) : null;
  drawBackground(ctx, world);
  if (world.state === 'title') {
    drawTitle(ctx, world, audio, hover);
    drawAmbient(ctx, world);
    return;
  }
  ctx.save();
  if (world.shake > 0.1) ctx.translate(Math.sin(world.visualTime * 119) * world.shake, Math.cos(world.visualTime * 137) * world.shake * 0.65);
  drawCombat(ctx, world);
  ctx.restore();
  drawAmbient(ctx, world);
  if (world.hurtFlash > 0) {
    ctx.fillStyle = `rgba(239, 71, 111, ${world.hurtFlash * 0.3})`; ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
  drawHUD(ctx, world, audio, hover);
  if (world.state === 'levelup') drawLevelUp(ctx, world, hover);
  else if (world.state === 'paused') drawPaused(ctx, hover);
  else if (world.state === 'victory' || world.state === 'gameover') drawEnd(ctx, world, hover);
  drawAim(ctx, world, input.mouse);
}
