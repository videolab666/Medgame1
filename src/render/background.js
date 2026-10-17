// Pastel location backdrops painted on a canvas, plus drifting bokeh sprites.
import { Container, Sprite, Texture } from 'pixi.js';
import { particleFrames } from './textures.js';

const THEMES = {
  hands: { top: '#4fcdf5', mid: '#8fe3f7', bottom: '#c9f7e6', edge: '13,110,160', bokeh: [0xffffff, 0xc9f3ff, 0xffd6f5] },
  kitchen: { top: '#ffc94d', mid: '#ffb27a', bottom: '#ff9fc8', edge: '190,70,40', bokeh: [0xffffff, 0xfff2b0, 0xffd1e6] },
  blood: { top: '#ff7aa8', mid: '#ff9cc0', bottom: '#ffd0e2', edge: '160,20,70', bokeh: [0xffffff, 0xffc2d6, 0xffe6a8] },
  calm: { top: '#7cc8ff', mid: '#a9d8ff', bottom: '#dcd2ff', edge: '40,70,160', bokeh: [0xffffff, 0xd9f0ff, 0xe8dcff] },
};

function paintProps(ctx, location, w, h) {
  ctx.save();
  if (location === 'hands') {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 3;
    const tile = w / 6;
    for (let y = h * 0.7; y < h; y += tile) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    for (let x = 0; x < w; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, h * 0.7);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    for (const [fx, fy, fr] of [[0.15, 0.2, 0.09], [0.85, 0.32, 0.12], [0.7, 0.12, 0.05], [0.25, 0.5, 0.06]]) {
      ctx.beginPath();
      ctx.arc(fx * w, fy * h, fr * w, 0, Math.PI * 2);
      ctx.stroke();
    }
  } else if (location === 'kitchen') {
    const x = w * 0.58;
    const y = h * 0.07;
    const ww = w * 0.34;
    const wh = h * 0.2;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.beginPath();
    ctx.roundRect(x, y, ww, wh, 18);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,210,63,0.9)';
    ctx.beginPath();
    ctx.arc(x + ww * 0.5, y + wh * 0.55, Math.min(ww, wh) * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(221,37,144,0.25)';
    ctx.lineWidth = 6;
    ctx.strokeRect(x, y, ww, wh);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(0, h * 0.78, w, 10);
  } else if (location === 'blood') {
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(255,255,255,${0.18 + i * 0.04})`;
      ctx.beginPath();
      const base = h * (0.25 + i * 0.16);
      ctx.moveTo(0, base);
      for (let x = 0; x <= w; x += 20) ctx.lineTo(x, base + Math.sin(x / w * Math.PI * 3 + i) * h * 0.025);
      ctx.lineTo(w, base + h * 0.06);
      ctx.lineTo(0, base + h * 0.06);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function createBackground(stage, location) {
  const theme = THEMES[location] ?? THEMES.hands;
  const root = new Container();
  stage.layers.bg.addChild(root);
  const paint = new Sprite();
  root.addChild(paint);

  function repaint() {
    const res = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.round(stage.app.screen.width * res);
    const h = Math.round(stage.app.screen.height * res);
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, theme.top);
    g.addColorStop(0.55, theme.mid);
    g.addColorStop(1, theme.bottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    paintProps(ctx, location, w, h);
    // Soft vignette gives depth so glossy characters pop.
    const v = ctx.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.35, w / 2, h * 0.45, Math.max(w, h) * 0.75);
    v.addColorStop(0, `rgba(${theme.edge},0)`);
    v.addColorStop(1, `rgba(${theme.edge},0.28)`);
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
    const old = paint.texture;
    paint.texture = Texture.from(canvas);
    if (old && old !== Texture.EMPTY) old.destroy(true);
    paint.width = stage.width;
    paint.height = stage.height;
  }

  const frames = particleFrames();
  const bokeh = Array.from({ length: 16 }, (_, i) => {
    const s = new Sprite(frames.dot);
    s.anchor.set(0.5);
    s.tint = theme.bokeh[i % theme.bokeh.length];
    s.alpha = 0.15 + Math.random() * 0.25;
    s.width = s.height = 60 + Math.random() * 180;
    s.x = Math.random() * stage.width;
    s.y = Math.random() * stage.height;
    s.vy = -(8 + Math.random() * 20);
    s.phase = Math.random() * 6;
    root.addChild(s);
    return s;
  });

  repaint();
  let time = 0;
  const off = stage.onResize(() => repaint());

  return {
    root,
    update(dt) {
      time += dt;
      for (const s of bokeh) {
        s.y += s.vy * dt;
        s.x += Math.sin(time * 0.4 + s.phase) * 6 * dt;
        if (s.y < -120) {
          s.y = stage.height + 120;
          s.x = Math.random() * stage.width;
        }
      }
    },
    destroy() {
      off();
      paint.texture.destroy(true);
      root.destroy({ children: true });
    },
  };
}
