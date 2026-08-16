/** Sky dome, sun and lighting rig for a late-afternoon Mojave. */
import * as THREE from 'three';

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

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    // Vertical gradient: deep blue overhead melting into desert haze.
    float t = clamp(h * 1.35 + 0.08, 0.0, 1.0);
    vec3 col = mix(uHorizon, uZenith, pow(t, 0.65));

    // Below the horizon the dome fades into the dust so distant terrain
    // dissolves instead of ending on a hard line.
    col = mix(uGround, col, smoothstep(-0.12, 0.02, h));

    // Sun disc plus a broad warm bloom around it.
    float sd = max(dot(dir, normalize(uSunDir)), 0.0);
    col += uSunColor * pow(sd, 900.0) * 6.0;
    col += uSunColor * pow(sd, 12.0) * 0.35;
    col += uSunColor * pow(sd, 3.0) * 0.10;

    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createSky(scene) {
  const sunDir = new THREE.Vector3(-0.42, 0.30, 0.86).normalize();

  const geo = new THREE.SphereGeometry(1, 48, 32);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uZenith: { value: new THREE.Color('#3c7fd0') },
      uHorizon: { value: new THREE.Color('#e9cba6') },
      uGround: { value: new THREE.Color('#cdad86') },
      uSunDir: { value: sunDir },
      uSunColor: { value: new THREE.Color('#ffd7a0') },
    },
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.scale.setScalar(3000);
  dome.frustumCulled = false;
  dome.renderOrder = -1;
  scene.add(dome);

  scene.fog = new THREE.Fog(FOG_COLOR, 550, 1750);

  const sun = new THREE.DirectionalLight('#fff3de', 2.35);
  sun.position.copy(sunDir).multiplyScalar(120);
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
  const hemi = new THREE.HemisphereLight('#a9c6f7', '#96754f', 0.7);
  scene.add(hemi);

  const fill = new THREE.DirectionalLight('#ffe3c2', 0.28);
  fill.position.set(60, 40, -80);
  scene.add(fill);

  return {
    dome,
    sun,
    sunDir,
    /** Keeps the dome and the shadow frustum centred on the player. */
    update(target) {
      dome.position.set(target.x, 0, target.z);
      sun.position.set(
        target.x + sunDir.x * 110,
        target.y + sunDir.y * 110,
        target.z + sunDir.z * 110
      );
      sun.target.position.copy(target);
      sun.target.updateMatrixWorld();
    },
  };
}
