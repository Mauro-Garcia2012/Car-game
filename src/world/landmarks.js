/**
 * The things you remember a road by.
 *
 * Every kilometre of this desert is made of the same parts — the same
 * stations, the same motels, the same buttes out of the same hash — which is
 * what lets it run forever and also what makes twenty kilometres feel like
 * two. Distance needs somewhere to land.
 *
 * So every twenty-odd kilometres there is one thing that is not made of the
 * same parts as everything else: a dead town, a drive-in nobody switched
 * off, an airliner in the sand. They stand well back from the road and you
 * cannot touch them. They are there so that when somebody says they got to
 * ninety kilometres you can ask whether they saw the dinosaur.
 *
 * They come off a deck rather than a die, so you never get the same one
 * twice running, and the deck is seeded like everything else: a given run
 * always has the same sights in the same places.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw } from '../track.js';
import { hashRand, onReseed } from '../rng.js';
import { groundHeight } from './road.js';
import { glowAtNight } from './nightlights.js';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import { compactInPlace } from '../merge.js';

/** Where the first one can be, and how far apart they run after that. */
const FIRST = 10000;
const FIRST_SPREAD = 6000;
const GAP_MIN = 17000;
const GAP_SPREAD = 13000;
/**
 * How far off the centre line they stand.
 *
 * Close enough to be the thing you are looking at rather than a detail on
 * the horizon, far enough that you can never hit one. There is no collision
 * on any of them and there does not need to be.
 */
const OUT_MIN = 52;
const OUT_SPREAD = 52;

/* ------------------------------------------------------------------ */
/* Where they are                                                      */
/* ------------------------------------------------------------------ */

const sights = [];
onReseed(() => {
  sights.length = 0;
});


/** Names of the builders below, in deck order. */
const KINDS = [
  'town',
  'drivein',
  'plane',
  'dino',
  'tower',
  'junkyard',
  'mine',
  'dish',
  'church',
  'silos',
  'diner',
  'buses',
  'arrow',
  'trailers',
];

/** The smallest step through the deck that still visits every card. */
const STRIDE = (() => {
  const gcd = (a, b) => (b ? gcd(b, a % b) : a);
  for (let k = 3; k < 40; k++) if (gcd(k, KINDS.length) === 1) return k;
  return 1;
})();

function computeSight(i) {
  const s =
    i === 0
      ? FIRST + Math.round(hashRand(0, 8101) * FIRST_SPREAD)
      : sights[i - 1].s + GAP_MIN + Math.round(hashRand(i, 8101) * GAP_SPREAD);
  // A deck, not a die: step through the kinds by a stride coprime with the
  // count, starting where the seed says, so no two in a row ever match and
  // every one comes round before any repeats. The stride has to be worked
  // out rather than written down — with fourteen kinds a hardcoded 2 would
  // show you seven of them and hide the rest forever.
  const start = Math.floor(hashRand(0, 8117) * KINDS.length);
  const kind = KINDS[(start + i * STRIDE) % KINDS.length];
  const side = hashRand(i, 8123) < 0.5 ? -1 : 1;
  const out = OUT_MIN + hashRand(i, 8131) * OUT_SPREAD;
  return { s, kind, side, out, turn: (hashRand(i, 8147) - 0.5) * 1.1 };
}

/** Sight `i`: where it is, what it is, and which way it faces. */
export function sightAt(i) {
  while (sights.length <= i) sights.push(computeSight(sights.length));
  return sights[i];
}

/**
 * The sight within `reach` metres of `s`, or null.
 *
 * The buttes are scattered through exactly this band of desert, and one
 * dropped on a landmark swallows it — the same thing that used to happen to
 * the dirt spurs. `props.js` asks this before planting a mesa.
 */
export function sightNear(s, reach) {
  const i = nextSightIndex(s - reach);
  for (const k of [i, i + 1]) {
    const sight = sightAt(k);
    if (Math.abs(sight.s - s) <= reach) return sight;
  }
  return null;
}

/** Index of the first sight at or beyond `s`. */
export function nextSightIndex(s) {
  let i = 0;
  while (sightAt(i).s < s - 400) i++;
  return i;
}

/* ------------------------------------------------------------------ */
/* Models                                                              */
/* ------------------------------------------------------------------ */

