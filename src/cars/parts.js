/**
 * Shared building blocks for the car models.
 *
 * Cars are modelled in "profile space": a 2D side view (x = nose direction,
 * y = up) that gets extruded across the car's width. Front of the car is -Z in
 * world space and +X in profile space, so `profilePiece()` does the mapping.
 */
import * as THREE from 'three';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';

export function paint(color, { metalness = 0.25, roughness = 0.42 } = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    metalness,
    roughness,
    clearcoat: 0.45,
    clearcoatRoughness: 0.2,
    envMapIntensity: 0.45,
  });
}

export const MAT = {
  glass: new THREE.MeshPhysicalMaterial({
    color: '#141a20',
    metalness: 0.1,
    roughness: 0.06,
    transparent: true,
    opacity: 0.62,
    clearcoat: 1,
    envMapIntensity: 1.6,
  }),
  chrome: new THREE.MeshStandardMaterial({
    color: '#dfe4e8',
    metalness: 1,
    roughness: 0.12,
    envMapIntensity: 1.5,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    color: '#3a3d42',
    metalness: 0.85,
    roughness: 0.42,
  }),
  matteBlack: new THREE.MeshStandardMaterial({
    color: '#1b1c1e',
    metalness: 0.25,
    roughness: 0.78,
  }),
  rubber: new THREE.MeshStandardMaterial({
    color: '#131315',
    metalness: 0.05,
    roughness: 0.95,
  }),
  carbon: new THREE.MeshStandardMaterial({
    color: '#26282c',
    metalness: 0.55,
    roughness: 0.35,
  }),
  headlight: new THREE.MeshStandardMaterial({
    color: '#eaf2ff',
    emissive: '#cfe4ff',
    emissiveIntensity: 1.4,
    metalness: 0.2,
    roughness: 0.15,
  }),
  tail: new THREE.MeshStandardMaterial({
    color: '#c11d1d',
    emissive: '#ff2b1a',
    emissiveIntensity: 1.1,
    metalness: 0.2,
    roughness: 0.25,
  }),
  amber: new THREE.MeshStandardMaterial({
    color: '#e08b1a',
    emissive: '#ff9d20',
    emissiveIntensity: 0.8,
    roughness: 0.3,
  }),
  interior: new THREE.MeshStandardMaterial({
    color: '#232529',
    roughness: 0.9,
  }),
};

/**
 * Builds the lateral "sculpt" function for a car: extruded slabs come out
 * perfectly prismatic, and squeezing X as a function of height and length is
 * what turns a slab into a body with a nose, a tail and some tumblehome.
 *
 * @returns {(y:number, z:number) => number} multiplier for the X coordinate
 */
export function bodySculpt({
  halfLength,
  ends = 0.28, // how much the nose and tail pinch in
  endStart = 0.45, // where along the body the pinch begins (0..1)
  top = 0.16, // tumblehome above the beltline
  beltline = 0.95,
  roofY = 1.45,
  bottom = 0.1, // tuck-in under the sills
  floorY = 0.3,
} = {}) {
  return (y, z) => {
    const t = Math.min(1, Math.abs(z) / halfLength);
    const e = Math.max(0, (t - endStart) / (1 - endStart));
    let k = 1 - ends * Math.pow(e, 1.6);
    if (y > beltline) {
      k *= 1 - top * Math.min(1, (y - beltline) / Math.max(0.01, roofY - beltline));
    }
    if (y < floorY) {
      k *= 1 - bottom * Math.min(1, (floorY - y) / Math.max(0.01, floorY));
    }
    return k;
  };
}

/**
 * Extrudes a closed 2D side profile into a solid slab of the car.
 * @param {Array<[number,number]>} pts profile outline, counter-clockwise
 * @param {number} width extrusion width across the car
 * @param {number} lateral centre of the slab on the car's X axis
 * @param {Function} sculpt optional lateral squeeze, see bodySculpt()
 */
