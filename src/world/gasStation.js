/**
 * Desert gas stations: the only thing keeping the tank off empty.
 *
 * Stations sit at deterministic distances along the track. A pool of three
 * fully built stations is shuffled forward as the player drives, and each one
 * exposes a refuelling zone on the apron next to the pumps.
 */
import * as THREE from 'three';
import { glowAtNight } from './nightlights.js';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { hashRand } from '../rng.js';
import {
  concreteTexture,
  signTexture,
  boardTexture,
  priceBoardTexture,
} from '../textures.js';
import { t } from '../i18n.js';
import { terrainHeight } from './road.js';

const FIRST_STATION = 1500;
const MIN_GAP = 1950;
const GAP_SPREAD = 520;

/** Litres in a US gallon, for the pump price. */
export const LITRES_PER_GALLON = 3.785;

/* ------------------------------------------------------------------ */
/* The price of gas                                                    */
/* ------------------------------------------------------------------ */

/** Where the market opens, in dollars per gallon. */
const BASE_PRICE = 4.29;
/** Nothing on this road will ever ask more than this. */
export const PRICE_CAP = 8.99;
/** The market itself stops here, leaving room for the local variation. */
const MARKET_CAP = 8.0;
/** Overnight moves: a dime to thirty cents, occasionally a nastier jump. */
const HIKE_MIN = 0.08;
const HIKE_SPREAD = 0.22;
const SPIKE_CHANCE = 0.18;
const SPIKE_MIN = 0.12;
const SPIKE_SPREAD = 0.25;

/**
 * One market price for the whole highway, so every pump moves together and
 * stations only differ by a few cents. It only ever moves overnight.
 */
let market = BASE_PRICE;

export function marketPrice() {
  return market;
}

export function resetMarket() {
  market = BASE_PRICE;
}

/**
 * A night's worth of price movement, applied to every station at once.
 * @returns {{before:number, after:number, delta:number}}
 */
export function overnightHike() {
  const before = market;
  let delta = HIKE_MIN + Math.random() * HIKE_SPREAD;
  if (Math.random() < SPIKE_CHANCE) {
    delta += SPIKE_MIN + Math.random() * SPIKE_SPREAD;
  }
  market = Math.min(MARKET_CAP, market + delta);
  return { before, after: market, delta: market - before };
}

/** A few cents either way, fixed per station so the same pump keeps its rank. */
function localVariation(index) {
  return hashRand(index, 401) * 0.18 - 0.09;
}

/** Hauling fuel further out costs a little more, capped so it stays subtle. */
function remoteness(index) {
  return Math.min(0.9, (stationDistance(index) / 1000) * 0.02);
}

/** What this station charges per gallon right now. */
export function fuelPricePerGallon(index) {
  return Math.min(PRICE_CAP, market + remoteness(index) + localVariation(index));
}

/** Price per litre, which is what the pump actually charges. */
export function fuelPricePerLitre(index) {
  return fuelPricePerGallon(index) / LITRES_PER_GALLON;
}

/** Half length of the refuelling zone, measured along the road. */
export const ZONE_HALF = 28;
const ZONE_INNER = EDGE - 1.5;
const ZONE_OUTER = EDGE + 26;

/** US motorist-service signs (gas, food, lodging) are blue, not green. */
export const SERVICE_BLUE = '#0b4a8f';

const distances = [FIRST_STATION];

/** Distance along the track of station `i` (0 based), memoised. */
export function stationDistance(i) {
  while (distances.length <= i) {
    const k = distances.length - 1;
    distances.push(
      distances[k] + MIN_GAP + Math.round(hashRand(k, 77) * GAP_SPREAD)
    );
  }
  return distances[i];
}

/** Index of the first station at or beyond `s`. */
export function nextStationIndex(s) {
  let i = 0;
  while (stationDistance(i) < s - ZONE_HALF) i++;
  return i;
}

/* ------------------------------------------------------------------ */
/* Model                                                               */
/* ------------------------------------------------------------------ */

const MATS = {};
function materials() {
  if (MATS.ready) return MATS;
  const concrete = concreteTexture();
  MATS.concrete = new THREE.MeshStandardMaterial({
    map: concrete,
    color: '#d8cdb6', // warmed up so it does not read blue under the sky light
    roughness: 0.95,
  });
  MATS.white = new THREE.MeshStandardMaterial({
    color: '#efe9dc',
    roughness: 0.55,
    metalness: 0.1,
  });
  MATS.red = new THREE.MeshStandardMaterial({
    color: '#c62d24',
    roughness: 0.5,
    metalness: 0.15,
  });
  MATS.steel = new THREE.MeshStandardMaterial({
    color: '#8d9198',
    roughness: 0.42,
    metalness: 0.85,
  });
  MATS.dark = new THREE.MeshStandardMaterial({
    color: '#2a2b2f',
    roughness: 0.7,
  });
  MATS.glass = new THREE.MeshPhysicalMaterial({
    color: '#9fc4d8',
    roughness: 0.08,
    metalness: 0,
    transmission: 0.55,
    transparent: true,
    opacity: 0.55,
  });
  MATS.lightPanel = glowAtNight(
    new THREE.MeshStandardMaterial({
      color: '#e7ded0',
      emissive: '#ffe9bd',
      emissiveIntensity: 0.28,
      roughness: 0.5,
    }),
    1.35
  );
  MATS.stucco = new THREE.MeshStandardMaterial({
    color: '#d9c7a4',
    roughness: 0.95,
  });
  MATS.ready = true;
  return MATS;
}