const MATS = {};
function materials() {
  if (MATS.ready) return MATS;
  const m = (color, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.94, ...extra });
  MATS.timber = m('#7a6047');
  MATS.timberPale = m('#9c8a72');
  MATS.tin = m('#8e8579', { metalness: 0.4, roughness: 0.7 });
  MATS.rust = m('#8a5433');
  MATS.steel = m('#8d9198', { metalness: 0.75, roughness: 0.45 });
  MATS.screen = m('#d9d5c6', { roughness: 0.98 });
  MATS.paint = m('#b8452f');
  MATS.alu = m('#b9bec4', { metalness: 0.8, roughness: 0.35 });
  MATS.glass = new THREE.MeshPhysicalMaterial({
    color: '#1d2a33',
    roughness: 0.15,
    metalness: 0.1,
    transparent: true,
    opacity: 0.6,
  });
  MATS.hide = m('#4f7a45');
  MATS.hideDark = m('#3d6036');
  MATS.beacon = glowAtNight(
    new THREE.MeshStandardMaterial({
      color: '#c8362a',
      emissive: '#ff4a33',
      emissiveIntensity: 0.4,
      roughness: 0.4,
    }),
    3.4
  );
  MATS.neon = glowAtNight(
    new THREE.MeshStandardMaterial({
      color: '#e8dcc0',
      emissive: '#ffd8a0',
      emissiveIntensity: 0.25,
      roughness: 0.6,
    }),
    2.2
  );
  MATS.ready = true;
  return MATS;
}

/** Collects boxes and cylinders per material and bakes one mesh each. */
class Batch {
  constructor() {
    this.parts = new Map();
  }

  add(geometry, mat, x, y, z, ry = 0, rz = 0) {
    if (rz) geometry.rotateZ(rz);
    if (ry) geometry.rotateY(ry);
    geometry.translate(x, y, z);
    if (!this.parts.has(mat)) this.parts.set(mat, []);
    this.parts.get(mat).push(geometry);
    return this;
  }

  box(w, h, d, mat, x, y, z, ry = 0, rz = 0) {
    return this.add(new THREE.BoxGeometry(w, h, d), mat, x, y, z, ry, rz);
  }

