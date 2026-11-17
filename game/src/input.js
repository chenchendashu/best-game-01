const GAME_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight', 'Space', 'Enter', 'KeyP', 'KeyM', 'Digit1', 'Digit2', 'Digit3']);

export function createInput(canvas, toWorld, onGesture, onBlur) {
  const keys = new Set();
  const pressed = new Set();
  const mouse = { x: 1000, y: 450, clientX: null, clientY: null, down: false, clicked: false, moved: false };
  function updateMouse(event) {
    mouse.clientX = event.clientX;
    mouse.clientY = event.clientY;
    refreshPointer();
    mouse.moved = true;
  }
  function refreshPointer() {
    if (mouse.clientX === null) return;
    const point = toWorld(mouse.clientX, mouse.clientY);
    mouse.x = point.x;
    mouse.y = point.y;
  }
  function keydown(event) {
    if (!GAME_KEYS.has(event.code)) return;
    event.preventDefault();
    onGesture();
    if (!keys.has(event.code) && !event.repeat) pressed.add(event.code);
    keys.add(event.code);
  }
  function keyup(event) { keys.delete(event.code); }
  function pointerdown(event) {
    if (event.button !== 0) return;
    updateMouse(event);
    mouse.down = true;
    mouse.clicked = true;
    canvas.focus({ preventScroll: true });
    canvas.setPointerCapture(event.pointerId);
    onGesture();
  }
  function pointerup() { mouse.down = false; }
  function blur() { clear(); onBlur(); }
  function clear() { keys.clear(); pressed.clear(); mouse.down = false; mouse.clicked = false; }
  function endFrame() { pressed.clear(); mouse.clicked = false; }
  function movement() {
    let x = Number(keys.has('KeyD') || keys.has('ArrowRight')) - Number(keys.has('KeyA') || keys.has('ArrowLeft'));
    let y = Number(keys.has('KeyS') || keys.has('ArrowDown')) - Number(keys.has('KeyW') || keys.has('ArrowUp'));
    const length = Math.hypot(x, y);
    if (length) { x /= length; y /= length; }
    return { x, y };
  }
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  canvas.addEventListener('pointermove', updateMouse);
  canvas.addEventListener('pointerdown', pointerdown);
  window.addEventListener('pointerup', pointerup);
  window.addEventListener('pointercancel', pointerup);
  canvas.addEventListener('lostpointercapture', pointerup);
  window.addEventListener('blur', blur);
  canvas.addEventListener('contextmenu', event => event.preventDefault());
  return {
    mouse, movement, clear, endFrame, refreshPointer, pressed: code => pressed.has(code),
    firing: () => mouse.down || keys.has('Space'),
    aimAngle: player => Math.atan2(mouse.y - player.y, mouse.x - player.x),
  };
}
