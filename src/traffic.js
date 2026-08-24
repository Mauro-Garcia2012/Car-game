/**
 * Desert traffic — and there is almost none of it.
 *
 * A real highway out here gives you a vehicle every kilometre or two: mostly
 * semis coming the other way, the odd pickup plodding along in your lane. At
 * most three are ever on the road at once, so meeting one is an event.
 * Hitting one costs speed, fuel and bodywork.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw } from './track.js';
import { groundHeight } from './world/road.js';
import { MAT, paint, part, profilePiece, makeWheel } from './cars/parts.js';
import { scaled } from './difficulty.js';

const LANE = 2.45;
const MAX_ACTIVE = 3;
/** Seconds between vehicles: roughly one every 1.5–3 km at cruising speed. */
const SPAWN_MIN = 34;
const SPAWN_SPREAD = 50;
/** Nothing on the road for the first stretch out of the start line. */
const FIRST_SPAWN_MIN = 14;

function simpleWheels(group, layout) {
  const wheels = [];
  for (const w of layout) {
    const wheel = makeWheel({
      radius: w.r,
      width: w.w,
      spokes: 5,
      rimMaterial: MAT.darkMetal,
    });
    wheel.position.set(w.x, w.r, w.z);
    group.add(wheel);
    wheels.push(wheel);
  }
  group.userData.wheels = wheels;
}

/** Dusty desert pickup. */
function buildPickup(color) {
  const g = new THREE.Group();
  const body = paint(color, { metalness: 0.35, roughness: 0.5 });
  g.userData.bodyMaterial = body;
  g.add(
    profilePiece(
      [
        [-2.6, 0.5],
        [-2.62, 1.22],
        [0.7, 1.24],
        [1.6, 1.1],
        [2.4, 1.02],
        [2.6, 0.86],
        [2.6, 0.5],
        [2.3, 0.4],
        [-2.3, 0.4],
      ],
      1.94,
      body,
      { bevel: 0.05 }
    )
  );
  g.add(
    profilePiece(
      [
        [-1.1, 1.2],
        [-1.0, 1.92],
        [0.45, 1.9],
        [0.78, 1.22],
      ],
      1.8,
      MAT.glass,
      { bevel: 0.02 }
    )
  );
  g.add(
    profilePiece(
      [
        [-1.04, 1.86],
        [-1.02, 1.99],
        [0.5, 1.97],
        [0.52, 1.84],
      ],
      1.88,
      body,
      { bevel: 0.03 }
    )
  );
  g.add(part(1.9, 0.5, 0.1, body, 0, 1.0, 2.6)); // tailgate
  g.add(part(1.7, 0.16, 0.14, MAT.darkMetal, 0, 0.62, -2.62));
  for (const side of [-1, 1]) {
    g.add(part(0.42, 0.14, 0.1, MAT.headlight, side * 0.66, 0.95, -2.6));
    g.add(part(0.24, 0.36, 0.08, MAT.tail, side * 0.78, 1.0, 2.62));
  }
  simpleWheels(g, [
    { x: -0.92, z: -1.62, r: 0.44, w: 0.32 },
    { x: 0.92, z: -1.62, r: 0.44, w: 0.32 },
    { x: -0.92, z: 1.66, r: 0.44, w: 0.32 },
    { x: 0.92, z: 1.66, r: 0.44, w: 0.32 },
  ]);
  return g;
}

/** Long-haul semi with a boxy trailer. */
function buildSemi(color) {
  const g = new THREE.Group();
  const body = paint(color, { metalness: 0.65, roughness: 0.3 });
  g.userData.bodyMaterial = body;
  const trailerMat = new THREE.MeshStandardMaterial({
    color: '#dcd8ce',
    metalness: 0.35,
    roughness: 0.55,
  });
  // Tractor.
  g.add(part(2.4, 1.5, 3.0, body, 0, 1.35, -3.2));
  g.add(part(2.3, 1.1, 1.6, MAT.glass, 0, 2.5, -4.0));
  g.add(part(2.42, 0.6, 2.0, body, 0, 2.6, -2.9));
  g.add(part(2.5, 0.9, 0.5, MAT.chrome, 0, 1.1, -4.75));
  for (const side of [-1, 1]) {
    g.add(part(0.5, 0.3, 0.2, MAT.headlight, side * 0.9, 0.95, -4.85));
    const stack = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 2.6, 10),
      MAT.chrome
    );
    stack.position.set(side * 1.25, 2.3, -2.2);
    g.add(stack);
  }
  // Trailer.
  g.add(part(2.5, 3.0, 9.0, trailerMat, 0, 2.4, 2.6));
  g.add(part(2.54, 0.2, 9.04, MAT.darkMetal, 0, 0.95, 2.6));
  for (const side of [-1, 1]) {
    g.add(part(0.2, 0.3, 0.1, MAT.tail, side * 0.9, 1.2, 7.12));
  }
  simpleWheels(g, [
    { x: -1.1, z: -4.1, r: 0.55, w: 0.34 },
    { x: 1.1, z: -4.1, r: 0.55, w: 0.34 },
    { x: -1.1, z: -1.9, r: 0.55, w: 0.34 },
    { x: 1.1, z: -1.9, r: 0.55, w: 0.34 },
    { x: -1.1, z: 5.3, r: 0.55, w: 0.34 },
    { x: 1.1, z: 5.3, r: 0.55, w: 0.34 },
    { x: -1.1, z: 6.5, r: 0.55, w: 0.34 },
    { x: 1.1, z: 6.5, r: 0.55, w: 0.34 },
  ]);
  return g;
}

