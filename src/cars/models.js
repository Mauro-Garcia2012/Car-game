/**
 * The three playable cars. Each builder returns a group whose origin is on the
 * ground between the wheels, facing -Z, plus the wheel handles the game needs
 * for steering and rolling.
 *
 * Bodies are extruded side profiles squeezed laterally by a `bodySculpt()`
 * function, which is what gives them a tapered nose, a pinched tail and some
 * tumblehome instead of looking like slabs.
 */
import * as THREE from 'three';
import {
  MAT,
  paint,
  part,
  slab,
  profilePiece,
  bodySculpt,
  makeWheel,
  wheelWell,
  fenderArch,
  wingMirror,
  exhaustTip,
  doorFurniture,
  flankX,
} from './parts.js';
import { signTexture } from '../textures.js';

function mountWheels(car, layout) {
  car.userData.wheels = [];
  for (const w of layout) {
    const root = new THREE.Group();
    root.position.set(w.x, w.radius, w.z);
    const spin = makeWheel(w);
    root.add(spin);
    car.add(root);
    car.userData.wheels.push({ root, spin, front: w.front, radius: w.radius });
  }
}

/** Arch + dark inner well around each wheel of a layout. */
function dressArches(car, layout, material, { grow = 0.07, thickness = 0.07 } = {}) {
  for (const w of layout) {
    car.add(wheelWell(w.radius + grow * 0.5, w.width + 0.06, w.x, w.radius, w.z));
    car.add(
      fenderArch(
        w.radius + grow,
        w.width + 0.14,
        w.x,
        w.radius,
        w.z,
        material,
        thickness
      )
    );
  }
}

/* ------------------------------------------------------------------ */
/* Sport car — mid-engine road supercar                                */
/* ------------------------------------------------------------------ */

export function buildSportCar(color = '#d81f2a') {
  const car = new THREE.Group();
  const body = paint(color);
  const trim = MAT.carbon;
  const sculpt = bodySculpt({
    halfLength: 2.25,
    ends: 0.26,
    endStart: 0.5,
    top: 0.14,
    beltline: 0.95,
    roofY: 1.36,
    bottom: 0.12,
    floorY: 0.3,
  });
  const opt = { sculpt };

  // Low wedge: dropped nose, fastback deck, tail cut off short.
  const lower = [
    [-2.15, 0.4],
    [-2.22, 0.74],
    [-1.95, 0.9],
    [-1.1, 0.96],
    [0.6, 0.94],
    [1.45, 0.8],
    [2.0, 0.66],
    [2.26, 0.5],
    [2.22, 0.32],
    [2.0, 0.2],
    [1.2, 0.17],
    [-1.2, 0.17],
    [-2.0, 0.26],
  ];
  car.add(profilePiece(lower, 1.94, body, { ...opt, bevel: 0.08 }));

  // Greenhouse: tinted glass with a painted roof skin and pillars on top.
  const cabin = [
    [-1.55, 0.95],
    [-0.78, 1.28],
    [0.16, 1.3],
    [0.95, 0.93],
  ];
  car.add(profilePiece(cabin, 1.72, MAT.glass, { ...opt, bevel: 0.02 }));
  car.add(
    profilePiece(
      [
        [-0.82, 1.22],
        [-0.76, 1.34],
        [0.2, 1.36],
        [0.28, 1.24],
      ],
      1.76,
      body,
      { ...opt, bevel: 0.03 }
    )
  );
  for (const lat of [-0.8, 0.8]) {
    car.add(
      profilePiece(
        [
          [0.95, 0.93],
          [0.8, 0.95],
          [0.12, 1.36],
          [0.26, 1.36],
        ],
        0.1,
        body,
        { ...opt, lateral: lat, bevel: 0.015 }
      )
    );
    car.add(
      profilePiece(
        [
          [-1.55, 0.95],
          [-1.3, 0.97],
          [-0.72, 1.36],
          [-0.9, 1.36],
        ],
        0.12,
        body,
        { ...opt, lateral: lat, bevel: 0.015 }
      )
    );
  }

  // Engine bay louvres behind the cabin.
  car.add(part(1.1, 0.05, 0.5, MAT.matteBlack, 0, 0.94, 1.62));
  for (let i = 0; i < 4; i++) {
    car.add(part(1.06, 0.05, 0.06, trim, 0, 0.98, 1.44 + i * 0.13, [0.3, 0, 0]));
  }

  // Side intakes feeding the mid-mounted engine.
  for (const side of [-1, 1]) {
    car.add(part(0.1, 0.28, 0.8, MAT.matteBlack, side * 0.9, 0.62, 0.8));
    car.add(slab(0.16, 0.13, 2.0, trim, side * 0.88, 0.23, 0.2));
    car.add(part(0.07, 0.05, 0.16, trim, side * 0.88, 0.94, -0.6));
    car.add(
      part(0.1, 0.12, 0.26, body, side * 1.0, 0.97, -0.72, [0, side * 0.22, 0])
    );
  }

  // Nose: splitter, grille, intakes and slim LED headlights. Everything
  // here sits proud of the bodywork — the sculpted nose is a smooth dome,
  // and anything flush with it simply disappears into the paint.
  car.add(slab(1.76, 0.07, 0.52, trim, 0, 0.18, -2.1));
  car.add(part(0.98, 0.17, 0.1, MAT.matteBlack, 0, 0.37, -2.21));
  for (let i = 0; i < 4; i++) {
    car.add(part(0.9, 0.022, 0.06, MAT.chrome, 0, 0.315 + i * 0.038, -2.265));
  }
  for (const side of [-1, 1]) {
    car.add(part(0.36, 0.13, 0.12, MAT.matteBlack, side * 0.56, 0.3, -2.14));
    // Lamp unit: a dark socket with the lens standing out of it.
    car.add(part(0.5, 0.14, 0.1, MAT.matteBlack, side * 0.46, 0.6, -2.13, [0.35, 0, 0]));
    car.add(
      part(0.46, 0.09, 0.1, MAT.headlight, side * 0.46, 0.605, -2.17, [0.35, 0, 0])
    );
    car.add(part(0.13, 0.05, 0.07, MAT.amber, side * 0.73, 0.52, -2.06));
    // Bonnet vent and its shut line.
    car.add(part(0.4, 0.03, 0.24, MAT.matteBlack, side * 0.4, 0.79, -1.35));
    car.add(part(0.022, 0.03, 1.0, MAT.shutLine, side * 0.66, 0.9, -1.5));
  }
  car.add(part(1.34, 0.022, 0.03, MAT.shutLine, 0, 0.9, -2.0));

  // Tail: light bar, ducktail, diffuser and quad pipes.
  car.add(part(1.34, 0.1, 0.07, MAT.tail, 0, 0.7, 2.19));
  car.add(part(1.1, 0.045, 0.05, MAT.tail, 0, 0.55, 2.2));
  car.add(
    profilePiece(
      [
        [-1.95, 0.9],
        [-2.16, 0.93],
        [-2.2, 1.0],
        [-1.9, 0.96],
      ],
      1.62,
      body,
      { ...opt, bevel: 0.025 }
    )
  );
  car.add(slab(1.38, 0.22, 0.3, MAT.matteBlack, 0, 0.28, 2.06));
  for (let i = -2; i <= 2; i++) {
    car.add(part(0.05, 0.2, 0.28, trim, i * 0.26, 0.28, 2.08));
  }
  for (const x of [-0.34, -0.14, 0.14, 0.34]) {
    car.add(exhaustTip(x, 0.44, 2.14, 0.062, 0.17));
  }

  // Doors and mirrors, hung off the real surface of the flank.
  for (const side of [-1, 1]) {
    car.add(
      doorFurniture(side, 0.66, {
        top: 0.97, bottom: 0.3, width: 1.94, sculpt,
        handleY: 0.84, handleZ: 0.2,
      })
    );
    car.add(
      wingMirror(side, side * flankX(1.94, sculpt, 0.99, -0.9), 0.99, -0.9, body, {
        scale: 1.05,
      })
    );
  }

  // Cockpit hint behind the glass.
  car.add(part(1.2, 0.12, 0.9, MAT.interior, 0, 0.9, -0.3));
  for (const side of [-1, 1]) {
    car.add(part(0.36, 0.36, 0.14, MAT.interior, side * 0.3, 1.04, 0.3));
  }

  const wheels = [
    { x: -0.86, z: -1.34, radius: 0.35, width: 0.28, spokes: 5, front: true, rimMaterial: MAT.darkMetal },
    { x: 0.86, z: -1.34, radius: 0.35, width: 0.28, spokes: 5, front: true, rimMaterial: MAT.darkMetal },
    { x: -0.9, z: 1.36, radius: 0.375, width: 0.34, spokes: 5, front: false, rimMaterial: MAT.darkMetal },
    { x: 0.9, z: 1.36, radius: 0.375, width: 0.34, spokes: 5, front: false, rimMaterial: MAT.darkMetal },
  ];
  mountWheels(car, wheels);
  dressArches(car, wheels, body, { grow: 0.07, thickness: 0.075 });
  return car;
}

