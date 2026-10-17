// Temporary art gallery for visual review (replaced by the game in Task 8).
import { ART, fullSvg, svgDataUrl } from './render/art.js';

const ui = document.getElementById('ui');
ui.style.cssText = 'display:grid;grid-template-columns:repeat(4,1fr);gap:8px;padding:12px;background:#ebfaf2;font:600 12px sans-serif;color:#1f5063';
for (const key of Object.keys(ART)) {
  const cell = document.createElement('div');
  cell.style.textAlign = 'center';
  cell.innerHTML = `<img src="${svgDataUrl(fullSvg(key))}" style="width:100%"><div>${ART[key].name}</div>`;
  ui.append(cell);
}
