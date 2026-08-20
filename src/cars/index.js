/** Car catalogue: looks, handling and — most importantly — fuel. */
import { buildSportCar, buildRaceCar, build4x4, buildMoped } from './models.js';

/**
 * Fuel notes: `burn` is litres per metre at cruising throttle, so
 * range ≈ tank / burn. Stations sit 1950–2570 m apart, which means every car
 * can reach the next one but none of them can skip one.
 *
 * The moped is the deliberate exception. It sips fuel — a fiftieth of what
 * the sports car drinks per metre — so it can run past five stations and
 * very nearly a sixth on four and a half litres. What it cannot do is
 * outrun the clock: capped at 45 km/h it cannot reach a motel bed before
 * the sleep meter empties, so the last stretch of every night is ridden
 * asleep. It trades the fuel problem for the sleep one.
 */
export const CARS = [
  {
    id: 'sport',
    name: 'VIPERA GT',
    taglineKey: 'car.sport.tagline',
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
    taglineKey: 'car.race.tagline',
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
    id: 'moped',
    name: 'AVISPA 49',
    taglineKey: 'car.moped.tagline',
    color: '#2e6f4e',
    build: buildMoped,
    topSpeed: 15.5, // what the engine would pull, unrestricted
    speedLimit: 12.5, // and the restrictor: 45 km/h, not a hair more
    power: 3.6,
    brakePower: 12,
    grip: 0.9,
    offroadGrip: 0.18, // skinny tyres, and sand eats them
    offroadDrag: 6.5,
    tank: 4.5,
    burn: 0.00027,
    idleBurn: 0.0006,
    camera: { back: 4.4, height: 1.9, look: 9 },
    hood: { forward: 0.5, height: 1.42 },
    collisionRadius: 0.8,
    stats: { speed: 0.13, accel: 0.2, grip: 0.9, range: 1 },
  },
  {
    id: '4x4',
    name: 'RIDGEBACK 4X4',
    taglineKey: 'car.4x4.tagline',
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

export const MOPED_TOP_KMH = 45;

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

/** The speed shown on the sticker: the restrictor's, if there is one. */
export function carTopSpeed(spec) {
  return spec.speedLimit ?? spec.topSpeed;
}

/**
 * Range in metres on a full tank at cruising throttle.
 *
 * The engine's idle draw is counted too, over the time the trip takes. It
 * is a rounding error on a car doing 250 km/h and a third of the tank on a
 * moped doing 45, so leaving it out would have quoted the moped a range it
 * has no way of reaching.
 */
export function carRange(spec) {
  const cruise = carTopSpeed(spec) * 0.86;
  const perMetre = spec.burn * (0.55 + 0.6 * 0.75) + spec.idleBurn / cruise;
  return spec.tank / perMetre;
}
