// Rainbow soap ribbon that follows the finger: a tapered strip of quads with a
// white glossy core. Hue spread, width and length grow with the combo. Slow
// (inactive) moves draw a faint pale ribbon.
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
  let glitter = 0;

  return {
    // newStroke: first point of a fresh swipe — never joined to the previous one.
    push(x, y, active, newStroke = false) {
      pts.push({ x, y, t: time, active, brk: newStroke });
      if (pts.length > MAX_POINTS + combo) pts.shift();
      if (active && particles && glitter++ % 2 === 0) {
        particles.emit('trailGlitter', x, y, hsl(hue % 360, 0.9, 0.75));
      }
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
      const n = pts.length;
      if (n < 2) return;

      // Ribbon edges from per-point normals.
      const left = [];
      const right = [];
      for (let i = 0; i < n; i++) {
        const a = pts[Math.max(0, i - 1)];
        const b = pts[Math.min(n - 1, i + 1)];
        let nx = -(b.y - a.y);
        let ny = b.x - a.x;
        const len = Math.hypot(nx, ny) || 1;
        nx /= len;
        ny /= len;
        const k = i / (n - 1);
        const w = (3 + 24 * k + combo * 1.4 * k) / 2;
        left.push([pts[i].x + nx * w, pts[i].y + ny * w]);
        right.push([pts[i].x - nx * w, pts[i].y - ny * w]);
      }
      for (let i = 1; i < n; i++) {
        const p = pts[i];
        if (p.brk) continue;
        const k = i / (n - 1);
        const color = p.active ? hsl((hue + i * (8 + combo * 2)) % 360, 0.95, 0.68) : 0xc4dcec;
        const alpha = p.active ? 0.45 + 0.55 * k : 0.3 * k;
        g.poly([...left[i - 1], ...left[i], ...right[i], ...right[i - 1]]).fill({ color, alpha });
      }
      const head = pts[n - 1];
      if (head.active) {
        let start = n - 1;
        while (start > 0 && !pts[start].brk) start--;
        g.moveTo(pts[start].x, pts[start].y);
        for (let i = start + 1; i < n; i++) g.lineTo(pts[i].x, pts[i].y);
        g.stroke({ width: 5 + combo * 0.4, color: 0xffffff, alpha: 0.85, cap: 'round', join: 'round' });
        g.circle(head.x, head.y, 14 + combo).fill({ color: 0xffffff, alpha: 0.9 });
      }
    },
  };
}
