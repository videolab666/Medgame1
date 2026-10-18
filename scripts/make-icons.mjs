// Builds the app icon (public/icon.svg) from the game's own art and rasterises
// PNG sizes with a local headless Chrome. Run: node scripts/make-icons.mjs
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ART, fullSvg } from '../src/render/art.js';

const inner = (key) => fullSvg(key).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const icon =
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">` +
  `<defs><linearGradient id="bgi" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="#4fcdf5"/><stop offset="1" stop-color="#1f5063"/></linearGradient></defs>` +
  `<rect width="512" height="512" rx="112" fill="url(#bgi)"/>` +
  `<g transform="translate(56 64) scale(2)">${inner('bubble')}</g>` +
  `<g transform="translate(116 124) scale(1.4)">${inner('chykhunchyk')}</g>` +
  `</svg>`;
void ART;
await writeFile('public/icon.svg', icon);

const chrome = process.env.CHROME_BIN ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const dir = await mkdtemp(join(tmpdir(), 'mylna-icon-'));
for (const size of [192, 512]) {
  const html = join(dir, `i${size}.html`);
  await writeFile(html, `<html><body style="margin:0;background:transparent"><img src="${pathToFileURL(resolve('public/icon.svg')).href}" width="${size}" height="${size}"></body></html>`);
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
    `--window-size=${size},${size}`, `--screenshot=${resolve(`public/icon-${size}.png`)}`, pathToFileURL(html).href,
  ], { stdio: 'ignore' });
}
await rm(dir, { recursive: true, force: true });
console.log('icons written');