function box(w, h, d, mat, x, y, z, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** One fuel pump: body, screen, hose and nozzle. */
function buildPump(mat) {
  const g = new THREE.Group();
  const body = box(0.7, 1.75, 0.5, mat.white, 0, 0.87, 0);
  g.add(body);
  g.add(box(0.74, 0.2, 0.54, mat.red, 0, 1.78, 0));
  const screen = box(0.5, 0.42, 0.06, mat.dark, 0, 1.3, 0.27);
  g.add(screen);
  const readout = box(0.42, 0.3, 0.02, mat.lightPanel, 0, 1.3, 0.31);
  g.add(readout);
  // Nozzle holster and a slack hose looping down to the body.
  for (const side of [-1, 1]) {
    g.add(box(0.14, 0.34, 0.16, mat.dark, side * 0.42, 1.0, 0.12));
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(side * 0.42, 1.0, 0.12),
      new THREE.Vector3(side * 0.62, 0.55, 0.25),
      new THREE.Vector3(side * 0.36, 0.3, 0.05),
      new THREE.Vector3(side * 0.3, 0.62, -0.1),
    ]);
    const hose = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 18, 0.035, 6, false),
      mat.dark
    );
    hose.castShadow = true;
    g.add(hose);
  }
  return g;
}

/** The texts painted on a station's signage, in the current language. */
function totemTexture() {
  return signTexture([t('sign.totem1'), t('sign.totem2')], { bg: '#c8382f' });
}

/** Repaints a totem's price board, disposing the texture it replaces. */
function setPriceBoard(mesh, index) {
  const previous = mesh.material.map;
  const art = priceBoardTexture(fuelPricePerGallon(index));
  mesh.material.map = art;
  mesh.material.emissiveMap = art;
  mesh.material.needsUpdate = true;
  if (previous) previous.dispose();
}

function buildStationModel(index) {
  const mat = materials();
  const root = new THREE.Group();

  // Concrete apron. Local -Z is "up the road", +X is away from the tarmac.
  // A slab rather than a plane, so its edge reads as a kerb on the sand.
  const apron = new THREE.Mesh(new THREE.BoxGeometry(34, 0.34, 74), mat.concrete);
  apron.position.set(14, -0.15, 0);
  apron.receiveShadow = true;
  root.add(apron);

  // Canopy over two pump islands.
  const canopy = new THREE.Group();
  canopy.position.set(11, 0, 0);
  root.add(canopy);
  const roof = box(15, 0.75, 22, mat.white, 0, 6.2, 0);
  canopy.add(roof);
  canopy.add(box(15.3, 0.42, 22.3, mat.red, 0, 5.72, 0));
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 21.2), mat.lightPanel);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 5.5, 0);
  canopy.add(ceiling);
  for (const px of [-5.6, 5.6]) {
    for (const pz of [-8.5, 8.5]) {
      canopy.add(box(0.7, 5.6, 0.7, mat.steel, px, 2.8, pz));
    }
  }

  // Two islands, two pumps each.
  for (const iz of [-5.5, 5.5]) {
    const island = box(3.4, 0.22, 7.5, mat.concrete, 11, 0.13, iz);
    root.add(island);
    for (const pz of [-1.8, 1.8]) {
      const pump = buildPump(mat);
      pump.position.set(11, 0.24, iz + pz);
      pump.rotation.y = Math.PI / 2;
      root.add(pump);
    }
  }

  // Store building set back from the pumps.
  const store = new THREE.Group();
  store.position.set(25.5, 0, -4);
  root.add(store);
  store.add(box(11, 4.2, 15, mat.stucco, 0, 2.1, 0));
  store.add(box(11.6, 0.6, 15.6, mat.red, 0, 4.4, 0));
  const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 2.4), mat.glass);
  glassFront.rotation.y = -Math.PI / 2;
  glassFront.position.set(-5.55, 2.2, 0);
  store.add(glassFront);
  store.add(box(0.25, 2.6, 1.3, mat.dark, -5.5, 1.3, 4.2));
  store.add(box(1.6, 0.9, 1.6, mat.steel, 2, 5.1, -3));
  store.add(box(1.2, 1.6, 0.9, mat.white, -6.3, 0.8, -5.5)); // ice box
  const awning = box(2.2, 0.16, 15, mat.red, -6.4, 4.0, 0);
  store.add(awning);

  // Roadside totem sign.
  const sign = new THREE.Group();
  sign.position.set(2.2, 0, 20);
  root.add(sign);
  sign.add(box(0.55, 9, 0.55, mat.steel, 0, 4.5, 0));
  const faceMaterial = () => {
    const art = totemTexture();
    return glowAtNight(
      new THREE.MeshStandardMaterial({
        map: art,
        emissiveMap: art,
        emissive: '#8a4a3a',
        emissiveIntensity: 0.35,
        roughness: 0.6,
      }),
      1.5
    );
  };
  const totemFaces = [faceMaterial(), faceMaterial()];
  // Faces up and down the highway, not across it, so drivers can read it.
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(4.2, 4.2, 0.35),
    [mat.white, mat.white, mat.white, mat.white, ...totemFaces]
  );
  face.position.set(0, 9.5, 0);
  face.castShadow = true;
  sign.add(face);
  const priceArt = priceBoardTexture(fuelPricePerGallon(index));
  const price = new THREE.Mesh(
    new THREE.BoxGeometry(3.6, 2.0, 0.3),
    glowAtNight(
      new THREE.MeshStandardMaterial({
        map: priceArt,
        emissiveMap: priceArt,
        emissive: '#ffe9bd',
        emissiveIntensity: 0.1,
        roughness: 0.7,
      }),
      1.4
    )
  );
  price.position.set(0, 6.2, 0);
  sign.add(price);

  // Kept so the signage can be repainted when the language or price changes.
  root.userData.signs = { totemFaces, price };

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = o.castShadow ?? true;
      o.receiveShadow = true;
    }
  });
  return root;
}

