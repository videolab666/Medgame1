// Entry point: wires core logic, renderer, effects, audio and DOM screens.
// States: title (decorative calm demo behind the menu) -> round -> reward
// -> (rest) -> title | round; title -> calm -> title; atlas / parents overlays.
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-900.css';
import '@fontsource/nunito/cyrillic-700.css';
import '@fontsource/nunito/cyrillic-900.css';
import './ui/styles.css';
import gsap from 'gsap';
import { Sprite } from 'pixi.js';

import { CONFIG, roundSeconds } from './core/config.js';
import { createRound } from './core/round.js';
import { createSwipe } from './core/swipe.js';
import { createProgress, localStorageAdapter } from './core/progress.js';
import { pickFact } from './core/content.js';
import { pickQuality } from './core/quality.js';
import { createFlashGuard } from './core/flashGuard.js';
import { mulberry32 } from './core/rng.js';
import { createStage } from './render/stage.js';
import { loadArt } from './render/svg.js';
import { createEntityView } from './render/entity.js';
import { createBackground } from './render/background.js';
import { createParticles } from './fx/particles.js';
import { createTrail } from './fx/trail.js';
import { createEffects } from './fx/effects.js';
import { applyPost } from './fx/post.js';
import { createSynth } from './audio/synth.js';
import { initVoice, playVoice } from './audio/voice.js';
import { createMusic } from './audio/music.js';
import { POWERUPS } from './core/economy.js';
import { createUI } from './ui/screens.js';
import factsData from '../content/facts.uk.json';

const facts = factsData.facts;
const progress = createProgress(localStorageAdapter('mylna-hvylya'));
const synth = createSynth();
synth.setMuted(progress.state.muted);
const music = createMusic(synth);
music.setMuted(progress.state.muted);
const ui = createUI(document.getElementById('ui'), { progress, onTap: () => synth.tap() });

let stage;
try {
  stage = await createStage(document.getElementById('game'));
} catch {
  ui.showError('Гра не змогла запуститися. Відкрийте її в Chrome або Safari.');
  throw new Error('WebGL unavailable');
}

const [art] = await Promise.all([
  loadArt(256),
  document.fonts?.load('900 52px Nunito').catch(() => {}),
  initVoice(),
  music.init(),
  fetch('sfx/index.json')
    .then((r) => (r.ok ? r.json() : []))
    .then((list) => synth.setSampleList(list))
    .catch(() => {}),
]);

const particles = createParticles(stage.layers.fx, { max: 2000 });
const trail = createTrail(stage.layers.fx, particles);
trail.setStyle(progress.state.trails.selected);
const flash = createFlashGuard(400);
const hud = {
  jarWorldPos: () => {
    const p = ui.jarScreenPos();
    return stage.toWorld(p.x, p.y);
  },
  bumpJar: () => ui.bumpJar(),
  comboPopup: (n) => ui.comboPopup(n),
  bonusBadge: (t) => ui.bonusBadge(t),
};
// Light vibration on Android; silent mode turns it off too.
const haptic = (pattern) => {
  const touched = navigator.userActivation ? navigator.userActivation.hasBeenActive : true;
  if (!progress.state.muted && touched && navigator.vibrate) navigator.vibrate(pattern);
};
const effects = createEffects({ stage, art, particles, synth, flash, hud, haptic });
let post = applyPost(stage, 'high');

// ------------------------------------------------------------------ scene state
const views = new Map();
let round = null;
let background = null;
let scene = 'title';
let currentLoc = progress.lastUnlocked();
let paused = false;
let acc = 0;
// Reward screen appears a moment after the round ends (counted in game time,
// so background-tab timer throttling cannot delay or skip it).
let pendingFinish = null;
let lastReward = null;
let ghost = null;
// King camera: a little closer while he is around, plus a quick pull toward
// every cut (0.3–0.45 of the slice offset).
const camState = { zoom: 1, x: 0, y: 0, tx: 0, ty: 0, hold: 0 };
function resetCamera() {
  camState.zoom = 1;
  camState.x = 0;
  camState.y = 0;
  camState.tx = 0;
  camState.ty = 0;
  camState.hold = 0;
  stage.setCamera(camState);
}
// Location pre-selected behind the "how to play" card before the first round.
let introLoc = null;
const swipe = createSwipe({ minSpeed: CONFIG.SWIPE_MIN_SPEED });

function teardown() {
  effects.clear();
  particles.clear();
  trail.clear();
  resetCamera();
  for (const v of views.values()) v.destroy();
  views.clear();
  if (background) background.destroy();
  background = null;
  if (ghost) {
    gsap.killTweensOf(ghost);
    ghost.destroy();
    ghost = null;
  }
  round = null;
  pendingFinish = null;
  paused = false;
  acc = 0;
}

