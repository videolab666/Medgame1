# «Мильна Хвиля» MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Playable mobile-web PWA swipe-arcade «Мильна Хвиля» per spec `docs/superpowers/specs/2026-10-18-mylna-hvylya-design.md`.

**Architecture:** Pure-JS deterministic game core (`src/core/`, tested with `node --test`) emits events; PixiJS v8 renderer, particle/FX layer, WebAudio synth and DOM UI subscribe to those events. Fixed 60 Hz logic step, render at display rate.

**Tech Stack:** Node 22, Vite 8.3, pixi.js 8.22, gsap 3.15, pixi-filters 6.1.5, vite-plugin-pwa 2.0, @fontsource/nunito.

## Global Constraints

- All player-facing strings Ukrainian; code/comments English.
- Spec rules R1–R11 (spec §2) apply to every task. In particular: no explosions/shake/war words; full-screen brightness changes only through `flashGuard` (≥ 400 ms apart); no game over; no network after load; no trackers; all art original SVG generated in code.
- World coordinates: width fixed `1000` units, height `1000 * screenH / screenW`. Origin top-left, y down.
- Object radius `75` units (≈15 % width); hit radius = `r * 1.25`.
- Round `60` s; logic step `1/60` s.
- Default volume 40 %; mute persisted.
- Facts ≤ 80 chars, ≤ 12 words; each has `id`, `location`, `text`, `source`, `status`.
- Initial load < 600 KB gzip. ≥ 45 FPS Mid quality at 390×844, 4× CPU throttle.
- Tests: `npm test` = `node --test tests/`. Validators: `npm run validate`.

## File Map

```
package.json, vite.config.js, index.html, .gitignore, README.md, ART_LICENSE.json
.claude/launch.json                     dev server for preview pane
.github/workflows/pages.yml             test + validate + build + deploy
content/facts.uk.json                   facts registry
scripts/validate.mjs                    facts / art-license / banned-words checks
src/core/config.js     CONFIG constants, LOCATIONS weights
src/core/rng.js        mulberry32(seed) -> () => float [0,1)
src/core/swipe.js      createSwipe, segmentHitsCircle
src/core/physics.js    stepEntity
src/core/spawner.js    createSpawner
src/core/round.js      createRound (state + events)
src/core/progress.js   createProgress, STICKERS
src/core/content.js    pickFact
src/core/quality.js    pickQuality
src/core/flashGuard.js createFlashGuard
src/render/svg.js      svgToTexture
src/render/art.js      SVG builders for every character/fruit/bonus/ui icon
src/render/stage.js    createStage (Pixi app, layers, world scale)
src/render/entity.js   createEntityView
src/render/background.js createBackground(location)
src/fx/particles.js    createParticles
src/fx/trail.js        createTrail
src/fx/effects.js      capture / slice / giggle / bonus effects wired to round events
src/fx/post.js         applyPost(stage, quality)
src/audio/synth.js     createSynth
src/audio/voice.js     playVoice
src/ui/screens.js      DOM screens (title, hud, reward, rest, atlas, parents, pause, calm)
src/ui/styles.css
src/main.js            state machine + game loop
tests/*.test.mjs
```

---

### Task 1: Scaffold

**Files:** Create `package.json`, `vite.config.js`, `index.html`, `.gitignore`, `.claude/launch.json`, `tests/smoke.test.mjs`, `src/main.js` (placeholder render of title text).

- [ ] Step 1: `package.json`:
```json
{
  "name": "mylna-hvylya",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "vite build",
    "preview": "vite preview --host",
    "test": "node --test tests/",
    "validate": "node scripts/validate.mjs"
  }
}
```
- [ ] Step 2: `npm i pixi.js@8.22.0 gsap@3.15.0 pixi-filters@6.1.5 @fontsource/nunito` and `npm i -D vite@8.3.4 vite-plugin-pwa@2.0.0`.
- [ ] Step 3: `vite.config.js` with `base: './'`, VitePWA (registerType autoUpdate, manifest name «Мильна Хвиля», lang uk, display standalone, orientation portrait, theme `#1f5063`, background `#ebfaf2`, icons from `public/icon-192.png`, `public/icon-512.png`; workbox globPatterns `**/*.{js,css,html,svg,png,woff2,json}`).
- [ ] Step 4: `tests/smoke.test.mjs`: `test('node test runner works', () => assert.equal(1+1, 2))`. Run `npm test` → PASS.
- [ ] Step 5: `.claude/launch.json` config `dev` → `npm run dev`, port 5173. Start preview, confirm page loads, no console errors.
- [ ] Step 6: Commit `chore: scaffold vite + pixi project`.