  cyl(rt, rb, h, seg, mat, x, y, z, ry = 0, rz = 0) {
    return this.add(
      new THREE.CylinderGeometry(rt, rb, h, seg),
      mat,
      x,
      y,
      z,
      ry,
      rz
    );
  }

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

/** A dead town: four shacks, a boardwalk and a sign nobody reads. */
function buildTown() {
  const mat = materials();
  const b = new Batch();
  const shack = (x, z, w, d, h, lean) => {
    b.box(w, h, d, mat.timber, x, h / 2, z, lean * 0.4);
    // Sagging tin roof, one side collapsed.
    b.box(w + 0.6, 0.12, d + 0.6, mat.tin, x, h + 0.3, z, lean * 0.4, lean * 0.13);
    for (const s of [-1, 1]) {
      b.box(0.16, h, 0.16, mat.timberPale, x + s * (w / 2 - 0.2), h / 2, z - d / 2 - 0.5);
    }
    b.box(0.9, h * 0.62, 0.1, mat.timberPale, x - w / 2 - 0.04, h * 0.31, z + d * 0.2, lean * 0.4);
  };
  shack(4, -9, 6, 5, 3.4, 0.06);
  shack(6.5, 0, 8, 6.5, 4.6, -0.04);
  shack(3, 9.5, 5, 4.5, 3.0, 0.09);
  shack(12, 7, 4.5, 4, 2.6, -0.08);
  // Boardwalk along the front, half of it gone.
  for (let i = 0; i < 9; i++) {
    if (i === 4 || i === 7) continue;
    b.box(2.2, 0.14, 1.6, mat.timberPale, 0.6, 0.22, -11 + i * 2.6);
  }
  // The sign, leaning, on two posts.
  b.box(0.22, 5.2, 0.22, mat.timber, -3.4, 2.6, -3.2, 0, 0.07);
  b.box(0.22, 5.2, 0.22, mat.timber, -3.4, 2.6, 3.2, 0, 0.07);
  b.box(0.24, 2.0, 7.4, mat.timberPale, -3.8, 5.0, 0, 0, 0.07);
  // A dead water pump and a barrel or two, so it is not all buildings.
  b.cyl(0.5, 0.5, 1.1, 10, mat.rust, 15, 0.55, -3);
  b.cyl(0.5, 0.5, 1.1, 10, mat.rust, 16.2, 0.55, -1.6, 0, 0.4);
  return b.bake(new THREE.Group());
}

/** A drive-in that nobody switched off: a screen you can see for miles. */
function buildDriveIn() {
  const mat = materials();
  const b = new Batch();
  // The screen: white face towards the road, steel frame behind it.
  b.box(0.5, 13, 24, mat.screen, 0, 7.4, 0);
  b.box(0.7, 1.0, 25, mat.paint, -0.1, 14.1, 0);
  b.box(0.7, 1.0, 25, mat.paint, -0.1, 0.9, 0);
  for (const z of [-11, -5.5, 0, 5.5, 11]) {
    b.box(2.6, 15, 0.5, mat.steel, 1.6, 7.4, z);
    b.box(3.4, 0.4, 0.4, mat.steel, 2.2, 2.4, z, 0, 0.5);
  }
  // Ticket booth and the ramps the cars used to park on.
  b.box(3.2, 2.8, 3.2, mat.paint, 26, 1.4, -8);
  b.box(3.8, 0.3, 3.8, mat.tin, 26, 2.95, -8);
  b.box(1.2, 1.4, 0.1, mat.glass, 24.35, 1.6, -8);
  b.box(0.7, 0.16, 0.7, mat.neon, 26, 3.2, -8);
  for (let r = 0; r < 5; r++) {
    b.box(0.5, 0.5, 26, mat.tin, 8 + r * 4.5, 0.2, 0, 0, 0.06);
    // A speaker post left standing in each row.
    b.cyl(0.06, 0.08, 1.2, 6, mat.steel, 8 + r * 4.5, 0.6, -9 + r * 3);
  }
  return b.bake(new THREE.Group());
}

/** An airliner in the sand, on its belly, one wing gone. */
function buildPlane() {
  const mat = materials();
  const b = new Batch();
  const tilt = 0.13;
  // Fuselage in three pieces, the tail section broken off and turned.
  b.cyl(1.9, 2.05, 15, 14, mat.alu, 0, 1.7, -2, Math.PI / 2, Math.PI / 2 + tilt);
  b.cyl(1.6, 1.9, 5, 14, mat.alu, 0.9, 1.5, 8.4, Math.PI / 2, Math.PI / 2 - 0.22);
  b.cyl(0.5, 1.55, 3.4, 12, mat.alu, -0.7, 2.1, -11.2, Math.PI / 2, Math.PI / 2 + tilt);
  // Windows, as a strip of dark boxes.
  for (let i = 0; i < 11; i++) {
    b.box(0.1, 0.34, 0.4, mat.glass, -1.92, 2.2, -8 + i * 1.4);
  }
  // Tail fin and stabiliser on the broken section.
  b.box(0.24, 5.2, 3.4, mat.alu, 0.9, 3.6, 10.2, 0, -0.22);
  b.box(0.24, 4.4, 2.6, mat.paint, 0.78, 4.4, 10.6, 0, -0.22);
  b.box(6.6, 0.22, 1.6, mat.alu, 0.9, 2.6, 10.0);
  // One wing still on, one out in the sand with an engine beside it.
  b.box(1.2, 0.4, 13, mat.alu, 4.6, 1.5, 0, 0, 0.06);
  b.box(1.0, 0.35, 9, mat.alu, -9.5, 0.3, 5.5, 0.5, 0.02);
  b.cyl(1.0, 1.05, 3.2, 12, mat.alu, 6.2, 1.1, -4.4, Math.PI / 2, Math.PI / 2);
  b.cyl(0.75, 0.75, 0.4, 12, mat.glass, 6.2, 1.1, -6.05, Math.PI / 2, Math.PI / 2);
  // Debris, because nothing lands like that and stays tidy.
  for (const [x, z, w] of [[-6, -8, 1.6], [8, 9, 1.1], [-3, 13, 2.2], [12, -2, 1.3]]) {
    b.box(w, 0.3, w * 0.7, mat.alu, x, 0.2, z, w);
  }
  return b.bake(new THREE.Group());
}

/** The roadside dinosaur. Every long American road has one. */
function buildDino() {
  const mat = materials();
  const b = new Batch();
  // Plinth with a faded sign on it.
  b.box(9, 0.7, 6, mat.tin, 0, 0.35, 0);
  b.box(3.2, 1.2, 0.3, mat.paint, 0, 1.2, -3.1);
  // Body, neck and tail: tapering boxes on a curve.
  b.box(4.4, 3.6, 3.4, mat.hide, 0, 4.4, 0);
  b.box(3.4, 2.8, 2.8, mat.hide, 0, 6.2, 0.4, 0, 0.12);
  const neck = [
    [0.3, 7.6, -1.4, 2.2],
    [0.9, 9.0, -2.4, 1.8],
    [1.4, 10.4, -3.2, 1.5],
    [1.8, 11.6, -3.8, 1.2],
  ];
  for (const [x, y, z, w] of neck) b.box(w, w * 1.25, w, mat.hide, x, y, z, 0, -0.3);
  b.box(1.5, 1.0, 2.4, mat.hide, 2.1, 12.3, -4.9, 0, -0.2);
  b.box(0.7, 0.5, 0.9, mat.hideDark, 2.4, 12.1, -6.0);
  const tail = [
    [-0.4, 4.2, 2.6, 2.4],
    [-0.9, 3.4, 4.6, 1.9],
    [-1.3, 2.6, 6.4, 1.4],
    [-1.6, 2.0, 7.9, 0.9],
    [-1.8, 1.5, 9.0, 0.5],
  ];
  for (const [x, y, z, w] of tail) b.box(w, w, w, mat.hide, x, y, z, 0, 0.2);
  for (const [x, z] of [[-1.5, -1.2], [1.5, -1.2], [-1.5, 1.4], [1.5, 1.4]]) {
    b.box(1.3, 2.7, 1.5, mat.hideDark, x, 1.55, z);
    b.box(1.6, 0.35, 2.0, mat.hideDark, x, 0.9, z - 0.2);
  }
  return b.bake(new THREE.Group());
}

/** A water tower on splayed legs, with a light on top for the aircraft. */
function buildTower() {
  const mat = materials();
  const b = new Batch();
  const R = 4.2;
  const H = 17;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const fx = Math.cos(a) * (R + 1.6);
    const fz = Math.sin(a) * (R + 1.6);
    // A leg is one long box leaned in towards the tank.
    b.box(0.42, H + 1, 0.42, mat.steel, fx * 0.55, (H + 1) / 2, fz * 0.55,
      Math.atan2(fz, fx), -Math.atan2(Math.hypot(fx, fz) - R * 0.55, H) * 0.9);
    b.cyl(0.7, 0.9, 0.5, 10, mat.tin, fx, 0.25, fz);
  }
  // Cross bracing, two rings of it.
  for (const y of [5.5, 11.5]) {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      b.box(0.18, 0.18, R * 1.9, mat.steel, 0, y, 0, a);
    }
  }
  b.cyl(R, R, 6.4, 20, mat.tin, 0, H + 3.2, 0);
  b.cyl(0.4, R + 0.5, 2.4, 20, mat.tin, 0, H + 7.6, 0);
  b.cyl(R + 0.25, R + 0.25, 0.4, 20, mat.rust, 0, H + 0.4, 0);
  b.box(0.5, 2.4, 5.4, mat.paint, -R - 0.02, H + 3.4, 0);
  b.cyl(0.2, 0.2, 1.2, 8, mat.beacon, 0, H + 9.2, 0);
  // Ladder up one leg.
  for (let i = 0; i < 22; i++) {
    b.box(0.7, 0.07, 0.07, mat.steel, R * 0.42, 0.8 + i * 0.8, R * 0.42);
  }
  return b.bake(new THREE.Group());
}

