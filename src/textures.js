/**
 * Every texture in the game is painted procedurally on a <canvas>, so the
 * repository stays asset free and the game loads instantly and offline.
 */
import * as THREE from 'three';
import { ROAD_HALF, EDGE } from './track.js';

const cache = new Map();

function canvas(
  size,
  draw,
  { repeat = [1, 1], srgb = true, aniso = 8, height = null } = {}
) {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = height ?? size;
  const ctx = c.getContext('2d');
  draw(ctx, size, c.height);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat[0], repeat[1]);
  tex.anisotropy = aniso;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

function memo(key, factory) {
  if (!cache.has(key)) cache.set(key, factory());
  return cache.get(key);
}

/** Fills the canvas with grainy noise on top of a base colour. */
function grain(ctx, size, base, amount, scale = 1) {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = (y * size + x) * 4;
      // Two octaves of blocky noise reads as gravel at driving speed.
      const n =
        (Math.random() - 0.5) * amount +
        (Math.random() - 0.5) * amount * 0.6 * scale;
      d[i] = Math.min(255, Math.max(0, d[i] + n));
      d[i + 1] = Math.min(255, Math.max(0, d[i + 1] + n));
      d[i + 2] = Math.min(255, Math.max(0, d[i + 2] + n));
    }
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * Tarmac. U spans the full road + shoulders, V repeats every 16 m, and the
 * lane markings are baked in so they follow every curve for free.
 */