### Task 2: core config, rng, swipe

**Files:** Create `src/core/config.js`, `src/core/rng.js`, `src/core/swipe.js`; Test `tests/swipe.test.mjs`, `tests/rng.test.mjs`.

**Interfaces (Produces):**
- `CONFIG` object: `WORLD_W=1000, ROUND_SEC=60, STEP=1/60, GRAVITY=1800, RADIUS=75, HIT_SCALE=1.25, SWIPE_MIN_SPEED=500, SLOW_SEC=4, SLOW_SCALE=0.45, SHIELD_SEC=5, SHIELD_R=190, COMBO_STEPS=[3,5,10], REST_EVERY=3, UNLOCK_AFTER=3, STICKERS_PER_LOCATION=8`.
- `LOCATIONS = { hands:{microbe:.7,fruit:.15,cell:.15}, kitchen:{microbe:.35,fruit:.5,cell:.15}, blood:{microbe:.45,fruit:.15,cell:.4} }`, `LOCATION_ORDER=['hands','kitchen','blood']`.
- `TYPES = { microbe:['chykhunchyk','brudnulya','lypuchka','kashlyuk'], fruit:['orange','apple','kiwi','strawberry','broccoli'], cell:['chervonya','bilyk','latochka'], bonus:['soap','vaccine','patch'] }`.
- `mulberry32(seed:number) => () => number` in [0,1).
- `segmentHitsCircle(x1,y1,x2,y2,cx,cy,r) => boolean`.
- `createSwipe({minSpeed}) => { begin(x,y,tSec), move(x,y,tSec), end(), takeSegments(): Segment[] }`, `Segment = {x1,y1,x2,y2,speed,active}`; `begin` emits a zero-length tap segment with `tap:true, active:false`.

- [ ] Step 1: failing tests:
```js
// tests/swipe.test.mjs
import test from 'node:test'; import assert from 'node:assert/strict';
import { segmentHitsCircle, createSwipe } from '../src/core/swipe.js';
test('segment through circle hits', () => assert.ok(segmentHitsCircle(0,0,100,0,50,10,20)));
test('segment beside circle misses', () => assert.ok(!segmentHitsCircle(0,0,100,0,50,40,20)));
test('segment ending before circle misses', () => assert.ok(!segmentHitsCircle(0,0,20,0,60,0,20)));
test('zero-length segment inside circle hits', () => assert.ok(segmentHitsCircle(5,5,5,5,0,0,10)));
test('fast move is active, slow move is not', () => {
  const s = createSwipe({ minSpeed: 500 });
  s.begin(0,0,0); s.move(100,0,0.1); s.move(110,0,0.2);
  const seg = s.takeSegments().filter(x => !x.tap);
  assert.equal(seg[0].active, true);  // 1000 u/s
  assert.equal(seg[1].active, false); // 100 u/s
  assert.equal(s.takeSegments().length, 0);
});
test('begin emits tap segment', () => {
  const s = createSwipe({ minSpeed: 500 }); s.begin(3,4,0);
  const [t] = s.takeSegments(); assert.equal(t.tap, true); assert.equal(t.x1, 3);
});
// tests/rng.test.mjs
test('mulberry32 deterministic and in range', () => {
  const a = mulberry32(42), b = mulberry32(42);
  for (let i = 0; i < 100; i++) { const v = a(); assert.equal(v, b()); assert.ok(v >= 0 && v < 1); }
});
```
- [ ] Step 2: `npm test` → FAIL (modules missing).
- [ ] Step 3: implement (closest-point-on-segment distance ≤ r; speed = dist/dt, dt clamped ≥ 1 ms).
- [ ] Step 4: `npm test` → PASS. Step 5: commit `feat(core): config, rng, swipe hit-testing`.

### Task 3: physics + spawner

**Files:** Create `src/core/physics.js`, `src/core/spawner.js`; Test `tests/spawner.test.mjs`.