/* ------------------------------------------------------------------ */
/* Land yacht — the reward for a hundred kilometres                    */
/* ------------------------------------------------------------------ */

/**
 * A 1970s American personal luxury coupé: five and a half metres of it, a
 * formal roofline under a vinyl top, opera windows, and bumpers you could
 * park a caravan against. It is the only thing in the garage that is *safer*
 * than standard, because it is two tonnes of Detroit steel.
 */
export function buildLandYacht(color = '#5d2733') {
  const car = new THREE.Group();
  const body = paint(color, { metalness: 0.35, roughness: 0.3 });
  const vinyl = paint('#221f22', { metalness: 0.02, roughness: 0.95 });
  const sculpt = bodySculpt({
    halfLength: 2.85,
    ends: 0.14, // barely tapered: this thing is a shoebox and proud of it
    endStart: 0.72,
    top: 0.1,
    beltline: 1.12,
    roofY: 1.62,
    bottom: 0.08,
    floorY: 0.34,
  });
  const opt = { sculpt };

  // Long flat flanks with a knife-edge crease along the top of the wing.
  const lower = [
    [-2.78, 0.5],
    [-2.82, 0.98],
    [-2.5, 1.12],
    [-1.2, 1.14],
    [1.1, 1.14],
    [2.45, 1.1],
    [2.8, 0.96],
    [2.82, 0.46],
    [2.6, 0.3],
    [1.4, 0.26],
    [-1.4, 0.26],
    [-2.6, 0.32],
  ];
  car.add(profilePiece(lower, 2.06, body, { ...opt, bevel: 0.07 }));

  // Formal greenhouse: upright screen, thick C-pillar, small opera window.
  const cabin = [
    [-1.05, 1.14],
    [-0.62, 1.6],
    [0.72, 1.62],
    [1.16, 1.15],
  ];
  car.add(profilePiece(cabin, 1.78, MAT.glass, { ...opt, bevel: 0.02 }));
  car.add(
    profilePiece(
      [
        [-0.5, 1.52],
        [-0.34, 1.66],
        [1.0, 1.66],
        [1.24, 1.16],
        [0.86, 1.18],
        [0.72, 1.56],
      ],
      1.82,
      vinyl,
      { ...opt, bevel: 0.03 }
    )
  );
  for (const side of [-1, 1]) {
    // Opera window in the vinyl, and the chrome that frames it.
    car.add(part(0.05, 0.26, 0.3, MAT.matteBlack, side * 0.9, 1.4, 0.86));
    car.add(part(0.03, 0.3, 0.34, MAT.chrome, side * 0.92, 1.4, 0.86));
    // Full-length chrome rub strip.
    car.add(part(0.04, 0.07, 4.1, MAT.chrome, side * flankX(2.06, sculpt, 0.62, 0), 0.62, 0));
  }

  // Nose: stacked lamps behind a huge eggcrate grille, big chrome bumper.
  car.add(slab(2.0, 0.34, 0.34, MAT.chrome, 0, 0.56, -2.86, [0, 0, 0], 0.08));
  car.add(part(1.9, 0.46, 0.14, MAT.matteBlack, 0, 0.94, -2.82));
  for (let i = -6; i <= 6; i++) {
    car.add(part(0.035, 0.42, 0.06, MAT.chrome, i * 0.14, 0.94, -2.87));
  }
  for (let i = 0; i < 3; i++) {
    car.add(part(1.86, 0.03, 0.06, MAT.chrome, 0, 0.78 + i * 0.16, -2.87));
  }
  for (const side of [-1, 1]) {
    for (const dy of [-0.13, 0.13]) {
      car.add(part(0.3, 0.22, 0.1, MAT.chrome, side * 0.72, 1.02 + dy, -2.83));
      car.add(part(0.24, 0.17, 0.06, MAT.headlight, side * 0.72, 1.02 + dy, -2.87));
    }
    car.add(part(0.26, 0.1, 0.06, MAT.amber, side * 0.72, 0.76, -2.86));
    car.add(wingMirror(side, side * flankX(2.06, sculpt, 1.16, -1.05), 1.16, -1.05, MAT.chrome, { scale: 1.1 }));
    car.add(
      doorFurniture(side, 0.72, {
        top: 1.12, bottom: 0.3, width: 2.06, sculpt,
        handleY: 0.98, handleZ: 0.28,
      })
    );
  }
  // Hood ornament.
  car.add(part(0.06, 0.14, 0.06, MAT.chrome, 0, 1.2, -2.62));

  // Tail: full-width lamp panel and another slab of bumper.
  car.add(slab(2.0, 0.34, 0.34, MAT.chrome, 0, 0.56, 2.86, [0, 0, 0], 0.08));
  car.add(part(1.84, 0.26, 0.08, MAT.tail, 0, 0.94, 2.85));
  for (let i = -3; i <= 3; i++) {
    car.add(part(0.05, 0.28, 0.05, MAT.chrome, i * 0.28, 0.94, 2.89));
  }
  car.add(part(0.5, 0.2, 0.03, MAT.plate, 0, 0.62, 2.9)); // plate
  for (const x of [-0.5, 0.5]) car.add(exhaustTip(x, 0.4, 2.82, 0.055, 0.16));

  const wheels = [
    { x: -0.92, z: -1.86, radius: 0.4, width: 0.24, spokes: 8, front: true, rimMaterial: MAT.chrome },
    { x: 0.92, z: -1.86, radius: 0.4, width: 0.24, spokes: 8, front: true, rimMaterial: MAT.chrome },
    { x: -0.92, z: 1.82, radius: 0.4, width: 0.26, spokes: 8, front: false, rimMaterial: MAT.chrome },
    { x: 0.92, z: 1.82, radius: 0.4, width: 0.26, spokes: 8, front: false, rimMaterial: MAT.chrome },
  ];
  mountWheels(car, wheels);
  dressArches(car, wheels, body, { grow: 0.05, thickness: 0.05 });
  return car;
}

