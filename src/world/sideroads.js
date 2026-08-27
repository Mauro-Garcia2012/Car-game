/**
 * Dirt spurs off the highway, and what somebody left at the end of them.
 *
 * Roughly every ten kilometres a graded track runs out into the desert for
 * four to seven hundred metres and stops at nothing in particular, with a
 * briefcase sitting where it stops. Going out and back is a kilometre or so
 * of detour on a road where fuel and daylight are both finite, which is the
 * whole bet: most cases hold three hundred dollars, a good few hold a seized
 * engine, and once in a while there is a set of keys in there.
 *
 * The track is real ground rather than decoration — it grades as gravel, so
 * it is far quicker than the sand either side of it, and cutting the corner
 * costs you more than following it.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { hashRand, onReseed } from '../rng.js';
import { groundHeight } from './road.js';
import { sandTexture, dangerBoardTexture } from '../textures.js';
import { signBoard, behindBoard } from './boards.js';
import { t, onLanguageChange } from '../i18n.js';
import { glowAtNight } from './nightlights.js';

/** Spacing along the highway, and how much it wanders. */
const FIRST_TRACK = 9000;
const TRACK_GAP = 10000;
const TRACK_SPREAD = 2400;

/** How far out it goes, and how wide the graded strip is. */
const LENGTH_MIN = 400;
const LENGTH_SPREAD = 300;
export const TRACK_WIDTH = 7.5;

/** How close the car has to get to the case to pick it up. */
const REACH = 7;
/**
 * How far the graded surface sits above the sand.
 *
 * Just enough to win the depth test and no more: the car's wheels ride on
 * the terrain height, not on this, so anything taller than a couple of
 * centimetres and you are driving underneath your own road.
 */
const LIFT = 0.05;

/** What is in the briefcase. */
export const PRIZE_CASH = 'cash';
export const PRIZE_WORN = 'worn';
export const PRIZE_HATCH = 'hatch';
export const PRIZE_SUPER = 'super';
/**
 * A road atlas: fifty kilometres of what is coming, on paper.
 *
 * Worthless if you already have one, so the draw is context sensitive — see
 * `prizeAt`. Somebody out here was planning further ahead than they managed
 * to get.
 */
export const PRIZE_ATLAS = 'atlas';

export const CASE_CASH = 300;
export const REPAIR_COST = 100;
/** Speed a seized engine will still do, in m/s. */
export const WORN_LIMIT = 40 / 3.6;

const distances = [FIRST_TRACK];
onReseed(() => {
  distances.length = 1;
  distances[0] = FIRST_TRACK + Math.round((hashRand(6001, 9) - 0.5) * TRACK_SPREAD);
});

/** Where side road `i` leaves the highway. */
export function trackDistance(i) {
  while (distances.length <= i) {
    const k = distances.length - 1;
    distances.push(
      distances[k] + TRACK_GAP + Math.round((hashRand(k, 601) - 0.5) * TRACK_SPREAD)
    );
  }
  return distances[i];
}

/** Index of the first side road at or beyond `s`. */
export function nextTrackIndex(s) {
  let i = 0;
  while (trackDistance(i) < s) i++;
  return i;
}

/** @returns {{index:number, s:number, side:number, length:number}} */
export function trackAt(index) {
  return {
    index,
    s: trackDistance(index),
    side: hashRand(index, 611) > 0.5 ? 1 : -1,
    length: LENGTH_MIN + Math.round(hashRand(index, 613) * LENGTH_SPREAD),
  };
}

/**
 * Which briefcase is out there. Deterministic from the track, so the same
 * spur always holds the same thing and looking one up twice cannot cheat.
 */
/**
 * What is in the case at the end of spur `index`.
 *
 * @param {boolean} [wantsAtlas] true when an atlas would be worth something —
 *   that is, when you have not got one. When you have, that tenth of the draw
 *   pays out in notes instead of handing you a second copy of a map.
 */
export function prizeAt(index, wantsAtlas = false) {
  const r = hashRand(index, 617);
  if (r < 0.01) return PRIZE_SUPER;
  if (r < 0.11) return PRIZE_HATCH;
  if (r < 0.21) return wantsAtlas ? PRIZE_ATLAS : PRIZE_CASH;
  if (r < 0.66) return PRIZE_CASH;
  return PRIZE_WORN;
}

/** The nearest side road to `s`, or null if there is not one in reach. */
export function trackNear(s, window = 900) {
  const i = nextTrackIndex(s);
  for (const k of [i - 1, i]) {
    if (k < 0) continue;
    const t = trackAt(k);
    if (Math.abs(t.s - s) <= window) return t;
  }
  return null;
}

/**
 * Is this point on graded dirt? Called from the car's physics every frame,
 * so it looks at two candidate tracks and no more.
 */
