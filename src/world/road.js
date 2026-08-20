/**
 * The endless highway and the desert it crosses.
 *
 * Both are ribbons of quads that follow the analytic track curve. A fixed pool
 * of chunks is recycled as the player advances: when a chunk falls behind the
 * camera its vertex buffers are rewritten for a slot further up the road, so
 * the world is infinite without ever allocating.
 */
import * as THREE from 'three';
import { centerX, centerY, roadPoint, EDGE, ROAD_HALF } from '../track.js';
import { noise2 } from '../rng.js';
import { asphaltTexture, sandTexture } from '../textures.js';

export const CHUNK_LEN = 100;
const ROWS = 30; // quads along the chunk (~3.3 m each)
const ROAD_COLS = 14;
const CHUNKS_AHEAD = 18;
const CHUNKS_BEHIND = 2;

/** Lateral sample positions across the tarmac, evenly spaced for clean UVs. */
const ROAD_LATERALS = Array.from(
  { length: ROAD_COLS + 1 },
  (_, i) => -EDGE + (2 * EDGE * i) / ROAD_COLS
);

/** Desert samples: dense next to the shoulder, sparse towards the horizon. */
const TERRAIN_LATERALS = (() => {
  const half = [];
  const K = 26;
  for (let k = 0; k <= K; k++) {
    half.push(EDGE + 1600 * Math.pow(k / K, 2.7));
  }
  return [...half.slice().reverse().map((v) => -v), ...half];
})();

/** Ground height (and its blend into the tarmac) at a point beside the road. */
export function terrainHeight(s, lateral) {
  const road = centerY(s);
  const d = Math.abs(lateral);
  if (d <= EDGE) {
    // Gentle crown on the tarmac, shoulders dropping away.
    const t = Math.min(1, d / ROAD_HALF);
    return road - 0.09 * t * t - (d > ROAD_HALF ? (d - ROAD_HALF) * 0.09 : 0);
  }
  const x = centerX(s) + lateral;
  const blend = Math.min(1, (d - EDGE) / 55); // ease out of the ditch
  const dune =
    (noise2(x * 0.0075, s * 0.0075, 11) - 0.5) * 26 +
    (noise2(x * 0.031, s * 0.031, 27) - 0.5) * 5.5 +
    (noise2(x * 0.14, s * 0.14, 41) - 0.5) * 0.9;
  const far = Math.min(1, d / 260); // far away the land is allowed to rise
  return road - 0.55 + blend * (dune * (0.25 + 0.75 * far) + 0.55);
}

/**
 * The height of the desert *as drawn*, rather than as computed.
 *
 * `terrainHeight` is the analytic surface; the mesh is a grid of triangles
 * sampled from it, and out where the columns are eighty metres apart the two
 * are not the same thing. Anything placed with the analytic value ends up
 * floating over a dune the mesh cut the top off, or sunk into a hollow the
 * mesh never dug. So scenery asks this instead: it walks the same grid the
 * ribbon is built on and interpolates the same triangle the renderer draws.
 */
export function groundHeight(s, lateral) {
  const step = CHUNK_LEN / ROWS;
  const rf = s / step;
  const r0 = Math.floor(rf);
  const tr = rf - r0;
  const sA = r0 * step;
  const sB = sA + step;

  const lats = TERRAIN_LATERALS;
  const clamped = Math.max(lats[0], Math.min(lats[lats.length - 1], lateral));
  let c = 0;
  while (c < lats.length - 2 && lats[c + 1] < clamped) c++;
  const latC = lats[c];
  const latD = lats[c + 1];
  const tc = (clamped - latC) / (latD - latC);

  const hA = terrainHeight(sA, latC);
  const hB = terrainHeight(sA, latD);
  const hD = terrainHeight(sB, latC);
  const hE = terrainHeight(sB, latD);

  // The cell is split a-b-d / b-e-d, so which half we are in decides the plane.
  return tr + tc <= 1
    ? hA + tc * (hB - hA) + tr * (hD - hA)
    : hB + tr * (hE - hB) + (1 - tc) * (hD - hE);
}

