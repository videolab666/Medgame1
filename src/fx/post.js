// Post-processing per quality tier: bloom on the FX layer, god rays on the
// background. Low tier runs without filters.
import { AdvancedBloomFilter, GodrayFilter } from 'pixi-filters';
import { QUALITY } from '../core/quality.js';

export function applyPost(stage, tier) {
  const q = QUALITY[tier];
  const { fx, bg } = stage.layers;
  fx.filters = null;
  bg.filters = null;
  let godray = null;

  if (q.bloom > 0) {
    const bloom = new AdvancedBloomFilter({ threshold: 0.6, bloomScale: 1.0, brightness: 1, blur: 6, quality: q.bloom >= 1 ? 4 : 3 });
    bloom.resolution = q.bloom * Math.min(2, window.devicePixelRatio || 1);
    fx.filters = [bloom];
  }
  if (q.godray) {
    godray = new GodrayFilter({ angle: 28, parallel: true, gain: 0.35, lacunarity: 2.6, alpha: 0.22, time: 0 });
    bg.filters = [godray];
  }
  return {
    tier,
    maxParticles: q.particles,
    update(dt) {
      if (godray) godray.time += dt * 0.25;
    },
  };
}
