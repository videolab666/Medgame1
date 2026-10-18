import test from 'node:test';
import assert from 'node:assert/strict';
import { createRound } from '../src/core/round.js';
import { CONFIG } from '../src/core/config.js';
import { POWERUP_FX } from '../src/core/economy.js';

const STEP = 1 / 60;
const mk = (o = {}) => createRound({
  seed: 1, width: 1000, height: 2000, location: 'hands', mode: 'play', gameOver: true, ...o,
});
let nid = 5000;
const ent = (kind, type, x, y) => ({
  id: nid++, kind, type, x, y, vx: 0, vy: 0, rot: 0, vrot: 0, r: CONFIG.RADIUS,
  alive: true, float: false, born: 0, age: 0, phase: 0,
});
const cut = (x, y) => [{ x1: x - 100, y1: y, x2: x + 100, y2: y, speed: 2000, active: true }];

test('shield forgives three touches of a friendly character, the fourth ends the round', () => {
  const r = mk({ powerups: ['shield'] });
  const forgiven = [];
  r.on('forgive', (e, left) => forgiven.push(left));
  for (let i = 0; i < 3; i++) {
    const c = ent('cell', 'bilyk', 500, 900);
    r._inject(c);
    r.update(STEP, cut(500, 900));
    assert.ok(!r.state.ended, `touch ${i + 1} forgiven`);
  }
  assert.deepEqual(forgiven, [2, 1, 0]);
  r._inject(ent('cell', 'bilyk', 500, 900));
  r.update(STEP, cut(500, 900));
  assert.ok(r.state.ended);
  assert.equal(r.state.cellTouches, 4);
});

test('extra heart: four hearts to start with, regained up to four', () => {
  const r = mk({ powerups: ['heart'] });
  assert.equal(r.state.lives, CONFIG.MAX_LIVES + 1);
  assert.equal(r.state.maxLives, CONFIG.MAX_LIVES + 1);
});

test('more time: each orange adds two seconds to the round', () => {
  const r = mk({ powerups: ['time'], duration: 40 });
  r._inject(ent('fruit', 'orange', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.duration, 40 + POWERUP_FX.TIME_PER_ORANGE);
  r._inject(ent('fruit', 'kiwi', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(r.state.duration, 40 + POWERUP_FX.TIME_PER_ORANGE, 'only oranges count');
});

test('sparkling strawberry catches the microbes around it', () => {
  const r = mk({ powerups: ['berry'] });
  r._inject(ent('microbe', 'kashlyuk', 650, 520));
  r._inject(ent('microbe', 'kashlyuk', 500, 1500)); // far away
  r._inject(ent('fruit', 'strawberry', 500, 500));
  r.update(STEP, [{ x1: 400, y1: 500, x2: 560, y2: 500, speed: 2000, active: true }]);
  assert.equal(r.state.score, 1);
  assert.equal(r.state.entities.filter((e) => e.kind === 'microbe').length, 1);
});

test('big wave: the swipe reaches farther', () => {
  const near = (o) => {
    const r = mk(o);
    r._inject(ent('microbe', 'kashlyuk', 500, 500 + CONFIG.RADIUS * 1.3));
    r.update(STEP, cut(500, 500));
    return r.state.score;
  };
  assert.equal(near({}), 0);
  assert.equal(near({ powerups: ['wide'] }), 1);
});

test('slow start: objects fly slower in the first seconds only', () => {
  const travel = (o, t0) => {
    const r = mk(o);
    r.state.time = t0;
    const e = ent('fruit', 'kiwi', 500, 1000);
    e.vy = -1000;
    r._inject(e);
    r.update(0.1, []);
    return 1000 - e.y;
  };
  assert.ok(travel({ powerups: ['slow'] }, 0) < travel({}, 0) * 0.7);
  assert.ok(Math.abs(travel({ powerups: ['slow'] }, 20) - travel({}, 20)) < 1);
});

test('golden star: slicing it counts, it never costs a heart', () => {
  const r = mk();
  let got = 0;
  r.on('gold', () => got++);
  r._inject(ent('gold', 'goldstar', 500, 500));
  r.update(STEP, cut(500, 500));
  assert.equal(got, 1);
  assert.equal(r.state.gold, 1);
  const g = ent('gold', 'goldstar', 500, 2400);
  g.vy = 300;
  r._inject(g);
  r.update(STEP, []);
  assert.equal(r.state.lives, CONFIG.MAX_LIVES);
});

test('the round summary carries what the economy needs', () => {
  const r = mk({ powerups: ['shield'], duration: 1 });
  let sum = null;
  r.on('end', (s) => { sum = s; });
  for (let i = 0; i < 70; i++) r.update(STEP, []);
  assert.deepEqual(sum.powerups, ['shield']);
  assert.equal(sum.location, 'hands');
  assert.equal(sum.gold, 0);
  assert.equal(sum.cellTouches, 0);
});
