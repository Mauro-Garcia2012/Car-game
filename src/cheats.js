/**
 * The cheat menu.
 *
 * This exists to be debugged with, not played with, and it is built so it
 * cannot become the second of those by accident:
 *
 * - Nothing it does is ever written down. Vehicles it hands over go into a
 *   session-only set in `progress.js`, money and fuel live in the run, and
 *   the run itself is saved on its own schedule — but close the tab and the
 *   garage is exactly as you left it.
 * - It is behind a PIN, and the PIN is held in a plain variable. Reload the
 *   page and you type it again. There is no "remember me", on purpose: it
 *   should never be one click away while you are actually playing.
 *
 * Codes are four characters so they are quick to type over and over, which
 * is what you actually do when you are chasing something.
 */
import { CARS } from './cars/index.js';
import { grantForSession } from './progress.js';
import { stationDistance, nextStationIndex, overnightHike } from './world/gasStation.js';
import { motelDistance, nextMotelIndex } from './world/motel.js';
import { stopDistance, nextStopIndex } from './world/busStops.js';
import { trackAt, nextTrackIndex } from './world/sideroads.js';
import { stormAt, nextStormIndex } from './weather.js';

/** The way in. Four digits, same shape as the codes. */
const PIN = '5214';

let armed = false;

export function isArmed() {
  return armed;
}

/** @returns {boolean} whether that was the PIN */
export function arm(text) {
  if (String(text).trim() !== PIN) return false;
  armed = true;
  return true;
}

/* ------------------------------------------------------------------ */
/* What the codes do                                                   */
/* ------------------------------------------------------------------ */

/** Puts the car down at `s`, keeping its lane and speed. */
function teleport(game, s) {
  const v = game.vehicle;
  v.s = Math.max(1, s);
  v.moveTo(v.s, v.lateral);
  game.road.update(v.s);
  game.stations.update(v.s);
  game.signs.update(v.s);
  game.cameras.reset(v.s);
  game.motels.update(v.s);
  game.buses.update(v.s, game.busWaiter);
  game.sideRoads.update(v.s);
  game.traffic.reset();
  game.wildlife.reset();
  game.snapCamera();
}

function unlockAll(game) {
  let n = 0;
  for (const car of CARS) if (grantForSession(car.id)) n++;
  game.ui.refreshGarage();
  return n;
}

/**
 * Every code, keyed by its four characters.
 *
 * Each returns the line to show. Keeping the whole table in one object means
 * the panel can list itself, so there is nothing to remember and nothing to
 * keep in sync.
 */
