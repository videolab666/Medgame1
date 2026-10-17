// Rainbow soap trail that follows the finger. Tapered strip of quads; the hue
// spread and length grow with the combo. Slow (inactive) moves draw a faint trail.
import { Graphics } from 'pixi.js';

const MAX_POINTS = 18;
const LIFE = 0.22;

function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
}

export function createTrail(layer, particles) {
  const g = new Graphics();
  layer.addChild(g);
  const pts = [];
  let combo = 0;
  let hue = 190;
  let time = 0;

  return {
    push(x, y, active) {
      pts.push({ x, y, t: time, active });
      if (pts.length > MAX_POINTS + combo) pts.shift();
      if (active && particles) particles.emit('trailGlitter', x, y, hsl(hue % 360, 0.9, 0.75));
    },
    setCombo(n) {
      combo = Math.min(10, n);
    },
    clear() {
      pts.length = 0;
      g.clear();
    },
    update(dt) {
      time += dt;
      hue += dt * 240;
      while (pts.length && time - pts[0].t > LIFE + combo * 0.01) pts.shift();
      g.clear();
      if (pts.length < 2) return;
      const n = pts.length;
      for (let i = 1; i < n; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const k = i / (n - 1);
        const width = 4 + 26 * k + combo * 1.2 * k;
        const color = b.active ? hsl((hue + i * (8 + combo * 2)) % 360, 0.95, 0.7) : 0xb7d3e6;
        const alpha = b.active ? 0.35 + 0.65 * k : 0.25 * k;
        g.moveTo(a.x, a.y).lineTo(b.x, b.y).stroke({ width, color, alpha, cap: 'round' });
      }
      const head = pts[n - 1];
      if (head.active) g.circle(head.x, head.y, 16 + combo).fill({ color: 0xffffff, alpha: 0.85 });
    },
  };
}
