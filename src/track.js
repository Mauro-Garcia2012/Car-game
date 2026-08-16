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

export const ROAD_HALF = 4.8; // half width of the tarmac (two 4.8 m lanes)
export const SHOULDER = 2.2; // gravel shoulder on each side
export const EDGE = ROAD_HALF + SHOULDER; // where the desert starts

export function centerX(s) {
  return (
    62 * Math.sin(s * 0.00061) +
    27 * Math.sin(s * 0.00143 + 1.7) +
    9 * Math.sin(s * 0.0047 + 0.6)
  );
}

export function centerDX(s) {
  return (
    62 * 0.00061 * Math.cos(s * 0.00061) +
    27 * 0.00143 * Math.cos(s * 0.00143 + 1.7) +
    9 * 0.0047 * Math.cos(s * 0.0047 + 0.6)
  );
}

export function centerY(s) {
  return (
    9 * Math.sin(s * 0.00092 + 0.3) +
    3.4 * Math.sin(s * 0.0031 + 2.1) -
    12.4 * Math.sin(0.3)
  );
}

export function centerDY(s) {
  return (
    9 * 0.00092 * Math.cos(s * 0.00092 + 0.3) +
    3.4 * 0.0031 * Math.cos(s * 0.0031 + 2.1)
  );
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
