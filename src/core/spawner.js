// Decides what flies out, where and when. Pure and seeded.
import { CONFIG, LOCATIONS, TYPES, lerp } from './config.js';
import { pick, range } from './rng.js';

const CELL_GAP = 200;
const TUTORIAL_SEC = 12;
const TUTORIAL_CELL_AT = 8;

export function createSpawner({ rng, width, height, location, mode, tutorial }) {
  const weights = LOCATIONS[location];
  let nextId = 1;
  let nextAt = mode === 'calm' ? 0.3 : 0.6;
  let bonuses = 0;
  let tutorialCellDone = false;

  function make(kind, type, x, t, opts = {}) {
    const e = {
      id: nextId++, kind, type, x, y: height + CONFIG.RADIUS,
      vx: 0, vy: 0, rot: 0, vrot: range(rng, -2, 2), r: CONFIG.RADIUS,
      alive: true, float: false, born: t, age: 0, phase: rng() * Math.PI * 2,
    };
    if (opts.float) {
      e.float = true;
      e.vy = -140 * range(rng, 0.85, 1.2);
      e.vrot = range(rng, -0.4, 0.4);
      return e;
    }
    const frac = opts.apex ?? range(rng, 0.5, 0.78);
    e.vy = -Math.sqrt(2 * CONFIG.GRAVITY * frac * height);
    const tApex = -e.vy / CONFIG.GRAVITY;
    e.vx = (range(rng, 200, width - 200) - x) / (2 * tApex);
    return e;
  }

  function rollKind() {
    if (bonuses < CONFIG.MAX_BONUSES && rng() < CONFIG.BONUS_CHANCE) return 'bonus';
    const r = rng();
    if (r < weights.microbe) return 'microbe';
    if (r < weights.microbe + weights.fruit) return 'fruit';
    return 'cell';
  }

  const conflicts = (kind, x, batch) => batch.some((o) => {
    const pair = (kind === 'cell' && o.kind === 'microbe') || (kind === 'microbe' && o.kind === 'cell');
    return pair && Math.abs(o.x - x) < CELL_GAP;
  });

  function playBatch(t, alive) {
    const p = t / CONFIG.ROUND_SEC;
    const maxAlive = Math.round(lerp(3, 7, p));
    if (alive >= maxAlive) {
      nextAt = t + 0.2;
      return [];
    }
    let size = 1 + (rng() < lerp(0.1, 0.6, p) ? 1 : 0) + (rng() < lerp(0, 0.35, p) ? 1 : 0);
    size = Math.min(size, maxAlive - alive);
    const batch = [];
    for (let i = 0; i < size; i++) {
      let kind = rollKind();
      let x = range(rng, 150, width - 150);
      for (let tries = 0; tries < 6 && conflicts(kind, x, batch); tries++) x = range(rng, 150, width - 150);
      if (conflicts(kind, x, batch)) kind = 'fruit';
      if (kind === 'bonus') bonuses++;
      batch.push(make(kind, pick(rng, TYPES[kind]), x, t));
    }
    nextAt = t + lerp(1.1, 0.45, p) * range(rng, 0.85, 1.15);
    return batch;
  }

  function tutorialBatch(t) {
    if (!tutorialCellDone && t >= TUTORIAL_CELL_AT) {
      tutorialCellDone = true;
      nextAt = t + 1.6;
      return [make('cell', 'bilyk', width / 2, t, { apex: 0.6 })];
    }
    nextAt = t + 1.4;
    return [make('microbe', pick(rng, TYPES.microbe), range(rng, 250, width - 250), t, { apex: 0.6 })];
  }

  function calmBatch(t, alive) {
    nextAt = t + 1.6;
    if (alive >= 6) return [];
    return [make('microbe', pick(rng, TYPES.microbe), range(rng, 150, width - 150), t, { float: true })];
  }

  return {
    update(t, dt, alive) {
      if (t < nextAt) return [];
      if (mode === 'calm') return calmBatch(t, alive);
      if (t >= CONFIG.ROUND_SEC) return [];
      if (tutorial && t < TUTORIAL_SEC) {
        if (alive >= 3) {
          nextAt = t + 0.2;
          return [];
        }
        return tutorialBatch(t);
      }
      return playBatch(t, alive);
    },
  };
}
