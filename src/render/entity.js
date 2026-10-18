// Display object for one game entity: body + blinking eyes, squash & stretch
// idle motion, springy entrance.
import { Container, Sprite } from 'pixi.js';
import gsap from 'gsap';
import { haloTexture } from './textures.js';

const BONUS_TINT = { soap: 0xff9ad5, toothbrush: 0x8fe3f7, vaccine: 0x7df3e1, patch: 0xffd27a };

export function createEntityView(e, art, bubbleTex = null) {
  const container = new Container();
  const inner = new Container();
  container.addChild(inner);
  const size = 200 * (e.r / 75);

  if (e.kind === 'bonus') {
    const halo = new Sprite(haloTexture());
    halo.anchor.set(0.5);
    halo.width = halo.height = size * 1.5;
    halo.tint = BONUS_TINT[e.type] ?? 0xffffff;
    halo.alpha = 0.8;
    inner.addChild(halo);
    gsap.to(halo.scale, { x: halo.scale.x * 1.18, y: halo.scale.y * 1.18, duration: 0.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
  }

  const body = new Sprite(art.body);
  body.anchor.set(0.5);
  body.width = body.height = size;
  inner.addChild(body);

  let eyes = null;
  if (art.eyes) {
    eyes = new Sprite(art.eyes);
    eyes.anchor.set(0.5, art.eyeY / 200);
    eyes.width = eyes.height = size;
    eyes.y = ((art.eyeY - 100) / 200) * size;
    inner.addChild(eyes);
  }

  // Calm mode: microbes float up already inside a soap bubble.
  let bubble = null;
  if (e.float && bubbleTex) {
    bubble = new Sprite(bubbleTex);
    bubble.anchor.set(0.5);
    bubble.width = bubble.height = size * 1.25;
    container.addChild(bubble);
  }

  const faced = e.kind === 'microbe' || e.kind === 'cell';
  const eyesBaseY = eyes ? eyes.scale.y : 1;
  let blinkIn = 1.5 + Math.random() * 3;
  let blinkLeft = 0;
  let surprised = false;

  container.scale.set(0.6);
  gsap.to(container.scale, { x: 1, y: 1, duration: 0.45, ease: 'back.out(3)' });

  const view = {
    container,
    inner,
    body,
    eyes,
    hasBubble: !!bubble,
    update(ent, dt) {
      container.position.set(ent.x, ent.y);
      const t = ent.age * 6 + ent.phase;
      inner.scale.set(1 + Math.sin(t) * 0.04, 1 - Math.sin(t) * 0.04);
      inner.rotation = faced ? Math.sin(ent.age * 3 + ent.phase) * 0.22 : ent.rot;
      if (!eyes || surprised) return;
      blinkIn -= dt;
      if (blinkIn <= 0) {
        blinkLeft = 0.09;
        blinkIn = 2 + Math.random() * 3;
      }
      if (blinkLeft > 0) blinkLeft -= dt;
      eyes.scale.y = blinkLeft > 0 ? eyesBaseY * 0.1 : eyesBaseY;
    },
    // Eyes go wide (surprised) — used when a microbe is caught in a bubble.
    surprise() {
      if (eyes) gsap.to(eyes.scale, { x: eyes.scale.x * 1.25, y: eyesBaseY * 1.25, duration: 0.15, ease: 'back.out(4)' });
      surprised = true;
    },
    destroy() {
      gsap.killTweensOf(container.scale);
      inner.children.forEach((c) => gsap.killTweensOf(c.scale));
      container.destroy({ children: true });
    },
  };
  return view;
}
