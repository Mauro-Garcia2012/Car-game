/**
 * Sleep, measured in time rather than distance.
 *
 * This is the counterweight to the fuel gauge: fuel drains per metre, sleep
 * drains per second. Cruising slowly saves petrol but eats the clock, so the
 * two resources pull in opposite directions and there is a speed that keeps
 * both alive.
 *
 * Running out never ends the run on its own — it makes you drive badly. The
 * wheel starts wandering, the edges of the world close in, and eventually you
 * black out for a second at a time. What happens next is up to the road.
 */

/** Seconds of driving from a full night's sleep to nodding off. */
export const AWAKE_TIME = 360;
/** Below this the wheel starts to wander and the screen closes in. */
const DROWSY_FROM = 0.3;
const MICROSLEEP_MIN = 0.55;
const MICROSLEEP_SPREAD = 0.6;
const BETWEEN_MICROSLEEPS = 3.2;
const BETWEEN_SPREAD = 3.5;

export class Fatigue {
  constructor() {
    this.reset();
  }

  reset() {
    this.level = 1; // 1 = wide awake, 0 = asleep at the wheel
    this.wander = 0;
    this.wanderPhase = Math.random() * Math.PI * 2;
    this.microsleep = 0; // seconds left of the current blackout
    this.nextMicrosleep = BETWEEN_MICROSLEEPS;
    this.blinked = false;
  }

  /** A full night in a motel bed. */
  sleep() {
    this.level = 1;
    this.microsleep = 0;
    this.nextMicrosleep = BETWEEN_MICROSLEEPS;
  }

  /** 0 while fresh, 1 when completely gone — drives the visuals. */
  get drowsiness() {
    return Math.min(1, Math.max(0, (DROWSY_FROM - this.level) / DROWSY_FROM));
  }

  get asleep() {
    return this.microsleep > 0;
  }

  update(dt) {
    this.level = Math.max(0, this.level - dt / AWAKE_TIME);
    this.wanderPhase += dt * (0.5 + this.drowsiness * 0.7);
    // A slow, uneven drift — not a tidy sine, or it is too easy to counter.
    this.wander =
      (Math.sin(this.wanderPhase) * 0.7 + Math.sin(this.wanderPhase * 2.3) * 0.3) *
      this.drowsiness;

    this.blinked = false;
    if (this.microsleep > 0) {
      this.microsleep -= dt;
      return;
    }
    if (this.level <= 0) {
      this.nextMicrosleep -= dt;
      if (this.nextMicrosleep <= 0) {
        this.microsleep = MICROSLEEP_MIN + Math.random() * MICROSLEEP_SPREAD;
        this.nextMicrosleep = BETWEEN_MICROSLEEPS + Math.random() * BETWEEN_SPREAD;
        this.blinked = true; // the frame a blackout starts, for the sound
      }
    }
  }

  /**
   * Filters the driver's controls through however awake they are.
   * @returns {{throttle:number, brake:number, steer:number, handbrake:boolean}}
   */
  applyToInput(input) {
    const out = {
      throttle: input.throttle,
      brake: input.brake,
      steer: input.steer,
      handbrake: input.handbrake,
    };
    if (this.microsleep > 0) {
      // Hands off the wheel, foot still on the pedal.
      out.steer = this.wander * 0.5;
      out.brake = 0;
      return out;
    }
    if (this.drowsiness > 0) {
      out.steer = Math.max(-1, Math.min(1, out.steer + this.wander * 0.32));
    }
    return out;
  }
}
