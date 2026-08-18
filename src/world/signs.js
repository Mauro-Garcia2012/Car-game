/**
 * Speed limit signs, Nevada style.
 *
 * Out on a rural two-lane highway in Clark County the posted limit is 70 mph
 * (a couple of stretches drop to 65), it steps down to 55 on the approach to
 * anything with a building on it, then 45 past the pumps, and back up to the
 * open limit once you are clear. The signs are MUTCD R2-1 rectangles on a
 * single post, planted just beyond the shoulder and turned slightly towards
 * the traffic they face.
 *
 * `speedLimitAt()` is the same rule the signs are generated from, so the HUD
 * badge and the roadside always agree.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { hashRand } from '../rng.js';
import { speedLimitTexture } from '../textures.js';
import { terrainHeight } from './road.js';
import { stationDistance, nextStationIndex } from './gasStation.js';

/** Posted limits, in mph, exactly as they are painted on the signs. */
export const OPEN_LIMIT = 70;
export const OPEN_LIMIT_SLOW = 65;
export const APPROACH_LIMIT = 55;
export const STATION_LIMIT = 45;

const SLOW_START = 420; // metres before a station where 55 starts
const TOWN_START = 160; // ... where 45 starts
const RESUME_AFTER = 220; // metres past a station where the open limit returns
const REPEAT = 1500; // reminder signs out on the empty stretches
const AHEAD = 1700; // how far up the road signs are kept built
const BEHIND = 120;

/** The open-road limit at `s`: mostly 70, with the odd 65 stretch. */
function openLimit(s) {
  return hashRand(Math.floor(s / 7000), 91) < 0.25
    ? OPEN_LIMIT_SLOW
    : OPEN_LIMIT;
}

/** Station indices whose speed zone could cover `s`. */
function nearbyStations(s) {
  const n = nextStationIndex(s);
  const out = [];
  for (let i = Math.max(0, n - 1); i <= n + 1; i++) out.push(i);
  return out;
}

/** The limit in force at distance `s`, in mph. */
export function speedLimitAt(s) {
  for (const i of nearbyStations(s)) {
    const station = stationDistance(i);
    if (s > station - TOWN_START && s < station + RESUME_AFTER) {
      return STATION_LIMIT;
    }
    if (s > station - SLOW_START && s <= station - TOWN_START) {
      return APPROACH_LIMIT;
    }
  }
  return openLimit(s);
}

/** True where a reminder sign would land inside a station's speed zone. */
function insideStationZone(s) {
  for (const i of nearbyStations(s)) {
    const station = stationDistance(i);
    if (s > station - SLOW_START - 220 && s < station + RESUME_AFTER + 220) {
      return true;
    }
  }
  return false;
}

/** Every sign that should exist between s0 and s1, in order. */
function signsBetween(s0, s1) {
  const out = [];

  // The step-down and step-up signs around each station.
  let i = Math.max(0, nextStationIndex(s0 + SLOW_START) - 1);
  for (; stationDistance(i) - SLOW_START <= s1; i++) {
    const station = stationDistance(i);
    out.push({ s: station - SLOW_START, mph: APPROACH_LIMIT });
    out.push({ s: station - TOWN_START, mph: STATION_LIMIT });
    const resume = station + RESUME_AFTER;
    out.push({ s: resume, mph: openLimit(resume) });
  }

  // Reminder signs on the open road.
  for (let k = Math.ceil(s0 / REPEAT); k * REPEAT <= s1; k++) {
    const s = k * REPEAT;
    if (!insideStationZone(s)) out.push({ s, mph: openLimit(s) });
  }

  return out.filter((sign) => sign.s >= s0 && sign.s <= s1).sort((a, b) => a.s - b.s);
}

/* ------------------------------------------------------------------ */

const SIGN_W = 0.92;
const SIGN_H = 1.22;
const SIGN_CENTRE_Y = 2.35;

const faceCache = new Map();
function faceMaterial(mph) {
  if (!faceCache.has(mph)) {
    faceCache.set(
      mph,
      new THREE.MeshStandardMaterial({
        map: speedLimitTexture(mph),
        roughness: 0.55,
        metalness: 0.05,
        // Sign sheeting is retroreflective, so it stays bright at dusk.
        emissive: '#2a2a28',
        emissiveIntensity: 0.35,
      })
    );
  }
  return faceCache.get(mph);
}

export class RoadSigns {
  constructor(scene, poolSize = 10) {
    const post = new THREE.MeshStandardMaterial({
      color: '#9aa0a6',
      roughness: 0.5,
      metalness: 0.7,
    });
    const edge = new THREE.MeshStandardMaterial({
      color: '#cdd0d2',
      roughness: 0.6,
      metalness: 0.3,
    });
    const back = new THREE.MeshStandardMaterial({
      color: '#8f9499',
      roughness: 0.7,
      metalness: 0.4,
    });

    this.slots = [];
    for (let i = 0; i < poolSize; i++) {
      const group = new THREE.Group();

      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.075, 3.1, 0.075),
        post
      );
      pole.position.y = 1.55;
      pole.castShadow = true;
      group.add(pole);

      // Box faces: [+X, -X, +Y, -Y, +Z, -Z]; the legend goes on +Z, which
      // rotation.y = roadYaw() turns to face oncoming traffic.
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(SIGN_W, SIGN_H, 0.045),
        [edge, edge, edge, edge, faceMaterial(OPEN_LIMIT), back]
      );
      panel.position.y = SIGN_CENTRE_Y;
      panel.castShadow = true;
      panel.receiveShadow = true;
      group.add(panel);

      group.visible = false;
      scene.add(group);
      this.slots.push({ group, panel, mph: 0, s: null });
    }

    this.lastBuiltAt = -Infinity;
    this.tmp = { x: 0, y: 0, z: 0 };
  }

  /** Keeps the signs in view built; cheap, and only recomputed every 40 m. */
  update(playerS) {
    if (Math.abs(playerS - this.lastBuiltAt) < 40) return;
    this.lastBuiltAt = playerS;

    const wanted = signsBetween(playerS - BEHIND, playerS + AHEAD);
    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const sign = wanted[i];
      if (!sign) {
        slot.group.visible = false;
        slot.s = null;
        continue;
      }
      if (slot.s !== sign.s || slot.mph !== sign.mph) {
        slot.s = sign.s;
        slot.mph = sign.mph;
        slot.panel.material[4] = faceMaterial(sign.mph);
        const lateral = EDGE + 2.6;
        const p = roadPoint(sign.s, lateral, this.tmp);
        slot.group.position.set(p.x, terrainHeight(sign.s, lateral), p.z);
        // Turned a few degrees towards the road, like a real sign.
        slot.group.rotation.y = roadYaw(sign.s) - 0.09;
      }
      slot.group.visible = true;
    }
  }
}
