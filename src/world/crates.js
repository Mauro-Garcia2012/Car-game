/**
 * Crates fallen off somebody's truck, sitting about ten metres off the
 * tarmac.
 *
 * Nearly all of them are empty — the point is that you never know, so every
 * one is a small bet: a swerve into the sand, a bit of extra fuel and a few
 * seconds, against a one-in-four chance of ten dollars and a rare hundred.
 *
 * They live on the chunk system like the rest of the scenery, one instanced
 * mesh per chunk slot, and remember what has already been broken open.
 */
import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { hashRand } from '../rng.js';
import { terrainHeight, CHUNK_LEN } from './road.js';
import { stationDistance, nextStationIndex } from './gasStation.js';
import { motelDistance, nextMotelIndex } from './motel.js';

/** Candidate spots per 100 m chunk, and how many of them actually get one. */
const PER_CHUNK = 2;
const SPAWN_CHANCE = 0.17; // works out at roughly one crate every 300 m

/** How far off the tarmac they sit. */
const LATERAL_MIN = EDGE + 3;
const LATERAL_SPREAD = 4;

/** What is inside: mostly nothing at all. */
const EMPTY_UP_TO = 0.75;
const SMALL_UP_TO = 0.97;
export const SMALL_PRIZE = 10;
export const BIG_PRIZE = 100;

/** How close the car has to get to break one open. */
const REACH_S = 2.8;
const REACH_LATERAL = 2.4;

/** Keep the forecourts clear. */
const STATION_CLEARANCE = 70;
const MOTEL_CLEARANCE = 50;

function nearAStop(s) {
  for (const i of [nextStationIndex(s) - 1, nextStationIndex(s)]) {
    if (i >= 0 && Math.abs(stationDistance(i) - s) < STATION_CLEARANCE) return true;
  }
  for (const i of [nextMotelIndex(s) - 1, nextMotelIndex(s)]) {
    if (i >= 0 && Math.abs(motelDistance(i) - s) < MOTEL_CLEARANCE) return true;
  }
  return false;
}

/** Dollars inside crate `key`, or 0 for the usual disappointment. */
function contentsOf(chunkIndex, i) {
  const r = hashRand(chunkIndex, 5100 + i);
  if (r < EMPTY_UP_TO) return 0;
  if (r < SMALL_UP_TO) return SMALL_PRIZE;
  return BIG_PRIZE;
}

/** A slatted wooden crate, lid slightly ajar. */
function crateGeometry() {
  const parts = [];
  const body = new THREE.BoxGeometry(0.86, 0.66, 0.86);
  body.translate(0, 0.33, 0);
  parts.push(body);

  // Corner battens, so it reads as boards rather than a plain box.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const post = new THREE.BoxGeometry(0.1, 0.7, 0.1);
      post.translate(sx * 0.42, 0.35, sz * 0.42);
      parts.push(post);
    }
  }
  for (const y of [0.12, 0.54]) {
    for (const sz of [-1, 1]) {
      const rail = new THREE.BoxGeometry(0.92, 0.08, 0.06);
      rail.translate(0, y, sz * 0.45);
      parts.push(rail);
    }
    for (const sx of [-1, 1]) {
      const rail = new THREE.BoxGeometry(0.06, 0.08, 0.92);
      rail.translate(sx * 0.45, y, 0);
      parts.push(rail);
    }
  }

  const lid = new THREE.BoxGeometry(0.92, 0.09, 0.92);
  lid.rotateZ(0.09);
  lid.translate(0.02, 0.7, 0);
  parts.push(lid);

  return mergeGeometries(parts, false);
}