const PICKUP_COLORS = ['#7e8b96', '#8f5a34', '#3f5d45', '#b8b2a4', '#5a6472'];
const SEMI_COLORS = ['#b6352c', '#2f5d9e', '#3c3f46', '#c9a227'];

export class Traffic {
  constructor(scene) {
    this.items = [];
    for (let i = 0; i < MAX_ACTIVE; i++) {
      const semi = i % 3 === 0;
      const model = semi
        ? buildSemi(SEMI_COLORS[i % SEMI_COLORS.length])
        : buildPickup(PICKUP_COLORS[i % PICKUP_COLORS.length]);
      model.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      model.visible = false;
      scene.add(model);
      this.items.push({
        model,
        semi,
        active: false,
        s: 0,
        lateral: 0,
        speed: 0,
        dir: 1,
        length: semi ? 8 : 3,
        halfWidth: semi ? 1.4 : 1.1,
      });
    }
    this.spawnTimer = FIRST_SPAWN_MIN;
    this.tmp = { x: 0, y: 0, z: 0 };
  }

  reset() {
    for (const it of this.items) {
      it.active = false;
      it.model.visible = false;
    }
    this.spawnTimer = FIRST_SPAWN_MIN + Math.random() * SPAWN_SPREAD;
  }

  spawn(playerS) {
    const it = this.items.find((i) => !i.active);
    if (!it) return;
    // Most of what you meet is coming the other way.
    const oncoming = Math.random() < (it.semi ? 0.8 : 0.65);
    it.dir = oncoming ? -1 : 1;
    it.lateral = oncoming ? -LANE : LANE + (Math.random() - 0.5) * 0.5;
    it.s = oncoming
      ? playerS + 800 + Math.random() * 700
      : playerS + 300 + Math.random() * 500;
    it.speed = it.semi ? 22 + Math.random() * 8 : 25 + Math.random() * 11;
    const palette = it.semi ? SEMI_COLORS : PICKUP_COLORS;
    it.model.userData.bodyMaterial.color.set(
      palette[(Math.random() * palette.length) | 0]
    );
    it.active = true;
    it.model.visible = true;
  }

  update(dt, playerS) {
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this.spawn(playerS);
      // Thicker the further out you are: three on the road at once used to
      // be the ceiling everywhere, and out past two hundred kilometres it is
      // the normal state of things.
      this.spawnTimer =
        scaled(playerS, SPAWN_MIN, 0.4) +
        Math.random() * scaled(playerS, SPAWN_SPREAD, 0.4);
    }

    for (const it of this.items) {
      if (!it.active) continue;
      it.s += it.dir * it.speed * dt;
      const behind = playerS - it.s;
      if (behind > 140 || it.s - playerS > 1700) {
        it.active = false;
        it.model.visible = false;
        continue;
      }
      const p = roadPoint(it.s, it.lateral, this.tmp);
      it.model.position.set(p.x, groundHeight(it.s, it.lateral), p.z);
      it.model.rotation.y = roadYaw(it.s) + (it.dir < 0 ? Math.PI : 0);
      for (const w of it.model.userData.wheels) {
        w.rotation.x -= (it.speed * dt) / 0.45;
      }
    }
  }

  /** Returns the closing speed of a collision this frame, or 0. */
  collide(playerS, playerLateral, playerSpeed, playerRadius) {
    for (const it of this.items) {
      if (!it.active) continue;
      const ds = Math.abs(it.s - playerS);
      const dl = Math.abs(it.lateral - playerLateral);
      if (ds < it.length / 2 + 2.2 && dl < it.halfWidth + playerRadius * 0.55) {
        // The other vehicle stays on the road; the player's crash cooldown
        // stops the same contact from registering again next frame.
        it.speed *= 0.7;
        return Math.max(6, Math.abs(playerSpeed - it.dir * it.speed));
      }
    }
    return 0;
  }
}