**Interfaces:**
- `Entity = {id, kind:'microbe'|'fruit'|'cell'|'bonus', type, x, y, vx, vy, rot, vrot, r, alive, float:boolean, born}`.
- `stepEntity(e, dt, gravity)` mutates: ballistic (`vy += g*dt`) unless `float` (then `y += vy*dt`, `x += sin(born+..)*` sway); `rot += vrot*dt`.
- `isOffscreen(e, height) => boolean` (below `height + 2r` while falling, or above `-2r` when float).
- `createSpawner({rng, width, height, location, mode:'play'|'calm', tutorial:boolean}) => { update(t, dt, aliveCount): Entity[] }`.
  - play: interval `lerp(1.1, 0.45, t/60)` s; batch 1–3 (more later); `maxAlive = round(lerp(3,7,t/60))`; launch from y=height+r, x in [150, 850], vx toward center ±, vy = −sqrt(2·g·h) with apex h ∈ [0.45, 0.75]·height; bonus chance 0.06 per entity, max 3 bonuses per round; fairness: a cell is never spawned in the same batch within 200 units x of a microbe.
  - tutorial (play): first 8 s only microbes, one at a time, slow (apex 0.55); one cell at t≈8 s.
  - calm: one microbe every 1.6 s, `float:true`, y=height+r, vy=−140, maxAlive 6, no cells/fruits/bonuses.
- [ ] Step 1: failing tests:
```js
import { createSpawner } from '../src/core/spawner.js'; import { stepEntity } from '../src/core/physics.js';
import { mulberry32 } from '../src/core/rng.js';
const run = (opts, sec=60) => { const sp = createSpawner({ rng: mulberry32(7), width:1000, height:2000, location:'hands', mode:'play', tutorial:false, ...opts });
  const out=[]; for (let t=0; t<sec; t+=1/60) out.push(...sp.update(t, 1/60, 0)); return out; };
test('deterministic by seed', () => assert.deepEqual(run({}).map(e=>e.type), run({}).map(e=>e.type)));
test('spawn rate rises over round', () => { const es=run({}); const early=es.filter(e=>e.born<15).length, late=es.filter(e=>e.born>=45).length; assert.ok(late > early); });
test('max 3 bonuses', () => assert.ok(run({}).filter(e=>e.kind==='bonus').length <= 3));
test('blood has more cells than hands', () => { const c=l=>run({location:l}).filter(e=>e.kind==='cell').length; assert.ok(c('blood') > c('hands')); });
test('tutorial: no cells first 7s, microbes only', () => { const es=run({tutorial:true},7.9); assert.ok(es.length>0 && es.every(e=>e.kind==='microbe')); });
test('calm: only floating microbes', () => { const es=run({mode:'calm'},20); assert.ok(es.length>0 && es.every(e=>e.kind==='microbe' && e.float)); });
test('respects aliveCount cap', () => { const sp=createSpawner({rng:mulberry32(1),width:1000,height:2000,location:'hands',mode:'play',tutorial:false}); let n=0; for(let t=0;t<10;t+=1/60) n+=sp.update(t,1/60,99).length; assert.equal(n,0); });
test('launched entity reaches apex inside screen', () => { const [e]=run({},3); const h=2000; let minY=e.y; for(let i=0;i<600;i++){stepEntity(e,1/60,1800); minY=Math.min(minY,e.y);} assert.ok(minY>0 && minY<h*0.6); });
```
- [ ] Steps 2–4: fail → implement → pass. Step 5: commit `feat(core): spawner and physics`.

### Task 4: round state machine

**Files:** Create `src/core/round.js`; Test `tests/round.test.mjs`.