export class Crates {
  constructor(scene, slots) {
    const wood = new THREE.MeshStandardMaterial({
      color: '#9a6f3f',
      roughness: 0.92,
      flatShading: true,
    });

    this.geometry = crateGeometry();
    this.meshes = [];
    for (let i = 0; i < slots; i++) {
      const mesh = new THREE.InstancedMesh(this.geometry, wood, PER_CHUNK);
      mesh.frustumCulled = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      scene.add(mesh);
      this.meshes.push(mesh);
    }

    /** Live crates by slot, so collection can hide exactly one instance. */
    this.bySlot = new Map();
    this.opened = new Set();
    this.matrix = new THREE.Matrix4();
    this.quat = new THREE.Quaternion();
    this.euler = new THREE.Euler();
    this.vec = new THREE.Vector3();
    this.scale = new THREE.Vector3();
    for (let i = 0; i < slots; i++) this.release(i);
  }

  reset() {
    this.opened.clear();
    for (const [slot, list] of this.bySlot) {
      for (const crate of list) crate.taken = false;
      this.redraw(slot);
    }
  }

  /** Places one instance, or hides it when scale is zero. */
  place(slot, i, crate) {
    const mesh = this.meshes[slot];
    if (!crate || crate.taken) {
      this.matrix.makeScale(0, 0, 0);
    } else {
      this.euler.set(crate.tilt, crate.yaw, crate.roll);
      this.quat.setFromEuler(this.euler);
      this.vec.set(crate.x, crate.y, crate.z);
      this.scale.set(crate.size, crate.size, crate.size);
      this.matrix.compose(this.vec, this.quat, this.scale);
    }
    mesh.setMatrixAt(i, this.matrix);
  }

  redraw(slot) {
    const list = this.bySlot.get(slot) || [];
    for (let i = 0; i < PER_CHUNK; i++) this.place(slot, i, list[i]);
    this.meshes[slot].instanceMatrix.needsUpdate = true;
  }

  /** RoadSystem hands us a fresh 100 m of desert. */
  assign(chunkIndex, s0, slot) {
    const list = [];
    for (let i = 0; i < PER_CHUNK; i++) {
      if (hashRand(chunkIndex, 5000 + i) > SPAWN_CHANCE) continue;
      const s = s0 + (0.2 + 0.6 * hashRand(chunkIndex, 5200 + i)) * CHUNK_LEN;
      if (nearAStop(s)) continue;
      const side = hashRand(chunkIndex, 5300 + i) > 0.45 ? 1 : -1;
      const lateral =
        side * (LATERAL_MIN + hashRand(chunkIndex, 5400 + i) * LATERAL_SPREAD);
      const p = roadPoint(s, lateral);
      const key = `${chunkIndex}:${i}`;
      list.push({
        key,
        s,
        lateral,
        x: p.x,
        y: terrainHeight(s, lateral) - 0.05,
        z: p.z,
        yaw: roadYaw(s) + hashRand(chunkIndex, 5500 + i) * 2.2,
        tilt: (hashRand(chunkIndex, 5600 + i) - 0.5) * 0.25,
        roll: (hashRand(chunkIndex, 5700 + i) - 0.5) * 0.3,
        size: 0.9 + hashRand(chunkIndex, 5800 + i) * 0.35,
        cash: contentsOf(chunkIndex, i),
        taken: this.opened.has(key),
      });
    }
    this.bySlot.set(slot, list);
    this.redraw(slot);
  }

  release(slot) {
    this.bySlot.set(slot, []);
    this.redraw(slot);
  }

  /**
   * Breaks open any crate the car has just reached.
   * @returns {{cash:number, x:number, y:number, z:number}|null}
   */
  collect(playerS, playerLateral) {
    for (const [slot, list] of this.bySlot) {
      for (let i = 0; i < list.length; i++) {
        const crate = list[i];
        if (crate.taken) continue;
        if (Math.abs(crate.s - playerS) > REACH_S) continue;
        if (Math.abs(crate.lateral - playerLateral) > REACH_LATERAL) continue;
        crate.taken = true;
        this.opened.add(crate.key);
        this.place(slot, i, crate);
        this.meshes[slot].instanceMatrix.needsUpdate = true;
        return { cash: crate.cash, x: crate.x, y: crate.y, z: crate.z };
      }
    }
    return null;
  }
}
