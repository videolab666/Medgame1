// Generates docs/waves.md — exact pauses and object counts for every stage.
// Run: npm run waves
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CONFIG, LOCATION_INFO, LOCATIONS, LOCATION_ORDER, roundSeconds, typesFor,
} from '../src/core/config.js';
import { mulberry32 } from '../src/core/rng.js';
import { createSpawner, FIRST_WAVE_AT } from '../src/core/spawner.js';
import { stepEntity, isOffscreen } from '../src/core/physics.js';
import { gravityFor } from '../src/core/config.js';
import { SAFE_SLOTS, WAVE_PLAN } from '../src/core/waves.js';
import { ART } from '../src/render/art.js';

const OUT = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'docs', 'waves.md');
const SEEDS = 300;

const f = (x) => {
  const s = Number(x).toFixed(2);
  return s.replace(/\.?0+$/, '') || '0';
};
const rngTxt = (lo, hi) => (lo === hi ? f(lo) : `${f(lo)}–${f(hi)}`);
const secs = (lo, hi) => (lo === 0 && hi === 0 ? '—' : `${rngTxt(lo, hi)} с`);

const optionsOf = (entry) => (entry.options ?? [{ weight: null, wave: entry }]);
const countRange = (w) => [
  w.groups.reduce((s, g) => s + g.n[0], 0),
  w.groups.reduce((s, g) => s + g.n[1], 0),
];
const spanRange = (w) => {
  let lo = 0;
  let hi = 0;
  for (const g of w.groups) {
    lo = Math.max(lo, (g.n[0] - 1) * g.gap);
    hi = Math.max(hi, (g.n[1] - 1) * g.gap);
  }
  return [lo, hi];
};
const totalRange = (w) => {
  const [lo, hi] = spanRange(w);
  return [w.start + lo + w.end, w.start + hi + w.end];
};
const marksOf = (seq) => [...seq]
  .map((c, i) => (c === 'c' ? `${i + 1}` : ''))
  .filter(Boolean)
  .join(' и ');

const phrase = (g) => {
  const n = rngTxt(g.n[0], g.n[1]);
  const how = g.gap ? `через ${f(g.gap)} с` : 'вместе';
  if (g.kind === 'cell') return `${n} «своих» ${how}`;
  if (g.seq) return `${n} по шаблону ${how}, «свой» — ${marksOf(g.seq)}-м`;
  return `${n} ${how}`;
};
const brief = (w) => w.groups.map(phrase).join(' + ');

// Consecutive stages that use the same slot entry.
const groups = [];
let stageNo = 0;
for (const entry of WAVE_PLAN) {
  stageNo++;
  const last = groups[groups.length - 1];
  if (last && last.entry === entry) last.count++;
  else groups.push({ entry, from: stageNo, count: 1 });
}
groups.forEach((g) => { g.to = g.from + g.count - 1; });
const lastGroup = groups[groups.length - 1];
const label = (g) => (g === lastGroup ? '23 и дальше'
  : g.from === g.to ? `${g.from}` : `${g.from}–${g.to} (×${g.count})`);

// Drives a spawner frame by frame with flight physics. A stage ends only when
// everything it threw is gone, so timings need the flight; nobody slices here,
// which is the slowest possible pace (slicing makes the next stage come sooner).
const SIM_H = 2000;
function drive(sp, duration) {
  const out = [];
  const flying = [];
  const g = gravityFor(SIM_H);
  for (let i = 0; i * CONFIG.STEP < duration; i++) {
    const t = i * CONFIG.STEP;
    for (const fl of flying) {
      if (!fl.e.alive) continue;
      stepEntity(fl.s, CONFIG.STEP, fl.e.gravity ?? g);
      if (isOffscreen(fl.s, SIM_H, 1000)) fl.e.alive = false;
    }
    for (const e of sp.update(t, CONFIG.STEP, flying.filter((x) => x.e.alive).length)) {
      out.push(e);
      flying.push({ e, s: { ...e } });
    }
  }
  return out;
}
// Throws grouped into series: inside a series throws are at most 0.7 s apart;
// between series there is the flight plus a lead-in of 0.8 s or more.
const seriesFirsts = (es) => {
  const firsts = [];
  let last = -Infinity;
  for (const e of es) {
    if (e.born - last >= 0.75) firsts.push(e.born);
    last = e.born;
  }
  return firsts;
};
const leadOf = (entry) => optionsOf(entry)[0].wave.start;

