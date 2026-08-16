/** Dust kicked up by the tyres, and the sparks/smoke of a crash. */
import * as THREE from 'three';
import { puffTexture } from './textures.js';

const MAX = 320;

export class DustSystem {
  constructor(scene) {
    this.positions = new Float32Array(MAX * 3);
    this.sizes = new Float32Array(MAX);
    this.alphas = new Float32Array(MAX);
    this.colors = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.vel = new Float32Array(MAX * 3);
    this.cursor = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    geo.setAttribute('alpha', new THREE.BufferAttribute(this.alphas, 1));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));

    const mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uMap: { value: puffTexture() } },
      vertexShader: /* glsl */ `
        attribute float size;
        attribute float alpha;
        attribute vec3 color;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vAlpha = alpha;
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (320.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D uMap;
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          vec4 tex = texture2D(uMap, gl_PointCoord);
          gl_FragColor = vec4(vColor, tex.a * vAlpha);
          if (gl_FragColor.a < 0.01) discard;
        }
      `,
    });

    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.geo = geo;
  }

  emit(x, y, z, { spread = 0.6, size = 2.2, life = 1.1, color = [0.82, 0.68, 0.47], rise = 1.2 } = {}) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % MAX;
    this.positions[i * 3] = x + (Math.random() - 0.5) * spread;
    this.positions[i * 3 + 1] = y + Math.random() * 0.2;
    this.positions[i * 3 + 2] = z + (Math.random() - 0.5) * spread;
    this.vel[i * 3] = (Math.random() - 0.5) * 1.4;
    this.vel[i * 3 + 1] = rise * (0.5 + Math.random());
    this.vel[i * 3 + 2] = (Math.random() - 0.5) * 1.4;
    this.sizes[i] = size * (0.7 + Math.random() * 0.7);
    this.life[i] = life * (0.75 + Math.random() * 0.5);
    this.maxLife[i] = this.life[i];
    this.colors[i * 3] = color[0];
    this.colors[i * 3 + 1] = color[1];
    this.colors[i * 3 + 2] = color[2];
  }

  update(dt) {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) {
        this.alphas[i] = 0;
        continue;
      }
      this.life[i] -= dt;
      const t = Math.max(0, this.life[i] / this.maxLife[i]);
      this.alphas[i] = t * 0.55;
      this.sizes[i] += dt * 2.4;
      this.positions[i * 3] += this.vel[i * 3] * dt;
      this.positions[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.positions[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.vel[i * 3 + 1] *= 1 - dt * 0.8;
    }
    this.geo.attributes.position.needsUpdate = true;
    this.geo.attributes.size.needsUpdate = true;
    this.geo.attributes.alpha.needsUpdate = true;
    this.geo.attributes.color.needsUpdate = true;
  }

  clear() {
    this.life.fill(0);
    this.alphas.fill(0);
    this.geo.attributes.alpha.needsUpdate = true;
  }
}
