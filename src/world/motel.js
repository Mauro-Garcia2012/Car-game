/**
 * Roadside motels: the only place to sleep.
 *
 * They sit far apart — about 7.5 km, several gas stations' worth — so reaching
 * the next bed is a race against the clock rather than the fuel gauge. Roughly
 * one in four shares a plot with a gas station, the way a lot of desert stops
 * do; the rest stand alone with nothing around them but their neon.
 *
 * A bed is free. The cost is the time it takes to get there.
 */
import * as THREE from 'three';
import { glowAtNight } from './nightlights.js';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { hashRand } from '../rng.js';
import {
  concreteTexture,
  boardTexture,
  motelSignTexture,
  vacancyTexture,
} from '../textures.js';
import { groundHeight } from './road.js';
import { stationDistance, nextStationIndex, SERVICE_BLUE } from './gasStation.js';

const FIRST_MOTEL = 7200;
const MOTEL_GAP = 7400;
const MOTEL_SPREAD = 1300;
/** A motel this close to a station shares its plot instead. */
const ATTACH_WINDOW = 260;
const ATTACH_OFFSET = 95;

/** Half length of the check-in zone, measured along the road. */
export const ZONE_HALF = 26;
const ZONE_INNER = EDGE + 4;
const ZONE_OUTER = EDGE + 34;

const motels = [];

function computeMotel(i) {
  let s =
    i === 0
      ? FIRST_MOTEL
      : motels[i - 1].s + MOTEL_GAP + Math.round(hashRand(i, 313) * MOTEL_SPREAD);
  let attached = false;
  const n = nextStationIndex(s);
  for (const k of [n - 1, n, n + 1]) {
    if (k < 0) continue;
    if (Math.abs(stationDistance(k) - s) < ATTACH_WINDOW) {
      s = stationDistance(k) + ATTACH_OFFSET;
      attached = true;
      break;
    }
  }
  return { s, attached };
}

/** Distance along the track of motel `i`, memoised. */
export function motelDistance(i) {
  while (motels.length <= i) motels.push(computeMotel(motels.length));
  return motels[i].s;
}

/** True when motel `i` shares its plot with a gas station. */
export function motelIsAttached(i) {
  motelDistance(i);
  return motels[i].attached;
}