// Earliest / latest start of every stage over many simulated runs.
const windows = WAVE_PLAN.map(() => ({ begin: [Infinity, -Infinity], first: [Infinity, -Infinity] }));
for (let seed = 1; seed <= 120; seed++) {
  const sp = createSpawner({
    rng: mulberry32(seed), width: 1000, height: SIM_H, location: 'hands', mode: 'play', duration: 400,
  });
  seriesFirsts(drive(sp, 400)).slice(0, WAVE_PLAN.length).forEach((t, k) => {
    const w = windows[k];
    const b = t - leadOf(WAVE_PLAN[k]);
    w.first = [Math.min(w.first[0], t), Math.max(w.first[1], t)];
    w.begin = [Math.min(w.begin[0], b), Math.max(w.begin[1], b)];
  });
}
const fits = ([loW, hiW], d) => {
  const gate = d - 1.5;
  if (hiW < gate) return 'точно';
  return loW < gate ? 'может' : '—';
};

// Round totals over seeds: objects and started series per round length.
function simulate(seed, duration) {
  const sp = createSpawner({
    rng: mulberry32(seed), width: 1000, height: 2000, location: 'hands', mode: 'play', duration,
  });
  return drive(sp, duration);
}
// A new series starts when the gap from the previous throw is at least 0.75 s
// (inside a series throws are at most 0.7 s apart; the lead-in is 0.8 s or more).
const seriesCount = (es) => {
  let n = 0;
  let last = -Infinity;
  for (const e of es) {
    if (e.born - last >= 0.75) n++;
    last = e.born;
  }
  return n;
};
const stats = [40, 45, 50, 55, 60].map((duration) => {
  const objs = [];
  const st = [];
  for (let s = 1; s <= SEEDS; s++) {
    const es = simulate(s, duration);
    objs.push(es.length);
    st.push(seriesCount(es));
  }
  return {
    duration,
    objs: [Math.min(...objs), Math.max(...objs), objs.reduce((a, b) => a + b, 0) / objs.length],
    stages: [Math.min(...st), Math.max(...st)],
  };
});

// The trip across rounds: every round continues the run of the previous one,
// so a fresh spawner starts from the saved slot (see the `run` argument of
// createSpawner).
function tripStarts(seed) {
  const run = { slot: 0, speeds: {}, weights: {} };
  const starts = [];
  for (let r = 0; r < 12; r++) {
    starts.push(run.slot);
    if (run.slot >= WAVE_PLAN.length - 1) break;
    const duration = roundSeconds(r);
    const sp = createSpawner({
      rng: mulberry32(seed * 7919 + r), width: 1000, height: 2000, location: 'hands', mode: 'play', duration, run,
    });
    drive(sp, duration);
  }
  return starts;
}
const trips = [];
for (let s = 1; s <= SEEDS; s++) trips.push(tripStarts(s));
const TRIP_ROUNDS = 6;
const reachRounds = trips.map((t) => t.findIndex((v) => v >= WAVE_PLAN.length - 1));
const reached = reachRounds.filter((r) => r !== -1);
const reach = reached.length
  ? [Math.min(...reached) + 1, Math.max(...reached) + 1]
  : null;

// Values shared across the plan, for the summary section.
const allWaves = WAVE_PLAN.flatMap((e) => optionsOf(e).map((o) => o.wave));
const gaps = [...new Set(allWaves.flatMap((w) => w.groups.map((g) => g.gap)))]
  .filter((g) => g > 0).sort((a, b) => b - a).map(f).join(' / ');