export function asphaltTexture() {
  return memo('asphalt', () =>
    canvas(
      1024,
      (ctx, size) => {
        const px = size / (EDGE * 2); // pixels per metre across the road
        grain(ctx, size, '#3a3a3c', 46);

        // Patches of older, lighter tarmac.
        ctx.globalAlpha = 0.18;
        for (let i = 0; i < 40; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#4a4a4c' : '#2e2e30';
          const w = 40 + Math.random() * 200;
          const h = 20 + Math.random() * 120;
          ctx.beginPath();
          ctx.ellipse(
            Math.random() * size,
            Math.random() * size,
            w / 2,
            h / 2,
            Math.random() * Math.PI,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Gravel shoulders.
        const shoulderPx = (EDGE - ROAD_HALF) * px;
        const shoulder = ctx.createLinearGradient(0, 0, shoulderPx, 0);
        shoulder.addColorStop(0, '#9c7f56');
        shoulder.addColorStop(1, '#5d5346');
        ctx.fillStyle = shoulder;
        ctx.fillRect(0, 0, shoulderPx, size);
        ctx.save();
        ctx.translate(size, 0);
        ctx.scale(-1, 1);
        ctx.fillStyle = shoulder;
        ctx.fillRect(0, 0, shoulderPx, size);
        ctx.restore();

        // Grit on the shoulders.
        ctx.globalAlpha = 0.5;
        for (let i = 0; i < 2200; i++) {
          const side = Math.random() < 0.5;
          const x = side
            ? Math.random() * shoulderPx
            : size - Math.random() * shoulderPx;
          ctx.fillStyle = Math.random() > 0.5 ? '#c6a877' : '#4a4136';
          ctx.fillRect(x, Math.random() * size, 2, 2);
        }
        ctx.globalAlpha = 1;

        // Solid white edge lines.
        ctx.fillStyle = '#e8e3d6';
        const edgeW = 0.14 * px;
        ctx.fillRect(shoulderPx + 0.35 * px, 0, edgeW, size);
        ctx.fillRect(size - shoulderPx - 0.35 * px - edgeW, 0, edgeW, size);

        // Double yellow centre line, dashed on one side.
        ctx.fillStyle = '#e0b93a';
        const cw = 0.13 * px;
        ctx.fillRect(size / 2 - 0.22 * px - cw, 0, cw, size);
        const dash = size / 4;
        for (let i = 0; i < 4; i++) {
          ctx.fillRect(size / 2 + 0.22 * px, i * dash, cw, dash * 0.62);
        }

        // Worn tyre tracks in each lane.
        ctx.globalAlpha = 0.1;
        ctx.fillStyle = '#1d1d1f';
        for (const lane of [-1, 1]) {
          for (const t of [-0.8, 0.8]) {
            const x = size / 2 + (lane * 2.4 + t) * px;
            ctx.fillRect(x - 0.5 * px, 0, 1 * px, size);
          }
        }
        ctx.globalAlpha = 1;
      },
      { repeat: [1, 1] }
    )
  );
}

/** Desert sand / hardpack. */
export function sandTexture() {
  return memo('sand', () =>
    canvas(
      512,
      (ctx, size) => {
        grain(ctx, size, '#c9a06a', 34);
        ctx.globalAlpha = 0.25;
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#b98b55' : '#dcb884';
          ctx.beginPath();
          ctx.ellipse(
            Math.random() * size,
            Math.random() * size,
            10 + Math.random() * 90,
            6 + Math.random() * 30,
            Math.random() * Math.PI,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.globalAlpha = 0.55;
        for (let i = 0; i < 900; i++) {
          ctx.fillStyle = ['#8a6b43', '#e6cba0', '#a1794c'][
            (Math.random() * 3) | 0
          ];
          const r = 1 + Math.random() * 2.5;
          ctx.fillRect(Math.random() * size, Math.random() * size, r, r);
        }
        ctx.globalAlpha = 1;
      },
      { repeat: [40, 40] }
    )
  );
}

/** Poured concrete for the gas station apron. */
export function concreteTexture() {
  return memo('concrete', () =>
    canvas(
      512,
      (ctx, size) => {
        grain(ctx, size, '#b3ada1', 22);
        ctx.strokeStyle = 'rgba(70,66,60,0.55)';
        ctx.lineWidth = 3;
        for (let i = 1; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo((i * size) / 4, 0);
          ctx.lineTo((i * size) / 4, size);
          ctx.moveTo(0, (i * size) / 4);
          ctx.lineTo(size, (i * size) / 4);
          ctx.stroke();
        }
        ctx.globalAlpha = 0.12;
        for (let i = 0; i < 30; i++) {
          ctx.fillStyle = '#2b2723';
          ctx.beginPath();
          ctx.ellipse(
            Math.random() * size,
            Math.random() * size,
            8 + Math.random() * 40,
            6 + Math.random() * 25,
            0,
            0,
            Math.PI * 2
          );
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      },
      { repeat: [6, 6] }
    )
  );
}

/** Layered sedimentary rock for buttes and mesas. */
export function rockTexture() {
  return memo('rock', () =>
    canvas(
      256,
      (ctx, size) => {
        const bands = ['#9c5b3c', '#b2704a', '#8a4e34', '#c08258', '#7d452f'];
        let y = 0;
        while (y < size) {
          const h = 6 + Math.random() * 26;
          ctx.fillStyle = bands[(Math.random() * bands.length) | 0];
          ctx.fillRect(0, y, size, h);
          y += h;
        }
        const img = ctx.getImageData(0, 0, size, size);
        const d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const n = (Math.random() - 0.5) * 26;
          d[i] += n;
          d[i + 1] += n;
          d[i + 2] += n;
        }
        ctx.putImageData(img, 0, 0);
      },
      { repeat: [2, 2] }
    )
  );
}

/** Soft round sprite used for dust, smoke and light glows. */
export function puffTexture() {
  return memo('puff', () =>
    canvas(
      128,
      (ctx, size) => {
        const g = ctx.createRadialGradient(
          size / 2,
          size / 2,
          0,
          size / 2,
          size / 2,
          size / 2
        );
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, size, size);
      },
      { srgb: false }
    )
  );
}

/** Big roadside sign face, e.g. the "FUEL" totem. */
export function signTexture(lines, { bg = '#c8382f', fg = '#fdf6e3' } = {}) {
  return memo(`sign:${lines.join('|')}:${bg}`, () =>
    canvas(512, (ctx, size) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 12;
      ctx.strokeRect(20, 20, size - 40, size - 40);
      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const step = size / (lines.length + 1);
      lines.forEach((line, i) => {
        const fontSize = Math.min(120, (size * 1.5) / Math.max(4, line.length));
        ctx.font = `bold ${fontSize}px "Arial Black", Impact, sans-serif`;
        ctx.fillText(line, size / 2, step * (i + 1), size - 70);
      });
    })
  );
}

/** The blue of the Spanish S-series service signs, sampled off a real one. */
export const SERVICE_BLUE = '#003c8c';

/**
 * The two service pictograms, as outlines traced off the real signs.
 *
 * Closed polygons in a 100-wide box with the origin at the top-left of the
 * ink, filled with the even-odd rule so the pump's display window, the hollow
 * of its nozzle, the gap under the bed and the bus's windows come out as holes
 * without anyone having to care which way each loop winds. Paths rather than
 * images on purpose: the repository stays asset free, and a sign stays crisp
 * whether it is four pixels across on the horizon or filling the screen.
 *
 * `fit` is how much of the sign's white panel the pictogram spans across,
 * measured off the real sign — the bus runs nearly wall to wall, the pump
 * sits well inside.
 */
const PUMP = {
  fit: 0.697,
  w: 100,
  h: 86.7,
  loops: [
    [
      34.4, 0, 70.4, 0, 71.2, 0.9, 71.6, 7.7, 78.7, 7.9, 79.5, 8.4, 79.6,
      49.7, 78.7, 50.7, 75.2, 50.8, 74.6, 51.7, 72.5, 79.9, 73.2, 80.6,
      76.8, 80.7, 99, 80.6, 100, 81.8, 100, 85.9, 99.1, 86.7, 8, 86.3,
      7.8, 81.7, 8.5, 80.8, 32.9, 80.7, 33.8, 80, 30.2, 51.8, 29, 51,
      26.1, 50.9, 25, 48.6, 24, 49.8, 17, 68.6, 13.6, 72.6, 9.9, 73.8,
      6.8, 73.6, 4.5, 72.7, 1, 69, 0, 64.7, 0.6, 61.5, 10.1, 35.3, 10.1,
      29.7, 15.1, 16.5, 17.5, 15.3, 18.4, 11.4, 20, 8.8, 22.3, 6.8, 24.9,
      6.5, 25.1, 8, 23, 9.3, 20.8, 12.2, 20.5, 15.6, 24, 22.1, 25.7, 22.4,
      26.4, 8.9, 33.4, 8, 33.6, 0.6, 34.4, 0.1
    ],
    [
      35.6, 16.1, 34.4, 17, 34.4, 37.5, 35.6, 38.7, 70.3, 38.7, 71.3,
      37.7, 71.3, 16.8, 70.8, 16.2, 35.7, 16.1
    ],
    [
      21.9, 31.2, 20.6, 32, 19.6, 33.9, 19, 40.8, 17.2, 40.3, 16.7, 35.1,
      15.8, 35.3, 14.8, 37.3, 5.3, 64.1, 5.9, 67.3, 8.5, 68.7, 10.1, 68.6,
      11.7, 67.4, 13.6, 63.3, 23.5, 35.9, 23, 31.7, 22.1, 31.2
    ],
  ],
};

const BED = {
  fit: 0.734,
  w: 100,
  h: 49.9,
  loops: [
    [
      3.7, 0, 6.8, 0.6, 8.8, 3.5, 8.8, 25.7, 9.3, 26.2, 90.4, 26.2, 91.2,
      25.6, 91.1, 13.4, 91.9, 10.8, 93.9, 9.3, 97.1, 9.3, 99.4, 11.1, 100,
      13.1, 99.8, 49.9, 91.2, 49.7, 90.7, 36.2, 9.2, 36.2, 8.8, 49.7, 0.2,
      49.9, 0, 3.7, 1.7, 0.8, 3.7, 0.1
    ],
    [
      33.5, 9, 84.7, 9.1, 87.3, 10.3, 88.6, 13.4, 88.3, 23.7, 33.7, 23.8,
      33, 23.2, 33, 9.4, 33.5, 9.1
    ],
    [
      19.7, 9.1, 25.2, 9.6, 29.4, 12.2, 30.5, 14.3, 30.6, 22.5, 30.1,
      23.7, 11.5, 23.5, 11.8, 13.2, 15.2, 10.1, 19.7, 9.2
    ],
  ],
};

const BUS = {
  fit: 0.89,
  w: 100,
  h: 34.3,
  loops: [
    [
      2.3, 0, 98.4, 0, 99, 0.5, 99, 3, 98.3, 4.3, 98.1, 20.7, 100, 22.8,
      99.7, 27.3, 97.6, 27.7, 95.8, 29.5, 84.9, 29.3, 83.8, 25.2, 82.2,
      23, 79.4, 21.4, 76.1, 21.1, 73.3, 22.1, 71.3, 23.9, 70.2, 25.7,
      69.3, 29.6, 51.7, 29.6, 49.7, 31, 40.6, 30.9, 36.4, 29.1, 35.8,
      25.4, 33.5, 22.5, 31.6, 21.4, 28.4, 21, 25.1, 22, 23.1, 23.7, 22,
      25.4, 21.1, 29.8, 4.5, 29.7, 0.5, 28, 0.1, 27.3, 0, 2.6, 0.5, 1,
      2.3, 0.1
    ],
    [
      72.3, 4.3, 71.4, 5, 71.4, 16.2, 72.1, 16.9, 82.5, 16.9, 83.1, 16.4,
      83, 4.6, 72.4, 4.3
    ],
    [
      60.1, 4.4, 59.4, 5.2, 59.4, 16.2, 59.9, 17, 69.3, 17, 69.9, 16.3,
      69.7, 4.7, 60.2, 4.4
    ],
    [
      9, 4.5, 7.8, 5.2, 7.8, 16.4, 8.4, 17, 18.4, 17, 19, 16.4, 18.8, 4.8,
      9.1, 4.5
    ],
    [
      22.7, 4.5, 20.9, 4.6, 20.3, 5.5, 20.3, 16.2, 21.3, 17.1, 30.2, 17.1,
      31.1, 16.9, 31.4, 16, 31.2, 4.9, 22.8, 4.5
    ],
    [
      33.6, 4.5, 33, 5.2, 33, 16.3, 33.8, 17.1, 37.9, 16.7, 38, 5.2, 37.3,
      4.5, 33.7, 4.5
    ],
    [
      52.6, 4.5, 51.9, 5.5, 51.9, 16, 52.6, 17, 57.1, 17, 57.6, 16.4,
      57.6, 5.1, 57.1, 4.5, 52.7, 4.5
    ],
    [
      85.9, 5.8, 85, 6.5, 85, 27, 85.7, 27.6, 88.6, 27.6, 89.2, 26.9,
      89.2, 6.5, 88.5, 5.8, 86, 5.8
    ],
    [
      91.5, 5.8, 90.9, 6.3, 90.9, 26.9, 91.4, 27.5, 94.7, 27.5, 95.2,
      26.6, 95.2, 6.5, 94.8, 5.8, 91.6, 5.8
    ],
    [
      40.5, 5.9, 39.7, 6.6, 39.7, 26.7, 40.3, 27.5, 43.5, 27.5, 44.1,
      26.6, 44.1, 6.7, 43.5, 5.9, 40.6, 5.9
    ],
    [
      46.6, 5.9, 45.8, 6.7, 45.8, 25.6, 45.9, 27, 46.7, 27.6, 50, 27.4,
      50.3, 24.9, 50.3, 6.9, 49.5, 5.9, 46.7, 5.9
    ],
    [
      27.8, 23.1, 31.8, 23.9, 33.2, 25.2, 34.3, 27.6, 34.1, 30.6, 31.9,
      33.3, 29.3, 34.3, 27.4, 34.2, 25.6, 33.3, 23.5, 30.6, 23.4, 27.3,
      25.1, 24.4, 27.8, 23.3
    ],
    [
      76.1, 23.1, 78.7, 23.3, 80.2, 24, 81.7, 25.3, 82.6, 27.6, 82.3,
      30.9, 80.1, 33.4, 77.7, 34.3, 74.2, 33.4, 72, 31, 71.6, 27.8, 72.6,
      25.2, 74, 24, 76.1, 23.3
    ],
  ],
};
/** Draws a pictogram `width` wide with its top-left corner at (x, y). */
function drawGlyph(ctx, glyph, x, y, width, fg) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(width / glyph.w, width / glyph.w);
  ctx.fillStyle = fg;
  ctx.beginPath();
  for (const loop of glyph.loops) {
    for (let i = 0; i < loop.length; i += 2) {
      if (i) ctx.lineTo(loop[i], loop[i + 1]);
      else ctx.moveTo(loop[i], loop[i + 1]);
    }
    ctx.closePath();
  }
  ctx.fill('evenodd');
  ctx.restore();
}

