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
// Spawns grouped into waves: a new wave starts after a gap of more than 2 s.
const waves = (es) => {
  const out = [];
  for (const e of es) {
    const last = out[out.length - 1];
    if (last && e.born - last[last.length - 1].born < 2) last.push(e);
    else out.push([e]);
  }
  return out;
};

test('deterministic by seed', () => {
  assert.deepEqual(run().map((e) => e.type), run().map((e) => e.type));
});

test('opening: one, one, then 2–3 thrown together, with 5 s rests', () => {
  const w = waves(run({}, 20));
  assert.equal(w[0].length, 1);
  assert.equal(w[1].length, 1);
  assert.ok(w[2].length >= 2 && w[2].length <= 3, `third wave ${w[2].length}`);
  assert.ok(w[2].every((e) => e.born === w[2][0].born), 'third wave is thrown together');
  assert.ok(Math.abs(w[1][0].born - w[0][0].born - 5) < 0.05, `rest ${w[1][0].born - w[0][0].born}`);
});

test('fifth wave flies in slow motion', () => {
  const w = waves(run({}, 30));
  assert.ok(w[4].every((e) => e.ts === 0.75), w[4].map((e) => e.ts).join(','));
});

test('opening waves have no friendly characters or bonuses', () => {
  for (let seed = 1; seed < 20; seed++) {
    const w = waves(run({ location: 'blood' }, 12, seed));
    for (const e of [...w[0], ...w[1]]) assert.ok(e.kind === 'microbe' || e.kind === 'fruit', `${seed}: ${e.kind}`);
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

test('blood has more friendly cells than hands', () => {
  const cells = (l) => [1, 2, 3].reduce((n, s) => n + run({ location: l }, 60, s).filter((e) => e.kind === 'cell').length, 0);
  assert.ok(cells('blood') > cells('hands'));
});

test('calm: only floating microbes, unhurried', () => {
  const es = run({ mode: 'calm' }, 20);
  assert.ok(es.length > 0 && es.every((e) => e.kind === 'microbe' && e.float));
  assert.ok(es.length < 20);
});

test('throws stay within 12° of vertical and land in 2.0–2.4 s', () => {
  const g = gravityFor(H);
  for (const e of run({}, 30).filter((x) => x.kind !== 'bonus')) {
    const angle = Math.abs(Math.atan2(e.vx, -e.vy)) * (180 / Math.PI);
    assert.ok(angle <= 12.001, `angle ${angle}`);
    const flight = (2 * -e.vy) / g;
    assert.ok(flight >= 2.0 && flight <= 2.4, `flight ${flight}`);
  }
});

test('launched entity peaks inside the screen then falls off', () => {
  const [e] = run({}, 1);
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

test('cells never spawn next to a microbe in the same wave', () => {
  for (const w of waves(run({ location: 'blood' }, 120))) {
    for (const c of w.filter((e) => e.kind === 'cell')) {
      for (const m of w.filter((e) => e.kind === 'microbe')) assert.ok(Math.abs(c.x - m.x) >= 200);
    }
  }
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
