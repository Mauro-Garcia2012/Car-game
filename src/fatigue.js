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

/**
 * Seconds of driving from a full night's sleep to nodding off.
 *
 * Twelve minutes rather than six. At six the meter was the tightest thing in
 * the game by a distance: anything slower than a brisk cruise did not reach
 * the next bed, which quietly ruled out half the garage and turned every day
 * into the same hurried dash. At twelve there is room to stop for a fare, to
 * take a dirt spur, to sit out a sandstorm — and the moped can make a motel.
 */
export const AWAKE_TIME = 720;
/** Below this the wheel starts to wander and the screen closes in. */
const DROWSY_FROM = 0.3;
/**
 * How much the wheel wanders.
 *
 * Tired driving should be a thing you notice and correct, not a thing that
 * takes the car off you. These are deliberately small: at the very end of
 * the meter the drift is a few centimetres a second, which is a nag in the
 * hands rather than a fight, and the closing veil and the blackouts carry
 * the feeling instead.
 */
const DROWSY_PULL = 0.09;
const MICROSLEEP_PULL = 0.18;
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
      // Foot still on the pedal, and the hands go slack rather than letting
      // go: you keep most of your own steering through a blackout, so a
      // second of it is a fright rather than an automatic trip into the sand.
      out.steer = out.steer * 0.8 + this.wander * MICROSLEEP_PULL;
      out.brake = 0;
      return out;
    }
    if (this.drowsiness > 0) {
      out.steer = Math.max(-1, Math.min(1, out.steer + this.wander * DROWSY_PULL));
    }
    return out;
  }
}