/** Pictograms a service sign can carry, by name. */
const GLYPHS = { pump: PUMP, bed: BED, bus: BUS };

/**
 * The same pictograms again, as SVG.
 *
 * The route map wants the pump, the bed and the bus at sixteen pixels, and
 * they have to be the ones off the signs — a map whose icons do not match
 * the things they stand for is a map you have to learn twice. Rather than
 * trace them again for the DOM, the loops are walked out into a path.
 *
 * @param {'pump'|'bed'|'bus'} name
 * @returns {{d:string, w:number, h:number}}
 */
export function glyphPath(name) {
  const art = GLYPHS[name];
  const d = art.loops
    .map((loop) => {
      let out = '';
      for (let i = 0; i < loop.length; i += 2) {
        out += `${i ? 'L' : 'M'}${loop[i]} ${loop[i + 1]}`;
      }
      return `${out}Z`;
    })
    .join('');
  return { d, w: art.w, h: art.h };
}

/**
 * A Spanish S-series service sign: white surround, blue field, a white
 * square panel near the top holding the black pictogram, and the distance
 * underneath it on the blue.
 *
 * The proportions are measured off the real signs — panel 70% of the width,
 * starting 9.5% down, board 0.656 as wide as it is tall; all three references
 * agree with each other to within a pixel. The texture is
 * portrait in exactly that ratio, so nothing has to be squashed in advance to
 * survive being mapped onto the board.
 */
