// DOM screens over the canvas: title, HUD, reward, rest, atlas, parents,
// pause, calm breathing. Player-facing copy is Ukrainian.
import gsap from 'gsap';
import { ART, fullSvg, svgDataUrl } from '../render/art.js';
import { STICKERS } from '../core/progress.js';
import { CONFIG, LOCATION_INFO, LOCATION_ORDER, typesFor } from '../core/config.js';
import {
  AVATARS, ECONOMY, POWERUPS, TRAILS, avatarLevel, taskById,
} from '../core/economy.js';

// Why a friendly character must not be touched, per character.
const FRIEND_NOTE = {
  chervonya: 'Вони захищають тіло',
  bilyk: 'Вони захищають тіло',
  latochka: 'Вони латають ранки',
  zubchyk: 'Зубчик — твій друг',
  dobryk: 'Добрик — корисна бактерія',
};

const COMBO_WORDS = { 3: 'Супер!', 5: 'Чудово!', 10: 'Неймовірно!' };
const BONUS_WORDS = {
  soap: 'Мильна хвиля!',
  toothbrush: 'Щіточка: чисто!',
  vaccine: 'Щит щеплення!',
  patch: 'Латочка: усе повільно!',
};

// Small colour previews of the finger trails for the collection screen.
const TRAIL_PREVIEW = {
  rainbow: 'linear-gradient(90deg,#ff5c9a,#ffa62b,#ffe27a,#7ed957,#4fb3ff,#a77bf3)',
  stars: 'linear-gradient(90deg,#fff6c4,#ffd23f,#ffffff)',
  hearts: 'linear-gradient(90deg,#ffc2d6,#ff5c9a,#ff9cc0)',
  snow: 'linear-gradient(90deg,#ffffff,#c9f3ff,#8fd3ff)',
  bubbles: 'linear-gradient(90deg,#c9f3ff,#ffd6f5,#c9f3ff)',
  confetti: 'repeating-linear-gradient(90deg,#ff5c9a 0 10px,#ffe27a 10px 20px,#4fb3ff 20px 30px,#7ed957 30px 40px)',
  neon: 'linear-gradient(90deg,#ff3df2,#3dfcff,#ff3df2)',
  gold: 'linear-gradient(90deg,#c98a00,#ffd23f,#fff6b0,#ffd23f)',
};

