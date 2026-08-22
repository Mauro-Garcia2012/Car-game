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
import { hashRand, onReseed } from '../rng.js';
import {
  concreteTexture,
  pumpBoardTexture,
  priceBoardTexture,
} from '../textures.js';
import { t } from '../i18n.js';
import { groundHeight } from './road.js';
import { signBoard, setBoardFace, behindBoard } from './boards.js';

const FIRST_STATION = 1500;
const MIN_GAP = 1950;
const GAP_SPREAD = 520;

/** Litres in a US gallon, for the pump price. */

/* ------------------------------------------------------------------ */
/* The price of gas                                                    */
/* ------------------------------------------------------------------ */

/**
 * Everything here is per litre, which is what the pump charges and what the
 * boards show. It used to be quoted per gallon internally and converted on
 * the way out, which meant two units in play and only one of them visible.
 */
/** Where the market opens. */
const BASE_PRICE = 1.13;
/** Nothing on this road will ever ask more than this. */
export const PRICE_CAP = 2.37;
/** The market itself stops here, leaving room for the local variation. */
const MARKET_CAP = 2.11;
/** Overnight moves: two to eight cents, occasionally a nastier jump. */
const HIKE_MIN = 0.021;
const HIKE_SPREAD = 0.058;
const SPIKE_CHANCE = 0.18;
const SPIKE_MIN = 0.032;
const SPIKE_SPREAD = 0.066;

/**
 * One market price for the whole highway, so every pump moves together and
 * stations only differ by a few cents. It only ever moves overnight.
 */
let market = BASE_PRICE;

export function marketPrice() {
  return market;
}

/** Puts the market back where a saved run left it. */
export function setMarketPrice(value) {
  if (Number.isFinite(value)) market = Math.min(MARKET_CAP, Math.max(BASE_PRICE * 0.5, value));
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
  return hashRand(index, 401) * 0.048 - 0.024;
}

/** Hauling fuel further out costs a little more, capped so it stays subtle. */
function remoteness(index) {
  return Math.min(0.238, (stationDistance(index) / 1000) * 0.0053);
}

/** What this station charges per litre right now. */
export function fuelPricePerLitre(index) {
  return Math.min(PRICE_CAP, market + remoteness(index) + localVariation(index));
}

/** Half length of the refuelling zone, measured along the road. */
export const ZONE_HALF = 28;
const ZONE_INNER = EDGE - 1.5;
const ZONE_OUTER = EDGE + 26;

/** US motorist-service signs (gas, food, lodging) are blue, not green. */
export const SERVICE_BLUE = '#0b4a8f';

// The spacing is memoised as it is walked, so a new seed has to throw the
// list away or every run keeps the first run's pumps. The opening station
// moves too, or every road would begin identically however different the
// rest of it is.
const distances = [FIRST_STATION];
onReseed(() => {
  distances.length = 1;
  distances[0] = FIRST_STATION + Math.round((hashRand(4001, 5) - 0.5) * 440);
});

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

/**
 * The pylon's brand panel: the pump pictogram over the one word that is not
 * the word "fuel". The cabinet is 4.46 x 4.06, and the glyph is drawn to
 * match so it does not come out squashed.
 */
const TOTEM_ASPECT = 4.46 / 4.06;
function totemTexture() {
  return pumpBoardTexture(t('sign.totemStop'), {
    bg: '#c8382f',
    aspect: TOTEM_ASPECT,
  });
}

/** Repaints a totem's price board, disposing the texture it replaces. */
function setPriceBoard(board, index) {
  const previous = board.material.map;
  const art = priceBoardTexture(fuelPricePerLitre(index));
  board.material.map = art;
  board.material.emissiveMap = art;
  board.material.needsUpdate = true;
  if (previous) previous.dispose();
}

/** How far off the centre line the pylon stands: past the shoulder. */
const TOTEM_LATERAL = 11.5;

/**
 * The pylon sign you read from a kilometre out: brand cabinet on top, price
 * board under it, both mounted on a single tapered column.
 *
 * The cabinets are deeper than the column, so it disappears inside them
 * instead of splitting the digits in half, and the lit faces are separate
 * panels inset into a dark bezel rather than painted straight onto a box —
 * which is what makes it read as a sign rather than a billboard on a stick.
 */