const SIGN_W = 256;
const SIGN_H = 390;
/** Board proportion the sign texture expects: width over height. */
export const SERVICE_SIGN_ASPECT = SIGN_W / SIGN_H;

export function serviceSignTexture(glyph, sub, bg = SERVICE_BLUE) {
  return memo(`service:${glyph}:${sub}:${bg}`, () =>
    canvas(
      SIGN_W,
      (ctx, w, h) => {
        ctx.fillStyle = '#f4f3ef';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.roundRect(11, 11, w - 22, h - 22, 26);
        ctx.fill();

        const panel = Math.round(w * 0.7);
        const px = Math.round((w - panel) / 2);
        const py = Math.round(h * 0.095);
        ctx.fillStyle = '#f4f3ef';
        ctx.fillRect(px, py, panel, panel);

        // Each pictogram fills the panel to the width its own reference sign
        // fills it — the bus runs nearly wall to wall, the pump sits well
        // inside — and all three are centred on the panel.
        const art = GLYPHS[glyph];
        const gw = panel * art.fit;
        const gh = (gw * art.h) / art.w;
        drawGlyph(ctx, art, px + (panel - gw) / 2, py + (panel - gh) / 2, gw, '#15171a');

        ctx.fillStyle = '#f4f3ef';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 56px Arial, sans-serif';
        ctx.fillText(sub, w / 2, py + panel + 66, w - 46);
      },
      { height: SIGN_H }
    )
  );
}