/** A yard of dead cars, stacked two high and going nowhere. */
function buildJunkyard() {
  const mat = materials();
  const b = new Batch();
  const shell = (x, y, z, ry, rz) => {
    b.box(2.0, 0.8, 4.4, mat.rust, x, y + 0.6, z, ry, rz);
    b.box(1.7, 0.7, 2.0, mat.rust, x, y + 1.3, z + 0.3, ry, rz);
  };
  for (let i = 0; i < 7; i++) {
    const r = hashRand(i, 8201);
    shell(2 + (i % 3) * 3.2, 0, -9 + Math.floor(i / 3) * 5.2, r * 6.3, (r - 0.5) * 0.2);
  }
  for (let i = 0; i < 4; i++) {
    const r = hashRand(i, 8207);
    shell(3 + (i % 2) * 3.2, 1.6, -7 + Math.floor(i / 2) * 5.2, r * 6.3, (r - 0.5) * 0.35);
  }
  // A crusher and a stack of cubes it already got through.
  b.box(4.0, 3.2, 3.0, mat.steel, 13, 1.6, 4);
  b.box(4.4, 0.5, 3.4, mat.rust, 13, 3.5, 4);
  for (let i = 0; i < 5; i++) {
    b.box(1.5, 1.2, 1.5, mat.rust, 12 + (i % 2) * 1.7, 0.6 + Math.floor(i / 2) * 1.25, 8);
  }
  // Chain-link fence round the lot, as posts and a top rail.
  for (let i = 0; i <= 12; i++) {
    b.cyl(0.07, 0.07, 2.4, 6, mat.steel, -2, 1.2, -12 + i * 2);
  }
  b.box(0.07, 0.07, 24, mat.steel, -2, 2.3, 0);
  return b.bake(new THREE.Group());
}

