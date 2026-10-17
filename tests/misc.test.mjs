import test from 'node:test';
import assert from 'node:assert/strict';
import { pickFact } from '../src/core/content.js';
import { pickQuality } from '../src/core/quality.js';
import { createFlashGuard } from '../src/core/flashGuard.js';

test('pickFact cycles without repeats, then restarts', () => {
  const fs = [1, 2, 3].map((i) => ({ id: `f${i}`, location: 'hands' })).concat([{ id: 'k', location: 'kitchen' }]);
  let seen = [];
  const got = [];
  for (let i = 0; i < 3; i++) {
    const r = pickFact(fs, 'hands', seen);
    got.push(r.fact.id);
    seen = r.seenIds;
  }
  assert.equal(new Set(got).size, 3);
  assert.ok(got.every((id) => id.startsWith('f')));
  const again = pickFact(fs, 'hands', seen);
  assert.ok(again.fact);
  assert.equal(again.seenIds.length, 1);
});

test('quality tiers', () => {
  assert.equal(pickQuality(58), 'high');
  assert.equal(pickQuality(40), 'mid');
  assert.equal(pickQuality(20), 'low');
});

test('flashGuard enforces 400 ms', () => {
  let t = 0;
  const g = createFlashGuard(400, () => t);
  assert.ok(g.tryFlash());
  t = 200;
  assert.ok(!g.tryFlash());
  t = 401;
  assert.ok(g.tryFlash());
});