class Ribbon {
  constructor(laterals, material, { uvScaleV, uvAcross, heightFn }) {
    this.laterals = laterals;
    this.rows = ROWS;
    this.cols = laterals.length - 1;
    this.heightFn = heightFn;
    this.uvScaleV = uvScaleV;
    this.uvAcross = uvAcross;

    const vertCount = (this.rows + 1) * (this.cols + 1);
    this.positions = new Float32Array(vertCount * 3);
    this.normals = new Float32Array(vertCount * 3);
    this.uvs = new Float32Array(vertCount * 2);

    const indices = new Uint32Array(this.rows * this.cols * 6);
    let n = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const a = r * (this.cols + 1) + c;
        const b = a + 1;
        const d = a + this.cols + 1;
        const e = d + 1;
        // Counter-clockwise seen from above, so the surface faces up.
        indices[n++] = a;
        indices[n++] = b;
        indices[n++] = d;
        indices[n++] = b;
        indices[n++] = e;
        indices[n++] = d;
      }
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3)
    );
    this.geometry.setAttribute(
      'normal',
      new THREE.BufferAttribute(this.normals, 3)
    );
    this.geometry.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2));
    this.geometry.setIndex(new THREE.BufferAttribute(indices, 1));

    this.mesh = new THREE.Mesh(this.geometry, material);
    this.mesh.frustumCulled = false;
    this.mesh.matrixAutoUpdate = false;
  }

  rebuild(s0) {
    const { positions, uvs, laterals, rows, cols } = this;
    const p = { x: 0, y: 0, z: 0 };
    let i = 0;
    let u = 0;
    for (let r = 0; r <= rows; r++) {
      const s = s0 + (CHUNK_LEN * r) / rows;
      for (let c = 0; c <= cols; c++) {
        const lat = laterals[c];
        roadPoint(s, lat, p);
        positions[i] = p.x;
        positions[i + 1] = this.heightFn(s, lat);
        positions[i + 2] = p.z;
        uvs[u] = this.uvAcross ? this.uvAcross(lat) : p.x / this.uvScaleV;
        uvs[u + 1] = s / this.uvScaleV;
        i += 3;
        u += 2;
      }
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.uv.needsUpdate = true;
    this.geometry.computeVertexNormals();
    this.geometry.computeBoundingSphere();
  }
}

export class RoadSystem {
  constructor(scene) {
    const asphalt = asphaltTexture();
    asphalt.repeat.set(1, 1);
    const sand = sandTexture();
    sand.repeat.set(1, 1);

    this.roadMaterial = new THREE.MeshStandardMaterial({
      map: asphalt,
      roughness: 0.86,
      metalness: 0.0,
    });
    this.sandMaterial = new THREE.MeshStandardMaterial({
      map: sand,
      roughness: 1.0,
      metalness: 0.0,
      color: '#ffffff',
    });

    this.group = new THREE.Group();
    scene.add(this.group);

    this.chunks = [];
    for (let i = 0; i < CHUNKS_AHEAD + CHUNKS_BEHIND + 1; i++) {
      const road = new Ribbon(ROAD_LATERALS, this.roadMaterial, {
        uvScaleV: 16,
        uvAcross: (lat) => (lat + EDGE) / (2 * EDGE),
        heightFn: (s, lat) => terrainHeight(s, lat) + 0.02,
      });
      const terrain = new Ribbon(TERRAIN_LATERALS, this.sandMaterial, {
        uvScaleV: 15,
        uvAcross: null,
        heightFn: terrainHeight,
      });
      road.mesh.receiveShadow = true;
      terrain.mesh.receiveShadow = true;
      this.group.add(road.mesh, terrain.mesh);
      this.chunks.push({ index: null, slot: i, road, terrain });
    }
    this.byIndex = new Map();
    /** Listeners get (chunkIndex, s0, slot) on assign and (slot) on release. */
    this.listeners = [];
  }

  /** Anything that also lives per chunk (props, stations) subscribes here. */
  addListener(listener) {
    this.listeners.push(listener);
  }

  /** Recycles chunks so the road always covers the player's view. */
  update(playerS) {
    const first = Math.floor(playerS / CHUNK_LEN) - CHUNKS_BEHIND;
    const last = first + this.chunks.length - 1;

    // Release chunks that dropped out of range.
    for (const chunk of this.chunks) {
      if (chunk.index !== null && (chunk.index < first || chunk.index > last)) {
        this.byIndex.delete(chunk.index);
        chunk.index = null;
        for (const l of this.listeners) l.release(chunk.slot);
      }
    }
    // Fill the gaps.
    for (let idx = first; idx <= last; idx++) {
      if (this.byIndex.has(idx)) continue;
      const chunk = this.chunks.find((c) => c.index === null);
      if (!chunk) break;
      chunk.index = idx;
      const s0 = idx * CHUNK_LEN;
      chunk.road.rebuild(s0);
      chunk.terrain.rebuild(s0);
      this.byIndex.set(idx, chunk);
      for (const l of this.listeners) l.assign(idx, s0, chunk.slot);
    }
  }

  get slotCount() {
    return this.chunks.length;
  }
}
