import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpawner } from '../src/core/spawner.js';
import { stepEntity, isOffscreen } from '../src/core/physics.js';
import { mulberry32 } from '../src/core/rng.js';

const STEP = 1 / 60;
const run = (opts = {}, sec = 60) => {
  const sp = createSpawner({
    rng: mulberry32(7), width: 1000, height: 2000, location: 'hands', mode: 'play', tutorial: false, ...opts,
  });
  const out = [];
  for (let i = 0; i * STEP < sec; i++) out.push(...sp.update(i * STEP, STEP, 0));
  return out;
};

test('deterministic by seed', () => {
  assert.deepEqual(run().map((e) => e.type), run().map((e) => e.type));
});

test('spawn rate rises over round', () => {
  const es = run();
  const early = es.filter((e) => e.born < 15).length;
  const late = es.filter((e) => e.born >= 45).length;
  assert.ok(late > early, `late ${late} early ${early}`);
});

test('max 3 bonuses', () => {
  assert.ok(run().filter((e) => e.kind === 'bonus').length <= 3);
});

test('blood has more cells than hands', () => {
  const cells = (l) => run({ location: l }).filter((e) => e.kind === 'cell').length;
  assert.ok(cells('blood') > cells('hands'));
});

test('tutorial: microbes only for first 7.9 s', () => {
  const es = run({ tutorial: true }, 7.9);
  assert.ok(es.length > 0 && es.every((e) => e.kind === 'microbe'));
});

test('tutorial: one cell appears around 8 s', () => {
  const es = run({ tutorial: true }, 10);
  assert.equal(es.filter((e) => e.kind === 'cell').length, 1);
});

test('calm: only floating microbes', () => {
  const es = run({ mode: 'calm' }, 20);
  assert.ok(es.length > 0 && es.every((e) => e.kind === 'microbe' && e.float));
});

test('respects aliveCount cap', () => {
  const sp = createSpawner({
    rng: mulberry32(1), width: 1000, height: 2000, location: 'hands', mode: 'play', tutorial: false,
  });
  let n = 0;
  for (let i = 0; i < 600; i++) n += sp.update(i * STEP, STEP, 99).length;
  assert.equal(n, 0);
});

test('launched entity reaches apex inside screen then falls off', () => {
  const [e] = run({}, 3);
  let minY = e.y;
  let gone = false;
  for (let i = 0; i < 600 && !gone; i++) {
    stepEntity(e, STEP, 1800);
    minY = Math.min(minY, e.y);
    gone = isOffscreen(e, 2000, 1000);
  }
  assert.ok(minY > 0 && minY < 2000 * 0.6, `apex ${minY}`);
  assert.ok(gone);
});

test('cells never spawn next to a microbe in the same batch', () => {
  const es = run({ location: 'blood' });
  const byBorn = new Map();
  for (const e of es) (byBorn.get(e.born) ?? byBorn.set(e.born, []).get(e.born)).push(e);
  for (const batch of byBorn.values()) {
    for (const c of batch.filter((e) => e.kind === 'cell')) {
      for (const m of batch.filter((e) => e.kind === 'microbe')) {
        assert.ok(Math.abs(c.x - m.x) >= 200);
      }
    }
  }
});