/** A mine head: a headframe, an ore bin and a slope of tailings. */
function buildMine() {
  const mat = materials();
  const b = new Batch();
  const H = 13;
  for (const [dx, dz] of [[-1.6, -1.6], [1.6, -1.6], [-1.6, 1.6], [1.6, 1.6]]) {
    b.box(0.3, H, 0.3, mat.timber, dx, H / 2, dz, 0, -dx * 0.045);
  }
  for (const y of [4, 8, 11.5]) {
    for (const a of [0, Math.PI / 2]) b.box(0.16, 0.16, 3.6, mat.timber, 0, y, 0, a);
  }
  b.box(3.6, 0.4, 3.6, mat.timber, 0, H, 0);
  b.cyl(1.3, 1.3, 0.5, 14, mat.steel, 0, H + 0.8, 0, 0, Math.PI / 2);
  // The back legs of the frame lean out to the hoist house.
  b.box(0.3, 14, 0.3, mat.timber, 4.4, 6.4, 0, 0, 0.36);
  b.box(0.3, 14, 0.3, mat.timber, 4.4, 6.4, 2.4, 0, 0.36);
  b.box(4.5, 3.0, 5.0, mat.tin, 9, 1.5, 1.2);
  b.box(5.0, 0.2, 5.4, mat.rust, 9, 3.1, 1.2, 0, 0.06);
  // Ore bin on legs, and the grey heap under it.
  b.box(3.4, 2.6, 3.4, mat.timber, -6, 3.4, -3, 0.3);
  for (const [dx, dz] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) {
    b.box(0.26, 2.2, 0.26, mat.timber, -6 + dx, 1.1, -3 + dz);
  }
  b.cyl(0.1, 7.5, 3.2, 12, mat.tin, -9, 1.6, 5);
  return b.bake(new THREE.Group());
}

/** A radio dish on a mount, still pointed at something. */
function buildDish() {
  const mat = materials();
  const b = new Batch();
  b.cyl(2.6, 3.4, 1.2, 16, mat.tin, 0, 0.6, 0);
  b.cyl(0.9, 1.1, 6.5, 14, mat.steel, 0, 3.9, 0);
  b.box(2.6, 1.8, 2.6, mat.steel, 0, 7.6, 0);
  // The dish itself: a shallow cone, face up and tilted at the sky.
  b.add(
    new THREE.ConeGeometry(7.5, 2.6, 26, 1, true),
    mat.screen,
    0,
    9.6,
    -1.4,
    0,
    0.62
  );
  b.cyl(0.22, 0.22, 5.4, 8, mat.steel, 1.4, 10.6, -3.4, 0, 0.62 - Math.PI / 2);
  b.box(0.9, 0.9, 0.9, mat.rust, 3.6, 11.7, -5.4);
  for (const a of [0.5, 2.6, 4.2]) {
    b.box(0.16, 0.16, 8, mat.steel, Math.cos(a) * 3, 8.2, Math.sin(a) * 3, a, 1.1);
  }
  b.box(3.0, 2.4, 3.0, mat.tin, 9, 1.2, 6);
  return b.bake(new THREE.Group());
}

