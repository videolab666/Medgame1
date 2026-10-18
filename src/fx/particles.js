// Pooled particle system on a ParticleContainer. Presets are soft and festive:
// sparkles, confetti, juice, bubble pops, star rain. Nothing explodes.
import { Particle, ParticleContainer } from 'pixi.js';
import { particleFrames } from '../render/textures.js';

const RAINBOW = [0xff5c9a, 0xffa62b, 0xffe27a, 0x7ed957, 0x4fb3ff, 0xa77bf3];
const rand = (a, b) => a + Math.random() * (b - a);
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];

export function createParticles(layer, { max = 2000 } = {}) {
  const frames = particleFrames();
  const pc = new ParticleContainer({
    texture: frames.base,
    dynamicProperties: { position: true, rotation: true, vertex: true, color: true },
  });
  layer.addChild(pc);
  const live = [];
  const pool = [];
  let limit = max;

  function spawn(o) {
    if (live.length >= limit) return;
    const p = pool.pop() ?? new Particle({ texture: o.frame });
    p.texture = o.frame;
    p.anchorX = 0.5;
    p.anchorY = 0.5;
    p.x = o.x;
    p.y = o.y;
    p.rotation = o.rot ?? 0;
    p.tint = o.color ?? 0xffffff;
    p.alpha = 1;
    p.d = {
      vx: o.vx ?? 0, vy: o.vy ?? 0, g: o.g ?? 0, drag: o.drag ?? 0.98, spin: o.spin ?? 0,
      life: o.life, age: 0, size: o.size, grow: o.grow ?? 0, twinkle: o.twinkle ?? 0, fadeIn: o.fadeIn ?? 0,
    };
    const s = o.size / 64;
    p.scaleX = s;
    p.scaleY = s;
    pc.addParticle(p);
    live.push(p);
  }

  const presets = {
    sparkle(x, y, { count = 10, color, spread = 60 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = rand(0, Math.PI * 2);
        const sp = rand(40, 260);
        spawn({
          frame: frames.sparkle, x: x + rand(-spread, spread) * 0.3, y: y + rand(-spread, spread) * 0.3,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, drag: 0.94, life: rand(0.5, 1.1),
          size: rand(22, 48), color: color ?? pickOf([0xffffff, 0xfff2b0, 0xffd6f5, 0xc9f3ff]), twinkle: rand(10, 18),
          spin: rand(-3, 3),
        });
      }
    },
    confetti(x, y, { count = 18 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = rand(-Math.PI, 0);
        const sp = rand(200, 520);
        spawn({
          frame: pickOf([frames.confetti, frames.star, frames.heart]), x, y,
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, g: 700, drag: 0.97, life: rand(0.9, 1.5),
          size: rand(16, 30), color: pickOf(RAINBOW), spin: rand(-9, 9), rot: rand(0, 6),
        });
      }
    },
    juice(x, y, { color = 0xffa62b, count = 16, angle = 0 } = {}) {
      for (let i = 0; i < count; i++) {
        const side = i % 2 ? 1 : -1;
        const a = angle + side * Math.PI / 2 + rand(-0.7, 0.7);
        const sp = rand(180, 520);
        spawn({
          frame: frames.drop, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120, g: 1300, drag: 0.985,
          life: rand(0.5, 0.9), size: rand(14, 30), color, rot: a + Math.PI / 2,
        });
      }
      for (let i = 0; i < 6; i++) {
        spawn({
          frame: frames.dot, x, y, vx: rand(-80, 80), vy: rand(-80, 80), drag: 0.9, life: 0.45,
          size: rand(60, 110), color, grow: 1.5,
        });
      }
    },
    bubblePop(x, y, { count = 12 } = {}) {
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        spawn({
          frame: frames.ring, x: x + Math.cos(a) * 40, y: y + Math.sin(a) * 40,
          vx: Math.cos(a) * rand(120, 280), vy: Math.sin(a) * rand(120, 280), drag: 0.93,
          life: rand(0.5, 0.8), size: rand(14, 30), color: pickOf([0xffffff, 0xc9f3ff, 0xffd6f5]),
        });
      }
      spawn({ frame: frames.ring, x, y, life: 0.35, size: 150, grow: 1.6, color: 0xffffff });
    },
    starRain(width, { count = 50 } = {}) {
      for (let i = 0; i < count; i++) {
        spawn({
          frame: pickOf([frames.star, frames.sparkle, frames.heart]), x: rand(0, width), y: rand(-200, -20),
          vx: rand(-40, 40), vy: rand(160, 380), drag: 1, life: rand(2.5, 4), size: rand(20, 44),
          color: pickOf(RAINBOW), spin: rand(-4, 4), twinkle: rand(4, 9), fadeIn: 0.2,
        });
      }
    },
    // A trail bit of a given shape (stars, hearts, rings, confetti…).
    trailBit(x, y, { frame = 'sparkle', color = 0xffffff } = {}) {
      spawn({
        frame: frames[frame] ?? frames.sparkle, x: x + rand(-14, 14), y: y + rand(-14, 14),
        vx: rand(-40, 40), vy: rand(-30, 50), g: frame === 'confetti' ? 300 : 0, drag: 0.93,
        life: rand(0.35, 0.7), size: rand(16, 32), color, twinkle: frame === 'sparkle' ? 14 : 0,
        spin: frame === 'confetti' || frame === 'star' ? rand(-6, 6) : 0, rot: rand(0, 6),
      });
    },
    trailGlitter(x, y, color) {
      spawn({
        frame: frames.sparkle, x: x + rand(-14, 14), y: y + rand(-14, 14), vx: rand(-30, 30), vy: rand(-30, 30),
        drag: 0.92, life: rand(0.3, 0.6), size: rand(14, 30), color, twinkle: 14,
      });
    },
    hearts(x, y, { count = 6 } = {}) {
      for (let i = 0; i < count; i++) {
        spawn({
          frame: frames.heart, x: x + rand(-40, 40), y, vx: rand(-40, 40), vy: rand(-220, -120), drag: 0.97,
          life: rand(0.8, 1.2), size: rand(20, 34), color: pickOf([0xff5c9a, 0xff8fb8, 0xffc2d6]),
        });
      }
    },
  };

  return {
    container: pc,
    emit(name, ...args) {
      presets[name](...args);
    },
    setMax(n) {
      limit = n;
    },
    update(dt) {
      for (let i = live.length - 1; i >= 0; i--) {
        const p = live[i];
        const d = p.d;
        d.age += dt;
        if (d.age >= d.life) {
          live[i] = live[live.length - 1];
          live.pop();
          pc.removeParticle(p);
          pool.push(p);
          continue;
        }
        d.vy += d.g * dt;
        d.vx *= d.drag;
        d.vy *= d.drag;
        p.x += d.vx * dt;
        p.y += d.vy * dt;
        p.rotation += d.spin * dt;
        const k = d.age / d.life;
        const s = (d.size / 64) * (1 + d.grow * k);
        p.scaleX = s;
        p.scaleY = s;
        let a = 1 - k * k;
        if (d.fadeIn) a *= Math.min(1, d.age / d.fadeIn);
        // Soft twinkle (well under 3 Hz brightness swing at screen scale).
        if (d.twinkle) a *= 0.7 + 0.3 * Math.sin(d.age * d.twinkle);
        p.alpha = a;
      }
    },
    clear() {
      for (const p of live) {
        pc.removeParticle(p);
        pool.push(p);
      }
      live.length = 0;
    },
  };
}
