/**
 * How hard the road is, as a function of how far down it you are.
 *
 * The game had no difficulty curve at all. Kilometre five hundred played
 * exactly like kilometre five: same spacing between pumps, same spacing
 * between beds, same thin traffic, same weather. The odometer was a score
 * with nothing behind it — going further was longer, never harder — and the
 * only thing that ever ended a run was a mistake you could equally have made
 * in the first ten minutes.
 *
 * Now the desert thins out as you go. The pumps get further apart, the beds
 * get further apart, the traffic thickens and the storms come round more
 * often. It saturates rather than climbing forever: past a few hundred
 * kilometres the road is as bad as it gets, which is bad enough, and the
 * answer to it is the workshop — the road gets harder and you get stronger.
 */

/** Where the pressure is half of everything it will ever be. */
const HALF_AT = 150000;

/** 0 at the start line, approaching 1 a long way down the road. */
export function pressure(s) {
  const d = Math.max(0, s);
  return d / (d + HALF_AT);
}

/**
 * Scales a value by the pressure at `s`.
 * @param {number} base what it is at the start line
 * @param {number} at what it is multiplied by once the road is as bad as it gets
 */
export function scaled(s, base, at) {
  return base * (1 + (at - 1) * pressure(s));
}