function buildTotem(mat, index) {
  const sign = new THREE.Group();

  // Concrete footing.
  const plinth = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.5, 0.7, 20),
    mat.concrete
  );
  plinth.position.y = 0.35;
  plinth.castShadow = true;
  plinth.receiveShadow = true;
  sign.add(plinth);

  // Tapered column, with a collar where it meets the footing.
  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.34, 0.52, 12.6, 24),
    mat.steel
  );
  column.position.y = 6.3;
  column.castShadow = true;
  sign.add(column);
  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.62, 0.28, 20),
    mat.dark
  );
  collar.position.y = 0.84;
  sign.add(collar);

  /**
   * One lit cabinet: a dark bezel with a glowing panel inset in each face.
   * @returns {{group:THREE.Group, faces:THREE.MeshStandardMaterial[]}}
   */
  const cabinet = (w, h, y, faceMaterial) => {
    const group = new THREE.Group();
    group.position.y = y;
    const depth = 0.95; // wider than the column, which hides inside it
    group.add(box(w, h, depth, mat.dark, 0, 0, 0));
    const faces = [];
    for (const side of [1, -1]) {
      const m = faceMaterial();
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w - 0.34, h - 0.34),
        m
      );
      panel.position.z = (side * depth) / 2 + side * 0.012;
      if (side < 0) panel.rotation.y = Math.PI;
      group.add(panel);
      faces.push(m);
    }
    // A lip round the panel, so the bezel catches the light.
    for (const [dx, dy, bw, bh] of [
      [0, h / 2 - 0.09, w, 0.18],
      [0, -h / 2 + 0.09, w, 0.18],
      [-w / 2 + 0.09, 0, 0.18, h],
      [w / 2 - 0.09, 0, 0.18, h],
    ]) {
      group.add(box(bw, bh, depth + 0.1, mat.steel, dx, dy, 0));
    }
    sign.add(group);
    return faces;
  };

  const brandFace = () => {
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
  const totemFaces = cabinet(4.8, 4.4, 12.9, brandFace);

  // One material shared by both price panels: they always agree, and the
  // price repaint only has to touch a single texture.
  const priceArt = priceBoardTexture(fuelPricePerLitre(index));
  const priceMaterial = glowAtNight(
    new THREE.MeshStandardMaterial({
      map: priceArt,
      emissiveMap: priceArt,
      emissive: '#ffe9bd',
      emissiveIntensity: 0.1,
      roughness: 0.7,
    }),
    1.4
  );
  cabinet(4.4, 2.5, 9.3, () => priceMaterial);
  const price = { material: priceMaterial };

  sign.userData = { totemFaces, price };
  return sign;
}

