/** Car catalogue: looks, handling and — most importantly — fuel. */
import {
  buildSportCar,
  buildRaceCar,
  build4x4,
  buildMoped,
  buildLandYacht,
  buildTrophyTruck,
  buildSuperbike,
} from './models.js';

/**
 * Fuel notes: `burn` is litres per metre at cruising throttle, so
 * range ≈ tank / burn. Stations sit 1950–2570 m apart. The cars carry enough
 * to clear two of those gaps and start on a third, so skipping a pump is a
 * decision rather than a death sentence — but the margin runs out fast, and
 * the sleep meter does not care how much petrol you have left.
 *
 * Three vehicles carry an `unlockAt`: they are not in the showroom until
 * that many lifetime metres have been driven, and they are handed over at a
 * pump rather than the moment the odometer ticks over — see `progress.js`.
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
    burn: 0.0081,
    idleBurn: 0.0275,
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
    burn: 0.0069,
    idleBurn: 0.0375,
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
    // 6.5 was more rolling resistance than the engine makes thrust, which
    // pinned it at walking pace and turned every trip across a forecourt
    // into eighty seconds of nothing. Slow, not stuck.
    offroadDrag: 1.7,
    tank: 4.5,
    burn: 0.00027,
    idleBurn: 0.0006,
    camera: { back: 4.4, height: 1.9, look: 9 },
    hood: { forward: 0.5, height: 1.42 },
    collisionRadius: 0.8,
    // Nothing around you but a helmet: any head-on ends the run outright,
    // and two ordinary shunts do the same.
    crashScale: 4.5,
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
    burn: 0.0113,
    idleBurn: 0.03,
    camera: { back: 8.0, height: 3.6, look: 10 },
    hood: { forward: 1.9, height: 1.78 },
    collisionRadius: 1.8,
    stats: { speed: 0.6, accel: 0.55, grip: 0.7, range: 1.0 },
  },

  {
    id: 'yacht',
    name: 'CORONADO 500',
    taglineKey: 'car.yacht.tagline',
    color: '#5d2733',
    build: buildLandYacht,
    unlockAt: 100000,
    topSpeed: 61,
    power: 7.2,
    brakePower: 15, // two tonnes of it, and drum brakes at the back
    grip: 0.7,
    offroadGrip: 0.24,
    offroadDrag: 6.0,
    tank: 110,
    burn: 0.0138,
    idleBurn: 0.042,
    // Detroit steel and five metres of crumple zone: the only thing in the
    // garage that takes a hit better than standard.
    crashScale: 0.62,
    camera: { back: 8.2, height: 3.0, look: 12 },
    hood: { forward: 1.9, height: 1.28 },
    collisionRadius: 1.9,
    stats: { speed: 0.64, accel: 0.45, grip: 0.58, range: 1 },
  },
  {
    id: 'trophy',
    name: 'VAQUERO TT',
    taglineKey: 'car.trophy.tagline',
    color: '#d9d2c4',
    build: buildTrophyTruck,
    unlockAt: 500000,
    topSpeed: 67,
    power: 11.0,
    brakePower: 21,
    grip: 0.8,
    // The whole point: quick on the sand, where nothing else is.
    offroadGrip: 0.95,
    offroadDrag: 0.7,
    tank: 130,
    burn: 0.0198,
    idleBurn: 0.05,
    crashScale: 0.82,
    camera: { back: 9.0, height: 4.2, look: 11 },
    hood: { forward: 2.0, height: 2.3 },
    collisionRadius: 1.95,
    stats: { speed: 0.7, accel: 0.68, grip: 0.66, range: 1 },
  },
  {
    id: 'superbike',
    name: 'SAETA R',
    taglineKey: 'car.superbike.tagline',
    color: '#101418',
    build: buildSuperbike,
    unlockAt: 1000000,
    topSpeed: 84,
    power: 19.5,
    brakePower: 30,
    grip: 1.1,
    offroadGrip: 0.16,
    offroadDrag: 7.2,
    tank: 17,
    // Fast and frugal both, which is the whole reward: a fairing this size
    // pushes almost no air, so seventeen litres go further than the
    // supercar's fifty-five.
    burn: 0.00095,
    idleBurn: 0.008,
    // Same as the moped: two wheels and a set of leathers.
    crashScale: 4.2,
    camera: { back: 5.4, height: 2.1, look: 10 },
    hood: { forward: 0.6, height: 1.25 },
    collisionRadius: 0.85,
    stats: { speed: 0.88, accel: 0.95, grip: 0.92, range: 1 },
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
