/**
 * Graphics quality presets.
 *
 * The models in this game are built in code, not loaded from files, so the
 * detail is a set of numbers rather than a set of assets: how finely a body
 * profile is sampled, how many sides a tyre has, whether a car has an
 * interior behind its glass. That makes quality settings unusually direct —
 * turn the numbers down and the same builders produce a lighter car.
 *
 * `ultra` is not a new maximum invented for this menu. It is exactly what
 * the game rendered before there was a menu at all: every value here is the
 * constant it replaced, so picking Ultra gets you the same frame, triangle
 * for triangle.
 *
 * Nothing in here touches what is *in* the world — the same stations, the
 * same traffic, the same distances. Quality changes how the desert is drawn,
 * never what it contains, because a setting that quietly made the game
 * easier or harder would not be a graphics setting.
 */

export const LEVELS = ['low', 'medium', 'high', 'ultra'];

/**
 * `radial` scales every "round thing" segment count at once — tyre lathes,
 * rim barrels, wheel wells, fender arches, extrude bevels, brake-disc drill
 * holes, cooling fins, chain links. One dial instead of thirty, and the
 * ratios between them stay where they were tuned.
 *
 * `propDensity` is the only dial that changes what is in the desert rather
 * than how it is drawn: it thins the cacti, boulders, brush and fence posts
 * scattered off the verge. Nothing that matters is scattered — stations,
 * shelters, signs, spurs and landmarks are all placed deliberately and are
 * never touched — so a thinner desert costs you scenery and nothing else.
 *
 * `profileStep` is the odd one out and the most powerful: the lateral
 * squeeze that shapes a body is applied per vertex, so this is the distance
 * between samples along a profile. Small step, curved flank. Large step,
 * flat chamfer.
 */
const PRESETS = {
  low: {
    label: 'LOW',
    propDensity: 0.4,
    radial: 0.28,
    profileStep: 0.16,
    interiors: false,
    shutLines: false,
    wipers: false,
    suspension: false,
    aerials: false,
    lampPods: false,
    brakeDetail: false,
    bikeDetail: false,
    envMap: false,
    envIntensity: 0,
    clearcoat: false,
    transmission: false,
    shadows: false,
    shadowMap: 0,
    shadowSoft: false,
    pixelRatio: 1,
    antialias: false,
  },
  medium: {
    label: 'MEDIUM',
    propDensity: 0.62,
    radial: 0.45,
    profileStep: 0.1,
    interiors: true,
    shutLines: false,
    wipers: true,
    suspension: false,
    aerials: true,
    lampPods: true,
    brakeDetail: false,
    bikeDetail: true,
    envMap: true,
    envIntensity: 0.45,
    clearcoat: false,
    transmission: false,
    shadows: true,
    shadowMap: 1024,
    shadowSoft: false,
    pixelRatio: 1,
    antialias: true,
  },
  high: {
    label: 'HIGH',
    propDensity: 0.82,
    radial: 0.68,
    profileStep: 0.062,
    interiors: true,
    shutLines: true,
    wipers: true,
    suspension: true,
    aerials: true,
    lampPods: true,
    brakeDetail: true,
    bikeDetail: true,
    envMap: true,
    envIntensity: 0.75,
    clearcoat: true,
    transmission: false,
    shadows: true,
    shadowMap: 1536,
    shadowSoft: true,
    pixelRatio: 1.5,
    antialias: true,
  },
  ultra: {
    label: 'ULTRA',
    propDensity: 1,
    radial: 1,
    profileStep: 0.042,
    interiors: true,
    shutLines: true,
    wipers: true,
    suspension: true,
    aerials: true,
    lampPods: true,
    brakeDetail: true,
    bikeDetail: true,
    envMap: true,
    envIntensity: 1,
    clearcoat: true,
    transmission: true,
    shadows: true,
    shadowMap: 2048,
    shadowSoft: true,
    pixelRatio: 2,
    antialias: true,
  },
};

const STORE_KEY = 'desert-run-quality';

/**
 * What to boot at when nobody has chosen yet.
 *
 * Ultra is the desktop default because Ultra is what the game was before
 * these presets existed, and a machine that was running it fine should not
 * be quietly demoted. A phone is a different machine: the same frame at a
 * device pixel ratio of three is nine times the fill, and soft shadows and
 * a transmission pass on top of that is why a flagship handset was dropping
 * frames. Phones start at Medium and can be moved up from the menu — which
 * is the point of having a menu.
 */
function detectLevel() {
  if (typeof window === 'undefined') return 'ultra';
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  const nav = window.navigator || {};
  const mobile = nav.userAgentData ? nav.userAgentData.mobile : coarse;
  const cores = nav.hardwareConcurrency || 8;
  if (mobile || coarse) return cores >= 8 ? 'medium' : 'low';
  // A desktop with very few cores is usually an old laptop on integrated
  // graphics, and those do not enjoy a transmission pass either.
  return cores <= 4 ? 'high' : 'ultra';
}

/** Reads the stored choice, falling back to what the device can take. */
function stored() {
  let value = null;
  try {
    value = localStorage.getItem(STORE_KEY);
  } catch {
    // Private windows and locked-down browsers throw here. Not worth caring.
  }
  return LEVELS.includes(value) ? value : detectLevel();
}

/**
 * Resolved at module load, before anything is built or the menu is drawn.
 *
 * It has to happen this early because antialiasing is baked into the GL
 * context when the renderer is constructed, and because the pills in the
 * menu should already show the level the game actually booted at.
 */
let current = stored();

/**
 * The live settings object. Everything reads this at build time rather than
 * holding a copy, so a change reaches the next model that gets built.
 */
export let Q = PRESETS[current];

const listeners = [];

/**
 * Round segment counts down with the quality dial, never below a floor.
 *
 * The floor matters: a cylinder with two sides is not a cheap cylinder, it
 * is a bug. Callers pass the Ultra count and the smallest number that still
 * reads as the shape.
 */
export function seg(ultraCount, min = 4) {
  return Math.max(min, Math.round(ultraCount * Q.radial));
}

export function qualityLevel() {
  return current;
}

export function qualityLabel(level = current) {
  return PRESETS[level].label;
}

/**
 * Switch level. Returns true if anything actually changed, so callers can
 * skip the rebuild when a button is pressed twice.
 */
export function setQuality(level, { persist = true } = {}) {
  if (!LEVELS.includes(level) || level === current) return false;
  current = level;
  Q = PRESETS[level];
  if (persist) {
    try {
      localStorage.setItem(STORE_KEY, level);
    } catch {
      // Same as above: a setting that will not stick is better than a crash.
    }
  }
  for (const fn of listeners) fn(Q, level);
  return true;
}

/** Called on every change, and immediately on registration. */
export function onQualityChange(fn) {
  listeners.push(fn);
  fn(Q, current);
}
