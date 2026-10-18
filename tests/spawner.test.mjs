import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpawner } from '../src/core/spawner.js';
import { stepEntity, isOffscreen } from '../src/core/physics.js';
import { mulberry32 } from '../src/core/rng.js';
import { CONFIG, gravityFor } from '../src/core/config.js';

const STEP = 1 / 60;
const H = 2000;
const run = (opts = {}, sec = 60, seed = 7) => {
  const sp = createSpawner({
    rng: mulberry32(seed), width: 1000, height: H, location: 'hands', mode: 'play', ...opts,
  });
  const out = [];
  for (let i = 0; i * STEP < sec; i++) out.push(...sp.update(i * STEP, STEP, 0));
  return out;
};
// Spawns grouped into waves: inside a series throws are at most 0.7 s apart and
// the next series waits at least 0.8 s, so 0.75 s splits the groups.
const waves = (es) => {
  const out = [];
  for (const e of es) {
    const last = out[out.length - 1];
    if (last && e.born - last[last.length - 1].born < 0.75) last.push(e);
    else out.push([e]);
  }
  return out;
};

test('deterministic by seed', () => {
  assert.deepEqual(run().map((e) => e.type), run().map((e) => e.type));
});

test('opening: one, one, then 2–3 thrown together; 1 s between waves (live tempo)', () => {
  const w = waves(run({}, 20));
  assert.equal(w[0].length, 1);
  assert.equal(w[1].length, 1);
  assert.ok(w[2].length >= 2 && w[2].length <= 3, `third wave ${w[2].length}`);
  assert.ok(w[2].every((e) => e.born === w[2][0].born), 'third wave is thrown together');
  const lead = w[1][0].born - w[0][0].born;
  assert.ok(Math.abs(lead - 1) < 0.05, `lead-in ${lead}`);
});

test('fifth stage is the slow lesson: only forbidden characters', () => {
  const w = waves(run({}, 30));
  assert.ok(w[4].length >= 1 && w[4].length <= 2, `stage 5 has ${w[4].length}`);
  assert.ok(w[4].every((e) => e.kind === 'cell'), w[4].map((e) => e.kind).join(','));
  assert.ok(w[4].every((e) => e.ts === 0.75), w[4].map((e) => e.ts).join(','));
  assert.ok(w[4].every((e) => e.born === w[4][0].born), 'thrown together');
});

test('the first four stages only throw sliceables (no characters, no bonuses early)', () => {
  for (let seed = 1; seed < 20; seed++) {
    const w = waves(run({ location: 'blood' }, 20, seed));
    for (const e of [...w[0], ...w[1], ...w[2], ...w[3]]) assert.notEqual(e.kind, 'cell', `seed ${seed}: character early`);
    for (const e of [...w[0], ...w[1]]) assert.ok(e.kind === 'microbe' || e.kind === 'fruit', `seed ${seed}: ${e.kind}`);
  }
});

test('later waves grow into big groups and strings', () => {
  let biggest = 0;
  for (let seed = 1; seed < 10; seed++) {
    for (const w of waves(run({}, 120, seed))) biggest = Math.max(biggest, w.length);
  }
  assert.ok(biggest >= 7, `biggest wave ${biggest}`);
});

test('weighted choices rarely repeat the same wave back to back', () => {
  // Over many long rounds both options of the first choice slot appear.
  const sizes = new Set();
  for (let seed = 1; seed < 30; seed++) {
    const w = waves(run({}, 40, seed));
    if (w[5]) sizes.add(w[5].length >= 7 ? 'string' : 'small');
  }
  assert.deepEqual([...sizes].sort(), ['small', 'string']);
});

test('no new objects after a custom round duration', () => {
  const es = run({ duration: 40 }, 45);
  assert.ok(es.length > 0);
  assert.ok(Math.max(...es.map((e) => e.born)) < 40);
});

test('max 3 bonuses, and bonuses drift in from a side', () => {
  for (let seed = 1; seed < 20; seed++) {
    const b = run({}, 60, seed).filter((e) => e.kind === 'bonus');
    assert.ok(b.length <= 3);
    for (const e of b) assert.ok(e.x < 0 || e.x > 1000, `bonus x ${e.x}`);
  }
});

test('forbidden characters follow one plan for every location', () => {
  // Characters fly on a fixed slot schedule; only the faces
  // change between locations. Same seeds must therefore give same counts.
  const cells = (l) => [1, 2, 3].reduce((n, s) => n + run({ location: l }, 60, s).filter((e) => e.kind === 'cell').length, 0);
  assert.equal(cells('blood'), cells('hands'));
  assert.ok(cells('blood') > 0);
});

