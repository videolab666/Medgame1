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
}