/**
 * A service board carrying the pump pictogram over one line of text.
 *
 * `aspect` is the board's width over its height. The texture is square and
 * gets stretched onto whatever it is mapped to, so the glyph is drawn narrow
 * by the same factor and comes out round on the sign.
 */
export function pumpBoardTexture(sub, { bg = '#1c3d6b', fg = '#f2f0e6', aspect = 1 } = {}) {
  return memo(`pump:${sub}:${bg}:${aspect.toFixed(3)}`, () =>
    canvas(256, (ctx, size) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = fg;
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, size - 28, size - 28);

      // The texture is square and gets stretched onto a cabinet that is
      // not, so the glyph is squeezed by the same factor and comes out round.
      const glyph = 138;
      ctx.save();
      ctx.translate(size / 2, 0);
      ctx.scale(1 / aspect, 1);
      drawGlyph(ctx, PUMP, -glyph / 2, 42, glyph, fg);
      ctx.restore();

      ctx.fillStyle = fg;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 48px Arial, sans-serif';
      ctx.fillText(sub, size / 2, 208, size - 58);
    })
  );
}

/**
 * The warning board at a dirt spur: a skull over an arrow, on the yellow
 * diamond every driver reads as "this is your problem now".
 *
 * @param {number} side -1 for a track heading left, +1 for one heading right
 */