export function onTrack(s, lateral) {
  const t = trackNear(s, TRACK_WIDTH);
  if (!t) return false;
  if (Math.sign(lateral) !== t.side) return false;
  const out = Math.abs(lateral);
  return out >= EDGE - 1.5 && out <= EDGE + t.length + 6;
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

/** A briefcase: hard case, handle, two catches. */
function briefcaseModel() {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({
    color: '#5d4632',
    roughness: 0.55,
    metalness: 0.15,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: '#c9ccd2',
    roughness: 0.3,
    metalness: 0.9,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.38, 0.14), shell);
  body.position.y = 0.19;
  body.castShadow = true;
  g.add(body);
  const seam = new THREE.Mesh(new THREE.BoxGeometry(0.53, 0.02, 0.15), metal);
  seam.position.y = 0.19;
  g.add(seam);
  for (const x of [-0.15, 0.15]) {
    const catchPlate = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.05, 0.16), metal);
    catchPlate.position.set(x, 0.19, 0);
    g.add(catchPlate);
  }
  const handle = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.017, 8, 14, Math.PI),
    metal
  );
  handle.position.y = 0.38;
  handle.castShadow = true;
  g.add(handle);
  return g;
}

/**
 * The warning at the junction: a yellow diamond with a skull and an arrow
 * pointing the way the track goes. Two posts, board on the front face only,
 * posts behind it — the same arrangement every other sign here ended up
 * needing.
 */
function junctionSign(side) {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: '#8f949a',
    roughness: 0.55,
    metalness: 0.5,
  });
  // Posts behind the board, never across the skull.
  const postZ = behindBoard(0.06, 0.09);
  for (const x of [-0.5, 0.5]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 2.6, 0.09), steel);
    post.position.set(x, 1.3, postZ);
    post.castShadow = true;
    g.add(post);
  }
  const art = dangerBoardTexture(t('sign.danger'), side);
  const face = new THREE.MeshStandardMaterial({
    map: art,
    emissiveMap: art,
    emissive: '#7a6a3a',
    emissiveIntensity: 0.3,
    roughness: 0.55,
  });
  glowAtNight(face, 1.1);
  const back = new THREE.MeshStandardMaterial({ color: '#6d7278', roughness: 0.7 });
  const board = signBoard(1.5, 1.5, 0.06, face, back);
  board.position.set(0, 2.5, 0);
  g.add(board);
  g.userData.face = face;
  return g;
}

/** How many spurs can be built at once; they are 10 km apart. */
const SLOTS = 2;
/**
 * How finely the strip is cut up.
 *
 * Both numbers are set by the terrain it has to lie on rather than by how it
 * looks on its own. The desert mesh has rows every 3.3 m along the road, so a
 * strip 7.5 m wide with only its two edges for vertices spans two and a half
 * rows with nothing in between and saws straight through the dunes: RIBS
 * gives it a vertex every 1.25 m across. Along its length the mesh columns
 * start a quarter of a metre apart at the shoulder and are ninety metres
 * apart by the far end, so the segments are bunched towards the road by
 * SPREAD_BIAS rather than spaced evenly down a track half a kilometre long.
 */
const SEGMENTS = 192;
const RIBS = 10;
const SPREAD_BIAS = 1.8;

