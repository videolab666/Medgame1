import test from 'node:test';
import assert from 'node:assert/strict';
import { createSpawner } from '../src/core/spawner.js';
import { stepEntity, isOffscreen } from '../src/core/physics.js';
import { mulberry32 } from '../src/core/rng.js';
import { CONFIG, gravityFor } from '../src/core/config.js';

const STEP = 1 / 60;
const H = 2000;
// Drives a spawner frame by frame. Thrown objects fly on shadow copies (so the
// launch velocities stay readable) and are marked gone when they leave the
// screen — a wave only ends once its objects are gone. Nothing is sliced.
const drive = (sp, sec) => {
  const out = [];
  const flying = [];
  const g = gravityFor(H);
  for (let i = 0; i * STEP < sec; i++) {
    const t = i * STEP;
    for (const f of flying) {
      if (!f.e.alive) continue;
      stepEntity(f.s, STEP, f.e.gravity ?? g);
      if (isOffscreen(f.s, H, 1000)) {
        f.e.alive = false;
        f.e.goneAt = t;
      }
    }
    for (const e of sp.update(t, STEP, flying.filter((f) => f.e.alive).length, flying.map((f) => f.e))) {
      out.push(e);
      flying.push({ e, s: { ...e } });
    }
  }
  return out;
};
const run = (opts = {}, sec = 60, seed = 7) => drive(createSpawner({
  rng: mulberry32(seed), width: 1000, height: H, location: 'hands', mode: 'play', ...opts,
}), sec);
// Spawns grouped into waves: inside a series throws are at most 0.7 s apart and
// the next series waits at least 0.8 s, so 0.75 s splits the groups.
const waves = (es) => {
  const out = [];
  for (const e of es) {
    const last = out[out.length - 1];
    if (last && e.born - last[last.length - 1].born < 0.75) last.push(e);
    else out.push([e]);
  }
  return out;
};

test('deterministic by seed', () => {
  assert.deepEqual(run().map((e) => e.type), run().map((e) => e.type));
});

test('opening: one, one, then 2–3 thrown together; each waits for the screen to clear', () => {
  const w = waves(run({}, 20));
  assert.equal(w[0].length, 1);
  assert.equal(w[1].length, 1);
  assert.ok(w[2].length >= 2 && w[2].length <= 3, `third wave ${w[2].length}`);
  assert.ok(w[2].every((e) => e.born === w[2][0].born), 'third wave is thrown together');
  // Measured on the reference: the next throw comes ~1 s after the previous
  // fruit leaves the screen; throw to throw is ~3.2 s in the opening.
  const lead = w[1][0].born - w[0][0].goneAt;
  assert.ok(Math.abs(lead - 1) < 0.05, `lead-in after the screen clears ${lead}`);
  const gap = w[1][0].born - w[0][0].born;
  assert.ok(gap > 2.8 && gap < 3.6, `throw to throw ${gap}`);
});

test('fifth stage is the slow lesson: only forbidden characters', () => {
  const w = waves(run({}, 30));
  assert.ok(w[4].length >= 1 && w[4].length <= 2, `stage 5 has ${w[4].length}`);
  assert.ok(w[4].every((e) => e.kind === 'cell'), w[4].map((e) => e.kind).join(','));
  assert.ok(w[4].every((e) => e.ts === 0.75), w[4].map((e) => e.ts).join(','));
  assert.ok(w[4].every((e) => e.born === w[4][0].born), 'thrown together');
});

test('the first four stages only throw sliceables (no characters, no bonuses early)', () => {
  for (let seed = 1; seed < 20; seed++) {
    const w = waves(run({ location: 'blood' }, 20, seed));
    for (const e of [...w[0], ...w[1], ...w[2], ...w[3]]) assert.notEqual(e.kind, 'cell', `seed ${seed}: character early`);
    for (const e of [...w[0], ...w[1]]) assert.ok(e.kind === 'microbe' || e.kind === 'fruit', `seed ${seed}: ${e.kind}`);
  }
});

