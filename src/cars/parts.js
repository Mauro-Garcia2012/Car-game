/**
 * Shared building blocks for the car models.
 *
 * Cars are modelled in "profile space": a 2D side view (x = nose direction,
 * y = up) that gets extruded across the car's width. Front of the car is -Z in
 * world space and +X in profile space, so `profilePiece()` does the mapping.
 */
import * as THREE from 'three';
import { glowAtNight } from '../world/nightlights.js';
import {
  mergeGeometries,
  toCreasedNormals,
} from '../../vendor/three/addons/utils/BufferGeometryUtils.js';

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
  // Headlamp glass. The emissive lens material is what the beam anchors are
  // found by and it blows out in daylight, so the thing you actually see
  // through is this: clear, sharp and lit only by what is behind it.
  lens: new THREE.MeshPhysicalMaterial({
    color: '#dfe9f2',
    metalness: 0,
    roughness: 0.04,
    transmission: 0.72,
    thickness: 0.06,
    transparent: true,
    opacity: 0.55,
    clearcoat: 1,
    envMapIntensity: 1.8,
  }),
  carbon: new THREE.MeshStandardMaterial({
    color: '#26282c',
    metalness: 0.55,
    roughness: 0.35,
  }),
  // Lenses, on every vehicle in the game. They lift hard after dark: a semi
  // coming the other way used to be invisible until it was inside your own
  // beams, which is not a hazard, it is an ambush.
  headlight: glowAtNight(
    new THREE.MeshStandardMaterial({
      color: '#eaf2ff',
      emissive: '#cfe4ff',
      emissiveIntensity: 1.4,
      metalness: 0.2,
      roughness: 0.15,
    }),
    5.5
  ),
  tail: glowAtNight(
    new THREE.MeshStandardMaterial({
      color: '#c11d1d',
      emissive: '#ff2b1a',
      emissiveIntensity: 1.1,
      metalness: 0.2,
      roughness: 0.25,
    }),
    3.2
  ),
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
  mirrorGlass: new THREE.MeshStandardMaterial({
    color: '#8d99a8',
    metalness: 0.95,
    roughness: 0.08,
    side: THREE.DoubleSide,
  }),
  sooty: new THREE.MeshStandardMaterial({
    color: '#0a0a0b',
    roughness: 0.95,
  }),
  shutLine: new THREE.MeshStandardMaterial({
    color: '#141518',
    roughness: 0.85,
  }),
  plate: new THREE.MeshStandardMaterial({
    color: '#e7e3d6',
    roughness: 0.7,
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
 * Longest edge allowed in a body profile before it gets split up.
 *
 * This is the single number that decides whether a car reads as sculpted or
 * as folded out of card. The lateral squeeze in `bodySculpt` is applied per
 * vertex, so a profile edge with nothing between its ends can only ever
 * become a flat chamfer — at 0.11 a whole door was four or five facets and
 * you could count them. At 0.042 the same panel gets two and a half times
 * the points and the squeeze turns into an actual curve.
 */
const PROFILE_STEP = 0.042;

/**
 * Half-width of a sculpted body at a point on its flank.
 *
 * Anything bolted to the side of a car — mirrors, handles, shut lines, side
 * intakes — has to sit on the surface, and the surface moves: `bodySculpt`
 * pulls it in towards the nose, the tail, the roof and the sills. Placing
 * fittings at a fixed X buries them in the paint at one end of the car and
 * floats them off it at the other.
 */
export function flankX(width, sculpt, y, z) {
  return (width / 2) * (sculpt ? sculpt(y, z) : 1);
}

/**
 * Walks a profile outline and drops extra points into any long run.
 *
 * The silhouette is untouched — the new points sit exactly on the old
 * edges. What they buy is somewhere for `bodySculpt` to bend: the lateral
 * squeeze is applied per vertex, so on a bare four-point panel it can only
 * produce a flat chamfer, while on a dense one it produces a curve.
 */
function densify(pts, step = PROFILE_STEP) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i];
    const [bx, by] = pts[(i + 1) % pts.length];
    out.push([ax, ay]);
    const cuts = Math.floor(Math.hypot(bx - ax, by - ay) / step);
    for (let k = 1; k < cuts; k++) {
      const t = k / cuts;
      out.push([ax + (bx - ax) * t, ay + (by - ay) * t]);
    }
  }
  return out;
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
  { lateral = 0, bevel = 0.05, sculpt = null, crease = 0.62 } = {}
) {
  const dense = sculpt ? densify(pts) : pts;
  const shape = new THREE.Shape();
  shape.moveTo(dense[0][0], dense[0][1]);
  for (let i = 1; i < dense.length; i++) shape.lineTo(dense[i][0], dense[i][1]);
  shape.closePath();

  const depth = Math.max(0.01, width - bevel * 2);
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    // The bevel is the edge highlight — every crease on the car catches the
    // sun along it, and at four segments that highlight was a visible strip
    // of flats. Ten is where it stops reading as a chamfer and starts
    // reading as a radius.
    bevelSegments: 10,
    curveSegments: 30,
  });
  geo.translate(0, 0, -depth / 2);
  geo.rotateY(Math.PI / 2); // profile +x -> world -z (car nose)
  geo.translate(lateral, 0, 0);

  let out = geo;
  if (sculpt) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setX(i, pos.getX(i) * sculpt(pos.getY(i), pos.getZ(i)));
    }
    // Smooth across the sculpted curvature but keep the panel creases: plain
    // computeVertexNormals on an extrusion is per-face, so a denser profile
    // would only ever have meant more facets.
    out = toCreasedNormals(geo, crease);
  }

  const mesh = new THREE.Mesh(out, material);
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
    bevelSegments: 6,
    curveSegments: 20,
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
/* Detail kit                                                          */
/* ------------------------------------------------------------------ */