export class SideRoads {
  constructor(scene) {
    // Graded dirt: the same grain as the desert, tinted well down. Left near
    // the sand's own colour it is technically drawn and practically
    // invisible, which is no use as a thing you are meant to follow.
    const dirt = sandTexture();
    // The strip and the sand under it are all but coplanar, and the strip has
    // to win. A depth bias settles it without lifting the geometry, which is
    // the other way to do it and the way that leaves the car driving through
    // its own road.
    this.material = new THREE.MeshStandardMaterial({
      map: dirt,
      color: '#6f5233',
      roughness: 1,
      metalness: 0,
      // Both sides, because the winding flips with the spur.
      //
      // One index buffer serves every strip, but a spur leaving to the left
      // is the mirror image of one leaving to the right, so the same order of
      // vertices winds one way on one side and the other way on the other.
      // Front faces only meant every spur on one side of the highway was
      // invisible — which is exactly half of them, and exactly what it looked
      // like. Three flips the normal for back-facing fragments, so the
      // lighting comes out right either way.
      side: THREE.DoubleSide,
      // The strip and the sand under it are all but coplanar, and the strip
      // has to win. A depth bias settles it without lifting the geometry,
      // which is the other way to do it and the way that leaves the car
      // driving through its own road.
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -4,
    });

    this.slots = [];
    for (let i = 0; i < SLOTS; i++) {
      const across = RIBS + 1;
      const positions = new Float32Array((SEGMENTS + 1) * across * 3);
      const uvs = new Float32Array((SEGMENTS + 1) * across * 2);
      const index = new Uint16Array(SEGMENTS * RIBS * 6);
      for (let k = 0, n = 0; k < SEGMENTS; k++) {
        for (let r = 0; r < RIBS; r++) {
          const a = k * across + r;
          const c = a + across;
          index[n++] = a;
          index[n++] = a + 1;
          index[n++] = c;
          index[n++] = a + 1;
          index[n++] = c + 1;
          index[n++] = c;
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.setIndex(new THREE.BufferAttribute(index, 1));
      const strip = new THREE.Mesh(geo, this.material);
      strip.frustumCulled = false;
      strip.receiveShadow = true;
      strip.visible = false;
      scene.add(strip);

      const sign = junctionSign(1);
      sign.visible = false;
      scene.add(sign);

      const box = briefcaseModel();
      box.visible = false;
      scene.add(box);

      this.slots.push({ index: null, strip, positions, uvs, geo, sign, box });
    }

    /** Cases already picked up this run, by track index. */
    this.taken = new Set();
    /** Set by the game: would an atlas be worth anything to us right now? */
    this.wantsAtlas = false;
    this.tmp = { x: 0, y: 0, z: 0 };
    onReseed(() => {
      for (const slot of this.slots) slot.index = null;
    });
    onLanguageChange(() => {
      for (const slot of this.slots) {
        const side = slot.arrowSide;
        slot.arrowSide = null;
        if (side) this.aimSign(slot, side);
      }
    });
  }

  reset() {
    this.taken.clear();
    for (const slot of this.slots) slot.index = null;
  }

  /**
   * Lays the strip out along the ground it actually crosses.
   *
   * Every vertex takes its height from the drawn surface at its own position.
   * Taking one height off the centre line and giving it to both edges — which
   * is what this used to do — puts the two edges 3.75 m apart in s at the same
   * altitude, and on the side of a dune that is a metre out: half the strip
   * ended up under the sand, which is exactly what it looked like.
   */
  build(slot, track) {
    const { positions, uvs } = slot;
    const half = TRACK_WIDTH / 2;
    let p = 0;
    let u = 0;
    for (let k = 0; k <= SEGMENTS; k++) {
      const t = Math.pow(k / SEGMENTS, SPREAD_BIAS);
      // A little wider where it meets the highway, like a real graded apron.
      const flare = 1 + 2.2 * Math.pow(1 - t, 3);
      const out = t * (track.length + 2);
      const lat = track.side * (EDGE - 1 + out);
      for (let r = 0; r <= RIBS; r++) {
        const edge = (r / RIBS) * 2 - 1;
        const s = track.s + edge * half * flare;
        roadPoint(s, lat, this.tmp);
        positions[p] = this.tmp.x;
        positions[p + 1] = groundHeight(s, lat) + LIFT;
        positions[p + 2] = this.tmp.z;
        uvs[u] = edge * 0.5 + 0.5;
        uvs[u + 1] = out / 9;
        p += 3;
        u += 2;
      }
    }
    slot.geo.attributes.position.needsUpdate = true;
    slot.geo.attributes.uv.needsUpdate = true;
    slot.geo.computeVertexNormals();
    slot.geo.computeBoundingSphere();
  }

  update(playerS) {
    const base = Math.max(0, nextTrackIndex(playerS) - 1);
    for (let k = 0; k < this.slots.length; k++) {
      const slot = this.slots[k];
      const index = base + k;
      if (slot.index === index) {
        this.refreshCase(slot, index);
        continue;
      }
      slot.index = index;
      const track = trackAt(index);
      this.build(slot, track);
      slot.strip.visible = true;

      const junction = roadPoint(track.s, track.side * (EDGE + 1.4), this.tmp);
      slot.sign.position.set(
        junction.x,
        groundHeight(track.s, track.side * (EDGE + 1.4)),
        junction.z
      );
      slot.sign.rotation.y = roadYaw(track.s) + track.side * 0.5;
      this.aimSign(slot, track.side);
      slot.sign.visible = true;

      const end = track.side * (EDGE + track.length);
      const p = roadPoint(track.s, end, this.tmp);
      slot.box.position.set(p.x, groundHeight(track.s, end), p.z);
      slot.box.rotation.y = roadYaw(track.s) + 0.7;
      this.refreshCase(slot, index);
    }
  }

  /** Points the arrow the way this spur actually leaves the road. */
  aimSign(slot, side) {
    if (slot.arrowSide === side) return;
    slot.arrowSide = side;
    const art = dangerBoardTexture(t('sign.danger'), side);
    slot.sign.userData.face.map = art;
    slot.sign.userData.face.emissiveMap = art;
    slot.sign.userData.face.needsUpdate = true;
  }

  refreshCase(slot, index) {
    slot.box.visible = !this.taken.has(index);
  }

  /**
   * Picks up any case the car has reached.
   * @returns {{index:number, prize:string, x:number, y:number, z:number}|null}
   */
  collect(playerS, playerLateral) {
    for (const slot of this.slots) {
      const index = slot.index;
      if (index === null || this.taken.has(index)) continue;
      const track = trackAt(index);
      if (Math.abs(track.s - playerS) > REACH) continue;
      const end = EDGE + track.length;
      if (Math.sign(playerLateral) !== track.side) continue;
      if (Math.abs(Math.abs(playerLateral) - end) > REACH) continue;
      this.taken.add(index);
      slot.box.visible = false;
      return {
        index,
        prize: prizeAt(index, this.wantsAtlas),
        x: slot.box.position.x,
        y: slot.box.position.y,
        z: slot.box.position.z,
      };
    }
    return null;
  }
}
