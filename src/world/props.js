/**
 * Roadside scenery: saguaros, boulders, dry brush, telephone poles, mile
 * markers and the mesas on the horizon.
 *
 * Every prop type is one InstancedMesh per chunk slot, so a whole chunk of
 * desert costs a handful of draw calls and no allocations when recycled.
 */
import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { hashRand, onReseed } from '../rng.js';
import { rockTexture } from '../textures.js';
import { groundHeight, CHUNK_LEN } from './road.js';
import { trackNear } from './sideroads.js';
import { sightNear } from './landmarks.js';
import { Q as QUALITY } from '../quality.js';

const M = new THREE.Matrix4();
const Q = new THREE.Quaternion();
const E = new THREE.Euler();
const V = new THREE.Vector3();
const S = new THREE.Vector3();

function transformed(geo, { pos = [0, 0, 0], rot = [0, 0, 0], scale = null }) {
  const g = geo.clone();
  if (scale) g.scale(scale[0], scale[1], scale[2]);
  g.rotateX(rot[0]);
  g.rotateZ(rot[2]);
  g.rotateY(rot[1]);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

/* ------------------------------------------------------------------ */
/* Geometry builders                                                   */
/* ------------------------------------------------------------------ */

/** A box, as a geometry, ready to be merged. */
const bx = (w, h, d, pos, rot = [0, 0, 0]) =>
  transformed(new THREE.BoxGeometry(w, h, d), { pos, rot });
/** A cylinder, likewise. */
const cy = (rt, rb, h, seg, pos, rot = [0, 0, 0]) =>
  transformed(new THREE.CylinderGeometry(rt, rb, h, seg), { pos, rot });

/**
 * An Aermotor windpump: lattice tower, fan, tail vane and a stock tank.
 *
 * The one structure that says "somebody once tried to keep animals alive
 * here" without any other explanation, which is exactly the note the empty
 * parts of this road want.
 */
function windpumpGeometry() {
  const parts = [];
  const H = 7.4;
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    // Legs splay out at the base and meet under the platform.
    parts.push(
      bx(0.12, H, 0.12, [dx * 0.62, H / 2, dz * 0.62], [dz * 0.09, 0, -dx * 0.09])
    );
  }
  for (const y of [1.9, 3.8, 5.7]) {
    const w = 1.5 * (1 - y / (H * 1.7));
    parts.push(bx(w * 2, 0.07, 0.07, [0, y, -w], [0, 0, 0]));
    parts.push(bx(w * 2, 0.07, 0.07, [0, y, w], [0, 0, 0]));
    parts.push(bx(0.07, 0.07, w * 2, [-w, y, 0], [0, 0, 0]));
    parts.push(bx(0.07, 0.07, w * 2, [w, y, 0], [0, 0, 0]));
  }
  parts.push(bx(1.5, 0.1, 1.5, [0, H, 0]));
  // Head, fan and vane. The fan is a ring of blades on a hub.
  parts.push(cy(0.22, 0.28, 0.9, 8, [0, H + 0.55, 0], [Math.PI / 2, 0, 0]));
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    parts.push(
      bx(0.34, 0.9, 0.03, [Math.cos(a) * 0.85, H + 0.55 + Math.sin(a) * 0.85, -0.5],
        [0, 0, a + 0.35])
    );
  }
  parts.push(cy(0.1, 0.1, 0.24, 8, [0, H + 0.55, -0.5], [Math.PI / 2, 0, 0]));
  parts.push(bx(0.05, 0.7, 1.9, [0, H + 0.7, 1.5]));
  parts.push(bx(0.07, 0.07, 1.6, [0, H + 0.55, 0.75]));
  // Stock tank at the foot of it, half full of nothing.
  parts.push(cy(1.5, 1.5, 0.8, 14, [2.6, 0.4, 1.2]));
  parts.push(cy(1.35, 1.35, 0.1, 14, [2.6, 0.72, 1.2]));
  return mergeGeometries(parts, false);
}

/** A run of stock fence: five posts and two wires, twelve metres of it. */
function fenceGeometry() {
  const parts = [];
  for (let i = 0; i < 5; i++) {
    const z = -6 + i * 3;
    parts.push(bx(0.1, 1.35, 0.1, [0, 0.66, z], [0, 0, (hashRand(i, 401) - 0.5) * 0.16]));
  }
  for (const y of [0.55, 1.05]) parts.push(bx(0.035, 0.035, 12.2, [0, y, 0]));
  return mergeGeometries(parts, false);
}

