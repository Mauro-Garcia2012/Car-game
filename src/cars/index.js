/** Car catalogue: looks, handling and — most importantly — fuel. */
import { buildSportCar, buildRaceCar, build4x4 } from './models.js';

/**
 * Fuel notes: `burn` is litres per metre at cruising throttle, so
 * range ≈ tank / burn. Stations sit 1950–2570 m apart, which means every car
 * can reach the next one but none of them can skip one.
 */
export const CARS = [
  {
    id: 'sport',
    name: 'VIPERA GT',
    tagline: 'Mid-engine road weapon',
    color: '#d81f2a',
    build: buildSportCar,
    topSpeed: 82, // m/s
    power: 12.5, // m/s² at zero speed
    brakePower: 24,
    grip: 1.0, // tarmac cornering
    offroadGrip: 0.34,
    offroadDrag: 5.2,
    tank: 55,
    burn: 0.0162,
    idleBurn: 0.055,
    camera: { back: 6.6, height: 2.5, look: 11 },
    hood: { forward: 1.35, height: 1.02 },
    collisionRadius: 1.5,
    stats: { speed: 0.86, accel: 0.82, grip: 0.9, range: 0.62 },
  },
  {
    id: 'race',
    name: 'FALCON R1',
    tagline: 'GT prototype, thirsty and vicious',
    color: '#1c6fd8',
    build: buildRaceCar,
    topSpeed: 95,
    power: 16.0,
    brakePower: 28,
    grip: 1.22,
    offroadGrip: 0.2,
    offroadDrag: 7.5,
    tank: 46,
    burn: 0.0138,
    idleBurn: 0.075,
    camera: { back: 6.4, height: 2.4, look: 11 },
    hood: { forward: 1.5, height: 1.0 },
    collisionRadius: 1.55,
    stats: { speed: 1.0, accel: 1.0, grip: 1.0, range: 0.5 },
  },
  {
    id: '4x4',
    name: 'RIDGEBACK 4X4',
    tagline: 'Slow, unstoppable, huge tank',
    color: '#c8791f',
    build: build4x4,
    topSpeed: 58,
    power: 9.0,
    brakePower: 19,
    grip: 0.84,
    offroadGrip: 0.78,
    offroadDrag: 1.4,
    tank: 95,
    burn: 0.0226,
    idleBurn: 0.06,
    camera: { back: 8.0, height: 3.6, look: 10 },
    hood: { forward: 1.9, height: 1.78 },
    collisionRadius: 1.8,
    stats: { speed: 0.6, accel: 0.55, grip: 0.7, range: 1.0 },
  },
];

export function carById(id) {
  return CARS.find((c) => c.id === id) || CARS[0];
}

export function createCar(id) {
  const spec = carById(id);
  const model = spec.build(spec.color);
  model.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  return { spec, model };
}

/** Range in metres on a full tank at cruising throttle. */
export function carRange(spec) {
  return spec.tank / spec.burn;
}
