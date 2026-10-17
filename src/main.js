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

import { CONFIG } from './core/config.js';
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
import { createUI } from './ui/screens.js';
import factsData from '../content/facts.uk.json';

const facts = factsData.facts;
const progress = createProgress(localStorageAdapter('mylna-hvylya'));
const ui = createUI(document.getElementById('ui'), { progress });
const synth = createSynth();
synth.setMuted(progress.state.muted);

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
]);

const particles = createParticles(stage.layers.fx, { max: 2000 });
const trail = createTrail(stage.layers.fx, particles);
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
const effects = createEffects({ stage, art, particles, synth, flash, hud });
let post = applyPost(stage, 'high');

// ------------------------------------------------------------------ scene state
const views = new Map();
let round = null;
let background = null;
let scene = 'title';
let currentLoc = progress.lastUnlocked();
let paused = false;
let acc = 0;
let lastReward = null;
let ghost = null;
const swipe = createSwipe({ minSpeed: CONFIG.SWIPE_MIN_SPEED });

function teardown() {
  effects.clear();
  particles.clear();
  trail.clear();
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
  paused = false;
  acc = 0;
}

function startRound(loc, mode, { interactive = true } = {}) {
  teardown();
  const tutorial = mode === 'play' && !progress.state.tutorialDone;
  background = createBackground(stage, mode === 'calm' && interactive ? 'calm' : loc);
  round = createRound({
    seed: (Date.now() ^ (Math.random() * 1e9)) >>> 0,
    width: stage.width,
    height: stage.height,
    location: loc,
    mode,
    tutorial,
  });
  round.interactive = interactive;
  round.on('spawn', (e) => {
    const v = createEntityView(e, art[e.type]);
    stage.layers.entities.addChild(v.container);
    v.update(e, 0);
    views.set(e.id, v);
  });
  round.on('remove', (e) => {
    const v = views.get(e.id);
    if (v) v.destroy();
    views.delete(e.id);
  });
  effects.attach(round, views);
  if (mode === 'play') {
    round.on('end', (summary) => {
      ui.hideHud();
      setTimeout(() => finishRound(loc, summary, tutorial), 1500);
    });
  }
  if (tutorial) showGhostHand();
  synth.stopAmbient();
  synth.startAmbient(mode === 'calm');
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

function finishRound(loc, summary, wasTutorial) {
  if (scene !== 'round') return;
  const result = progress.completeRound(loc, mulberry32((Date.now() >>> 0) ^ 0x9e3779b9));
  const { fact, seenIds } = pickFact(facts, loc, progress.state.seenFacts[loc] ?? []);
  progress.setSeenFacts(loc, seenIds);
  if (wasTutorial) progress.markTutorialDone();
  lastReward = result;
  scene = 'reward';
  ui.showReward({ sticker: result.sticker, fact, unlocked: result.unlocked, summary });
  synth.chime();
  if (fact) playVoice(fact.id, { muted: progress.state.muted });
}

function goTitle() {
  scene = 'title';
  currentLoc = progress.lastUnlocked();
  startRound(currentLoc, 'calm', { interactive: false });
  ui.showTitle();
}

function play(loc) {
  synth.unlock();
  if (!progress.isUnlocked(loc)) return;
  currentLoc = loc;
  scene = 'round';
  ui.hideScreen();
  ui.showHud();
  startRound(loc, 'play');
}

function calm() {
  synth.unlock();
  scene = 'calm';
  startRound(currentLoc, 'calm');
  ui.showCalm();
}

function pause() {
  if (scene !== 'round' || paused) return;
  paused = true;
  ui.showPause();
}

// ------------------------------------------------------------------ UI events
ui.on('play', (loc) => play(loc));
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
ui.on('menu', goTitle);
ui.on('again', () => {
  if (lastReward?.rest) {
    lastReward = null;
    scene = 'rest';
    ui.showRest();
    return;
  }
  play(currentLoc);
});
ui.on('again-now', () => play(currentLoc));
ui.on('pause', pause);
ui.on('resume', () => {
  paused = false;
  ui.hideScreen();
});
ui.on('mute', () => {
  synth.unlock();
  progress.setMuted(!progress.state.muted);
  synth.setMuted(progress.state.muted);
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
  canvas.setPointerCapture?.(ev.pointerId);
  const p = toWorld(ev);
  swipe.begin(p.x, p.y, now());
  trail.push(p.x, p.y, scene === 'calm');
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
        remaining: CONFIG.ROUND_SEC - round.state.time,
        vitamins: round.state.vitamins,
        calm: scene === 'calm',
      });
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
  window.__game = { get round() { return round; }, get scene() { return scene; }, progress, stage, gsap, get post() { return post; } };
}