test('later waves grow into big groups and strings', () => {
  let biggest = 0;
  for (let seed = 1; seed < 10; seed++) {
    for (const w of waves(run({}, 120, seed))) biggest = Math.max(biggest, w.length);
  }
  assert.ok(biggest >= 7, `biggest wave ${biggest}`);
});

test('weighted choices rarely repeat the same wave back to back', () => {
  // Over many long rounds both options of the first choice slot appear.
  const sizes = new Set();
  for (let seed = 1; seed < 30; seed++) {
    const w = waves(run({}, 40, seed));
    if (w[5]) sizes.add(w[5].length >= 7 ? 'string' : 'small');
  }
  assert.deepEqual([...sizes].sort(), ['small', 'string']);
});

test('no new objects after a custom round duration', () => {
  const es = run({ duration: 40 }, 45);
  assert.ok(es.length > 0);
  assert.ok(Math.max(...es.map((e) => e.born)) < 40);
});

test('max 3 bonuses, and bonuses drift in from a side', () => {
  for (let seed = 1; seed < 20; seed++) {
    const b = run({}, 60, seed).filter((e) => e.kind === 'bonus');
    assert.ok(b.length <= 3);
    for (const e of b) assert.ok(e.x < 0 || e.x > 1000, `bonus x ${e.x}`);
  }
});

test('forbidden characters follow one plan for every location', () => {
  // Characters fly on a fixed slot schedule; only the faces
  // change between locations. Same seeds must therefore give same counts.
  const cells = (l) => [1, 2, 3].reduce((n, s) => n + run({ location: l }, 60, s).filter((e) => e.kind === 'cell').length, 0);
  assert.equal(cells('blood'), cells('hands'));
  assert.ok(cells('blood') > 0);
});

test('forbidden characters launch in dedicated groups, never mixed with sliceables', () => {
  for (let seed = 1; seed < 16; seed++) {
    let hazardGroups = 0;
    for (const group of waves(run({ duration: 150 }, 120, seed))) {
      if (!group.some((e) => e.kind === 'cell')) continue;
      hazardGroups++;
      assert.ok(group.every((e) => e.kind === 'cell'),
        `seed ${seed}: hazard group was mixed with ${group.map((e) => e.kind)}`);
    }
    assert.ok(hazardGroups >= 2, `seed ${seed}: no repeated hazard group`);
  }
});

test('calm: only floating microbes, unhurried', () => {
  const es = run({ mode: 'calm' }, 20);
  assert.ok(es.length > 0 && es.every((e) => e.kind === 'microbe' && e.float));
  assert.ok(es.length < 20);
});

test('throws stay within 12° of vertical and land within the design airtime', () => {
  const g = gravityFor(H);
  for (const e of run({}, 30).filter((x) => x.kind !== 'bonus')) {
    const angle = Math.abs(Math.atan2(e.vx, -e.vy)) * (180 / Math.PI);
    assert.ok(angle <= 12.001, `angle ${angle}`);
    const flight = (2 * -e.vy) / g;
    assert.ok(flight >= 2.0 && flight <= CONFIG.AIRTIME_MAX + 0.01, `flight ${flight}`);
  }
});

test('launched entity peaks inside the screen then falls off', () => {
  const [e] = run({}, 2);
  let minY = e.y;
  let gone = false;
  for (let i = 0; i < 600 && !gone; i++) {
    stepEntity(e, STEP, gravityFor(H));
    minY = Math.min(minY, e.y);
    gone = isOffscreen(e, H, 1000);
  }
  assert.ok(minY > 0 && minY < H * 0.5, `apex ${minY}`);
  assert.ok(gone);
});

test('objects are the configured size', () => {
  assert.ok(run({}, 30).every((e) => e.r === CONFIG.RADIUS));
});