/*
 * The parts below are the difference between a shape that is the right shape
 * and a thing that looks like a car. None of them change the silhouette; all
 * of them are what the eye actually reads at three metres — a grille with
 * slats in it, a lamp with a reflector behind the lens, a seat behind the
 * glass, a gap where the door opens.
 */

const INTERIOR_MAT = new THREE.MeshStandardMaterial({
  color: '#15171b',
  roughness: 0.88,
  metalness: 0.05,
});
const TRIM_MAT = new THREE.MeshStandardMaterial({
  color: '#2a2d33',
  roughness: 0.7,
});

/**
 * What you see through the windscreen.
 *
 * Empty glass is the single loudest tell that a model is a toy: a real car
 * seen from behind is two headrests and a wheel rim, and without them the
 * cabin reads as a tinted void. Everything here is deliberately dark — it is
 * seen through 60%-opacity glass and only ever wants to be a suggestion.
 *
 * @param {object} o
 * @param {number} o.width  cabin width
 * @param {number} o.floorY floor height
 * @param {number} o.seatZ  z of the seat backs
 * @param {number} o.wheelZ z of the steering wheel
 * @param {number} o.dashZ  z of the dash top
 * @param {number} [o.seats] one or two
 */
export function cabinInterior({
  width,
  floorY,
  seatZ,
  wheelZ,
  dashZ,
  seats = 2,
  seatH = 0.5,
  rake = 0.16,
}) {
  const g = new THREE.Group();
  const half = width / 2;
  const xs = seats === 1 ? [0] : [-half * 0.46, half * 0.46];

  for (const x of xs) {
    // Squab, backrest and a headrest on a stalk.
    g.add(slab(0.42, 0.1, 0.46, INTERIOR_MAT, x, floorY + 0.11, seatZ - 0.2, [0, 0, 0], 0.04));
    g.add(
      slab(0.42, seatH, 0.14, INTERIOR_MAT, x, floorY + 0.13 + seatH / 2, seatZ, [rake, 0, 0], 0.05)
    );
    g.add(
      slab(
        0.3,
        0.17,
        0.12,
        INTERIOR_MAT,
        x,
        floorY + 0.2 + seatH,
        seatZ - Math.sin(rake) * 0.1,
        [rake, 0, 0],
        0.05
      )
    );
    // Bolsters down each side of the backrest.
    for (const side of [-1, 1]) {
      g.add(
        slab(0.08, seatH * 0.86, 0.16, TRIM_MAT, x + side * 0.19, floorY + 0.16 + seatH / 2, seatZ - 0.03, [rake, 0, 0], 0.04)
      );
    }
  }

  // Dash roll and the binnacle over the instruments.
  g.add(slab(width * 0.86, 0.16, 0.3, INTERIOR_MAT, 0, floorY + 0.52, dashZ, [0, 0, 0], 0.06));
  g.add(
    slab(0.34, 0.13, 0.2, TRIM_MAT, xs[0], floorY + 0.63, dashZ + 0.06, [-0.3, 0, 0], 0.05)
  );

  // The wheel: a rim, a hub and three spokes, tipped back on its column.
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.022, 10, 28), TRIM_MAT);
  rim.rotation.x = Math.PI / 2 - 0.42;
  rim.position.set(xs[0], floorY + 0.62, wheelZ);
  g.add(rim);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.04, 12), TRIM_MAT);
  hub.rotation.x = -0.42;
  hub.position.copy(rim.position);
  g.add(hub);
  for (let i = 0; i < 3; i++) {
    const a2 = (i / 3) * Math.PI * 2 + 0.5;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.015), TRIM_MAT);
    spoke.position.set(
      rim.position.x + Math.cos(a2) * 0.07,
      rim.position.y + Math.sin(a2) * 0.07 * Math.cos(0.42),
      rim.position.z + Math.sin(a2) * 0.07 * Math.sin(0.42)
    );
    spoke.rotation.set(-0.42, 0, -a2 + Math.PI / 2);
    g.add(spoke);
  }
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.26, 10), TRIM_MAT);
  column.rotation.x = Math.PI / 2 - 0.42;
  column.position.set(xs[0], floorY + 0.55, wheelZ + 0.11);
  g.add(column);

  // Floor and a transmission tunnel, so the cabin has a bottom to it.
  g.add(part(width * 0.9, 0.04, Math.abs(dashZ - seatZ) + 0.7, INTERIOR_MAT, 0, floorY, (dashZ + seatZ) / 2));
  if (seats > 1) {
    g.add(slab(0.22, 0.16, Math.abs(dashZ - seatZ) + 0.4, TRIM_MAT, 0, floorY + 0.08, (dashZ + seatZ) / 2, [0, 0, 0], 0.05));
  }
  return compact(g);
}

