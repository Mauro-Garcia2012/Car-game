/**
 * Lonely bus stops.
 *
 * Somewhere in the desert a transit authority once ran a service up this
 * highway. The buses stopped years ago; the shelters did not. They stand
 * every ten kilometres or so, a slab of concrete, three walls, a bench and a
 * timetable nobody has reprinted, and people still wait at them because
 * there is nowhere else to wait.
 *
 * That is who you pick up. Fares live in `fares.js`; this module owns where
 * the stops are, what they look like, and whether anybody is standing at one.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw, EDGE, ROAD_HALF } from '../track.js';
import { hashRand, onReseed } from '../rng.js';
import { groundHeight } from './road.js';
import { glowAtNight } from './nightlights.js';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import {
  serviceSignTexture,
  SERVICE_SIGN_ASPECT,
  timetableTexture,
  concreteTexture,
} from '../textures.js';
import { signBoard } from './boards.js';
import { stationDistance, nextStationIndex } from './gasStation.js';
import { motelDistance, nextMotelIndex } from './motel.js';

/** Where the first shelter is, and how far apart they run after that. */
const FIRST_STOP = 3200;
const STOP_GAP = 10000;
const STOP_SPREAD = 1800;
/** A stop this close to a station or motel plot is pushed clear of it. */
const PLOT_CLEAR = 130;
const PLOT_SHIFT = 190;

/** Share of shelters with somebody waiting at them. */
const WAIT_CHANCE = 0.62;

/** Half length of the pull-in, measured along the road. */
export const ZONE_HALF = 22;
/** You have to actually pull over: the near edge is out past the lane line. */
const ZONE_INNER = ROAD_HALF + 0.5;
const ZONE_OUTER = EDGE + 15;
/** How far off the centre line the concrete slab sits. */
const PAD_LATERAL = 10.6;

const stops = [];
onReseed(() => {
  stops.length = 0;
});

/** The nearest station or motel plot to `s`, in metres of separation. */
function plotGap(s) {
  let gap = Infinity;
  const si = nextStationIndex(s);
  const mi = nextMotelIndex(s);
  for (const d of [
    stationDistance(Math.max(0, si - 1)),
    stationDistance(si),
    motelDistance(Math.max(0, mi - 1)),
    motelDistance(mi),
  ]) {
    gap = Math.min(gap, Math.abs(d - s));
  }
  return gap;
}

function computeStop(i) {
  let s =
    i === 0
      ? FIRST_STOP + Math.round((hashRand(4003, 5) - 0.5) * 1400)
      : stops[i - 1] + STOP_GAP + Math.round(hashRand(i, 617) * STOP_SPREAD);
  // A shelter dropped in the middle of a forecourt is a shelter nobody sees.
  // Two nudges are enough: the plots are far narrower than the shift.
  for (let k = 0; k < 2 && plotGap(s) < PLOT_CLEAR; k++) s += PLOT_SHIFT;
  return s;
}

/** Distance along the track of bus stop `i`, memoised. */
export function stopDistance(i) {
  while (stops.length <= i) stops.push(computeStop(stops.length));
  return stops[i];
}

/** Index of the first stop at or beyond `s`. */
export function nextStopIndex(s) {
  let i = 0;
  while (stopDistance(i) < s - ZONE_HALF) i++;
  return i;
}

/**
 * Is anybody standing at stop `i`? Deterministic from the seed, so the
 * figure you can see from four hundred metres out is the fare you get.
 */
export function someoneWaitingAt(i) {
  return i >= 0 && hashRand(3000 + i, 17) <= WAIT_CHANCE;
}