/** Index of the first motel at or beyond `s`. */
export function nextMotelIndex(s) {
  let i = 0;
  while (motelDistance(i) < s - ZONE_HALF) i++;
  return i;
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

const MATS = {};
function materials() {
  if (MATS.ready) return MATS;
  MATS.asphalt = new THREE.MeshStandardMaterial({
    map: concreteTexture(),
    color: '#c6b394', // sun-bleached asphalt, warm rather than cold grey
    roughness: 0.95,
  });
  MATS.stucco = new THREE.MeshStandardMaterial({
    color: '#e3d3b4',
    roughness: 0.95,
  });
  MATS.trim = new THREE.MeshStandardMaterial({
    color: '#1f8f96', // that turquoise every desert motel is painted with
    roughness: 0.6,
    metalness: 0.15,
  });
  MATS.door = new THREE.MeshStandardMaterial({
    color: '#b8452f',
    roughness: 0.7,
  });
  MATS.steel = new THREE.MeshStandardMaterial({
    color: '#8d9198',
    roughness: 0.45,
    metalness: 0.8,
  });
  MATS.dark = new THREE.MeshStandardMaterial({ color: '#26272b', roughness: 0.8 });
  MATS.glass = new THREE.MeshPhysicalMaterial({
    color: '#20303a',
    roughness: 0.1,
    metalness: 0.1,
    transparent: true,
    opacity: 0.7,
  });
  MATS.paintLine = new THREE.MeshStandardMaterial({
    color: '#efe9dc',
    roughness: 0.8,
  });
  MATS.water = new THREE.MeshStandardMaterial({
    color: '#2ea9c9',
    roughness: 0.12,
    metalness: 0.2,
    emissive: '#0d5a72',
    emissiveIntensity: 0.35,
  });
  glowAtNight(MATS.water, 0.5);
  MATS.neon = glowAtNight(
    new THREE.MeshStandardMaterial({
      map: motelSignTexture(),
      emissiveMap: motelSignTexture(),
      emissive: '#ffca6a',
      emissiveIntensity: 0.5,
      roughness: 0.6,
    }),
    1.0
  );
  MATS.vacancy = glowAtNight(
    new THREE.MeshStandardMaterial({
      map: vacancyTexture(),
      emissiveMap: vacancyTexture(),
      emissive: '#ff4a44',
      emissiveIntensity: 0.7,
      roughness: 0.6,
    }),
    1.25
  );
  MATS.ready = true;
  return MATS;
}

function box(w, h, d, mat, x, y, z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/**
 * One motel. Local space matches the stations: -Z runs up the road, +X points
 * away from the tarmac.
 */
function buildMotelModel() {
  const mat = materials();
  const root = new THREE.Group();

  // Parking lot.
  const lot = new THREE.Mesh(new THREE.BoxGeometry(40, 0.32, 58), mat.asphalt);
  lot.position.set(19, -0.14, 0);
  lot.receiveShadow = true;
  root.add(lot);

  // Room block, single storey, with a covered walkway along the front.
  const ROOMS = 6;
  const block = new THREE.Group();
  block.position.set(27, 0, 0);
  root.add(block);
  block.add(box(8, 3.2, 28, mat.stucco, 0, 1.6, 0));
  // Pale roof with a turquoise fascia band along the front, motel-style.
  block.add(box(9.0, 0.42, 29.0, mat.stucco, -0.2, 3.42, 0));
  block.add(box(0.3, 0.5, 29.2, mat.trim, -4.55, 3.42, 0));
  block.add(box(3.6, 0.16, 28.6, mat.stucco, -5.6, 2.98, 0)); // walkway roof
  block.add(box(0.22, 0.34, 28.8, mat.trim, -7.3, 2.95, 0));

  for (let i = 0; i < ROOMS; i++) {
    const z = -11.5 + i * 4.6;
    // Door in a recessed reveal, with a step, a handle and a lamp over it.
    block.add(box(0.2, 2.3, 1.2, mat.trim, -4.0, 1.15, z));
    block.add(box(0.14, 2.1, 1.0, mat.door, -4.06, 1.05, z));
    block.add(box(0.07, 0.07, 0.16, mat.steel, -4.16, 1.05, z + 0.36));
    block.add(box(0.7, 0.1, 1.4, mat.paintLine, -4.4, 0.05, z));
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.09, 0.2, 10),
      mat.neon
    );
    lamp.position.set(-4.16, 2.42, z);
    block.add(lamp);
    // Window in a frame.
    block.add(box(0.16, 1.4, 1.9, mat.trim, -4.0, 1.7, z + 1.9));
    block.add(box(0.1, 1.2, 1.7, mat.glass, -4.07, 1.7, z + 1.9));
    // A/C unit: a housing with a grille and a fan hood.
    block.add(box(0.5, 0.5, 0.7, mat.steel, -4.2, 0.85, z + 1.9));
    for (let k = 0; k < 3; k++) {
      block.add(box(0.06, 0.05, 0.62, mat.trim, -4.46, 0.73 + k * 0.12, z + 1.9));
    }
    if (i < ROOMS - 1) {
      // Walkway post with a capital, and a rail between posts.
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.075, 0.09, 2.9, 10),
        mat.steel
      );
      post.position.set(-7.3, 1.45, z + 2.3);
      post.castShadow = true;
      block.add(post);
      block.add(box(0.24, 0.12, 0.24, mat.trim, -7.3, 2.86, z + 2.3));
    }
  }

  // Office at the near end, with a bigger window and a soda machine.
  block.add(box(0.12, 2.0, 3.2, mat.glass, -4.0, 1.6, -13.4));
  block.add(box(1.0, 1.9, 0.8, mat.door, -4.6, 0.95, -11.4));
  block.add(box(0.9, 1.7, 0.7, mat.trim, -4.7, 0.85, 12.6)); // ice machine
  // Chimney-ish roof plant and a swamp cooler, so the roofline is not bare.
  block.add(box(1.4, 0.9, 1.4, mat.steel, 0.4, 4.05, -6.0));
  block.add(box(1.0, 0.7, 1.0, mat.steel, 0.8, 3.95, 7.5));

  // Parking stalls painted in front of the rooms.
  for (let i = 0; i <= ROOMS; i++) {
    root.add(
      box(5.0, 0.04, 0.14, mat.paintLine, 20.2, 0.03, -13.8 + i * 4.6)
    );
  }

  // Small pool with a low fence, because every one of them has one.
  const pool = new THREE.Group();
  pool.position.set(15, 0, 19);
  root.add(pool);
  pool.add(box(9, 0.3, 6.4, mat.paintLine, 0, 0.02, 0));
  const water = box(7.2, 0.22, 4.8, mat.water, 0, 0.1, 0);
  water.castShadow = false;
  pool.add(water);
  for (const side of [-1, 1]) {
    pool.add(box(9.4, 0.06, 0.06, mat.steel, 0, 1.0, side * 3.6));
    pool.add(box(0.06, 0.06, 7.4, mat.steel, side * 4.8, 1.0, 0));
    for (let i = -2; i <= 2; i++) {
      pool.add(box(0.07, 1.0, 0.07, mat.steel, i * 2.3, 0.5, side * 3.6));
    }
  }

  // Neon sign by the road: MOTEL stacked vertically, VACANCY underneath.
  const sign = new THREE.Group();
  sign.position.set(3.0, 0, 22);
  root.add(sign);
  sign.add(box(0.5, 10, 0.5, mat.steel, 0, 5, 0));
  // Broad faces along the road: a motel sign that only its own car park can
  // read is no use to anybody, and at night it is the one landmark there is.
  const neon = new THREE.Mesh(new THREE.BoxGeometry(1.5, 5.0, 0.3), mat.neon);
  neon.position.set(0, 8.6, 0);
  neon.castShadow = true;
  sign.add(neon);
  const vacancy = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.0, 0.26), mat.vacancy);
  vacancy.position.set(0, 5.3, 0);
  sign.add(vacancy);
  sign.add(box(2.9, 0.3, 0.6, mat.trim, 0, 5.95, 0));

  root.traverse((o) => {
    if (o.isMesh) o.receiveShadow = true;
  });
  return root;
}

