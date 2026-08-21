/**
 * What the garage remembers between runs.
 *
 * Three vehicles are not in the showroom when you first open it. They are
 * earned by distance and claimed at a pump: pass a milestone and the next
 * time you fill up, the key is on the counter. The distance is your lifetime
 * total across every run, not a single one — a thousand kilometres in one
 * sitting is nine hours of driving, and a reward nobody can reach is not a
 * reward.
 *
 * Everything lives in one localStorage entry. If it is missing or corrupt we
 * start from nothing rather than throwing, because a broken save should cost
 * you your unlocks, not the game.
 */

const KEY = 'desert-run.progress';
/** Don't touch localStorage more than this often while driving. */
const SAVE_EVERY = 4;

const state = { metres: 0, unlocked: [] };
let sinceSave = 0;

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}');
    state.metres = Number(raw.metres) || 0;
    state.unlocked = Array.isArray(raw.unlocked) ? raw.unlocked.filter((v) => typeof v === 'string') : [];
  } catch {
    // A save we cannot read is the same as no save at all.
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Private browsing, quota, whatever — the run still works without it.
  }
}

load();

/** Lifetime metres driven, across every run ever. */
export function totalMetres() {
  return state.metres;
}

/** @param {number} metres driven since the last call */
export function addMetres(metres) {
  if (!(metres > 0)) return;
  state.metres += metres;
  sinceSave += metres;
  if (sinceSave > SAVE_EVERY * 1000) {
    sinceSave = 0;
    save();
  }
}

export function isUnlocked(id) {
  return state.unlocked.includes(id);
}

/** Writes out whatever has accumulated. Called when a run ends. */
export function flush() {
  sinceSave = 0;
  save();
}

/**
 * Hands over any vehicle whose milestone has been passed and which has not
 * been claimed yet. Called at the pump, so the unlock always happens
 * somewhere the player is stopped and reading the screen.
 *
 * @param {Array<{id:string, unlockAt?:number}>} cars
 * @returns {Array<object>} the ones unlocked by this call, in order
 */
export function claimUnlocked(cars) {
  const won = cars.filter(
    (c) => c.unlockAt && state.metres >= c.unlockAt && !isUnlocked(c.id)
  );
  if (!won.length) return won;
  for (const c of won) state.unlocked.push(c.id);
  save();
  return won;
}

/**
 * Hands over one specific vehicle, whatever the odometer says. This is the
 * other way in: a set of keys in a briefcase at the end of a dirt track.
 *
 * @returns {boolean} true if this was the first time
 */
export function unlockById(id) {
  if (isUnlocked(id)) return false;
  state.unlocked.push(id);
  save();
  return true;
}

/* ------------------------------------------------------------------ */
/* The run in progress                                                 */
/* ------------------------------------------------------------------ */

const RUN_KEY = 'desert-run.run';
/** Bump when the shape of a saved run changes; older saves are dropped. */
const RUN_FORMAT = 1;

/**
 * Parks a run so it can be picked up later.
 *
 * A run survives closing the tab, the browser and the machine. The one thing
 * it does not survive is dying — the point of the game is that a run ends,
 * and a save you can reload after a crash would make the fuel gauge a
 * suggestion.
 */
export function saveRun(state) {
  try {
    localStorage.setItem(RUN_KEY, JSON.stringify({ v: RUN_FORMAT, ...state }));
  } catch {
    // No storage: the run still plays, it just will not come back.
  }
}

/** @returns {object|null} the parked run, or null if there is not one. */
export function loadRun() {
  try {
    const raw = JSON.parse(localStorage.getItem(RUN_KEY) || 'null');
    if (!raw || raw.v !== RUN_FORMAT) return null;
    return raw;
  } catch {
    return null;
  }
}

export function clearRun() {
  try {
    localStorage.removeItem(RUN_KEY);
  } catch {
    // Nothing to do; a save we cannot delete is a save we cannot read either.
  }
}

/** Wipes the garage back to its opening state. For testing and for menus. */
export function resetProgress() {
  state.metres = 0;
  state.unlocked = [];
  save();
  clearRun();
}