/**
 * A grille: a recessed dark opening with slats across it.
 *
 * @param {'h'|'v'} dir slat direction
 */
export function grille(
  w,
  h,
  d,
  { x = 0, y = 0, z = 0, bars = 5, dir = 'h', frame = null, mat = MAT.matteBlack } = {}
) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  // The mouth, sunk in behind whatever it is set into.
  g.add(part(w, h, d, MAT.matteBlack, 0, 0, d * 0.5));
  for (let i = 0; i < bars; i++) {
    const t = (i + 0.5) / bars - 0.5;
    if (dir === 'h') {
      g.add(part(w * 0.98, h / bars * 0.42, d * 0.5, mat, 0, t * h, -d * 0.05));
    } else {
      g.add(part(w / bars * 0.36, h * 0.94, d * 0.5, mat, t * w, 0, -d * 0.05));
    }
  }
  if (frame) {
    g.add(part(w + 0.06, 0.045, d * 0.7, frame, 0, h / 2 + 0.02, -d * 0.1));
    g.add(part(w + 0.06, 0.045, d * 0.7, frame, 0, -h / 2 - 0.02, -d * 0.1));
    for (const side of [-1, 1]) {
      g.add(part(0.045, h + 0.09, d * 0.7, frame, (side * (w + 0.045)) / 2, 0, -d * 0.1));
    }
  }
  return compact(g);
}

/**
 * A lamp: a chromed reflector bowl with a lens over it.
 *
 * A flat emissive rectangle reads as a sticker. What makes a headlamp look
 * like glass is that there is obviously something behind it.
 */
export function lampCluster(
  w,
  h,
  {
    x = 0,
    y = 0,
    z = 0,
    lens = null,
    pods = 2,
    depth = 0.12,
    ring = MAT.chrome,
    // Bike projectors stack up the nose of a fairing instead of spreading
    // across it, so the row can be turned on its side.
    vertical = false,
  } = {}
) {
  const glass = lens || MAT.lens;
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.add(part(w + 0.05, h + 0.05, depth * 0.5, MAT.matteBlack, 0, 0, depth * 0.4));
  const along = vertical ? h : w;
  const across = vertical ? w : h;
  const r = Math.min(across, along / pods) * 0.46;
  for (let i = 0; i < pods; i++) {
    const u = pods === 1 ? 0 : (i / (pods - 1) - 0.5) * (along - r * 2);
    const t = vertical ? 0 : u;
    const v = vertical ? u : 0;
    const bowl = new THREE.Mesh(
      new THREE.SphereGeometry(r, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      ring
    );
    bowl.rotation.x = Math.PI / 2;
    bowl.scale.z = 0.7;
    bowl.position.set(t, v, depth * 0.34);
    g.add(bowl);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(r * 0.3, 12, 10),
      MAT.headlight
    );
    bulb.position.set(t, v, depth * 0.16);
    g.add(bulb);
    // A chrome ring round each pod, which is most of what reads as a lamp.
    const trim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.94, r * 0.08, 8, 24), ring);
    trim.position.set(t, v, depth * 0.02);
    g.add(trim);
  }
  // The lens: thin, clear and sitting flush rather than proud.
  const cover = slab(
    w,
    h,
    depth * 0.1,
    glass,
    0,
    0,
    -depth * 0.02,
    [0, 0, 0],
    Math.min(w, h) * 0.3
  );
  g.add(cover);
  return compact(g);
}

/**
 * A shut line: the gap where a panel opens.
 *
 * It follows the flank, so it has to be placed with `flankX` at each end or
 * it sinks into the paint at one and floats off it at the other.
 */
export function shutLine(sculpt, width, y0, y1, z, { lateral = 1, w = 0.013 } = {}) {
  const g = new THREE.Group();
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const t = (i + 0.5) / steps;
    const y = y0 + (y1 - y0) * t;
    const px = flankX(width, sculpt, y, z);
    // Sunk a hair into the paint, not laid on top of it: a shut line is a
    // shadow in a groove, and a black strip standing proud of the door reads
    // as a stripe someone painted on.
    const seg = part(
      w,
      (Math.abs(y1 - y0) / steps) * 1.2,
      0.012,
      MAT.matteBlack,
      lateral * (px - 0.011),
      y,
      z
    );
    g.add(seg);
  }
  return compact(g);
}