const regrow = WAVE_PLAN.find((e) => e.regrow)?.regrow ?? 0;
const maxSpan = Math.max(...allWaves.flatMap((w) => spanRange(w)[1]));
const ramp = [0, 1, 2, 3, 4, 5].map((k) => roundSeconds(k)).join(', ');

// Pause values straight from the plan, grouped into ranges for the prose.
const entryStart = (e) => Math.min(...optionsOf(e).map((o) => o.wave.start));
const entryEnd = (e) => Math.min(...optionsOf(e).map((o) => o.wave.end));
const valueRanges = (vals) => {
  const out = [];
  let i = 0;
  while (i < vals.length) {
    let j = i;
    while (j + 1 < vals.length && vals[j + 1] === vals[i]) j++;
    out.push([i + 1, j + 1, vals[i]]);
    i = j + 1;
  }
  return out;
};
const stageRange = ([from, to]) => (from === to ? `стадия ${from}`
  : to === WAVE_PLAN.length ? `стадии ${from} и дальше` : `стадии ${from}–${to}`);
const leadIn = valueRanges(WAVE_PLAN.map(entryStart))
  .map((r) => `${stageRange(r)} — ${f(r[2])} с`).join(', ');
const endVals = [...new Set(WAVE_PLAN.map(entryEnd))];
const noEnd = endVals.every((v) => v === 0);
const endShort = noEnd ? 'нет паузы (0 с — как в живой партии)'
  : `${endVals.map(f).join(' / ')} с`;
const boundaryText = valueRanges(
  WAVE_PLAN.slice(0, -1).map((e, i) => entryEnd(e) + entryStart(WAVE_PLAN[i + 1])),
).map(([from, to, v]) => {
  const label = from === to ? `${from}→${from + 1}`
    : to === WAVE_PLAN.length - 1 ? `${from}→${from + 1} и дальше`
      : `${from}→${from + 1} … ${to}→${to + 1}`;
  return `${f(v)} с (${label})`;
}).join(', ');

const lines = [];
const p = (s = '') => lines.push(s);

p('# Мильна Хвиля: стадии, паузы и количество объектов');
p('');
p('> Сгенерировано из `src/core/waves.js` — не редактировать вручную.');
p('> Обновить после правок плана: `npm run waves` (или `node scripts/waves-table.mjs`).');
p('');
p('Точный разбор всего, что вылетает в игре: стадии по порядку, паузы до сотых секунды,');
p('количество объектов на каждой стадии, сколько всего вылетает за раунд, какие виды');
p('объектов даёт каждая локация — и как один длинный забег продолжается от раунда к раунду.');
p('');

