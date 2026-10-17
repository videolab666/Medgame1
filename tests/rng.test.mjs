import test from 'node:test';
import assert from 'node:assert/strict';
import { mulberry32 } from '../src/core/rng.js';

test('mulberry32 deterministic and in range', () => {
  const a = mulberry32(42);
  const b = mulberry32(42);
  for (let i = 0; i < 100; i++) {
    const v = a();
    assert.equal(v, b());
    assert.ok(v >= 0 && v < 1);
  }
});
