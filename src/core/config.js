// Balance constants. World width is fixed at 1000 units; height follows the
// screen aspect ratio. Origin is top-left, y points down.
export const CONFIG = Object.freeze({
  WORLD_W: 1000,
  ROUND_SEC: 60,
  STEP: 1 / 60,
  GRAVITY: 1800,
  RADIUS: 75,
  HIT_SCALE: 1.25,
  SWIPE_MIN_SPEED: 500,
  SLOW_SEC: 4,
  SLOW_SCALE: 0.45,
  SHIELD_SEC: 5,
  SHIELD_R: 190,
  CELL_COOLDOWN: 0.6,
  COMBO_STEPS: [3, 5, 10],
  REST_EVERY: 3,
  UNLOCK_AFTER: 3,
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

export const lerp = (a, b, t) => a + (b - a) * Math.min(1, Math.max(0, t));