/** A shell somebody walked away from, on its rims, doors gone. */
function wreckGeometry() {
  const parts = [
    bx(1.8, 0.75, 4.3, [0, 0.62, 0]),
    bx(1.55, 0.62, 1.9, [0, 1.3, 0.25]),
    bx(1.62, 0.1, 2.0, [0, 1.62, 0.25]),
    // Sills where the doors were, and a bonnet peeled up at the front.
    bx(1.9, 0.16, 2.0, [0, 0.9, 0.2]),
    bx(1.5, 0.1, 1.1, [0, 1.05, -1.75], [0.5, 0, 0]),
  ];
  for (const [dx, dz] of [[-0.82, -1.4], [0.82, -1.4], [-0.82, 1.5], [0.82, 1.5]]) {
    parts.push(cy(0.32, 0.32, 0.16, 10, [dx, 0.16, dz], [0, 0, Math.PI / 2]));
  }
  return mergeGeometries(parts, false);
}

/** A ranch gate: two posts, a crossbeam and nothing behind it any more. */
function ranchGateGeometry() {
  const parts = [
    cy(0.16, 0.2, 4.2, 10, [-2.6, 2.1, 0]),
    cy(0.16, 0.2, 4.2, 10, [2.6, 2.1, 0]),
    bx(5.6, 0.24, 0.24, [0, 4.0, 0]),
    bx(5.2, 0.1, 0.1, [0, 3.6, 0]),
    bx(1.9, 0.7, 0.08, [0, 3.35, 0]),
    // The gate itself, hanging open off one hinge.
    bx(0.08, 1.5, 2.6, [-2.5, 1.5, 1.2], [0, 0.5, 0.07]),
  ];
  return mergeGeometries(parts, false);
}

/** A nodding donkey, stopped mid-stroke. */
function pumpjackGeometry() {
  const parts = [
    bx(3.4, 0.4, 1.8, [0, 0.2, 0]),
    // A-frame.
    bx(0.22, 3.4, 0.22, [-0.2, 1.9, -0.62], [0.18, 0, 0.06]),
    bx(0.22, 3.4, 0.22, [-0.2, 1.9, 0.62], [-0.18, 0, 0.06]),
    bx(0.22, 0.22, 1.5, [-0.2, 3.6, 0]),
    // Walking beam, tipped forward, with the horsehead on the end.
    bx(6.4, 0.4, 0.5, [0.4, 3.75, 0], [0, 0, -0.16]),
    bx(0.8, 1.5, 0.55, [3.5, 3.0, 0], [0, 0, -0.16]),
    bx(0.16, 2.4, 0.16, [3.7, 1.3, 0]),
    // Counterweight and crank at the back.
    cy(0.9, 0.9, 0.35, 12, [-2.9, 2.5, 0.5], [0, 0, Math.PI / 2]),
    cy(0.9, 0.9, 0.35, 12, [-2.9, 2.5, -0.5], [0, 0, Math.PI / 2]),
    bx(1.2, 1.1, 1.4, [-2.9, 0.75, 0]),
    // Wellhead.
    cy(0.3, 0.34, 1.1, 10, [3.7, 0.55, 0]),
  ];
  return mergeGeometries(parts, false);
}

/** A white cross by the road, with a wreath on it. */
function crossGeometry() {
  const parts = [
    bx(0.11, 1.25, 0.11, [0, 0.62, 0]),
    bx(0.62, 0.11, 0.11, [0, 0.95, 0]),
    cy(0.16, 0.16, 0.06, 10, [0, 0.72, 0.07], [Math.PI / 2, 0, 0]),
    bx(0.5, 0.06, 0.5, [0, 0.03, 0]),
  ];
  return mergeGeometries(parts, false);
}

/**
 * A ribbed saguaro. Built as a lathe so the ribbing is real geometry rather
 * than a texture, with two arms and the little areole bumps down the ribs.
 */
