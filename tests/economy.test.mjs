import test from 'node:test';
import assert from 'node:assert/strict';
import { createProgress, memoryStorage } from '../src/core/progress.js';
import {
  AVATARS, ECONOMY, POWERUPS, TASKS, TRAILS, levelFromXp, roundEarnings, xpForLevel,
} from '../src/core/economy.js';
import { mulberry32 } from '../src/core/rng.js';

const summary = (o = {}) => ({
  score: 0, vitamins: 0, bestCombo: 0, lives: 3, reason: 'time', sliced: 0, missed: 0, kingHits: 0,
  points: (o.score ?? 0) + (o.vitamins ?? 0), gold: 0, cellTouches: 0, powerups: [], ...o,
});

test('round earnings: a star per 10 points, round bonus, golden stars', () => {
  assert.deepEqual(roundEarnings(summary({ score: 23, vitamins: 4 })), { stars: 2 + 5, xp: 27, gold: 0 });
  assert.equal(roundEarnings(summary({ score: 5, gold: 2 })).stars, 0 + 5 + 10);
});

test('levels need 40 + 20·n XP', () => {
  assert.equal(xpForLevel(1), 60);
  assert.deepEqual(levelFromXp(0), { level: 1, into: 0, need: 60 });
  assert.equal(levelFromXp(59).level, 1);
  assert.equal(levelFromXp(60).level, 2);
  assert.equal(levelFromXp(60 + 80).level, 3);
});

test('a finished round pays stars and XP and is saved', () => {
  const st = memoryStorage();
  const p = createProgress(st);
  const r = p.completeRound('hands', mulberry32(1), summary({ score: 30, vitamins: 10 }));
  assert.equal(r.economy.xp, 40);
  assert.ok(p.state.stars >= 4 + 5);
  // 40 XP for the points + 10 for the «wash 20» task finished on the way.
  assert.equal(p.state.xp, 50);
  const q = createProgress(st);
  assert.equal(q.state.xp, 50);
  assert.equal(q.state.stars, p.state.stars);
});

test('level up gives stars, the next avatar and a trail on its level', () => {
  const p = createProgress(memoryStorage());
  const r = p.completeRound('hands', mulberry32(1), summary({ score: 60 }));
  const up = r.economy.levelUps.find((u) => u.level === 2);
  assert.ok(up, 'reached level 2');
  assert.equal(up.stars, ECONOMY.LEVEL_STARS);
  assert.equal(up.avatar, AVATARS[1]);
  assert.equal(up.trail.id, TRAILS.find((t) => t.level === 2).id);
  assert.ok(p.avatarOpen(AVATARS[1]));
  assert.ok(!p.avatarOpen(AVATARS[5]));
});

test('tasks move forward, pay out and are replaced at once', () => {
  const p = createProgress(memoryStorage());
  assert.equal(p.state.tasks.active.length, ECONOMY.ACTIVE_TASKS);
  assert.equal(p.state.tasks.active[0].id, TASKS[0].id); // wash20
  const stars0 = p.state.stars;
  p.completeRound('hands', mulberry32(1), summary({ score: 12 }));
  assert.equal(p.state.tasks.active.find((t) => t.id === 'wash20').progress, 12);
  const r = p.completeRound('hands', mulberry32(2), summary({ score: 9 }));
  assert.ok(r.economy.tasksDone.some((t) => t.id === 'wash20'));
  assert.ok(!p.state.tasks.active.some((t) => t.id === 'wash20'));
  assert.equal(p.state.tasks.active.length, ECONOMY.ACTIVE_TASKS);
  assert.ok(p.state.stars > stars0 + 10);
});

test('calm tasks grow only from the calm mode', () => {
  const p = createProgress(memoryStorage());
  // Bring the calm task onto the board by finishing the first three.
  p.state.tasks.active = [{ id: 'calm1', progress: 0 }, { id: 'wash20', progress: 0 }, { id: 'vit15', progress: 0 }];
  p.completeRound('hands', mulberry32(1), summary({ score: 1 }));
  assert.equal(p.state.tasks.active.find((t) => t.id === 'calm1').progress, 0);
  const r = p.recordCalm();
  assert.deepEqual(r.done.map((d) => d.id), ['calm1']);
});

test('power-ups: paid before the round, at most three, never on credit', () => {
  const p = createProgress(memoryStorage());
  p.state.stars = 30;
  assert.deepEqual(p.buyPowerups(['shield', 'heart']), ['shield', 'heart']);
  assert.equal(p.state.stars, 0);
  assert.equal(p.buyPowerups(['slow']), false);
  p.state.stars = 999;
  assert.equal(p.buyPowerups(POWERUPS.map((x) => x.id)).length, ECONOMY.MAX_POWERUPS);
});

test('trails: locked by level, then bought once and selected', () => {
  const p = createProgress(memoryStorage());
  assert.equal(p.trailState('rainbow'), 'selected');
  assert.equal(p.trailState('stars'), 'locked');
  p.state.stars = 500;
  assert.equal(p.buyTrail('stars'), false);
  p.state.xp = 60; // level 2
  assert.equal(p.trailState('stars'), 'buyable');
  assert.equal(p.buyTrail('stars'), true);
  assert.equal(p.state.stars, 500 - TRAILS.find((t) => t.id === 'stars').price);
  assert.equal(p.trailState('stars'), 'selected');
  assert.ok(p.selectTrail('rainbow'));
  assert.equal(p.trailState('stars'), 'owned');
  assert.equal(p.buyTrail('stars'), false, 'no double purchase');
});

test('old saves without the economy load with defaults', () => {
  const st = memoryStorage();
  st.save({ version: 1, rounds: { hands: 2 }, stickers: {}, muted: true, seenFacts: {} });
  const p = createProgress(st);
  assert.equal(p.state.stars, 0);
  assert.equal(p.state.avatar, AVATARS[0]);
  assert.deepEqual(p.state.trails.owned, ['rainbow']);
  assert.equal(p.state.tasks.active.length, ECONOMY.ACTIVE_TASKS);
});
