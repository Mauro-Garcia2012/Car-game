/**
 * Passengers.
 *
 * People are stranded at about half the stops out here, and they will pay to
 * be taken up the road to the next gas station or motel. The ride is on your
 * way — the road only goes one direction — so what it really costs you is the
 * extra fuel of carrying somebody, and the obligation to actually stop where
 * they are going instead of blowing past it.
 *
 * Every offer is deterministic from the stop it belongs to, so the same pickup
 * always shows the same fare.
 */
import { hashRand } from './rng.js';
import { stationDistance, nextStationIndex } from './world/gasStation.js';
import { motelDistance, nextMotelIndex } from './world/motel.js';

/** Share of stops with somebody waiting. */
const OFFER_CHANCE = 0.55;
/** Shortest and longest ride, in metres. */
const MIN_TRIP = 2200;
const TRIP_SPREAD = 3800;
/**
 * What a ride pays, per kilometre.
 *
 * These are not taxi rates and are not meant to be. Nobody out here is being
 * driven to the shops: they are stranded on a road with no phone signal and
 * no other traffic, and they pay what that is worth. One decent fare is
 * several tanks of petrol, which is the point — the money is the reward for
 * taking the obligation, not a wage for the mileage.
 */
const PAY_PER_KM_MIN = 82;
const PAY_PER_KM_SPREAD = 54;
/** Fuel burn multiplier while somebody is in the car. */
export const PASSENGER_BURN = 1.12;
/** Drive this far past the drop-off and they get out without paying. */
export const MISS_AFTER = 500;

export const STATION = 'station';
export const MOTEL = 'motel';

function stopDistance(kind, index) {
  return kind === STATION ? stationDistance(index) : motelDistance(index);
}

/** The stop closest to `target`, whichever kind that turns out to be. */
function stopNear(target) {
  const si = nextStationIndex(target);
  const mi = nextMotelIndex(target);
  const sS = stationDistance(si);
  const mS = motelDistance(mi);
  return Math.abs(mS - target) < Math.abs(sS - target)
    ? { kind: MOTEL, index: mi, s: mS }
    : { kind: STATION, index: si, s: sS };
}

function seedFor(kind, index) {
  return (kind === STATION ? 1000003 : 2000029) + index;
}

/**
 * Who, if anyone, is waiting at this stop.
 * @returns {{kind:string, index:number, from:number, dest:object,
 *            distance:number, pay:number}|null}
 */
export function offerAt(kind, index) {
  if (index < 0) return null;
  const seed = seedFor(kind, index);
  if (hashRand(seed, 17) > OFFER_CHANCE) return null;

  const from = stopDistance(kind, index);
  const target = from + MIN_TRIP + hashRand(seed, 51) * TRIP_SPREAD;
  const dest = stopNear(target);
  const distance = dest.s - from;
  if (distance < MIN_TRIP * 0.5) return null; // too short to be worth anyone's time

  const perKm = PAY_PER_KM_MIN + hashRand(seed, 29) * PAY_PER_KM_SPREAD;
  return {
    kind,
    index,
    from,
    dest,
    distance,
    pay: Math.round((distance / 1000) * perKm),
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
  offerFor(kind, index) {
    if (this.active || index < 0) return null;
    const key = `${kind}:${index}`;
    if (this.used.has(key)) return null;
    return offerAt(kind, index);
  }

  board(offer) {
    this.used.add(`${offer.kind}:${offer.index}`);
    this.active = offer;
  }

  /** Metres still to go, or 0 when there is nobody aboard. */
  remaining(playerS) {
    return this.active ? Math.max(0, this.active.dest.s - playerS) : 0;
  }

  /** True once the player has driven well past the drop-off. */
  missed(playerS) {
    return !!this.active && playerS > this.active.dest.s + MISS_AFTER;
  }

  /** Is this the stop the passenger asked for? */
  isDestination(kind, index) {
    return (
      !!this.active &&
      this.active.dest.kind === kind &&
      this.active.dest.index === index
    );
  }

  clear() {
    this.active = null;
  }
}
