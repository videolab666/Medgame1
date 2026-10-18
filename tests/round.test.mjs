import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../src/core/round.js';
import { CONFIG } from '../src/core/config.js';

const STEP = 1 / 60;
const mk = (o = {}) => createRound({
  seed: 1, width: 1000, height: 2000, location: 'hands', mode: 'play', tutorial: false, ...o,
});
let nid = 1000;
const ent = (kind, type, x, y) => ({
  id: nid++, kind, type, x, y, vx: 0, vy: 0, rot: 0, vrot: 0, r: 75,
  alive: true, float: false, born: 0, age: 0, phase: 0,
});
const cut = (x, y) => [{ x1: x - 100, y1: y, x2: x + 100, y2: y, speed: 2000, active: true }];

test('microbe capture increments score and combo', () => {
  const r = mk();
  const got = [];
  r.on('capture', (e, info) => got.push(info.combo));
  r._inject(ent('microbe', 'chykhunchyk', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.score, 1);
  assert.deepEqual(got, [1]);
});

test('captured entity is removed and not hit twice', () => {
  const r = mk();
  r._inject(ent('microbe', 'chykhunchyk', 500, 500));
  r.update(STEP, cut(500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.score, 1);
  assert.equal(r.state.entities.length, 0);
});

test('fruit slice gives vitamin and angle', () => {
  const r = mk();
  let angle = null;
  r.on('slice', (e, info) => { angle = info.angle; });
  r._inject(ent('fruit', 'kiwi', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.vitamins, 1);
  assert.equal(angle, 0);
});

test('without lives a cell only breaks the combo and misses cost nothing', () => {
  const r = mk({ gameOver: false });
  let ended = false;
  r.on('end', () => { ended = true; });
  r._inject(ent('microbe', 'kashlyuk', 300, 500));
  r.update(STEP, cut(300, 500));
  const c = ent('cell', 'bilyk', 700, 900);
  r._inject(c);
  r.update(STEP, cut(700, 900));
  assert.equal(r.state.combo, 0);
  for (let i = 0; i < 3; i++) {
    const e = ent('microbe', 'chykhunchyk', 500, 2400);
    e.vy = 300;
    r._inject(e);
    r.update(STEP, []);
  }
  assert.ok(!ended && !r.state.ended);
  assert.equal(r.state.lives, 3);
  assert.equal(r.state.missed, 3);
});

test('classic lives: touching a cell ends the round at once, like a bomb', () => {
  const r = mk({ gameOver: true });
  let touched = 0;
  let sum = null;
  r.on('cellTouched', () => touched++);
  r.on('end', (s) => { sum = s; });
  const c = ent('cell', 'bilyk', 500, 900);
  r._inject(c);
  r.update(STEP, cut(500, 900));
  r.update(STEP, cut(c.x, c.y));
  assert.equal(touched, 1);
  assert.ok(r.state.ended);
  assert.equal(sum.reason, 'cell');
  assert.equal(sum.lives, 3);
});

test('classic lives: a dropped object costs a heart and three misses end the round', () => {
  const r = mk({ gameOver: true });
  const missed = [];
  let sum = null;
  r.on('miss', (e, lives) => missed.push(lives));
  r.on('end', (s) => { sum = s; });
  for (let i = 0; i < 3; i++) {
    const e = ent('microbe', 'chykhunchyk', 500, 2400);
    e.vy = 300;
    r._inject(e);
    r.update(STEP, []);
  }
  assert.deepEqual(missed, [2, 1, 0]);
  assert.ok(r.state.ended);
  assert.equal(sum.reason, 'lives');
  assert.equal(sum.lives, 0);
});

test('classic lives: hearts come back at 100 points, then every 100', () => {
  const r = mk({ gameOver: true });
  const lives = [];
  r.on('life', (n) => lives.push(n));
  const drop = ent('microbe', 'a', 500, 2400);
  drop.vy = 300;
  r._inject(drop);
  r.update(STEP, []);
  assert.equal(r.state.lives, 2);
  // 99 points + 1 slice = the first heart.
  r.state.score = 99 - 9;
  r.state.vitamins = 9;
  r._inject(ent('fruit', 'kiwi', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.lives, 3);
  // 200 points pass with full hearts: nothing pops, the mark moves to 300.
  r.state.score = 199;
  r._inject(ent('microbe', 'chykhunchyk', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.lives, 3);
  assert.equal(r.state.nextLifeAt, 300);
  assert.deepEqual(lives, [3]);
});

test('inactive segment does nothing in play', () => {
  const r = mk();
  r._inject(ent('microbe', 'kashlyuk', 500, 500));
  r.update(STEP, [{ ...cut(500, 500)[0], active: false }]);
  assert.equal(r.state.score, 0);
});

test('tap captures in calm mode', () => {
  const r = mk({ mode: 'calm' });
  r._inject({ ...ent('microbe', 'lypuchka', 500, 500), float: true });
  r.update(STEP, [{ x1: 500, y1: 500, x2: 500, y2: 500, speed: 0, active: false, tap: true }]);
  assert.equal(r.state.score, 1);
});

test('combo event at 3', () => {
  const r = mk();
  const c = [];
  r.on('combo', (n) => c.push(n));
  for (let i = 0; i < 3; i++) {
    r._inject(ent('microbe', 'kashlyuk', 500, 500));
    r.update(STEP, cut(500, 500));
  }
  assert.deepEqual(c, [3]);
});

test('soap captures all microbes', () => {
  const r = mk();
  const by = [];
  r.on('capture', (e, info) => by.push(info.byBonus));
  r._inject(ent('microbe', 'a', 100, 300));
  r._inject(ent('microbe', 'b', 900, 1500));
  r._inject(ent('bonus', 'soap', 500, 800));
  r.update(STEP, cut(500, 800));
  assert.equal(r.state.score, 2);
  assert.deepEqual(by, [true, true]);
});

test('vaccine shield captures microbe at center', () => {
  const r = mk();
  r._inject(ent('bonus', 'vaccine', 200, 200));
  r.update(STEP, cut(200, 200));
  assert.ok(r.state.shield > 0);
  r._inject(ent('microbe', 'a', 500, 1000));
  r.update(STEP, []);
  assert.equal(r.state.score, 1);
});

test('shield expires with bonusEnd', () => {
  const r = mk();
  const ended = [];
  r.on('bonusEnd', (t) => ended.push(t));
  r._inject(ent('bonus', 'vaccine', 200, 200));
  r.update(STEP, cut(200, 200));
  for (let i = 0; i < 6 * 60; i++) r.update(STEP, []);
  assert.equal(r.state.shield, 0);
  assert.deepEqual(ended, ['shield']);
});

test('patch slows entities', () => {
  const r = mk();
  r._inject(ent('bonus', 'patch', 200, 200));
  r.update(STEP, cut(200, 200));
  const e = ent('fruit', 'kiwi', 500, 500);
  e.vy = -1000;
  r._inject(e);
  r.update(0.1, []);
  assert.ok(Math.abs(e.y - 500) < 1000 * 0.1 * 0.6);
});

test('the king arrives at 50 points, takes cuts, and bursts after five seconds', () => {
  const r = mk();
  const spawns = [];
  let blast = null;
  let cuts = 0;
  r.on('kingSpawn', (e) => spawns.push(e));
  r.on('kingBlast', (e) => { blast = e; });
  r.on('kingSlice', () => cuts++);
  r.state.score = 49;
  r.state.vitamins = 1; // exactly 50 points
  r.update(STEP, []);
  assert.equal(spawns.length, 1);
  assert.ok(r.state.kingActive);
  const king = spawns[0];
  // Cuts count, but no faster than one per 0.077 s.
  for (let i = 0; i < 30; i++) {
    king.x = 500;
    king.y = 800;
    king.vx = 0;
    king.vy = 0;
    r.update(STEP, cut(500, 800));
  }
  const maxCuts = Math.floor(0.5 / 0.077) + 1;
  assert.ok(cuts >= 3 && cuts <= maxCuts, `cuts ${cuts}`);
  assert.equal(r.state.score, 49 + cuts);
  // Five seconds are up: he bursts and the world starts moving again.
  let t = 0.5;
  while (!blast && t < 6.5) {
    r.update(STEP, []);
    t += STEP;
  }
  assert.ok(blast, 'the king bursts');
  assert.equal(r.state.kingActive, false);
  assert.ok(r.state.burst > 0 && r.state.burst <= CONFIG.KING_BURST_SEC);
  assert.ok(blast.alive === false);
});

test('the wave queue waits while the king is on screen', () => {
  const r = mk();
  const spawns = [];
  r.on('spawn', (e) => spawns.push(e));
  for (let i = 0; i < 100; i++) r.update(STEP, []);
  assert.ok(spawns.length > 0, 'first wave is out');
  r.state.score = 50;
  r.update(STEP, []);
  assert.ok(r.state.kingActive);
  const kingSpawns = spawns.length;
  assert.equal(spawns[kingSpawns - 1].kind, 'king');
  // The next wave is due 5 s after the first one; while the king is around
  // (his own five seconds) nothing new may fly out.
  for (let i = 0; i < 294; i++) r.update(STEP, []);
  assert.ok(r.state.kingActive, 'king still on screen');
  assert.equal(spawns.length, kingSpawns, 'nothing flies out during the king');
});

test('cutting the king defuses characters; a defused character is harmless', () => {
  const r = mk();
  const defused = [];
  let popped = 0;
  r.on('cellDefused', (e) => defused.push(e));
  r.on('cellPop', () => popped++);
  r.state.score = 50;
  r.update(STEP, []);
  const king = r.state.entities.find((e) => e.kind === 'king');
  assert.ok(king);
  const c = ent('cell', 'bilyk', 150, 500);
  r._inject(c);
  king.x = 500;
  king.y = 500;
  king.vx = 0;
  king.vy = 0;
  r.update(STEP, cut(500, 500));
  assert.equal(c.defused, true);
  assert.equal(defused.length, 1);
  r.update(STEP, cut(c.x, c.y));
  assert.equal(popped, 1);
  assert.ok(!r.state.ended, 'a defused character never ends the round');
});

test('play round ends exactly once with summary', () => {
  const r = mk();
  r.state.lives = 999; // no drops in this test: hear the bell instead
  let n = 0;
  let sum = null;
  r.on('end', (s) => { n++; sum = s; });
  for (let i = 0; i < 62 * 60; i++) r.update(STEP, []);
  assert.equal(n, 1);
  assert.ok(r.state.ended);
  assert.equal(sum.reason, 'time');
  assert.ok('vitamins' in sum && 'bestCombo' in sum && 'score' in sum && 'lives' in sum);
});

test('custom duration ends the round on time and stops spawning', () => {
  const r = mk({ duration: 40 });
  r.state.lives = 999;
  assert.equal(r.state.duration, 40);
  let at = null;
  let late = 0;
  r.on('end', () => { at = r.state.time; });
  r.on('spawn', (e) => { if (e.born >= 40) late++; });
  for (let i = 0; i < 41 * 60; i++) r.update(STEP, []);
  assert.ok(r.state.ended);
  assert.ok(at !== null && at < 40 + 2 * STEP, `ended at ${at}`);
  assert.equal(late, 0);
});

test('calm never ends', () => {
  const r = mk({ mode: 'calm' });
  let n = 0;
  r.on('end', () => n++);
  for (let i = 0; i < 120 * 60; i++) r.update(STEP, []);
  assert.equal(n, 0);
});

test('spawned entities emit spawn and offscreen ones emit remove', () => {
  const r = mk();
  let spawned = 0;
  let removed = 0;
  r.on('spawn', () => spawned++);
  r.on('remove', () => removed++);
  for (let i = 0; i < 20 * 60; i++) r.update(STEP, []);
  assert.ok(spawned > 0 && removed > 0);
});

test('toothbrush acts as a cleaning wave', () => {
  const r = mk({ location: 'mouth' });
  const fx = [];
  r.on('bonus', (type, e, effect) => fx.push(effect));
  r._inject(ent('microbe', 'kysliuk', 100, 300));
  r._inject(ent('bonus', 'toothbrush', 500, 800));
  r.update(STEP, cut(500, 800));
  assert.deepEqual(fx, ['wave']);
  assert.equal(r.state.score, 1);
});

test('the summary carries the round tally and the trip keeps its slot', () => {
  // One endless trip per location, cut by the timer: the cursor lives in the
  // shared `run` object.
  const trip = { slot: 0, speeds: {}, weights: {} };
  const r = mk({ duration: 30, run: trip });
  r.state.lives = 999; // nobody slices here: the waves just fly by and fall
  let sum = null;
  r.on('end', (s) => { sum = s; });
  for (let i = 0; i < 31 * 60; i++) r.update(STEP, []);
  assert.ok(sum);
  assert.equal(sum.reason, 'time');
  assert.equal(sum.score, 0);
  assert.equal(sum.sliced, 0);
  assert.ok(sum.missed > 0, 'dropped objects are counted');
  assert.equal(sum.points, sum.score + sum.vitamins);
  assert.ok(trip.slot >= 3, `the cursor is at ${trip.slot}`);
});

test('slices count towards the round tally', () => {
  const r = mk();
  r._inject(ent('microbe', 'chykhunchyk', 500, 500));
  r.update(STEP, cut(500, 500));
  r._inject(ent('fruit', 'kiwi', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.sliced, 2);
  assert.equal(r.state.missed, 0);
  assert.equal(r.state.kingHits, 0);
});
