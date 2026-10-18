// Wave plan: the order and shape of every throw in a round. It follows a
// classic arcade wave list slot by slot (our research notes (kept outside the repo)).
// Human-readable tables of every stage: docs/waves.md (npm run waves).
//
// A slot is either a single wave or a weighted choice between waves. A wave
// waits `start` seconds, throws its groups (all groups begin together; inside a
// group objects leave `gap` seconds apart, gap 0 = thrown together), then
// waits `end` seconds before the next slot may begin. The live classic list has
// no end delay at all (m_endDelay = 0), so `END` is 0 and the only pause between
// slots is the next slot's own `start` — that is the live tempo. `n` is an
// inclusive [min, max] count. `ts` slows (or speeds) the flight of that wave's
// objects; `inc` makes every repeat of the final slot a little faster.
//
// A group is one of three: a sliceable roll (microbe/fruit), `kind: 'cell'`
// (characters the child must not touch — the classic bombs), or a `seq`
// pattern where 's' is a sliceable throw and 'c' the forbidden one: "ssc"
// throws two objects and then a character. Throws past the end of the pattern
// are plain sliceables — the reading that keeps one character per wave.
//
// Choices share weights by `set` name: a chosen wave drops to weight 0 and
// regrows by `regrow` of its base weight on each later pick, so the same
// burst rarely repeats back to back.

// No pause after a series: the live wave list has m_endDelay = 0 (see
// research/fruit-ninja/OPEN-QUESTIONS.md — question 2.1).
const END = 0;
const START = 0.8;

// Stages 1-4: 1 / 1 / 2-3 / 2-3 objects, no characters.
const one = { start: 1, end: END, groups: [{ n: [1, 1], gap: 0 }] };
const duo = { start: 1, end: END, groups: [{ n: [2, 3], gap: 0 }] };
// Stage 5: only the characters fly — one or two, in slow motion. The "don't
// touch" lesson (1-2 characters, time scale 0.75, 1 s lead-in).
const cellIntro = { start: 1, end: END, ts: 0.75, groups: [{ kind: 'cell', n: [1, 2], gap: 0 }] };

const W = (groups, extra = {}) => ({ start: START, end: END, groups, ...extra });

// Stages 6-9: a character next to 1-2 objects, or seven objects in a row.
const SET_A = {
  set: 'a',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ kind: 'cell', n: [1, 1], gap: 0 }, { n: [1, 2], gap: 0 }]) },
    { weight: 90, wave: W([{ n: [7, 7], gap: 0.7 }]) },
  ],
};

// Stages 10-14: "ssc" string, a plain burst, or "sssc" burst.
const SET_B = {
  set: 'b',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ n: [4, 6], gap: 0.6, seq: 'ssc' }]) },
    { weight: 90, wave: W([{ n: [4, 6], gap: 0 }]) },
    { weight: 90, wave: W([{ n: [3, 4], gap: 0, seq: 'sssc' }]) },
  ],
};

// Stages 15-19: 1-2 characters with 2-3 objects, a 16-object string, or a
// burst of ten.
const SET_C = {
  set: 'c',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ kind: 'cell', n: [1, 2], gap: 0 }, { n: [2, 3], gap: 0 }]) },
    { weight: 90, wave: W([{ n: [16, 16], gap: 0.4, seq: 'ssc' }]) },
    { weight: 90, wave: W([{ n: [10, 10], gap: 0.3 }]) },
  ],
};

// Stages 20-22: an eight-object string or a burst where the character is
// the last throw (only when the full six are rolled).
const SET_D = {
  set: 'd',
  regrow: 0.33,
  options: [
    { weight: 90, wave: W([{ n: [8, 8], gap: 0.5, seq: 'ssc' }]) },
    { weight: 90, wave: W([{ n: [4, 6], gap: 0, seq: 'sssssc' }]) },
  ],
};

// Stage 23 on (weights 67/68/67/68, rare side fruit dropped),
// a little faster every repeat.
const SET_E = {
  set: 'e',
  regrow: 0.33,
  options: [
    { weight: 67, wave: W([{ n: [4, 7], gap: 0.4, seq: 'sssc' }], { inc: 0.02 }) },
    { weight: 68, wave: W([{ n: [3, 5], gap: 0.4, seq: 'sssc' }], { inc: 0.02 }) },
    { weight: 67, wave: W([{ n: [4, 7], gap: 0.25 }], { inc: 0.02 }) },
    { weight: 68, wave: W([{ n: [5, 7], gap: 0.4, seq: 'ssc' }], { inc: 0.02 }) },
  ],
};

// Slots in order; the last one repeats until the round ends.
export const WAVE_PLAN = [
  one, one,
  duo, duo,
  cellIntro,
  SET_A, SET_A, SET_A, SET_A,
  SET_B, SET_B, SET_B, SET_B, SET_B,
  SET_C, SET_C, SET_C, SET_C, SET_C,
  SET_D, SET_D, SET_D,
  SET_E,
];

// Waves before this slot never contain bonuses.
export const SAFE_SLOTS = 2;

// Objects are thrown upward within ±12° of vertical; speed varies 10.1–11.5
// (relative), so the apex varies by (10.1 / 11.5)² ≈ 0.77 of the highest throw.
export const ANGLE_MAX = (12 * Math.PI) / 180;
export const SPEED_MIN_RATIO = 10.1 / 11.5;
