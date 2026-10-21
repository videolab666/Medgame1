import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, memoryStorage, STICKERS } from '../src/core/progress.js';
import { mulberry32 } from '../src/core/rng.js';
import { CONFIG } from '../src/core/config.js';

test('only hands unlocked at start; kitchen after 3 rounds', () => {
  const p = createProgress(memoryStorage(), { unlockAll: false });
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
  const p = createProgress(memoryStorage(), { unlockAll: false });
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
  const p = createProgress(st, { unlockAll: false });
  assert.equal(p.state.rounds.mouth, 0);
  assert.ok(!p.isUnlocked('mouth'));
});

test('all locations are open by default', async () => {
  const { LOCATION_ORDER } = await import('../src/core/config.js');
  const p = createProgress(memoryStorage());
  assert.ok(LOCATION_ORDER.every((l) => p.isUnlocked(l)));
  assert.equal(p.completeRound('hands', mulberry32(1)).unlocked, null);
});

// ── round progression: «Грати» chain, records, achievements, runs ──

test('nextLocation follows the chain of rounds', async () => {
  const { LOCATION_ORDER, CONFIG } = await import('../src/core/config.js');
  const p = createProgress(memoryStorage(), { unlockAll: false });
  assert.equal(p.nextLocation(), 'hands');
  for (let i = 0; i < CONFIG.UNLOCK_AFTER; i++) p.completeRound('hands', mulberry32(i));
  assert.equal(p.nextLocation(), 'kitchen');
  // Even when everything is unlocked, the chain walks from the first spot that
  // still needs rounds, and ends on the last location.
  const q = createProgress(memoryStorage());
  assert.equal(q.nextLocation(), 'hands');
  for (const loc of LOCATION_ORDER) {
    for (let i = 0; i < CONFIG.UNLOCK_AFTER; i++) q.completeRound(loc, mulberry32(i));
  }
  assert.equal(q.nextLocation(), LOCATION_ORDER[LOCATION_ORDER.length - 1]);
});

test('records: the first score is a record, later rounds keep the best', () => {
  const p = createProgress(memoryStorage());
  const sum = (score, vitamins = 0) => ({
    score, vitamins, bestCombo: 0, lives: 2, reason: 'time', sliced: score, missed: 0, kingHits: 0,
  });
  const a = p.completeRound('hands', mulberry32(1), sum(10, 2));
  assert.equal(a.best.isRecord, true);
  assert.equal(a.best.value, 12);
  const b = p.completeRound('hands', mulberry32(2), sum(4, 1));
  assert.equal(b.best.isRecord, false);
  assert.equal(b.best.value, 12);
  const c = p.completeRound('hands', mulberry32(3), sum(13));
  assert.equal(c.best.isRecord, true);
  assert.equal(c.best.value, 13);
  assert.equal(p.state.best.hands, 13);
  // A round without a summary (old callers) leaves the record alone.
  const d = p.completeRound('hands', mulberry32(4));
  assert.equal(d.best, null);
  assert.equal(p.state.best.hands, 13);
});

test('achievements are earned and marked new once', () => {
  const p = createProgress(memoryStorage());
  const quiet = {
    score: 1, vitamins: 0, bestCombo: 1, lives: 2, reason: 'time', sliced: 1, missed: 1, kingHits: 0,
  };
  assert.equal(p.completeRound('hands', mulberry32(1), quiet).achievements.length, 0);
  const star = {
    score: 6, vitamins: 0, bestCombo: 5, lives: CONFIG.MAX_LIVES, reason: 'time', sliced: 30, missed: 0, kingHits: 0,
  };
  const a = p.completeRound('hands', mulberry32(2), star);
  assert.deepEqual(
    a.achievements.map((x) => x.id).sort(),
    ['allHearts', 'combo5', 'noMiss', 'swift'],
  );
  assert.ok(a.achievements.every((x) => x.isNew));
  const b = p.completeRound('hands', mulberry32(3), star);
  assert.ok(b.achievements.every((x) => !x.isNew), 'the second time has no badge');
  assert.equal(p.state.achievements.combo5, 2);
});

test('the wave run survives a reload, per location', () => {
  const st = memoryStorage();
  const p = createProgress(st);
  const trip = p.runFor('hands');
  trip.slot = 7;
  trip.speeds.e0 = 1.06;
  trip.weights.a = [0, 30];
  p.persist();
  const q = createProgress(st);
  assert.deepEqual(q.runFor('hands'), { slot: 7, speeds: { e0: 1.06 }, weights: { a: [0, 30] } });
  assert.deepEqual(q.runFor('kitchen'), { slot: 0, speeds: {}, weights: {} });
  // Old saves without runs/best/achievements still load.
  const old = memoryStorage();
  old.save({ version: 1, rounds: { hands: 2 }, stickers: {}, sinceRest: 0, muted: false, seenFacts: {}, tutorialDone: true });
  const r = createProgress(old);
  assert.equal(r.runFor('hands').slot, 0);
  assert.equal(r.state.best.hands, 0);
  assert.deepEqual(r.state.achievements, {});
});