function startRound(loc, mode, { interactive = true, powerups = [] } = {}) {
  teardown();
  const tutorial = mode === 'play' && !progress.state.tutorialDone;
  // Rounds start short (40 s) and grow +5 s per completed round up to 60 s.
  const duration = mode === 'calm' ? CONFIG.ROUND_SEC : roundSeconds(progress.state.rounds[loc] ?? 0);
  background = createBackground(stage, mode === 'calm' && interactive ? 'calm' : loc);
  round = createRound({
    seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0,
    width: stage.width,
    height: stage.height,
    location: loc,
    mode,
    tutorial,
    duration,
    // A round continues the location's endless wave trip (a classic run
    // cut into timed pieces): cursor, speeds and weights live in the save.
    run: mode === 'play' ? progress.runFor(loc) : null,
    powerups: mode === 'play' ? powerups : [],
  });
  round.interactive = interactive;
  round.on('spawn', (e) => {
    const v = createEntityView(e, art[e.type], art.bubble.body);
    stage.layers.entities.addChild(v.container);
    v.update(e, 0);
    views.set(e.id, v);
  });
  round.on('remove', (e) => {
    const v = views.get(e.id);
    if (v) v.destroy();
    views.delete(e.id);
  });
  // Each king cut pulls the camera a little toward the cut, then it drifts
  // back — the whole picture leans into the swipe.
  round.on('kingSlice', (e) => {
    const clamp = (v) => Math.max(-CONFIG.KING_CAM_PULL, Math.min(CONFIG.KING_CAM_PULL, v));
    camState.tx = clamp(e.x - stage.width / 2) * 0.6;
    camState.ty = clamp(e.y - stage.height / 2) * 0.6;
    camState.hold = CONFIG.KING_CAM_MOVE;
  });
  effects.attach(round, views);
  // Economy moments during the round.
  round.on('gold', () => ui.toast('Золота зірочка! +5 ⭐'));
  round.on('forgive', (e, left) => {
    ui.hudForgive(left);
    ui.toast(left > 0 ? `Щит Білика! Ще ${left}` : 'Щит Білика спрацював!');
  });
  round.on('timeBonus', (e, sec) => ui.toast(`+${sec} с`));
  round.on('berryBurst', (e, n) => { if (n) ui.toast(`Іскриста полуниця! +${n}`); });
  if (mode === 'play') {
    round.on('end', (summary) => {
      ui.hideHud();
      pendingFinish = { in: 1.5, args: [loc, summary, tutorial] };
    });
  }
  if (tutorial) showGhostHand();
  music.play(!interactive ? 'menu' : mode === 'calm' ? 'calm' : loc);
}

function showGhostHand() {
  ghost = new Sprite(art.hand.body);
  ghost.anchor.set(0.3, 0.1);
  ghost.width = ghost.height = 170;
  ghost.alpha = 0;
  stage.layers.hud.addChild(ghost);
  const y = stage.height * 0.42;
  gsap
    .timeline({ repeat: 3, delay: 0.8, onComplete: () => ghost && (ghost.visible = false) })
    .set(ghost, { x: stage.width * 0.2, y: y + 60, alpha: 0 })
    .to(ghost, { alpha: 0.9, duration: 0.25 })
    .to(ghost, { x: stage.width * 0.8, y: y - 60, duration: 0.7, ease: 'power1.inOut' })
    .to(ghost, { alpha: 0, duration: 0.3 });
}

// A kind line under the reward title when the round ended early.
const END_NOTE = {
  cell: 'Зачепили клітинку — і раунд зупинився. Наступного разу вийде!',
  lives: 'Сердечка закінчилися — відпочиньмо трошки.',
};

function finishRound(loc, summary, wasTutorial) {
  if (scene !== 'round') return;
  const result = progress.completeRound(loc, mulberry32((Date.now() >>> 0) ^ 0x9e3779b9), summary);
  const { fact, seenIds } = pickFact(facts, loc, progress.state.seenFacts[loc] ?? []);
  progress.setSeenFacts(loc, seenIds);
  if (wasTutorial) progress.markTutorialDone();
  lastReward = result;
  scene = 'reward';
  // The next round is a little longer until the cap (+5 s): the reward screen
  // says so next to «Наступний раунд».
  const done = progress.state.rounds[loc];
  const plusSeconds = roundSeconds(done) - roundSeconds(done - 1);
  ui.showReward({
    sticker: result.sticker, fact, unlocked: result.unlocked, summary,
    note: END_NOTE[summary.reason] ?? '',
    round: done, loc, best: result.best, achievements: result.achievements, plusSeconds,
    economy: result.economy,
  });
  // A new level unlocks a trail: keep the current one, but celebrate.
  if (result.economy?.levelUps?.length) synth.sparkle();
  if (!music.jingle('reward')) synth.fanfare();
  if (fact) playVoice(fact.id, { muted: progress.state.muted });
}

