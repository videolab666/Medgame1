// Dev-only test harness (loaded with ?harness in `npm run dev`). Drives the
// game loop manually so it can be exercised in hidden/background tabs, and
// plays scripted swipes. Never included in production builds.
export function installHarness(game) {
  const canvas = document.querySelector('#game canvas');
  const yieldNow = () => new Promise((r) => {
    const mc = new MessageChannel();
    mc.port1.onmessage = r;
    mc.port2.postMessage(0);
  });
  const ev = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
    clientX: x, clientY: y, pointerId: 1, bubbles: true, pointerType: 'touch',
  }));
  // The preview pane is often hidden; keep the game from auto-pausing.
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
  let simT = performance.now();
  game.stage.app.ticker.stop();
  game.gsap.ticker.lagSmoothing(0);

  window.__fast = async (sec, bot = false) => {
    let swipeAt = 0;
    let sw = null;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const frames = Math.round(sec * 60);
    for (let f = 0; f < frames; f++) {
      simT = Math.max(simT + 1000 / 60, performance.now());
      if (bot) {
        if (!sw && f >= swipeAt) {
          const dir = Math.random() < 0.5 ? 1 : -1;
          sw = { x: dir > 0 ? 10 : w - 10, y: h * (0.15 + Math.random() * 0.7), dir, i: 0 };
          ev('pointerdown', sw.x, sw.y);
        } else if (sw) {
          sw.i++;
          ev('pointermove', sw.x + sw.dir * sw.i * (w / 8.5), sw.y + Math.sin(sw.i) * 20);
          if (sw.i >= 8) {
            ev('pointerup', 0, 0);
            sw = null;
            swipeAt = f + 3;
          }
        }
      }
      game.stage.app.ticker.update(simT);
      game.gsap.ticker.tick();
      if (f % 60 === 0) await yieldNow();
    }
    const s = game.round?.state;
    return s
      ? { scene: game.scene, t: +s.time.toFixed(1), score: s.score, vit: s.vitamins, best: s.bestCombo }
      : { scene: game.scene };
  };
  window.__click = (sel) => document.querySelector(sel)?.click();

  // Errors seen since the last __playLoc report.
  window.__errs = [];
  addEventListener('error', (e) => window.__errs.push(e.message));
  addEventListener('unhandledrejection', (e) => window.__errs.push(String(e.reason)));

  // Plays one full round in a location with the bot and reports the outcome.
  window.__playLoc = async (loc) => {
    if (game.scene !== 'title') {
      window.__click('[data-act=menu]');
      await window.__fast(1);
    }
    await window.__fast(0.5);
    const card = document.querySelector(`.loc-card[data-arg=${loc}]`);
    if (card?.dataset.act !== 'play') return { loc, error: `locked: ${card?.textContent.trim()}` };
    card.click();
    // The very first playthrough shows the "what to slice" card first.
    await window.__fast(0.3);
    const intro = document.querySelector('[data-act=intro-go]');
    if (intro) {
      intro.click();
      await window.__fast(0.3);
    }
    const types = new Set();
    let bonuses = 0;
    game.round.on('bonus', () => bonuses++);
    for (let i = 0; i < 32; i++) {
      await window.__fast(2, true);
      game.round?.state.entities.forEach((e) => types.add(`${e.kind[0]}:${e.type}`));
    }
    await window.__fast(2);
    const text = (sel) => document.querySelector(sel)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      loc, bonuses, types: [...types].sort().join(' '), scene: game.scene,
      sticker: text('.sticker-name'), badge: text('.badge'), fact: text('.fact p'), unlock: text('.unlock'),
      stats: text('.stats'), errs: window.__errs.splice(0),
    };
  };
}