p('## Как устроена стадия');
p('');
p('- **Стадия** — один слот плана `WAVE_PLAN`. Раунд начинает не с первой стадии, а с той,');
p('  на которой остановился прошлый раунд этой локации (первый раунд — с начала); когда');
p('  список из 23 стадий кончается, повторяется последняя (набор E) — до конца забега.');
p(`- Стадия начинается с паузы **«перед»** (живой \`m_startDelay\`): ${leadIn}.`);
p('- Затем вылетают серии: все группы серии начинаются одновременно, внутри группы');
p(`  объекты идут друг за другом каждые **gap** секунд (0 — все вместе): ${gaps} с.`);
if (noEnd) {
  p('- Паузы **«после»** нет. Следующая стадия начинается, когда **все объекты прошлой исчезли**');
  p('  (разрезаны, пойманы или упали за экран), и ждёт только свою «перед». Так ведёт себя');
  p('  эталонная игра (замер по видео: ~1 с от исчезновения фрукта до следующего броска).');
  p('  Кто режет быстрее — получает следующие серии раньше.');
} else {
  p(`- После последнего объекта серии стадия ждёт **${endShort}** («после») — и начинается следующая.`);
}
p('- Количество объектов `n` — диапазон `мин–макс` включительно; строка «Разброс» — время');
p('  от первого до последнего объекта серии.');
p('- Группа бывает трёх видов: обычные бросания (микробы и фрукты), `kind: \'cell\'` — только');
p('  «свои» персонажи, которых нельзя трогать, и шаблон `seq`: «s» — обычное бросание,');
p('  «c» — «свой» (например, «ssc» — два объекта, затем персонаж). Всё, что вылетает за');
p('  концом шаблона, — обычные объекты.');
p('- Варианты в наборах A–E выбираются случайно по весу, но только что выпавший вариант');
p('  получает вес 0 и сразу выпасть не может; после каждого выбора всем вариантам');
p(`  начисляется +${Math.round(regrow * 100)} % базового веса (не выше базового). В наборах из двух`);
p('  вариантов (A и D) из-за этого варианты строго чередуются. Веса переживают границу');
p('  раунда: следующий раунд продолжает «отрастание» с того же места.');
p('- Время в игре идёт по кадрам (1/60 с), поэтому вылет может отличаться от табличного');
p('  не больше чем на кадр.');
p('');

p('## Паузы');
p('');
p('| Перерыв | Значение |');
p('|---|---|');
p(`| От начала раунда до первого объекта | ${f(FIRST_WAVE_AT)} с |`);
p(`| «Перед» серией (живой \`m_startDelay\`) | ${leadIn} |`);
p(`| Между объектами внутри серии | ${gaps} с или все вместе (gap 0) |`);
p(`| Серия целиком | 0–${f(maxSpan)} с (зависит от количества объектов) |`);
p(`| «После» серии (у всех стадий) | ${endShort} |`);
p(`| От исчезновения последнего объекта серии до первого объекта следующей стадии | «перед»: ${boundaryText} |`);
p('| Новые стадии | не начинаются в последние 1.5 с раунда |');
p('| Новые объекты | не вылетают позже чем за 0.4 с до конца раунда |');
p('');
p(`Раунд: первая игра в локации — ${roundSeconds(0)} с, каждая пройденная добавляет`);
p(`${roundSeconds(1) - roundSeconds(0)} с, максимум ${CONFIG.ROUND_SEC} с (по числу игр: ${ramp}…).`);
p('');

p('## Порядок стадий');
p('');
p('| Стадии | Слот | Варианты |');
p('|---|---|---|');
for (const g of groups) {
  const opts = optionsOf(g.entry);
  const slot = g === lastGroup ? 'набор E (повтор)'
    : g.entry.options ? `набор ${g.entry.set.toUpperCase()}`
      : 'простая волна';
  const variants = opts.map((o, i) => (opts.length > 1 ? `№${i + 1}: ${brief(o.wave)}` : brief(o.wave))).join('; ');
  p(`| ${label(g)} | ${slot} | ${variants} |`);
}
p('');

p('## Точные параметры каждой стадии');
p('');
p('| Стадии | Вариант | Вес | Пауза перед | Объектов | Как вылетают | Разброс | Стадия целиком | Примечание |');
p('|---|---|---|---|---|---|---|---|---|');
for (const g of groups) {
  const opts = optionsOf(g.entry);
  opts.forEach((o, i) => {
    const w = o.wave;
    const [c0, c1] = countRange(w);
    const [s0, s1] = spanRange(w);
    const [t0, t1] = totalRange(w);
    const note = [
      w.ts ? `полёт ${w.ts < 1 ? 'замедлен' : 'ускорен'} (×${f(w.ts)})` : '',
      w.inc ? `каждое использование быстрее на ${f(w.inc)} (до ×1.5, живёт между раундами)` : '',
    ].filter(Boolean).join(', ');
    p(`| ${label(g)} | ${opts.length > 1 ? `№${i + 1}` : '—'} | ${o.weight ?? '—'} | ${f(w.start)} с | ${rngTxt(c0, c1)} | ${brief(w)} | ${secs(s0, s1)} | ${rngTxt(t0, t1)} с | ${note} |`);
  });
}
p('');
p('«Стадия целиком» — от начала стадии до начала следующей («перед» + серия + «после»).');
const uniqueWeights = [...new Set(WAVE_PLAN.flatMap((e) => optionsOf(e).map((o) => o.weight ?? 0)))];
p(`Вес — относительная вероятность варианта (значения плана: ${uniqueWeights.join(' / ')}).`);
p('');

