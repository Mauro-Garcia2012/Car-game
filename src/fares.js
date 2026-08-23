/**
 * Passengers.
 *
 * People wait at the bus stops for a bus that stopped running years ago, and
 * they will pay to be driven up the line instead. The ride is on your way —
 * the road only goes one direction — so what it really costs you is the extra
 * fuel of carrying somebody, and the obligation to actually pull in at the
 * shelter they asked for instead of blowing past it.
 *
 * Stops are ten kilometres apart, so a fare is a commitment: one hop is most
 * of a tank and usually a night's sleep, and some of them ride two.
 *
 * Every offer is deterministic from the stop it belongs to, so the same person
 * always wants the same ride for the same money.
 */
import { hashRand } from './rng.js';
import { marketPrice } from './world/gasStation.js';
import { stopDistance, someoneWaitingAt } from './world/busStops.js';

/** How often somebody is riding two stops instead of one. */
const TWO_HOP_CHANCE = 0.22;
/**
 * What a ride pays, per kilometre.
 *
 * These are not taxi rates and are not meant to be. Nobody out here is being
 * driven to the shops: they are stranded on a road with no phone signal and
 * no other traffic, and they pay what that is worth. One decent fare is
 * several tanks of petrol, which is the point — the money is the reward for
 * taking the obligation, not a wage for the mileage.
 */
const PAY_PER_KM_MIN = 44;
const PAY_PER_KM_SPREAD = 28;
/**
 * Fares track the pump. Everyone out here knows what fuel costs, so when the
 * market doubles overnight so does what a lift is worth — otherwise a fixed
 * fare quietly becomes worthless over a long run.
 */
const FUEL_BASE = 1.13;
/**
 * How much of the fare is handed over at the kerb.
 *
 * Half up front changes what a fare is. It stops being a promise you get
 * paid for keeping and becomes money you are already holding, which is worth
 * something the moment you take it — a tank you could not otherwise afford,
 * a bed, the bodywork — and it means driving past somebody's stop costs you
 * the balance rather than everything. It also means a broke driver has a way
 * out that is not simply hoping: there is somebody standing at a shelter ten
 * kilometres back with half a fare in their hand.
 */
export const ADVANCE = 0.5;

/** What this offer pays at the kerb, and what it pays on arrival. */
export function advanceOf(offer) {
  return Math.round(offer.pay * ADVANCE);
}
export function balanceOf(offer) {
  return offer.pay - advanceOf(offer);
}

/** Fuel burn multiplier while somebody is in the car. */
export const PASSENGER_BURN = 1.12;
/** Drive this far past the drop-off and they get out without paying. */
export const MISS_AFTER = 500;

/**
 * Who, if anyone, is waiting at bus stop `index`.
 * @returns {{index:number, hops:number, from:number, destIndex:number,
 *            destS:number, distance:number, pay:number}|null}
 */
export function offerAt(index) {
  if (index < 0 || !someoneWaitingAt(index)) return null;

  const seed = 3000 + index;
  const hops = hashRand(seed, 51) < TWO_HOP_CHANCE ? 2 : 1;
  const from = stopDistance(index);
  const destIndex = index + hops;
  const destS = stopDistance(destIndex);
  const distance = destS - from;

  const perKm = PAY_PER_KM_MIN + hashRand(seed, 29) * PAY_PER_KM_SPREAD;
  // Indexed to the pump. The quote you see is today's; boarding locks it in.
  const fuelFactor = marketPrice() / FUEL_BASE;
  return {
    index,
    hops,
    from,
    destIndex,
    destS,
    distance,
    pay: Math.round((distance / 1000) * perKm * fuelFactor),
  };
}

/** Litres the passenger adds to a trip of this length, for the given car. */
export function extraLitresFor(spec, distance) {
  // Matches the burn model in vehicle.js at a cruising throttle.
  return spec.burn * distance * 1.15 * (PASSENGER_BURN - 1);
}

/** Tracks the ride in progress and which pickups have already been used. */
export class Fares {
  constructor() {
    this.reset();
  }

  reset() {
    this.active = null;
    this.used = new Set();
  }

  /** The offer standing at this stop, or null if none or already taken. */
  offerFor(index) {
    if (this.active || index < 0 || this.used.has(index)) return null;
    return offerAt(index);
  }

  /**
   * Is there still somebody standing on that slab? Drives the figure in the
   * shelter, so it has to go the moment they climb in.
   */
  hasWaiter(index) {
    if (index < 0 || this.used.has(index)) return false;
    return someoneWaitingAt(index);
  }

  board(offer) {
    this.used.add(offer.index);
    this.active = offer;
  }

  /** Metres still to go, or 0 when there is nobody aboard. */
  remaining(playerS) {
    return this.active ? Math.max(0, this.active.destS - playerS) : 0;
  }

  /** True once the player has driven well past the drop-off. */
  missed(playerS) {
    return !!this.active && playerS > this.active.destS + MISS_AFTER;
  }

  /** Is this the stop the passenger asked for? */
  isDestination(index) {
    return !!this.active && this.active.destIndex === index;
  }

  clear() {
    this.active = null;
  }
}