/* ------------------------------------------------------------------ */
/* Trophy truck — the reward for five hundred                          */
/* ------------------------------------------------------------------ */

/**
 * A desert racing truck: tube frame, a foot of suspension travel at each
 * corner and a light bar you could land a plane by.
 *
 * It is the only thing here that is genuinely fast off the tarmac, which
 * means it is the only one that can treat the road as optional and cut the
 * corners the highway takes.
 */
export function buildTrophyTruck(color = '#d9d2c4') {
  const car = new THREE.Group();
  const body = paint(color, { metalness: 0.15, roughness: 0.55 });
  const cage = MAT.matteBlack;
  const sculpt = bodySculpt({
    halfLength: 2.7,
    ends: 0.3,
    endStart: 0.5,
    top: 0.2,
    beltline: 1.5,
    roofY: 2.15,
    bottom: 0.24,
    floorY: 0.9,
  });
  const opt = { sculpt };

  const tube = (r, len, mat, x, y, z, rot = [0, 0, 0], seg = 8) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.position.set(x, y, z);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    return m;
  };

  // Slab-sided body pod, high off the ground with a chopped nose.
  const lower = [
    [-2.55, 1.0],
    [-2.6, 1.42],
    [-1.75, 1.56],
    [-0.9, 1.58],
    [1.35, 1.5],
    [2.2, 1.34],
    [2.5, 1.16],
    [2.45, 0.86],
    [1.2, 0.8],
    [-1.4, 0.8],
    [-2.3, 0.86],
  ];
  car.add(profilePiece(lower, 2.16, body, { ...opt, bevel: 0.06 }));

  // Cab: a low glasshouse set well back, the way a trophy truck sits.
  const cabin = [
    [-0.85, 1.56],
    [-0.5, 2.1],
    [0.62, 2.12],
    [1.0, 1.52],
  ];
  car.add(profilePiece(cabin, 1.7, MAT.glass, { ...opt, bevel: 0.02 }));
  car.add(
    profilePiece(
      [
        [-0.45, 2.02],
        [-0.3, 2.16],
        [0.7, 2.16],
        [0.9, 1.96],
      ],
      1.74,
      body,
      { ...opt, bevel: 0.03 }
    )
  );

  // Exo-cage over the cab and back down to the bed.
  for (const side of [-1, 1]) {
    car.add(tube(0.045, 1.5, cage, side * 0.86, 1.9, -0.5, [0.55, 0, 0]));
    car.add(tube(0.045, 1.35, cage, side * 0.86, 1.85, 1.1, [-0.7, 0, 0]));
    car.add(tube(0.04, 1.7, cage, side * 0.86, 2.24, 0.28, [Math.PI / 2, 0, 0]));
    car.add(tube(0.038, 1.3, cage, side * 0.86, 1.4, 1.85, [0.4, 0, 0]));
  }
  car.add(tube(0.04, 1.72, cage, 0, 2.32, -0.44, [0, 0, Math.PI / 2]));
  car.add(tube(0.04, 1.72, cage, 0, 2.3, 0.95, [0, 0, Math.PI / 2]));

  // Light bar across the cage.
  car.add(part(1.66, 0.16, 0.16, cage, 0, 2.44, -0.52));
  for (let i = -3; i <= 3; i++) {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.085, 0.085, 0.06, 14),
      MAT.headlight
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(i * 0.23, 2.44, -0.6);
    car.add(lamp);
  }

  // Nose: skid plate, mesh and a pair of lamps low down.
  car.add(slab(1.9, 0.16, 0.5, cage, 0, 0.82, -2.5, [0, 0, 0], 0.05));
  car.add(part(1.5, 0.5, 0.1, cage, 0, 1.24, -2.62));
  for (let i = -4; i <= 4; i++) {
    car.add(part(0.04, 0.46, 0.05, MAT.darkMetal, i * 0.16, 1.24, -2.66));
  }
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.1, 16),
      MAT.headlight
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(side * 0.62, 1.24, -2.66);
    car.add(lamp);
    car.add(part(0.2, 0.09, 0.06, MAT.amber, side * 0.62, 1.02, -2.62));
    // Mudflap behind each wheel.
    car.add(part(0.36, 0.5, 0.03, cage, side * 0.98, 0.55, 2.5));
    car.add(wingMirror(side, side * flankX(2.16, sculpt, 1.62, -0.9), 1.62, -0.9, cage, { scale: 1.3 }));
  }

  // Bed: spare wheel flat, fuel cell and a whip aerial.
  car.add(part(1.7, 0.1, 1.5, cage, 0, 1.5, 1.75));
  car.add(part(1.0, 0.42, 0.9, MAT.darkMetal, 0, 1.76, 1.4));
  const spare = new THREE.Mesh(
    new THREE.CylinderGeometry(0.44, 0.44, 0.3, 20),
    MAT.rubber
  );
  spare.rotation.x = Math.PI / 2;
  spare.position.set(0, 1.72, 2.15);
  car.add(spare);
  car.add(tube(0.014, 1.8, cage, 0.86, 2.5, 2.2, [0.08, 0, 0], 6));
  car.add(part(1.7, 0.24, 0.1, MAT.tail, 0, 1.32, 2.52));

  const wheels = [
    { x: -1.06, z: -1.72, radius: 0.6, width: 0.44, spokes: 6, front: true, knobby: true, rimMaterial: MAT.darkMetal },
    { x: 1.06, z: -1.72, radius: 0.6, width: 0.44, spokes: 6, front: true, knobby: true, rimMaterial: MAT.darkMetal },
    { x: -1.06, z: 1.78, radius: 0.6, width: 0.48, spokes: 6, front: false, knobby: true, rimMaterial: MAT.darkMetal },
    { x: 1.06, z: 1.78, radius: 0.6, width: 0.48, spokes: 6, front: false, knobby: true, rimMaterial: MAT.darkMetal },
  ];
  mountWheels(car, wheels);
  // Long-travel A-arms, visible because nothing covers them.
  for (const w of wheels) {
    const inner = Math.sign(w.x) * 0.4;
    for (const dy of [-0.16, 0.2]) {
      const arm = tube(0.05, Math.abs(w.x - inner), cage, (w.x + inner) / 2, w.radius + dy, w.z, [0, 0, Math.PI / 2]);
      car.add(arm);
    }
    car.add(tube(0.055, 0.8, MAT.chrome, w.x * 0.72, w.radius + 0.5, w.z, [0, 0, Math.sign(w.x) * 0.42]));
  }
  return car;
}

/* ------------------------------------------------------------------ */
/* Superbike — the reward for a thousand                               */
/* ------------------------------------------------------------------ */

/**
 * A litre bike, and the only thing in the garage that is fast *and* frugal:
 * three hundred an hour out of a seventeen-litre tank, because a fairing
 * that size pushing that little air barely has to try.
 *
 * Same construction as the moped — fork, bars and lamps parented to the
 * front hub so they steer together — with the rider folded down over the
 * tank instead of sitting up in the breeze.
 */