p('## Когда начинаются стадии');
p('');
p('Окно — по 120 смоделированным забегам без нарезки (самый медленный темп): «начало серии» —');
p('момент, когда стадия запускается (все объекты прошлой исчезли),');
p('«первый объект» — когда вылетает её первый объект.');
p('');
p('| Стадия | Начало серии | Первый объект | В раунде 40 с | В раунде 60 с |');
p('|---|---|---|---|---|');
windows.forEach((w, i) => {
  p(`| ${i + 1} | ${secs(w.begin[0], w.begin[1])} | ${secs(w.first[0], w.first[1])} | ${fits(w.begin, 40)} | ${fits(w.begin, 60)} |`);
});
p('');
const four = windows.slice(0, 4).map((w) => f(w.begin[0])).join(' / ');
p(`Стадии 1–4 всегда идут одним ритмом: ${four} с. Стадия 5 — урок «не чіпай»: только «свои»,`);
p(`в замедлении, начинается в ${f(windows[4].begin[0])} с, первый объект — в ${f(windows[4].first[0])} с.`);
p('Дальше окно расширяется из-за выбора вариантов. Отдельный раунд 40–60 с до набора E');
p('(23-я стадия) не дотягивает, но раунды продолжают один забег — со временем игра');
p('доходит и до него.');
p('');
p('## Прогрессия забега по раундам');
p('');
p('Сложность растёт от раунда к раунду: каждый раунд продолжает список стадий с того места,');
p('где остановился прошлый (как одна непрерывная классическая партия). Курсор стадии,');
p('накопленная скорость набора E');
p('и «отрастающие» веса хранятся в сохранении на каждую локацию.');
p('');
p(`По ${SEEDS} случайным сидам, раунды идут подряд с растущей длительностью:`);
p('');
p('| Раунд | Длительность | Стартовая стадия |');
p('|---|---|---|');
for (let r = 0; r < TRIP_ROUNDS; r++) {
  const mins = Math.min(...trips.map((t) => t[r] ?? WAVE_PLAN.length - 1));
  const maxs = Math.max(...trips.map((t) => t[r] ?? WAVE_PLAN.length - 1));
  p(`| ${r + 1} | ${roundSeconds(r)} с | ${mins + 1}–${maxs + 1} |`);
}
p('');
if (reach) {
  const incs = [...new Set(allWaves.filter((w) => w.inc).map((w) => f(w.inc)))].join(' / ');
  p(`Повторяющийся набор E начинается с раунда ${reach[0]}${reach[0] === reach[1] ? '' : `–${reach[1]}`} (у ${reached.length} из ${SEEDS} сидов).`);
  p(`Дальше каждый вариант набора E ускоряется на ${incs} за каждое использование (до ×1.5) — как`);
  p('у последних волн классической партии: чем больше раундов, тем быстрее полёт в этом наборе.');
} else {
  p('Повторяющийся набор E встречается позже 12 раундов.');
}
p('');
p('## «Свои» персонажи и жизни');
p('');
p(`Жизни и досрочный конец раунда включаются флагом \`CONFIG.GAME_OVER\` (сейчас: ${CONFIG.GAME_OVER ? 'включены' : 'выключены'}).`);
p('Проигрыша нет (R6): досрочный конец — тот же экран награды. Без флага раунд идёт до конца времени.');
p('');
p('- «Свои» (персонажи, которых нельзя трогать) вылетают только по расписанию плана:');
p('  случайно встретить их нельзя. Стадия 5 — урок: 1–2 персонажа одни, полёт замедлен.');
p('- Касание персонажа: без флага — персонаж хихикает, комбо сбрасывается; с флагом — раунд');
p('  завершается сразу, ребёнок видит обычный экран награды и доброе слово.');
p(`- Жизни (только с флагом): ${CONFIG.MAX_LIVES} сердечка. Промах (объект улетел несрезанным) отнимает одно;`);
p(`  первое возвращается на ${CONFIG.LIFE_FIRST_AT} очках, дальше каждые ${CONFIG.LIFE_STEP}.`);
p('  Очки — это и микробы, и витамины.');
p('- Когда сердечки кончились, раунд завершается досрочно — так же по-доброму.');
p('');
p('## Король микробов');
p('');
p(`- Появляется на ${CONFIG.KING_AFTER} очках, затем каждые ${CONFIG.KING_EVERY}.`);
p(`- Большой (×${f(CONFIG.KING_SCALE)}), летит сбоку; пока он на экране, время замедлено до ${Math.round(CONFIG.KING_SLOW * 100)} %,`);
p('  очередь стадий ждёт, а «свои» разлетаются в стороны.');
p(`- Каждый разрез даёт очко, но не чаще чем раз в ${f(CONFIG.KING_SLICE_MIN)} с. Первый разрез`);
p('  «обезвреживает» всех «своих» на экране: их уже можно трогать — они просто лопаются.');
p(`- Через ${f(CONFIG.KING_SEC)} с король лопается: за ${f(CONFIG.KING_BURST_SEC)} с время разгоняется с ${Math.round(CONFIG.KING_BURST_MIN * 100)} % до 100 %.`);
p(`- Камера приближается (×${f(CONFIG.KING_CAM_ZOOM)}) и слегка тянется к каждому разрезу.`);
p('');

