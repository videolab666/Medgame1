// Content and art checks run in CI: facts registry, banned words (spec R1/R4),
// and original-art license registry (spec R11).
import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const errors = [];
const { LOCATION_ORDER: LOCS } = await import(pathToFileURL('src/core/config.js').href);
// Whole words only: "ніж" is also the Ukrainian "than", so it is matched exactly
// and only in the "knife" sense via its other forms.
const BANNED_WORDS = new Set(['бій', 'бою', 'ножем', 'вогонь', 'війна', 'війни']);
const BANNED_PREFIXES = [
  'ворог', 'оборон', 'армі', 'вибух', 'бомб', 'вогн', 'ножа', 'ножі', 'війн', 'атак',
  'вбив', 'вбит', 'збро', 'стріл', 'сирен', 'солдат', 'ракет', 'боротьб', 'борот',
];

const words = (text) => text.toLowerCase().split(/[^a-zа-яіїєґ'’-]+/u).filter(Boolean);
function checkBanned(text, where) {
  for (const w of words(text)) {
    if (BANNED_WORDS.has(w) || BANNED_PREFIXES.some((p) => w.startsWith(p))) {
      errors.push(`${where}: banned word "${w}"`);
    }
  }
}

// Facts
const { facts } = JSON.parse(await readFile('content/facts.uk.json', 'utf8'));
const ids = new Set();
for (const f of facts) {
  const where = `fact ${f.id}`;
  if (!f.id || ids.has(f.id)) errors.push(`${where}: missing or duplicate id`);
  ids.add(f.id);
  if (!LOCS.includes(f.location)) errors.push(`${where}: bad location ${f.location}`);
  if (!f.source) errors.push(`${where}: missing source`);
  if (!['draft', 'reviewed'].includes(f.status)) errors.push(`${where}: bad status`);
  if (!f.text || f.text.length > 80) errors.push(`${where}: text longer than 80 chars`);
  const count = (f.text ?? '').split(/\s+/).filter((w) => /[\p{L}\d]/u.test(w)).length;
  if (count > 12) errors.push(`${where}: ${count} words (max 12)`);
  checkBanned(f.text ?? '', where);
}
for (const loc of LOCS) {
  const n = facts.filter((f) => f.location === loc).length;
  if (n < 8) errors.push(`location ${loc}: only ${n} facts (need 8)`);
}

// Ukrainian string literals in source (player-facing copy)
for (const dir of ['src/ui', 'src/core', 'src/fx', 'src/render', 'src']) {
  if (!existsSync(dir)) continue;
  for (const file of await readdir(dir)) {
    if (!file.endsWith('.js')) continue;
    const src = await readFile(`${dir}/${file}`, 'utf8');
    for (const m of src.matchAll(/(['"`])((?:\\.|(?!\1).)*?[а-яіїєґ](?:\\.|(?!\1).)*?)\1/giu)) {
      checkBanned(m[2], `${dir}/${file}`);
    }
  }
}

// Art license registry
const license = JSON.parse(await readFile('ART_LICENSE.json', 'utf8'));
const licensed = new Map(license.art.map((a) => [a.key, a]));
for (const a of license.art) {
  if (a.origin !== 'original') errors.push(`art ${a.key}: origin must be "original"`);
}
if (existsSync('src/render/art.js')) {
  const { ART } = await import(pathToFileURL('src/render/art.js').href);
  for (const key of Object.keys(ART)) {
    if (!licensed.has(key)) errors.push(`art ${key}: not listed in ART_LICENSE.json`);
  }
  const { STICKERS } = await import(pathToFileURL('src/core/progress.js').href);
  for (const list of Object.values(STICKERS)) {
    for (const s of list) if (!ART[s.art]) errors.push(`sticker ${s.id}: no art "${s.art}"`);
  }
}

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join('\n'));
  process.exit(1);
}
console.log(`✓ ${facts.length} facts, ${license.art.length} art entries — all checks passed`);