function cactusGeometry() {
  const parts = [];

  /** One fluted limb, capped with a dome. */
  const limb = (radius, height, segments = 15, rings = 8) => {
    const profile = [];
    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      // Slightly fatter at the base, tapering, then rounding over the top.
      const swell = 1 + 0.1 * Math.sin(t * Math.PI) - 0.12 * t;
      profile.push(new THREE.Vector2(radius * swell, t * height));
    }
    const dome = 4;
    for (let i = 1; i <= dome; i++) {
      const a = (i / dome) * (Math.PI / 2);
      profile.push(
        new THREE.Vector2(
          radius * 0.88 * Math.cos(a),
          height + radius * 0.85 * Math.sin(a)
        )
      );
    }
    const geo = new THREE.LatheGeometry(profile, segments);

    // Flutes: pinch the radius on a sine around the axis.
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const r = Math.hypot(x, z);
      if (r < 1e-4) continue;
      const a = Math.atan2(z, x);
      const k = 1 + 0.075 * Math.sin(a * 13);
      pos.setX(i, Math.cos(a) * r * k);
      pos.setZ(i, Math.sin(a) * r * k);
    }
    geo.computeVertexNormals();
    return geo;
  };

  parts.push(limb(0.5, 5.0, 16, 9));

  // Arms: a quarter-torus elbow lifting into a vertical limb.
  const arm = (side, height, y) => {
    const elbow = new THREE.TorusGeometry(0.75, 0.29, 7, 12, Math.PI / 2);
    parts.push(
      transformed(elbow, { rot: [0, side > 0 ? 0 : Math.PI, 0], pos: [0, y, 0] })
    );
    parts.push(
      transformed(limb(0.3, height, 11, 5), { pos: [side * 0.75, y, 0] })
    );
  };
  arm(1, 1.7, 2.6);
  arm(-1, 1.2, 3.6);
  return mergeGeometries(parts, false);
}

/**
 * A weathered boulder: a subdivided icosahedron pushed around by a couple of
 * octaves of hash noise, then flattened where it meets the sand.
 */
function rockGeometry(seed, detail = 2) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  const lump = (x, y, z, f, sd) =>
    hashRand(
      Math.round(x * f) * 3 + Math.round(y * f) * 61 + Math.round(z * f) * 131,
      sd
    );
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    // Big lobes, then a finer chip on top of them.
    const n =
      0.74 +
      0.42 * lump(x, y, z, 3.1, seed) +
      0.14 * lump(x, y, z, 9.7, seed + 7) +
      0.06 * lump(x, y, z, 23.3, seed + 19);
    pos.setXYZ(i, x * n * 1.25, Math.max(-0.12, y * n * 0.78), z * n);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Dry desert shrub: a clump of thin tapered branches. */
function bushGeometry() {
  const parts = [];
  const blades = 10;
  for (let i = 0; i < blades; i++) {
    const a = (i / blades) * Math.PI * 2 + hashRand(i, 71) * 0.5;
    const lean = 0.3 + hashRand(i, 83) * 0.35;
    const len = 0.85 + hashRand(i, 97) * 0.55;
    parts.push(
      transformed(new THREE.ConeGeometry(0.075, len, 5, 1), {
        rot: [lean * Math.cos(a), 0, lean * Math.sin(a)],
        pos: [Math.cos(a) * 0.2, len * 0.46, Math.sin(a) * 0.2],
      })
    );
  }
  return mergeGeometries(parts, false);
}

/** Weathered timber pole with two crossarms and glass insulators. */
function poleGeometry() {
  const parts = [
    transformed(new THREE.CylinderGeometry(0.16, 0.23, 9.2, 14), {
      pos: [0, 4.6, 0],
    }),
    // Cap, so the top is not an open-looking disc.
    transformed(new THREE.CylinderGeometry(0.17, 0.16, 0.12, 14), {
      pos: [0, 9.24, 0],
    }),
  ];
  for (const [y, span] of [[8.3, 2.6], [7.3, 1.8]]) {
    parts.push(transformed(new THREE.BoxGeometry(span, 0.18, 0.22), { pos: [0, y, 0] }));
    // Knee braces under the arm.
    for (const side of [-1, 1]) {
      parts.push(
        transformed(new THREE.BoxGeometry(0.7, 0.09, 0.11), {
          rot: [0, 0, side * 0.72],
          pos: [side * 0.29, y - 0.28, 0],
        })
      );
    }
    const xs = span > 2 ? [-1.05, 0, 1.05] : [-0.7, 0.7];
    for (const x of xs) {
      parts.push(
        transformed(new THREE.CylinderGeometry(0.085, 0.11, 0.2, 10), {
          pos: [x, y + 0.19, 0],
        })
      );
      parts.push(
        transformed(new THREE.CylinderGeometry(0.055, 0.055, 0.14, 8), {
          pos: [x, y + 0.35, 0],
        })
      );
    }
  }
  return mergeGeometries(parts, false);
}