/** The route number painted on the flag, purely for flavour. */
function routeFor(i) {
  return 40 + Math.floor(hashRand(i, 811) * 9) * 3;
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

const MATS = {};
function materials() {
  if (MATS.ready) return MATS;
  MATS.pad = new THREE.MeshStandardMaterial({
    map: concreteTexture(),
    color: '#c3bba9',
    roughness: 0.96,
  });
  MATS.steel = new THREE.MeshStandardMaterial({
    color: '#8d9198',
    roughness: 0.5,
    metalness: 0.75,
  });
  MATS.paint = new THREE.MeshStandardMaterial({
    color: '#2a6b7c', // the same municipal teal as everything else out here
    roughness: 0.65,
    metalness: 0.1,
  });
  MATS.rust = new THREE.MeshStandardMaterial({
    color: '#8a5a3a',
    roughness: 0.92,
  });
  MATS.glass = new THREE.MeshPhysicalMaterial({
    color: '#20303a',
    roughness: 0.12,
    metalness: 0.1,
    transparent: true,
    opacity: 0.55,
  });
  MATS.timetable = new THREE.MeshStandardMaterial({
    map: timetableTexture(),
    roughness: 0.8,
  });
  MATS.lamp = glowAtNight(
    new THREE.MeshStandardMaterial({
      color: '#d9d2bc',
      emissive: '#ffe3a4',
      emissiveIntensity: 0.15,
      roughness: 0.5,
    }),
    1.4
  );
  MATS.skin = new THREE.MeshStandardMaterial({ color: '#c99a72', roughness: 0.85 });
  MATS.shirt = new THREE.MeshStandardMaterial({ color: '#b8483a', roughness: 0.9 });
  MATS.jeans = new THREE.MeshStandardMaterial({ color: '#3a4a68', roughness: 0.92 });
  MATS.bag = new THREE.MeshStandardMaterial({ color: '#6a6152', roughness: 0.95 });
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
 * Collects boxes and cylinders per material and bakes each material's worth
 * into a single mesh.
 *
 * A shelter is thirty little slabs, and thirty draw calls twice over — two
 * pooled stops, always resident — is real money for something the size of a
 * garden shed. Grouped, it is six.
 */
class Batch {
  constructor() {
    this.parts = new Map();
  }

  add(geometry, mat, x, y, z, ry = 0) {
    geometry.rotateY(ry);
    geometry.translate(x, y, z);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geometry);
    return this;
  }

  box(w, h, d, mat, x, y, z) {
    return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z);
  }

  cylinder(rTop, rBottom, h, seg, mat, x, y, z) {
    return this.add(
      new THREE.CylinderGeometry(rTop, rBottom, h, seg),
      mat,
      x,
      y,
      z
    );
  }

  /** One mesh per material, added to `parent`. */
  bake(parent) {
    for (const [mat, geoms] of this.parts) {
      const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
    }
    this.parts.clear();
    return parent;
  }
}

/** The person waiting, built once and hidden when the stop is empty. */
function buildWaiter() {
  const mat = materials();
  const b = new Batch();
  b.box(0.32, 0.82, 0.46, mat.jeans, 0, 0.41, 0);
  b.box(0.4, 0.66, 0.56, mat.shirt, 0, 1.15, 0);
  b.box(0.14, 0.5, 0.14, mat.shirt, 0, 1.2, 0.34); // arms, at their sides
  b.box(0.14, 0.5, 0.14, mat.shirt, 0, 1.2, -0.34);
  b.add(new THREE.SphereGeometry(0.17, 10, 8), mat.skin, 0, 1.63, 0);
  b.box(0.3, 0.34, 0.42, mat.bag, 0.1, 0.17, 0.5); // a bag down on the slab
  return b.bake(new THREE.Group());
}

/**
 * One shelter. Local space matches the motels: -Z runs up the road, +X points
 * away from the tarmac.
 */
function buildStopModel() {
  const mat = materials();
  const root = new THREE.Group();
  const b = new Batch();
  const X = PAD_LATERAL;

  // Concrete slab, half buried in blown sand.
  b.box(5.4, 0.26, 4.0, mat.pad, X, -0.1, 0);

  // Three walls: a solid back and two glazed sides in painted frames.
  b.box(0.12, 2.15, 3.2, mat.paint, X + 2.4, 1.28, 0);
  for (const side of [-1, 1]) {
    b.box(2.5, 2.15, 0.08, mat.glass, X + 1.2, 1.28, side * 1.56);
    b.box(2.6, 0.12, 0.14, mat.paint, X + 1.18, 2.28, side * 1.56);
    b.box(0.12, 2.15, 0.14, mat.paint, X - 0.04, 1.28, side * 1.56);
    b.cylinder(0.06, 0.07, 2.4, 8, mat.steel, X - 0.05, 1.2, side * 1.56);
  }

  // Flat roof with an overhang toward the road, and a strip light under it.
  b.box(3.0, 0.14, 3.6, mat.paint, X + 1.1, 2.42, 0);
  b.box(3.06, 0.16, 0.16, mat.steel, X + 1.1, 2.3, 1.78);
  b.box(0.5, 0.07, 2.2, mat.lamp, X + 1.3, 2.31, 0);

  // Bench along the back wall, and the timetable above it behind glass.
  b.box(0.62, 0.09, 2.8, mat.paint, X + 1.95, 0.48, 0);
  b.box(0.1, 0.44, 2.8, mat.paint, X + 2.3, 0.74, 0);
  for (const z of [-1.1, 1.1]) {
    b.box(0.5, 0.44, 0.09, mat.steel, X + 1.95, 0.24, z);
  }
  b.add(
    new THREE.PlaneGeometry(0.9, 1.15),
    mat.timetable,
    X + 2.32,
    1.62,
    0.75,
    -Math.PI / 2
  );

  // The post the flag sits on, out by the kerb.
  b.cylinder(0.065, 0.08, 3.32, 10, mat.steel, X - 2.5, 1.66, 1.4);
  b.bake(root);

  // The flag itself hangs off the group, because its number changes per stop.
  const flag = new THREE.Group();
  flag.position.set(X - 2.5, 0, 1.4);
  root.add(flag);
  return { root, flag };
}