**Interfaces:**
- `createRound({seed, width, height, location, mode, tutorial}) => round`
- `round.on(name, fn)`; events: `spawn(e)`, `capture(e, {combo, byBonus})` microbe, `slice(e, {angle, combo})` fruit, `cellTouched(e)`, `combo(n)` when combo hits 3/5/10, `bonus(type, e)`, `bonusEnd(type)`, `remove(e)`, `end({score, vitamins, bestCombo})` exactly once (play mode only).
- `round.update(dt, segments)`; `round.state = {time, entities, combo, bestCombo, score, vitamins, slow, shield, ended}` (`slow`, `shield` = remaining seconds).
- Rules: active segment (or any segment incl. taps in calm) intersecting hit circle → resolve by kind; microbe → capture, score+1, combo+1; fruit → slice, vitamins+1, combo+1, angle=atan2(seg); cell → `cellTouched`, combo=0, cell gets vx kick away, it stays alive but can trigger again only after 0.6 s cooldown; bonus soap → capture all alive microbes (`byBonus:true`); vaccine → shield 5 s (microbe within SHIELD_R + r of center (width/2, height*0.5) is captured); patch → slow 4 s (entity dt × 0.45). Entity motion uses scaled dt; round time uses real dt. Offscreen → `remove`, no penalty. `time ≥ 60` → stop spawning, emit `end`. Calm mode never ends.
- [ ] Step 1: failing tests (helper places entities directly via `round._inject(e)` test hook):
```js
import { createRound } from '../src/core/round.js';
const mk = (o={}) => createRound({ seed:1, width:1000, height:2000, location:'hands', mode:'play', tutorial:false, ...o });
const ent = (kind,type,x,y) => ({ id:Math.random(), kind, type, x, y, vx:0, vy:0, rot:0, vrot:0, r:75, alive:true, float:false, born:0 });
const cut = (x,y) => [{ x1:x-100, y1:y, x2:x+100, y2:y, speed:2000, active:true }];
test('microbe capture increments score and combo', () => { const r=mk(); const got=[]; r.on('capture',(e,i)=>got.push(i.combo)); r._inject(ent('microbe','chykhunchyk',500,500)); r.update(1/60, cut(500,500)); assert.equal(r.state.score,1); assert.deepEqual(got,[1]); });
test('cell touch resets combo, no score loss', () => { const r=mk(); r._inject(ent('microbe','kashlyuk',300,500)); r._inject(ent('cell','bilyk',700,900)); r.update(1/60,cut(300,500)); r.update(1/60,cut(700,900)); assert.equal(r.state.combo,0); assert.equal(r.state.score,1); });
test('inactive segment does nothing in play', () => { const r=mk(); r._inject(ent('microbe','kashlyuk',500,500)); r.update(1/60,[{...cut(500,500)[0],active:false}]); assert.equal(r.state.score,0); });
test('tap captures in calm mode', () => { const r=mk({mode:'calm'}); r._inject({...ent('microbe','lypuchka',500,500),float:true}); r.update(1/60,[{x1:500,y1:500,x2:500,y2:500,speed:0,active:false,tap:true}]); assert.equal(r.state.score,1); });
test('combo event at 3', () => { const r=mk(); const c=[]; r.on('combo',n=>c.push(n)); for(let i=0;i<3;i++){ r._inject(ent('microbe','kashlyuk',500,500)); r.update(1/60,cut(500,500)); } assert.deepEqual(c,[3]); });
test('soap captures all microbes', () => { const r=mk(); r._inject(ent('microbe','a',100,300)); r._inject(ent('microbe','b',900,1500)); r._inject(ent('bonus','soap',500,800)); r.update(1/60,cut(500,800)); assert.equal(r.state.score,2); });
test('vaccine shield captures microbe at center', () => { const r=mk(); r._inject(ent('bonus','vaccine',200,200)); r.update(1/60,cut(200,200)); assert.ok(r.state.shield>0); r._inject(ent('microbe','a',500,1000)); r.update(1/60,[]); assert.equal(r.state.score,1); });
test('patch slows entities', () => { const r=mk(); r._inject(ent('bonus','patch',200,200)); r.update(1/60,cut(200,200)); const e=ent('fruit','kiwi',500,500); e.vy=-1000; r._inject(e); r.update(0.1,[]); assert.ok(Math.abs(e.y-500) < 1000*0.1*0.6); });
test('play round ends exactly once with summary', () => { const r=mk(); let n=0, sum=null; r.on('end',s=>{n++;sum=s;}); for(let t=0;t<62;t+=1/60) r.update(1/60,[]); assert.equal(n,1); assert.ok('vitamins' in sum && 'bestCombo' in sum); });
test('calm never ends', () => { const r=mk({mode:'calm'}); let n=0; r.on('end',()=>n++); for(let t=0;t<120;t+=1/60) r.update(1/60,[]); assert.equal(n,0); });
```
- [ ] Steps 2–4: fail → implement → pass. Step 5: commit `feat(core): round rules, bonuses, events`.

### Task 5: progress, content, quality, flashGuard, facts, validator