test('sequence stages mark their forbidden character exactly', () => {
  // 'ssc'/'sssc'/'sssssc' groups: in a string that is not thrown together the
  // single character sits at the third, fourth or sixth throw.
  for (let seed = 1; seed < 8; seed++) {
    for (const w of waves(run({}, 120, seed))) {
      const cells = w.map((e, i) => [e, i]).filter(([e]) => e.kind === 'cell');
      if (cells.length !== 1 || w.length < 4) continue;
      if (w[w.length - 1].born - w[0].born < 0.4) continue;
      assert.ok([2, 3, 5].includes(cells[0][1]), `seed ${seed}: length ${w.length}, character at ${cells[0][1]}`);
    }
  }
});

test('calm: only floating microbes, unhurried', () => {
  const es = run({ mode: 'calm' }, 20);
  assert.ok(es.length > 0 && es.every((e) => e.kind === 'microbe' && e.float));
  assert.ok(es.length < 20);
});

test('throws stay within 12° of vertical and land within the design airtime', () => {
  const g = gravityFor(H);
  for (const e of run({}, 30).filter((x) => x.kind !== 'bonus')) {
    const angle = Math.abs(Math.atan2(e.vx, -e.vy)) * (180 / Math.PI);
    assert.ok(angle <= 12.001, `angle ${angle}`);
    const flight = (2 * -e.vy) / g;
    assert.ok(flight >= 2.0 && flight <= CONFIG.AIRTIME_MAX + 0.01, `flight ${flight}`);
  }
});

test('launched entity peaks inside the screen then falls off', () => {
  const [e] = run({}, 2);
  let minY = e.y;
  let gone = false;
  for (let i = 0; i < 600 && !gone; i++) {
    stepEntity(e, STEP, gravityFor(H));
    minY = Math.min(minY, e.y);
    gone = isOffscreen(e, H, 1000);
  }
  assert.ok(minY > 0 && minY < H * 0.5, `apex ${minY}`);
  assert.ok(gone);
});

test('objects are the configured size', () => {
  assert.ok(run({}, 30).every((e) => e.r === CONFIG.RADIUS));
});

test('a rolled microbe never appears next to a character already in the air', () => {
  // The child must not see a microbe fly out hugging a character: a roll that
  // comes after a planned character dodges up to six times, and a microbe that
  // still cannot keep CELL_GAP turns into fruit (see emitOne).
  for (const w of waves(run({ location: 'blood' }, 120))) {
    const seen = [];
    for (const e of w) {
      if (e.kind === 'cell') seen.push(e);
      else if (e.kind === 'microbe') {
        for (const c of seen) {
          assert.ok(Math.abs(c.x - e.x) >= 200,
            `a microbe appears ${Math.abs(c.x - e.x).toFixed(1)} units from a character @${e.born.toFixed(2)} s`);
        }
      }
    }
  }
});

test('a rolled microbe next to a character downgrades to fruit (narrow world)', () => {
  // On a 320-wide world there is nowhere to spread, so every sliceable rolled
  // after a character in the same wave hits the fallback: it must become a
  // fruit instead of crashing on a re-assigned const.
  let mixed = 0;
  for (let seed = 1; seed < 12; seed++) {
    for (const w of waves(run({ width: 320, duration: 300 }, 90, seed))) {
      const cells = [];
      for (const e of w) {
        if (e.kind === 'cell') cells.push(e);
        else if (e.kind === 'microbe') {
          assert.ok(cells.every((c) => Math.abs(c.x - e.x) >= 200),
            `seed ${seed}: microbe at ${e.x} next to a character`);
        } else if (e.kind === 'fruit' && cells.length && Math.abs(cells[0].x - e.x) < 200) {
          mixed++;
        }
      }
    }
  }
  assert.ok(mixed > 0, 'no mixed character+sliceable wave was thrown in 90 s');
});

test('the king maker launches him from a side, on his own gravity', () => {
  const sp = createSpawner({ rng: mulberry32(5), width: 1000, height: H, location: 'hands', mode: 'play' });
  const k = sp.king(3);
  assert.equal(k.kind, 'king');
  assert.equal(k.r, CONFIG.RADIUS * CONFIG.KING_SCALE);
  assert.ok(k.x < 0 || k.x > 1000, `x ${k.x}`);
  assert.ok(k.vy < 0 && Math.abs(k.vx) > 0);
  // He rises about half a screen and sinks back; the fall lasts one flight.
  let minY = k.y;
  let gone = false;
  for (let i = 0; i < 600 && !gone; i++) {
    stepEntity(k, STEP, k.gravity);
    minY = Math.min(minY, k.y);
    gone = isOffscreen(k, H, 1000);
  }
  assert.ok(minY > 0 && minY < H * 0.5, `apex ${minY}`);
  assert.ok(gone, 'king eventually leaves the screen');
});

test('each location spawns only its own pools', async () => {
  const { typesFor, LOCATION_ORDER } = await import('../src/core/config.js');
  for (const loc of LOCATION_ORDER) {
    const pools = typesFor(loc);
    for (const e of run({ location: loc })) assert.ok(pools[e.kind].includes(e.type), `${loc}: ${e.kind} ${e.type}`);
  }
});

