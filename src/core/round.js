// One round of play (or the endless calm mode). Pure logic; emits events that
// render, fx, audio and UI subscribe to.
import { CONFIG, BONUS_EFFECT } from './config.js';
import { POWERUP_FX } from './economy.js';
import { mulberry32 } from './rng.js';
import { createSpawner } from './spawner.js';
import { stepEntity, isOffscreen } from './physics.js';
import { segmentHitsCircle, segmentHitsSweptCircle } from './swipe.js';

export function createRound({
  seed, width, height, location, mode, duration = CONFIG.ROUND_SEC, run = null, gameOver = CONFIG.GAME_OVER,
  powerups = [],
}) {
  const has = (id) => powerups.includes(id);
  const rng = mulberry32(seed);
  const spawner = createSpawner({ rng, width, height, location, mode, duration, run });
  const listeners = new Map();
  const calm = mode === 'calm';
  const state = {
    time: 0, entities: [], combo: 0, bestCombo: 0, score: 0, vitamins: 0,
    slow: 0, shield: 0, ended: false, mode, location, width, height, duration,
    // Lives and the king follow the classic arcade rules (lives only matter
    // when gameOver is on).
    lives: CONFIG.MAX_LIVES + (has('heart') ? POWERUP_FX.EXTRA_LIVES : 0),
    maxLives: CONFIG.MAX_LIVES + (has('heart') ? POWERUP_FX.EXTRA_LIVES : 0),
    gameOver,
    // Power-ups bought for this round (economy.js) and what they still hold.
    powerups: [...powerups], forgive: has('shield') ? POWERUP_FX.SHIELD_FORGIVES : 0,
    gold: 0, cellTouches: 0,
    nextLifeAt: CONFIG.LIFE_FIRST_AT, nextKingAt: CONFIG.KING_AFTER,
    kingActive: false, burst: 0, reason: null,
    // Round tally for the reward screen (achievements, records): everything
    // cleanly sliced, dropped microbes/fruits, king cuts.
    sliced: 0, missed: 0, kingHits: 0,
    // Spawner clock: freezes while the king is on screen, so the wave queue
    // waits while the king is on screen.
    spawnTime: 0,
  };
  const shieldCenter = { x: width / 2, y: height * 0.5 };
  // «Велика хвиля»: a wider swipe reaches objects farther from the finger.
  const hitScale = CONFIG.HIT_SCALE * (has('wide') ? POWERUP_FX.WIDE_SCALE : 1);

  const emit = (name, ...args) => {
    for (const fn of listeners.get(name) ?? []) fn(...args);
  };

  // Points count both scores (microbes) and vitamins (fruit): the child earns
  // hearts back for everything they slice cleanly.
  const points = () => state.score + state.vitamins;

  function endRound(reason) {
    if (state.ended) return;
    state.ended = true;
    state.reason = reason;
    emit('end', {
      score: state.score, vitamins: state.vitamins, bestCombo: state.bestCombo,
      lives: state.lives, reason,
      sliced: state.sliced, missed: state.missed, kingHits: state.kingHits,
      points: state.score + state.vitamins,
      gold: state.gold, cellTouches: state.cellTouches, powerups: [...state.powerups],
      location, duration: state.duration,
    });
  }

  // A heart comes back at the first 100 points,
  // then every 100 after that (and never above three).
  function checkLives() {
    while (points() >= state.nextLifeAt) {
      if (state.lives < state.maxLives) {
        state.lives++;
        emit('life', state.lives);
      }
      state.nextLifeAt += CONFIG.LIFE_STEP;
    }
  }

  // ── the microbe king ──
  // Enters at 50 points, then every 100. Cuts count one per 0.077 s at most.
  // While he is around, characters are shooed away and defused when he is
  // cut; when his five seconds are up he bursts and time rushes back.
  function shooCells(king) {
    for (const c of state.entities) {
      if (!c.alive || c.kind !== 'cell') continue;
      c.vx += (Math.sign(c.x - king.x) || Math.sign(king.vx) || 1) * 320;
      c.vy -= 160;
    }
  }

  function defuseCells(king) {
    for (const c of state.entities) {
      if (!c.alive || c.kind !== 'cell' || c.defused) continue;
      c.defused = true;
      c.vx += (Math.sign(c.x - king.x) || Math.sign(king.vx) || 1) * 260;
      c.vy -= 220;
      emit('cellDefused', c);
    }
  }

  function spawnKing() {
    const king = spawner.king(state.time);
    state.entities.push(king);
    state.kingActive = true;
    emit('spawn', king);
    emit('kingSpawn', king);
    shooCells(king);
    while (points() >= state.nextKingAt) state.nextKingAt += CONFIG.KING_EVERY;
  }

  function blastKing(king) {
    king.alive = false;
    state.kingActive = false;
    state.burst = CONFIG.KING_BURST_SEC;
    emit('kingBlast', king);
    emit('remove', king);
  }

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
    state.sliced++;
    checkLives();
    if (!byBonus) bumpCombo();
    emit('capture', e, { combo: state.combo, byBonus });
  }

  function activateBonus(e) {
    kill(e);
    const effect = BONUS_EFFECT[e.type];
    emit('bonus', e.type, e, effect);
    if (effect === 'wave') {
      for (const m of state.entities) if (m.alive && m.kind === 'microbe') capture(m, true);
    } else if (effect === 'shield') {
      state.shield = CONFIG.SHIELD_SEC;
    } else if (effect === 'slow') {
      state.slow = CONFIG.SLOW_SEC;
    }
  }

  function resolve(e, seg) {
    if (e.kind === 'microbe') {
      capture(e, false);
    } else if (e.kind === 'fruit') {
      kill(e);
      state.vitamins++;
      state.sliced++;
      checkLives();
      bumpCombo();
      const angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
      emit('slice', e, { angle, combo: state.combo });
      // «Ще трішки»: every orange adds time to the round.
      if (has('time') && e.type === 'orange') {
        state.duration += POWERUP_FX.TIME_PER_ORANGE;
        spawner.extend(POWERUP_FX.TIME_PER_ORANGE);
        emit('timeBonus', e, POWERUP_FX.TIME_PER_ORANGE);
      }
      // «Іскриста полуниця»: a sliced strawberry catches microbes around it.
      if (has('berry') && e.type === 'strawberry') {
        let caught = 0;
        for (const m of state.entities) {
          if (!m.alive || m.kind !== 'microbe') continue;
          if (Math.hypot(m.x - e.x, m.y - e.y) <= POWERUP_FX.BERRY_RADIUS) {
            capture(m, true);
            caught++;
          }
        }
        emit('berryBurst', e, caught);
      }
    } else if (e.kind === 'cell') {
      // A defused character (the king was cut while it was around) is safe
      // and pops harmlessly; a live one ends the round on the spot, like a
      // classic bomb — the child never loses the round, it just stops early.
      if (e.defused) {
        kill(e);
        emit('cellPop', e);
        return;
      }
      if (e.cooldown > 0) return;
      e.cooldown = CONFIG.CELL_COOLDOWN;
      state.cellTouches++;
      // «Щит Білика» forgives a few touches: the character just bounces off.
      if (state.forgive > 0) {
        state.forgive--;
        const off = Math.sign(e.x - (seg.x1 + seg.x2) / 2) || 1;
        e.vx += off * 400;
        e.vy -= 200;
        emit('forgive', e, state.forgive);
        return;
      }
      const away = Math.sign(e.x - (seg.x1 + seg.x2) / 2) || 1;
      e.vx += away * 400;
      e.vy -= 200;
      emit('cellTouched', e);
      // Classic lives: a live character ends the round like a bomb. Without
      // them (default) it only giggles and breaks the combo.
      if (gameOver) endRound('cell');
      else state.combo = 0;
    } else if (e.kind === 'bonus') {
      activateBonus(e);
    } else if (e.kind === 'gold') {
      kill(e);
      state.gold++;
      emit('gold', e);
    } else if (e.kind === 'king') {
      // One point per cut, but no faster than every 0.077 s (FN
      // minSliceInterval); cutting him also defuses every character on screen.
      if (state.time - e.lastSliceAt < CONFIG.KING_SLICE_MIN) return;
      e.lastSliceAt = state.time;
      e.hits++;
      state.kingHits++;
      state.score++;
      checkLives();
      defuseCells(e);
      emit('kingSlice', e, { hits: e.hits });
    }
  }

  function applySegments(segments) {
    for (const seg of segments) {
      if (!(seg.active || (calm && seg.tap) || (calm && seg.speed > 0))) continue;
      for (const e of state.entities) {
        if (state.ended || !e.alive) continue;
        const radius = e.r * hitScale * (e.kind === 'microbe' || e.kind === 'fruit'
          ? CONFIG.SLICE_HIT_SCALE : 1);
        // The "do not slice" friends retain their strict current-position hitbox:
        // an oversized or swept hazard would unfairly end the child's round.
        // Sliceable sprites use the full object trajectory across this render frame.
        const hit = e.kind === 'cell'
          ? segmentHitsCircle(seg.x1, seg.y1, seg.x2, seg.y2, e.x, e.y, radius)
          : segmentHitsSweptCircle(seg.x1, seg.y1, seg.x2, seg.y2,
            e.inputFrameX ?? e.prevX ?? e.x, e.inputFrameY ?? e.prevY ?? e.y,
            e.x, e.y, radius);
        if (hit) resolve(e, seg);
      }
    }
  }

  function tickTimers(dt) {
    if (state.shield > 0) {
      state.shield = Math.max(0, state.shield - dt);
      if (state.shield === 0) emit('bonusEnd', 'shield');
    }
    if (state.slow > 0) {
      state.slow = Math.max(0, state.slow - dt);
      if (state.slow === 0) emit('bonusEnd', 'slow');
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
    // Called once per rendered frame, before zero or more fixed physics steps.
    // When the GPU is busy and several steps run before input is handled, the
    // swipe still sees all target motion through that frame.
    beginInputFrame() {
      for (const e of state.entities) {
        e.inputFrameX = e.x;
        e.inputFrameY = e.y;
      }
    },
    update(dt, segments) {
      state.time += dt;
      tickTimers(dt);

      // The king arrives on his points mark (play mode only).
      if (!calm && !state.ended && !state.kingActive && state.burst <= 0
        && points() >= state.nextKingAt) spawnKing();

      if (!state.ended) {
        if (!state.kingActive) state.spawnTime += dt;
        for (const e of spawner.update(state.spawnTime, dt, state.entities.length)) {
          state.entities.push(e);
          emit('spawn', e);
        }
      }

      // Time scale: bonuses slow the world, the king slows it more, and his
      // burst ramps everything back up from 5.3 % to 100 %.
      let scale = 1;
      if (state.slow > 0) scale = Math.min(scale, CONFIG.SLOW_SCALE);
      if (state.kingActive) scale = Math.min(scale, CONFIG.KING_SLOW);
      // «Повільний старт»: the first seconds fly slower.
      if (has('slow') && state.time < POWERUP_FX.SLOW_SEC) scale = Math.min(scale, POWERUP_FX.SLOW_SCALE);
      if (state.burst > 0) {
        state.burst = Math.max(0, state.burst - dt);
        const back = 1 - state.burst / CONFIG.KING_BURST_SEC;
        scale = CONFIG.KING_BURST_MIN + (1 - CONFIG.KING_BURST_MIN) * back;
      }
      const motionDt = dt * scale;
      for (const e of state.entities) {
        e.prevX = e.x;
        e.prevY = e.y;
        stepEntity(e, motionDt, e.gravity ?? spawner.gravity);
        if (e.cooldown > 0) e.cooldown -= dt;
      }

      if (!state.ended) {
        applySegments(segments);
        applyShield();
      }

      // The king bursts when his five seconds are up.
      if (state.kingActive) {
        const king = state.entities.find((e) => e.alive && e.kind === 'king');
        if (!king) state.kingActive = false;
        else if (state.time - king.born >= CONFIG.KING_SEC) blastKing(king);
      }

      const kept = [];
      for (const e of state.entities) {
        if (!e.alive) continue;
        if (isOffscreen(e, height, width)) {
          e.alive = false;
          emit('remove', e);
          // A dropped microbe or fruit costs a heart (classic lives rule); the
          // king himself never costs anything.
          if (!calm && (e.kind === 'microbe' || e.kind === 'fruit')) {
            state.missed++;
            if (gameOver) {
              state.lives = Math.max(0, state.lives - 1);
              emit('miss', e, state.lives);
              if (state.lives === 0) endRound('lives');
            }
          }
          continue;
        }
        kept.push(e);
      }
      state.entities = kept;

      if (!calm && !state.ended && state.time >= state.duration) endRound('time');
    },
  };
}