/** "FUEL 500 M" board planted a few hundred metres before each station. */
function buildAdvanceSign() {
  const mat = materials();
  const g = new THREE.Group();
  g.add(box(0.16, 3.2, 0.16, mat.steel, -0.9, 1.6, 0));
  g.add(box(0.16, 3.2, 0.16, mat.steel, 0.9, 1.6, 0));
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(3.2, 2.2, 0.16),
    new THREE.MeshStandardMaterial({
      map: boardTexture(t('sign.advance'), t('sign.advanceSub'), SERVICE_BLUE),
      roughness: 0.65,
    })
  );
  board.position.set(0, 4.0, 0);
  board.castShadow = true;
  g.add(board);
  g.userData.board = board;
  return g;
}

/* ------------------------------------------------------------------ */
/* Pool                                                                */
/* ------------------------------------------------------------------ */

export class GasStations {
  constructor(scene) {
    this.slots = [];
    for (let i = 0; i < 3; i++) {
      const model = buildStationModel(i);
      const advance = buildAdvanceSign();
      model.visible = false;
      advance.visible = false;
      scene.add(model, advance);
      this.slots.push({ index: -1, model, advance });
    }
    this.tmp = { x: 0, y: 0, z: 0 };
  }

  /** Repaints every roadside sign after a language change. */
  retranslate() {
    for (const slot of this.slots) {
      const signs = slot.model.userData.signs;
      for (const m of signs.totemFaces) {
        const art = totemTexture();
        if (m.map) m.map.dispose();
        m.map = art;
        m.emissiveMap = art;
        m.needsUpdate = true;
      }
      const board = slot.advance.userData.board;
      board.material.map = boardTexture(
        t('sign.advance'),
        t('sign.advanceSub'),
        SERVICE_BLUE
      );
      board.material.needsUpdate = true;
    }
  }

  /** Repaints every visible price board — call it after an overnight hike. */
  refreshPrices() {
    for (const slot of this.slots) {
      if (slot.index < 0) continue;
      setPriceBoard(slot.model.userData.signs.price, slot.index);
    }
  }

  /** Keeps the three nearest stations built and positioned. */
  update(playerS) {
    const base = Math.max(0, nextStationIndex(playerS) - 1);
    for (let k = 0; k < this.slots.length; k++) {
      const slot = this.slots[k];
      const index = base + k;
      if (slot.index === index) continue;
      slot.index = index;
      // Each slot shows whichever station it is standing in for.
      setPriceBoard(slot.model.userData.signs.price, index);
      const s = stationDistance(index);
      const p = roadPoint(s, 0, this.tmp);
      slot.model.position.set(p.x, terrainHeight(s, EDGE + 10) + 0.06, p.z);
      slot.model.rotation.y = roadYaw(s);
      slot.model.visible = true;

      const sa = Math.max(20, s - 500);
      const pa = roadPoint(sa, EDGE + 3.5, this.tmp);
      slot.advance.position.set(pa.x, terrainHeight(sa, EDGE + 3.5), pa.z);
      slot.advance.rotation.y = roadYaw(sa) + 0.22;
      slot.advance.visible = true;
    }
  }

  /**
   * Returns the station index the car is currently parked at, or -1.
   * The car has to be off the tarmac, on the apron, beside the pumps.
   */
  zoneAt(s, lateral) {
    if (lateral < ZONE_INNER || lateral > ZONE_OUTER) return -1;
    for (const slot of this.slots) {
      if (slot.index < 0) continue;
      if (Math.abs(stationDistance(slot.index) - s) <= ZONE_HALF) {
        return slot.index;
      }
    }
    return -1;
  }
}
