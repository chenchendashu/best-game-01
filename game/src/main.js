import { VIEW, TIMING, PALETTE, clamp } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld, updateWorld, chooseUpgrade } from './world.js';
import { render, hitUI } from './render.js';
import { createStagedScene } from './scenes.js';

const canvas = document.querySelector('#game');
const ctx = canvas.getContext('2d', { alpha: false });
const status = document.querySelector('#status');
const audio = createAudio();
const viewport = { scale: 1, x: 0, y: 0, dpr: 1 };
function newSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
let world = createStagedScene(new URLSearchParams(location.search)) ?? createWorld(newSeed());
let lastTimestamp = performance.now();
let announcedState = '';

function toWorld(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  return { x: (clientX - rect.left - viewport.x) / viewport.scale, y: (clientY - rect.top - viewport.y) / viewport.scale };
}

function pauseOnBlur() {
  if (!world.staged && world.state === 'playing') world.state = 'paused';
}

const input = createInput(canvas, toWorld, audio.unlock, pauseOnBlur);

function resize() {
  const rect = canvas.getBoundingClientRect();
  viewport.dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(rect.width * viewport.dpr);
  canvas.height = Math.round(rect.height * viewport.dpr);
  viewport.scale = Math.min(rect.width / VIEW.width, rect.height / VIEW.height);
  viewport.x = (rect.width - VIEW.width * viewport.scale) / 2;
  viewport.y = (rect.height - VIEW.height * viewport.scale) / 2;
  input.refreshPointer();
}

function startGame() {
  world = createWorld(newSeed(), 'playing');
  world.banner = { text: 'KEEP THE FLAME ALIVE', detail: 'Gather teal shards to strengthen your lantern', life: 4.5, color: PALETTE.gold };
  input.clear();
  audio.sfx.click();
}

function handleInput() {
  if (world.staged) return false;
  if (input.pressed('KeyM')) audio.toggleMute();
  const clicked = input.mouse.clicked;
  const target = hitUI(world.state, input.mouse);
  if (clicked && target === 'mute') { audio.toggleMute(); input.clear(); return false; }
  if (world.state === 'title' || world.state === 'victory' || world.state === 'gameover') {
    if (input.pressed('Enter') || clicked) { startGame(); return true; }
  } else if (world.state === 'playing') {
    if (input.pressed('KeyP') || (clicked && target === 'pause')) {
      world.state = 'paused'; input.clear(); audio.sfx.click(); return true;
    }
  } else if (world.state === 'paused') {
    if (input.pressed('KeyP') || input.pressed('Enter') || clicked) {
      world.state = 'playing'; input.clear(); audio.sfx.click(); return true;
    }
  } else if (world.state === 'levelup') {
    const index = ['Digit1', 'Digit2', 'Digit3'].findIndex(code => input.pressed(code));
    const chosen = index >= 0 ? index : clicked && target?.startsWith('upgrade') ? Number(target.slice(-1)) : -1;
    if (chosen >= 0 && chooseUpgrade(world, chosen, audio.sfx)) { input.clear(); return true; }
  }
  return false;
}

function announceState() {
  const announcement = `${world.state}:${world.player.level}`;
  if (announcedState === announcement) return;
  announcedState = announcement;
  document.body.dataset.state = world.state;
  const messages = {
    title: 'Emberfall. Click or press Enter to start. WASD or arrow keys move. Mouse aims. Hold mouse or Space to fire. P pauses, M mutes.',
    playing: 'Hold the clearing until dawn.', paused: 'Paused. Press P or Enter to resume.',
    levelup: `Level ${world.player.level}. Choose: ${world.choices.map((choice, i) => `${i + 1}, ${choice.name}, ${choice.description}`).join('. ')}`,
    victory: `Victory. Score ${world.score}. Survived five minutes. ${world.kills} kills. Level ${world.player.level}. Click or press Enter to play again.`,
    gameover: `Game over. Score ${world.score}. ${Math.floor(world.elapsed)} seconds survived. ${world.kills} kills. Level ${world.player.level}. Click or press Enter to play again.`,
  };
  status.textContent = messages[world.state];
}

function frame(timestamp) {
  const dt = clamp((timestamp - lastTimestamp) / 1000, 0, TIMING.maxDt);
  lastTimestamp = timestamp;
  const changed = handleInput();
  if (!changed && !world.staged) {
    if (world.state === 'playing') updateWorld(world, input, dt, audio.sfx);
    else if (['title', 'victory', 'gameover'].includes(world.state)) world.visualTime += dt;
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = PALETTE.night;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = viewport.scale * viewport.dpr;
  ctx.setTransform(scale, 0, 0, scale, viewport.x * viewport.dpr, viewport.y * viewport.dpr);
  render(ctx, world, input, audio);
  canvas.style.cursor = world.state === 'playing' ? 'none' : input.mouse.moved && hitUI(world.state, input.mouse) ? 'pointer' : 'default';
  announceState();
  input.endFrame();
  requestAnimationFrame(frame);
}

window.addEventListener('resize', resize);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { input.clear(); pauseOnBlur(); }
  lastTimestamp = performance.now();
});
window.addEventListener('pagehide', audio.dispose, { once: true });
resize();
requestAnimationFrame(frame);

export function getWorld() { return world; }
