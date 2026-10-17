import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentHitsCircle, createSwipe } from '../src/core/swipe.js';

test('segment through circle hits', () => assert.ok(segmentHitsCircle(0, 0, 100, 0, 50, 10, 20)));
test('segment beside circle misses', () => assert.ok(!segmentHitsCircle(0, 0, 100, 0, 50, 40, 20)));
test('segment ending before circle misses', () => assert.ok(!segmentHitsCircle(0, 0, 20, 0, 60, 0, 20)));
test('zero-length segment inside circle hits', () => assert.ok(segmentHitsCircle(5, 5, 5, 5, 0, 0, 10)));

test('fast move is active, slow move is not', () => {
  const s = createSwipe({ minSpeed: 500 });
  s.begin(0, 0, 0);
  s.move(100, 0, 0.1);
  s.move(110, 0, 0.2);
  const seg = s.takeSegments().filter((x) => !x.tap);
  assert.equal(seg[0].active, true);
  assert.equal(seg[1].active, false);
  assert.equal(s.takeSegments().length, 0);
});

test('begin emits tap segment', () => {
  const s = createSwipe({ minSpeed: 500 });
  s.begin(3, 4, 0);
  const [t] = s.takeSegments();
  assert.equal(t.tap, true);
  assert.equal(t.x1, 3);
});

test('move without begin is ignored', () => {
  const s = createSwipe({ minSpeed: 500 });
  s.move(10, 10, 0.1);
  assert.equal(s.takeSegments().length, 0);
});
