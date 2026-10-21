// Decides what flies out, where and when. Pure and seeded.
// Throws follow WAVE_PLAN (src/core/waves.js): one object, then growing groups,
// some thrown together, some as quick strings. The tempo is the live one: the
// only pause between series is the next series' own short lead-in.
// Characters the child must not touch ("cells") are never random: they fly
// out exactly where the plan puts them, in groups or as a mark in a string.
// The microbe king is spawned by the round, which asks for him right here.
//
// Every play round begins with five introductory waves: four ordinary waves
// and one isolated pair/singleton of non-sliceable friends. The shared run only
// resumes after that introduction, preserving late-game speed and mix across
// rounds. Old saved cursors are accepted without making the opening unsafe.
import { CONFIG, LOCATIONS, gravityFor, typesFor } from './config.js';
import { mulberry32, pick, range } from './rng.js';
import { ECONOMY } from './economy.js';
import { ANGLE_MAX, SAFE_SLOTS, SPEED_MIN_RATIO, INTRO_WAVES, WAVE_PLAN } from './waves.js';

const CELL_GAP = 200;
export const FIRST_WAVE_AT = 0.5;
const SPEED_UP_MAX = 1.5;

export function createSpawner({ rng, width, height, location, mode, duration = CONFIG.ROUND_SEC, run = null }) {
  const weights = LOCATIONS[location];
  const TYPES = typesFor(location);
  const gravity = gravityFor(height);
  const vMax = Math.sqrt(2 * gravity * CONFIG.APEX_MAX * height);
  const margin = CONFIG.RADIUS * 2;
  const hScale = Math.min(1, (width / height) / (2412 / 1080));
  let nextId = 1;
  let bonuses = 0;
  // Golden stars come from their own random stream, so adding them never
  // shifts the wave plan.
  const goldRng = mulberry32(((width * 7919) ^ (height * 104729) ^ duration * 31) >>> 0);
  let golds = 0;
  let pendingGold = null;

  // Wave state: absolute spawn times of the current wave, waiting in `queue`.
  const runState = run ?? { slot: 0, speeds: {}, weights: {} };
  // This local counter starts from zero every round even if the save already
  // reached the repeating hard waves. Saved progress is resumed after wave 5.
  let openingSlot = 0;
  let slot = Math.min(Math.max(runState.slot ?? INTRO_WAVES, INTRO_WAVES), WAVE_PLAN.length - 1);
  let nextWaveAt = FIRST_WAVE_AT;
  let queue = [];
  let wave = null;

  let calmNextAt = 0.3;

  function chooseWave(entry) {
    if (!entry.options) return { wave: entry, key: null };
    let w = runState.weights[entry.set];
    if (!w || w.length !== entry.options.length) {
      w = entry.options.map((o) => o.weight);
      runState.weights[entry.set] = w;
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
    return { wave: entry.options[idx].wave, key: `${entry.set}${idx}` };
  }

  function startWave(t) {
    const inOpening = openingSlot < INTRO_WAVES;
    const planSlot = inOpening ? openingSlot : slot;
    const entry = WAVE_PLAN[planSlot];
    const picked = chooseWave(entry);
    wave = { ...picked.wave };
    // The repeating set climbs like the last waves of a classic run: every use of this exact
    // option speeds its flight by `inc`, and the speed survives the round.
    let scale = 1;
    if (wave.inc) {
      scale = runState.speeds[picked.key] ?? 1;
      runState.speeds[picked.key] = Math.min(SPEED_UP_MAX, scale + wave.inc);
    }
    wave.tsScale = (wave.ts ?? 1) * scale;
    const t0 = t + wave.start;
    let span = 0;
    queue = [];
    for (const g of wave.groups) {
      const n = g.n[0] + Math.floor(rng() * (g.n[1] - g.n[0] + 1));
      for (let i = 0; i < n; i++) {
        // 'cell' groups are characters only. In a pattern group 'ssc' every
        // marked throw is a character, throws before the mark are plain
        // sliceables and throws past it are a roll (bonuses possible).
        const spec = g.kind === 'cell' ? 'cell'
          : g.seq ? (g.seq[i] === 'c' ? 'cell' : i < g.seq.length ? 'plain' : 'roll')
            : 'roll';
        queue.push({ t: t0 + i * g.gap, spec });
      }
      span = Math.max(span, (n - 1) * g.gap);
    }
    // Same-instant throws: characters leave first, so every roll after them
    // can spread around a character it already knows about.
    queue.sort((a, b) => a.t - b.t
      || (a.spec === 'cell' ? -1 : b.spec === 'cell' ? 1 : 0));
    // During the four safe intro waves neither a bonus nor a golden star may
    // be spawned, so nothing extra can drift across the solo fifth wave.
    wave.safe = inOpening && openingSlot < SAFE_SLOTS;
    wave.batch = [];
    nextWaveAt = t0 + span + wave.end;
    if (inOpening) {
      openingSlot++;
      // After reaching the fifth wave, discard legacy saved cursors < 5.
      if (openingSlot === INTRO_WAVES) runState.slot = slot;
    } else {
      slot = Math.min(slot + 1, WAVE_PLAN.length - 1);
      runState.slot = slot;
    }
  }

  function launch(e, opts = {}) {
    // Vertical speed sets the apex; ±12° from vertical, aimed inward near edges.
    const v = vMax * range(rng, SPEED_MIN_RATIO, 1) * (opts.speed ?? 1);
    let angle = range(rng, -ANGLE_MAX, ANGLE_MAX);
    if ((e.x < width * 0.3 && angle < 0) || (e.x > width * 0.7 && angle > 0)) angle = -angle;
    // The reference is played on a wide screen (2412 × 1080): there ±12°
    // drifts an object about a third of the width. Scaling the sideways speed
    // by the aspect ratio keeps that drift in shares of the width, so on a
    // narrow portrait screen objects do not slide off the sides.
    e.vx = v * Math.sin(angle) * hScale;
    e.vy = -v * Math.cos(angle);
  }

  // `r` is the random stream to use (golden stars bring their own).
  function make(kind, type, x, t, opts = {}, r = rng) {
    const e = {
      id: nextId++, kind, type, x, y: height + CONFIG.RADIUS,
      vx: 0, vy: 0, rot: 0, vrot: range(r, -2, 2), r: CONFIG.RADIUS,
      alive: true, float: false, born: t, age: 0, phase: r() * Math.PI * 2, ts: opts.ts ?? 1,
    };
    if (opts.float) {
      e.float = true;
      e.vy = -140 * range(r, 0.85, 1.2);
      e.vrot = range(r, -0.4, 0.4);
      return e;
    }
    if (opts.side) {
      // Bonuses drift in from a side, slower and lower — easy to spot.
      const fromLeft = r() < 0.5;
      e.x = fromLeft ? -CONFIG.RADIUS : width + CONFIG.RADIUS;
      e.y = height * range(r, 0.55, 0.75);
      e.vx = (fromLeft ? 1 : -1) * (width / 2.6);
      e.vy = -Math.sqrt(2 * gravity * height * 0.18);
      return e;
    }
    launch(e);
    return e;
  }

  // Whatever the child should swipe: microbe or fruit (never a character).
  function plainKind() {
    return rng() < weights.microbe ? 'microbe' : 'fruit';
  }

  function rollKind() {
    if (bonuses < CONFIG.MAX_BONUSES && rng() < CONFIG.BONUS_CHANCE) return 'bonus';
    return plainKind();
  }

  // A character keeps its distance from every thrown object and vice versa:
  // any roll (microbe, fruit or bonus) too close to a planned character is
  // re-placed, and a microbe that still cannot dodge turns into fruit. The
  // check never looks at which sliceable kind it is, so the random stream —
  // and with it the whole plan — stays identical in every location.
  const conflicts = (kind, x, list) => list.some((o) => {
    const pair = (kind === 'cell') !== (o.kind === 'cell');
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

  function emitOne(t, sameTime, spec = 'roll') {
    // A character flies only where the plan says so; everything else rolls.
    // Pattern throws never roll a bonus, so a string keeps its rhythm.
    let kind = spec === 'cell' ? 'cell'
      : (spec === 'plain' || wave.safe) ? plainKind() : rollKind();
    let x = pickX(sameTime);
    for (let tries = 0; tries < 6 && conflicts(kind, x, wave.batch); tries++) x = pickX(sameTime);
    // A rolled microbe too close to a planned character becomes fruit; a
    // planned character stays one whatever happens (pickX spreads throws).
    if (kind === 'microbe' && conflicts(kind, x, wave.batch)) kind = 'fruit';
    if (kind === 'bonus') bonuses++;
    const e = make(kind, pick(rng, TYPES[kind]), x, t, { side: kind === 'bonus', ts: wave.tsScale ?? 1 });
    wave.batch.push(e);
    // Now and then a golden star drifts in from a side next to a throw.
    if (!wave.safe && (kind === 'microbe' || kind === 'fruit') && golds < ECONOMY.GOLD_MAX
      && goldRng() < ECONOMY.GOLD_CHANCE) {
      golds++;
      pendingGold = make('gold', 'goldstar', x, t, { side: true }, goldRng);
    }
    return e;
  }

  // The microbe king: a big character that slips in from a side and slowly
  // arcs across the middle. Speed, gravity and the arc are projected from the
  // Classic bonus fruit (speed 6 of 10.1–11.5, gravity 3.25 of 9.5 → 0.34,
  // apex about half a screen) to our world units.
  function makeKing(t) {
    const fromLeft = rng() < 0.5;
    const gravKing = gravity * 0.34;
    const e = {
      id: nextId++, kind: 'king', type: 'korol',
      x: fromLeft ? -margin : width + margin,
      y: height * 0.85,
      vx: (fromLeft ? 1 : -1) * width * 0.383,
      vy: -Math.sqrt(gravKing * height),
      gravity: gravKing,
      rot: 0, vrot: range(rng, -0.4, 0.4), r: CONFIG.RADIUS * CONFIG.KING_SCALE,
      alive: true, float: false, born: t, age: 0, phase: rng() * Math.PI * 2,
      ts: 1, hits: 0, lastSliceAt: -Infinity,
    };
    return e;
  }

  function calmBatch(t, alive) {
    calmNextAt = t + 1.6;
    if (alive >= 6) return [];
    return [make('microbe', pick(rng, TYPES.microbe), range(rng, 150, width - 150), t, { float: true })];
  }

  return {
    gravity,
    // Extra round time («Ще трішки»): waves keep coming until the new end.
    extend(sec) {
      duration += sec;
    },
    // Spawns the king for the round loop (lives, slices and the burst live in
    // src/core/round.js — the wave queue never contains him).
    king: makeKing,
    update(t, dt, alive) {
      if (mode === 'calm') {
        if (t < calmNextAt) return [];
        return calmBatch(t, alive);
      }
      // A wave is over only when everything it threw is gone — sliced, caught
      // or fallen off the screen (measured on the reference game: the next
      // series leaves ~1 s after the previous fruit disappears). Side-drifting
      // bonuses and the king do not hold the next wave back.
      if (wave && !wave.cleared && queue.length === 0
        && wave.batch.every((e) => !e.alive || e.kind === 'bonus' || e.kind === 'king' || e.kind === 'gold')) {
        wave.cleared = true;
        nextWaveAt = Math.max(nextWaveAt, t + wave.end);
      }
      // No new wave right before the bell so the round ends calmly.
      if (queue.length === 0 && (!wave || wave.cleared) && t >= nextWaveAt && t < duration - 1.5) startWave(t);

      const out = [];
      while (queue.length && t >= queue[0].t) {
        const { spec } = queue.shift();
        if (t > duration - 0.4) continue;
        out.push(emitOne(t, out, spec));
        if (pendingGold) {
          out.push(pendingGold);
          pendingGold = null;
        }
      }
      return out;
    },
  };
}