p('## Сколько вылетает за раунд');
p('');
p(`По ${SEEDS} случайным сидам на каждую длительность (все объекты, включая бонусы):`);
p('');
p('| Раунд | Объектов всего | Стадий |');
p('|---|---|---|');
for (const s of stats) {
  p(`| ${s.duration} с | ${s.objs[0]}–${s.objs[1]} (в среднем ${s.objs[2].toFixed(1)}) | ${s.stages[0]}–${s.stages[1]} |`);
}
p('');

p('## Виды объектов по локациям');
p('');
p('| Локация | Микробы | Фрукты | «Свои» этой локации |');
p('|---|---|---|---|');
for (const loc of LOCATION_ORDER) {
  const w = LOCATIONS[loc];
  const faces = typesFor(loc).cell.map((t) => ART[t]?.name ?? t).join(', ');
  p(`| ${LOCATION_INFO[loc].name} | ${Math.round(w.microbe * 100)} % | ${Math.round(w.fruit * 100)} % | ${faces} |`);
}
p('');
p('Доли — вероятность микроба/фрукта для каждого обычного бросания. «Свои» вылетают');
p('по общему расписанию (одинаковому во всех локациях) — меняются только их лица.');
p(`В стадиях 1–2 (первые ${SAFE_SLOTS} слота) персонажей и бонусов не бывает — только микробы и фрукты.`);
p(`Бонусы: шанс ${Math.round(CONFIG.BONUS_CHANCE * 100)} % на объект, не больше ${CONFIG.MAX_BONUSES} за раунд,`);
p('влетают сбоку, на уровне ниже обычных бросков.');
p('');
p('Спокойный режим (меню и «Перед процедурою») — без стадий: редкие плавающие микробы,');
p('не больше шести на экране.');
p('');

p('Внутренние инварианты плана стерегут `tests/spawner.test.mjs` (`npm test`).');
p('');

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, lines.join('\n'), 'utf8');
console.log(`written: ${OUT} (${lines.length} lines)`);
