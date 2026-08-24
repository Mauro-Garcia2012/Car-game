/**
 * Highway patrol.
 *
 * The speed limit was a fifty-dollar tax collected by a camera you could see
 * coming, which is not a rule, it is a toll. There is a car sitting in the
 * shade every few kilometres now, and if you come past it far enough over
 * the limit it pulls out.
 *
 * What makes it a decision rather than a punishment is that it is a chase
 * you can lose or win. It runs to about two hundred, so most of the garage
 * cannot simply drive away from it and the two that can are the two that
 * were already fast enough to be in trouble. Stopping costs you a fine and
 * two minutes. Running costs you the fuel and everything you hit while you
 * are looking in the mirror.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { hashRand, onReseed } from '../rng.js';
import { groundHeight } from './road.js';
import { glowAtNight } from './nightlights.js';
import { MAT, part, paint } from '../cars/parts.js';

/** How far apart they wait, and how far the first one is out. */
const FIRST = 5200;
const GAP_MIN = 6400;
const GAP_SPREAD = 8600;
/** How far over the posted limit before one bothers, in m/s. */
export const GRACE = 6.5;
/** Where it waits, and how fast it can go. */
const PARKED_LATERAL = EDGE + 3.4;
const TOP_SPEED = 56;
/** Close enough to be pulled over, and slow enough to be stopped. */
const CATCH_GAP = 16;
const STOPPED = 7;
/** Give up after this long, or this far behind. */
const CHASE_TIME = 42;
const CHASE_LOST = 950;
/** The bill: a base, plus this much for every km/h over the limit. */
const FINE_BASE = 120;
const FINE_PER_KMH = 7;

const spots = [];
onReseed(() => {
  spots.length = 0;
});

/** Where patrol `i` waits. */
export function patrolAt(i) {
  while (spots.length <= i) {
    const n = spots.length;
    const prev = n === 0 ? FIRST : spots[n - 1].s;
    spots.push({
      s: prev + GAP_MIN + Math.round(hashRand(n, 7001) * GAP_SPREAD),
      side: hashRand(n, 7013) < 0.5 ? -1 : 1,
    });
  }
  return spots[i];
}

/** Index of the first patrol at or beyond `s`. */
export function nextPatrolIndex(s) {
  let i = 0;
  while (patrolAt(i).s < s - 60) i++;
  return i;
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

let LIGHTS = null;
function lightMaterials() {
  if (LIGHTS) return LIGHTS;
  LIGHTS = {
    red: glowAtNight(
      new THREE.MeshStandardMaterial({
        color: '#c1201a',
        emissive: '#ff2a1a',
        emissiveIntensity: 0.4,
        roughness: 0.35,
      }),
      2.2
    ),
    blue: glowAtNight(
      new THREE.MeshStandardMaterial({
        color: '#1a44c1',
        emissive: '#2a6cff',
        emissiveIntensity: 0.4,
        roughness: 0.35,
      }),
      2.2
    ),
  };
  return LIGHTS;
}

/** A black-and-white sedan with a bar on the roof. Faces its own -Z. */
function buildPatrol() {
  const g = new THREE.Group();
  const black = paint('#191b1f', { metalness: 0.5, roughness: 0.35 });
  const white = paint('#e6e4dd', { metalness: 0.35, roughness: 0.4 });
  const l = lightMaterials();

  g.add(part(2.0, 0.66, 4.9, black, 0, 0.72, 0));
  g.add(part(2.02, 0.5, 2.2, white, 0, 0.78, 0.35));
  g.add(part(1.74, 0.62, 2.3, black, 0, 1.32, 0.15));
  g.add(part(1.6, 0.5, 0.12, MAT.glass, 0, 1.34, -1.0));
  g.add(part(1.6, 0.46, 0.12, MAT.glass, 0, 1.34, 1.3));
  for (const side of [-1, 1]) {
    g.add(part(0.1, 0.42, 1.5, MAT.glass, side * 0.88, 1.32, 0.2));
    g.add(part(0.42, 0.16, 0.12, MAT.headlight, side * 0.62, 0.86, -2.46));
    g.add(part(0.34, 0.2, 0.1, MAT.tail, side * 0.7, 0.92, 2.46));
  }
  // The bar: red one side, blue the other, so it reads in a mirror.
  g.add(part(1.3, 0.16, 0.3, black, 0, 1.72, 0.1));
  const bar = new THREE.Group();
  bar.position.set(0, 1.72, 0.1);
  g.add(bar);
  bar.add(part(0.58, 0.2, 0.34, l.red, -0.32, 0, 0));
  bar.add(part(0.58, 0.2, 0.34, l.blue, 0.32, 0, 0));
  g.userData.bar = bar;
  g.userData.lights = l;

  for (const [x, z] of [[-0.86, -1.5], [0.86, -1.5], [-0.86, 1.6], [0.86, 1.6]]) {
    const w = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.36, 0.26, 12),
      MAT.rubber ?? MAT.darkMetal
    );
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    g.add(w);
  }
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