const CODES = {
  /* --- the whole garage --- */
  OPEN: { what: 'unlock every vehicle', run: (g) => `${unlockAll(g)} unlocked` },
  MEGA: {
    what: 'fuel, cash, sleep, bodywork and the whole garage',
    run: (g) => {
      g.vehicle.fuel = g.spec.tank;
      g.vehicle.damage = 0;
      g.cash += 25000;
      g.fatigue.sleep();
      g.setWornEngine(false);
      unlockAll(g);
      return 'everything';
    },
  },

  /* --- what the run is made of --- */
  FUEL: {
    what: 'fill the tank',
    run: (g) => {
      g.vehicle.fuel = g.spec.tank;
      return `${g.spec.tank.toFixed(0)} L`;
    },
  },
  DRIP: {
    what: 'two litres left',
    run: (g) => {
      g.vehicle.fuel = Math.min(g.vehicle.fuel, 2);
      return '2 L';
    },
  },
  CASH: { what: '+$1,000', run: (g) => `$${(g.cash += 1000).toFixed(0)}` },
  RICH: { what: '+$50,000', run: (g) => `$${(g.cash += 50000).toFixed(0)}` },
  POOR: { what: 'empty the wallet', run: (g) => ((g.cash = 0), '$0') },
  REST: { what: 'a full night in a bed', run: (g) => (g.fatigue.sleep(), 'wide awake') },
  TIRE: {
    what: 'nearly asleep',
    run: (g) => ((g.fatigue.level = 0.06), '6% left'),
  },
  FIXX: {
    what: 'beat the panels straight',
    run: (g) => ((g.vehicle.damage = 0), g.setWornEngine(false), 'no damage'),
  },
  BENT: {
    what: '90% damage',
    run: (g) => ((g.vehicle.damage = 90), '90% damage'),
  },
  WORN: {
    what: 'seize the engine',
    run: (g) => (g.setWornEngine(true), 'engine seized'),
  },
  GODM: {
    what: 'toggle: no fuel burn, no damage',
    run: (g) => ((g.godMode = !g.godMode), g.godMode ? 'god mode ON' : 'god mode OFF'),
  },

  /* --- where you are --- */
  JUMP: { what: '+10 km up the road', run: (g) => (teleport(g, g.vehicle.s + 10000), `${(g.vehicle.s / 1000).toFixed(1)} km`) },
  LEAP: { what: '+100 km up the road', run: (g) => (teleport(g, g.vehicle.s + 100000), `${(g.vehicle.s / 1000).toFixed(1)} km`) },
  FARR: { what: '+1,000 km up the road', run: (g) => (teleport(g, g.vehicle.s + 1e6), `${(g.vehicle.s / 1000).toFixed(0)} km`) },
  BACK: { what: 'back to the start', run: (g) => (teleport(g, 60), 'kilometre zero') },
  PUMP: {
    what: 'to the next gas station',
    run: (g) => {
      teleport(g, stationDistance(nextStationIndex(g.vehicle.s + 40)));
      return 'at the pumps';
    },
  },
  BEDS: {
    what: 'to the next motel',
    run: (g) => {
      teleport(g, motelDistance(nextMotelIndex(g.vehicle.s + 40)));
      return 'at the motel';
    },
  },
  HALT: {
    what: 'to the next bus stop',
    run: (g) => {
      teleport(g, stopDistance(nextStopIndex(g.vehicle.s + 40)));
      return 'at the shelter';
    },
  },
  DIRT: {
    what: 'to the next dirt spur',
    run: (g) => {
      teleport(g, trackAt(nextTrackIndex(g.vehicle.s + 40)).s);
      return 'at the junction';
    },
  },

  /* --- weather and hour --- */
  SAND: {
    what: 'to the middle of the next sandstorm',
    run: (g) => {
      const st = stormAt(nextStormIndex(g.vehicle.s + 40));
      teleport(g, st.s + st.length / 2);
      return 'in the sand';
    },
  },
  CLER: {
    what: 'past the storm you are in',
    run: (g) => {
      const st = stormAt(nextStormIndex(g.vehicle.s));
      teleport(g, st.s + st.length + 1500);
      return 'clear air';
    },
  },
  DAWN: { what: 'first light', run: (g) => ((g.fatigue.level = 1), g.jumpClock(), '07:00') },
  NOON: { what: 'high noon', run: (g) => ((g.fatigue.level = 0.7), g.jumpClock(), 'midday') },
  DUSK: { what: 'the sun on the horizon', run: (g) => ((g.fatigue.level = 0.34), g.jumpClock(), 'sunset') },
  NITE: { what: 'full dark', run: (g) => ((g.fatigue.level = 0.18), g.jumpClock(), 'night') },

  /* --- the money market --- */
  HIKE: {
    what: 'put the fuel price up overnight',
    run: (g) => {
      const h = overnightHike();
      g.stations.refreshPrices();
      return `+$${h.delta.toFixed(2)}/L`;
    },
  },

  /* --- things that happen to you --- */
  DEER: {
    what: 'a deer on the verge ahead',
    run: (g) => {
      g.wildlife.place(g.vehicle.s);
      const it = g.wildlife.items.find((x) => x.active);
      if (it) it.s = g.vehicle.s + 90;
      return 'deer ahead';
    },
  },
  CRSH: { what: 'take a hit', run: (g) => (g.vehicle.crash(28), 'crashed') },
  KILL: {
    what: 'end the run',
    run: (g) => ((g.vehicle.damage = 100), 'wrecked'),
  },
};

// One per vehicle: CAR1 through CAR9, in garage order.
CARS.forEach((car, i) => {
  CODES[`CAR${i + 1}`] = {
    what: car.name,
    run: (g) => {
      grantForSession(car.id);
      g.ui.refreshGarage();
      if (g.state === 'menu') {
        g.ui.selectCar(car.id);
        return car.name;
      }
      // Swapping mid-run has to keep the run, and both routes into setCar
      // build a fresh Vehicle at kilometre zero — including selectCar, which
      // calls it back through the garage handler. So the state is taken
      // first, and the picker is told silently afterwards.
      const at = {
        s: g.vehicle.s,
        lateral: g.vehicle.lateral,
        speed: g.vehicle.speed,
        damage: g.vehicle.damage,
        distance: g.vehicle.distance,
      };
      g.ui.selectCar(car.id, true);
      g.setCar(car.id);
      const v = g.vehicle;
      v.moveTo(at.s, at.lateral);
      v.speed = at.speed;
      v.damage = at.damage;
      v.distance = at.distance;
      v.fuel = g.spec.tank;
      g.bankedDistance = at.distance; // or the odometer counts it all again
      g.snapCamera();
      return car.name;
    },
  };
});

/** Every code and what it does, for the panel to list. */
export function codeList() {
  return Object.entries(CODES).map(([code, def]) => ({ code, what: def.what }));
}

/**
 * Runs a code.
 * @returns {{ok:boolean, text:string}}
 */
export function run(code, game) {
  const key = String(code).trim().toUpperCase();
  const def = CODES[key];
  if (!def) return { ok: false, text: `${key} ?` };
  const text = def.run(game);
  // The game is paused while the panel is up, so nothing would repaint the
  // HUD on its own and you could not see what the code just did.
  if (game.state !== 'menu') game.pushHud(0);
  return { ok: true, text: `${key} — ${text}` };
}