/** A windscreen wiper: arm, pivot and blade, parked to one side. */
export function wiper(x, y, z, { len = 0.5, angle = 0.35, side = 1, tilt = -0.9 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.set(tilt, 0, side * angle);
  g.add(part(0.02, 0.02, len * 0.8, MAT.matteBlack, 0, 0.012, -len * 0.4));
  const blade = part(0.03, 0.05, len * 0.62, MAT.matteBlack, 0, 0.02, -len * 0.78);
  g.add(blade);
  const pivot = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.032, 0.05, 10), MAT.darkMetal);
  g.add(pivot);
  return g;
}

/** A stubby whip aerial. */
export function aerial(x, y, z, { len = 0.55, lean = 0.35 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.x = lean;
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.038, 0.06, 10), MAT.matteBlack);
  base.position.y = 0.03;
  g.add(base);
  const whip = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.014, len, 8), MAT.darkMetal);
  whip.position.y = 0.06 + len / 2;
  g.add(whip);
  return g;
}

/**
 * Suspension you can see through the arch: a wishbone, a coilover and a
 * driveshaft. Only the top half is ever visible, which is the point — it
 * fills the black hole behind the wheel with something that looks mechanical.
 */
export function suspension(x, y, z, { reach = 0.42, springColor = '#c0392b' } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  const side = Math.sign(x) || 1;

  const arm = new THREE.Mesh(new THREE.BoxGeometry(reach, 0.05, 0.09), MAT.darkMetal);
  arm.position.set(-side * reach * 0.5, -0.06, 0);
  g.add(arm);
  const arm2 = new THREE.Mesh(new THREE.BoxGeometry(reach * 0.9, 0.045, 0.08), MAT.darkMetal);
  arm2.position.set(-side * reach * 0.48, 0.16, 0.05);
  arm2.rotation.z = side * 0.12;
  g.add(arm2);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, reach, 10), MAT.chrome);
  shaft.rotation.z = Math.PI / 2;
  shaft.position.set(-side * reach * 0.5, 0.02, 0);
  g.add(shaft);

  const coil = coilSpring(
    0.3,
    0.05,
    7,
    new THREE.MeshStandardMaterial({ color: springColor, roughness: 0.5, metalness: 0.3 })
  );
  coil.position.set(-side * reach * 0.32, 0.16, 0.02);
  coil.rotation.z = side * 0.16;
  g.add(coil);
  const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 8), MAT.chrome);
  rod.position.copy(coil.position);
  rod.position.y += 0.12;
  rod.rotation.z = side * 0.16;
  g.add(rod);
  return compact(g);
}

/* ------------------------------------------------------------------ */
/* Small fittings                                                      */
/* ------------------------------------------------------------------ */

/**
 * A door wing mirror: stalk, shell and a dark glass face.
 *
 * None of the road cars had one, which is one of those omissions you cannot
 * unsee once you notice it — the silhouette of a car is partly its mirrors.
 */
export function wingMirror(side, x, y, z, shellMaterial, { scale = 1 } = {}) {
  // `x` is where the stalk meets the door; the shell hangs outboard of it.
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const stalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03 * scale, 0.05 * scale, 0.28 * scale, 10),
    MAT.matteBlack
  );
  stalk.rotation.z = -side * 0.95;
  // Rooted a little inside the paint so it never floats free of the door.
  stalk.position.set(side * 0.06 * scale, 0.05 * scale, 0);
  g.add(stalk);

  const shell = slab(
    0.1 * scale,
    0.13 * scale,
    0.22 * scale,
    shellMaterial,
    side * 0.19 * scale,
    0.11 * scale,
    0,
    [0, 0, 0],
    0.035 * scale
  );
  g.add(shell);

  const glass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.16 * scale, 0.095 * scale),
    MAT.mirrorGlass
  );
  glass.rotation.y = Math.PI - side * 0.22;
  glass.position.set(side * 0.19 * scale, 0.11 * scale, 0.055 * scale);
  g.add(glass);

  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

/** A tailpipe: chrome outside, hollow-looking inside. */
export function exhaustTip(x, y, z, radius = 0.065, length = 0.18) {
  const g = new THREE.Group();
  const pipe = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.12, length, 16, 1, true),
    MAT.chrome
  );
  pipe.rotation.x = Math.PI / 2;
  g.add(pipe);
  // The bore. Without it a tailpipe is just a chrome peg.
  const bore = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.82, radius * 0.82, length * 0.9, 16),
    MAT.sooty
  );
  bore.rotation.x = Math.PI / 2;
  bore.position.z = -length * 0.06;
  g.add(bore);
  g.position.set(x, y, z);
  g.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return g;
}

/**
 * Door shut lines and a handle. Thin dark insets: they cost almost nothing
 * and they are most of what tells the eye a flank is a door.
 */
