/**
 * Draw-call surgery.
 *
 * Everything in this game is modelled out of primitives, which is what makes
 * it readable in code and what makes it expensive on a GPU: a gas station is
 * a hundred and four separate meshes drawing eleven thousand triangles, and
 * then a hundred and four more into the shadow map. A phone will draw a
 * million triangles without complaining. It will not issue three thousand
 * draw calls sixty times a second.
 *
 * So: keep every triangle, keep every material, and hand the GPU one buffer
 * per material instead of one per bolt. Nothing about the picture changes.
 *
 * What must not be merged is anything that moves, is hidden and shown, or is
 * repainted by pointing at it later. Rather than making every caller list
 * those by hand — and quietly break the next time somebody adds one — the
 * rule is mechanical: **anything reachable from a `userData` field stays
 * loose**, along with everything under it. A part a module keeps a handle on
 * is, by definition, a part it intends to do something to.
 */
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/three/addons/utils/BufferGeometryUtils.js';

/** Depth limit on the userData walk: deep enough for real structures. */
const MAX_DEPTH = 5;

function protectFrom(value, protect, depth = 0) {
  if (!value || depth > MAX_DEPTH) return;
  if (value.isObject3D) {
    protect(value);
    return;
  }
  // Materials, textures and geometries are shared by reference and survive
  // merging untouched, so they are not a reason to keep a mesh separate.
  if (value.isMaterial || value.isTexture || value.isBufferGeometry) return;
  if (Array.isArray(value)) {
    for (const v of value) protectFrom(v, protect, depth + 1);
    return;
  }
  if (typeof value === 'object') {
    for (const v of Object.values(value)) protectFrom(v, protect, depth + 1);
  }
}

/**
 * Merge a model's meshes down to one per material, in place.
 *
 * The root keeps its identity — same object, same transform, same place in
 * the scene — so callers holding a reference to it carry on working.
 *
 * @param {THREE.Object3D} root
 * @param {{keep?: (mesh: THREE.Mesh) => boolean}} [options] `keep` marks
 *   extra meshes to leave alone, on top of the userData rule.
 * @returns {THREE.Object3D} the same root
 */
export function compactInPlace(root, { keep } = {}) {
  const loose = new Set();
  const protect = (o) => o && o.isObject3D && o.traverse((c) => loose.add(c));

  root.traverse((o) => {
    if (o.userData) protectFrom(o.userData, protect);
    if (o.userData && o.userData.loose) protect(o);
    if (keep && o.isMesh && keep(o)) protect(o);
    // A mesh hidden at build time is one somebody plans to show later.
    if (o.isMesh && !o.visible) protect(o);
  });

  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || loose.has(o) || !o.geometry || !o.geometry.attributes.position) {
      return;
    }
    let bucket = buckets.get(o.material);
    if (!bucket) buckets.set(o.material, (bucket = []));
    bucket.push(o);
  });

  const inverse = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const built = [];

  for (const [material, meshes] of buckets) {
    // One mesh already is one draw call; moving it buys nothing and would
    // bake its transform for no reason.
    if (meshes.length < 2) continue;
    const geos = [];
    for (const m of meshes) {
      const g = m.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld));
      // Every buffer in a merge has to carry the same attributes.
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && name !== 'uv') {
          g.deleteAttribute(name);
        }
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      if (!g.attributes.uv) {
        const n = g.attributes.position.count;
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n * 2), 2));
      }
      geos.push(g.toNonIndexed());
    }
    const buffer = mergeGeometries(geos, false);
    if (!buffer) {
      for (const g of geos) g.dispose();
      continue; // leave those meshes exactly where they were
    }
    const mesh = new THREE.Mesh(buffer, material);
    mesh.castShadow = meshes.some((m) => m.castShadow);
    mesh.receiveShadow = meshes.some((m) => m.receiveShadow);
    built.push({ mesh, meshes });
  }

  for (const { mesh, meshes } of built) {
    for (const m of meshes) {
      m.removeFromParent();
      m.geometry.dispose();
    }
    root.add(mesh);
  }
  return root;
}