/** White delineator post with a reflector. */
function markerGeometry() {
  return mergeGeometries(
    [
      transformed(new THREE.CylinderGeometry(0.055, 0.07, 1.05, 8), {
        pos: [0, 0.52, 0],
      }),
      transformed(new THREE.BoxGeometry(0.1, 0.18, 0.12), { pos: [0, 0.86, 0] }),
    ],
    false
  );
}

/**
 * A stacked butte, lathed from a stepped profile.
 *
 * The old one was three nine-sided drums, which from the road read as a
 * stack of hexagonal tins. This walks a real sedimentary section instead:
 * every band is a vertical cliff face, a set-back ledge and a small
 * overhanging lip, so the strata are geometry and catch their own shadow.
 */
function mesaGeometry() {
  const profile = [];
  const push = (r, y) => profile.push(new THREE.Vector2(r, y));

  // Talus: the debris apron that piles up at the foot of the cliff.
  push(1.42, 0.0);
  push(1.31, 0.1);
  push(1.21, 0.19);
  push(1.14, 0.27);

  // The cliff: near vertical, stepped by thin strata, each with a lip that
  // catches its own shadow line.
  let r = 1.14;
  let y = 0.27;
  for (let i = 0; i < 7; i++) {
    const h = 0.15;
    y += h * 0.78;
    push(r, y);
    r -= 0.022;
    y += h * 0.22;
    push(r, y);
    push(r + 0.013, y + 0.008);
    r -= 0.004;
  }

  // Caprock: harder rock, so it stands a little proud and then goes flat.
  push(r + 0.03, y + 0.02);
  push(r + 0.036, y + 0.13);
  push(r - 0.02, y + 0.19);
  push(r * 0.86, y + 0.22);
  push(0, y + 0.24);

  const geo = new THREE.LatheGeometry(profile, 26);

  // Break the circle: no butte in the desert is a lathe.
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const rr = Math.hypot(x, z);
    if (rr < 1e-4) continue;
    const a = Math.atan2(z, x);
    const k =
      1 +
      0.12 * Math.sin(a * 3 + 1.2) +
      0.06 * Math.sin(a * 7 - 0.4) +
      0.03 * Math.sin(a * 13 + 2.1);
    pos.setX(i, Math.cos(a) * rr * k);
    pos.setZ(i, Math.sin(a) * rr * k);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Widest the mesa base gets, per unit of width scale, noise included. */
const MESA_REACH = 1.6;
/** And how much desert it has to leave between itself and the road. */
const MESA_CLEARANCE = 150;

/** Lowest drawn ground under a footprint, so nothing floats over a dip. */
function lowestGround(s, lat, radiusS, radiusLat) {
  let low = groundHeight(s, lat);
  for (const f of [0.55, 1]) {
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      low = Math.min(
        low,
        groundHeight(s + Math.sin(a) * radiusS * f, lat + Math.cos(a) * radiusLat * f)
      );
    }
  }
  return low;
}

/* ------------------------------------------------------------------ */
/* Prop field                                                          */
/* ------------------------------------------------------------------ */

/**
 * One InstancedMesh per chunk slot, per prop type.
 *
 * Two things used to make this cost far more than it needed to. Every mesh
 * drew its full instance count whether or not the chunk had that many —
 * skipped props were written as zero-scale matrices, which still go through
 * the vertex shader. And `frustumCulled` was off, so all twenty-odd chunks
 * of every type were submitted every frame, including the ones behind you
 * and the ones a kilometre past the fog.
 *
 * Now a chunk is filled between `begin` and `finish`: skipped props are
 * simply not written, `count` ends up at however many there really are, and
 * the bounding sphere `finish` computes lets the frustum throw away the
 * chunks you are not looking at. Same props, same positions, a fraction of
 * the submissions.
 */
