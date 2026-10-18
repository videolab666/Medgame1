// Decides what flies out, where and when. Pure and seeded.
// Throws follow WAVE_PLAN (src/core/waves.js): one object and a long pause,
// then growing groups, some thrown together, some as quick strings.
import { CONFIG, LOCATIONS, gravityFor, typesFor } from './config.js';
import { pick, range } from './rng.js';
import { ANGLE_MAX, SAFE_SLOTS, SPEED_MIN_RATIO, WAVE_PLAN } from './waves.js';

const CELL_GAP = 200;
const FIRST_WAVE_AT = 0.5;
const SPEED_UP_MAX = 1.5;

export function createSpawner({ rng, width, height, location, mode, duration = CONFIG.ROUND_SEC }) {
  const weights = LOCATIONS[location];
  const TYPES = typesFor(location);
  const gravity = gravityFor(height);
  const vMax = Math.sqrt(2 * gravity * CONFIG.APEX_MAX * height);
  const margin = CONFIG.RADIUS * 2;
  let nextId = 1;
  let bonuses = 0;

  // Wave state: absolute spawn times of the current wave, waiting in `queue`.
  let slot = 0;
  let nextWaveAt = FIRST_WAVE_AT;
  let queue = [];
  let wave = null;
  let speed = 1;
  const setWeights = new Map();

  let calmNextAt = 0.3;

  function chooseWave(entry) {
    if (!entry.options) return entry;
    let w = setWeights.get(entry.set);
    if (!w) {
      w = entry.options.map((o) => o.weight);
      setWeights.set(entry.set, w);
    }
    const total = w.reduce((a, b) => a + b, 0);
    let r = rng() * total;
    let idx = 0;
    while (idx < w.length - 1 && r >= w[idx]) r -= w[idx++];
    // Regrow everyone, then empty the chosen one.
    entry.options.forEach((o, i) => {
      w[i] = Math.min(o.weight, w[i] + o.weight * entry.regrow);
    });
    w[idx] = 0;
    return entry.options[idx].wave;
  }

  function startWave(t) {
    const entry = WAVE_PLAN[Math.min(slot, WAVE_PLAN.length - 1)];
    wave = { ...chooseWave(entry) };
    if (wave.inc) speed = Math.min(SPEED_UP_MAX, speed + wave.inc);
    const t0 = t + wave.start;
    let span = 0;
    queue = [];
    for (const g of wave.groups) {
      const n = g.n[0] + Math.floor(rng() * (g.n[1] - g.n[0] + 1));
      for (let i = 0; i < n; i++) queue.push(t0 + i * g.gap);
      span = Math.max(span, (n - 1) * g.gap);
    }
    queue.sort((a, b) => a - b);
    wave.safe = slot < SAFE_SLOTS;
    wave.batch = [];
    nextWaveAt = t0 + span + wave.end;
    slot++;
  }

  function launch(e, opts = {}) {
    // Vertical speed sets the apex; ±12° from vertical, aimed inward near edges.
    const v = vMax * range(rng, SPEED_MIN_RATIO, 1) * (opts.speed ?? 1);
    let angle = range(rng, -ANGLE_MAX, ANGLE_MAX);
    if ((e.x < width * 0.3 && angle < 0) || (e.x > width * 0.7 && angle > 0)) angle = -angle;
    e.vx = v * Math.sin(angle);
    e.vy = -v * Math.cos(angle);
  }

  function make(kind, type, x, t, opts = {}) {
    const e = {
      id: nextId++, kind, type, x, y: height + CONFIG.RADIUS,
      vx: 0, vy: 0, rot: 0, vrot: range(rng, -2, 2), r: CONFIG.RADIUS,
      alive: true, float: false, born: t, age: 0, phase: rng() * Math.PI * 2, ts: opts.ts ?? 1,
    };
    if (opts.float) {
      e.float = true;
      e.vy = -140 * range(rng, 0.85, 1.2);
      e.vrot = range(rng, -0.4, 0.4);
      return e;
    }
    if (opts.side) {
      // Bonuses drift in from a side, slower and lower — easy to spot.
      const fromLeft = rng() < 0.5;
      e.x = fromLeft ? -CONFIG.RADIUS : width + CONFIG.RADIUS;
      e.y = height * range(rng, 0.55, 0.75);
      e.vx = (fromLeft ? 1 : -1) * (width / 2.6);
      e.vy = -Math.sqrt(2 * gravity * height * 0.18);
      return e;
    }
    launch(e);
    return e;
  }

  function rollKind() {
    if (bonuses < CONFIG.MAX_BONUSES && rng() < CONFIG.BONUS_CHANCE) return 'bonus';
    const r = rng();
    if (r < weights.microbe) return 'microbe';
    if (r < weights.microbe + weights.fruit) return 'fruit';
    return 'cell';
  }

  // Opening waves: only things the child should swipe.
  function safeKind() {
    const kind = rollKind();
    if (kind === 'microbe' || kind === 'fruit') return kind;
    return weights.microbe >= weights.fruit ? 'microbe' : 'fruit';
  }

  const conflicts = (kind, x, list) => list.some((o) => {
    const pair = (kind === 'cell' && o.kind === 'microbe') || (kind === 'microbe' && o.kind === 'cell');
    return pair && Math.abs(o.x - x) < CELL_GAP;
  });

  // Objects thrown at the same instant spread across the width.
  function pickX(sameTime) {
    let best = range(rng, margin, width - margin);
    for (let tries = 0; tries < 8; tries++) {
      const x = range(rng, margin, width - margin);
      const clear = sameTime.every((o) => Math.abs(o.x - x) > CONFIG.RADIUS * 2.2);
      if (clear) return x;
      best = x;
    }
    return best;
  }

  function emitOne(t, sameTime) {
    let kind = wave.safe ? safeKind() : rollKind();
    let x = pickX(sameTime);
    for (let tries = 0; tries < 6 && conflicts(kind, x, wave.batch); tries++) x = pickX(sameTime);
    if (conflicts(kind, x, wave.batch)) kind = 'fruit';
    if (kind === 'bonus') bonuses++;
    const e = make(kind, pick(rng, TYPES[kind]), x, t, { side: kind === 'bonus', ts: (wave.ts ?? 1) * speed });
    wave.batch.push(e);
    return e;
  }

  function calmBatch(t, alive) {
    calmNextAt = t + 1.6;
    if (alive >= 6) return [];
    return [make('microbe', pick(rng, TYPES.microbe), range(rng, 150, width - 150), t, { float: true })];
  }

  return {
    gravity,
    update(t, dt, alive) {
      if (mode === 'calm') {
        if (t < calmNextAt) return [];
        return calmBatch(t, alive);
      }
      // No new wave right before the bell so the round ends calmly.
      if (queue.length === 0 && t >= nextWaveAt && t < duration - 1.5) startWave(t);

      const out = [];
      while (queue.length && t >= queue[0]) {
        queue.shift();
        if (t > duration - 0.4) continue;
        out.push(emitOne(t, out));
      }
      return out;
    },
  };
}
