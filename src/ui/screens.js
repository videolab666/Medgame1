// DOM screens over the canvas: title, HUD, reward, rest, atlas, parents,
// pause, calm breathing. Player-facing copy is Ukrainian.
import gsap from 'gsap';
import { ART, fullSvg, svgDataUrl } from '../render/art.js';
import { STICKERS } from '../core/progress.js';
import { CONFIG, LOCATION_ORDER } from '../core/config.js';

export const LOCATION_INFO = {
  hands: { name: 'Долоньки', icon: 'soap', hint: 'Мий мікробів!' },
  kitchen: { name: 'Кухня вітамінів', icon: 'orange', hint: 'Збирай вітаміни!' },
  blood: { name: 'Річка крові', icon: 'chervonya', hint: 'Не чіпай своїх!' },
  mouth: { name: 'Ротик', icon: 'zubchyk', hint: 'Бережи зубки!' },
  tummy: { name: 'Животик', icon: 'dobryk', hint: 'Добрика не чіпай!' },
  skin: { name: 'Шкіра', icon: 'hat', hint: 'Шкіра — наш щит!' },
};

const COMBO_WORDS = { 3: 'Супер!', 5: 'Чудово!', 10: 'Неймовірно!' };
const BONUS_WORDS = {
  soap: 'Мильна хвиля!',
  toothbrush: 'Щіточка: чисто!',
  vaccine: 'Щит щеплення!',
  patch: 'Латочка: усе повільно!',
};

const img = (key, cls = '') => `<img class="${cls}" alt="" draggable="false" src="${svgDataUrl(fullSvg(key))}">`;
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function createUI(root, { progress, onTap = () => {} }) {
  const listeners = new Map();
  const emit = (name, ...a) => (listeners.get(name) ?? []).forEach((fn) => fn(...a));
  let screen = null;
  let hud = null;
  let calmTl = null;
  let comboEl = null;

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
      const last = progress.lastUnlocked();
      mount(
        `${muteBtn()}
        <div class="title-wrap">
          <div class="logo pop">
            <div class="logo-chars">${img('chykhunchyk', 'float a')}${img('bilyk', 'float b')}${img('orange', 'float c')}</div>
            <h1>Мильна<br>Хвиля</h1>
          </div>
          <button class="big-btn pop" data-act="play" data-arg="${last}">Грати</button>
          <div class="loc-row">${LOCATION_ORDER.map(locationCard).join('')}</div>
          <div class="row">
            <button class="mid-btn calm pop" data-act="calm">🫧 Перед процедурою</button>
            <button class="mid-btn atlas pop" data-act="atlas">📒 Атлас тіла</button>
          </div>
          <button class="link-btn pop" data-act="parents">Для батьків</button>
        </div>`,
        'title',
      );
    },

    showHud() {
      hideHud();
      hud = document.createElement('div');
      hud.className = 'hud';
      hud.innerHTML = `
        <svg class="timer" viewBox="0 0 64 64"><circle cx="32" cy="32" r="26" class="track"/><circle cx="32" cy="32" r="26" class="bar"/></svg>
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

    updateHud({ remaining, vitamins, score, calm }) {
      if (!hud) return;
      const bar = hud.querySelector('.bar');
      const frac = calm ? 1 : Math.max(0, remaining) / CONFIG.ROUND_SEC;
      bar.style.strokeDashoffset = String(163.4 * (1 - frac));
      hud.querySelector('.timer').classList.toggle('hidden', !!calm);
      hud.querySelector('.jar').classList.toggle('hidden', !!calm);
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

    bonusBadge(type) {
      const t = hud?.querySelector('.toast');
      if (!t) return;
      t.textContent = BONUS_WORDS[type] ?? '';
      gsap.killTweensOf(t);
      gsap.fromTo(t, { scale: 0.5, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'back.out(3)' });
      gsap.to(t, { opacity: 0, duration: 0.4, delay: 1.6 });
    },

    showReward({ sticker, fact, unlocked, summary }) {
      const a = ART[sticker.art];
      mount(
        `<div class="card reward">
          <h2 class="pop">Чудово!</h2>
          <div class="stats pop"><span>🫧 ${summary.score}</span><span>🍊 ${summary.vitamins}</span><span>⭐ ×${summary.bestCombo}</span></div>
          <div class="sticker pop ${sticker.isNew ? 'new' : ''}">
            ${img(sticker.art, 'sticker-img')}
            <span class="badge">${sticker.isNew ? 'Нова наліпка!' : `Ще одна! ×${sticker.count}`}</span>
          </div>
          <div class="sticker-name pop">${esc(a.name)}</div>
          ${fact ? `<div class="fact pop"><p>${esc(fact.text)}</p><small>Прочитайте дитині</small></div>` : ''}
          ${unlocked ? `<div class="unlock pop">Відкрито нове місце: <b>${LOCATION_INFO[unlocked].name}</b>!</div>` : ''}
          <div class="row">
            <button class="big-btn pop" data-act="again">Ще раз</button>
            <button class="mid-btn pop" data-act="menu">До меню</button>
          </div>
        </div>`,
        'overlay',
      );
      const st = screen.querySelector('.sticker-img');
      gsap.fromTo(st, { y: -260, rotation: -25 }, { y: 0, rotation: 0, duration: 1, ease: 'bounce.out', delay: 0.2 });
    },

    showRest() {
      mount(
        `<div class="card rest">
          <div class="rest-chars pop">${img('bilyk', 'wave a')}${img('chervonya', 'wave b')}${img('latochka', 'wave c')}</div>
          <h2 class="pop">Чудова робота!</h2>
          <p class="pop">Перепочинь трішки 🙂<br>Випий води або обійми маму.</p>
          <div class="row">
            <button class="mid-btn pop" data-act="again-now">Ще раз</button>
            <button class="big-btn pop" data-act="menu">До меню</button>
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
            <li>Раунд триває одну хвилину. Кожні три раунди гра пропонує перепочити.</li>
            <li>Режим «Перед процедурою» допомагає заспокоїтися — дихайте разом з дитиною.</li>
            <li>Факти про здоров'я взято з відкритих джерел (ВООЗ, CDC, MedlinePlus, USDA). Вони чекають на перевірку лікарем.</li>
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
