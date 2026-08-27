/**
 * Sky dome and the lighting rig, driven by the clock in `daynight.js`.
 *
 * The dome is one shader that has to be a morning, a noon, a sunset and a
 * desert night without ever swapping materials: the palette arrives as
 * uniforms, and the stars, the Milky Way and the moon fade up underneath the
 * daylight instead of replacing it.
 */
import * as THREE from 'three';
import { createLighting, sampleLighting } from '../daynight.js';

export const FOG_COLOR = new THREE.Color('#d8c3a6');

const VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vDir;
  uniform vec3 uZenith;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uMoonDir;
  uniform float uMoonStrength;
  uniform float uStars;
  uniform float uTime;

  float hash13(vec3 p) {
    p = fract(p * 0.1031);
    p += dot(p, p.yzx + 33.33);
    return fract((p.x + p.y) * p.z);
  }

  /** Smooth value noise on a direction, for the mare and the Milky Way. */
  float vnoise(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, f.x), mix(n010, n110, f.x), f.y),
      mix(mix(n001, n101, f.x), mix(n011, n111, f.x), f.y),
      f.z
    );
  }

  /** One star per occupied cell of a coarse grid over the sphere. */
  vec3 starField(vec3 dir) {
    // Coarse cells: a star has to cover a pixel or two or it just aliases.
    vec3 sp = dir * 62.0;
    vec3 cell = floor(sp);
    float h = hash13(cell);
    if (h < 0.966) return vec3(0.0);

    vec3 jitter = vec3(hash13(cell + 11.3), hash13(cell + 23.7), hash13(cell + 37.1));
    float d = length(fract(sp) - jitter);
    float mag = (h - 0.966) / 0.034;               // 0 = faint, 1 = bright
    float core = smoothstep(0.13 + mag * 0.10, 0.0, d);
    float twinkle = 0.72 + 0.28 * sin(uTime * (1.3 + mag * 3.5) + h * 63.0);
    vec3 tint = mix(vec3(0.74, 0.83, 1.0), vec3(1.0, 0.87, 0.72), hash13(cell + 7.9));
    return tint * core * (0.30 + mag * mag * 2.4) * twinkle;
  }

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // Vertical gradient: deep overhead melting into haze at eye level.
    float t = clamp(h * 1.35 + 0.08, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(t, 0.65));

    if (uStars > 0.001) {
      // Everything overhead only: stars never sit in the dust at the horizon.
      float up = smoothstep(-0.02, 0.30, h);

      // The Milky Way, as a soft band of dust tilted across the sky.
      vec3 axis = normalize(vec3(0.62, 0.42, -0.66));
      float band = smoothstep(0.42, 0.0, abs(dot(dir, axis)));
      float clouds = vnoise(dir * 9.0) * 0.6 + vnoise(dir * 23.0) * 0.4;
      vec3 milky = mix(vec3(0.30, 0.34, 0.52), vec3(0.52, 0.50, 0.62), clouds);
      col += milky * band * (0.28 + clouds * 0.55) * up * uStars * 0.95;

      col += starField(dir) * up * uStars;
    }

    // Below the horizon the dome fades into the dust so distant terrain
    // dissolves instead of ending on a hard line.
    col = mix(uGround, col, smoothstep(-0.12, 0.02, h));

    // Sun disc plus a broad warm bloom, snuffed out as the disc sinks.
    float above = smoothstep(-0.10, 0.02, uSunDir.y);
    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sd, 900.0) * 6.0 * above;
    col += uSunColor * pow(sd, 12.0) * 0.35 * above;
    col += uSunColor * pow(sd, 3.0) * 0.10 * (0.35 + 0.65 * above);

    if (uMoonStrength > 0.001) {
      float md = max(dot(dir, normalize(uMoonDir)), 0.0);
      float disc = smoothstep(0.99972, 0.99990, md);
      // Mare, so it is a moon and not a hole punched in the sky.
      float mare = 0.80 + 0.20 * vnoise(dir * 620.0);
      vec3 face = vec3(0.97, 0.96, 0.90) * mare;
      col = mix(col, face, disc * uMoonStrength);
      col += vec3(0.62, 0.70, 0.92) * pow(md, 2600.0) * 0.55 * uMoonStrength;
      col += vec3(0.36, 0.45, 0.72) * pow(md, 38.0) * 0.07 * uMoonStrength;
    }

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky(scene) {
  const light = sampleLighting(0, createLighting());

  const geo = new THREE.SphereGeometry(1, 48, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: light.zenith.clone() },
      uHorizon: { value: light.horizon.clone() },
      uGround: { value: light.ground.clone() },
      uSunDir: { value: light.sunDir.clone() },
      uSunColor: { value: light.sun.clone() },
      uMoonDir: { value: light.moonDir.clone() },
      uMoonStrength: { value: light.moon },
      uStars: { value: light.stars },
      uTime: { value: 0 },
    },
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.scale.setScalar(3000);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);

  scene.fog = new THREE.Fog(light.fog.clone(), light.fogNear, light.fogFar);

  // One shadow-casting key light: the sun by day, the moon after dusk.
  const sun = new THREE.DirectionalLight(light.keyColor.clone(), light.keyIntensity);
  sun.position.copy(light.keyDir).multiplyScalar(120);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 340;
  sun.shadow.camera.left = -70;
  sun.shadow.camera.right = 70;
  sun.shadow.camera.top = 70;
  sun.shadow.camera.bottom = -70;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  scene.add(sun.target);

  // Sky bounce + warm ground bounce.
  const hemi = new THREE.HemisphereLight(
    light.hemiSky.clone(),
    light.hemiGround.clone(),
    light.hemiIntensity
  );
  scene.add(hemi);

  const fill = new THREE.DirectionalLight('#ffe3c2', light.fill);
  fill.position.set(60, 40, -80);
  scene.add(fill);

  const u = mat.uniforms;

  let storm = 0;
  const STORM_FOG = new THREE.Color('#c2a06a');

  /**
   * Dust does three things to light: it swallows the distance, it kills the
   * sun as a direction and hands that energy to the sky, and it drains the
   * colour out of everything. Fog alone reads as haze; it is the flat,
   * shadowless key that reads as a storm.
   */
  function applyStorm() {
    const k = storm;
    scene.fog.color.lerp(STORM_FOG, k * 0.85);
    scene.fog.near = THREE.MathUtils.lerp(scene.fog.near, 6, k);
    scene.fog.far = THREE.MathUtils.lerp(scene.fog.far, 92, k);
    sun.intensity *= 1 - 0.72 * k;
    hemi.intensity = THREE.MathUtils.lerp(hemi.intensity, hemi.intensity * 1.5 + 0.35, k);
    hemi.color.lerp(STORM_FOG, k * 0.7);
    fill.intensity *= 1 - 0.4 * k;
    scene.environmentIntensity *= 1 - 0.45 * k;
    u.uStars.value *= 1 - k;
    u.uMoonStrength.value *= 1 - k;
    u.uHorizon.value.lerp(STORM_FOG, k * 0.9);
    u.uZenith.value.lerp(STORM_FOG, k * 0.75);
  }

  return {
    dome,
    sun,
    /** The live lighting state, so the rest of the game can read the hour. */
    light,

    /** Moves the whole rig to a moment of the day. */
    setPhase(phase, elapsed) {
      sampleLighting(phase, light);

      u.uZenith.value.copy(light.zenith);
      u.uHorizon.value.copy(light.horizon);
      u.uGround.value.copy(light.ground);
      u.uSunDir.value.copy(light.sunDir);
      u.uSunColor.value.copy(light.sun);
      u.uMoonDir.value.copy(light.moonDir);
      u.uMoonStrength.value = light.moon;
      u.uStars.value = light.stars;
      u.uTime.value = elapsed;

      scene.fog.color.copy(light.fog);
      scene.fog.near = light.fogNear;
      scene.fog.far = light.fogFar;

      sun.color.copy(light.keyColor);
      sun.intensity = light.keyIntensity;
      hemi.color.copy(light.hemiSky);
      hemi.groundColor.copy(light.hemiGround);
      hemi.intensity = light.hemiIntensity;
      fill.intensity = light.fill;

      // Reflections were baked from the noon sky; dim them as it gets dark.
      scene.environmentIntensity = light.env;
      if (storm > 0) applyStorm();
      return light;
    },

    /**
     * Thickens the air for a sandstorm, on top of whatever hour it is.
     *
     * Applied after the day's lighting rather than mixed into the keyframes,
     * because a storm can arrive at any hour and has to darken noon and
     * midnight alike. Everything it touches is a value setPhase has just
     * written, so the next clear frame puts it all back on its own.
     */
    setStorm(level) {
      storm = Math.min(1, Math.max(0, level));
      if (storm > 0) applyStorm();
    },

    /** Keeps the dome and the shadow frustum centred on the player. */
    update(target) {
      dome.position.set(target.x, 0, target.z);
      sun.position.set(
        target.x + light.keyDir.x * 110,
        target.y + light.keyDir.y * 110,
        target.z + light.keyDir.z * 110
      );
      sun.target.position.copy(target);
      sun.target.updateMatrixWorld();
    },
  };
}
