import test from 'node:test';
import assert from 'node:assert/strict';
import { segmentHitsCircle, segmentHitsSweptCircle, createSwipe } from '../src/core/swipe.js';

test('segment through circle hits', () => assert.ok(segmentHitsCircle(0, 0, 100, 0, 50, 10, 20)));
test('segment beside circle misses', () => assert.ok(!segmentHitsCircle(0, 0, 100, 0, 50, 40, 20)));
test('segment ending before circle misses', () => assert.ok(!segmentHitsCircle(0, 0, 20, 0, 60, 0, 20)));
test('zero-length segment inside circle hits', () => assert.ok(segmentHitsCircle(5, 5, 5, 5, 0, 0, 10)));

test('fast swipe stays active through slower segments until release', () => {
  const s = createSwipe({ minSpeed: 220, minDistance: 30 });
  s.begin(0, 0, 0);
  s.move(100, 0, 0.1);
  s.move(110, 0, 0.2);
  const seg = s.takeSegments().filter((x) => !x.tap);
  assert.equal(seg[0].active, true);
  assert.equal(seg[1].active, true);
  assert.equal(s.takeSegments().length, 0);
  s.end();
  s.begin(0, 0, 1);
  s.move(5, 0, 1.2);
  assert.equal(s.takeSegments().filter((x) => !x.tap)[0].active, false);
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

test('a slow deliberate drag arms after sufficient travel, a tap never cuts', () => {
  const s = createSwipe({ minSpeed: 220, minDistance: 30 });
  s.begin(0, 0, 0);
  s.move(10, 0, 0.1); // slow and short
  s.move(20, 0, 0.2); // still too short
  s.move(35, 0, 0.3); // traveled 35 world units
  const segments = s.takeSegments();
  assert.equal(segments[0].active, false, 'tap must not cut');
  assert.ok(segments.slice(1).every((seg) => seg.active),
    'early segments in the same render frame are not lost');
  s.end();
  s.begin(40, 40, 0.4);
  assert.ok(s.takeSegments().every((seg) => !seg.active));
});

test('slow gesture activation continues across multiple render frames', () => {
  const s = createSwipe({ minSpeed: 220, minDistance: 30 });
  s.begin(0, 0, 0);
  s.move(15, 0, 0.3);
  assert.equal(s.takeSegments().at(-1).active, false);
  s.move(31, 0, 0.6);
  assert.equal(s.takeSegments().at(-1).active, true);
});

test('cancel clears queued segments and resets contact', () => {
  const s = createSwipe({ minSpeed: 220 });
  s.begin(0, 0, 0);
  s.move(100, 0, 0.1);
  s.clear();
  assert.equal(s.down, false);
  assert.deepEqual(s.takeSegments(), []);
});

test('a fast moving sprite intersecting the finger between frames is sliced', () => {
  assert.equal(segmentHitsCircle(0, 0, 100, 0, 50, -90, 20), false);
  assert.equal(segmentHitsCircle(0, 0, 100, 0, 50, 90, 20), false);
  assert.ok(segmentHitsSweptCircle(0, 0, 100, 0, 50, -90, 50, 90, 20));
  assert.ok(!segmentHitsSweptCircle(0, 0, 100, 0, 160, -90, 160, 90, 20));
});

test('swept collision detects parallel close moves and ignores distant ones', () => {
  assert.ok(segmentHitsSweptCircle(0, 0, 100, 0, 20, 18, 80, 18, 20));
  assert.ok(!segmentHitsSweptCircle(0, 0, 100, 0, 20, 30, 80, 30, 20));
});
