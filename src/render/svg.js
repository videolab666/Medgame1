// SVG string -> Pixi texture via an offscreen canvas. Textures are cached.
import { Texture } from 'pixi.js';
import { ART, svgDataUrl } from './art.js';

const cache = new Map();

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function svgToTexture(key, svg, sizePx) {
  const id = `${key}@${sizePx}`;
  if (cache.has(id)) return cache.get(id);
  const img = await loadImage(svgDataUrl(svg));
  const canvas = document.createElement('canvas');
  canvas.width = sizePx;
  canvas.height = sizePx;
  canvas.getContext('2d').drawImage(img, 0, 0, sizePx, sizePx);
  const tex = Texture.from(canvas);
  cache.set(id, tex);
  return tex;
}

// Rasterise every art piece (body and, if present, eyes layer).
export async function loadArt(sizePx = 256) {
  const out = {};
  await Promise.all(
    Object.entries(ART).map(async ([key, a]) => {
      const body = await svgToTexture(`${key}.body`, a.body(), sizePx);
      const eyes = a.eyes ? await svgToTexture(`${key}.eyes`, a.eyes(), sizePx) : null;
      out[key] = { body, eyes, eyeY: a.eyeY ?? 100, flesh: a.flesh, juice: a.juice };
    }),
  );
  return out;
}