class InstancedProp {
  constructor(scene, geometry, material, perChunk, slots, { shadows = false } = {}) {
    this.perChunk = perChunk;
    this.meshes = [];
    this.used = new Array(slots).fill(0);
    for (let i = 0; i < slots; i++) {
      const mesh = new THREE.InstancedMesh(geometry, material, perChunk);
      mesh.castShadow = shadows;
      mesh.receiveShadow = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = 0;
      scene.add(mesh);
      this.meshes.push(mesh);
    }
  }

  clearAll() {
    for (let s = 0; s < this.meshes.length; s++) this.clear(s);
  }

  clear(slot) {
    this.used[slot] = 0;
    this.meshes[slot].count = 0;
  }

  begin(slot) {
    this.used[slot] = 0;
  }

  set(slot, i, x, y, z, yaw, scale, tilt = 0) {
    const n = this.used[slot];
    if (n >= this.perChunk) return;
    E.set(tilt, yaw, 0);
    Q.setFromEuler(E);
    V.set(x, y, z);
    S.set(scale, scale, scale);
    M.compose(V, Q, S);
    this.meshes[slot].setMatrixAt(n, M);
    this.used[slot] = n + 1;
  }

  setNonUniform(slot, i, x, y, z, yaw, sx, sy, sz) {
    const n = this.used[slot];
    if (n >= this.perChunk) return;
    E.set(0, yaw, 0);
    Q.setFromEuler(E);
    V.set(x, y, z);
    S.set(sx, sy, sz);
    M.compose(V, Q, S);
    this.meshes[slot].setMatrixAt(n, M);
    this.used[slot] = n + 1;
  }

  flush(slot) {
    const mesh = this.meshes[slot];
    mesh.count = this.used[slot];
    mesh.instanceMatrix.needsUpdate = true;
    // Bounds over the instances actually written, so the frustum can drop
    // the whole chunk in one test.
    if (mesh.count > 0) mesh.computeBoundingSphere();
  }
}

/**
 * The scattered man-made things: windpumps, wrecks, gates, pumpjacks and
 * roadside crosses.
 *
 * Each kind has its own spacing and a few copies that get walked up the road
 * as you drive, exactly like the motels and the landmarks. That costs a
 * handful of draw calls in total rather than one per kind per chunk slot,
 * which is what putting them in the instanced field cost — and instancing
 * buys nothing for a thing there are three of.
 */
const ROADSIDE_KINDS = {
  //           first   gap     spread  near   far   yawWithRoad
  windpump: [1400, 2600, 2600, 45, 165, false],
  wreck: [2600, 3400, 3400, 5, 26, false],
  gate: [3900, 5200, 5200, 9, 15, true],
  pumpjack: [5200, 6800, 6800, 60, 205, false],
  cross: [2100, 2900, 2900, 2.6, 4.2, true],
};
/** How many of each are kept built. Two in view and one being moved. */
const ROADSIDE_SLOTS = 3;

class Roadside {
  constructor(scene, geometries) {
    this.kinds = [];
    for (const [name, [geo, mat]] of Object.entries(geometries)) {
      const [first, gap, spread, near, far, alignRoad] = ROADSIDE_KINDS[name];
      const slots = [];
      for (let i = 0; i < ROADSIDE_SLOTS; i++) {
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.visible = false;
        scene.add(mesh);
        slots.push({ mesh, index: -1 });
      }
      this.kinds.push({ name, first, gap, spread, near, far, alignRoad, slots, at: [] });
    }
    this.tmp = { x: 0, y: 0, z: 0 };
  }

  reset() {
    for (const kind of this.kinds) {
      kind.at.length = 0;
      for (const slot of kind.slots) {
        slot.index = -1;
        slot.mesh.visible = false;
      }
    }
  }

  /** Where the `i`th of this kind stands, memoised. */
  place(kind, i, seedBase) {
    while (kind.at.length <= i) {
      const n = kind.at.length;
      const prev = n === 0 ? kind.first : kind.at[n - 1].s + kind.gap;
      const r = hashRand(n, seedBase);
      const q = hashRand(n, seedBase + 11);
      kind.at.push({
        s: prev + Math.round(r * kind.spread),
        side: q > 0.5 ? 1 : -1,
        out: kind.near + q * (kind.far - kind.near),
        spin: r * Math.PI * 2,
        scale: 0.9 + q * 0.35,
      });
    }
    return kind.at[i];
  }