function goTitle() {
  // Leaving a long-enough calm session moves the calm tasks.
  if (scene === 'calm' && performance.now() - calmStartedAt >= CALM_TASK_SEC * 1000) {
    const r = progress.recordCalm();
    for (const t of r.done) ui.notice(`🎯 ${t.text} · +${t.reward} ⭐`);
  }
  scene = 'title';
  currentLoc = progress.nextLocation();
  startRound(currentLoc, 'calm', { interactive: false });
  ui.showTitle();
}

function play(loc, powerups = []) {
  synth.unlock();
  music.unlock();
  if (!progress.isUnlocked(loc)) return;
  currentLoc = loc;
  scene = 'round';
  ui.hideScreen();
  startRound(loc, 'play', { powerups });
  ui.showHud(round.state.maxLives, powerups);
}

// Pre-round screen: pick power-ups for the coming round (or play right away).
// Skipped when it has nothing to offer: the first round in a location starts
// right away, and so does any round when no power-up is affordable.
const CHEAPEST_POWERUP = Math.min(...POWERUPS.map((x) => x.price));
function prep(loc) {
  synth.unlock();
  if (!progress.isUnlocked(loc)) return;
  currentLoc = loc;
  const firstRound = !(progress.state.rounds[loc] > 0);
  if (firstRound || progress.state.stars < CHEAPEST_POWERUP) {
    play(loc);
    return;
  }
  scene = 'prep';
  ui.showPrep(loc, progress.state.rounds[loc] + 1);
}

// A calm session counts for Bilyk's calm tasks after half a minute.
let calmStartedAt = 0;
const CALM_TASK_SEC = 30;

function calm() {
  synth.unlock();
  music.unlock();
  scene = 'calm';
  calmStartedAt = performance.now();
  startRound(currentLoc, 'calm');
  ui.showCalm();
}

function pause() {
  if (scene !== 'round' || paused) return;
  paused = true;
  ui.showPause();
}