export function doorFurniture(
  side,
  z,
  { top = 1.1, bottom = 0.42, width = 2, sculpt = null, handleY = null, handleZ = 0 } = {}
) {
  const g = new THREE.Group();

  // The shut line is cut as a stack of short segments, each pushed out to
  // wherever the flank happens to be at that height — a single straight bar
  // would dive into the paint as the body tucks in under the sills.
  const steps = 9;
  for (let i = 0; i < steps; i++) {
    const yy = bottom + ((i + 0.5) * (top - bottom)) / steps;
    const m = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, (top - bottom) / steps + 0.004, 0.016),
      MAT.shutLine
    );
    m.position.set(side * (flankX(width, sculpt, yy, z) - 0.008), yy, z);
    g.add(m);
  }

  if (handleY !== null) {
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.2), MAT.chrome);
    handle.position.set(
      side * (flankX(width, sculpt, handleY, handleZ) + 0.012),
      handleY,
      handleZ
    );
    handle.castShadow = true;
    g.add(handle);
  }
  return g;
}

/* ------------------------------------------------------------------ */
/* Wheels                                                              */
/* ------------------------------------------------------------------ */

function tireGeometry(radius, width, { knobby = false, shoulder = 0.14 } = {}) {
  const hw = width / 2;
  const inner = radius * 0.63;
  // A rounded shoulder rather than a single chamfer: a tyre seen from the
  // front is the roundest thing on the car and the one most obviously wrong
  // when it is cut off square.
  const profile = [
    new THREE.Vector2(inner, -hw),
    new THREE.Vector2(radius * 0.9, -hw),
    new THREE.Vector2(radius * 0.965, -hw * 0.97),
    new THREE.Vector2(radius * 0.995, -hw * (1 - shoulder * 1.3)),
    new THREE.Vector2(radius, -hw * (1 - shoulder * 2)),
    new THREE.Vector2(radius, hw * (1 - shoulder * 2)),
    new THREE.Vector2(radius * 0.995, hw * (1 - shoulder * 1.3)),
    new THREE.Vector2(radius * 0.965, hw * 0.97),
    new THREE.Vector2(radius * 0.9, hw),
    new THREE.Vector2(inner, hw),
  ];
  const geo = new THREE.LatheGeometry(profile, 64);
  geo.rotateZ(Math.PI / 2); // spin axis along X

  if (!knobby) return geo;

  // Chunky mud-terrain tread: staggered blocks around the carcass.
  const parts = [geo];
  const blocks = 30;
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
  const barrel = new THREE.CylinderGeometry(radius, radius, width * 0.86, 48, 1, true);
  barrel.rotateZ(Math.PI / 2);
  parts.push(barrel);

  // Outer and inner lip, so the barrel has a rim rather than an edge.
  for (const [r, w, at] of [
    [radius * 1.02, width * 0.06, width * 0.45],
    [radius * 1.01, width * 0.05, -width * 0.42],
  ]) {
    const lip = new THREE.CylinderGeometry(r, r, w, 48);
    lip.rotateZ(Math.PI / 2);
    lip.translate(at, 0, 0);
    parts.push(lip);
  }

  const face = new THREE.CylinderGeometry(radius * 0.99, radius * 0.99, 0.05, 48);
  face.rotateZ(Math.PI / 2);
  face.translate(width * dish * 0.5, 0, 0);
  parts.push(face);

  const hub = new THREE.CylinderGeometry(radius * 0.3, radius * 0.34, width * 0.55, 24);
  hub.rotateZ(Math.PI / 2);
  parts.push(hub);
  const cap = new THREE.SphereGeometry(radius * 0.2, 16, 10);
  cap.scale(0.55, 1, 1);
  cap.translate(width * 0.42, 0, 0);
  parts.push(cap);

  // Wheel nuts on the face: a detail nobody looks at directly and everybody
  // notices the absence of.
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const nut = new THREE.CylinderGeometry(radius * 0.055, radius * 0.055, 0.05, 6);
    nut.rotateZ(Math.PI / 2);
    nut.translate(width * 0.44, Math.cos(a) * radius * 0.36, Math.sin(a) * radius * 0.36);
    parts.push(nut);
  }

  // Tapered spokes rather than flat bars, each with a web behind it.
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2;
    const s = new THREE.CylinderGeometry(radius * 0.09, radius * 0.15, radius * 0.94, 12);
    s.translate(0, radius * 0.48, 0);
    s.rotateX(a);
    s.translate(width * 0.22, 0, 0);
    parts.push(s);

    const web = new THREE.BoxGeometry(width * 0.16, radius * 0.9, radius * 0.09);
    web.translate(0, radius * 0.48, 0);
    web.rotateX(a);
    web.translate(width * 0.1, 0, 0);
    parts.push(web);
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

  // Vented disc: two faces with vanes between them, and a bell in the middle.
  const discParts = [];
  for (const at of [-0.025, 0.025]) {
    const face = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, 0.018, 40);
    face.rotateZ(Math.PI / 2);
    face.translate(at, 0, 0);
    discParts.push(face);
  }
  const bell = new THREE.CylinderGeometry(radius * 0.25, radius * 0.25, 0.1, 24);
  bell.rotateZ(Math.PI / 2);
  discParts.push(bell);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    const vane = new THREE.BoxGeometry(0.03, radius * 0.28, radius * 0.05);
    vane.translate(0, radius * 0.4, 0);
    vane.rotateX(a);
    discParts.push(vane);
  }
  const disc = new THREE.Mesh(mergeGeometries(discParts, false), MAT.darkMetal);
  group.add(disc);

  const caliperParts = [new THREE.BoxGeometry(width * 0.3, radius * 0.44, radius * 0.22)];
  // Pistons down the inside face and a bridge over the disc.
  for (const dy of [-radius * 0.12, radius * 0.12]) {
    const pin = new THREE.CylinderGeometry(radius * 0.06, radius * 0.06, width * 0.34, 12);
    pin.rotateZ(Math.PI / 2);
    pin.translate(0, dy, radius * 0.02);
    caliperParts.push(pin);
  }
  const bridge = new THREE.BoxGeometry(width * 0.36, radius * 0.1, radius * 0.3);
  bridge.translate(0, radius * 0.2, -radius * 0.02);
  caliperParts.push(bridge);
  const caliper = new THREE.Mesh(
    mergeGeometries(caliperParts, false),
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
  const geo = new THREE.CylinderGeometry(radius, radius, width, 40, 1, true, 0, Math.PI);
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
  const geo = new THREE.TorusGeometry(radius, thickness, 16, 48, Math.PI);
  geo.rotateY(Math.PI / 2);
  const m = new THREE.Mesh(geo, material);
  m.scale.x = width / (2 * thickness);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

/* ------------------------------------------------------------------ */
/* Motorcycle kit                                                      */
/* ------------------------------------------------------------------ */

/**
 * A real coil spring: a tube swept along a helix.
 *
 * The stand-in everywhere else was a painted cylinder, which is fine at
 * fifty metres and obviously a dowel at five. A spring is one of the few
 * shapes a viewer can name instantly, so it is worth the triangles.
 */
export function coilSpring(len, radius, coils, material, { wire = 0.014 } = {}) {
  const pts = [];
  const steps = Math.max(24, Math.round(coils * 16));
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = t * coils * Math.PI * 2;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, -len / 2 + len * t, Math.sin(a) * radius));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  const m = new THREE.Mesh(
    new THREE.TubeGeometry(curve, steps, wire, 8, false),
    material
  );
  m.castShadow = true;
  return m;
}