  update(playerS) {
    for (let k = 0; k < this.kinds.length; k++) {
      const kind = this.kinds[k];
      const seedBase = 9100 + k * 40;
      let base = 0;
      while (this.place(kind, base, seedBase).s < playerS - 220) base++;
      for (let j = 0; j < ROADSIDE_SLOTS; j++) {
        const slot = kind.slots[j];
        const index = base + j;
        if (slot.index === index) continue;
        slot.index = index;
        const at = this.place(kind, index, seedBase);
        const lateral = at.side * at.out;
        const p = roadPoint(at.s, lateral, this.tmp);
        slot.mesh.position.set(p.x, groundHeight(at.s, lateral), p.z);
        slot.mesh.rotation.y = kind.alignRoad
          ? roadYaw(at.s) + (at.side > 0 ? 0 : Math.PI)
          : at.spin;
        slot.mesh.scale.setScalar(at.scale);
        slot.mesh.visible = true;
      }
    }
  }
}

export class PropField {
  constructor(scene, slots) {
    const cactusMat = new THREE.MeshStandardMaterial({
      color: '#4f7042',
      roughness: 0.85,
      flatShading: false,
    });
    const rockMat = new THREE.MeshStandardMaterial({
      color: '#9a7458',
      roughness: 0.95,
      flatShading: true,
    });
    const bushMat = new THREE.MeshStandardMaterial({
      color: '#8f8348',
      roughness: 1,
      flatShading: true,
    });
    const woodMat = new THREE.MeshStandardMaterial({
      color: '#6b563e',
      roughness: 0.92,
    });
    const markerMat = new THREE.MeshStandardMaterial({
      color: '#e8e4d8',
      roughness: 0.7,
      emissive: '#2a2318',
      emissiveIntensity: 0.1,
    });
    const mesaTex = rockTexture();
    mesaTex.repeat.set(3, 6);
    const mesaMat = new THREE.MeshStandardMaterial({
      map: mesaTex,
      roughness: 1,
      flatShading: true,
    });

    this.cactus = new InstancedProp(scene, cactusGeometry(), cactusMat, 6, slots, {
      shadows: true,
    });
    this.rockA = new InstancedProp(scene, rockGeometry(5), rockMat, 10, slots, {
      shadows: true,
    });
    this.rockB = new InstancedProp(scene, rockGeometry(19, 1), rockMat, 12, slots);
    this.bush = new InstancedProp(scene, bushGeometry(), bushMat, 20, slots);
    this.pole = new InstancedProp(scene, poleGeometry(), woodMat, 3, slots);
    this.marker = new InstancedProp(scene, markerGeometry(), markerMat, 7, slots);
    this.mesa = new InstancedProp(scene, mesaGeometry(), mesaMat, 2, slots);

    // Things people put here, as opposed to things that grew here. Sparse on
    // purpose — one every few chunks — so that meeting one still registers.
    const steelMat = new THREE.MeshStandardMaterial({
      color: '#8a8b86',
      metalness: 0.6,
      roughness: 0.55,
      flatShading: true,
    });
    const rustMat = new THREE.MeshStandardMaterial({
      color: '#8a5a3c',
      roughness: 0.95,
      flatShading: true,
    });
    const whiteMat = new THREE.MeshStandardMaterial({
      color: '#ddd8cb',
      roughness: 0.9,
    });
    // Fences run in stretches and belong to the chunk that carries them.
    this.fence = new InstancedProp(scene, fenceGeometry(), woodMat, 8, slots);

    this.all = [
      this.cactus,
      this.rockA,
      this.rockB,
      this.bush,
      this.pole,
      this.marker,
      this.mesa,
      this.fence,
    ];

    /**
     * The one-off structures do not live per chunk.
     *
     * A prop type costs one draw call per chunk slot whether it draws
     * anything or not, and with twenty slots a windpump that turns up in one
     * chunk in twelve was costing twenty calls to draw, on average, less than
     * two windpumps. They are on their own small pool instead: a handful of
     * copies of each, walked along the road the way the motels are.
     */
    this.roadside = new Roadside(scene, {
      windpump: [windpumpGeometry(), steelMat],
      wreck: [wreckGeometry(), rustMat],
      gate: [ranchGateGeometry(), woodMat],
      pumpjack: [pumpjackGeometry(), rustMat],
      cross: [crossGeometry(), whiteMat],
    });
    // A new seed moves every one of them. Registered after the pool exists:
    // onReseed calls straight back the moment you hand it a listener.
    onReseed(() => this.roadside.reset());

    // Power lines strung between the poles of successive chunks.
    this.wireSlots = [];
    const wireMat = new THREE.LineBasicMaterial({ color: '#3a3128' });
    for (let i = 0; i < slots; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute(
        'position',
        new THREE.BufferAttribute(new Float32Array(3 * 3 * 16 * 2), 3)
      );
      const line = new THREE.LineSegments(geo, wireMat);
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.wireSlots.push(line);
    }
  }