const img = (key, cls = '') => `<img class="${cls}" alt="" draggable="false" src="${svgDataUrl(fullSvg(key))}">`;
const YULIYA_ART = `${import.meta.env.BASE_URL}characters/yuliya.webp`;
const yuliya = (cls = '') => `<img class="${cls}" draggable="false" alt="Юлія, головна медсестра" src="${YULIYA_ART}">`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createUI(root, { progress, onTap = () => {} }) {
  const listeners = new Map();
  const emit = (name, ...a) => (listeners.get(name) ?? []).forEach((fn) => fn(...a));
  let screen = null;
  let hud = null;
  let calmTl = null;
  let comboEl = null;
  let prepSel = [];

  function mount(html, cls) {
    unmountScreen();
    screen = document.createElement('div');
    screen.className = `screen ${cls}`;
    screen.innerHTML = html;
    root.append(screen);
    screen.addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn || btn.disabled) return;
      gsap.fromTo(btn, { scale: 0.92 }, { scale: 1, duration: 0.35, ease: 'back.out(3)' });
      onTap();
      emit(btn.dataset.act, btn.dataset.arg);
    });
    gsap.from(screen.querySelectorAll('.pop'), { scale: 0.6, opacity: 0, duration: 0.5, stagger: 0.06, ease: 'back.out(2.2)' });
    return screen;
  }

  function unmountScreen() {
    if (calmTl) calmTl.kill();
    calmTl = null;
    if (screen) screen.remove();
    screen = null;
  }

  // Avatar, level with its XP bar and the star wallet.
  function profileChip() {
    const lv = progress.levelInfo();
    const pct = Math.round((lv.into / lv.need) * 100);
    return `<button class="profile pop" data-act="collection" data-arg="avatars" aria-label="Профіль">
      ${img(progress.state.avatar, 'profile-avatar')}
      <span class="profile-info"><b>Рівень ${lv.level}</b><span class="xp"><i style="width:${pct}%"></i></span></span>
      <span class="wallet">⭐ ${progress.state.stars}</span>
    </button>`;
  }

  const muteBtn = () =>
    `<button class="icon-btn mute pop" data-act="mute" aria-label="Звук">${progress.state.muted ? '🔇' : '🔊'}</button>`;

  function locationCard(loc) {
    const info = LOCATION_INFO[loc];
    const open = progress.isUnlocked(loc);
    const i = LOCATION_ORDER.indexOf(loc);
    const prev = LOCATION_ORDER[i - 1];
    const need = i > 0 ? CONFIG.UNLOCK_AFTER - progress.state.rounds[prev] : 0;
    const prevOpen = i > 0 && progress.isUnlocked(prev);
    return `<button class="loc-card pop ${open ? '' : 'locked'}" data-act="${open ? 'play' : 'locked'}" data-arg="${loc}">
      ${img(info.icon, 'loc-icon')}
      <span class="loc-name">${info.name}</span>
      <span class="loc-hint">${open ? info.hint : prevOpen ? `🔒 ще ${need} ${need === 1 ? 'раунд' : 'раунди'}` : '🔒'}</span>
    </button>`;
  }

  const api = {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, []);
      listeners.get(name).push(fn);
    },

    showTitle() {
      hideHud();
      // «Грати» follows the chain: the next location that still needs rounds.
      const next = progress.nextLocation();
      const roundNo = (progress.state.rounds[next] ?? 0) + 1;
      mount(
        `${muteBtn()}
        <div class="title-wrap">
          ${profileChip()}
          <div class="logo pop">
            <div class="logo-chars">${img('chykhunchyk', 'float a')}${img('bilyk', 'float b')}${img('orange', 'float c')}</div>
            <h1>Мильна<br>Хвиля</h1>
          </div>
          <div class="story-banner pop">${yuliya('story-banner-portrait')}
            <div><strong>Юлія запрошує у пригоду!</strong>
              <span>Атлас маленьких відкриттів · ${LOCATION_ORDER.filter((l) => progress.hasSeenStory('chapter:' + l)).length}/6 сторінок</span>
              ${progress.hasSeenStory('finale') ? '<span>🏅 Друг маленьких відкриттів</span>' : ''}
            </div>
          </div>
          <button class="big-btn pop" data-act="play" data-arg="${next}">Грати<span class="btn-sub">${LOCATION_INFO[next].name} · раунд ${roundNo}</span></button>
          <div class="loc-row">${LOCATION_ORDER.map(locationCard).join('')}</div>
          <div class="row">
            <button class="mid-btn calm pop" data-act="calm">🫧 Перед процедурою</button>
            <button class="mid-btn atlas pop" data-act="atlas">📒 Атлас тіла</button>
            <button class="mid-btn how pop" data-act="how">👆 Як грати?</button>
          </div>
          <div class="row">
            <button class="mid-btn tasks pop" data-act="tasks">🎯 Завдання</button>
            <button class="mid-btn trails pop" data-act="collection" data-arg="trails">✨ Сліди й значки</button>
          </div>
          <button class="link-btn pop" data-act="parents">Для батьків</button>
        </div>`,
        'title',
      );
    },

    showHud(maxLives = CONFIG.MAX_LIVES, powerups = []) {
      hideHud();
      const pu = powerups
        .map((id) => POWERUPS.find((x) => x.id === id))
        .filter(Boolean)
        .map((x) => `<span class="pu-chip" data-pu="${x.id}">${x.icon}${x.id === 'shield' ? '<b class="forgive">3</b>' : ''}</span>`)
        .join('');
      hud = document.createElement('div');
      hud.className = 'hud';
      hud.innerHTML = `
        <svg class="timer" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" class="track"/><circle cx="32" cy="32" r="26" class="bar"/></svg>
        <div class="lives">${img('heart', 'heart-img')}<span class="lives-count">×${maxLives}</span></div>
        <div class="pu-row">${pu}</div>
        <div class="score">${img('bubble', 'score-img')}<span class="score-n">0</span></div>
        <div class="jar">${img('jar', 'jar-img')}<span class="jar-n">0</span></div>
        <button class="icon-btn pause" data-act="pause" aria-label="Пауза">⏸</button>
        <div class="toast"></div>`;
      hud.addEventListener('click', (ev) => {
        const b = ev.target.closest('[data-act]');
        if (b) emit(b.dataset.act);
      });
      root.append(hud);
    },

    updateHud({ remaining, total, vitamins, score, lives, calm }) {
      if (!hud) return;
      const bar = hud.querySelector('.bar');
      const frac = calm ? 1 : Math.max(0, remaining) / (total || CONFIG.ROUND_SEC);
      bar.style.strokeDashoffset = String(163.4 * (1 - frac));
      hud.querySelector('.timer').classList.toggle('hidden', !!calm);
      hud.querySelector('.jar').classList.toggle('hidden', !!calm);
      // Hearts: calm mode has none (nothing can be dropped there).
      const livesEl = hud.querySelector('.lives');
      livesEl.classList.toggle('hidden', !!calm || !CONFIG.GAME_OVER);
      if (!calm && lives != null && hud._lives !== lives) {
        const before = hud._lives ?? lives;
        hud._lives = lives;
        const count = livesEl.querySelector('.lives-count');
        count.textContent = '×' + lives;
        livesEl.classList.toggle('low', lives <= 2);
        if (before !== lives) {
          gsap.fromTo(count, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.45)' });
        }
      }
      const n = hud.querySelector('.jar-n');
      if (n.textContent !== String(vitamins)) n.textContent = String(vitamins);
      const sc = hud.querySelector('.score-n');
      if (sc.textContent !== String(score)) {
        sc.textContent = String(score);
        gsap.fromTo(hud.querySelector('.score'), { scale: 1.3 }, { scale: 1, duration: 0.4, ease: 'back.out(3)' });
      }
    },

    jarScreenPos() {
      const el = hud?.querySelector('.jar-img');
      if (!el) return { x: window.innerWidth - 50, y: 50 };
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },

    bumpJar() {
      const el = hud?.querySelector('.jar');
      if (el) gsap.fromTo(el, { scale: 1.35 }, { scale: 1, duration: 0.5, ease: 'elastic.out(1.1, 0.4)' });
    },

    comboPopup(n) {
      // One popup at a time: a new combo replaces the previous one.
      if (comboEl) {
        gsap.killTweensOf(comboEl);
        comboEl.remove();
      }
      const el = document.createElement('div');
      comboEl = el;
      el.className = 'combo';
      el.innerHTML = `<b>×${n}</b><span>${COMBO_WORDS[n] ?? 'Ура!'}</span>`;
      root.append(el);
      gsap.fromTo(el, { scale: 0.3, rotation: -12 }, { scale: 1, rotation: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.45)' });
      gsap.to(el, { y: -80, opacity: 0, duration: 0.6, delay: 0.9, ease: 'sine.in', onComplete: () => el.remove() });
    },

    hudForgive(left) {
      const b = hud?.querySelector('.forgive');
      if (!b) return;
      b.textContent = String(left);
      gsap.fromTo(b.parentElement, { scale: 1.5 }, { scale: 1, duration: 0.5, ease: 'back.out(3)' });
      if (left === 0) b.parentElement.classList.add('spent');
    },

    bonusBadge(type) {
      api.toast(BONUS_WORDS[type] ?? '');
    },

    toast(text) {
      const t = hud?.querySelector('.toast');
      if (!t) return;
      t.textContent = text;
      gsap.killTweensOf(t);
      gsap.fromTo(t, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(3)' });
      gsap.to(t, { opacity: 0, duration: 0.4, delay: 1.6 });
    },

    showReward({
      sticker, fact, unlocked, summary, note = '',
      round = 1, loc = 'hands', best = null, achievements = [], plusSeconds = 0, economy = null,
    }) {
      const lv = progress.levelInfo();
      const lvPct = Math.round((lv.into / lv.need) * 100);
      const earn = economy
        ? `<div class="earn pop"><span>+${economy.stars} ⭐</span><span>+${economy.xp} досвіду</span>${economy.gold ? `<span>🌟 ×${economy.gold}</span>` : ''}</div>
          <div class="lvl-line pop"><b>Рівень ${lv.level}</b><span class="xp big"><i style="width:${lvPct}%"></i></span></div>`
        : '';
      const ups = (economy?.levelUps ?? []).map((u) => `
          <div class="levelup pop">
            <b>🎉 Новий рівень ${u.level}!</b>
            <span>+${u.stars} ⭐${u.avatar ? ` · новий значок ${img(u.avatar, 'lu-avatar')}` : ''}${u.trail ? ` · слід «${esc(u.trail.name)}»` : ''}</span>
          </div>`).join('');
      const tasksDone = economy?.tasksDone?.length
        ? `<div class="tasks-done pop">${economy.tasksDone.map((t) => `<span>🎯 ${esc(t.text)} <b>+${t.reward} ⭐</b></span>`).join('')}</div>`
        : '';
      const a = ART[sticker.art];
      const hearts = `❤️ ${summary.lives}/${CONFIG.MAX_LIVES + (summary.powerups?.includes('heart') ? 1 : 0)}`;
            const record = best?.isRecord
        ? '<div class="record new pop">🏆 Новий рекорд!</div>'
        : best && best.value > 0
          ? `<div class="record pop">🏆 Рекорд: ${best.value}</div>`
          : '';
      const ach = achievements.length
        ? `<div class="ach-list pop">${achievements.map((x) => `<span class="ach ${x.isNew ? 'new' : ''}">${x.icon} ${esc(x.title)}${x.isNew ? '<b> нова</b>' : ''}</span>`).join('')}</div>`
        : '';
      mount(
        `<div class="card reward">
          <h2 class="pop">Чудово!</h2>
          <p class="reward-round pop">Раунд ${round} · ${esc(LOCATION_INFO[loc].name)}</p>
          ${note ? `<p class="reward-note pop">${esc(note)}</p>` : ''}
          ${ups}
          <div class="stats pop"><span>🫧 ${summary.score}</span><span>🍊 ${summary.vitamins}</span><span>⚡ ×${summary.bestCombo}</span></div>
          ${earn}
          ${tasksDone}
          <div class="stats-mini pop">${CONFIG.GAME_OVER ? `<span>${hearts}</span>` : ''}<span>✨ ${summary.sliced ?? 0}</span></div>
          ${record}
          ${ach}
          <div class="sticker pop ${sticker.isNew ? 'new' : ''}">
            ${img(sticker.art, 'sticker-img')}
            <span class="badge">${sticker.isNew ? 'Нова наліпка!' : `Ще одна! ×${sticker.count}`}</span>
          </div>
          <div class="sticker-name pop">${esc(a.name)}</div>
          ${fact ? `<div class="fact pop"><p>${esc(fact.text)}</p><small>Прочитайте дитині</small></div>` : ''}
          ${unlocked ? `<div class="unlock pop">Відкрито нове місце: <b>${LOCATION_INFO[unlocked].name}</b>!</div>` : ''}
          <div class="row">
            <button class="big-btn pop" data-act="again">Наступний раунд</button>
            <button class="mid-btn pop" data-act="menu">До меню</button>
          </div>
          ${plusSeconds > 0 ? `<p class="reward-hint pop">⏱ Наступний раунд на ${plusSeconds} с довший</p>` : ''}
        </div>`,
        'overlay',
      );
      const st = screen.querySelector('.sticker-img');
      gsap.fromTo(st, { y: -260, rotation: -25 }, { y: 0, rotation: 0, duration: 1, ease: 'bounce.out', delay: 0.2 });
    },

    // "What to slice" card: shown before the very first round ('start') and
    // from the title screen ('info'). Pictograms instead of long text for 5-9.
    // "How to play" card: shown before the first round in each location and
    // from the title screen. Pictures carry the meaning for kids who can't read
    // yet; the characters are the ones of that location.
    showStory(story, page = 0) {
      hideHud();
      const item = story.pages[page];
      const actor = item.actor === 'yuliya' ? yuliya('story-portrait') : img('bilyk', 'story-pal');
      const last = page === story.pages.length - 1;
      mount(
        `<div class="card story-card" role="dialog" aria-label="${esc(story.title)}">
          <div class="story-illustration">${actor}</div>
          <p class="story-place">${esc(story.place)}</p>
          <h2>${esc(story.title)}</h2>
          <div class="story-dialogue"><b>${esc(item.speaker)}</b><p>${esc(item.text)}</p></div>
          <p class="story-counter">${page + 1} / ${story.pages.length}</p>
          <div class="row"><button class="big-btn" data-act="story-next">${last ? 'Чудово!' : 'Далі →'}</button></div>
          <button class="link-btn" data-act="story-skip">Пропустити</button>
        </div>`,
        'overlay story-overlay',
      );
    },

    showIntro(mode = 'start', loc = 'hands') {
      hideHud();
      const pools = typesFor(loc);
      const friend = FRIEND_NOTE[pools.cell[0]] ?? 'Вони захищають тіло';
      const row = (arts, title, sub, ok) => `
        <div class="how-row pop ${ok ? '' : 'hazard-how-row'}">
          <div class="how-imgs">${arts.map((a) => ok ? img(a, 'how-img')
            : `<span class="hazard-example">${img(a, 'how-img')}<b aria-hidden="true">!</b></span>`).join('')}</div>
          <div class="how-text"><b>${title}</b><span>${sub}</span></div>
          <span class="how-mark ${ok ? 'ok' : 'no'}">${ok ? '✓' : '✕'}</span>
        </div>`;
      mount(
        `<div class="card howto">
          <h2 class="pop">Як грати?</h2>
          <p class="how-loc pop">${LOCATION_INFO[loc].name}</p>
          ${row(['heart'], 'Бережи сердечка!', 'Мимо — мінус сердечко', true)}
          ${row(pools.microbe.slice(0, 2), 'Мий мікробів!', 'Проведи пальцем — і в бульбашку', true)}
          ${row(pools.fruit.slice(0, 2), 'Збирай вітаміни!', 'Фрукти — у баночку', true)}
          ${row(pools.cell, 'Обережно, не розрізай!', `Знак «!» і димний слід — пропускай. ${friend}`, false)}
          ${row(pools.bonus, 'Лови бонуси!', 'Вони допомагають', true)}
          <div class="row">
            <button class="big-btn pop" data-act="${mode === 'start' ? 'intro-go' : 'menu'}">${mode === 'start' ? 'Грати!' : 'Добре'}</button>
            ${mode === 'start' ? '<button class="mid-btn pop" data-act="menu">До меню</button>' : ''}
          </div>
        </div>`,
        'overlay',
      );
    },

    // Pre-round screen: pick up to three power-ups for the next round.
    showPrep(loc, roundNo = 1) {
      prepSel = [];
      const cards = POWERUPS.map((x) => `
        <button class="pu-card pop" data-act="pu-toggle" data-arg="${x.id}">
          <span class="pu-icon">${x.icon}</span>
          <b>${esc(x.name)}</b>
          <small>${esc(x.desc)}</small>
          <span class="pu-price">⭐ ${x.price}</span>
        </button>`).join('');
      mount(
        `<div class="card prep">
          <h2 class="pop">Підготовка</h2>
          <p class="reward-round pop">${esc(LOCATION_INFO[loc].name)} · раунд ${roundNo}</p>
          <div class="wallet big pop">У тебе ⭐ <b class="prep-stars">${progress.state.stars}</b></div>
          <p class="prep-hint pop">Обери до ${ECONOMY.MAX_POWERUPS} підпиток — або грай одразу</p>
          <div class="pu-grid">${cards}</div>
          <div class="row">
            <button class="big-btn pop prep-go" data-act="prep-go">Грати!</button>
            <button class="mid-btn pop" data-act="menu">До меню</button>
          </div>
        </div>`,
        'overlay',
      );
      api.prepRefresh();
    },

    prepToggle(id) {
      if (prepSel.includes(id)) prepSel = prepSel.filter((x) => x !== id);
      else if (prepSel.length < ECONOMY.MAX_POWERUPS
        && progress.powerupCost([...prepSel, id]) <= progress.state.stars) prepSel.push(id);
      api.prepRefresh();
    },

    prepRefresh() {
      if (!screen) return;
      const cost = progress.powerupCost(prepSel);
      screen.querySelectorAll('.pu-card').forEach((b) => {
        const id = b.dataset.arg;
        const on = prepSel.includes(id);
        const can = on || (prepSel.length < ECONOMY.MAX_POWERUPS && cost + progress.powerupCost([id]) <= progress.state.stars);
        b.classList.toggle('on', on);
        b.classList.toggle('dim', !can);
      });
      const go = screen.querySelector('.prep-go');
      if (go) go.textContent = prepSel.length ? `Грати · ⭐ ${cost}` : 'Грати!';
      const left = screen.querySelector('.prep-stars');
      if (left) left.textContent = String(progress.state.stars - cost);
    },

    prepSelection: () => [...prepSel],

    // Bilyk's tasks: three at a time, no deadlines.
    showTasks() {
      hideHud();
      const rows = progress.state.tasks.active.map((a) => {
        const t = taskById(a.id);
        if (!t) return '';
        const pct = Math.round((a.progress / t.target) * 100);
        return `<div class="task-row pop">
          <div class="task-text"><b>${esc(t.text)}</b>
            <span class="xp"><i style="width:${pct}%"></i></span>
            <small>${a.progress} / ${t.target}</small></div>
          <span class="task-reward">+${t.reward} ⭐</span>
        </div>`;
      }).join('');
      mount(
        `<div class="atlas-wrap">
          <div class="atlas-head"><button class="icon-btn" data-act="menu" aria-label="Назад">←</button><h2>Завдання Білика</h2></div>
          <div class="tasks-intro pop">${img('bilyk', 'tasks-bilyk')}<p>Виконуй завдання — і отримуй зірочки. Поспішати не треба!</p></div>
          ${rows}
        </div>`,
        'atlas',
      );
    },

    // Trails and avatars: open with levels, trails are bought once with stars.
    showCollection(tab = 'trails') {
      hideHud();
      const lv = progress.levelInfo().level;
      const tabs = `<div class="tabs two">
        <button class="tab ${tab === 'trails' ? 'on' : ''}" data-act="collection" data-arg="trails">✨ Сліди</button>
        <button class="tab ${tab === 'avatars' ? 'on' : ''}" data-act="collection" data-arg="avatars">🙂 Значки</button>
      </div>`;
      let body;
      if (tab === 'trails') {
        body = `<div class="trail-list">${TRAILS.map((t) => {
          const st = progress.trailState(t.id);
          const action = st === 'selected' ? '<span class="tr-state on">✓ Обрано</span>'
            : st === 'owned' ? `<button class="mid-btn small" data-act="trail-pick" data-arg="${t.id}">Обрати</button>`
              : st === 'locked' ? `<span class="tr-state">🔒 Рівень ${t.level}</span>`
                : `<button class="mid-btn small buy" data-act="trail-buy" data-arg="${t.id}" ${progress.state.stars < t.price ? 'disabled' : ''}>Купити ⭐ ${t.price}</button>`;
          return `<div class="trail-card pop ${st}">
            <span class="tr-preview" style="background:${TRAIL_PREVIEW[t.id]}"></span>
            <b>${esc(t.name)}</b>${action}
          </div>`;
        }).join('')}</div>`;
      } else {
        body = `<div class="grid avatars">${AVATARS.map((key) => {
          const open = avatarLevel(key) <= lv;
          const sel = progress.state.avatar === key;
          return open
            ? `<button class="slot pop ${sel ? 'selected' : ''}" data-act="avatar-pick" data-arg="${key}">${img(key)}</button>`
            : `<div class="slot empty pop">${img(key)}<span class="count">Рів. ${avatarLevel(key)}</span></div>`;
        }).join('')}</div>`;
      }
      mount(
        `<div class="atlas-wrap">
          <div class="atlas-head"><button class="icon-btn" data-act="menu" aria-label="Назад">←</button><h2>Сліди й значки</h2></div>
          <div class="wallet big">Рівень ${lv} · ⭐ ${progress.state.stars}</div>
          ${tabs}
          ${body}
        </div>`,
        'atlas',
      );
    },

    // Short floating note over any screen (e.g. a finished calm task).
    notice(text) {
      const el = document.createElement('div');
      el.className = 'notice';
      el.textContent = text;
      root.append(el);
      gsap.fromTo(el, { y: -40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.45, ease: 'back.out(2.5)' });
      gsap.to(el, { opacity: 0, duration: 0.4, delay: 3, onComplete: () => el.remove() });
    },

    showRest() {
      mount(
        `<div class="card rest">
          <div class="rest-yuliya pop">${yuliya('rest-portrait')}<span>Юлія: «Чудова робота! Час трішки перепочити»</span></div>
          <div class="rest-chars pop">${img('bilyk', 'wave a')}${img('chervonya', 'wave b')}${img('latochka', 'wave c')}</div>
          <h2 class="pop">Чудова робота!</h2>
          <p class="pop">Перепочинь трішки 🙂<br>Випий води або обійми маму.</p>
          <div class="row">
            <button class="big-btn pop" data-act="again-now">Наступний раунд</button>
            <button class="mid-btn pop" data-act="menu">До меню</button>
          </div>
        </div>`,
        'overlay',
      );
    },

    showPause() {
      mount(
        `<div class="card pause-card">
          <h2 class="pop">Пауза</h2>
          <div class="row">
            <button class="big-btn pop" data-act="resume">Продовжити</button>
            <button class="mid-btn pop" data-act="menu">До меню</button>
          </div>
        </div>`,
        'overlay',
      );
    },

    showAtlas(loc = 'hands') {
      hideHud();
      const tabs = LOCATION_ORDER.map(
        (l) => `<button class="tab ${l === loc ? 'on' : ''}" data-act="atlas-tab" data-arg="${l}">${LOCATION_INFO[l].name}</button>`,
      ).join('');
      const items = STICKERS[loc]
        .map((s) => {
          const n = progress.state.stickers[s.id] ?? 0;
          return `<button class="slot pop ${n ? '' : 'empty'}" data-act="${n ? 'sticker' : 'nope'}" data-arg="${s.art}">
            ${img(s.art)}${n > 1 ? `<span class="count">×${n}</span>` : ''}</button>`;
        })
        .join('');
      const got = STICKERS[loc].filter((s) => progress.state.stickers[s.id]).length;
      mount(
        `<div class="atlas-wrap">
          <div class="atlas-head"><button class="icon-btn" data-act="menu" aria-label="Назад">←</button><h2>Атлас тіла</h2></div>
          <div class="tabs">${tabs}</div>
          <div class="progress-line">Зібрано ${got} з ${STICKERS[loc].length}</div>
          <div class="story-atlas">${yuliya('story-atlas-portrait')}<span>Сторінок пригоди: <b>${LOCATION_ORDER.filter((l) => progress.hasSeenStory('chapter:' + l)).length}/6</b>
             ${progress.hasSeenStory('finale') ? '<br>🏅 Друг маленьких відкриттів' : ''}</span></div>
          <div class="grid">${items}</div>
          <div class="sticker-card hidden"></div>
        </div>`,
        'atlas',
      );
    },

    showStickerCard(art) {
      const card = screen?.querySelector('.sticker-card');
      if (!card) return;
      const a = ART[art];
      card.innerHTML = `${img(art)}<b>${esc(a.name)}</b><p>${esc(a.line)}</p><button class="mid-btn" data-act="close-card">Добре</button>`;
      card.classList.remove('hidden');
      gsap.fromTo(card, { scale: 0.6, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(2.4)' });
    },

    hideStickerCard() {
      screen?.querySelector('.sticker-card')?.classList.add('hidden');
    },

    showParents() {
      hideHud();
      mount(
        `<div class="parents">
          <div class="atlas-head"><button class="icon-btn" data-act="menu" aria-label="Назад">←</button><h2>Для батьків</h2></div>
          <p><b>«Мильна Хвиля»</b> — добра гра для дітей 5–9 років, які лікуються або чекають на прийом.</p>
          <ul>
            <li>Без реклами, покупок і реєстрації.</li>
            <li>Гра не збирає жодних даних. Прогрес зберігається лише на цьому телефоні.</li>
            <li>Перші раунди короткі (близько 40 секунд) і поступово подовжуються до хвилини. Кожні три раунди гра пропонує перепочити.</li>
            <li>У раунді три сердечка: промах забирає одне, а випадково зачеплена клітинка-персонаж зупиняє раунд раніше. За очки сердечка повертаються.</li>
            <li>Режим «Перед процедурою» допомагає заспокоїтися — дихайте разом з дитиною.</li>
            <li>Факти про здоров'я взято з відкритих джерел (ВООЗ, CDC, MedlinePlus, USDA). Вони чекають на перевірку лікарем.</li>
            <li>Зірочки, рівні, підпитки й сліди заробляються лише грою — покупок за гроші, реклами та «скриньок» немає.</li>
            <li>Гра не замінює пораду лікаря.</li>
          </ul>
          <button class="mid-btn danger" data-act="reset">Скинути прогрес</button>
        </div>`,
        'parents-screen',
      );
    },

    confirmReset() {
      const b = screen?.querySelector('[data-act="reset"]');
      if (!b) return false;
      if (b.dataset.armed) return true;
      b.dataset.armed = '1';
      b.textContent = 'Точно скинути? Натисніть ще раз';
      return false;
    },

    showCalm() {
      hideHud();
      mount(
        `<div class="calm-wrap">
          <div class="calm-yuliya">${yuliya('calm-portrait')}<span>Юлія поруч. Дихай повільно, як тобі зручно.</span></div>
          <div class="breath"><div class="ball"></div><span class="breath-text">Вдих…</span></div>
          <p class="calm-hint">Торкайся бульбашок і дихай повільно</p>
          <button class="mid-btn pop calm-exit" data-act="menu">Готово</button>
        </div>`,
        'calm-screen',
      );
      const ball = screen.querySelector('.ball');
      const text = screen.querySelector('.breath-text');
      calmTl = gsap.timeline({ repeat: -1 });
      calmTl.call(() => { text.textContent = 'Надуй кульку… вдих'; })
        .to(ball, { scale: 1.6, duration: 4, ease: 'sine.inOut' })
        .call(() => { text.textContent = 'І повільно здуй… видих'; })
        .to(ball, { scale: 1, duration: 4, ease: 'sine.inOut' });
    },

    setMuteIcon(m) {
      const b = screen?.querySelector('.mute');
      if (b) b.textContent = m ? '🔇' : '🔊';
    },

    showError(text) {
      mount(`<div class="card"><h2>Ой!</h2><p>${esc(text)}</p></div>`, 'overlay');
    },

    hideScreen() {
      unmountScreen();
    },
  };

  function hideHud() {
    if (hud) hud.remove();
    hud = null;
  }
  api.hideHud = hideHud;
  return api;
}
