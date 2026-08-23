/**
 * Sandstorms.
 *
 * The desert is the same clear blue every day, which is the one thing about
 * it that is not true. A few times in a long run the wind gets up and the
 * horizon disappears, and the drive stops being about the fuel gauge and
 * starts being about how fast you dare go when you can see ninety metres.
 *
 * A storm is a stretch of road, not a timer: it belongs to a place, it is
 * deterministic from the seed like everything else out here, and you drive
 * into it and out the far side. That means the same run always meets the
 * same weather, a resumed run picks it up where it left off, and nothing
 * has to be written into the save.
 */
import { hashRand, onReseed } from './rng.js';

/**
 * Where the first one can be, and how far apart they run after that.
 *
 * The first is deliberately early: a run that ends at thirty kilometres
 * should still have met one, or the weather may as well not exist.
 */
const FIRST_STORM = 8500;
const FIRST_SPREAD = 7000;
const GAP_MIN = 19000;
const GAP_SPREAD = 17000;
/** How long one lasts, along the road. */
const LEN_MIN = 2600;
const LEN_SPREAD = 2800;
/**
 * How far the leading and trailing edges take to build.
 *
 * Long enough that you can see it coming and lift off, short enough that it
 * still arrives. Driving into a wall of dust with no warning would be a
 * cheap way to lose a run.
 */
const RAMP = 620;

const storms = [];
onReseed(() => {
  storms.length = 0;
});

function computeStorm(i) {
  const s =
    i === 0
      ? FIRST_STORM + Math.round(hashRand(0, 5501) * FIRST_SPREAD)
      : storms[i - 1].s +
        storms[i - 1].length +
        GAP_MIN +
        Math.round(hashRand(i, 5501) * GAP_SPREAD);
  const length = LEN_MIN + Math.round(hashRand(i, 5507) * LEN_SPREAD);
  return { s, length };
}

/** Where storm `i` starts and how long it lasts, memoised. */
export function stormAt(i) {
  while (storms.length <= i) storms.push(computeStorm(storms.length));
  return storms[i];
}

/** Index of the first storm whose far edge is still ahead of `s`. */
export function nextStormIndex(s) {
  let i = 0;
  while (stormAt(i).s + stormAt(i).length + RAMP < s) i++;
  return i;
}

/**
 * How thick the air is at `s`, from 0 (clear) to 1 (the worst of it).
 *
 * Smoothstepped at both ends, so it closes in and lets go rather than
 * switching.
 */
export function stormLevel(s) {
  const storm = stormAt(nextStormIndex(s));
  const start = storm.s;
  const end = storm.s + storm.length;
  if (s < start - RAMP || s > end + RAMP) return 0;
  const t =
    s < start
      ? (s - (start - RAMP)) / RAMP
      : s > end
        ? 1 - (s - end) / RAMP
        : 1;
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** Metres until the next storm's leading edge, or Infinity once inside one. */
export function metresToStorm(s) {
  const storm = stormAt(nextStormIndex(s));
  const edge = storm.s - RAMP;
  return s < edge ? edge - s : Infinity;
}
