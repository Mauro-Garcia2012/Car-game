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

/** Highway guide board: green for distances, blue for motorist services. */
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

export function boardTexture(text, sub = '', bg = '#1c6b3a') {
  return memo(`board:${text}:${sub}:${bg}`, () =>
    canvas(256, (ctx, size) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = '#f2f0e6';
      ctx.lineWidth = 8;
      ctx.strokeRect(14, 14, size - 28, size - 28);
      ctx.fillStyle = '#f2f0e6';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 70px Arial, sans-serif';
      ctx.fillText(text, size / 2, sub ? size / 2 - 26 : size / 2, size - 58);
      if (sub) {
        ctx.font = 'bold 42px Arial, sans-serif';
        ctx.fillText(sub, size / 2, size / 2 + 44, size - 58);
      }
    })
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
 * The flag on a bus-stop post: a white roundel with the blue bus pictogram
 * and the route number under it. Nothing else out here is a white circle, so
 * it reads as a stop from a long way off even when the shelter does not.
 */
export function busSignTexture(route) {
  return memo(`bus:${route}`, () =>
    canvas(256, (ctx, size) => {
      ctx.fillStyle = '#1d4f8f';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#f4f3ef';
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
      ctx.fill();

      // Bus, seen side on: body, a band of windows, a door, two wheels.
      const cx = size / 2;
      const cy = size * 0.40;
      ctx.fillStyle = '#1d4f8f';
      for (const dx of [-34, 34]) {
        ctx.beginPath();
        ctx.arc(cx + dx, cy + 30, 12, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.roundRect(cx - 58, cy - 34, 116, 66, 9);
      ctx.fill();
      ctx.fillStyle = '#f4f3ef';
      for (const [dx, w] of [[-48, 30], [-14, 30], [20, 22]]) {
        ctx.fillRect(cx + dx, cy - 24, w, 24);
      }
      ctx.fillRect(cx + 46, cy - 24, 8, 46); // door, floor to roof
      ctx.fillStyle = '#1d4f8f';
      ctx.fillRect(cx + 49, cy - 24, 2, 46);

      ctx.fillStyle = '#f4f3ef';
      ctx.fillRect(cx - 46, size * 0.70, 92, 34);
      ctx.fillStyle = '#1d4f8f';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 30px Arial, sans-serif';
      ctx.fillText(String(route), cx, size * 0.716, 84);
    })
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
