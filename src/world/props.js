/**
 * Roadside scenery: saguaros, boulders, dry brush, telephone poles, mile
 * markers and the mesas on the horizon.
 *
 * Every prop type is one InstancedMesh per chunk slot, so a whole chunk of
 * desert costs a handful of draw calls and no allocations when recycled.
 */
import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import { roadPoint, EDGE } from '../track.js';
import { hashRand } from '../rng.js';
import { rockTexture } from '../textures.js';
import { terrainHeight, CHUNK_LEN } from './road.js';

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

/** A ribbed saguaro with one or two arms. */
function cactusGeometry() {
  const parts = [];
  const trunk = new THREE.CylinderGeometry(0.42, 0.55, 5.4, 12, 3);
  // Squash a few rings inward to fake the vertical ribbing of a saguaro.
  const pos = trunk.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const a = Math.atan2(z, x);
    const r = Math.hypot(x, z) * (1 + 0.07 * Math.sin(a * 12));
    pos.setX(i, Math.cos(a) * r);
    pos.setZ(i, Math.sin(a) * r);
  }
  parts.push(transformed(trunk, { pos: [0, 2.7, 0] }));
  parts.push(
    transformed(new THREE.SphereGeometry(0.42, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), {
      pos: [0, 5.4, 0],
    })
  );

  // Arms: a quarter torus elbow topped with a vertical limb.
  const arm = (side, height, y) => {
    const elbow = new THREE.TorusGeometry(0.75, 0.3, 8, 12, Math.PI / 2);
    parts.push(
      transformed(elbow, {
        rot: [0, side > 0 ? 0 : Math.PI, 0],
        pos: [side * 0.0, y, 0],
      })
    );
    parts.push(
      transformed(new THREE.CylinderGeometry(0.29, 0.31, height, 10), {
        pos: [side * 0.75, y + height / 2, 0],
      })
    );
    parts.push(
      transformed(
        new THREE.SphereGeometry(0.29, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        { pos: [side * 0.75, y + height, 0] }
      )
    );
  };
  arm(1, 1.7, 2.6);
  arm(-1, 1.2, 3.6);
  return mergeGeometries(parts, false);
}

function rockGeometry(seed, detail = 1) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    const n =
      0.72 +
      0.5 * hashRand(Math.round((x + 2) * 97) + Math.round((y + 2) * 31), seed) +
      0.18 * hashRand(Math.round((z + 2) * 53), seed + 7);
    pos.setXYZ(i, x * n * 1.25, Math.max(-0.15, y * n * 0.8), z * n);
  }
  geo.computeVertexNormals();
  return geo;
}

/** Dry desert shrub built from a few crossed cones. */
function bushGeometry() {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    parts.push(
      transformed(new THREE.ConeGeometry(0.16, 1.0 + (i % 3) * 0.25, 5), {
        rot: [0.42 * Math.cos(a), 0, 0.42 * Math.sin(a)],
        pos: [Math.cos(a) * 0.22, 0.5, Math.sin(a) * 0.22],
      })
    );
  }
  return mergeGeometries(parts, false);
}

/** Weathered timber pole with a crossarm and glass insulators. */
function poleGeometry() {
  const parts = [
    transformed(new THREE.CylinderGeometry(0.16, 0.22, 9.2, 8), { pos: [0, 4.6, 0] }),
    transformed(new THREE.BoxGeometry(2.6, 0.18, 0.22), { pos: [0, 8.3, 0] }),
    transformed(new THREE.BoxGeometry(0.16, 0.7, 0.16), { pos: [0, 7.95, 0] }),
  ];
  for (const x of [-1.05, 0, 1.05]) {
    parts.push(
      transformed(new THREE.CylinderGeometry(0.09, 0.11, 0.26, 7), {
        pos: [x, 8.53, 0],
      })
    );
  }
  return mergeGeometries(parts, false);
}

/** White delineator post with a reflector. */
function markerGeometry() {
  return mergeGeometries(
    [
      transformed(new THREE.BoxGeometry(0.12, 1.05, 0.09), { pos: [0, 0.52, 0] }),
      transformed(new THREE.BoxGeometry(0.1, 0.18, 0.12), { pos: [0, 0.86, 0] }),
    ],
    false
  );
}

/** Stacked butte: a wide base, a stepped shoulder and a flat cap. */
function mesaGeometry() {
  const parts = [
    transformed(new THREE.CylinderGeometry(1.0, 1.32, 1.0, 9, 1), { pos: [0, 0.5, 0] }),
    transformed(new THREE.CylinderGeometry(0.72, 1.02, 0.55, 9, 1), { pos: [0, 1.25, 0] }),
    transformed(new THREE.CylinderGeometry(0.66, 0.74, 0.22, 9, 1), { pos: [0, 1.62, 0] }),
  ];
  const geo = mergeGeometries(parts, false);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const k = Math.round(pos.getX(i) * 31) + Math.round(pos.getZ(i) * 17);
    const j = 0.94 + hashRand(k, 3) * 0.14;
    pos.setX(i, pos.getX(i) * j);
    pos.setZ(i, pos.getZ(i) * j);
  }
  geo.computeVertexNormals();
  return geo;
}

/* ------------------------------------------------------------------ */
/* Prop field                                                          */
/* ------------------------------------------------------------------ */