// The previous horizontal-distance workaround allowed opposite launch
// directions, narrow screens and side collectibles to collide with hazards.
// Assert non-overlapping *flight times* instead, at the actual spawn frames.
function assertSafeFlights({ width = 1000, location = 'blood', seed = 5, duration = 120 }) {
  const sp = createSpawner({
    rng: mulberry32(seed), width, height: H, location, mode: 'play', duration,
  });
  const flying = [];
  let dangerEvents = 0;
  let normalEvents = 0;
  for (let i = 0; i * STEP < duration; i++) {
    const t = i * STEP;
    for (const f of flying) {
      if (!f.e.alive) continue;
      stepEntity(f.shadow, STEP, f.e.gravity ?? gravityFor(H));
      if (isOffscreen(f.shadow, H, width)) f.e.alive = false;
    }
    const alive = flying.filter((f) => f.e.alive).map((f) => f.e);
    const spawned = sp.update(t, STEP, alive.length, alive);
    for (const e of spawned) {
      const opposite = e.kind === 'cell'
        ? (x) => x.kind !== 'cell' && x.kind !== 'king'
        : (x) => x.kind === 'cell';
      assert.ok(!alive.some(opposite),
        `unsafe overlap ${location}/${width}/${seed} at ${t.toFixed(2)}: ${e.kind} with ${alive.map((x) => x.kind)}`);
      if (e.kind === 'cell') dangerEvents++;
      else normalEvents++;
      alive.push(e); // same-frame launches must also be checked
      flying.push({ e, shadow: { ...e } });
    }
  }
  assert.ok(dangerEvents > 0);
  assert.ok(normalEvents > 0);
}

test('live mixed waves separate hazard and normal flights across many random seeds', () => {
  for (const seed of [1, 2, 5, 7, 11, 13, 21, 29, 42]) {
    assertSafeFlights({ seed, duration: 120 });
    assertSafeFlights({ seed, location: 'mouth', duration: 120 });
  }
});

test('hazard separation works on narrow 320-unit screens too', () => {
  for (const seed of [1, 4, 9, 17]) assertSafeFlights({ width: 320, seed, duration: 120 });
});

test('the king maker launches him from a side, on his own gravity', () => {
  const sp = createSpawner({ rng: mulberry32(5), width: 1000, height: H, location: 'hands', mode: 'play' });
  const k = sp.king(3);
  assert.equal(k.kind, 'king');
  assert.equal(k.r, CONFIG.RADIUS * CONFIG.KING_SCALE);
  assert.ok(k.x < 0 || k.x > 1000, `x ${k.x}`);
  assert.ok(k.vy < 0 && Math.abs(k.vx) > 0);
  // He rises about half a screen and sinks back; the fall lasts one flight.
  let minY = k.y;
  let gone = false;
  for (let i = 0; i < 600 && !gone; i++) {
    stepEntity(k, STEP, k.gravity);
    minY = Math.min(minY, k.y);
    gone = isOffscreen(k, H, 1000);
  }
  assert.ok(minY > 0 && minY < H * 0.5, `apex ${minY}`);
  assert.ok(gone, 'king eventually leaves the screen');
});

test('each location spawns only its own pools', async () => {
  const { typesFor, LOCATION_ORDER } = await import('../src/core/config.js');
  for (const loc of LOCATION_ORDER) {
    const pools = typesFor(loc);
    for (const e of run({ location: loc }).filter((x) => x.kind !== 'gold')) {
      assert.ok(pools[e.kind].includes(e.type), `${loc}: ${e.kind} ${e.type}`);
    }
  }
});

test('tummy friendly character is the good bacterium', () => {
  const cells = [1, 2, 3].flatMap((s) => run({ location: 'tummy' }, 60, s)).filter((e) => e.kind === 'cell');
  assert.ok(cells.length > 0 && cells.every((e) => e.type === 'dobryk'));
});

// ── per-round safe opening + endless difficulty after the fifth wave ──
// A location's later-wave slot, speeds and weights survive across rounds,
// but its first five waves restart safely in each new round.

const step = (sp, sec) => drive(sp, sec);