/** The sign on the post: the same S-series board as the highway services. */
const FLAG_H = 1.75;
const FLAG_W = FLAG_H * SERVICE_SIGN_ASPECT;

/**
 * The route sign itself, rebuilt per stop because the number changes.
 *
 * Bolted to the front of the post the way a real one is, rather than run
 * through by it, and lit by the same retroreflection that makes a road sign
 * findable in headlights.
 */
function buildFlag(route) {
  const tex = serviceSignTexture('bus', String(route));
  const face = glowAtNight(
    new THREE.MeshStandardMaterial({
      map: tex,
      emissiveMap: tex,
      emissive: '#ffffff',
      emissiveIntensity: 0.2,
      roughness: 0.55,
    }),
    0.55
  );
  const g = new THREE.Group();
  g.position.set(0, 2.42, 0.12); // clear of the post, which is 0.16 across
  const board = signBoard(
    FLAG_W,
    FLAG_H,
    0.07,
    face,
    new THREE.MeshStandardMaterial({ color: '#6d7278', roughness: 0.7 })
  );
  g.add(board);
  // Two brackets back to the post, so it is not floating in front of it.
  for (const y of [-0.55, 0.55]) {
    g.add(box(0.1, 0.09, 0.15, materials().steel, 0, y, -0.1));
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Pool                                                                */
/* ------------------------------------------------------------------ */

export class BusStops {
  constructor(scene) {
    this.slots = [];
    for (let i = 0; i < 2; i++) {
      const { root, flag } = buildStopModel();
      const waiter = buildWaiter();
      root.add(waiter);
      waiter.position.set(PAD_LATERAL - 1.5, 0, -0.9);
      waiter.rotation.y = -Math.PI / 2; // looking down the road for a bus
      root.visible = false;
      scene.add(root);
      this.slots.push({ index: -1, root, flag, waiter, route: -1, board: null });
    }
    this.tmp = { x: 0, y: 0, z: 0 };
    onReseed(() => {
      for (const slot of this.slots) slot.index = null;
    });
  }

  /**
   * Keeps the current and next shelter built and positioned.
   * @param {number} playerS
   * @param {(index:number)=>boolean} [hasWaiter] overrides who is standing
   *   there — the game uses it to clear the figure once you pick them up.
   */
  update(playerS, hasWaiter = someoneWaitingAt) {
    const base = Math.max(0, nextStopIndex(playerS) - 1);
    for (let k = 0; k < this.slots.length; k++) {
      const slot = this.slots[k];
      const index = base + k;
      if (slot.index !== index) {
        slot.index = index;
        const s = stopDistance(index);
        const p = roadPoint(s, 0, this.tmp);
        slot.root.position.set(p.x, groundHeight(s, PAD_LATERAL) + 0.02, p.z);
        slot.root.rotation.y = roadYaw(s);
        slot.root.visible = true;

        const route = routeFor(index);
        if (route !== slot.route) {
          slot.route = route;
          if (slot.board) slot.flag.remove(slot.board);
          slot.board = buildFlag(route);
          slot.flag.add(slot.board);
        }
      }
      // Cheap enough to re-check every frame, and it has to be: the figure
      // disappears the instant the fare is taken.
      slot.waiter.visible = hasWaiter(slot.index);
    }
  }

  /** Bus stop index the car is pulled up at, or -1. */
  zoneAt(s, lateral) {
    if (lateral < ZONE_INNER || lateral > ZONE_OUTER) return -1;
    for (const slot of this.slots) {
      if (slot.index < 0) continue;
      if (Math.abs(stopDistance(slot.index) - s) <= ZONE_HALF) return slot.index;
    }
    return -1;
  }
}
