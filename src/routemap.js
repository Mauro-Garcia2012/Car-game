/**
 * The road ahead, on paper.
 *
 * Everything this game asks you to plan — where to fill up, where to sleep,
 * which fare to take, whether to go down a dirt track — was information you
 * only ever got by arriving at it. The HUD tells you the next station is
 * 1.2 km away and nothing at all about the one after, so there is no such
 * thing as choosing a station: there is only stopping at the one in front of
 * you because you cannot see past it.
 *
 * This is the atlas out of the glovebox. It lays the next fifty kilometres
 * out as a strip and puts your two ranges on it — how far the fuel goes and
 * how far the daylight goes — so both resources stop being numbers and
 * become distances you can compare against the things on the road.
 *
 * It shows the pumps and their prices, the beds, the shelters and who is
 * standing at them, the dirt spurs, the weather and the landmarks. It does
 * not show the patrol cars, on purpose: knowing where they are would turn
 * the one thing on this road that is a gamble into a lookup.
 */
import { CARS, carRange, carTopSpeed } from './cars/index.js';
import { AWAKE_TIME } from './fatigue.js';
import {
  stationDistance,
  nextStationIndex,
  fuelPricePerLitre,
  marketPrice,
} from './world/gasStation.js';
import { motelDistance, nextMotelIndex } from './world/motel.js';
import { stopDistance, nextStopIndex, someoneWaitingAt } from './world/busStops.js';
import { trackAt, nextTrackIndex } from './world/sideroads.js';
import { stormAt, nextStormIndex } from './weather.js';
import { sightAt, nextSightIndex } from './world/landmarks.js';
import { BILLBOARD_S } from './world/billboard.js';

/** How far up the road it reaches, and how far back it shows. */
export const AHEAD = 50000;
const BEHIND = 3000;

/** Walks one of the world's sequences and collects what falls in the window. */
function collect(from, to, firstIndex, at, make, cap = 60) {
  const out = [];
  let i = firstIndex(from);
  for (let n = 0; n < cap; n++) {
    const s = at(i);
    if (s > to) break;
    if (s >= from) out.push(make(i, s));
    i++;
  }
  return out;
}

/**
 * Everything worth knowing between here and fifty kilometres on.
 * @param {object} game
 */
export function survey(game) {
  const v = game.vehicle;
  const spec = game.spec;
  const from = v.s - BEHIND;
  const to = v.s + AHEAD;

  const stations = collect(
    from,
    to,
    (s) => Math.max(0, nextStationIndex(s) - 1),
    (i) => stationDistance(i),
    (i, s) => ({
      kind: 'pump',
      s,
      price: fuelPricePerLitre(i),
      done: game.stops.has(i),
    })
  );
  // Cheapest ahead, so the map can mark it rather than make you compare.
  let best = Infinity;
  for (const st of stations) if (st.s > v.s && st.price < best) best = st.price;
  for (const st of stations) st.best = st.s > v.s && st.price === best;

  const items = [
    ...stations,
    ...collect(
      from,
      to,
      (s) => Math.max(0, nextMotelIndex(s) - 1),
      (i) => motelDistance(i),
      (i, s) => ({ kind: 'bed', s, done: game.beds.has(i) })
    ),
    ...collect(
      from,
      to,
      (s) => Math.max(0, nextStopIndex(s) - 1),
      (i) => stopDistance(i),
      (i, s) => ({
        kind: 'bus',
        s,
        waiting: game.fares.hasWaiter(i),
        drop: game.fares.active && game.fares.active.destIndex === i,
      })
    ),
    ...collect(
      from,
      to,
      (s) => Math.max(0, nextTrackIndex(s) - 1),
      (i) => trackAt(i).s,
      (i, s) => ({ kind: 'dirt', s, taken: game.sideRoads.taken.has(i) })
    ),
    ...collect(
      from,
      to,
      (s) => Math.max(0, nextSightIndex(s) - 1),
      (i) => sightAt(i).s,
      (i, s) => ({ kind: 'sight', s, what: sightAt(i).kind })
    ),
  ];
  if (BILLBOARD_S >= from && BILLBOARD_S <= to) {
    items.push({ kind: 'board', s: BILLBOARD_S });
  }
  items.sort((a, b) => a.s - b.s);

  // Storms are bands rather than points.
  const storms = [];
  for (let n = 0, i = nextStormIndex(from); n < 6; n++, i++) {
    const st = stormAt(i);
    if (st.s > to) break;
    if (st.s + st.length >= from) storms.push({ from: st.s, to: st.s + st.length });
  }

  // The two ranges, in the same units as everything else on the strip. The
  // fuel figure is the one the HUD quotes, deliberately: a map that disagrees
  // with the gauge is worse than a cautious map.
  const fuelReach = (v.fuel / v.tankSize) * carRange(spec) * 0.92;
  const cruise = carTopSpeed(spec) * 0.86;
  const sleepReach = game.fatigue.level * AWAKE_TIME * cruise;

  return {
    at: v.s,
    from,
    to,
    items,
    storms,
    fuelReach,
    sleepReach,
    freight: game.freight.active ? game.freight.active.to : null,
    fare: game.fares.active ? game.fares.active.destS : null,
    market: marketPrice(),
    car: spec.name,
  };
}
