// Balance constants. World width is fixed at 1000 units; height follows the
// screen aspect ratio. Origin is top-left, y points down.
export const CONFIG = Object.freeze({
  WORLD_W: 1000,
  ROUND_SEC: 60,
  // The first round in a location is short; every completed round adds
  // ROUND_SEC_STEP until the regular ROUND_SEC is reached (see roundSeconds).
  FIRST_ROUND_SEC: 40,
  ROUND_SEC_STEP: 5,
  STEP: 1 / 60,
  // Fallback gravity for decorative motion (fruit halves); thrown objects use
  // gravityFor(height) so flight time is the same on every screen.
  GRAVITY: 1800,
  // Object size: diameter ~12 % of the short screen side, hit circle equal to
  // the drawing.
  RADIUS: 62,
  HIT_SCALE: 1.0,
  // Highest throw reaches 82 % of the screen height; a full up-and-down flight
  // of the highest throw takes 2.34 s.
  APEX_MAX: 0.82,
  AIRTIME_MAX: 2.34,
  SWIPE_MIN_SPEED: 500,
  SLOW_SEC: 4,
  SLOW_SCALE: 0.45,
  SHIELD_SEC: 5,
  SHIELD_R: 190,
  CELL_COOLDOWN: 0.6,
  COMBO_STEPS: [3, 5, 10],
  REST_EVERY: 3,
  UNLOCK_AFTER: 3,
  // All locations are open from the start; set false to unlock them in a chain.
  UNLOCK_ALL: true,
  STICKERS_PER_LOCATION: 8,
  MAX_BONUSES: 3,
  BONUS_CHANCE: 0.06,
});

// Spawn mix per location.
export const LOCATIONS = Object.freeze({
  hands: { microbe: 0.7, fruit: 0.15, cell: 0.15 },
  kitchen: { microbe: 0.35, fruit: 0.5, cell: 0.15 },
  blood: { microbe: 0.45, fruit: 0.15, cell: 0.4 },
  mouth: { microbe: 0.55, fruit: 0.25, cell: 0.2 },
  tummy: { microbe: 0.45, fruit: 0.25, cell: 0.3 },
  skin: { microbe: 0.55, fruit: 0.2, cell: 0.25 },
});

export const LOCATION_ORDER = Object.freeze(['hands', 'kitchen', 'blood', 'mouth', 'tummy', 'skin']);

// Default pools. "cell" means any friendly character that must not be touched.
export const TYPES = Object.freeze({
  microbe: ['chykhunchyk', 'brudnulya', 'lypuchka', 'kashlyuk'],
  fruit: ['orange', 'apple', 'kiwi', 'strawberry', 'broccoli'],
  cell: ['chervonya', 'bilyk', 'latochka'],
  bonus: ['soap', 'vaccine', 'patch'],
});

// Per-location overrides of the default pools.
export const LOCATION_TYPES = Object.freeze({
  mouth: {
    microbe: ['kysliuk', 'lypuchka', 'brudnulya'],
    fruit: ['apple', 'carrot', 'strawberry'],
    cell: ['zubchyk'],
    bonus: ['toothbrush', 'vaccine', 'patch'],
  },
  tummy: {
    microbe: ['brudnulya', 'kashlyuk', 'chykhunchyk'],
    fruit: ['banana', 'broccoli', 'kiwi', 'apple'],
    cell: ['dobryk'],
  },
  skin: {
    microbe: ['brudnulya', 'chykhunchyk', 'lypuchka'],
    fruit: ['orange', 'strawberry', 'kiwi'],
    cell: ['latochka', 'bilyk'],
  },
});

export const typesFor = (location) => ({ ...TYPES, ...(LOCATION_TYPES[location] ?? {}) });

// What each bonus does in the round logic.
export const BONUS_EFFECT = Object.freeze({
  soap: 'wave',
  toothbrush: 'wave',
  vaccine: 'shield',
  patch: 'slow',
});

// Gravity (world units/s²) that gives AIRTIME_MAX for a throw to APEX_MAX.
export const gravityFor = (height) => (8 * CONFIG.APEX_MAX * height) / CONFIG.AIRTIME_MAX ** 2;

export const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));

// Round length grows with experience: 40 s for the first round in a location,
// +5 s per completed round, capped at ROUND_SEC (60 s).
export const roundSeconds = (played = 0) =>
  Math.min(CONFIG.ROUND_SEC, CONFIG.FIRST_ROUND_SEC + Math.max(0, played) * CONFIG.ROUND_SEC_STEP);
