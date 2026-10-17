// One round of play (or the endless calm mode). Pure logic; emits events that
// render, fx, audio and UI subscribe to.
import { CONFIG } from './config.js';
import { mulberry32 } from './rng.js';
import { createSpawner } from './spawner.js';
import { stepEntity, isOffscreen } from './physics.js';
import { segmentHitsCircle } from './swipe.js';

export function createRound({ seed, width, height, location, mode, tutorial }) {
  const rng = mulberry32(seed);
  const spawner = createSpawner({ rng, width, height, location, mode, tutorial });
  const listeners = new Map();
  const calm = mode === 'calm';
  const state = {
    time: 0, entities: [], combo: 0, bestCombo: 0, score: 0, vitamins: 0,
    slow: 0, shield: 0, ended: false, mode, location, width, height,
  };
  const shieldCenter = { x: width / 2, y: height * 0.5 };

  const emit = (name, ...args) => {
    for (const fn of listeners.get(name) ?? []) fn(...args);
  };

  function bumpCombo() {
    state.combo++;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    if (CONFIG.COMBO_STEPS.includes(state.combo)) emit('combo', state.combo);
  }

  function kill(e) {
    e.alive = false;
  }

  function capture(e, byBonus) {
    kill(e);
    state.score++;
    if (!byBonus) bumpCombo();
    emit('capture', e, { combo: state.combo, byBonus });
  }

  function activateBonus(e) {
    kill(e);
    emit('bonus', e.type, e);
    if (e.type === 'soap') {
      for (const m of state.entities) if (m.alive && m.kind === 'microbe') capture(m, true);
    } else if (e.type === 'vaccine') {
      state.shield = CONFIG.SHIELD_SEC;
    } else if (e.type === 'patch') {
      state.slow = CONFIG.SLOW_SEC;
    }
  }

  function resolve(e, seg) {
    if (e.kind === 'microbe') {
      capture(e, false);
    } else if (e.kind === 'fruit') {
      kill(e);
      state.vitamins++;
      bumpCombo();
      const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
      emit('slice', e, { angle, combo: state.combo });
    } else if (e.kind === 'cell') {
      if (e.cooldown > 0) return;
      e.cooldown = CONFIG.CELL_COOLDOWN;
      state.combo = 0;
      const away = Math.sign(e.x - (seg.x1 + seg.x2) / 2) || 1;
      e.vx += away * 400;
      e.vy -= 200;
      emit('cellTouched', e);
    } else if (e.kind === 'bonus') {
      activateBonus(e);
    }
  }

  function applySegments(segments) {
    for (const seg of segments) {
      if (!(seg.active || (calm && seg.tap) || (calm && seg.speed > 0))) continue;
      for (const e of state.entities) {
        if (!e.alive) continue;
        if (segmentHitsCircle(seg.x1, seg.y1, seg.x2, seg.y2, e.x, e.y, e.r * CONFIG.HIT_SCALE)) resolve(e, seg);
      }
    }
  }

  function tickTimers(dt) {
    if (state.shield > 0) {
      state.shield = Math.max(0, state.shield - dt);
      if (state.shield === 0) emit('bonusEnd', 'vaccine');
    }
    if (state.slow > 0) {
      state.slow = Math.max(0, state.slow - dt);
      if (state.slow === 0) emit('bonusEnd', 'patch');
    }
  }

  function applyShield() {
    if (state.shield <= 0) return;
    const reach = CONFIG.SHIELD_R;
    for (const e of state.entities) {
      if (!e.alive || e.kind !== 'microbe') continue;
      if (Math.hypot(e.x - shieldCenter.x, e.y - shieldCenter.y) <= reach + e.r) capture(e, true);
    }
  }

  return {
    state,
    shieldCenter,
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
      return this;
    },
    _inject(e) {
      state.entities.push(e);
    },
    update(dt, segments) {
      state.time += dt;
      tickTimers(dt);

      if (!state.ended) {
        for (const e of spawner.update(state.time, dt, state.entities.length)) {
          state.entities.push(e);
          emit('spawn', e);
        }
      }

      const motionDt = state.slow > 0 ? dt * CONFIG.SLOW_SCALE : dt;
      for (const e of state.entities) {
        stepEntity(e, motionDt, CONFIG.GRAVITY);
        if (e.cooldown > 0) e.cooldown -= dt;
      }

      if (!state.ended) {
        applySegments(segments);
        applyShield();
      }

      const kept = [];
      for (const e of state.entities) {
        if (!e.alive) continue;
        if (isOffscreen(e, height, width)) {
          e.alive = false;
          emit('remove', e);
          continue;
        }
        kept.push(e);
      }
      state.entities = kept;

      if (!calm && !state.ended && state.time >= CONFIG.ROUND_SEC) {
        state.ended = true;
        emit('end', { score: state.score, vitamins: state.vitamins, bestCombo: state.bestCombo });
      }
    },
  };
}