/**
 * An air-cooled barrel: the fins are the whole point, so they are separate
 * discs rather than a texture, and the head gets its bolts and a plug lead.
 */
export function finnedBarrel(x, y, z, {
  radius = 0.075,
  len = 0.22,
  fins = 8,
  finRadius = 0.115,
  material = MAT.darkMetal,
  tilt = 0,
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.z = Math.PI / 2; // barrel lies across the frame
  g.rotation.y = tilt;

  const barrel = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 1.06, len, 20),
    material
  );
  barrel.castShadow = true;
  g.add(barrel);

  for (let i = 0; i < fins; i++) {
    const t = fins === 1 ? 0.5 : i / (fins - 1);
    const r = finRadius * (0.86 + 0.14 * Math.sin(t * Math.PI));
    const fin = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.012, 24), material);
    fin.position.y = -len * 0.44 + len * 0.88 * t;
    g.add(fin);
  }

  // Head: a squarer casting on top, four bolts and the plug screwed in.
  const head = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 1.15, radius * 1.15, 0.07, 16),
    material
  );
  head.position.y = len * 0.55;
  g.add(head);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.014, 0.03, 6), MAT.chrome);
    bolt.position.set(Math.cos(a) * radius * 0.95, len * 0.6, Math.sin(a) * radius * 0.95);
    g.add(bolt);
  }
  const plug = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.02, 0.06, 10), MAT.chrome);
  plug.position.y = len * 0.64;
  g.add(plug);
  return compact(g);
}

/**
 * A floating front disc: drilled rotor, five-arm carrier, bobbins and the
 * caliper clamped over the top of it.
 *
 * The holes are dark inset pucks rather than real perforations — a boolean
 * per hole would cost more than the whole wheel, and at any viewing angle
 * you will ever get in this game they read the same.
 */