/** "MOTEL 1 MI" board planted before each one, in service blue. */
function buildAdvanceSign() {
  const mat = materials();
  const g = new THREE.Group();
  g.add(box(0.16, 3.2, 0.16, mat.steel, -0.9, 1.6, 0));
  g.add(box(0.16, 3.2, 0.16, mat.steel, 0.9, 1.6, 0));
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.2, 0.16),
    new THREE.MeshStandardMaterial({
      map: boardTexture('MOTEL', '1 MI', SERVICE_BLUE),
      roughness: 0.65,
    })
  );
  board.position.set(0, 4.0, 0);
  board.castShadow = true;
  g.add(board);
  return g;
}

/* ------------------------------------------------------------------ */
/* Pool                                                                */
/* ------------------------------------------------------------------ */

export class Motels {
  constructor(scene) {
    this.slots = [];
    for (let i = 0; i < 2; i++) {
      const model = buildMotelModel();
      const advance = buildAdvanceSign();
      model.visible = false;
      advance.visible = false;
      scene.add(model, advance);
      this.slots.push({ index: -1, model, advance });
    }
    this.tmp = { x: 0, y: 0, z: 0 };
  }

  /** Keeps the current and next motel built and positioned. */
  update(playerS) {
    const base = Math.max(0, nextMotelIndex(playerS) - 1);
    for (let k = 0; k < this.slots.length; k++) {
      const slot = this.slots[k];
      const index = base + k;
      if (slot.index === index) continue;
      slot.index = index;
      const s = motelDistance(index);
      const p = roadPoint(s, 0, this.tmp);
      slot.model.position.set(p.x, groundHeight(s, EDGE + 12) + 0.05, p.z);
      slot.model.rotation.y = roadYaw(s);
      slot.model.visible = true;

      const sa = Math.max(30, s - 1600);
      const pa = roadPoint(sa, EDGE + 3.5, this.tmp);
      slot.advance.position.set(pa.x, groundHeight(sa, EDGE + 3.5), pa.z);
      slot.advance.rotation.y = roadYaw(sa) + 0.22;
      slot.advance.visible = true;
    }
  }

  /** Motel index the car is parked at, or -1. */
  zoneAt(s, lateral) {
    if (lateral < ZONE_INNER || lateral > ZONE_OUTER) return -1;
    for (const slot of this.slots) {
      if (slot.index < 0) continue;
      if (Math.abs(motelDistance(slot.index) - s) <= ZONE_HALF) return slot.index;
    }
    return -1;
  }
}