test('even a legacy saved slot begins with four safe waves and one isolated hazard', async () => {
  const { WAVE_PLAN } = await import('../src/core/waves.js');
  for (const saved of [0, 4, 7, WAVE_PLAN.length - 1]) {
    const trip = { slot: saved, speeds: {}, weights: {} };
    const sp = createSpawner({
      rng: mulberry32(3), width: 1000, height: H, location: 'hands',
      mode: 'play', duration: 120, run: trip,
    });
    const w = waves(step(sp, 90));
    assert.ok(w.length >= 6, `saved ${saved}: only ${w.length} waves`);
    for (const group of w.slice(0, 4)) {
      assert.ok(group.every((e) => e.kind === 'microbe' || e.kind === 'fruit'),
        `saved ${saved}: unexpected opening hazard or bonus`);
    }
    assert.ok(w[4].length >= 1 && w[4].length <= 2, `saved ${saved}: fifth wave size ${w[4].length}`);
    assert.ok(w[4].every((e) => e.kind === 'cell'), `saved ${saved}: fifth wave is not isolated`);
    assert.ok(w[4].every((e) => e.ts === 0.75), 'the introductory hazard stays slow');
    assert.ok(trip.slot >= Math.max(saved, 5), `saved cursor went backwards: ${trip.slot}`);
  }
});

test('each new round restarts the safe intro without resetting earned difficulty', () => {
  const trip = { slot: 8, speeds: {}, weights: {} };
  const first = createSpawner({
    rng: mulberry32(11), width: 1000, height: H, location: 'hands', mode: 'play', duration: 90, run: trip,
  });
  const firstWaves = waves(step(first, 70));
  assert.ok(firstWaves[0].every((e) => e.kind !== 'cell'));
  assert.ok(firstWaves[4].every((e) => e.kind === 'cell'));
  const saved = trip.slot;
  assert.ok(saved > 8, `progress was not advanced (${saved})`);
  const second = createSpawner({
    rng: mulberry32(12), width: 1000, height: H, location: 'hands', mode: 'play', duration: 90, run: trip,
  });
  const born = step(second, 2);
  assert.equal(born.length, 1);
  assert.ok(born.every((e) => e.kind === 'microbe' || e.kind === 'fruit'));
  assert.equal(trip.slot, saved, 'opening may not consume later-stage progression');
  // Continuing this instance uses the same saved difficulty; introductory
  // hazard composition is asserted separately in the full-frame seed tests.
  step(second, 60);
  assert.ok(trip.slot >= saved, 'difficulty must be retained');
});

test('the repeating set speeds up use by use and keeps it across rounds', async () => {
  const { WAVE_PLAN } = await import('../src/core/waves.js');
  const trip = { slot: WAVE_PLAN.length - 1, speeds: {}, weights: {} };
  const sp = createSpawner({
    rng: mulberry32(21), width: 1000, height: H, location: 'hands', mode: 'play', duration: 240, run: trip,
  });
  const es = step(sp, 240);
  const speeds = Object.values(trip.speeds);
  assert.ok(speeds.length >= 1, 'the set recorded its uses');
  assert.ok(speeds.every((v) => v > 1 && v <= 1.5), speeds.join(','));
  assert.ok(Math.max(...es.map((e) => e.ts)) > 1.02, 'flights got faster');

  const snapshot = { ...trip.speeds };
  const next = createSpawner({
    rng: mulberry32(22), width: 1000, height: H, location: 'hands', mode: 'play', duration: 40, run: trip,
  });
  step(next, 40);
  for (const [key, v] of Object.entries(snapshot)) {
    assert.ok(trip.speeds[key] >= v, `${key} reset from ${v} to ${trip.speeds[key]}`);
  }
});

test('the repeating set never exceeds its speed cap', async () => {
  const { WAVE_PLAN } = await import('../src/core/waves.js');
  const trip = { slot: WAVE_PLAN.length - 1, speeds: {}, weights: {} };
  const sp = createSpawner({
    rng: mulberry32(31), width: 1000, height: H, location: 'hands', mode: 'play', duration: 1200, run: trip,
  });
  step(sp, 1200);
  assert.ok(Object.values(trip.speeds).every((v) => v <= 1.5));
  assert.equal(Math.max(...Object.values(trip.speeds)), 1.5, 'the cap is reached');
});

