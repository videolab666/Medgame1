// Procedural particle textures. All particle frames share one canvas atlas,
// because a ParticleContainer can only draw from a single base texture.
import { Rectangle, Texture } from 'pixi.js';

const CELL = 64;

function drawStar(ctx, cx, cy, outer, inner, points) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 ? inner : outer;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
  }
  ctx.closePath();
}

const PAINTERS = {
  dot(ctx, c) {
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CELL, CELL);
  },
  sparkle(ctx, c) {
    const g = ctx.createRadialGradient(c, c, 0, c, c, c * 0.5);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CELL, CELL);
    ctx.fillStyle = '#fff';
    drawStar(ctx, c, c, c * 0.95, c * 0.12, 4);
    ctx.fill();
  },
  star(ctx, c) {
    ctx.fillStyle = '#fff';
    drawStar(ctx, c, c, c * 0.9, c * 0.42, 5);
    ctx.fill();
  },
  confetti(ctx, c) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(c - 12, c - 20, 24, 40, 6);
    ctx.fill();
  },
  drop(ctx, c) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(c, c - 26);
    ctx.bezierCurveTo(c + 10, c - 10, c + 20, c, c + 20, c + 10);
    ctx.arc(c, c + 10, 20, 0, Math.PI);
    ctx.bezierCurveTo(c - 20, c, c - 10, c - 10, c, c - 26);
    ctx.fill();
  },
  ring(ctx, c) {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(c, c, c - 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(c - 10, c - 12, 8, 4, -0.7, 0, Math.PI * 2);
    ctx.fill();
  },
  heart(ctx, c) {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(c, c + 22);
    ctx.bezierCurveTo(c - 34, c, c - 22, c - 26, c, c - 12);
    ctx.bezierCurveTo(c + 22, c - 26, c + 34, c, c, c + 22);
    ctx.fill();
  },
};

let atlas = null;

export function particleFrames() {
  if (atlas) return atlas;
  const names = Object.keys(PAINTERS);
  const canvas = document.createElement('canvas');
  canvas.width = CELL * names.length;
  canvas.height = CELL;
  const ctx = canvas.getContext('2d');
  names.forEach((name, i) => {
    ctx.save();
    ctx.translate(i * CELL, 0);
    PAINTERS[name](ctx, CELL / 2);
    ctx.restore();
  });
  const base = Texture.from(canvas);
  atlas = { base };
  names.forEach((name, i) => {
    atlas[name] = new Texture({ source: base.source, frame: new Rectangle(i * CELL, 0, CELL, CELL) });
  });
  return atlas;
}

// Large soft glow used behind bonuses and the shield dome.
let halo = null;
export function haloTexture() {
  if (halo) return halo;
  const s = 256;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.9)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.45)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  halo = Texture.from(canvas);
  return halo;
}
