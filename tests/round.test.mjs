import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../src/core/round.js';

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

test('cell touch resets combo, no score loss', () => {
  const r = mk();
  r._inject(ent('microbe', 'kashlyuk', 300, 500));
  r._inject(ent('cell', 'bilyk', 700, 900));
  r.update(STEP, cut(300, 500));
  r.update(STEP, cut(700, 900));
  assert.equal(r.state.combo, 0);
  assert.equal(r.state.score, 1);
});

test('cell touch has cooldown', () => {
  const r = mk();
  let n = 0;
  r.on('cellTouched', () => n++);
  const c = ent('cell', 'bilyk', 500, 900);
  r._inject(c);
  r.update(STEP, cut(500, 900));
  r.update(STEP, cut(c.x, c.y));
  assert.equal(n, 1);
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
  assert.deepEqual(ended, ['vaccine']);
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

test('play round ends exactly once with summary', () => {
  const r = mk();
  let n = 0;
  let sum = null;
  r.on('end', (s) => { n++; sum = s; });
  for (let i = 0; i < 62 * 60; i++) r.update(STEP, []);
  assert.equal(n, 1);
  assert.ok(r.state.ended);
  assert.ok('vitamins' in sum && 'bestCombo' in sum && 'score' in sum);
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
