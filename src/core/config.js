// Balance constants. World width is fixed at 1000 units; height follows the
// screen aspect ratio. Origin is top-left, y points down.
//
// Lives and the microbe king follow the classic arcade rules; the numbers
// come from our research notes (kept outside the repo).
export const CONFIG = Object.freeze({
  WORLD_W: 1000,
  ROUND_SEC: 60,
  // Lives: three hearts, one lost per dropped
  // microbe or fruit, one regained at the first 100 points and every 100 after.
  MAX_LIVES: 3,
  // Hearts and "touching a friendly character ends the round early" (always
  // with the reward screen — spec R6). Set false for a round that only ends
  // on time: characters then just giggle and break the combo.
  GAME_OVER: true,
  LIFE_FIRST_AT: 100,
  LIFE_STEP: 100,
  // Microbe king: appears at 50 points, then every 100;
  // lives 5 s (expiryTime), slices count every 0.077 s at most
  // (minSliceInterval), time slows to 35 % while he is on screen, and his
  // burst ramps time from 5.3 % back to 100 % over 1.2 s (explosionDtCurve).
  KING_AFTER: 50,
  KING_EVERY: 100,
  KING_SEC: 5,
  KING_SLICE_MIN: 0.077,
  KING_SLOW: 0.35,
  KING_BURST_SEC: 1.2,
  KING_BURST_MIN: 0.053,
  // King size (scale 1.35) and camera: zoom-in, quick pull
  // toward each slice (0.3–0.45 of the slice offset, radius cap ≈ 90
  // world units; the main loop clamps the pull to the zoom margin).
  KING_SCALE: 1.35,
  KING_CAM_ZOOM: 1.12,
  KING_CAM_PULL: 90,
  KING_CAM_MOVE: 0.16,
  // The first round in a location is short; every completed round adds
  // ROUND_SEC_STEP until the regular ROUND_SEC is reached (see roundSeconds).
  FIRST_ROUND_SEC: 40,
  ROUND_SEC_STEP: 5,
  STEP: 1 / 60,
  // Fallback gravity for decorative motion (fruit halves); thrown objects use
  // gravityFor(height) so flight time is the same on every screen.
  GRAVITY: 1800,
  // Object size: drawing ~17 % of the short screen side, hit circle equal to
  // the drawing. Measured on the reference game (1080 px short side): lime
  // 13 %, mango 15 %, watermelon 21 %.
  RADIUS: 85,
  HIT_SCALE: 1.0,
  // Highest throw: object centre at ~77 % of the screen height, lowest ~60 %
  // (measured 60–72 % on the reference); a full flight takes 2.13–2.42 s:
  // speed 10.1–11.5 under gravity 9.5.
  APEX_MAX: 0.77,
  AIRTIME_MAX: 2.42,
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

// Sliceable mix per location: which share of microbe/fruit each throw gets.
// Forbidden characters ("cells") are not random any more — they fly out on
// the fixed schedule of src/core/waves.js, one plan for every
// location; only their faces change.
export const LOCATIONS = Object.freeze({
  hands: { microbe: 0.82, fruit: 0.18 },
  kitchen: { microbe: 0.41, fruit: 0.59 },
  blood: { microbe: 0.75, fruit: 0.25 },
  mouth: { microbe: 0.69, fruit: 0.31 },
  tummy: { microbe: 0.64, fruit: 0.36 },
  skin: { microbe: 0.73, fruit: 0.27 },
});

export const LOCATION_ORDER = Object.freeze(['hands', 'kitchen', 'blood', 'mouth', 'tummy', 'skin']);

// Display names and hints — docs (scripts/waves-table.mjs) and screens share them.
export const LOCATION_INFO = Object.freeze({
  hands: { name: 'Долоньки', icon: 'soap', hint: 'Мий мікробів!' },
  kitchen: { name: 'Кухня вітамінів', icon: 'orange', hint: 'Збирай вітаміни!' },
  blood: { name: 'Клітинкова річка', icon: 'chervonya', hint: 'Не чіпай своїх!' },
  mouth: { name: 'Ротик', icon: 'zubchyk', hint: 'Бережи зубки!' },
  tummy: { name: 'Животик', icon: 'dobryk', hint: 'Добрика не чіпай!' },
  skin: { name: 'Шкіра', icon: 'hat', hint: 'Шкіра — наш щит!' },
});

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