/** A clapboard mission church, roof half gone, bell still up there. */
function buildChurch() {
  const mat = materials();
  const b = new Batch();
  b.box(7.5, 5.0, 13, mat.timberPale, 0, 2.5, 0);
  // Pitched roof as two leaning slabs, one of them fallen in.
  b.box(0.3, 5.4, 13.2, mat.tin, -1.9, 6.2, 0, 0, 0.72);
  b.box(0.3, 5.4, 7.0, mat.tin, 1.9, 6.2, -3, 0, -0.72);
  b.box(0.3, 3.4, 5.5, mat.tin, 2.6, 4.6, 4.2, 0.35, -1.0);
  // Tower, belfry and cross.
  b.box(3.4, 9.5, 3.4, mat.timberPale, 0, 4.75, -7.4);
  b.box(3.0, 2.2, 3.0, mat.timber, 0, 10.4, -7.4);
  b.cyl(0.1, 2.4, 2.4, 4, mat.tin, 0, 12.6, -7.4);
  b.box(0.18, 1.8, 0.18, mat.timber, 0, 14.6, -7.4);
  b.box(0.9, 0.18, 0.18, mat.timber, 0, 15.0, -7.4);
  b.cyl(0.45, 0.6, 0.7, 10, mat.rust, 0, 10.4, -7.4);
  // Door, two windows and a fenced plot with three markers.
  b.box(0.2, 2.6, 1.6, mat.timber, -1.78, 1.3, -7.4);
  for (const z of [-2, 2.5]) b.box(0.2, 2.0, 1.1, mat.glass, -3.78, 3.0, z);
  for (let i = 0; i < 3; i++) {
    b.box(0.12, 0.9, 0.5, mat.tin, 7 + i * 0.4, 0.45, -3 + i * 2.4, hashRand(i, 8211));
  }
  return b.bake(new THREE.Group());
}

/** Three grain silos and a conveyor, miles from any grain. */
function buildSilos() {
  const mat = materials();
  const b = new Batch();
  for (let i = 0; i < 3; i++) {
    const z = -7 + i * 7;
    b.cyl(3.0, 3.0, 15, 18, mat.tin, 0, 7.5, z);
    b.cyl(0.5, 3.2, 2.4, 18, mat.tin, 0, 16.2, z);
    b.cyl(3.05, 3.05, 0.3, 18, mat.rust, 0, 3.5, z);
    b.cyl(3.05, 3.05, 0.3, 18, mat.rust, 0, 11.5, z);
  }
  // The gallery along the top and the leg that feeds it.
  b.box(1.4, 1.2, 16, mat.tin, 0, 18.2, 0);
  b.box(1.8, 1.8, 18, mat.steel, 6.5, 9.5, 0, 0, 0.62);
  b.box(4.0, 3.0, 4.0, mat.tin, 11, 1.5, 0);
  for (const z of [-7, 0, 7]) {
    b.box(0.7, 3.5, 0.7, mat.rust, 3.4, 1.75, z);
  }
  return b.bake(new THREE.Group());
}

