import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, memoryStorage, STICKERS } from '../src/core/progress.js';
import { mulberry32 } from '../src/core/rng.js';

test('only hands unlocked at start; kitchen after 3 rounds', () => {
  const p = createProgress(memoryStorage());
  assert.ok(p.isUnlocked('hands') && !p.isUnlocked('kitchen'));
  let u = null;
  for (let i = 0; i < 3; i++) u = p.completeRound('hands', mulberry32(i)).unlocked;
  assert.equal(u, 'kitchen');
  assert.ok(p.isUnlocked('kitchen'));
  assert.equal(p.lastUnlocked(), 'kitchen');
});

test('stickers are new until all collected', () => {
  const p = createProgress(memoryStorage());
  const ids = new Set();
  for (let i = 0; i < 8; i++) {
    const s = p.completeRound('hands', mulberry32(i)).sticker;
    assert.ok(s.isNew);
    ids.add(s.id);
  }
  assert.equal(ids.size, 8);
  assert.equal(p.completeRound('hands', mulberry32(99)).sticker.isNew, false);
});

test('rest every 3 rounds', () => {
  const p = createProgress(memoryStorage());
  const r = [1, 2, 3, 4, 5, 6].map((i) => p.completeRound('hands', mulberry32(i)).rest);
  assert.deepEqual(r, [false, false, true, false, false, true]);
});

test('progress persists through storage', () => {
  const st = memoryStorage();
  const p = createProgress(st);
  p.completeRound('hands', mulberry32(1));
  p.setMuted(true);
  p.markTutorialDone();
  const q = createProgress(st);
  assert.equal(q.state.rounds.hands, 1);
  assert.equal(q.state.muted, true);
  assert.equal(q.state.tutorialDone, true);
});

test('reset clears progress', () => {
  const p = createProgress(memoryStorage());
  p.completeRound('hands', mulberry32(1));
  p.reset();
  assert.equal(p.state.rounds.hands, 0);
  assert.deepEqual(p.state.stickers, {});
});

test('8 stickers per location, ids unique', () => {
  const all = [];
  for (const [loc, list] of Object.entries(STICKERS)) {
    assert.equal(list.length, 8);
    all.push(...list.map((s) => s.id));
    assert.ok(list.every((s) => s.id === `${loc}:${s.art}`));
  }
  assert.equal(new Set(all).size, all.length);
});

test('locations unlock in a chain of six', async () => {
  const { LOCATION_ORDER } = await import('../src/core/config.js');
  const p = createProgress(memoryStorage());
  const opened = [];
  for (const loc of LOCATION_ORDER) {
    assert.ok(p.isUnlocked(loc), loc);
    for (let i = 0; i < 3; i++) {
      const u = p.completeRound(loc, mulberry32(i)).unlocked;
      if (u) opened.push(u);
    }
  }
  assert.deepEqual(opened, LOCATION_ORDER.slice(1));
});

test('old saves with three locations load fine', () => {
  const st = memoryStorage();
  st.save({ version: 1, rounds: { hands: 3, kitchen: 3, blood: 1 }, stickers: {}, sinceRest: 0, muted: false, seenFacts: {}, tutorialDone: true });
  const p = createProgress(st);
  assert.equal(p.state.rounds.mouth, 0);
  assert.ok(!p.isUnlocked('mouth'));
});