**Files:** Create `src/core/progress.js`, `src/core/content.js`, `src/core/quality.js`, `src/core/flashGuard.js`, `content/facts.uk.json`, `scripts/validate.mjs`, `ART_LICENSE.json` (empty list for now); Test `tests/progress.test.mjs`, `tests/misc.test.mjs`.

**Interfaces:**
- `STICKERS = { hands:[8 ids], kitchen:[8], blood:[8] }`, each id = art key (e.g. `'chykhunchyk'`, `'soap'`); sticker ids unique per location as `${loc}:${art}`.
- `createProgress(storage)`; `storage = {load():object|null, save(obj)}`; `memoryStorage()` and `localStorageAdapter(key)` (try/catch → falls back to memory).
- `progress.state = {rounds:{hands,kitchen,blood}, stickers:{[id]:count}, sinceRest, muted, seenFacts:{[loc]:id[]}, tutorialDone}`.
- `progress.isUnlocked(loc)`, `progress.completeRound(loc, rng) => {sticker:{id, art, isNew}, unlocked:string|null, rest:boolean}`, `progress.setMuted(b)`, `progress.markTutorialDone()`, `progress.reset()`, `progress.lastUnlocked()`.
- `pickFact(facts, loc, seenIds) => {fact, seenIds}` (cycle without repeats; reset when all shown).
- `pickQuality(avgFps) => 'high'|'mid'|'low'` (≥50 high, ≥35 mid, else low).
- `createFlashGuard(minMs=400, now=()=>performance.now()) => { tryFlash(): boolean }`.
- Facts: ≥ 8 per location, schema per spec §4.3, `status:"draft"`.
- `scripts/validate.mjs`: exits 1 on: duplicate fact id; text > 80 chars or > 12 words; missing source/status; location ≠ hands|kitchen|blood; any banned word (`бій, ворог, оборон, армі, вибух, бомб, вогонь, ніж, війн, атак, вбива`) in facts or in `src/ui/*.js` strings; any file in `ART_LICENSE.json` missing or `origin` ≠ `original`; any `art.js` export key absent from `ART_LICENSE.json`.

- [ ] Step 1: failing tests:
```js
import { createProgress, memoryStorage, STICKERS } from '../src/core/progress.js';
import { pickFact } from '../src/core/content.js'; import { pickQuality } from '../src/core/quality.js';
import { createFlashGuard } from '../src/core/flashGuard.js'; import { mulberry32 } from '../src/core/rng.js';
test('only hands unlocked at start; kitchen after 3 rounds', () => { const p=createProgress(memoryStorage()); assert.ok(p.isUnlocked('hands') && !p.isUnlocked('kitchen')); let u=null; for(let i=0;i<3;i++) u=p.completeRound('hands',mulberry32(i)).unlocked; assert.equal(u,'kitchen'); assert.ok(p.isUnlocked('kitchen')); });
test('stickers new until all collected', () => { const p=createProgress(memoryStorage()); const ids=new Set(); for(let i=0;i<8;i++){ const s=p.completeRound('hands',mulberry32(i)).sticker; assert.ok(s.isNew); ids.add(s.id);} assert.equal(ids.size,8); assert.equal(p.completeRound('hands',mulberry32(99)).sticker.isNew,false); });
test('rest every 3 rounds', () => { const p=createProgress(memoryStorage()); const r=[1,2,3,4,5,6].map(i=>p.completeRound('hands',mulberry32(i)).rest); assert.deepEqual(r,[false,false,true,false,false,true]); });
test('progress persists through storage', () => { const st=memoryStorage(); const p=createProgress(st); p.completeRound('hands',mulberry32(1)); p.setMuted(true); const q=createProgress(st); assert.equal(q.state.rounds.hands,1); assert.equal(q.state.muted,true); });
test('8 stickers per location', () => Object.values(STICKERS).forEach(l=>assert.equal(l.length,8)));
test('pickFact cycles without repeats', () => { const fs=[1,2,3].map(i=>({id:'f'+i,location:'hands'})); let seen=[]; const got=[]; for(let i=0;i<3;i++){ const r=pickFact(fs,'hands',seen); got.push(r.fact.id); seen=r.seenIds;} assert.equal(new Set(got).size,3); assert.ok(pickFact(fs,'hands',seen).fact); });
test('quality tiers', () => { assert.equal(pickQuality(58),'high'); assert.equal(pickQuality(40),'mid'); assert.equal(pickQuality(20),'low'); });
test('flashGuard enforces 400ms', () => { let t=0; const g=createFlashGuard(400,()=>t); assert.ok(g.tryFlash()); t=200; assert.ok(!g.tryFlash()); t=401; assert.ok(g.tryFlash()); });
```
- [ ] Steps 2–4: fail → implement → pass; write facts (24+, sourced: CDC handwashing, ВООЗ hand hygiene, МОЗ/ЦГЗ vaccination, NIH/MedlinePlus blood cells, USDA FoodData for vitamin C). `npm run validate` → PASS.
- [ ] Step 5: commit `feat(core): progress, facts registry, validators`.