/* ------------------------------------------------------------------ */
/* The patrol itself                                                   */
/* ------------------------------------------------------------------ */

export class Police {
  constructor(scene) {
    this.model = buildPatrol();
    this.model.visible = false;
    scene.add(this.model);
    this.reset();
    onReseed(() => this.reset());
  }

  reset() {
    this.index = -1;
    this.state = 'parked';
    this.s = 0;
    this.lateral = 0;
    this.speed = 0;
    this.timer = 0;
    this.blink = 0;
    this.over = 0;
    this.done = new Set();
    if (this.model) this.model.visible = false;
  }

  get chasing() {
    return this.state === 'chasing';
  }

  /**
   * @returns {{started?:boolean, fine?:number, over?:number, lost?:boolean}}
   *   whatever happened this frame
   */
  update(dt, playerS, playerSpeed, limit) {
    const event = {};

    if (this.state === 'parked') {
      const i = nextPatrolIndex(playerS);
      const spot = patrolAt(i);
      if (this.index !== i) {
        this.index = i;
        this.s = spot.s;
        this.lateral = spot.side * PARKED_LATERAL;
        this.speed = 0;
      }
      // It notices you as you go by, not from a kilometre away.
      const gap = playerS - this.s;
      if (
        !this.done.has(i) &&
        gap > 0 &&
        gap < 70 &&
        playerSpeed > limit + GRACE
      ) {
        this.state = 'chasing';
        this.timer = 0;
        this.over = playerSpeed - limit;
        this.speed = Math.max(12, playerSpeed * 0.55);
        event.started = true;
      }
    } else if (this.state === 'chasing') {
      this.timer += dt;
      this.over = Math.max(this.over, playerSpeed - limit);
      // It drives faster than you until it is on you, then it sits there.
      const behind = playerS - this.s;
      const want = Math.min(TOP_SPEED, playerSpeed + (behind > 40 ? 11 : 2));
      this.speed += THREE.MathUtils.clamp(want - this.speed, -14 * dt, 9 * dt);
      this.s += this.speed * dt;
      // Pulls into your lane as it closes.
      const lane = 2.4;
      this.lateral += (lane - this.lateral) * Math.min(1, dt * 0.7);

      if (behind < CATCH_GAP && playerSpeed < STOPPED) {
        this.state = 'parked';
        this.done.add(this.index);
        this.index = -1;
        event.fine = Math.round(FINE_BASE + this.over * 3.6 * FINE_PER_KMH);
        event.over = Math.round(this.over * 3.6);
      } else if (behind > CHASE_LOST || this.timer > CHASE_TIME) {
        this.state = 'parked';
        this.done.add(this.index);
        this.index = -1;
        event.lost = true;
      }
    }

    // Where it actually is, and the bar going round.
    const p = roadPoint(this.s, this.lateral);
    this.model.position.set(p.x, groundHeight(this.s, this.lateral), p.z);
    this.model.rotation.y = roadYaw(this.s);
    this.model.visible = Math.abs(this.s - playerS) < 900;

    const l = this.model.userData.lights;
    if (this.chasing) {
      this.blink += dt * 9;
      const on = Math.sin(this.blink) > 0;
      l.red.emissiveIntensity = on ? 5.5 : 0.2;
      l.blue.emissiveIntensity = on ? 0.2 : 5.5;
    } else {
      l.red.emissiveIntensity = 0.4;
      l.blue.emissiveIntensity = 0.4;
    }
    return event;
  }
}