export function buildSuperbike(color = '#101418') {
  const car = new THREE.Group();
  const body = paint(color, { metalness: 0.5, roughness: 0.22 });
  const gold = paint('#c9a227', { metalness: 0.75, roughness: 0.28 });
  const leather = paint('#1b1d24', { metalness: 0.1, roughness: 0.6 });
  const black = MAT.matteBlack;

  const tube = (r, len, mat, x, y, z, rot = [0, 0, 0], seg = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.position.set(x, y, z);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    return m;
  };
  /** A limb from A to B, so the rider's joints actually meet. */
  const bone = (from, to, r, mat) => {
    const dir = to.clone().sub(from);
    const m = tube(r, dir.length(), mat, 0, 0, 0, [0, 0, 0], 8);
    m.position.copy(from).add(to).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return m;
  };

  const FRONT_Z = -0.8;
  const REAR_Z = 0.74;
  const RADIUS = 0.34;
  const GRIP_X = 0.3;
  const BAR_Y = 0.38; // clip-ons, low on the fork, measured from the hub
  const BAR_Z = 0.2;
  const barWorld = (side) =>
    new THREE.Vector3(side * GRIP_X, RADIUS + BAR_Y, FRONT_Z + BAR_Z);

  // ---- frame and engine --------------------------------------------------
  car.add(slab(0.34, 0.34, 0.56, MAT.darkMetal, 0, 0.46, 0.0, [0, 0, 0], 0.06));
  for (let i = 0; i < 4; i++) {
    car.add(tube(0.028, 0.46, MAT.chrome, -0.15 + i * 0.1, 0.4, -0.34, [0.95, 0, 0], 6));
  }
  for (const side of [-1, 1]) {
    // Twin spars sweeping from the head back to the swingarm pivot.
    car.add(
      profilePiece(
        [
          [-0.6, 0.62],
          [-0.52, 0.82],
          [0.22, 0.74],
          [0.26, 0.56],
        ],
        0.09,
        gold,
        { lateral: side * 0.2, bevel: 0.02 }
      )
    );
    car.add(tube(0.042, 0.78, gold, side * 0.15, 0.42, 0.4, [1.36, 0, 0], 8));
    car.add(part(0.06, 0.13, 0.1, black, side * 0.21, 0.44, 0.2));
    car.add(tube(0.02, 0.12, MAT.chrome, side * 0.28, 0.42, 0.2, [0, 0, Math.PI / 2], 6));
  }
  // Shock, header and can.
  car.add(tube(0.04, 0.32, gold, 0, 0.62, 0.3, [0.3, 0, 0], 8));
  car.add(tube(0.055, 0.62, MAT.chrome, 0.09, 0.32, 0.36, [1.3, 0.22, 0], 10));
  car.add(slab(0.16, 0.16, 0.36, MAT.darkMetal, 0.17, 0.5, 0.8, [0, 0.16, 0], 0.06));
  car.add(exhaustTip(0.17, 0.5, 1.0, 0.07, 0.2));

  // ---- bodywork: nose fairing, tank, tail, all clear of each other -------
  car.add(
    profilePiece(
      [
        [-1.06, 0.5],
        [-1.1, 0.8],
        [-0.98, 1.0],
        [-0.74, 1.06],
        [-0.6, 0.86],
        [-0.56, 0.52],
        [-0.8, 0.42],
      ],
      0.42,
      body,
      { bevel: 0.035 }
    )
  );
  // Side panels hugging the engine.
  for (const side of [-1, 1]) {
    car.add(
      profilePiece(
        [
          [-0.95, 0.44],
          [-0.86, 0.72],
          [-0.34, 0.66],
          [-0.18, 0.36],
          [-0.6, 0.3],
        ],
        0.07,
        body,
        { lateral: side * 0.2, bevel: 0.02 }
      )
    );
  }
  car.add(slab(0.26, 0.18, 0.05, MAT.glass, 0, 1.06, -0.9, [0.72, 0, 0], 0.04));
  // Tank, saddle, tail.
  car.add(
    profilePiece(
      [
        [-0.58, 0.78],
        [-0.44, 0.94],
        [-0.02, 0.96],
        [0.14, 0.86],
        [0.12, 0.72],
        [-0.5, 0.68],
      ],
      0.38,
      body,
      { bevel: 0.05 }
    )
  );
  car.add(slab(0.24, 0.07, 0.36, leather, 0, 0.9, 0.3, [0, 0, 0], 0.04));
  car.add(
    profilePiece(
      [
        [0.5, 0.84],
        [0.62, 0.98],
        [0.98, 0.96],
        [0.96, 0.86],
        [0.62, 0.78],
      ],
      0.19,
      body,
      { bevel: 0.035 }
    )
  );
  car.add(part(0.15, 0.06, 0.05, MAT.tail, 0, 0.98, 1.02));
  car.add(part(0.2, 0.13, 0.02, MAT.plate, 0, 0.7, 1.02));
  car.add(fenderArch(RADIUS + 0.1, 0.3, 0, RADIUS, REAR_Z, black, 0.04));

  // ---- rider, folded over the tank ---------------------------------------
  const hip = new THREE.Vector3(0, 0.96, 0.32);
  const neck = new THREE.Vector3(0, 1.18, -0.22);
  car.add(bone(hip, neck, 0.15, leather));
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.135, 18, 14), body);
  helmet.position.set(0, 1.24, -0.36);
  helmet.castShadow = true;
  car.add(helmet);
  car.add(part(0.19, 0.085, 0.06, MAT.glass, 0, 1.22, -0.47));
  car.add(slab(0.3, 0.13, 0.16, gold, 0, 1.2, -0.16, [0.9, 0, 0], 0.06)); // hump
  for (const side of [-1, 1]) {
    const grip = barWorld(side);
    const shoulder = new THREE.Vector3(side * 0.17, 1.16, -0.18);
    const elbow = shoulder
      .clone()
      .lerp(grip, 0.5)
      .add(new THREE.Vector3(side * 0.07, 0.03, 0.03));
    car.add(bone(shoulder, elbow, 0.05, leather));
    car.add(bone(elbow, grip, 0.042, leather));
    car.add(part(0.07, 0.07, 0.09, black, grip.x, grip.y, grip.z));
    // Knee up against the tank, boot back on the peg.
    const knee = new THREE.Vector3(side * 0.22, 0.82, -0.04);
    const foot = new THREE.Vector3(side * 0.26, 0.46, 0.24);
    car.add(bone(new THREE.Vector3(side * 0.13, 0.94, 0.34), knee, 0.085, leather));
    car.add(bone(knee, foot, 0.062, leather));
    car.add(part(0.1, 0.08, 0.2, black, foot.x, foot.y - 0.03, foot.z));
  }

  // ---- wheels --------------------------------------------------------------
  const wheels = [
    { x: 0, z: FRONT_Z, radius: RADIUS, width: 0.13, spokes: 5, front: true, rimMaterial: gold },
    { x: 0, z: REAR_Z, radius: RADIUS, width: 0.24, spokes: 5, front: false, rimMaterial: gold },
  ];
  mountWheels(car, wheels);

  // ---- steering, hung off the front hub -----------------------------------
  const front = car.userData.wheels.find((w) => w.front).root;
  const steer = new THREE.Group();
  front.add(steer);
  const RAKE = 0.42;
  for (const side of [-1, 1]) {
    // Upside-down fork: black slider low, gold stanchion above it.
    steer.add(tube(0.046, 0.34, black, side * 0.1, 0.13, 0.06, [RAKE, 0, 0], 10));
    steer.add(tube(0.034, 0.4, gold, side * 0.1, 0.44, 0.2, [RAKE, 0, 0], 10));
    steer.add(tube(0.026, 0.15, black, side * GRIP_X, BAR_Y, BAR_Z, [0, 0, Math.PI / 2 - 0.12], 8));
    steer.add(part(0.11, 0.02, 0.03, MAT.chrome, side * 0.22, BAR_Y - 0.03, BAR_Z - 0.09));
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.24, 0.012, 22),
      MAT.chrome
    );
    disc.rotation.z = Math.PI / 2;
    disc.position.set(side * 0.08, 0, 0);
    steer.add(disc);
    steer.add(part(0.06, 0.14, 0.1, black, side * 0.11, 0.2, -0.05)); // caliper
  }
  steer.add(tube(0.038, 0.2, black, 0, 0.62, 0.28, [RAKE, 0, 0], 10));
  for (const side of [-1, 1]) {
    steer.add(wingMirror(side, side * 0.19, 0.6, -0.14, body, { scale: 0.72 }));
  }
  // Twin projectors stacked in the nose of the fairing.
  for (const dy of [0, 0.12]) {
    const lens = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.058, 0.03, 16),
      MAT.headlight
    );
    lens.rotation.x = Math.PI / 2;
    lens.position.set(0, 0.4 + dy, -0.28);
    steer.add(lens);
  }
  steer.add(fenderArch(RADIUS + 0.06, 0.2, 0, 0, 0, body, 0.035));

  return car;
}