function buildStationModel(index) {
  const mat = materials();
  const root = new THREE.Group();

  // Concrete apron. Local -Z is "up the road", +X is away from the tarmac.
  // A slab rather than a plane, so its edge reads as a kerb on the sand.
  // The apron starts past the shoulder. At 34 m wide centred on x = 14 its
  // inner edge landed at x = -3, which is inside the tarmac — and since the
  // station's height comes off ground seventeen metres away, that lip could
  // sit above the road as easily as below it.
  const apron = new THREE.Mesh(new THREE.BoxGeometry(26, 0.34, 74), mat.concrete);
  apron.position.set(20.5, -0.15, 0);
  apron.receiveShadow = true;
  root.add(apron);

  // Canopy over two pump islands.
  const canopy = new THREE.Group();
  canopy.position.set(11, 0, 0);
  root.add(canopy);
  canopy.add(box(15, 0.75, 22, mat.white, 0, 6.2, 0));
  // Fascia band, chamfered top and bottom so the edge catches a highlight
  // instead of reading as one flat slab.
  canopy.add(box(15.3, 0.42, 22.3, mat.red, 0, 5.72, 0));
  for (const [y, inset] of [[5.99, 0.16], [5.45, 0.16]]) {
    canopy.add(box(15.3 - inset, 0.14, 22.3 - inset, mat.red, 0, y, 0));
  }
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 21.2), mat.lightPanel);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, 5.5, 0);
  canopy.add(ceiling);
  // Light troughs across the soffit.
  for (let i = -4; i <= 4; i++) {
    canopy.add(box(13.6, 0.1, 0.36, mat.dark, 0, 5.56, i * 2.3));
  }
  // Columns: a round post on a square base with a collar at the head.
  for (const px of [-5.6, 5.6]) {
    for (const pz of [-8.5, 8.5]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.34, 0.38, 5.6, 16),
        mat.steel
      );
      post.position.set(px, 2.8, pz);
      post.castShadow = true;
      post.receiveShadow = true;
      canopy.add(post);
      canopy.add(box(0.95, 0.3, 0.95, mat.concrete, px, 0.15, pz));
      canopy.add(box(0.78, 0.22, 0.78, mat.steel, px, 5.45, pz));
      // Rubber guard round the foot: every forecourt column has one.
      const guard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.46, 0.5, 0.85, 14),
        mat.dark
      );
      guard.position.set(px, 0.72, pz);
      canopy.add(guard);
    }
  }

  // Two islands, two pumps each.
  for (const iz of [-5.5, 5.5]) {
    const island = box(3.4, 0.22, 7.5, mat.concrete, 11, 0.13, iz);
    root.add(island);
    // Painted kerb edge and a bollard at each end.
    for (const side of [-1, 1]) {
      root.add(box(0.14, 0.26, 7.5, mat.white, 11 + side * 1.7, 0.13, iz));
      const bollard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.15, 1.1, 12),
        mat.red
      );
      bollard.position.set(11, 0.79, iz + side * 3.4);
      bollard.castShadow = true;
      root.add(bollard);
    }
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
  store.add(box(11.3, 0.16, 15.3, mat.white, 0, 4.02, 0)); // coping under it
  // Pilasters down the flanks, so the walls are not bare rectangles.
  for (const pz of [-6.4, -2.1, 2.1, 6.4]) {
    store.add(box(0.3, 4.2, 0.7, mat.white, -5.5, 2.1, pz));
  }
  // Roof plant and a vent stack.
  store.add(box(2.2, 0.7, 1.7, mat.steel, -1.2, 5.0, 3.4));
  const stack = new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 1.3, 12),
    mat.steel
  );
  stack.position.set(3.2, 5.3, 4.6);
  store.add(stack);
  const glassFront = new THREE.Mesh(new THREE.PlaneGeometry(12.5, 2.4), mat.glass);
  glassFront.rotation.y = -Math.PI / 2;
  glassFront.position.set(-5.55, 2.2, 0);
  store.add(glassFront);
  store.add(box(0.25, 2.6, 1.3, mat.dark, -5.5, 1.3, 4.2));
  store.add(box(1.6, 0.9, 1.6, mat.steel, 2, 5.1, -3));
  store.add(box(1.2, 1.6, 0.9, mat.white, -6.3, 0.8, -5.5)); // ice box
  const awning = box(2.2, 0.16, 15, mat.red, -6.4, 4.0, 0);
  store.add(awning);

  // Roadside pylon sign. It stands out on the apron, well clear of the
  // tarmac, and the pole runs up behind the cabinets rather than through
  // them — the two things that were wrong with the last one.
  const sign = buildTotem(mat, index);
  sign.position.set(TOTEM_LATERAL, 0, 20);
  root.add(sign);
  const { totemFaces, price } = sign.userData;

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

/** The pump pictogram over "500 M", on the blue every service sign uses. */
const ADVANCE_ASPECT = 3.2 / 2.2;
function advanceTexture() {
  return pumpBoardTexture(t('sign.advanceSub'), {
    bg: SERVICE_BLUE,
    aspect: ADVANCE_ASPECT,
  });
}

/** The board planted a few hundred metres before each station. */
function buildAdvanceSign() {
  const mat = materials();
  const g = new THREE.Group();
  const DEPTH = 0.16;
  // Posts stand behind the board, on the side the traffic never sees.
  const postZ = behindBoard(DEPTH, 0.16);
  g.add(box(0.16, 3.2, 0.16, mat.steel, -0.9, 1.6, postZ));
  g.add(box(0.16, 3.2, 0.16, mat.steel, 0.9, 1.6, postZ));
  const board = signBoard(
    3.2,
    2.2,
    DEPTH,
    new THREE.MeshStandardMaterial({
      map: advanceTexture(),
      roughness: 0.65,
    }),
    new THREE.MeshStandardMaterial({ color: '#6d7278', roughness: 0.7 })
  );
  board.position.set(0, 4.0, 0);
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

    // A new seed moves every station; forget which one each slot held.
    onReseed(() => {
      for (const slot of this.slots) slot.index = null;
    });
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
      setBoardFace(slot.advance.userData.board, advanceTexture());
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
      if (slot.index === index) continue;  // (cleared on reseed)
      slot.index = index;
      // Each slot shows whichever station it is standing in for.
      setPriceBoard(slot.model.userData.signs.price, index);
      const s = stationDistance(index);
      const p = roadPoint(s, 0, this.tmp);
      slot.model.position.set(p.x, groundHeight(s, EDGE + 10) + 0.06, p.z);
      slot.model.rotation.y = roadYaw(s);
      slot.model.visible = true;

      const sa = Math.max(20, s - 500);
      const pa = roadPoint(sa, EDGE + 3.5, this.tmp);
      slot.advance.position.set(pa.x, groundHeight(sa, EDGE + 3.5), pa.z);
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
