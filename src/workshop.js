/**
 * The workshop at the pumps.
 *
 * Money in this game had a ceiling. Past the first few fares the tank is
 * always full, the bed is always paid, and the panels are always straight —
 * and after that a thousand dollars and ten thousand dollars buy you exactly
 * the same run. Meanwhile the road only ever got longer, never harder.
 *
 * The workshop closes both of those at once. The desert thins out as you
 * drive (`difficulty.js`), and the counter at every station is where you buy
 * the answer to it: a bigger tank, softer rubber, a stronger shell, lamps
 * that reach, an engine that pulls. Every run becomes a race between how
 * hard the road is getting and how much car you can afford by the time it
 * gets there.
 *
 * Nothing here survives the run. It is bought with the money you found on
 * this road, and it dies with the car.
 */

/** The counter, in the order it is listed. */
export const ITEMS = [
  {
    id: 'body',
    key: 'shop.body',
    /** Repeatable, and priced by how bad it is. */
    price: (g) => Math.round(g.vehicle.damage * 9),
    offered: (g) => g.vehicle.damage >= 4,
    buy: (g) => {
      g.vehicle.damage = 0;
      g.setWornEngine(false);
    },
  },
  {
    id: 'tyres',
    key: 'shop.tyres',
    price: (g) => Math.round(120 + (100 - g.vehicle.tyre) * 2.6),
    offered: (g) => g.vehicle.tyre < 96 || g.vehicle.blown,
    buy: (g) => {
      g.vehicle.tyre = 100;
      g.vehicle.blown = false;
    },
  },
  {
    id: 'cans',
    key: 'shop.cans',
    max: 3,
    price: (g) => [340, 520, 780][g.upgrades.cans] ?? 0,
    buy: (g) => {
      g.upgrades.cans++;
      g.vehicle.tankBonus = g.upgrades.cans * 18;
    },
  },
  {
    id: 'grip',
    key: 'shop.grip',
    max: 1,
    price: () => 950,
    buy: (g) => {
      g.upgrades.grip = 1;
      g.vehicle.gripBonus = 1.14;
    },
  },
  {
    id: 'armour',
    key: 'shop.armour',
    max: 1,
    price: () => 1200,
    buy: (g) => {
      g.upgrades.armour = 1;
      g.vehicle.armour = 0.68;
    },
  },
  {
    id: 'lamps',
    key: 'shop.lamps',
    max: 1,
    price: () => 560,
    buy: (g) => {
      g.upgrades.lamps = 1;
      g.headlights.setReach(1.7);
    },
  },
  {
    id: 'atlas',
    key: 'shop.atlas',
    max: 1,
    /**
     * The road atlas, and the dearest thing on the counter by a distance.
     *
     * It is the only item that changes what you know rather than what the
     * car does, and knowing where the cheap fuel is, where the beds are and
     * how far your two ranges actually reach is worth more than any of the
     * parts — so it is priced above all of them, and until you have it the
     * road is what it always was: whatever is in front of you.
     */
    price: () => 4500,
    buy: (g) => {
      g.upgrades.atlas = 1;
    },
  },
  {
    id: 'tune',
    key: 'shop.tune',
    max: 3,
    price: (g) => [800, 1150, 1600][g.upgrades.tune] ?? 0,
    buy: (g) => {
      g.upgrades.tune++;
      g.vehicle.setTune(g.upgrades.tune);
    },
  },
];

/** A fresh set of counters. */
export function emptyUpgrades() {
  return { cans: 0, grip: 0, armour: 0, lamps: 0, tune: 0, atlas: 0 };
}

/** Puts a set of upgrades back onto the car, after a swap or a resume. */
export function applyUpgrades(game) {
  const u = game.upgrades;
  game.vehicle.tankBonus = u.cans * 18;
  game.vehicle.gripBonus = u.grip ? 1.14 : 1;
  game.vehicle.armour = u.armour ? 0.68 : 1;
  game.vehicle.setTune(u.tune);
  game.headlights.setReach(u.lamps ? 1.7 : 1);
}

/** What is on the counter right now, priced and marked affordable. */
export function counter(game) {
  const rows = [];
  for (const item of ITEMS) {
    const owned = item.max ? game.upgrades[item.id] : 0;
    if (item.max && owned >= item.max) continue;
    if (item.offered && !item.offered(game)) continue;
    const price = item.price(game);
    if (price <= 0) continue;
    rows.push({
      id: item.id,
      key: item.key,
      price,
      owned,
      max: item.max || 0,
      affordable: game.cash >= price,
    });
  }
  return rows;
}

/**
 * Buys one thing off the counter.
 * @returns {{ok:boolean, id?:string, price?:number}}
 */
export function buy(game, id) {
  const item = ITEMS.find((i) => i.id === id);
  if (!item) return { ok: false };
  const rows = counter(game);
  const row = rows.find((r) => r.id === id);
  if (!row || !row.affordable) return { ok: false, id, price: row ? row.price : 0 };
  game.cash -= row.price;
  game.spent += row.price;
  item.buy(game);
  return { ok: true, id, price: row.price };
}