export function brakeDisc(x, y, z, {
  radius = 0.24,
  side = 1,
  holes = 20,
  caliper = true,
  carrierMaterial = MAT.darkMetal,
} = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.z = Math.PI / 2; // face the axle

  const inner = radius * 0.66;
  const rotor = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.012, 44, 1, false),
    MAT.chrome
  );
  g.add(rotor);
  // Machined swept band, so the rotor is not one flat coin.
  const band = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 0.84, 0.006, 8, 44),
    MAT.darkMetal
  );
  band.rotation.x = Math.PI / 2;
  g.add(band);

  for (let i = 0; i < holes; i++) {
    const a = (i / holes) * Math.PI * 2;
    const r = radius * 0.84;
    const hole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, 0.02, 8),
      MAT.matteBlack
    );
    hole.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    g.add(hole);
  }

  // Carrier: five arms out to the bobbins that let the rotor float.
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(inner * 0.5, inner * 0.5, 0.03, 18),
    carrierMaterial
  );
  g.add(hub);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(inner * 0.8, 0.014, 0.05), carrierMaterial);
    arm.position.set(Math.cos(a) * inner * 0.55, 0, Math.sin(a) * inner * 0.55);
    arm.rotation.y = -a;
    g.add(arm);
    const bobbin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.03, 8), MAT.chrome);
    bobbin.position.set(Math.cos(a) * inner, 0, Math.sin(a) * inner);
    g.add(bobbin);
  }

  if (caliper) {
    const c = new THREE.Group();
    c.rotation.z = -Math.PI / 2; // back into the bike's own axes
    const bodyM = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.15, 0.11), MAT.darkMetal);
    bodyM.position.set(side * 0.035, radius * 0.82, -0.02);
    c.add(bodyM);
    for (const dz of [-0.045, 0.045]) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.05, 10), MAT.chrome);
      pot.rotation.z = Math.PI / 2;
      pot.position.set(side * 0.055, radius * 0.82, dz - 0.02);
      c.add(pot);
    }
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.16, 6), MAT.matteBlack);
    hose.position.set(side * 0.035, radius * 0.95, -0.02);
    c.add(hose);
    g.add(c);
  }
  return compact(g);
}

/**
 * Sprockets and the chain between them, drawn as an actual loop: two
 * straight runs plus the wrap around each sprocket, with links you can
 * count and teeth on both ends.
 */
export function chainDrive(zFront, zRear, y, {
  side = -1,
  rFront = 0.07,
  rRear = 0.17,
  teethFront = 13,
  teethRear = 40,
} = {}) {
  const g = new THREE.Group();
  const sprocket = (z, r, teeth) => {
    const s = new THREE.Group();
    s.position.set(side * 0.11, y, z);
    s.rotation.z = Math.PI / 2;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.9, r * 0.9, 0.016, 30), MAT.darkMetal);
    s.add(plate);
    for (let i = 0; i < teeth; i++) {
      const a = (i / teeth) * Math.PI * 2;
      const t = new THREE.Mesh(new THREE.BoxGeometry(r * 0.13, 0.014, r * 0.1), MAT.darkMetal);
      t.position.set(Math.cos(a) * r * 0.95, 0, Math.sin(a) * r * 0.95);
      t.rotation.y = -a;
      s.add(t);
    }
    // Lightening holes, five of them, like every sprocket ever pressed.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, 0.024, 10), MAT.matteBlack);
      h.position.set(Math.cos(a) * r * 0.52, 0, Math.sin(a) * r * 0.52);
      s.add(h);
    }
    g.add(s);
    return s;
  };
  sprocket(zFront, rFront, teethFront);
  sprocket(zRear, rRear, teethRear);

  // The two runs. They are not parallel — the sprockets differ in radius —
  // so each run is aimed at its own tangent point.
  const span = zRear - zFront;
  for (const dir of [1, -1]) {
    const y0 = y + dir * rFront;
    const y1 = y + dir * rRear;
    const len = Math.hypot(span, y1 - y0);
    const links = Math.max(10, Math.round(len / 0.05));
    for (let i = 0; i < links; i++) {
      const t = (i + 0.5) / links;
      const link = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.026, 0.042),
        i % 2 ? MAT.darkMetal : MAT.chrome
      );
      link.position.set(side * 0.11, y0 + (y1 - y0) * t, zFront + span * t);
      link.rotation.x = -Math.atan2(y1 - y0, span);
      g.add(link);
    }
  }
  return compact(g);
}

/**
 * A radiator core: side tanks, a hose off each, and a stack of fins close
 * enough together to shimmer rather than resolve.
 */
export function radiator(x, y, z, { w = 0.34, h = 0.3, d = 0.05, fins = 18, tilt = 0.18 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.x = tilt;

  const core = new THREE.Mesh(new THREE.BoxGeometry(w, h, d * 0.5), MAT.matteBlack);
  g.add(core);
  // Vertical slats across the core, angled so the light catches every other
  // one and the stack shimmers instead of resolving into a grey panel.
  for (let i = 0; i < fins; i++) {
    const t = (i + 0.5) / fins;
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.008, h * 0.9, d * 0.8), MAT.darkMetal);
    fin.position.x = -w * 0.47 + w * 0.94 * t;
    fin.rotation.y = 0.42;
    g.add(fin);
  }
  for (const side of [-1, 1]) {
    const tank = new THREE.Mesh(new THREE.BoxGeometry(0.035, h * 1.04, d), MAT.darkMetal);
    tank.position.x = side * w * 0.5;
    g.add(tank);
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8), MAT.matteBlack);
    hose.position.set(side * w * 0.5, h * 0.5, d * 0.3);
    hose.rotation.x = 0.8;
    g.add(hose);
  }
  return compact(g);
}

