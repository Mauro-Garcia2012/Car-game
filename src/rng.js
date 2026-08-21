/** Tiny deterministic hash/noise helpers so recycled world chunks stay stable. */

function hash32(n) {
  let h = n | 0;
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * The seed the whole world hangs off.
 *
 * Every chunk of desert, every gas station, every dune and the shape of the
 * road itself come out of `hashRand`, so mixing one number into it here is
 * what makes one run a different place from the last. It has to be set
 * before anything is generated and left alone until the run ends — change it
 * mid-drive and the stations move out from under the car.
 */
let seed = 0;
const reseedListeners = [];

export function worldSeed() {
  return seed;
}

/** @param {number} value any integer; 0 is the original hand-tuned world. */
export function setWorldSeed(value) {
  seed = (value | 0) >>> 0;
  for (const fn of reseedListeners) fn(seed);
}

/**
 * Registers something that has to be rebuilt when the world changes. Called
 * immediately as well, so a listener never starts out of step.
 */
export function onReseed(fn) {
  reseedListeners.push(fn);
  fn(seed);
}

/** Stable pseudo random value in [0,1) for an integer key. */
export function hashRand(a, b = 0) {
  return (
    hash32(
      Math.imul(a, 374761393) +
        Math.imul(b, 668265263) +
        Math.imul(seed, 2654435761)
    ) / 4294967296
  );
}

/** Smooth value noise in 2D. */
export function noise2(x, y, seed = 0) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  const a = hashRand(ix + iy * 8191, seed);
  const b = hashRand(ix + 1 + iy * 8191, seed);
  const c = hashRand(ix + (iy + 1) * 8191, seed);
  const d = hashRand(ix + 1 + (iy + 1) * 8191, seed);
  return (a + (b - a) * ux) * (1 - uy) + (c + (d - c) * ux) * uy;
}