/* ------------------------------------------------------------------ */
/* Moped — the 49cc option                                             */
/* ------------------------------------------------------------------ */

/**
 * A Spanish-style step-through moped, pedals and all.
 *
 * Named around the real thing rather than after it: the machine everybody
 * pictures here is a trademark, and the rest of the garage is invented
 * names too.
 *
 * The fork, bars, lamp and front mudguard are parented to the front wheel's
 * hub so they steer with it — on two wheels a front tyre that turns while
 * the handlebars stay put is the first thing you notice.
 */
export function buildMoped(color = '#2e6f4e') {
  const car = new THREE.Group();
  const body = paint(color, { metalness: 0.4, roughness: 0.35 });
  const black = MAT.matteBlack;

  const tube = (r, len, mat, x, y, z, rot = [0, 0, 0], seg = 10) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, seg), mat);
    m.position.set(x, y, z);
    m.rotation.set(rot[0], rot[1], rot[2]);
    m.castShadow = true;
    return m;
  };

  const FRONT_Z = -0.62;
  const REAR_Z = 0.58;
  const RADIUS = 0.33;
  const GRIP_X = 0.25; // where the hands go, and so where the arms aim
  const BAR_Y = 0.66; // both measured inside the steering group, which
  const BAR_Z = 0.18; // hangs off the front hub, not the middle of the bike

  // ---- frame ------------------------------------------------------------
  // Step-through: the spine drops from the head to the floor, runs flat
  // under the rider's feet and climbs again to the saddle.
  car.add(tube(0.045, 0.86, MAT.chrome, 0, 0.66, -0.46, [0.72, 0, 0]));  // down tube
  car.add(tube(0.05, 0.62, MAT.chrome, 0, 0.34, 0.06, [Math.PI / 2, 0, 0])); // spine
  car.add(tube(0.045, 0.5, MAT.chrome, 0, 0.55, 0.36, [-0.75, 0, 0]));   // seat tube
  for (const side of [-1, 1]) {
    // Footboard and its rail.
    car.add(part(0.16, 0.05, 0.56, black, side * 0.16, 0.3, 0.02));
    car.add(tube(0.02, 0.52, MAT.chrome, side * 0.24, 0.31, 0.02, [Math.PI / 2, 0, 0], 8));
    // Rear swing arm.
    car.add(tube(0.028, 0.5, black, side * 0.1, 0.4, 0.36, [1.05, 0, 0], 8));
    // Shock absorber.
    car.add(tube(0.032, 0.34, MAT.chrome, side * 0.11, 0.52, 0.5, [0.35, 0, 0], 8));
  }

  // Leg shield and the little front panel behind it.
  car.add(
    profilePiece(
      [
        [-0.5, 0.36],
        [-0.6, 0.72],
        [-0.56, 1.0],
        [-0.42, 1.0],
        [-0.44, 0.7],
        [-0.36, 0.38],
      ],
      0.46,
      body,
      { bevel: 0.03 }
    )
  );

  // Engine, cylinder head and the crankcase behind the pedals.
  car.add(slab(0.26, 0.24, 0.34, black, 0.08, 0.34, 0.28, [0, 0, 0], 0.05));
  const barrel = tube(0.075, 0.2, MAT.darkMetal, 0, 0.44, 0.16, [0, 0, Math.PI / 2], 12);
  car.add(barrel);
  for (let i = 0; i < 5; i++) {
    car.add(tube(0.1, 0.016, MAT.darkMetal, -0.06 + i * 0.04, 0.44, 0.16, [0, 0, Math.PI / 2], 12));
  }

  // Exhaust: header curling down the right side into a stubby silencer.
  car.add(tube(0.028, 0.42, MAT.chrome, 0.16, 0.26, 0.3, [0.4, 0.5, 0], 8));
  car.add(tube(0.055, 0.42, MAT.chrome, 0.21, 0.24, 0.6, [Math.PI / 2, 0, 0], 12));
  car.add(exhaustTip(0.21, 0.24, 0.83, 0.038, 0.08));

  // Pedals, because this is a moped and not a scooter.
  for (const side of [-1, 1]) {
    car.add(tube(0.022, 0.2, MAT.chrome, side * 0.13, 0.26, 0.24, [0, 0, Math.PI / 2], 8));
    car.add(tube(0.02, 0.16, MAT.chrome, side * 0.22, 0.2, side > 0 ? 0.16 : 0.32, [0.4, 0, 0], 8));
    car.add(part(0.09, 0.03, 0.14, black, side * 0.22, 0.14, side > 0 ? 0.1 : 0.38));
  }

  // ---- tank, saddle and tail -------------------------------------------
  car.add(slab(0.24, 0.2, 0.42, body, 0, 0.72, 0.34, [0, 0, 0], 0.07));
  const saddle = slab(0.28, 0.11, 0.52, MAT.interior, 0, 0.87, 0.42, [0, 0, 0], 0.055);
  car.add(saddle);
  car.add(part(0.3, 0.04, 0.06, MAT.chrome, 0, 0.83, 0.68)); // grab rail
  // Rear rack.
  car.add(part(0.26, 0.025, 0.3, MAT.chrome, 0, 0.86, 0.82));
  for (const side of [-1, 1]) {
    car.add(tube(0.014, 0.2, MAT.chrome, side * 0.11, 0.77, 0.9, [0.5, 0, 0], 6));
  }
  car.add(part(0.14, 0.09, 0.05, MAT.tail, 0, 0.72, 0.95));
  car.add(part(0.2, 0.14, 0.02, MAT.white, 0, 0.58, 0.97)); // number plate
  // Rear mudguard.
  car.add(fenderArch(RADIUS + 0.09, 0.2, 0, RADIUS, REAR_Z, body, 0.045));

  // ---- rider -------------------------------------------------------------
  const jacket = paint('#2b3550', { metalness: 0.05, roughness: 0.85 });
  const jeans = paint('#3d4a63', { metalness: 0.02, roughness: 0.95 });
  const skin = paint('#c69a72', { metalness: 0, roughness: 0.8 });
  const rider = new THREE.Group();
  rider.position.set(0, 0, 0.06);
  car.add(rider);
  rider.add(slab(0.34, 0.44, 0.26, jacket, 0, 1.16, 0.24, [0.28, 0, 0], 0.1));
  rider.add(slab(0.3, 0.16, 0.22, jacket, 0, 1.36, 0.14, [0, 0, 0], 0.07)); // shoulders
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), MAT.chrome);
  helmet.position.set(0, 1.52, 0.1);
  helmet.castShadow = true;
  rider.add(helmet);
  rider.add(part(0.2, 0.09, 0.08, MAT.glass, 0, 1.5, -0.01)); // visor
  for (const side of [-1, 1]) {
    // Upper arm and forearm aimed at where the grips actually ended up,
    // rather than at where they were guessed to be.
    const grip = new THREE.Vector3(
      side * GRIP_X,
      RADIUS + BAR_Y,
      FRONT_Z + BAR_Z
    );
    const shoulder = new THREE.Vector3(side * 0.2, 1.33, 0.16);
    const elbow = shoulder
      .clone()
      .lerp(grip, 0.48)
      .add(new THREE.Vector3(side * 0.04, -0.07, 0.04));
    for (const [from, to, r, mat] of [
      [shoulder, elbow, 0.048, jacket],
      [elbow, grip, 0.04, skin],
    ]) {
      const dir = to.clone().sub(from);
      const seg = tube(r, dir.length(), mat, 0, 0, 0, [0, 0, 0], 8);
      seg.position
        .copy(from)
        .add(to)
        .multiplyScalar(0.5)
        .sub(rider.position);
      seg.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        dir.normalize()
      );
      rider.add(seg);
    }
    rider.add(
      part(0.07, 0.07, 0.09, black, grip.x, grip.y, grip.z - rider.position.z)
    );
    // Thigh along the saddle, shin down to the footboard.
    rider.add(tube(0.075, 0.4, jeans, side * 0.13, 0.94, 0.2, [1.42, 0, 0], 8));
    rider.add(tube(0.06, 0.42, jeans, side * 0.15, 0.62, 0.06, [0.28, 0, 0], 8));
    rider.add(part(0.11, 0.08, 0.24, black, side * 0.16, 0.37, -0.04)); // boot
  }

  // ---- wheels ------------------------------------------------------------
  const wheels = [
    { x: 0, z: FRONT_Z, radius: RADIUS, width: 0.085, spokes: 6, front: true, rimMaterial: MAT.darkMetal },
    { x: 0, z: REAR_Z, radius: RADIUS, width: 0.095, spokes: 6, front: false, rimMaterial: MAT.darkMetal },
  ];
  mountWheels(car, wheels);

  // ---- steering assembly, hung off the front hub -------------------------
  const front = car.userData.wheels.find((w) => w.front).root;
  const steer = new THREE.Group();
  front.add(steer);

  // Fork legs from the hub up to the head, with the usual rake back.
  const RAKE = 0.24;
  for (const side of [-1, 1]) {
    steer.add(tube(0.026, 0.64, MAT.chrome, side * 0.085, 0.31, 0.075, [RAKE, 0, 0], 8));
  }
  steer.add(tube(0.036, 0.2, MAT.chrome, 0, 0.6, 0.15, [RAKE, 0, 0], 8));

  // Handlebars, grips, levers and mirrors.
  steer.add(tube(0.022, 0.58, MAT.chrome, 0, BAR_Y, BAR_Z, [0, 0, Math.PI / 2], 8));
  for (const side of [-1, 1]) {
    steer.add(tube(0.031, 0.13, black, side * GRIP_X, BAR_Y, BAR_Z, [0, 0, Math.PI / 2], 8));
    steer.add(part(0.1, 0.02, 0.03, MAT.chrome, side * 0.19, BAR_Y - 0.03, BAR_Z - 0.07));
    steer.add(
      wingMirror(side, side * (GRIP_X + 0.02), BAR_Y + 0.05, BAR_Z, MAT.chrome, {
        scale: 0.7,
      })
    );
  }

  // Headlamp: one round lamp in a chrome shell, speedo behind it.
  const shell = new THREE.Mesh(
    new THREE.CylinderGeometry(0.115, 0.1, 0.12, 18),
    MAT.chrome
  );
  shell.rotation.x = Math.PI / 2;
  shell.position.set(0, 0.5, -0.02);
  shell.castShadow = true;
  steer.add(shell);
  const lens = new THREE.Mesh(
    new THREE.CylinderGeometry(0.1, 0.1, 0.03, 18),
    MAT.headlight
  );
  lens.rotation.x = Math.PI / 2;
  lens.position.set(0, 0.5, -0.08);
  steer.add(lens);
  const clock = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14),
    black
  );
  clock.rotation.x = Math.PI / 2 - 0.45;
  clock.position.set(0, BAR_Y + 0.06, BAR_Z + 0.05);
  steer.add(clock);

  // Front mudguard, wrapped round the hub.
  steer.add(fenderArch(RADIUS + 0.07, 0.17, 0, 0, 0, body, 0.04));

  return car;
}