export function dangerBoardTexture(text, side) {
  return memo(`danger:${text}:${side}`, () =>
    canvas(256, (ctx, size) => {
      ctx.fillStyle = '#e8b21c';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#1b1712';
      ctx.lineWidth = size * 0.045;
      ctx.strokeRect(size * 0.05, size * 0.05, size * 0.9, size * 0.9);

      const cx = size * 0.5;
      const skullY = size * 0.34;
      const r = size * 0.15;
      ctx.fillStyle = '#1b1712';

      // Cranium and jaw.
      ctx.beginPath();
      ctx.arc(cx, skullY, r, Math.PI, 0);
      ctx.rect(cx - r, skullY, r * 2, r * 0.72);
      ctx.fill();
      ctx.beginPath();
      ctx.rect(cx - r * 0.55, skullY + r * 0.72, r * 1.1, r * 0.42);
      ctx.fill();

      // Eyes and nose, punched back out in the sign's own yellow.
      ctx.fillStyle = '#e8b21c';
      for (const dx of [-0.46, 0.46]) {
        ctx.beginPath();
        ctx.ellipse(cx + r * dx, skullY + r * 0.05, r * 0.3, r * 0.34, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.moveTo(cx, skullY + r * 0.34);
      ctx.lineTo(cx - r * 0.16, skullY + r * 0.66);
      ctx.lineTo(cx + r * 0.16, skullY + r * 0.66);
      ctx.closePath();
      ctx.fill();
      // Teeth.
      ctx.fillStyle = '#1b1712';
      ctx.fillRect(cx - r * 0.5, skullY + r * 0.86, r, size * 0.012);
      for (const dx of [-0.26, 0, 0.26]) {
        ctx.fillRect(cx + r * dx, skullY + r * 0.74, size * 0.012, r * 0.4);
      }

      // The arrow, pointing the way the track leaves the road.
      const ay = size * 0.6;
      const tip = side > 0 ? size * 0.86 : size * 0.14;
      const tail = side > 0 ? size * 0.2 : size * 0.8;
      ctx.strokeStyle = '#1b1712';
      ctx.lineWidth = size * 0.055;
      ctx.beginPath();
      ctx.moveTo(tail, ay);
      ctx.lineTo(tip - side * size * 0.09, ay);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(tip, ay);
      ctx.lineTo(tip - side * size * 0.13, ay - size * 0.085);
      ctx.lineTo(tip - side * size * 0.13, ay + size * 0.085);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#1b1712';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `bold ${Math.round(size * 0.085)}px Arial, sans-serif`;
      for (const [i, line] of text.split('\n').entries()) {
        // Kept clear of the border: the second line used to run off the sign.
        ctx.fillText(line, cx, size * 0.755 + i * size * 0.095, size * 0.8);
      }
    })
  );
}

/**
 * The face of the big billboard.
 *
 * Four lines, and they are not four equal lines: an advert has a hook you
 * read at four hundred metres, a headline you read at two hundred, and the
 * small print you only get if you are already slowing down. Setting them all
 * the same size gives you a wall of text nobody finishes at any distance.
 *
 * Three to one, matching the board it goes on, so nothing is stretched.
 *
 * @param {string[]} lines [hook, headline, offer, threat]
 */
export function billboardTexture(lines) {
  return memo(`bill:${lines.join('|')}`, () =>
    canvas(
      1536,
      (ctx, w, h) => {
        ctx.fillStyle = '#f0eade';
        ctx.fillRect(0, 0, w, h);
        // Sun and dust on it, so it does not read as printed yesterday.
        ctx.globalAlpha = 0.09;
        for (let i = 0; i < 90; i++) {
          ctx.fillStyle = Math.random() > 0.5 ? '#c4b79c' : '#fffdf6';
          ctx.fillRect(
            Math.random() * w,
            Math.random() * h,
            30 + Math.random() * 300,
            8 + Math.random() * 46
          );
        }
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#b8332a';
        ctx.fillRect(0, 0, w, 26);
        ctx.fillRect(0, h - 26, w, 26);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const rows = [
          { y: 0.2, size: 62, colour: '#b8332a', face: 'Arial, sans-serif', bold: true },
          { y: 0.43, size: 118, colour: '#171310', face: '"Arial Black", Impact, sans-serif', bold: true },
          { y: 0.66, size: 58, colour: '#171310', face: 'Arial, sans-serif', bold: true },
          { y: 0.83, size: 50, colour: '#8a2c22', face: 'Arial, sans-serif', bold: false },
        ];
        lines.slice(0, 4).forEach((line, i) => {
          const r = rows[i];
          ctx.fillStyle = r.colour;
          ctx.font = `${r.bold ? 'bold ' : ''}${r.size}px ${r.face}`;
          ctx.fillText(line, w / 2, h * r.y, w - 90);
        });
      },
      { height: 512 }
    )
  );
}

/**
 * MUTCD R2-1 speed limit sign, the white 36x48" rectangle you see all over
 * rural Nevada. Black legend on white, rounded black border.
 */
export function speedLimitTexture(mph) {
  return memo(`speed:${mph}`, () =>
    canvas(
      384,
      (ctx, w, h) => {
        ctx.fillStyle = '#f4f3ef';
        ctx.fillRect(0, 0, w, h);

        // Border: rounded rectangle, inset like the real thing.
        const inset = 20;
        const r = 26;
        ctx.strokeStyle = '#15171a';
        ctx.lineWidth = 13;
        ctx.beginPath();
        ctx.moveTo(inset + r, inset);
        ctx.arcTo(w - inset, inset, w - inset, h - inset, r);
        ctx.arcTo(w - inset, h - inset, inset, h - inset, r);
        ctx.arcTo(inset, h - inset, inset, inset, r);
        ctx.arcTo(inset, inset, w - inset, inset, r);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = '#15171a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        // "SPEED" / "LIMIT" in the upper third, numerals filling the rest.
        ctx.font = 'bold 78px "Arial Narrow", Arial, sans-serif';
        ctx.fillText('SPEED', w / 2, h * 0.22, w - 90);
        ctx.fillText('LIMIT', w / 2, h * 0.38, w - 90);
        ctx.font = 'bold 210px "Arial Narrow", Arial, sans-serif';
        ctx.fillText(String(mph), w / 2, h * 0.7, w - 90);
      },
      { height: 512 }
    )
  );
}

/**
 * Gas price totem: dark board with the pump price in illuminated digits.
 * Not cached — prices move, and the caller disposes the texture it replaces.
 */
export function priceBoardTexture(perLitre) {
  const price = perLitre.toFixed(2);
  return (() =>
    canvas(
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#12141a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#e8e3d6';
        ctx.lineWidth = 7;
        ctx.strokeRect(12, 12, w - 24, h - 24);

        ctx.fillStyle = '#e8e3d6';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 34px Arial, sans-serif';
        ctx.fillText('REGULAR', 34, 48);
        ctx.textAlign = 'right';
        ctx.fillText('/ L', w - 34, 48);

        ctx.fillStyle = '#ffc23a';
        ctx.textAlign = 'center';
        ctx.font = 'bold 150px "Arial Narrow", Arial, sans-serif';
        ctx.fillText(price, w / 2, h * 0.66, w - 90);
      },
      { height: 284 }
    ))();
}

/** Tall neon motel sign: MOTEL stacked vertically on a dark panel. */
export function motelSignTexture() {
  return memo('motelSign', () =>
    canvas(
      256,
      (ctx, w, h) => {
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, '#1b2f52');
        g.addColorStop(1, '#122238');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = '#ffd76a';
        ctx.lineWidth = 10;
        ctx.strokeRect(16, 16, w - 32, h - 32);

        ctx.fillStyle = '#ffe7a8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 150px "Arial Black", Impact, sans-serif';
        const letters = ['M', 'O', 'T', 'E', 'L'];
        letters.forEach((letter, i) => {
          ctx.fillText(letter, w / 2, (h / (letters.length + 0.6)) * (i + 0.9));
        });
      },
      { height: 1024 }
    )
  );
}

/** The little VACANCY panel that hangs under a motel sign. */
export function vacancyTexture() {
  return memo('vacancy', () =>
    canvas(
      512,
      (ctx, w, h) => {
        ctx.fillStyle = '#141317';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ff5b57';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 118px "Arial Narrow", Arial, sans-serif';
        ctx.fillText('VACANCY', w / 2, h * 0.5, w - 40);
      },
      { height: 200 }
    )
  );
}

/**
 * The timetable behind glass in the shelter: a column of departure times
 * nobody has updated in years. Read at speed it is just a grey grid, which
 * is exactly what it should be.
 */
export function timetableTexture() {
  return memo('timetable', () =>
    canvas(128, (ctx, size) => {
      ctx.fillStyle = '#e8e4d8';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#1d4f8f';
      ctx.fillRect(0, 0, size, 22);
      ctx.fillStyle = '#4a4640';
      for (let row = 0; row < 11; row++) {
        const y = 32 + row * 8.4;
        for (let col = 0; col < 3; col++) {
          ctx.fillRect(12 + col * 38, y, 26 + (row % 3) * 2, 3);
        }
      }
    })
  );
}
