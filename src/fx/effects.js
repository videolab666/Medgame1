// Turns round events into juice: bubbles that carry microbes away, fruit
// halves with juice, giggling cells, bonus waves and domes. Soft and festive —
// no explosions, no shake (spec R1); full-screen flashes go through flashGuard.
import { Container, FillGradient, Graphics, Sprite, Text } from 'pixi.js';
import gsap from 'gsap';
import { haloTexture } from '../render/textures.js';
import { CONFIG, gravityFor } from '../core/config.js';

const GIGGLES = ['лоскотно!', 'хі-хі!', 'ой, свої!', 'я свій!'];

export function createEffects({ stage, art, particles, synth, flash, hud, haptic = () => {} }) {
  // Own container: clearing it never touches particles or the finger trail.
  const fx = new Container();
  stage.layers.fx.addChild(fx);
  const flying = []; // fruit halves with manual physics
  let dome = null;
  let tint = null;
  const labels = []; // giggle texts on screen, capped so they never pile up
  // Every tween/timer started here, so a round can be torn down mid-animation.
  let active = [];
  const timers = new Set();
  const T = (tween) => {
    active.push(tween);
    return tween;
  };

  function popAt(x, y) {
    particles.emit('bubblePop', x, y);
    particles.emit('confetti', x, y, { count: 14 });
    synth.pop();
  }

  function capture(e, info, view) {
    view.surprise();
    const c = view.container;
    fx.addChild(c);
    if (!view.hasBubble) {
      const bubble = new Sprite(art.bubble.body);
      bubble.anchor.set(0.5);
      const full = 250 / bubble.texture.width;
      bubble.scale.set(0.01);
      c.addChild(bubble);
      T(gsap.to(bubble.scale, { x: full, y: full, duration: 0.25, ease: 'back.out(3)' }));
    }
    particles.emit('sparkle', e.x, e.y, { count: 8 });
    if (info.byBonus) synth.sparkle();
    else {
      synth.note(info.combo);
      haptic(6);
    }
    const tl = T(gsap.timeline({
      onComplete: () => {
        popAt(c.x, c.y);
        view.destroy();
      },
    }));
    tl.to(c, { y: c.y - 260, duration: 0.85, ease: 'sine.out' }, 0);
    tl.to(c, { x: c.x + (Math.random() < 0.5 ? -40 : 40), duration: 0.42, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0);
    tl.to(c.scale, { x: 0.85, y: 0.85, duration: 0.85 }, 0);
  }

  function slice(e, info, view) {
    const a = art[e.type];
    const size = 200 * (e.r / 75);
    const baseRot = view.inner.rotation;
    view.destroy();
    for (const side of [-1, 1]) {
      const half = new Container();
      half.position.set(e.x, e.y);
      half.rotation = info.angle;
      const skin = new Sprite(a.body);
      skin.anchor.set(0.5);
      skin.width = skin.height = size;
      skin.rotation = baseRot - info.angle;
      const mask = new Graphics()
        .rect(-size, side < 0 ? -size : 0, size * 2, size)
        .fill(0xffffff);
      skin.mask = mask;
      const face = new Graphics()
        .ellipse(0, 0, size * 0.36, 9)
        .fill({ color: a.flesh ?? '#fff4d6' })
        .ellipse(0, 0, size * 0.36, 9)
        .stroke({ width: 3, color: 0xffffff, alpha: 0.7 });
      half.addChild(skin, mask, face);
      fx.addChild(half);
      const n = { x: -Math.sin(info.angle) * side, y: Math.cos(info.angle) * side };
      flying.push({
        node: half, vx: e.vx * 0.4 + n.x * 280, vy: Math.min(e.vy, 0) * 0.3 + n.y * 280 - 200,
        spin: side * (2 + Math.random() * 2), age: 0,
      });
    }
    particles.emit('juice', e.x, e.y, { color: a.juice ?? 0xffa62b, angle: info.angle });
    particles.emit('sparkle', e.x, e.y, { count: 6 });
    synth.slice();
    synth.note(info.combo);
    haptic(8);
    vitaminDrop(e.x, e.y, a.juice ?? 0xffa62b);
  }

  function vitaminDrop(x, y, color) {
    const drop = new Sprite(haloTexture());
    drop.anchor.set(0.5);
    drop.width = drop.height = 70;
    drop.tint = color;
    drop.position.set(x, y);
    fx.addChild(drop);
    const jar = hud.jarWorldPos();
    T(gsap.to(drop, { x: jar.x, duration: 0.7, ease: 'power1.inOut' }));
    T(gsap.to(drop, {
      y: jar.y,
      duration: 0.7,
      ease: 'back.in(1.6)',
      onComplete: () => {
        particles.emit('sparkle', jar.x, jar.y, { count: 6, color });
        synth.drop();
        hud.bumpJar();
        drop.destroy();
      },
    }));
  }

  function cellTouched(e, view) {
    T(gsap.fromTo(view.inner.scale, { x: 1.25, y: 0.8 }, { x: 1, y: 1, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' }));
    particles.emit('hearts', e.x, e.y - 40);
    synth.giggle();
    const label = new Text({
      text: GIGGLES[Math.floor(Math.random() * GIGGLES.length)],
      style: {
        fontFamily: 'Nunito, sans-serif', fontWeight: '900', fontSize: 52, fill: 0xffffff,
        stroke: { color: 0xdd2590, width: 10, join: 'round' },
      },
    });
    label.anchor.set(0.5);
    label.position.set(e.x, e.y - 110);
    labels.push(label);
    while (labels.length > 2) {
      const old = labels.shift();
      gsap.killTweensOf(old);
      gsap.killTweensOf(old.scale);
      old.destroy();
    }
    label.scale.set(0.5);
    fx.addChild(label);
    T(gsap.to(label.scale, { x: 1, y: 1, duration: 0.35, ease: 'back.out(3)' }));
    T(gsap.to(label, { y: label.y - 90, alpha: 0, duration: 1.1, delay: 0.4, ease: 'sine.in', onComplete: () => {
      labels.splice(labels.indexOf(label), 1);
      label.destroy();
    } }));
  }

  function softFlash(alpha = 0.18) {
    if (!flash.tryFlash()) return;
    const g = new Graphics().rect(0, 0, stage.width, stage.height).fill(0xffffff);
    g.alpha = alpha;
    // HUD layer has no bloom, so the flash stays a gentle tint.
    stage.layers.hud.addChild(g);
    T(gsap.to(g, { alpha: 0, duration: 0.45, ease: 'sine.out', onComplete: () => g.destroy() }));
  }

  function soapWave() {
    const h = 360;
    const grad = new FillGradient({
      type: 'linear', start: { x: 0, y: 0 }, end: { x: 0, y: 1 },
      colorStops: [
        { offset: 0, color: 'rgba(120,220,255,0)' },
        { offset: 0.4, color: 'rgba(120,220,255,0.35)' },
        { offset: 0.55, color: 'rgba(255,170,230,0.4)' },
        { offset: 1, color: 'rgba(120,220,255,0)' },
      ],
      textureSpace: 'local',
    });
    const wave = new Graphics().rect(0, 0, stage.width, h).fill(grad);
    wave.y = stage.height;
    fx.addChild(wave);
    const bubbles = setInterval(() => {
      for (let i = 0; i < 4; i++) particles.emit('bubblePop', Math.random() * stage.width, wave.y + h / 2, { count: 4 });
    }, 90);
    timers.add(bubbles);
    T(gsap.to(wave, {
      y: -h,
      duration: 1.0,
      ease: 'sine.inOut',
      onComplete: () => {
        clearInterval(bubbles);
        timers.delete(bubbles);
        wave.destroy();
      },
    }));
    synth.wave();
  }

  function showDome(center) {
    hideDome();
    dome = new Container();
    dome.position.set(center.x, center.y);
    const glow = new Sprite(haloTexture());
    glow.anchor.set(0.5);
    glow.tint = 0x7df3e1;
    glow.width = glow.height = (CONFIG.SHIELD_R + 75) * 2.4;
    const ring = new Graphics().circle(0, 0, CONFIG.SHIELD_R).stroke({ width: 10, color: 0xffffff, alpha: 0.9 })
      .circle(0, 0, CONFIG.SHIELD_R - 14).stroke({ width: 4, color: 0x7df3e1, alpha: 0.9 });
    dome.addChild(glow, ring);
    dome.scale.set(0.2);
    fx.addChild(dome);
    T(gsap.to(dome.scale, { x: 1, y: 1, duration: 0.5, ease: 'back.out(2.5)' }));
    T(gsap.to(glow, { alpha: 0.6, duration: 0.7, yoyo: true, repeat: -1, ease: 'sine.inOut' }));
    synth.shield();
  }

  function hideDome() {
    if (!dome) return;
    const d = dome;
    dome = null;
    gsap.killTweensOf(d.children[0]);
    T(gsap.to(d, { alpha: 0, duration: 0.4, onComplete: () => d.destroy({ children: true }) }));
  }

  function showSlowTint() {
    hideSlowTint();
    tint = new Graphics().rect(0, 0, stage.width, stage.height).fill(0xbff7e4);
    tint.alpha = 0;
    stage.layers.bg.addChild(tint);
    T(gsap.to(tint, { alpha: 0.35, duration: 0.5 }));
    synth.slow();
  }

  function hideSlowTint() {
    if (!tint) return;
    const t = tint;
    tint = null;
    T(gsap.to(t, { alpha: 0, duration: 0.5, onComplete: () => t.destroy() }));
  }

  return {
    // views: Map(entityId -> view); effects take ownership of captured/sliced views.
    attach(round, views) {
      const take = (e) => {
        const v = views.get(e.id);
        views.delete(e.id);
        return v;
      };
      round.on('capture', (e, info) => {
        const v = take(e);
        if (v) capture(e, info, v);
      });
      round.on('slice', (e, info) => {
        const v = take(e);
        if (v) slice(e, info, v);
      });
      round.on('cellTouched', (e) => {
        const v = views.get(e.id);
        if (v) cellTouched(e, v);
      });
      round.on('combo', (n) => {
        hud.comboPopup(n);
        haptic([10, 40, 10]);
        particles.emit('sparkle', stage.width / 2, stage.height * 0.4, { count: 10 + n * 2, spread: 400 });
        synth.combo();
        softFlash(0.12 + Math.min(n, 10) * 0.006);
      });
      round.on('bonus', (type, e, effect) => {
        const v = take(e);
        if (v) {
          particles.emit('sparkle', e.x, e.y, { count: 18 });
          T(gsap.to(v.container.scale, { x: 1.6, y: 1.6, duration: 0.25 }));
          T(gsap.to(v.container, { alpha: 0, duration: 0.25, onComplete: () => v.destroy() }));
        }
        if (effect === 'wave') soapWave();
        if (effect === 'shield') showDome(round.shieldCenter);
        if (effect === 'slow') showSlowTint();
        hud.bonusBadge(type);
      });
      round.on('bonusEnd', (type) => {
        if (type === 'shield') hideDome();
        if (type === 'slow') hideSlowTint();
      });
      round.on('end', () => {
        particles.emit('starRain', stage.width);
        synth.sparkle();
      });
    },
    update(dt) {
      if (active.length > 200) active = active.filter((t) => t.isActive() || t.progress() < 1);
      for (let i = flying.length - 1; i >= 0; i--) {
        const f = flying[i];
        f.age += dt;
        f.vy += gravityFor(stage.height) * 0.8 * dt;
        f.node.x += f.vx * dt;
        f.node.y += f.vy * dt;
        f.node.rotation += f.spin * dt;
        if (f.age > 0.9) f.node.alpha = Math.max(0, 1 - (f.age - 0.9) / 0.5);
        if (f.age > 1.4 || f.node.y > stage.height + 300) {
          f.node.destroy({ children: true });
          flying.splice(i, 1);
        }
      }
    },
    clear() {
      for (const t of active) t.kill();
      active = [];
      for (const id of timers) clearInterval(id);
      timers.clear();
      labels.length = 0;
      for (const f of flying) f.node.destroy({ children: true });
      flying.length = 0;
      dome = null;
      if (tint) tint.destroy();
      tint = null;
      fx.removeChildren().forEach((c) => c.destroy({ children: true }));
    },
  };
}