  /** Called by RoadSystem when a chunk slot takes on a new stretch of road. */
  assign(chunkIndex, s0, slot) {
    for (const prop of this.all) prop.begin(slot);
    const p = { x: 0, y: 0, z: 0 };
    // How much of the scatter this quality level asks for. Taken off the top
    // of each kind's count rather than at random, so thinning the desert is
    // deterministic and a chunk looks the same every time you drive past it.
    const share = (prop) => Math.max(1, Math.round(prop.perChunk * QUALITY.propDensity));
    const place = (prop, i, s, lat, yaw, scale, tilt = 0) => {
      roadPoint(s, lat, p);
      prop.set(slot, i, p.x, groundHeight(s, lat) - 0.05, p.z, yaw, scale, tilt);
    };

    // Cacti and boulders keep clear of the shoulder; brush creeps closer.
    for (let i = 0, n = share(this.cactus); i < n; i++) {
      const r = hashRand(chunkIndex, i * 3 + 1);
      const side = hashRand(chunkIndex, i * 3 + 2) > 0.5 ? 1 : -1;
      const lat = side * (EDGE + 6 + hashRand(chunkIndex, i * 3 + 3) * 90);
      if (r > 0.62) {
        continue;
      }
      place(
        this.cactus,
        i,
        s0 + r * CHUNK_LEN,
        lat,
        r * 9,
        0.7 + r * 0.75,
        (r - 0.3) * 0.08
      );
    }

    for (let i = 0, n = share(this.rockA); i < n; i++) {
      const r = hashRand(chunkIndex, 100 + i);
      const side = hashRand(chunkIndex, 200 + i) > 0.5 ? 1 : -1;
      const lat = side * (EDGE + 3 + hashRand(chunkIndex, 300 + i) * 120);
      place(this.rockA, i, s0 + r * CHUNK_LEN, lat, r * 6, 0.5 + r * 2.4);
    }
    for (let i = 0, n = share(this.rockB); i < n; i++) {
      const r = hashRand(chunkIndex, 400 + i);
      const side = hashRand(chunkIndex, 500 + i) > 0.5 ? 1 : -1;
      const lat = side * (EDGE + 1 + hashRand(chunkIndex, 600 + i) * 40);
      place(this.rockB, i, s0 + r * CHUNK_LEN, lat, r * 6, 0.18 + r * 0.5);
    }
    for (let i = 0, n = share(this.bush); i < n; i++) {
      const r = hashRand(chunkIndex, 700 + i);
      const side = hashRand(chunkIndex, 800 + i) > 0.5 ? 1 : -1;
      const lat = side * (EDGE + 0.5 + hashRand(chunkIndex, 900 + i) * 150);
      place(this.bush, i, s0 + r * CHUNK_LEN, lat, r * 6, 0.6 + r * 1.1);
    }

    // Poles march down the right-hand side, one every 30 m.
    const wirePts = [];
    for (let i = 0; i < this.pole.perChunk; i++) {
      const s = s0 + i * 33 + 8;
      const lat = EDGE + 7.5;
      place(this.pole, i, s, lat, 0.06, 0.95 + hashRand(chunkIndex, i) * 0.12);
      roadPoint(s, lat, p);
      wirePts.push({ x: p.x, y: groundHeight(s, lat) + 8.0, z: p.z });
    }
    this.updateWires(slot, wirePts, s0);

    for (let i = 0, n = share(this.marker); i < n; i++) {
      const s = s0 + i * 14 + 4;
      const side = i % 2 === 0 ? 1 : -1;
      place(this.marker, i, s, side * (EDGE - 0.5), 0, 1);
    }

    // Fence lines run in stretches rather than dotted about: either this
    // chunk has a fence down one side of it or it does not.
    const hasFence = hashRand(chunkIndex >> 2, 2600) < 0.34;
    const fenceSide = hashRand(chunkIndex >> 2, 2610) > 0.5 ? 1 : -1;
    const fenceLat = fenceSide * (EDGE + 12 + hashRand(chunkIndex >> 2, 2620) * 16);
    for (let i = 0, n = share(this.fence); i < n; i++) {
      if (!hasFence) {
        continue;
      }
      place(this.fence, i, s0 + 6 + i * 12, fenceLat, 0, 1);
    }

    // A butte on the horizon roughly every fifth chunk.
    for (let i = 0, n = share(this.mesa); i < n; i++) {
      const r = hashRand(chunkIndex, 1300 + i);
      if (r > 0.22) {
        continue;
      }
      const side = hashRand(chunkIndex, 1400 + i) > 0.5 ? 1 : -1;
      const w = 60 + hashRand(chunkIndex, 1600 + i) * 190;
      const h = 45 + hashRand(chunkIndex, 1700 + i) * 90;
      const stretch = 0.7 + hashRand(chunkIndex, 1800 + i) * 0.7;

      // Push it out by its own footprint. The lateral used to be picked
      // without reference to the width, so a wide butte placed at the near
      // end of the range reached back over the highway.
      const reach = MESA_REACH * w;
      const lat =
        side * (reach + MESA_CLEARANCE + hashRand(chunkIndex, 1500 + i) * 620);
      const s = s0 + r * CHUNK_LEN;

      // The dirt spurs run out through exactly this band of desert. A butte
      // dropped on one swallows the track and the briefcase at the end of
      // it, so anything sharing that corridor stands down.
      const spur = trackNear(s, reach * stretch + 260);
      if (spur && spur.side === side) continue;
      // Same for the landmarks, and for the same reason: a butte on top of
      // the dinosaur is a butte, and the whole point of the dinosaur is that
      // it is not another butte.
      const sight = sightNear(s, reach * stretch + 300);
      if (sight && sight.side === side) continue;

      roadPoint(s, lat, p);
      this.mesa.setNonUniform(
        slot,
        i,
        p.x,
        // Sunk to the lowest ground it stands on, so no part of the base
        // hangs in the air over a hollow.
        lowestGround(s, lat, reach * stretch, reach) - 2.5,
        p.z,
        r * 7,
        w,
        h,
        w * stretch
      );
    }

    for (const prop of this.all) prop.flush(slot);
  }

