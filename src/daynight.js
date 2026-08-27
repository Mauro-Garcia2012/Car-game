/**
 * The clock — which in this game is the sleep meter wearing another hat.
 *
 * One full sleep meter is one day. You pull out of the garage a little after
 * dawn, the sun climbs, and the light drains at exactly the rate the driver
 * does: the last of the dusk goes as the last of the meter goes. After that
 * the world simply holds at night. No amount of driving makes the sun come
 * back — only a bed does.
 *
 * Everything here is a pure function of that one number, so the sky, the
 * lights, the fog, the headlamps and the little clock on the HUD can never
 * disagree with each other about what time it is.
 */
import * as THREE from 'three';

/** Clock face. The run opens here and nightfall lands on the other. */
export const DAY_START_HOUR = 7;
export const NIGHT_HOUR = 21;

/**
 * Where the day ends on the meter.
 *
 * The whole day used to fill the bar, which meant the headlamps only came on
 * with the last few per cent of it — you were already fighting to stay awake
 * before you were ever driving in the dark, and night was a thing that
 * happened to you on the way to a motel rather than a stretch of the run.
 * Compressing daylight into the first three quarters leaves the last quarter
 * as proper night driving: lamps on, stars out, and enough of the meter left
 * to actually go somewhere in it.
 */
const NIGHTFALL_AT = 0.75;

/** The phase at which the sun touches the horizon; the rest is dusk. */
const SUNSET_AT = 0.66;

/** Where the sun comes up, as seen from a car pointing down the road. */
const EAST = new THREE.Vector3(-0.62, 0, 0.78).normalize();

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);

/**
 * Keyframes of the day. Everything between them is interpolated, so the
 * sky never steps — it only ever slides from one of these to the next.
 */
const STOPS = [
  {
    at: 0.0, // first light
    zenith: '#2f63a8',
    horizon: '#f2b184',
    ground: '#bb8a62',
    sun: '#ffc78d',
    fog: '#e2b995',
    fogNear: 420,
    fogFar: 1550,
    keyColor: '#ffca94',
    keyIntensity: 1.55,
    hemiSky: '#b9cdf0',
    hemiGround: '#7d6148',
    hemiIntensity: 0.5,
    fill: 0.18,
    stars: 0.22,
    moon: 0.25,
    lamps: 0.15,
    exposure: 1.02,
    env: 0.55,
    neon: 1.5,
  },
  {
    at: 0.1, // morning proper
    zenith: '#3a79c8',
    horizon: '#dbd2c0',
    ground: '#c8ab88',
    sun: '#fff1d6',
    fog: '#dcd2be',
    fogNear: 520,
    fogFar: 1700,
    keyColor: '#fff4e2',
    keyIntensity: 2.15,
    hemiSky: '#a9c6f7',
    hemiGround: '#8f7154',
    hemiIntensity: 0.72,
    fill: 0.26,
    stars: 0,
    moon: 0.05,
    lamps: 0,
    exposure: 1.05,
    env: 1,
    neon: 1,
  },
  {
    at: 0.3, // high noon, the flattest and harshest light of the run
    zenith: '#2f7ad6',
    horizon: '#c3d6e8',
    ground: '#cbb392',
    sun: '#ffffff',
    fog: '#ddd8cc',
    fogNear: 600,
    fogFar: 1850,
    keyColor: '#fffdf6',
    keyIntensity: 2.8,
    hemiSky: '#a9c6f7',
    hemiGround: '#96754f',
    hemiIntensity: 0.85,
    fill: 0.3,
    stars: 0,
    moon: 0,
    lamps: 0,
    exposure: 1.05,
    env: 1.15,
    neon: 0.9,
  },
  {
    at: 0.46, // the late afternoon the game used to live in permanently
    zenith: '#3c7fd0',
    horizon: '#e9cba6',
    ground: '#cdad86',
    sun: '#ffd7a0',
    fog: '#d8c3a6',
    fogNear: 550,
    fogFar: 1750,
    keyColor: '#fff3de',
    keyIntensity: 2.35,
    hemiSky: '#a9c6f7',
    hemiGround: '#96754f',
    hemiIntensity: 0.7,
    fill: 0.28,
    stars: 0,
    moon: 0,
    lamps: 0,
    exposure: 1.05,
    env: 1,
    neon: 1,
  },
  {
    at: 0.58, // golden hour
    zenith: '#2f6bbe',
    horizon: '#f8ba77',
    ground: '#c08d5f',
    sun: '#ffb163',
    fog: '#dcae80',
    fogNear: 430,
    fogFar: 1500,
    keyColor: '#ffbf7a',
    keyIntensity: 1.95,
    hemiSky: '#9dbdf0',
    hemiGround: '#8a6440',
    hemiIntensity: 0.55,
    fill: 0.18,
    stars: 0,
    moon: 0.1,
    lamps: 0.25,
    exposure: 1.05,
    env: 0.85,
    neon: 1.2,
  },
  {
    at: SUNSET_AT, // the disc on the horizon
    zenith: '#22467f',
    horizon: '#ef7548',
    ground: '#8d5c42',
    sun: '#ff7638',
    fog: '#bc7452',
    fogNear: 300,
    fogFar: 1250,
    keyColor: '#ff8848',
    keyIntensity: 1.15,
    hemiSky: '#6f86bc',
    hemiGround: '#5d4432',
    hemiIntensity: 0.42,
    fill: 0.1,
    stars: 0.15,
    moon: 0.45,
    lamps: 0.75,
    exposure: 1.04,
    env: 0.6,
    neon: 1.7,
  },
  {
    at: 0.71, // blue hour: the light is gone but the sky is not black yet
    zenith: '#101f42',
    horizon: '#6a4870',
    ground: '#392f47',
    sun: '#7a4a70',
    fog: '#463b52',
    fogNear: 160,
    fogFar: 900,
    keyColor: '#7b83b8',
    keyIntensity: 0.42,
    hemiSky: '#2c3555',
    hemiGround: '#221f2b',
    hemiIntensity: 0.26,
    fill: 0.05,
    stars: 0.7,
    moon: 0.85,
    lamps: 1,
    exposure: 1.02,
    env: 0.28,
    neon: 2.1,
  },
  {
    at: NIGHTFALL_AT, // full night, and here it stays until somebody sleeps
    zenith: '#04060e',
    horizon: '#0c1526',
    ground: '#070911',
    sun: '#131b2c',
    fog: '#090e19',
    fogNear: 110,
    fogFar: 720,
    keyColor: '#9db2e4',
    keyIntensity: 0.3,
    hemiSky: '#16203a',
    hemiGround: '#0c0f16',
    hemiIntensity: 0.13,
    fill: 0.02,
    stars: 1,
    moon: 1,
    lamps: 1,
    exposure: 1.0,
    env: 0.12,
    neon: 2.4,
  },
];