/** A diner that closed: chrome shell, dead neon, chairs still stacked. */
function buildDiner() {
  const mat = materials();
  const b = new Batch();
  b.box(7.0, 3.2, 14, mat.alu, 0, 1.9, 0);
  b.cyl(3.5, 3.5, 14, 18, mat.alu, 0, 3.5, 0, 0, Math.PI / 2);
  b.box(7.2, 0.3, 14.2, mat.rust, 0, 3.55, 0);
  // Window band down the road side, and the door.
  for (let i = 0; i < 6; i++) {
    b.box(0.2, 1.4, 1.7, mat.glass, -3.52, 2.3, -5.5 + i * 2.2);
  }
  b.box(0.24, 2.3, 1.3, mat.paint, -3.55, 1.15, 6.2);
  // The sign on its pole, and the counter's stools inside are not visible,
  // so the stack of chairs outside does the talking.
  b.cyl(0.2, 0.24, 7.5, 10, mat.steel, -7, 3.75, -2);
  b.box(0.4, 2.6, 4.6, mat.neon, -7, 8.4, -2);
  b.box(0.6, 0.35, 5.0, mat.paint, -7, 9.9, -2);
  for (let i = 0; i < 4; i++) {
    b.cyl(0.28, 0.28, 0.1, 10, mat.rust, -5.5, 0.9 + i * 0.18, 8 + (i % 2) * 0.3);
  }
  b.box(6, 0.12, 3, mat.tin, -5, 0.06, -8);
  return b.bake(new THREE.Group());
}

/** A row of buses nobody came back for. */
function buildBuses() {
  const mat = materials();
  const b = new Batch();
  for (let i = 0; i < 5; i++) {
    const r = hashRand(i, 8221);
    const x = 2 + i * 3.6 + r * 0.7;
    const z = -6 + r * 12;
    const ry = (r - 0.5) * 0.35;
    b.box(2.6, 2.6, 11, mat.tin, x, 1.9, z, ry);
    b.box(2.68, 0.9, 11.1, i % 2 ? mat.paint : mat.rust, x, 2.9, z, ry);
    b.box(2.4, 1.1, 0.2, mat.glass, x, 2.6, z - 5.5, ry);
    for (let w = 0; w < 4; w++) {
      b.box(0.14, 0.9, 1.6, mat.glass, x - 1.35, 2.5, z - 3.6 + w * 2.4, ry);
    }
    for (const dz of [-3.6, 3.6]) {
      b.cyl(0.55, 0.55, 0.3, 10, mat.rust, x - 1.2, 0.55, z + dz, 0, Math.PI / 2);
    }
  }
  return b.bake(new THREE.Group());
}

/** The big neon arrow every dead motel on this road still has. */
function buildArrow() {
  const mat = materials();
  const b = new Batch();
  b.cyl(0.9, 1.2, 0.7, 14, mat.tin, 0, 0.35, 0);
  b.cyl(0.34, 0.44, 13, 14, mat.steel, 0, 6.5, 0);
  // The shaft of the arrow, leaning down at the road, with a head on it.
  b.box(1.6, 0.8, 12, mat.paint, 0, 12.4, 1.6, 0, 0.18);
  b.box(1.3, 0.4, 12, mat.neon, 0, 12.9, 1.6, 0, 0.18);
  b.box(1.7, 3.4, 3.4, mat.paint, 0, 11.0, 7.4, Math.PI / 4, 0.18);
  b.box(1.4, 2.4, 2.4, mat.neon, 0, 11.0, 7.4, Math.PI / 4, 0.18);
  // Bulbs down the shaft, and the little sign hanging under it.
  for (let i = 0; i < 9; i++) {
    b.cyl(0.16, 0.16, 0.2, 8, mat.neon, 0.85, 13.4 - i * 0.22, -3.5 + i * 1.2, 0, Math.PI / 2);
  }
  b.box(0.3, 2.2, 4.4, mat.tin, 0, 4.6, 0);
  return b.bake(new THREE.Group());
}

/** A trailer park with two left in it and the pads of a dozen more. */
function buildTrailers() {
  const mat = materials();
  const b = new Batch();
  const trailer = (x, z, ry, colour) => {
    b.box(3.0, 2.6, 9.5, colour, x, 1.9, z, ry);
    b.box(3.2, 0.24, 9.7, mat.alu, x, 3.3, z, ry);
    for (let i = 0; i < 3; i++) {
      b.box(0.14, 0.9, 1.2, mat.glass, x - 1.55, 2.2, z - 3 + i * 3, ry);
    }
    b.box(1.6, 0.12, 1.4, mat.rust, x - 2.2, 0.5, z + 2.4, ry);
    b.box(0.1, 1.0, 1.4, mat.rust, x - 2.2, 1.0, z + 3.1, ry);
    b.cyl(0.1, 0.1, 1.2, 6, mat.steel, x, 0.6, z - 4.6, ry);
  };
  trailer(3, -8, 0.06, mat.alu);
  trailer(4.5, 6, -0.1, mat.paint);
  for (let i = 0; i < 7; i++) {
    const r = hashRand(i, 8231);
    b.box(3.4, 0.14, 9, mat.tin, 3 + (i % 2) * 8, 0.07, -14 + i * 4.6 + r);
    b.cyl(0.12, 0.14, 1.1, 6, mat.rust, 1 + (i % 2) * 8, 0.55, -14 + i * 4.6 + r);
  }
  b.box(0.16, 3.0, 0.16, mat.timber, -3, 1.5, -2);
  b.box(0.2, 1.2, 2.8, mat.timberPale, -3, 3.2, -2);
  return b.bake(new THREE.Group());
}