### Task 6: art + stage + entity rendering

**Files:** Create `src/render/svg.js`, `src/render/art.js`, `src/render/stage.js`, `src/render/entity.js`, `src/render/background.js`; update `ART_LICENSE.json`, `src/main.js` (temporary sandbox that spawns a play round and renders entities, no input).

**Interfaces:**
- `svgToTexture(svgString, sizePx) => Promise<Texture>` (Image from Blob URL → canvas → `Texture.from(canvas)`), cached by key.
- `ART` map: `key => { body(): svg, eyes?(): svg, half?: {flesh:'#hex'} }` for 4 microbes, 5 fruits, 3 cells, 3 bonuses, plus `hand` (tutorial ghost), `star`, `jar`. Style «Glossy Candy» (spec §6.1): radial/linear gradient body, white glossy highlight ellipse top-left, rim-light stroke, outline darker hue, eyes with two highlights, blush.
- `loadArt(resolution) => Promise<Record<key,{body:Texture, eyes?:Texture}>>`.
- `createStage(rootEl) => { app, world, layers:{bg,entities,fx,hud}, width:1000, height, scale, onResize(fn) }` — `world.scale = screenW/1000`; DPR capped 2; `preference:'webgl'`.
- `createEntityView(e, tex) => { container, update(e, dt), destroy() }` — idle bob + random blink (eyes scaleY tween 0.1 for 90 ms every 2–5 s), spawn overshoot (scale 0.6→1.08→1 via gsap `back.out`), microbes wiggle, cells smile.
- `createBackground(stage, location) => { update(dt), destroy() }` — FillGradient vertical (hands: `#bff3ff→#ebfaf2`; kitchen: `#fff2c9→#ffe0ef`; blood: `#ffd6e7→#ffeef5`), drifting bokeh circles (alpha .15–.35), location props (hands: bubble clusters & tiles; kitchen: window with sun; blood: soft wave bands with floating discs).
- [ ] Steps: implement; preview; screenshot each location; verify art reads at 150 px; commit `feat(render): glossy candy art, stage, entities, backgrounds`.

### Task 7: FX — particles, trail, effects, post, synth, voice

**Files:** Create `src/fx/particles.js`, `src/fx/trail.js`, `src/fx/effects.js`, `src/fx/post.js`, `src/audio/synth.js`, `src/audio/voice.js`.

**Interfaces:**
- `createParticles(layer, {max}) => { emit(preset, x, y, opts?), update(dt), setMax(n) }`; `ParticleContainer` with `dynamicProperties:{position:true, rotation:true, vertex:true, color:true}`; pooled `Particle`s; procedurally drawn textures (soft dot, 4-point star, confetti rect, drop, ring). Presets: `sparkle`, `confetti`, `juice(color)`, `bubblePop`, `starRain`, `trailGlitter`.
- `createTrail(layer) => { push(x,y,t), clear(), update(dt), setCombo(n) }` — Graphics strip of last 18 points, width taper 26→2, hue shift per point, saturation/length grows with combo; dim grey-blue when segment inactive.
- `wireEffects({round, stage, views, particles, synth, flash, hud})` — subscribes to round events: capture → bubble sprite wraps microbe, microbe eyes widen, rises 220 u over .7 s with sway, then `bubblePop` + `confetti` + `pop()`; slice → two masked halves + flesh-coloured cut-face ellipse, fly apart with spin, `juice(flesh)` + glowing drop arcs to HUD jar (gsap bezier) + `note(combo)`; cellTouched → cell squash, «лоскотно!» bubble text, `giggle()`; combo → HUD popup + `flash.tryFlash()` soft white overlay alpha ≤ .18; bonus soap → wave sweep bottom→top (gradient band) + sparkle; vaccine → glowing dome (GlowFilter) pulse; patch → screen tint mint .12 + slow-motion sparkle drift.
- `applyPost(stage, quality)` — high: AdvancedBloom on fx+entities (threshold .55, bloomScale 1.1), Godray on bg; mid: bloom with `resolution:.5`; low: none. Particles max 2000/800/300.
- `createSynth() => { unlock(), setMuted(b), setVolume(v), note(i), pop(), giggle(), chime(), sparkle(), startAmbient(calm:boolean), stopAmbient() }` — pentatonic (C D E G A) xylophone: sine + 4× partial, attack 2 ms, decay .35 s; master gain .4; compressor; no sirens/no sub-bass pulses.
- `playVoice(id)` — fetch-free: `new Audio('voice/'+id+'.mp3')`, play; errors swallowed.
- [ ] Steps: implement; sandbox auto-play scripted swipes; inspect in preview; FPS overlay (dev only `?fps`); commit `feat(fx): particles, trail, capture/slice effects, bloom, synth`.