const COLOR_KEYS = ['zenith', 'horizon', 'ground', 'sun', 'fog', 'keyColor', 'hemiSky', 'hemiGround'];
const NUMBER_KEYS = [
  'fogNear', 'fogFar', 'keyIntensity', 'hemiIntensity', 'fill',
  'stars', 'moon', 'lamps', 'exposure', 'env', 'neon',
];

// Parse the palettes once; sampling then only ever lerps.
for (const stop of STOPS) {
  for (const key of COLOR_KEYS) stop[key] = new THREE.Color(stop[key]);
}

/** A reusable bag of everything the renderer needs for one instant. */
export function createLighting() {
  const out = {};
  for (const key of COLOR_KEYS) out[key] = new THREE.Color();
  for (const key of NUMBER_KEYS) out[key] = 0;
  out.sunDir = new THREE.Vector3();
  out.moonDir = new THREE.Vector3();
  out.keyDir = new THREE.Vector3();
  out.phase = 0;
  return out;
}

/** Where the sun is at this hour. Below the horizon after sunset. */
export function sunDirection(phase, out) {
  const arc = Math.PI * (0.045 + (phase / SUNSET_AT) * 0.955);
  const flat = Math.cos(arc);
  return out.set(EAST.x * flat, Math.sin(arc), EAST.z * flat).normalize();
}

/**
 * The moon sits ahead and to the left, climbing a little through the night,
 * which puts it in the windscreen rather than behind your head.
 */
export function moonDirection(phase, out) {
  const rise = 0.24 + clamp01((phase - SUNSET_AT) / 0.34) * 0.17;
  return out.set(-0.46, rise, -0.72).normalize();
}

/**
 * Fills `out` with the whole lighting state for a moment of the day.
 * @param {number} phase 0 at dawn, 1 at nightfall
 * @param {ReturnType<createLighting>} out
 */
export function sampleLighting(phase, out) {
  const p = clamp01(phase);
  out.phase = p;

  let i = 0;
  while (i < STOPS.length - 2 && STOPS[i + 1].at < p) i++;
  const a = STOPS[i];
  const b = STOPS[i + 1];
  const span = b.at - a.at;
  const t = span > 0 ? clamp01((p - a.at) / span) : 0;

  for (const key of COLOR_KEYS) out[key].lerpColors(a[key], b[key], t);
  for (const key of NUMBER_KEYS) out[key] = a[key] + (b[key] - a[key]) * t;

  sunDirection(p, out.sunDir);
  moonDirection(p, out.moonDir);

  // The key light hands over from sun to moon across dusk. Both are weak by
  // then, so the shadows swing round without anybody noticing.
  const handover = clamp01((p - SUNSET_AT) / 0.09);
  out.keyDir
    .copy(out.sunDir)
    .multiplyScalar(1 - handover)
    .addScaledVector(out.moonDir, handover)
    .normalize();

  return out;
}

/**
 * The clock face, for the HUD. Runs from dawn to nightfall across the meter
 * and then keeps ticking into the small hours while you refuse to stop.
 */
export function clockFor(phase, overrun = 0) {
  // Two rates, because the day and the night are no longer the same length
  // on the meter: fourteen hours of daylight over the first three quarters,
  // then three hours of dark over the last one.
  const p = clamp01(phase);
  const day =
    p < NIGHTFALL_AT
      ? (p / NIGHTFALL_AT) * (NIGHT_HOUR - DAY_START_HOUR)
      : NIGHT_HOUR -
        DAY_START_HOUR +
        ((p - NIGHTFALL_AT) / (1 - NIGHTFALL_AT)) * 3;
  const hours = DAY_START_HOUR + day + overrun;
  const wrapped = ((hours % 24) + 24) % 24;
  const h = Math.floor(wrapped);
  const m = Math.floor((wrapped - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