// ------------------------------------------------------------------ UI events
ui.on('play', (loc) => {
  // First visit to a location: show what to wash, collect and leave alone.
  if (!(progress.state.rounds[loc] > 0)) {
    introLoc = loc;
    synth.unlock();
    ui.showIntro('start', loc);
    return;
  }
  prep(loc);
});
ui.on('how', () => ui.showIntro('info', currentLoc));
ui.on('intro-go', () => {
  const loc = introLoc;
  introLoc = null;
  if (loc) prep(loc);
});
ui.on('pu-toggle', (id) => ui.prepToggle(id));
ui.on('prep-go', () => {
  const bought = progress.buyPowerups(ui.prepSelection());
  play(currentLoc, bought || []);
});
ui.on('tasks', () => {
  scene = 'tasks';
  ui.showTasks();
});
ui.on('collection', (tab) => {
  scene = 'collection';
  ui.showCollection(tab || 'trails');
});
ui.on('trail-buy', (id) => {
  if (progress.buyTrail(id)) {
    trail.setStyle(id);
    synth.sparkle();
  }
  ui.showCollection('trails');
});
ui.on('trail-pick', (id) => {
  if (progress.selectTrail(id)) trail.setStyle(id);
  ui.showCollection('trails');
});
ui.on('avatar-pick', (key) => {
  progress.selectAvatar(key);
  ui.showCollection('avatars');
});
ui.on('locked', () => synth.giggle());
ui.on('calm', calm);
ui.on('atlas', () => {
  scene = 'atlas';
  ui.showAtlas('hands');
});
ui.on('atlas-tab', (loc) => ui.showAtlas(loc));
ui.on('sticker', (artKey) => {
  synth.sparkle();
  ui.showStickerCard(artKey);
});
ui.on('nope', () => synth.pop());
ui.on('close-card', () => ui.hideStickerCard());
ui.on('parents', () => {
  scene = 'parents';
  ui.showParents();
});
ui.on('reset', () => {
  if (!ui.confirmReset()) return;
  progress.reset();
  goTitle();
});
ui.on('menu', () => {
  // Leaving a round (or the game) mid-way: keep the wave cursor we reached.
  progress.persist();
  goTitle();
});
ui.on('again', () => {
  if (lastReward?.rest) {
    lastReward = null;
    scene = 'rest';
    ui.showRest();
    music.play('rest');
    return;
  }
  prep(currentLoc);
});
ui.on('again-now', () => prep(currentLoc));
ui.on('pause', pause);
ui.on('resume', () => {
  paused = false;
  ui.hideScreen();
});
ui.on('mute', () => {
  synth.unlock();
  progress.setMuted(!progress.state.muted);
  synth.setMuted(progress.state.muted);
  music.setMuted(progress.state.muted);
  music.unlock();
  ui.setMuteIcon(progress.state.muted);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

// ------------------------------------------------------------------ input
const canvas = stage.app.canvas;
const now = () => performance.now() / 1000;
function toWorld(ev) {
  const r = canvas.getBoundingClientRect();
  return stage.toWorld(ev.clientX - r.left, ev.clientY - r.top);
}
const canPlay = () => round && round.interactive && !paused && (scene === 'round' || scene === 'calm');

canvas.addEventListener('pointerdown', (ev) => {
  if (!canPlay()) return;
  synth.unlock();
  music.unlock();
  canvas.setPointerCapture?.(ev.pointerId);
  const p = toWorld(ev);
  swipe.begin(p.x, p.y, now());
  trail.push(p.x, p.y, scene === 'calm', true);
});
canvas.addEventListener('pointermove', (ev) => {
  if (!canPlay() || !swipe.down) return;
  const p = toWorld(ev);
  const seg = swipe.move(p.x, p.y, now());
  if (seg) trail.push(p.x, p.y, seg.active || scene === 'calm');
});
const up = () => swipe.end();
canvas.addEventListener('pointerup', up);
canvas.addEventListener('pointercancel', up);

// ------------------------------------------------------------------ loop
const probe = { frames: 0, time: 0, done: false };
const forced = new URLSearchParams(window.location.search).get('quality');
if (forced) {
  post = applyPost(stage, forced);
  particles.setMax(post.maxParticles);
  probe.done = true;
}

stage.app.ticker.add((ticker) => {
  const dt = Math.min(ticker.deltaMS / 1000, 0.1);

  if (!probe.done) {
    probe.frames++;
    probe.time += ticker.deltaMS / 1000;
    if (probe.time >= 2.5) {
      const tier = pickQuality(probe.frames / probe.time);
      if (tier !== post.tier) {
        post = applyPost(stage, tier);
        particles.setMax(post.maxParticles);
      }
      probe.done = true;
    }
  }

  if (round && !paused) {
    acc += dt;
    let segs = swipe.takeSegments();
    if (!round.interactive) segs = [];
    while (acc >= CONFIG.STEP) {
      round.update(CONFIG.STEP, segs);
      segs = [];
      acc -= CONFIG.STEP;
    }
    for (const e of round.state.entities) views.get(e.id)?.update(e, dt);
    trail.setCombo(round.state.combo);
    if (scene === 'round' || scene === 'calm') {
      ui.updateHud({
        remaining: round.state.duration - round.state.time,
        total: round.state.duration,
        vitamins: round.state.vitamins,
        score: round.state.score,
        lives: round.state.lives,
        calm: scene === 'calm',
      });
    }
  }
  // Camera: closer while the king is around, leaning toward each cut. The
  // pull is clamped to the zoom margin, so the backdrop never shows a gap.
  const kingish = !!round && (round.state.kingActive || round.state.burst > 0);
  const zoomTarget = kingish ? CONFIG.KING_CAM_ZOOM : 1;
  camState.zoom += (zoomTarget - camState.zoom) * Math.min(1, dt * 8);
  if (camState.hold > 0) camState.hold -= dt;
  else {
    camState.tx = 0;
    camState.ty = 0;
  }
  const camK = Math.min(1, dt * 9);
  camState.x += (camState.tx - camState.x) * camK;
  camState.y += (camState.ty - camState.y) * camK;
  const marginX = Math.max(0, ((camState.zoom - 1) * stage.width) / 2 - 4);
  const marginY = Math.max(0, ((camState.zoom - 1) * stage.height) / 2 - 4);
  const bound = (v, m) => Math.max(-m, Math.min(m, v));
  stage.setCamera({ zoom: camState.zoom, x: bound(camState.x, marginX), y: bound(camState.y, marginY) });
  if (pendingFinish && !paused) {
    pendingFinish.in -= dt;
    if (pendingFinish.in <= 0) {
      const { args } = pendingFinish;
      pendingFinish = null;
      finishRound(...args);
    }
  }
  if (!paused) {
    particles.update(dt);
    effects.update(dt);
  }
  trail.update(dt);
  background?.update(dt);
  post.update(dt);
});

goTitle();

// Dev-only handle for in-browser checks (stripped from production builds).
if (import.meta.env.DEV) {
  window.__game = { get round() { return round; }, get scene() { return scene; }, progress, stage, gsap, music, get post() { return post; } };
  if (new URLSearchParams(window.location.search).has('harness')) {
    import('./dev/harness.js').then((m) => m.installHarness(window.__game));
  }
}
