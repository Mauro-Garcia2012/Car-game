/**
 * Anything in the world that should burn brighter once the sun is down.
 *
 * Neon, forecourt panels and retroreflective sign faces all carry an emissive
 * that has to stay tame at noon or it blows out the exposure, and has to lift
 * hard at night or the desert swallows it. Rather than have every module
 * chase the clock, they register their materials here once and this applies
 * the current level — including to materials built long after nightfall,
 * since the world keeps making them as chunks recycle.
 */

const registry = [];
let level = 0;

function apply(entry) {
  entry.material.emissiveIntensity = entry.base + entry.gain * level;
}

/**
 * @param {import('three').MeshStandardMaterial} material
 * @param {number} gain how much emissive to add at full dark
 * @returns the same material, for chaining into a constructor call
 */
export function glowAtNight(material, gain) {
  const entry = { material, base: material.emissiveIntensity ?? 1, gain };
  registry.push(entry);
  apply(entry);
  return material;
}

/** @param {number} value 0 in daylight, 1 once it is properly dark */
export function setNightGlow(value) {
  if (value === level) return;
  level = value;
  for (const entry of registry) apply(entry);
}