  updateWires(slot, poles, s0) {
    const line = this.wireSlots[slot];
    const arr = line.geometry.attributes.position.array;
    let n = 0;
    // Three sagging wires between each consecutive pair of poles, extended one
    // span past the chunk so the line reads as continuous.
    const spans = [];
    for (let i = 0; i < poles.length - 1; i++) spans.push([poles[i], poles[i + 1]]);
    if (poles.length) {
      const last = poles[poles.length - 1];
      spans.push([last, { x: last.x, y: last.y, z: last.z - 33 }]);
    }
    for (const [a, b] of spans) {
      for (let w = -1; w <= 1; w++) {
        const ox = w * 1.05;
        const steps = 4;
        let prev = null;
        for (let k = 0; k <= steps; k++) {
          const t = k / steps;
          const sag = Math.sin(t * Math.PI) * 0.9;
          const pt = {
            x: a.x + (b.x - a.x) * t + ox,
            y: a.y + (b.y - a.y) * t + 0.55 - sag,
            z: a.z + (b.z - a.z) * t,
          };
          if (prev && n + 6 <= arr.length) {
            arr[n++] = prev.x;
            arr[n++] = prev.y;
            arr[n++] = prev.z;
            arr[n++] = pt.x;
            arr[n++] = pt.y;
            arr[n++] = pt.z;
          }
          prev = pt;
        }
      }
    }
    for (let i = n; i < arr.length; i++) arr[i] = 0;
    line.geometry.attributes.position.needsUpdate = true;
    line.geometry.computeBoundingSphere();
    line.visible = true;
  }

  release(slot) {
    for (const prop of this.all) prop.clear(slot);
    this.wireSlots[slot].visible = false;
  }
}
