/**
 * Deer, after dark.
 *
 * Night used to be nothing but a colour: the same empty road with the lights
 * on. The one thing that actually makes a desert highway dangerous at night
 * is what walks onto it, and the one thing everybody knows about a deer is
 * that it stands there looking at you.
 *
 * So they do exactly that. One is standing on the verge with its eyes lit up
 * in the beams from a long way out, and it holds until you are nearly on it
 * before bolting across — which is both what really happens and the version
 * that gives you a decision: lift off early and it is nothing, keep your foot
 * in and it is a bill at the next pump.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { groundHeight } from './road.js';
import { glowAtNight } from './nightlights.js';
import { mergeGeometries } from '../../vendor/three/addons/utils/BufferGeometryUtils.js';

/** How many can be out at once. Two is already a lot for one stretch. */
const POOL = 2;
/** Seconds between attempts to put one out, once it is properly dark. */
const SPAWN_MIN = 22;
const SPAWN_SPREAD = 34;
/** Where it waits, and where it is heading. */
const VERGE = EDGE + 3.2;
const EXIT = EDGE + 13;
/** How close you have to be before it moves, and how fast it goes. */
const BOLT_RANGE = 62;
const BOLT_SPEED = 8.5;
/** Dark enough for them to be about. */
const NIGHT_LEVEL = 0.3;

const MATS = {};
function materials() {
  if (MATS.ready) return MATS;
  MATS.hide = new THREE.MeshStandardMaterial({ color: '#7a5c3c', roughness: 0.95 });
  MATS.pale = new THREE.MeshStandardMaterial({ color: '#c6ab86', roughness: 0.95 });
  MATS.antler = new THREE.MeshStandardMaterial({ color: '#9c8a6a', roughness: 0.9 });
  // Tapetum lucidum, and the only reason you see one in time.
  MATS.eye = glowAtNight(
    new THREE.MeshStandardMaterial({
      color: '#d8e6b0',
      emissive: '#eaffb0',
      emissiveIntensity: 0.2,
      roughness: 0.3,
    }),
    3.2
  );
  MATS.ready = true;
  return MATS;
}

/** Collects boxes per material and bakes one mesh each. */
function bake(parts, root) {
  for (const [mat, geoms] of parts) {
    const mesh = new THREE.Mesh(mergeGeometries(geoms, false), mat);
    mesh.castShadow = true;
    root.add(mesh);
  }
  return root;
}

/**
 * A mule deer, side on, facing its own -X. Kept to a couple of hundred
 * triangles: at night, in headlights, it is a silhouette and two eyes.
 */
function buildDeer() {
  const mat = materials();
  const parts = new Map();
  const add = (m, g) => {
    if (!parts.has(m)) parts.set(m, []);
    parts.get(m).push(g);
  };
  const box = (m, w, h, d, x, y, z) => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(x, y, z);
    add(m, g);
  };

  box(mat.hide, 1.15, 0.62, 0.44, 0, 1.02, 0); // barrel
  box(mat.pale, 0.5, 0.36, 0.4, 0.52, 0.9, 0); // rump
  box(mat.hide, 0.26, 0.5, 0.24, -0.52, 1.32, 0); // neck, up and forward
  box(mat.hide, 0.42, 0.24, 0.22, -0.68, 1.6, 0); // head
  box(mat.pale, 0.12, 0.1, 0.1, -0.88, 1.56, 0); // muzzle
  for (const z of [-0.09, 0.09]) {
    box(mat.hide, 0.1, 0.16, 0.06, -0.6, 1.74, z * 1.4); // ears
    box(mat.antler, 0.06, 0.34, 0.06, -0.62, 1.86, z);
    box(mat.antler, 0.22, 0.06, 0.06, -0.72, 2.0, z);
    box(mat.antler, 0.06, 0.16, 0.06, -0.82, 2.08, z);
  }
  box(mat.pale, 0.16, 0.22, 0.14, 0.72, 1.12, 0); // tail
  for (const x of [-0.4, 0.42]) {
    for (const z of [-0.16, 0.16]) box(mat.hide, 0.11, 0.74, 0.11, x, 0.37, z);
  }

  const g = new THREE.Group();
  bake(parts, g);
  // Built at a comfortable size to reason about, then taken down to a real
  // mule deer: a metre at the shoulder, not a metre and a third.
  g.scale.setScalar(0.78);
  for (const z of [-0.075, 0.075]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), mat.eye);
    eye.position.set(-0.86, 1.63, z);
    g.add(eye);
  }
  return g;
}

export class Wildlife {
  constructor(scene) {
    this.items = [];
    for (let i = 0; i < POOL; i++) {
      const model = buildDeer();
      model.visible = false;
      scene.add(model);
      this.items.push({ model, active: false, s: 0, lateral: 0, side: 1, bolting: false });
    }
    this.timer = SPAWN_MIN;
    this.tmp = { x: 0, y: 0, z: 0 };
  }

  reset() {
    for (const it of this.items) {
      it.active = false;
      it.model.visible = false;
    }
    this.timer = SPAWN_MIN + Math.random() * SPAWN_SPREAD;
  }

  place(playerS) {
    const it = this.items.find((i) => !i.active);
    if (!it) return;
    it.side = Math.random() < 0.5 ? -1 : 1;
    it.lateral = it.side * VERGE;
    it.s = playerS + 170 + Math.random() * 220;
    it.bolting = false;
    it.active = true;
    it.model.visible = true;
  }

  /**
   * @param {number} dt
   * @param {number} playerS
   * @param {number} night 0 by day, 1 in the dark — the headlamp level
   */
  update(dt, playerS, night) {
    if (night >= NIGHT_LEVEL) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.place(playerS);
        this.timer = SPAWN_MIN + Math.random() * SPAWN_SPREAD;
      }
    }

    for (const it of this.items) {
      if (!it.active) continue;
      const gap = it.s - playerS;
      // Gone past, or the sun came up on it.
      if (gap < -60 || Math.abs(it.lateral) > EXIT || night < NIGHT_LEVEL * 0.6) {
        it.active = false;
        it.model.visible = false;
        continue;
      }
      if (!it.bolting && gap < BOLT_RANGE) it.bolting = true;
      // Across the road, away from the side it was standing on.
      if (it.bolting) it.lateral -= it.side * BOLT_SPEED * dt;

      const p = roadPoint(it.s, it.lateral, this.tmp);
      it.model.position.set(p.x, groundHeight(it.s, it.lateral), p.z);
      // Broadside to the road, facing the way it is about to run — which is
      // also the way it runs once it goes. The model faces its own -X, and
      // rotation.y = roadYaw puts -X across the road towards the centre
      // line, so a deer on the right needs no turn and one on the left needs
      // half a turn. Facing it along the road instead reduces the whole
      // animal to a post in the beams, which is what the first attempt did.
      it.model.rotation.y = roadYaw(it.s) + (it.side > 0 ? 0 : Math.PI);
    }
  }

  /** Closing speed of a strike this frame, or 0. It does not survive one. */
  collide(playerS, playerLateral, playerSpeed, playerRadius) {
    for (const it of this.items) {
      if (!it.active) continue;
      if (Math.abs(it.s - playerS) > 1.9) continue;
      if (Math.abs(it.lateral - playerLateral) > 0.85 + playerRadius * 0.5) continue;
      it.active = false;
      it.model.visible = false;
      return Math.max(5, Math.abs(playerSpeed));
    }
    return 0;
  }
}