test('set weights live in the trip, not in the spawner', () => {
  const trip = { slot: 5, speeds: {}, weights: {} }; // resume set A after the intro
  const sp = createSpawner({
    rng: mulberry32(41), width: 1000, height: H, location: 'hands', mode: 'play', duration: 100, run: trip,
  });
  step(sp, 45);
  const w = trip.weights.a;
  assert.ok(Array.isArray(w) && w.length === 2, `weights ${JSON.stringify(trip.weights)}`);
  assert.ok(w.includes(0), 'the just-picked option sits at zero');
  const next = createSpawner({
    rng: mulberry32(42), width: 1000, height: H, location: 'hands', mode: 'play', duration: 40, run: trip,
  });
  step(next, 25); // after the safe introduction the existing weights are reused
  assert.equal(trip.weights.a, w, 'the next round reuses the very same weights');
});

test('golden stars: rare, from a side, never in the opening, never shift the plan', async () => {
  const { ECONOMY } = await import('../src/core/economy.js');
  let total = 0;
  for (let seed = 1; seed <= 40; seed++) {
    const es = run({}, 60, seed);
    const golds = es.filter((e) => e.kind === 'gold');
    total += golds.length;
    assert.ok(golds.length <= ECONOMY.GOLD_MAX);
    for (const g of golds) {
      assert.ok(g.x < 0 || g.x > 1000, 'drifts in from a side');
      assert.ok(g.born > 4, 'not in the first two waves');
    }
    // The plan without golds is the same whatever the gold stream does.
    const plain = es.filter((e) => e.kind !== 'gold').map((e) => e.kind + e.type);
    assert.deepEqual(plain, run({}, 60, seed).filter((e) => e.kind !== 'gold').map((e) => e.kind + e.type));
  }
  assert.ok(total > 0, 'some golden stars over 40 rounds');
});

test('each location has exactly one stable forbidden character type across seeded waves', async () => {
  const { HAZARD_CHARACTER, LOCATION_ORDER, typesFor } = await import('../src/core/config.js');
  const expected = {
    hands: 'bilyk', kitchen: 'bilyk', blood: 'chervonya',
    mouth: 'zubchyk', tummy: 'dobryk', skin: 'latochka',
  };
  assert.deepEqual(HAZARD_CHARACTER, expected);
  for (const loc of LOCATION_ORDER) {
    assert.deepEqual(typesFor(loc).cell, [expected[loc]], loc);
    let total = 0;
    for (let seed = 1; seed <= 6; seed++) {
      const forbidden = run({ location: loc }, 90, seed).filter((e) => e.kind === 'cell');
      total += forbidden.length;
      assert.ok(forbidden.every((e) => e.type === expected[loc]), loc);
    }
    assert.ok(total > 0, loc);
  }
});

test('every location and every saved late slot opens with four safe waves, then 1–2 matching hazards only', async () => {
  const { HAZARD_CHARACTER, LOCATION_ORDER } = await import('../src/core/config.js');
  for (const location of LOCATION_ORDER) for (const seed of [1, 11, 33]) {
    const trip = { slot: 22, speeds: { e0: 1.3 }, weights: {} };
    const w = waves(run({ location, run: trip, duration: 100 }, 60, seed));
    assert.ok(w.length > 5, `${location}/${seed}: too few waves`);
    for (const [i, group] of w.slice(0, 4).entries()) {
      assert.ok(group.every((e) => e.kind === 'fruit' || e.kind === 'microbe'),
        `${location}/${seed}: unsafe wave ${i + 1}`);
    }
    assert.ok(w[4].length === 1 || w[4].length === 2);
    assert.ok(w[4].every((e) => e.kind === 'cell' && e.type === HAZARD_CHARACTER[location]),
      `${location}/${seed}: wrong fifth-wave composition`);
  }
});