test('tummy friendly character is the good bacterium', () => {
  const cells = [1, 2, 3].flatMap((s) => run({ location: 'tummy' }, 60, s)).filter((e) => e.kind === 'cell');
  assert.ok(cells.length > 0 && cells.every((e) => e.type === 'dobryk'));
});

// ── the endless trip across rounds ──
// One run per location, cut into rounds by the timer: the slot cursor, the
// speeds of the repeating set and the regrowing weights live in the shared
// `run`.

const step = (sp, sec) => {
  const out = [];
  for (let i = 0; i * STEP < sec; i++) out.push(...sp.update(i * STEP, STEP, 0));
  return out;
};

test('a round continues the trip from the saved slot', async () => {
  const { WAVE_PLAN } = await import('../src/core/waves.js');
  const trip = { slot: 4, speeds: {}, weights: {} }; // the "don't touch" lesson
  const sp = createSpawner({
    rng: mulberry32(3), width: 1000, height: H, location: 'hands', mode: 'play', duration: 40, run: trip,
  });
  const born = step(sp, 2); // only the lesson's own throws are out by then
  assert.ok(born.length > 0);
  assert.ok(born.every((e) => e.kind === 'cell'), born.map((e) => e.kind).join(','));
  assert.ok(trip.slot > 4 && trip.slot < WAVE_PLAN.length, `cursor moved from the saved slot (${trip.slot})`);
});

test('the next round starts exactly where the previous one stopped', async () => {
  const { WAVE_PLAN } = await import('../src/core/waves.js');
  const trip = { slot: 0, speeds: {}, weights: {} };
  const first = createSpawner({
    rng: mulberry32(11), width: 1000, height: H, location: 'hands', mode: 'play', duration: 20, run: trip,
  });
  step(first, 20);
  const saved = trip.slot;
  assert.ok(saved >= 3, `a 20 s round consumed ${saved} slots`);

  const second = createSpawner({
    rng: mulberry32(12), width: 1000, height: H, location: 'hands', mode: 'play', duration: 40, run: trip,
  });
  step(second, 0.7); // just past the first wave start (0.5 s)
  assert.equal(trip.slot, Math.min(saved + 1, WAVE_PLAN.length - 1), 'the very next slot started');
});

test('the repeating set speeds up use by use and keeps it across rounds', async () => {
  const { WAVE_PLAN } = await import('../src/core/waves.js');
  const trip = { slot: WAVE_PLAN.length - 1, speeds: {}, weights: {} };
  const sp = createSpawner({
    rng: mulberry32(21), width: 1000, height: H, location: 'hands', mode: 'play', duration: 240, run: trip,
  });
  const es = step(sp, 240);
  const speeds = Object.values(trip.speeds);
  assert.ok(speeds.length >= 1, 'the set recorded its uses');
  assert.ok(speeds.every((v) => v > 1 && v <= 1.5), speeds.join(','));
  assert.ok(Math.max(...es.map((e) => e.ts)) > 1.02, 'flights got faster');

  const snapshot = { ...trip.speeds };
  const next = createSpawner({
    rng: mulberry32(22), width: 1000, height: H, location: 'hands', mode: 'play', duration: 40, run: trip,
  });
  step(next, 40);
  for (const [key, v] of Object.entries(snapshot)) {
    assert.ok(trip.speeds[key] >= v, `${key} reset from ${v} to ${trip.speeds[key]}`);
  }
});

test('the repeating set never exceeds its speed cap', async () => {
  const { WAVE_PLAN } = await import('../src/core/waves.js');
  const trip = { slot: WAVE_PLAN.length - 1, speeds: {}, weights: {} };
  const sp = createSpawner({
    rng: mulberry32(31), width: 1000, height: H, location: 'hands', mode: 'play', duration: 1200, run: trip,
  });
  step(sp, 1200);
  assert.ok(Object.values(trip.speeds).every((v) => v <= 1.5));
  assert.equal(Math.max(...Object.values(trip.speeds)), 1.5, 'the cap is reached');
});

test('set weights live in the trip, not in the spawner', () => {
  const trip = { slot: 5, speeds: {}, weights: {} }; // first set A slot
  const sp = createSpawner({
    rng: mulberry32(41), width: 1000, height: H, location: 'hands', mode: 'play', duration: 12, run: trip,
  });
  step(sp, 12);
  const w = trip.weights.a;
  assert.ok(Array.isArray(w) && w.length === 2, `weights ${JSON.stringify(trip.weights)}`);
  assert.ok(w.includes(0), 'the just-picked option sits at zero');
  const next = createSpawner({
    rng: mulberry32(42), width: 1000, height: H, location: 'hands', mode: 'play', duration: 40, run: trip,
  });
  step(next, 0.7); // one more pick happens in the next round
  assert.equal(trip.weights.a, w, 'the next round reuses the very same weights');
});