/* ------------------------------------------------------------------ */
/* Race car — GT prototype                                             */
/* ------------------------------------------------------------------ */

export function buildRaceCar(color = '#1c6fd8') {
  const car = new THREE.Group();
  const body = paint(color, { metalness: 0.3, roughness: 0.36 });
  const accent = paint('#f2f2f2', { metalness: 0.25, roughness: 0.4 });
  const sculpt = bodySculpt({
    halfLength: 2.4,
    ends: 0.26,
    endStart: 0.44,
    top: 0.18,
    beltline: 0.95,
    roofY: 1.36,
    bottom: 0.08,
    floorY: 0.26,
  });
  const opt = { sculpt };

  const lower = [
    [-2.35, 0.32],
    [-2.4, 0.8],
    [-1.8, 0.94],
    [-0.7, 0.99],
    [0.95, 0.95],
    [1.75, 0.76],
    [2.24, 0.62],
    [2.38, 0.48],
    [2.4, 0.32],
    [2.28, 0.14],
    [1.2, 0.1],
    [-1.2, 0.1],
    [-2.2, 0.2],
  ];
  car.add(profilePiece(lower, 1.94, body, { ...opt, bevel: 0.07 }));

  // Low cabin with a roof scoop.
  const cabin = [
    [-1.35, 0.96],
    [-0.62, 1.3],
    [0.35, 1.3],
    [1.0, 0.93],
  ];
  car.add(profilePiece(cabin, 1.74, MAT.glass, { ...opt, bevel: 0.02 }));
  car.add(
    profilePiece(
      [
        [-0.68, 1.24],
        [-0.62, 1.36],
        [0.38, 1.36],
        [0.46, 1.24],
      ],
      1.78,
      body,
      { ...opt, bevel: 0.03 }
    )
  );
  car.add(slab(0.32, 0.2, 0.66, body, 0, 1.4, -0.02));
  car.add(part(0.26, 0.14, 0.05, MAT.matteBlack, 0, 1.42, -0.36));
  for (const lat of [-0.8, 0.8]) {
    car.add(
      profilePiece(
        [
          [1.0, 0.93],
          [0.86, 0.95],
          [0.3, 1.36],
          [0.44, 1.36],
        ],
        0.11,
        body,
        { ...opt, lateral: lat, bevel: 0.015 }
      )
    );
    car.add(
      profilePiece(
        [
          [-1.35, 0.96],
          [-1.1, 0.98],
          [-0.56, 1.36],
          [-0.74, 1.36],
        ],
        0.12,
        body,
        { ...opt, lateral: lat, bevel: 0.015 }
      )
    );
  }

  // Roll cage, kept low enough to sit inside the glass.
  for (const side of [-1, 1]) {
    const bar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.05, 8),
      MAT.darkMetal
    );
    bar.position.set(side * 0.52, 0.9, -0.05);
    bar.rotation.x = 0.5;
    car.add(bar);
  }
  const hoop = new THREE.Mesh(
    new THREE.TorusGeometry(0.5, 0.04, 8, 16, Math.PI),
    MAT.darkMetal
  );
  hoop.rotation.y = Math.PI / 2;
  hoop.position.set(0, 0.8, 0.3);
  car.add(hoop);
  car.add(part(0.5, 0.5, 0.16, MAT.interior, -0.3, 1.0, 0.1)); // seat
  car.add(part(1.5, 0.12, 0.5, MAT.interior, 0, 0.96, -0.5)); // dash

  // Aero: splitter, dive planes, skirts, swan-neck wing.
  car.add(slab(2.02, 0.06, 0.68, MAT.carbon, 0, 0.12, -2.3));
  for (const side of [-1, 1]) {
    car.add(
      part(0.38, 0.03, 0.24, MAT.carbon, side * 0.82, 0.32, -2.12, [0, 0, side * 0.24])
    );
    car.add(
      part(0.38, 0.03, 0.2, MAT.carbon, side * 0.86, 0.48, -2.04, [0, 0, side * 0.24])
    );
    car.add(slab(0.18, 0.08, 2.3, MAT.carbon, side * 0.94, 0.12, 0.1));
    for (let i = 0; i < 4; i++) {
      car.add(
        part(0.42, 0.02, 0.09, MAT.matteBlack, side * 0.56, 0.9, -1.5 + i * 0.14)
      );
    }
    const pipe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 0.26, 12),
      MAT.chrome
    );
    pipe.rotation.z = Math.PI / 2;
    pipe.position.set(side * 0.94, 0.4, 0.75);
    car.add(pipe);
    const roundel = new THREE.Mesh(
      new THREE.CircleGeometry(0.28, 24),
      new THREE.MeshStandardMaterial({
        map: signTexture(['07'], { bg: '#f4f4f4', fg: '#15181c' }),
        roughness: 0.5,
      })
    );
    roundel.position.set(side * 0.93, 0.64, 0.05);
    roundel.rotation.y = (side * Math.PI) / 2;
    car.add(roundel);
  }

  // Rear wing on swan-neck mounts.
  car.add(slab(1.86, 0.06, 0.44, MAT.carbon, 0, 1.44, 2.16, [-0.18, 0, 0]));
  car.add(slab(1.6, 0.04, 0.16, MAT.carbon, 0, 1.29, 2.3, [-0.3, 0, 0]));
  for (const side of [-1, 1]) {
    car.add(part(0.05, 0.46, 0.16, MAT.carbon, side * 0.5, 1.2, 2.3));
    car.add(part(0.035, 0.34, 0.5, MAT.carbon, side * 0.93, 1.36, 2.2));
  }
  car.add(slab(1.86, 0.26, 0.34, MAT.matteBlack, 0, 0.24, 2.24));
  for (let i = -3; i <= 3; i++) {
    car.add(part(0.045, 0.24, 0.3, MAT.carbon, i * 0.26, 0.24, 2.26));
  }

  // Lights.
  for (const side of [-1, 1]) {
    car.add(part(0.46, 0.14, 0.1, MAT.headlight, side * 0.6, 0.6, -2.28, [0.25, 0, 0]));
    car.add(part(0.16, 0.09, 0.08, MAT.amber, side * 0.9, 0.54, -2.2));
    car.add(part(0.4, 0.11, 0.06, MAT.tail, side * 0.56, 0.76, 2.36));
  }
  car.add(part(0.14, 0.14, 0.06, MAT.tail, 0, 1.44, 2.38)); // rain light
  car.add(part(1.05, 0.13, 0.12, MAT.matteBlack, 0, 0.34, -2.36)); // radiator inlet

  // Doors and mirrors: even a prototype has to carry them to be homologated.
  for (const side of [-1, 1]) {
    car.add(doorFurniture(side, 0.54, { top: 1.04, bottom: 0.34, width: 2.06, sculpt }));
    car.add(
      wingMirror(side, side * flankX(2.06, sculpt, 1.1, -1.05), 1.1, -1.05, body, {
        scale: 1.15,
      })
    );
  }

  // Livery stripes over the spine.
  car.add(part(0.3, 0.02, 4.2, accent, 0, 1.0, -0.1));
  for (const side of [-1, 1]) {
    car.add(part(0.1, 0.02, 3.8, accent, side * 0.28, 0.995, -0.1));
  }

  const gold = paint('#c9a227', { metalness: 0.85, roughness: 0.24 });
  const wheels = [
    { x: -0.9, z: -1.42, radius: 0.37, width: 0.34, spokes: 8, front: true, rimMaterial: gold },
    { x: 0.9, z: -1.42, radius: 0.37, width: 0.34, spokes: 8, front: true, rimMaterial: gold },
    { x: -0.94, z: 1.44, radius: 0.39, width: 0.4, spokes: 8, front: false, rimMaterial: gold },
    { x: 0.94, z: 1.44, radius: 0.39, width: 0.4, spokes: 8, front: false, rimMaterial: gold },
  ];
  mountWheels(car, wheels);
  dressArches(car, wheels, body, { grow: 0.08, thickness: 0.08 });
  return car;
}

