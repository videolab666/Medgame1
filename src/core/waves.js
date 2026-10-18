// Wave plan: the order and shape of every throw in a round.
//
// A slot is either a single wave or a weighted choice between waves. A wave
// waits `start` seconds, throws its groups (all groups begin together; inside a
// group objects leave `gap` seconds apart, gap 0 = thrown together), then
// waits `end` seconds before the next slot. `n` is an inclusive [min, max]
// count. `ts` slows (or speeds) the flight of that wave's objects; `inc` makes
// every repeat of the final slot a little faster.
//
// Choices share weights by `set` name: a chosen wave drops to weight 0 and
// regrows by `regrow` of its base weight on each later pick, so the same
// burst rarely repeats back to back.

const END = 5.0;
const START = 0.8;

const one = { start: 0, end: END, groups: [{ n: [1, 1], gap: 0 }] };
const pair = { start: 0, end: END, groups: [{ n: [2, 3], gap: 0 }] };
const slowPair = { start: 0, end: END, ts: 0.75, groups: [{ n: [1, 2], gap: 0 }] };

const W = (groups, extra = {}) => ({ start: START, end: END, groups, ...extra });

const SET_A = {
  set: 'a',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ n: [1, 1], gap: 0 }, { n: [1, 2], gap: 0 }]) },
    { weight: 90, wave: W([{ n: [7, 7], gap: 0.7 }]) },
  ],
};

const SET_B = {
  set: 'b',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ n: [4, 6], gap: 0.6 }]) },
    { weight: 90, wave: W([{ n: [4, 6], gap: 0 }]) },
    { weight: 90, wave: W([{ n: [3, 4], gap: 0 }]) },
  ],
};

const SET_C = {
  set: 'c',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ n: [1, 2], gap: 0 }, { n: [2, 3], gap: 0 }]) },
    { weight: 90, wave: W([{ n: [16, 16], gap: 0.4 }]) },
    { weight: 90, wave: W([{ n: [10, 10], gap: 0.3 }]) },
  ],
};

const SET_D = {
  set: 'd',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ n: [8, 8], gap: 0.5 }]) },
    { weight: 90, wave: W([{ n: [4, 6], gap: 0 }]) },
  ],
};

const SET_E = {
  set: 'e',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ n: [4, 7], gap: 0.4 }], { inc: 0.02 }) },
    { weight: 90, wave: W([{ n: [3, 5], gap: 0.4 }], { inc: 0.02 }) },
    { weight: 90, wave: W([{ n: [4, 7], gap: 0.25 }], { inc: 0.02 }) },
    { weight: 90, wave: W([{ n: [5, 7], gap: 0.4 }], { inc: 0.02 }) },
  ],
};

// Slots in order; the last one repeats until the round ends.
export const WAVE_PLAN = [
  one, one,
  pair, pair,
  slowPair,
  SET_A, SET_A, SET_A, SET_A,
  SET_B, SET_B, SET_B, SET_B, SET_B,
  SET_C, SET_C, SET_C, SET_C, SET_C,
  SET_D, SET_D, SET_D,
  SET_E,
];

// Waves before this slot never contain friendly characters or bonuses.
export const SAFE_SLOTS = 2;

// Objects are thrown upward within ±12° of vertical; speed varies 10.1–11.5
// (relative), so the apex varies by (10.1 / 11.5)² ≈ 0.77 of the highest throw.
export const ANGLE_MAX = (12 * Math.PI) / 180;
export const SPEED_MIN_RATIO = 10.1 / 11.5;
