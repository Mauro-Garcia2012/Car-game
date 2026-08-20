/**
 * The car's headlamps.
 *
 * Once the day/night cycle went in, the last hour of a run stopped being a
 * lighting change and became a different game: past dusk the only thing you
 * can see is what you are pointing at. So these are real spotlights, hung
 * from wherever the model happens to keep its lamps.
 *
 * There is deliberately no cone of lit dust around the beams. A cone mesh is
 * the cheap way to fake one, and from the chase camera you look almost
 * straight down its axis, where it collapses into a bright vertical smear
 * across the vanishing point. Two honest spotlights read better than one
 * dishonest volume.
 *
 * They come up on their own through dusk — there is enough to think about
 * without a light switch.
 */
import * as THREE from 'three';
import { MAT } from '../cars/parts.js';

/** Candela at full dark. Tuned against the road texture, not physics. */
const BEAM_INTENSITY = 130;
const BEAM_ANGLE = 0.4;
const BEAM_RANGE = 170;

/**
 * Aim. A realistic dipped beam puts its hot spot about ten metres out, which
 * at 120 km/h means you meet things before you see them — so these are aimed
 * long and flat, and the spread takes care of the tarmac underneath.
 */
const AIM_AHEAD = 55;
const AIM_DROP = 1.4;

/** Where a model keeps its front lamps, in model space. */
function lampAnchors(model) {
  const found = [];
  model.updateMatrixWorld(true);
  model.traverse((o) => {
    if (o.isMesh && o.material === MAT.headlight) {
      found.push(o.getWorldPosition(new THREE.Vector3()));
    }
  });
  if (!found.length) return null;

  // Roof light bars and fog lamps share the material, so keep the front row.
  let nose = Infinity;
  for (const p of found) nose = Math.min(nose, p.z);
  const front = found.filter((p) => p.z < nose + 0.4);

  let left = front[0];
  let right = front[0];
  for (const p of front) {
    if (p.x < left.x) left = p;
    if (p.x > right.x) right = p;
  }
  // A moped has one lamp. Returning it twice would stack two spotlights in
  // the same spot and light the road like a car.
  return left.distanceTo(right) < 0.12 ? [left] : [left, right];
}

export class Headlights {
  constructor() {
    this.rig = new THREE.Group();
    this.level = 0;
    this.active = 2;

    this.lamps = [];
    for (let i = 0; i < 2; i++) {
      const spot = new THREE.SpotLight(
        '#f4f7ff',
        0,
        BEAM_RANGE,
        BEAM_ANGLE,
        0.55,
        1.0
      );
      spot.castShadow = false;
      const target = new THREE.Object3D();
      spot.target = target;
      this.rig.add(spot, target);
      this.lamps.push({ spot, target });
    }

    // The rig stays in the scene all day with the lamps turned down to
    // nothing. Hiding it would drop two lights out of the light list, and
    // three.js recompiles every material when that count changes — a stutter
    // at the exact moment dusk arrives, once every in-game day.
  }

  /** Hangs the rig off a car model and lines it up with that car's lamps. */
  attach(model) {
    if (this.rig.parent) this.rig.parent.remove(this.rig);
    const anchors = lampAnchors(model);
    if (!anchors) return;
    model.add(this.rig);

    this.active = anchors.length;
    anchors.forEach((p, i) => {
      const { spot, target } = this.lamps[i];
      spot.position.copy(p);
      target.position.set(p.x * 0.6, p.y - AIM_DROP, p.z - AIM_AHEAD);
    });
    this.setLevel(this.level);
  }

  detach() {
    if (this.rig.parent) this.rig.parent.remove(this.rig);
  }

  /**
   * @param {number} level 0 in daylight, 1 once it is properly dark
   */
  setLevel(level) {
    this.level = level;
    this.lamps.forEach(({ spot }, i) => {
      spot.intensity = i < this.active ? level * BEAM_INTENSITY : 0;
    });

    // Every lamp and lens in the world, the player's and the traffic's.
    MAT.headlight.emissiveIntensity = 1.4 + level * 2.6;
    MAT.tail.emissiveIntensity = 1.1 + level * 2.2;
    MAT.amber.emissiveIntensity = 0.8 + level * 1.4;
  }
}