export function profilePiece(
  pts,
  width,
  material,
  { lateral = 0, bevel = 0.05, sculpt = null } = {}
) {
  const shape = new THREE.Shape();
  shape.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) shape.lineTo(pts[i][0], pts[i][1]);
  shape.closePath();

  const depth = Math.max(0.01, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(Math.PI / 2); // profile +x -> world -z (car nose)
  geo.translate(lateral, 0, 0);

  if (sculpt) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) * sculpt(pos.getY(i), pos.getZ(i)));
    }
    geo.computeVertexNormals();
  }

  const mesh = new THREE.Mesh(geo, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/** Convenience: a box positioned in car space. */
export function part(w, h, d, material, x, y, z, rot = [0, 0, 0]) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(x, y, z);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Rounded slab used for bumpers, splitters and wings. */
export function slab(w, h, d, material, x, y, z, rot = [0, 0, 0], radius = 0.04) {
  const shape = new THREE.Shape();
  const hw = w / 2 - radius;
  const hh = h / 2 - radius;
  shape.absarc(hw, hh, radius, 0, Math.PI / 2);
  shape.absarc(-hw, hh, radius, Math.PI / 2, Math.PI);
  shape.absarc(-hw, -hh, radius, Math.PI, Math.PI * 1.5);
  shape.absarc(hw, -hh, radius, Math.PI * 1.5, Math.PI * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: d,
    bevelEnabled: true,
    bevelThickness: 0.02,
    bevelSize: 0.02,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -d / 2);
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rot[0], rot[1], rot[2]);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* Wheels                                                              */
/* ------------------------------------------------------------------ */

function tireGeometry(radius, width, { knobby = false, shoulder = 0.14 } = {}) {
  const hw = width / 2;
  const inner = radius * 0.63;
  const profile = [
    new THREE.Vector2(inner, -hw),
    new THREE.Vector2(radius * 0.93, -hw),
    new THREE.Vector2(radius, -hw * (1 - shoulder * 2)),
    new THREE.Vector2(radius, hw * (1 - shoulder * 2)),
    new THREE.Vector2(radius * 0.93, hw),
    new THREE.Vector2(inner, hw),
  ];
  const geo = new THREE.LatheGeometry(profile, 32);
  geo.rotateZ(Math.PI / 2); // spin axis along X

  if (!knobby) return geo;

  // Chunky mud-terrain tread: staggered blocks around the carcass.
  const parts = [geo];
  const blocks = 18;
  for (let i = 0; i < blocks; i++) {
    const a = (i / blocks) * Math.PI * 2;
    for (const side of [-1, 1]) {
      const b = new THREE.BoxGeometry(width * 0.42, 0.09, radius * 0.3);
      b.rotateX(-a);
      b.translate(
        side * width * 0.26,
        Math.cos(a) * radius * 0.99,
        Math.sin(a) * radius * 0.99
      );
      parts.push(b);
    }
  }
  return mergeGeometries(parts, false);
}

function rimGeometry(radius, width, spokes, { dish = 0.42 } = {}) {
  const parts = [];
  const barrel = new THREE.CylinderGeometry(radius, radius, width * 0.86, 28, 1, true);
  barrel.rotateZ(Math.PI / 2);
  parts.push(barrel);

  const face = new THREE.CylinderGeometry(radius * 0.99, radius * 0.99, 0.05, 28);
  face.rotateZ(Math.PI / 2);
  face.translate(width * dish * 0.5, 0, 0);
  parts.push(face);

  const hub = new THREE.CylinderGeometry(radius * 0.3, radius * 0.34, width * 0.55, 16);
  hub.rotateZ(Math.PI / 2);
  parts.push(hub);

  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const s = new THREE.BoxGeometry(width * 0.34, radius * 0.92, radius * 0.17);
    s.translate(0, radius * 0.48, 0);
    s.rotateX(a);
    s.translate(width * 0.22, 0, 0);
    parts.push(s);
  }
  return mergeGeometries(parts, false);
}

/**
 * A full wheel: tyre, rim, brake disc and caliper.
 * Returns a group whose local X is the spin axis.
 */
export function makeWheel({
  radius = 0.36,
  width = 0.28,
  spokes = 5,
  knobby = false,
  rimMaterial = MAT.chrome,
  caliperColor = '#c0392b',
} = {}) {
  const group = new THREE.Group();

  const tire = new THREE.Mesh(
    tireGeometry(radius, width, { knobby }),
    MAT.rubber
  );
  tire.castShadow = true;
  group.add(tire);

  const rim = new THREE.Mesh(
    rimGeometry(radius * 0.66, width * 0.9, spokes),
    rimMaterial
  );
  rim.castShadow = true;
  group.add(rim);

  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, 0.035, 20),
    MAT.darkMetal
  );
  disc.rotation.z = Math.PI / 2;
  group.add(disc);

  const caliper = new THREE.Mesh(
    new THREE.BoxGeometry(width * 0.3, radius * 0.42, radius * 0.2),
    new THREE.MeshStandardMaterial({
      color: caliperColor,
      metalness: 0.4,
      roughness: 0.35,
    })
  );
  caliper.position.set(0, radius * 0.36, -radius * 0.2);
  group.add(caliper);

  group.userData.radius = radius;
  return group;
}

const WELL_MAT = new THREE.MeshStandardMaterial({
  color: '#0c0d0f',
  roughness: 0.95,
  side: THREE.DoubleSide,
});

/** Dark cavity behind a wheel so the arch does not look like a solid panel. */
export function wheelWell(radius, width, x, y, z) {
  const geo = new THREE.CylinderGeometry(radius, radius, width, 18, 1, true, 0, Math.PI);
  geo.rotateZ(Math.PI / 2); // open half-tube arching over the wheel
  const m = new THREE.Mesh(geo, WELL_MAT);
  m.position.set(x, y, z);
  return m;
}

/**
 * Fender flare over a wheel: a half torus stretched along the axle so its
 * round tube becomes a wide, shallow arch instead of a donut.
 */
export function fenderArch(radius, width, x, y, z, material, thickness = 0.07) {
  const geo = new THREE.TorusGeometry(radius, thickness, 8, 22, Math.PI);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.scale.x = width / (2 * thickness);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
