/**
 * Freight.
 *
 * A passenger is ten to twenty kilometres and a few hundred dollars, which
 * makes the whole game a chain of short hops. Freight is the long game: a
 * load taken on at one station and dropped at another forty to a hundred
 * kilometres up the road, for money that dwarfs a fare — and a car that is
 * slower, thirstier, longer to stop and worth less every time you hit
 * something with it in the back.
 *
 * It is the one thing that makes surviving a hundred kilometres worth more
 * than surviving ten of them ten times, which is what a distance game needs.
 *
 * Deterministic from the station, like every other offer out here.
 */
import { hashRand } from './rng.js';
import { stationDistance, marketPrice } from './world/gasStation.js';

/** Share of stations with something on the dock. */
const OFFER_CHANCE = 0.42;
/** How far it goes, in stations rather than metres: the road stretches. */
const HOPS_MIN = 9;
const HOPS_SPREAD = 14;
/** What it pays per kilometre, before the market is taken into account. */
const PAY_PER_KM_MIN = 26;
const PAY_PER_KM_SPREAD = 17;
const FUEL_BASE = 1.13;

/** How much of the car a full load is, for weight and for burn. */
export const FREIGHT_LOAD = 1;
/** Fuel multiplier at a full load, on top of anything else aboard. */
export const FREIGHT_BURN = 0.3;

/**
 * What is on the dock at station `index`.
 * @returns {{index:number, destIndex:number, from:number, to:number,
 *            distance:number, pay:number}|null}
 */
export function loadAt(index) {
  if (index < 0) return null;
  const seed = 6100 + index;
  if (hashRand(seed, 13) > OFFER_CHANCE) return null;
  const hops = HOPS_MIN + Math.floor(hashRand(seed, 29) * HOPS_SPREAD);
  const destIndex = index + hops;
  const from = stationDistance(index);
  const to = stationDistance(destIndex);
  const distance = to - from;
  const perKm = PAY_PER_KM_MIN + hashRand(seed, 41) * PAY_PER_KM_SPREAD;
  return {
    index,
    destIndex,
    from,
    to,
    distance,
    pay: Math.round((distance / 1000) * perKm * (marketPrice() / FUEL_BASE)),
  };
}

/** Tracks the load in the back and which docks have already been cleared. */
export class Freight {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = null;
    /** 0 to 1: how much of the load has been broken on the way. */
    this.hurt = 0;
    this.taken = new Set();
  }

  /** The load standing at this station, or null. */
  offerFor(index) {
    if (this.active || index < 0 || this.taken.has(index)) return null;
    return loadAt(index);
  }

  take(load) {
    this.taken.add(load.index);
    this.active = load;
    this.hurt = 0;
  }

  isDestination(index) {
    return !!this.active && this.active.destIndex === index;
  }

  /** What it is worth now, after whatever you did to it on the way. */
  worth() {
    if (!this.active) return 0;
    return Math.round(this.active.pay * Math.max(0, 1 - this.hurt));
  }

  /** Metres still to run. */
  remaining(playerS) {
    return this.active ? Math.max(0, this.active.to - playerS) : 0;
  }

  clear() {
    this.active = null;
    this.hurt = 0;
  }
}