/**
 * Each sight, and how far out it wants to stand.
 *
 * A drive-in screen is fourteen metres tall and a dead town is four, so one
 * distance for all five leaves half of them as specks. `reach` scales the
 * seeded distance to the size of the thing.
 */
const BUILDERS = {
  town: { build: buildTown, reach: 0.6, scale: 1.4 },
  drivein: { build: buildDriveIn, reach: 1.05, scale: 1 },
  plane: { build: buildPlane, reach: 0.82, scale: 1.1 },
  dino: { build: buildDino, reach: 0.8, scale: 1.15 },
  tower: { build: buildTower, reach: 1.1, scale: 1 },
  junkyard: { build: buildJunkyard, reach: 0.68, scale: 1.15 },
  mine: { build: buildMine, reach: 0.95, scale: 1.1 },
  dish: { build: buildDish, reach: 1.15, scale: 1 },
  church: { build: buildChurch, reach: 0.72, scale: 1.2 },
  silos: { build: buildSilos, reach: 1.0, scale: 1 },
  diner: { build: buildDiner, reach: 0.6, scale: 1.15 },
  buses: { build: buildBuses, reach: 0.72, scale: 1.1 },
  arrow: { build: buildArrow, reach: 0.66, scale: 1.15 },
  trailers: { build: buildTrailers, reach: 0.66, scale: 1.2 },
};

/* ------------------------------------------------------------------ */
/* Pool                                                                */
/* ------------------------------------------------------------------ */

export class Landmarks {
  constructor(scene) {
    // One of each, built once and moved about. There are only five, they are
    // static, and the alternative is rebuilding a dinosaur every twenty
    // kilometres.
    this.models = {};
    for (const kind of KINDS) {
      const model = compactInPlace(BUILDERS[kind].build());
      model.scale.setScalar(BUILDERS[kind].scale);
      model.visible = false;
      scene.add(model);
      this.models[kind] = model;
    }
    this.shown = new Map();
    this.tmp = { x: 0, y: 0, z: 0 };
    onReseed(() => this.hideAll());
  }

  hideAll() {
    for (const kind of KINDS) this.models[kind].visible = false;
    this.shown.clear();
  }

  /** Keeps whichever sights are in range standing where they belong. */
  update(playerS) {
    const base = Math.max(0, nextSightIndex(playerS) - 1);
    const want = new Map();
    for (let k = 0; k < 2; k++) {
      const sight = sightAt(base + k);
      // Two sights of the same kind can be in range at once; the nearer one
      // gets the model and the far one waits its turn.
      if (!want.has(sight.kind)) want.set(sight.kind, base + k);
    }
    for (const kind of KINDS) {
      const model = this.models[kind];
      const index = want.get(kind);
      if (index === undefined) {
        model.visible = false;
        this.shown.delete(kind);
        continue;
      }
      if (this.shown.get(kind) !== index) {
        this.shown.set(kind, index);
        const sight = sightAt(index);
        const lateral = sight.side * sight.out * BUILDERS[kind].reach;
        const p = roadPoint(sight.s, lateral, this.tmp);
        model.position.set(p.x, groundHeight(sight.s, lateral) - 0.3, p.z);
        // Turned to face the road, give or take, so nothing is ever square on.
        model.rotation.y =
          roadYaw(sight.s) + (sight.side > 0 ? 0 : Math.PI) + sight.turn;
      }
      model.visible = true;
    }
  }
}