/**
 * An instrument pod: shells, faces, needles and a bracket. Two dials for a
 * bike with a tacho, one for a bike that only admits to a speed.
 */
export function clocks(x, y, z, { dials = 2, radius = 0.055, tilt = 0.55, spread = 0.07 } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  g.rotation.x = tilt;
  for (let i = 0; i < dials; i++) {
    const off = dials === 1 ? 0 : (i - (dials - 1) / 2) * spread * 2;
    const shell = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 0.9, 0.055, 20),
      MAT.matteBlack
    );
    shell.rotation.x = Math.PI / 2;
    shell.position.set(off, 0, 0);
    g.add(shell);
    const face = new THREE.Mesh(
      new THREE.CylinderGeometry(radius * 0.86, radius * 0.86, 0.008, 20),
      MAT.white
    );
    face.rotation.x = Math.PI / 2;
    face.position.set(off, 0, -0.03);
    g.add(face);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.006, 8, 22), MAT.chrome);
    rim.position.set(off, 0, -0.028);
    g.add(rim);
    const needle = new THREE.Mesh(new THREE.BoxGeometry(0.005, radius * 0.7, 0.005), MAT.tail);
    needle.position.set(off - radius * 0.2, radius * 0.28, -0.036);
    needle.rotation.z = 0.7;
    g.add(needle);
  }
  const bracket = new THREE.Mesh(new THREE.BoxGeometry(spread * dials + 0.04, 0.02, 0.05), MAT.darkMetal);
  bracket.position.y = -radius - 0.01;
  g.add(bracket);
  return compact(g);
}

/**
 * Collapse a group of little meshes into one mesh per material.
 *
 * Detail is cheap in triangles and expensive in draw calls: a brake disc is
 * two thousand triangles and, drawn naively, forty separate submissions to
 * the GPU. Everything in the detail kit is rigid relative to the car, so it
 * can be baked into a handful of buffers once at build time and never
 * thought about again. Anything that has to move on its own — a wheel, a
 * steering group — is left alone by simply not being passed through here.
 */
export function compact(group) {
  group.updateMatrixWorld(true);
  const buckets = new Map();
  const keep = [];
  group.traverse((o) => {
    if (!o.isMesh || !o.geometry || !o.geometry.isBufferGeometry) return;
    if (o.geometry.index === null && !o.geometry.attributes.position) return;
    let bucket = buckets.get(o.material);
    if (!bucket) buckets.set(o.material, (bucket = []));
    bucket.push(o);
  });
  const out = new THREE.Group();
  out.position.copy(group.position);
  out.rotation.copy(group.rotation);
  out.scale.copy(group.scale);
  const inverse = new THREE.Matrix4().copy(group.matrixWorld).invert();

  for (const [material, meshes] of buckets) {
    const geos = [];
    for (const m of meshes) {
      const g = m.geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, m.matrixWorld));
      // Merging needs every buffer to carry the same attributes.
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
      if (g.index === null) geos.push(g.toNonIndexed());
      else geos.push(g.toNonIndexed());
    }
    const merged = geos.length === 1 ? geos[0] : mergeGeometries(geos, false);
    if (!merged) {
      // Nothing sane to merge; fall back to the loose meshes rather than
      // silently dropping the part.
      for (const m of meshes) keep.push(m);
      continue;
    }
    const mesh = new THREE.Mesh(merged, material);
    mesh.castShadow = meshes.some((m) => m.castShadow);
    mesh.receiveShadow = meshes.some((m) => m.receiveShadow);
    out.add(mesh);
  }
  for (const m of keep) out.add(m);
  return out;
}

/**
 * A round rally spot: chrome bowl, bulb, rim and a clear lens.
 *
 * The old version was a white cylinder, which from the front is a flat disc
 * of pure white — a hole punched in the bodywork. What makes a driving lamp
 * legible is the ring and the dish behind the glass, so those are built.
 */
export function spotLamp(x, y, z, { radius = 0.17, depth = 0.11, ring = MAT.chrome } = {}) {
  const g = new THREE.Group();
  g.position.set(x, y, z);

  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    ring
  );
  bowl.rotation.x = Math.PI / 2;
  bowl.scale.z = 0.75;
  bowl.position.z = depth * 0.4;
  g.add(bowl);

  const bulb = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.32, 12, 10), MAT.headlight);
  bulb.position.z = depth * 0.12;
  g.add(bulb);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.96, radius * 0.1, 8, 26), ring);
  g.add(rim);

  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.9, radius * 0.9, depth * 0.12, 22),
    MAT.lens
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.z = -depth * 0.06;
  g.add(lens);

  // Bracket back into the bar it hangs off.
  const stem = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.13, radius * 0.13, depth * 1.1, 8),
    MAT.darkMetal
  );
  stem.rotation.x = Math.PI / 2;
  stem.position.z = depth * 0.75;
  g.add(stem);
  return compact(g);
}