class InstancedProp {
  constructor(scene, geometry, material, perChunk, slots, { shadows = false } = {}) {
    this.perChunk = perChunk;
    this.meshes = [];
    for (let i = 0; i < slots; i++) {
      const mesh = new THREE.InstancedMesh(geometry, material, perChunk);
      mesh.frustumCulled = false;
      mesh.castShadow = shadows;
      mesh.receiveShadow = false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      mesh.count = perChunk;
      scene.add(mesh);
      this.meshes.push(mesh);
    }
    this.clearAll();
  }

  clearAll() {
    for (let s = 0; s < this.meshes.length; s++) this.clear(s);
  }

  clear(slot) {
    const mesh = this.meshes[slot];
    for (let i = 0; i < this.perChunk; i++) {
      M.makeScale(0, 0, 0);
      mesh.setMatrixAt(i, M);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  set(slot, i, x, y, z, yaw, scale, tilt = 0) {
    E.set(tilt, yaw, 0);
    Q.setFromEuler(E);
    V.set(x, y, z);
    S.set(scale, scale, scale);
    M.compose(V, Q, S);
    this.meshes[slot].setMatrixAt(i, M);
  }

  setNonUniform(slot, i, x, y, z, yaw, sx, sy, sz) {
    E.set(0, yaw, 0);
    Q.setFromEuler(E);
    V.set(x, y, z);
    S.set(sx, sy, sz);
    M.compose(V, Q, S);
    this.meshes[slot].setMatrixAt(i, M);
  }

  flush(slot) {
    this.meshes[slot].instanceMatrix.needsUpdate = true;
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

    this.cactus = new InstancedProp(scene, cactusGeometry(), cactusMat, 8, slots, {
      shadows: true,
    });
    this.rockA = new InstancedProp(scene, rockGeometry(5), rockMat, 10, slots, {
      shadows: true,
    });
    this.rockB = new InstancedProp(scene, rockGeometry(19, 0), rockMat, 12, slots);
    this.bush = new InstancedProp(scene, bushGeometry(), bushMat, 20, slots);
    this.pole = new InstancedProp(scene, poleGeometry(), woodMat, 3, slots);
    this.marker = new InstancedProp(scene, markerGeometry(), markerMat, 7, slots);
    this.mesa = new InstancedProp(scene, mesaGeometry(), mesaMat, 2, slots);

    this.all = [
      this.cactus,
      this.rockA,
      this.rockB,
      this.bush,
      this.pole,
      this.marker,
      this.mesa,
    ];

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
    const p = { x: 0, y: 0, z: 0 };
    const place = (prop, i, s, lat, yaw, scale, tilt = 0) => {
      roadPoint(s, lat, p);
      prop.set(slot, i, p.x, terrainHeight(s, lat) - 0.05, p.z, yaw, scale, tilt);
    };

    // Cacti and boulders keep clear of the shoulder; brush creeps closer.
    for (let i = 0; i < this.cactus.perChunk; i++) {
      const r = hashRand(chunkIndex, i * 3 + 1);
      const side = hashRand(chunkIndex, i * 3 + 2) > 0.5 ? 1 : -1;
      const lat = side * (EDGE + 6 + hashRand(chunkIndex, i * 3 + 3) * 90);
      if (r > 0.62) {
        this.cactus.set(slot, i, 0, 0, 0, 0, 0);
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

    for (let i = 0; i < this.rockA.perChunk; i++) {
      const r = hashRand(chunkIndex, 100 + i);
      const side = hashRand(chunkIndex, 200 + i) > 0.5 ? 1 : -1;
      const lat = side * (EDGE + 3 + hashRand(chunkIndex, 300 + i) * 120);
      place(this.rockA, i, s0 + r * CHUNK_LEN, lat, r * 6, 0.5 + r * 2.4);
    }
    for (let i = 0; i < this.rockB.perChunk; i++) {
      const r = hashRand(chunkIndex, 400 + i);
      const side = hashRand(chunkIndex, 500 + i) > 0.5 ? 1 : -1;
      const lat = side * (EDGE + 1 + hashRand(chunkIndex, 600 + i) * 40);
      place(this.rockB, i, s0 + r * CHUNK_LEN, lat, r * 6, 0.18 + r * 0.5);
    }
    for (let i = 0; i < this.bush.perChunk; i++) {
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
      wirePts.push({ x: p.x, y: terrainHeight(s, lat) + 8.0, z: p.z });
    }
    this.updateWires(slot, wirePts, s0);

    for (let i = 0; i < this.marker.perChunk; i++) {
      const s = s0 + i * 14 + 4;
      const side = i % 2 === 0 ? 1 : -1;
      place(this.marker, i, s, side * (EDGE - 0.5), 0, 1);
    }

    // A butte on the horizon roughly every fifth chunk.
    for (let i = 0; i < this.mesa.perChunk; i++) {
      const r = hashRand(chunkIndex, 1300 + i);
      if (r > 0.22) {
        this.mesa.set(slot, i, 0, 0, 0, 0, 0);
        continue;
      }
      const side = hashRand(chunkIndex, 1400 + i) > 0.5 ? 1 : -1;
      const lat = side * (320 + hashRand(chunkIndex, 1500 + i) * 900);
      const s = s0 + r * CHUNK_LEN;
      roadPoint(s, lat, p);
      const w = 60 + hashRand(chunkIndex, 1600 + i) * 190;
      const h = 45 + hashRand(chunkIndex, 1700 + i) * 90;
      this.mesa.setNonUniform(
        slot,
        i,
        p.x,
        terrainHeight(s, lat) - 4,
        p.z,
        r * 7,
        w,
        h,
        w * (0.7 + hashRand(chunkIndex, 1800 + i) * 0.7)
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
