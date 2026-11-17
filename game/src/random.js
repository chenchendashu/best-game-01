export function mulberry32(seed) {
  let state = seed >>> 0;
  return function random() {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
export function range(rng, min, max) { return min + rng() * (max - min); }
export function integer(rng, min, max) { return Math.floor(range(rng, min, max + 1)); }
export function pick(rng, values) { return values[Math.floor(rng() * values.length)]; }
export function chance(rng, probability) { return rng() < probability; }
export function shuffle(rng, values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) {
    const j = integer(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
