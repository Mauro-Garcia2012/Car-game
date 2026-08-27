/**
 * Track geometry.
 *
 * The highway is an infinite analytic curve parameterised by `s`, the distance
 * travelled from the start line (metres). World space uses the three.js
 * convention (Y up) and the road runs towards -Z, so a point at distance `s`
 * sits at world z = -s.
 *
 *   centerX(s)  lateral position of the centre line
 *   centerY(s)  elevation of the tarmac
 *
 * Everything else in the game (road ribbon, terrain, props, gas stations,
 * traffic and the player car) is placed through `roadPoint()` so the whole
 * world stays glued to the same curve.
 */

import { hashRand, onReseed } from './rng.js';

export const ROAD_HALF = 4.8; // half width of the tarmac (two 4.8 m lanes)
export const SHOULDER = 2.2; // gravel shoulder on each side
export const EDGE = ROAD_HALF + SHOULDER; // where the desert starts

/**
 * The centre line and the elevation, as sums of sines.
 *
 * The amplitudes and frequencies below are the shape of the road; the seed
 * shifts every phase and nudges every amplitude and frequency, which is what
 * makes one run's highway a different road rather than the same one with
 * different scenery on it.
 */
const LATERAL_WAVES = [
  { amp: 62, freq: 0.00061 },
  { amp: 27, freq: 0.00143 },
  { amp: 9, freq: 0.0047 },
];
const HEIGHT_WAVES = [
  { amp: 9, freq: 0.00092 },
  { amp: 3.4, freq: 0.0031 },
];

let lateral = [];
let height = [];
let heightLevel = 0;

function shape(waves, salt) {
  return waves.map((w, i) => ({
    amp: w.amp * (0.72 + hashRand(salt + i, 11) * 0.56),
    freq: w.freq * (0.78 + hashRand(salt + 40 + i, 11) * 0.44),
    phase: hashRand(salt + 80 + i, 11) * Math.PI * 2,
  }));
}

onReseed(() => {
  lateral = shape(LATERAL_WAVES, 7000);
  height = shape(HEIGHT_WAVES, 7300);
  // Level the start line: whatever the phases came out as, s = 0 is y = 0,
  // so the car never begins the run buried or hanging in the air.
  heightLevel = height.reduce((sum, w) => sum + w.amp * Math.sin(w.phase), 0);
});

export function centerX(s) {
  let v = 0;
  for (const w of lateral) v += w.amp * Math.sin(s * w.freq + w.phase);
  return v;
}

export function centerDX(s) {
  let v = 0;
  for (const w of lateral) v += w.amp * w.freq * Math.cos(s * w.freq + w.phase);
  return v;
}

export function centerY(s) {
  let v = -heightLevel;
  for (const w of height) v += w.amp * Math.sin(s * w.freq + w.phase);
  return v;
}

export function centerDY(s) {
  let v = 0;
  for (const w of height) v += w.amp * w.freq * Math.cos(s * w.freq + w.phase);
  return v;
}

/** Heading of the road at `s`, in the same frame as Object3D.rotation.y. */
export function roadYaw(s) {
  // An object at rotation.y = yaw faces (-sin yaw, -cos yaw); the road faces
  // (dx, -1) normalised, so yaw = atan2(-dx, 1).
  return Math.atan2(-centerDX(s), 1);
}

/** Road pitch (positive = climbing) at `s`. */
export function roadPitch(s) {
  return Math.atan(centerDY(s));
}

/**
 * World position of the point `lateral` metres to the right of the centre
 * line at distance `s`. Writes into `out` ({x,y,z}) to stay allocation free.
 */
export function roadPoint(s, lateral, out = { x: 0, y: 0, z: 0 }) {
  const dx = centerDX(s);
  const inv = 1 / Math.hypot(dx, 1);
  // forward = (dx, -1) * inv  ->  right = (1, dx) * inv
  out.x = centerX(s) + lateral * inv;
  out.y = centerY(s);
  out.z = -s + lateral * dx * inv;
  return out;
}

/** Inverse of roadPoint: recovers (s, lateral) from a world position. */
export function roadCoords(x, z, out = { s: 0, lateral: 0 }) {
  // The curve is shallow (< 12 deg), so one Newton-ish correction is plenty.
  let s = -z;
  for (let i = 0; i < 2; i++) {
    const dx = centerDX(s);
    const inv = 1 / Math.hypot(dx, 1);
    const lat = (x - centerX(s)) * inv;
    s = -(z - lat * dx * inv);
  }
  const dx = centerDX(s);
  const inv = 1 / Math.hypot(dx, 1);
  out.s = s;
  out.lateral = (x - centerX(s)) * inv;
  return out;
}

/** True when the given lateral offset is on tarmac. */
export function onRoad(lateral) {
  return Math.abs(lateral) <= ROAD_HALF;
}