### Task 8: UI screens + game loop + modes

**Files:** Create `src/ui/screens.js`, `src/ui/styles.css`; rewrite `src/main.js`.

**Interfaces:**
- `createUI(root, {progress, facts, synth}) => { showTitle(), showHud(), updateHud({time, vitamins}), comboPopup(n), showReward({sticker, fact, unlocked}), showRest(), showAtlas(), showParents(), showPause(), showCalm(), hideAll(), on(name, fn) }`; UI events: `play(loc)`, `calm`, `atlas`, `parents`, `menu`, `again`, `resume`, `mute(b)`, `reset`.
- Main state machine: `title → round → reward → (rest) → title|round`; `title → calm → title`; atlas/parents overlays. Fixed-step accumulator loop on `app.ticker`; pointer events (pointerdown/move/up, `touch-action:none`) mapped to world coords; `visibilitychange` → pause; tutorial on first play; quality probe during first 2 s of first round.
- Copy (Ukrainian): title «Мильна Хвиля»; buttons «Грати», «Перед процедурою», «Атлас тіла», «Для батьків», «Ще раз», «До меню», «Продовжити»; rest «Чудова робота! Перепочинь 🙂»; calm prompt «Надуй кульку… і повільно здуй»; cell bubble «лоскотно!»; reward hint «Прочитайте дитині»; parents text per spec §5.6.
- Styles: Nunito (cyrillic, 700/900), buttons 64 px min height, colors per spec §6.1, safe-area insets, GSAP entrance (back.out), press squash.
- [ ] Steps: implement; play full loop in preview (mobile 390×844): title → play → reward → atlas → calm → parents → reset; verify unlock after 3 rounds and rest screen; commit `feat(ui): screens, modes, state machine`.

### Task 9: PWA, icons, CI, README, verification

**Files:** Create `public/icon-192.png`, `public/icon-512.png` (rendered from app SVG via `scripts/make-icons.mjs` using the browser preview canvas → or a committed SVG + `@vite-pwa/assets-generator`-free approach: draw with node `canvas`-free method: write SVG icon `public/icon.svg` and PNGs exported from preview page via `canvas.toDataURL`), `.github/workflows/pages.yml`, `README.md`.

- [ ] Steps: `npm run build`; check gzip sizes (< 600 KB initial); `npm run preview`; verify offline (service worker active, reload with network offline in DevTools); CPU-throttled FPS check at 390×844 (≥ 45 on Mid); `npm test` and `npm run validate` green; README (run, test, deploy, privacy, fact-review status); commit `chore: pwa, ci, readme`.

---

## Self-review notes
- Spec §3.1 bonuses/combos → Task 4 + 7; §3.2 calm → Tasks 3, 4, 8; §3.3 tutorial → Tasks 3, 8; §4 content → Task 5; §4.4 voice slot → Task 7; §5 screens → Task 8; §6 style/fx/sound → Tasks 6, 7; §7.4 quality → Tasks 5, 7, 8; §7.5 errors → Task 8; §7.6 budgets → Task 9; §8 tests → Tasks 2–5, 9. Playwright CI smoke deferred: verification done in the in-app browser preview (Task 9) — noted as deviation.