/* ------------------------------------------------------------------ */
/* 4x4 — lifted desert truck                                           */
/* ------------------------------------------------------------------ */

export function build4x4(color = '#c8791f') {
  const car = new THREE.Group();
  const body = paint(color, { metalness: 0.3, roughness: 0.5 });
  const trim = MAT.matteBlack;
  const sculpt = bodySculpt({
    halfLength: 2.72,
    ends: 0.14,
    endStart: 0.62,
    top: 0.07,
    beltline: 1.3,
    roofY: 2.2,
    bottom: 0.06,
    floorY: 0.5,
  });
  const opt = { sculpt };

  // Cab-and-bed profile: low nose, high shoulder line, open load bed.
  const lower = [
    [-2.7, 0.55],
    [-2.72, 1.36],
    [-1.15, 1.38],
    [-1.1, 1.16], // bed floor drops between cab and tailgate
    [0.55, 1.16],
    [0.62, 1.42],
    [1.1, 1.42],
    [1.75, 1.2],
    [2.5, 1.14],
    [2.72, 1.0],
    [2.74, 0.66],
    [2.5, 0.5],
    [1.5, 0.46],
    [-1.5, 0.46],
    [-2.5, 0.5],
  ];
  car.add(profilePiece(lower, 2.06, body, { ...opt, bevel: 0.08 }));

  // Tall cabin.
  const cabin = [
    [-1.05, 1.4],
    [-0.98, 2.12],
    [0.6, 2.1],
    [0.95, 1.4],
  ];
  car.add(profilePiece(cabin, 1.9, MAT.glass, { ...opt, bevel: 0.02 }));
  car.add(
    profilePiece(
      [
        [-1.02, 2.06],
        [-1.0, 2.2],
        [0.64, 2.18],
        [0.68, 2.04],
      ],
      1.96,
      body,
      { ...opt, bevel: 0.03 }
    )
  );
  for (const lat of [-0.88, 0.88]) {
    car.add(
      profilePiece(
        [
          [0.95, 1.4],
          [0.79, 1.4],
          [0.48, 2.18],
          [0.64, 2.18],
        ],
        0.11,
        body,
        { ...opt, lateral: lat, bevel: 0.015 }
      )
    );
    car.add(
      profilePiece(
        [
          [-1.05, 1.4],
          [-0.88, 1.4],
          [-0.82, 2.18],
          [-1.0, 2.18],
        ],
        0.11,
        body,
        { ...opt, lateral: lat, bevel: 0.015 }
      )
    );
    car.add(
      profilePiece(
        [
          [-0.16, 1.4],
          [-0.06, 1.4],
          [-0.04, 2.16],
          [-0.16, 2.16],
        ],
        0.1,
        body,
        { ...opt, lateral: lat, bevel: 0.015 }
      )
    );
  }

  // Roof rack over the cab with a light bar on the leading edge.
  car.add(part(1.64, 0.05, 1.7, trim, 0, 2.26, -0.2));
  for (const side of [-1, 1]) {
    car.add(part(0.05, 0.14, 1.7, trim, side * 0.8, 2.33, -0.2));
  }
  for (const z of [-0.9, -0.2, 0.5]) {
    car.add(part(1.62, 0.05, 0.05, trim, 0, 2.34, z));
  }
  car.add(part(0.9, 0.28, 0.62, MAT.darkMetal, 0, 2.42, 0.3)); // gear box
  car.add(part(1.36, 0.14, 0.1, trim, 0, 2.4, -1.02));
  for (let i = -3; i <= 3; i++) {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.075, 0.05, 14),
      MAT.headlight
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(i * 0.19, 2.4, -1.08);
    car.add(lamp);
  }

  // Front end: grille, round lamps, bull bar and winch.
  car.add(part(1.5, 0.4, 0.1, MAT.matteBlack, 0, 1.02, -2.72));
  for (let i = 0; i < 4; i++) {
    car.add(part(1.46, 0.04, 0.06, MAT.chrome, 0, 0.9 + i * 0.1, -2.75));
  }
  for (const side of [-1, 1]) {
    const round = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 0.12, 18),
      MAT.headlight
    );
    round.rotation.x = Math.PI / 2;
    round.position.set(side * 0.68, 1.02, -2.74);
    car.add(round);
    car.add(part(0.4, 0.09, 0.06, MAT.amber, side * 0.68, 0.78, -2.74));
    car.add(part(0.1, 0.86, 0.1, MAT.darkMetal, side * 0.82, 0.9, -2.9));
    car.add(part(0.1, 0.5, 0.1, MAT.darkMetal, side * 0.34, 1.06, -2.86, [0.4, 0, 0]));
  }
  car.add(part(1.86, 0.14, 0.12, MAT.darkMetal, 0, 1.26, -2.92));
  car.add(part(1.86, 0.13, 0.12, MAT.darkMetal, 0, 0.56, -2.9));
  const winch = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.46, 12),
    MAT.darkMetal
  );
  winch.rotation.z = Math.PI / 2;
  winch.position.set(0, 0.78, -2.82);
  car.add(winch);

  // Snorkel climbing the right A-pillar.
  const snorkel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 1.35, 12),
    trim
  );
  snorkel.position.set(0.95, 1.62, -1.34);
  car.add(snorkel);
  car.add(part(0.18, 0.26, 0.22, trim, 0.95, 2.36, -1.4));
  car.add(part(0.16, 0.16, 0.5, trim, 0.95, 1.1, -1.9));

  // Load bed: side rails, jerry cans, spare on the tailgate.
  car.add(part(2.08, 0.1, 1.5, trim, 0, 1.18, 1.8)); // bed floor
  car.add(part(2.1, 0.6, 0.12, body, 0, 1.44, 2.66)); // tailgate
  for (const side of [-1, 1]) {
    car.add(part(0.14, 0.5, 0.4, MAT.darkMetal, side * 0.78, 1.44, 1.35)); // jerry can
    car.add(part(0.22, 0.1, 2.1, MAT.darkMetal, side * 1.0, 0.56, 0.15)); // rock slider
    car.add(part(0.1, 0.05, 0.2, trim, side * 0.96, 1.66, -1.0));
    car.add(wingMirror(side, side * 1.12, 1.62, -1.08, MAT.matteBlack, { scale: 1.5 }));
    car.add(part(0.24, 0.5, 0.12, MAT.tail, side * 0.86, 1.0, 2.72));
  }
  const spare = new THREE.Mesh(
    new THREE.CylinderGeometry(0.46, 0.46, 0.3, 22),
    MAT.rubber
  );
  spare.rotation.x = Math.PI / 2;
  spare.position.set(0.15, 1.5, 2.86);
  car.add(spare);
  const spareRim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.27, 0.27, 0.32, 16),
    MAT.darkMetal
  );
  spareRim.rotation.x = Math.PI / 2;
  spareRim.position.set(0.15, 1.5, 2.86);
  car.add(spareRim);
  car.add(part(1.8, 0.16, 0.18, MAT.darkMetal, 0, 0.62, 2.8));
  car.add(part(0.14, 0.14, 0.28, MAT.darkMetal, 0, 0.54, 2.94));

  // Interior hint.
  car.add(part(1.6, 0.16, 1.3, MAT.interior, 0, 1.34, -0.4));
  for (const side of [-1, 1]) {
    car.add(part(0.42, 0.48, 0.16, MAT.interior, side * 0.4, 1.66, -0.1));
  }

  const wheels = [
    { x: -0.92, z: -1.72, radius: 0.54, width: 0.42, spokes: 6, knobby: true, front: true, rimMaterial: MAT.darkMetal, caliperColor: '#8a5a1e' },
    { x: 0.92, z: -1.72, radius: 0.54, width: 0.42, spokes: 6, knobby: true, front: true, rimMaterial: MAT.darkMetal, caliperColor: '#8a5a1e' },
    { x: -0.92, z: 1.78, radius: 0.54, width: 0.42, spokes: 6, knobby: true, front: false, rimMaterial: MAT.darkMetal, caliperColor: '#8a5a1e' },
    { x: 0.92, z: 1.78, radius: 0.54, width: 0.42, spokes: 6, knobby: true, front: false, rimMaterial: MAT.darkMetal, caliperColor: '#8a5a1e' },
  ];
  mountWheels(car, wheels);
  dressArches(car, wheels, trim, { grow: 0.09, thickness: 0.09 });
  return car;
}
