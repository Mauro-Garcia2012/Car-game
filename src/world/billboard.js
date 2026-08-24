/**
 * The one billboard on the road, and the one thing it says.
 *
 * The desert thins out as you drive (`difficulty.js`), and a car straight out
 * of the garage eventually cannot reach the next pump — but that happens
 * gradually and a long way from where you could have done anything about it.
 * By the time the gauge tells you, you are between stations.
 *
 * So there is a sign, and it is enormous, and it stands where the margin is
 * still comfortable rather than where the trouble starts. Measured over eight
 * seeds: at kilometre ninety the worst gap in the following sixty kilometres
 * is about 4.4 km, against 6.0 km of range for the thirstiest car in the
 * garage with a passenger and a load aboard — a margin of about 28%. Past
 * roughly kilometre 260 that margin is down to 16%, and past 1,400 there are
 * gaps that car cannot cross at all. One jerry can, three hundred and forty
 * dollars at any pump, closes every one of them.
 *
 * It is not a hint system and there is nothing else like it out here. It is
 * one board, at one place, saying one thing.
 */
import * as THREE from 'three';
import { roadPoint, roadYaw, EDGE } from '../track.js';
import { groundHeight } from './road.js';
import { billboardTexture } from '../textures.js';
import { signBoard, setBoardFace, behindBoard } from './boards.js';
import { t, onLanguageChange } from '../i18n.js';
import { glowAtNight } from './nightlights.js';
import { onReseed } from '../rng.js';

/** Where it stands. See the note above for why it is here and not further on. */
export const BILLBOARD_S = 90000;
/**
 * How far off the centre line, and how big.
 *
 * The first cut was 24 m wide and measured 103 pixels across from 130 m out
 * on a 96-degree horizontal view, which is a sign you can see and not a sign
 * you can read. This one is 48 by 16 — the size of the ones outside Las
 * Vegas, and about three hundred pixels from the same place.
 */
// Left-hand side, because the telegraph poles march down the right and one
// of them stood straight through the headline.
const LATERAL = -(EDGE + 30);
const BOARD_W = 48;
const BOARD_H = 16;
const BOARD_Y = 19;
/** Built and shown within this much of it; there is only ever the one. */
const IN_RANGE = 2600;

function face() {
  return billboardTexture([
    t('sign.tank1'),
    t('sign.tank2'),
    t('sign.tank3'),
    t('sign.tank4'),
  ]);
}

function buildBillboard() {
  const g = new THREE.Group();
  const steel = new THREE.MeshStandardMaterial({
    color: '#7d7a72',
    metalness: 0.6,
    roughness: 0.6,
  });
  const trim = new THREE.MeshStandardMaterial({ color: '#8f3a2c', roughness: 0.8 });
  const box = (w, h, d, mat, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    m.castShadow = true;
    g.add(m);
    return m;
  };

  const DEPTH = 0.7;
  const board = signBoard(
    BOARD_W,
    BOARD_H,
    DEPTH,
    glowAtNight(
      new THREE.MeshStandardMaterial({
        map: face(),
        emissiveMap: face(),
        emissive: '#ffffff',
        emissiveIntensity: 0.12,
        roughness: 0.85,
      }),
      0.7
    ),
    new THREE.MeshStandardMaterial({ color: '#6d7278', roughness: 0.85 })
  );
  board.position.set(0, BOARD_Y, 0);
  g.add(board);
  g.userData.board = board;

  // A frame round the face and a catwalk under it, which is what makes a
  // billboard read as a billboard rather than a wall.
  box(BOARD_W + 1.4, 0.85, 1.0, trim, 0, BOARD_Y + BOARD_H / 2 + 0.35, 0);
  box(BOARD_W + 1.4, 0.85, 1.0, trim, 0, BOARD_Y - BOARD_H / 2 - 0.35, 0);
  box(1.0, BOARD_H + 1.7, 1.0, trim, -BOARD_W / 2 - 0.35, BOARD_Y, 0);
  box(1.0, BOARD_H + 1.7, 1.0, trim, BOARD_W / 2 + 0.35, BOARD_Y, 0);
  box(BOARD_W, 0.24, 2.4, steel, 0, BOARD_Y - BOARD_H / 2 - 1.2, 1.1);
  for (let i = 0; i <= 20; i++) {
    box(0.12, 1.3, 0.12, steel, -BOARD_W / 2 + i * (BOARD_W / 20), BOARD_Y - BOARD_H / 2 - 0.6, 2.1);
  }
  box(BOARD_W, 0.12, 0.12, steel, 0, BOARD_Y - BOARD_H / 2 + 0.05, 2.1);
  // Floodlights on gooseneck arms, the way the big ones are lit.
  for (const x of [-BOARD_W * 0.3, 0, BOARD_W * 0.3]) {
    box(0.16, 0.16, 2.6, steel, x, BOARD_Y - BOARD_H / 2 - 1.6, 2.1);
    box(1.1, 0.6, 0.7, steel, x, BOARD_Y - BOARD_H / 2 - 1.5, 3.3);
  }

  // Two lattice legs, behind the face where they belong.
  const legZ = behindBoard(DEPTH, 2.2);
  const legTop = BOARD_Y + BOARD_H / 2;
  for (const x of [-BOARD_W * 0.26, BOARD_W * 0.26]) {
    for (const dx of [-0.9, 0.9]) {
      box(0.42, legTop, 0.42, steel, x + dx, legTop / 2, legZ);
      box(0.42, legTop, 0.42, steel, x + dx, legTop / 2, legZ - 1.8);
    }
    for (let y = 1.8; y < legTop; y += 2.6) {
      box(2.2, 0.18, 0.18, steel, x, y, legZ);
      box(2.2, 0.18, 0.18, steel, x, y, legZ - 1.8);
      box(2.9, 0.15, 0.15, steel, x, y + 1.3, legZ, 0.66);
      box(2.9, 0.15, 0.15, steel, x, y + 1.3, legZ - 1.8, -0.66);
      box(0.15, 0.15, 2.0, steel, x - 0.9, y, legZ - 0.9);
      box(0.15, 0.15, 2.0, steel, x + 0.9, y, legZ - 0.9);
    }
    box(3.2, 0.6, 3.2, steel, x, 0.3, legZ - 0.9);
  }
  // And a brace out to the ground, because that much sail needs one.
  box(0.36, 26, 0.36, steel, BOARD_W * 0.26, 11.5, legZ - 7.5, 0);
  box(0.36, 26, 0.36, steel, -BOARD_W * 0.26, 11.5, legZ - 7.5, 0);

  return g;
}

export class Billboard {
  constructor(scene) {
    this.model = buildBillboard();
    this.model.visible = false;
    this.placed = false;
    scene.add(this.model);
    onLanguageChange(() => setBoardFace(this.model.userData.board, face()));
    // A new seed bends the road under it. Registered after the model exists:
    // onReseed calls straight back the moment you hand it a listener.
    onReseed(() => this.reset());
  }

  /** Puts it up once, and shows it only when it is worth drawing. */
  update(playerS) {
    if (!this.placed) {
      const p = roadPoint(BILLBOARD_S, LATERAL);
      this.model.position.set(p.x, groundHeight(BILLBOARD_S, LATERAL), p.z);
      // Angled at the traffic coming up the road, the way they always are.
      this.model.rotation.y = roadYaw(BILLBOARD_S) - 0.26;
      this.placed = true;
    }
    this.model.visible = Math.abs(playerS - BILLBOARD_S) < IN_RANGE;
  }

  /** A new seed moves the road under it, so it has to be put up again. */
  reset() {
    this.placed = false;
  }
}
