// Original "Glossy Candy" vector art, generated as SVG strings (no DOM, no Pixi:
// importable from Node for validation). Every drawing uses a 200x200 viewBox
// with the subject centred at (100, 100) and radius about 75.
//
// Fruits never have faces: slicing a face would read as hurting a character.
// Eyes live in a separate layer so the renderer can blink them.

const INK = '#2b2d42';

const wrap = (inner, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">` +
  `<defs>${defs}</defs>${inner}</svg>`;

const radial = (id, light, base, dark) =>
  `<radialGradient id="${id}" cx="36%" cy="30%" r="75%">` +
  `<stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${base}"/>` +
  `<stop offset="1" stop-color="${dark}"/></radialGradient>`;

const linear = (id, top, bottom) =>
  `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">` +
  `<stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>`;

const SHINE =
  `<radialGradient id="shine" cx="50%" cy="50%" r="50%">` +
  `<stop offset="0" stop-color="#fff" stop-opacity="0.95"/>` +
  `<stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;

// Glossy highlight: soft ellipse plus a crisp dot.
const gloss = (cx, cy, rx = 26, ry = 14, rot = -35) =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="url(#shine)" transform="rotate(${rot} ${cx} ${cy})"/>` +
  `<circle cx="${cx - rx * 0.35}" cy="${cy - ry * 0.1}" r="${Math.max(3, ry * 0.32)}" fill="#fff" opacity="0.9"/>`;

function eyePair(y, { gap = 24, r = 14, look = 0, cx = 100 } = {}) {
  const one = (x) =>
    `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 1.18}" fill="#fff" stroke="${INK}" stroke-width="3"/>` +
    `<circle cx="${x + look}" cy="${y + 2}" r="${r * 0.62}" fill="${INK}"/>` +
    `<circle cx="${x + look - r * 0.22}" cy="${y - r * 0.28}" r="${r * 0.26}" fill="#fff"/>` +
    `<circle cx="${x + look + r * 0.22}" cy="${y + r * 0.3}" r="${r * 0.12}" fill="#fff"/>`;
  return one(cx - gap) + one(cx + gap);
}

const blush = (y, gap = 42, cx = 100) =>
  `<ellipse cx="${cx - gap}" cy="${y}" rx="11" ry="6" fill="#ff7aa8" opacity="0.5"/>` +
  `<ellipse cx="${cx + gap}" cy="${y}" rx="11" ry="6" fill="#ff7aa8" opacity="0.5"/>`;

const smile = (y, w = 16, cx = 100) =>
  `<path d="M ${cx - w} ${y} Q ${cx} ${y + w * 0.95} ${cx + w} ${y}" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`;

// Closed smooth blob from a polar radius function.
function blobPath(rf, cx = 100, cy = 100, n = 72) {
  const pts = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = rf(a);
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n; i++) {
    const p = pts[(i + 1) % n];
    const q = pts[(i + 2) % n];
    d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
  }
  return `${d} Z`;
}

// ---------------------------------------------------------------- microbes

const chykhunchyk = {
  name: 'Чихунчик',
  line: 'Любить, коли чхають без серветки. Серветка — і бувай!',
  eyeY: 90,
  body() {
    const nubs = Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2 - Math.PI / 2;
      const x = 100 + Math.cos(a) * 70;
      const y = 104 + Math.sin(a) * 70;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="15" fill="url(#g)" stroke="#3f9d2e" stroke-width="4"/>`;
    }).join('');
    return wrap(
      nubs +
        `<circle cx="100" cy="104" r="64" fill="url(#g)" stroke="#3f9d2e" stroke-width="5"/>` +
        gloss(76, 72) +
        blush(118, 40) +
        `<ellipse cx="100" cy="132" rx="10" ry="12" fill="${INK}"/>` +
        `<ellipse cx="100" cy="138" rx="6" ry="4" fill="#ff8fab"/>`,
      radial('g', '#d6ffb0', '#7ed957', '#3f9d2e') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(90, { gap: 24, r: 15, look: 2 })),
};

const brudnulya = {
  name: 'Бруднюля',
  line: 'Живе на немитих руках. Мило — і її вже нема!',
  eyeY: 82,
  body() {
    const tails = [70, 100, 130]
      .map((x) => `<path d="M ${x} 168 q -10 12 0 22 q 10 10 0 20" fill="none" stroke="#6a3fc0" stroke-width="5" stroke-linecap="round"/>`)
      .join('');
    return wrap(
      tails +
        `<g transform="rotate(-14 100 100)">` +
        `<rect x="52" y="22" width="96" height="152" rx="48" fill="url(#g)" stroke="#6a3fc0" stroke-width="5"/>` +
        gloss(80, 52, 22, 12, -60) +
        `</g>` +
        blush(110, 36) +
        `<path d="M 72 112 q 14 -12 28 0 q 14 -12 28 0 q -6 10 -14 6 q -8 -4 -14 -2 q -6 -2 -14 2 q -8 4 -14 -6 Z" fill="#5a3d2b"/>` +
        smile(124, 10),
      radial('g', '#eadcff', '#a77bf3', '#6a3fc0') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(82, { gap: 20, r: 13, look: -2 })),
};

const lypuchka = {
  name: 'Липучка',
  line: 'Чіпляється до всього. Але мильна хвиля спритніша!',
  eyeY: 88,
  body() {
    const d = blobPath((a) => 66 + 7 * Math.sin(5 * a + 0.6) + 3 * Math.sin(2 * a));
    return wrap(
      `<path d="${d}" fill="url(#g)" stroke="#2f6fd6" stroke-width="5"/>` +
        gloss(74, 66) +
        blush(114, 44) +
        smile(118, 18) +
        `<path d="M 94 128 q 6 16 14 0" fill="#ff8fab" stroke="${INK}" stroke-width="3"/>`,
      radial('g', '#cfe8ff', '#4fa8ff', '#2f6fd6') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(88, { gap: 26, r: 12, look: 3, cx: 92 })),
};

const kashlyuk = {
  name: 'Кашлюк',
  line: 'Кахи-кахи! Прикривай рот ліктем — і він засмутиться.',
  eyeY: 88,
  body() {
    const spots = [[66, 140, 7], [140, 62, 6], [134, 142, 9], [60, 70, 5]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff4b8" opacity="0.7"/>`)
      .join('');
    return wrap(
      `<rect x="34" y="34" width="132" height="132" rx="38" fill="url(#g)" stroke="#d19a00" stroke-width="5"/>` +
        spots +
        gloss(70, 62) +
        blush(114, 42) +
        `<path d="M 80 128 q 7 -8 14 0 q 7 8 14 0 q 7 -8 14 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>`,
      radial('g', '#fff6c4', '#ffd23f', '#d19a00') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(88, { gap: 24, r: 13, look: 0 })),
};

// The microbe king: the biggest character of the game. He flies out alone on
// his own points mark and gives one point per cut
// until his five seconds end and he bursts. `juice`/`flesh` colour his cut.
const korol = {
  name: 'Король мікробів',
  line: 'Найбільший мікроб у світі! Його слухаються всі пустуни.',
  eyeY: 92,
  juice: 0x7ed957,
  flesh: '#eaffd0',
  body() {
    const nubs = Array.from({ length: 11 }, (_, i) => {
      const a = (i / 11) * Math.PI * 2 - Math.PI / 2;
      const x = 100 + Math.cos(a) * 72;
      const y = 106 + Math.sin(a) * 72;
      return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="url(#g)" stroke="#3f9d2e" stroke-width="4"/>`;
    }).join('');
    const crown =
      `<path d="M 60 52 L 60 22 L 78 40 L 90 14 L 100 36 L 110 14 L 122 40 L 140 22 L 140 52 Z" fill="#ffd23f" stroke="#d99b00" stroke-width="5" stroke-linejoin="round"/>` +
      `<circle cx="100" cy="54" r="6" fill="#ff5c9a" stroke="#d99b00" stroke-width="2"/>` +
      `<circle cx="73" cy="56" r="4.5" fill="#4fb3ff" stroke="#d99b00" stroke-width="2"/>` +
      `<circle cx="127" cy="56" r="4.5" fill="#4fb3ff" stroke="#d99b00" stroke-width="2"/>`;
    return wrap(
      nubs +
        crown +
        `<circle cx="100" cy="106" r="66" fill="url(#g)" stroke="#3f9d2e" stroke-width="5"/>` +
        gloss(74, 74) +
        blush(122, 42) +
        `<path d="M 78 118 Q 100 146 122 118 Q 100 130 78 118 Z" fill="#7a2e44" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` +
        `<ellipse cx="100" cy="127" rx="9" ry="5" fill="#ff8fab"/>`,
      radial('g', '#d6ffb0', '#7ed957', '#3f9d2e') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(92, { gap: 25, r: 15, look: 2 })),
};

// ---------------------------------------------------------------- body cells

const chervonya = {
  name: 'Червоня',
  line: 'Еритроцит. Носить кисень у рюкзачку по всьому тілу.',
  eyeY: 92,
  body() {
    const pack =
      `<rect x="128" y="62" width="44" height="64" rx="16" fill="#8fd3ff" stroke="#3a8dc9" stroke-width="4"/>` +
      `<circle cx="150" cy="54" r="9" fill="#d8f1ff" stroke="#3a8dc9" stroke-width="3"/>` +
      `<circle cx="164" cy="40" r="6" fill="#d8f1ff" stroke="#3a8dc9" stroke-width="3"/>` +
      `<circle cx="146" cy="30" r="4" fill="#d8f1ff" stroke="#3a8dc9" stroke-width="2"/>`;
    return wrap(
      pack +
        `<circle cx="96" cy="104" r="68" fill="url(#g)" stroke="#b81e3a" stroke-width="5"/>` +
        `<circle cx="96" cy="108" r="38" fill="url(#c)" opacity="0.75"/>` +
        gloss(70, 66) +
        blush(118, 44, 96) +
        smile(122, 16, 96),
      radial('g', '#ffb3bd', '#ff4d5e', '#b81e3a') +
        radial('c', '#d6303f', '#e8414f', '#ff6b78') +
        SHINE,
    );
  },
  eyes: () => wrap(eyePair(92, { gap: 22, r: 13, cx: 96 })),
};

const bilyk = {
  name: 'Білик',
  line: 'Лейкоцит-помічник. Щодня охороняє тебе від мікробів.',
  eyeY: 104,
  body() {
    const d = blobPath((a) => 62 + 5 * Math.sin(7 * a) + 3 * Math.sin(3 * a + 1), 100, 112);
    const cap =
      `<path d="M 58 62 Q 60 22 100 20 Q 140 22 142 62 Z" fill="#ffffff" stroke="#8a86d6" stroke-width="4"/>` +
      `<rect x="54" y="56" width="92" height="16" rx="8" fill="#e9e7ff" stroke="#8a86d6" stroke-width="4"/>` +
      `<path d="M 100 48 c -4 -8 -16 -6 -14 3 c 1 6 14 13 14 13 c 0 0 13 -7 14 -13 c 2 -9 -10 -11 -14 -3 Z" fill="#dd2590"/>`;
    return wrap(
      `<path d="${d}" fill="url(#g)" stroke="#8a86d6" stroke-width="5"/>` +
        gloss(72, 92) +
        blush(126, 42) +
        smile(130, 18) +
        cap,
      radial('g', '#ffffff', '#eceaff', '#b3b0ec') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(104, { gap: 24, r: 14 })),
};

const latochka = {
  name: 'Латочка',
  line: 'Тромбоцит. Разом з друзями латає ранки.',
  eyeY: 90,
  body() {
    const d = blobPath((a) => 58 + 6 * Math.sin(4 * a + 0.3) + 4 * Math.sin(3 * a), 100, 104);
    const aid =
      `<g transform="rotate(-32 92 138)">` +
      `<rect x="44" y="124" width="96" height="30" rx="15" fill="#f6c48f" stroke="#c98a4f" stroke-width="3"/>` +
      `<rect x="78" y="126" width="28" height="26" rx="6" fill="#fde3c5"/>` +
      `<circle cx="58" cy="139" r="2.5" fill="#c98a4f"/><circle cx="68" cy="139" r="2.5" fill="#c98a4f"/>` +
      `<circle cx="116" cy="139" r="2.5" fill="#c98a4f"/><circle cx="126" cy="139" r="2.5" fill="#c98a4f"/></g>`;
    return wrap(
      `<path d="${d}" fill="url(#g)" stroke="#d9a400" stroke-width="5"/>` + gloss(74, 70) + blush(112, 40) + smile(114, 14) + aid,
      radial('g', '#fff7d1', '#ffe08a', '#d9a400') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(90, { gap: 22, r: 13 })),
};

// ---------------------------------------------------------------- fruits

const leaf = (x, y, rot, color = '#4cc75a') =>
  `<path d="M ${x} ${y} q 18 -22 40 -8 q -16 22 -40 8 Z" fill="${color}" stroke="#2f8f3a" stroke-width="3" transform="rotate(${rot} ${x} ${y})"/>`;

const orange = {
  name: 'Апельсинка',
  line: 'Повна вітаміну C!',
  flesh: '#ffc35a',
  juice: 0xffa62b,
  body() {
    const dots = Array.from({ length: 22 }, (_, i) => {
      const a = i * 2.39996;
      const r = 18 + ((i * 37) % 48);
      return `<circle cx="${(100 + Math.cos(a) * r).toFixed(1)}" cy="${(106 + Math.sin(a) * r).toFixed(1)}" r="2.2" fill="#d96a00" opacity="0.28"/>`;
    }).join('');
    return wrap(
      `<circle cx="100" cy="106" r="70" fill="url(#g)" stroke="#d96a00" stroke-width="5"/>` +
        dots +
        `<path d="M 100 40 q 2 -10 -2 -16" stroke="#7a4a1d" stroke-width="5" stroke-linecap="round" fill="none"/>` +
        leaf(100, 34, -10) +
        gloss(72, 72),
      radial('g', '#ffe1a3', '#ff9f1c', '#e0700a') + SHINE,
    );
  },
};

const apple = {
  name: 'Яблучко',
  line: 'Хрум! Зі шкіркою ще корисніше.',
  flesh: '#fff4d6',
  juice: 0xfff0b8,
  body() {
    return wrap(
      `<path d="M 100 58 C 70 34 26 52 30 100 C 34 150 70 178 100 166 C 130 178 166 150 170 100 C 174 52 130 34 100 58 Z" fill="url(#g)" stroke="#b81e2a" stroke-width="5"/>` +
        `<path d="M 100 60 q -2 -20 8 -30" stroke="#7a4a1d" stroke-width="6" stroke-linecap="round" fill="none"/>` +
        leaf(106, 36, -24) +
        gloss(64, 82),
      radial('g', '#ffb0b0', '#ff3b3b', '#b81e2a') + SHINE,
    );
  },
};

const kiwi = {
  name: 'Ківі',
  line: 'Маленьке, але дуже вітамінне!',
  flesh: '#9be15d',
  juice: 0xa6e86a,
  body() {
    const fuzz = Array.from({ length: 40 }, (_, i) => {
      const a = i * 2.39996;
      const r = 12 + ((i * 29) % 52);
      const x = 100 + Math.cos(a) * r * 1.1;
      const y = 102 + Math.sin(a) * r * 0.9;
      return `<path d="M ${x.toFixed(1)} ${y.toFixed(1)} l 3 4" stroke="#e8cfa0" stroke-width="2" opacity="0.45"/>`;
    }).join('');
    return wrap(
      `<ellipse cx="100" cy="102" rx="74" ry="62" fill="url(#g)" stroke="#5e4423" stroke-width="5"/>` + fuzz + gloss(72, 72),
      radial('g', '#dcbb86', '#a0804c', '#5e4423') + SHINE,
    );
  },
};

const strawberry = {
  name: 'Полуничка',
  line: 'Солодка і з вітаміном C.',
  flesh: '#ff8fa3',
  juice: 0xff4d6d,
  body() {
    const seeds = [];
    for (let row = 0; row < 5; row++) {
      for (let col = -2; col <= 2; col++) {
        const x = 100 + col * 22 + (row % 2) * 11;
        const y = 76 + row * 20;
        const half = 62 - row * 10;
        if (Math.abs(x - 100) < half) seeds.push(`<ellipse cx="${x}" cy="${y}" rx="3" ry="4.5" fill="#ffe27a"/>`);
      }
    }
    return wrap(
      `<path d="M 100 182 C 60 160 30 120 34 84 C 38 54 70 48 100 56 C 130 48 162 54 166 84 C 170 120 140 160 100 182 Z" fill="url(#g)" stroke="#c2183a" stroke-width="5"/>` +
        seeds.join('') +
        `<path d="M 100 64 l -34 -10 l 22 -6 l -8 -20 l 20 14 l 10 -18 l 6 20 l 22 -10 l -12 18 l 26 8 Z" fill="#4cc75a" stroke="#2f8f3a" stroke-width="3" stroke-linejoin="round"/>` +
        gloss(68, 92),
      radial('g', '#ffb3c1', '#ff3b5c', '#c2183a') + SHINE,
    );
  },
};

const broccoli = {
  name: 'Броколі',
  line: 'Маленьке деревце, повне вітамінів.',
  flesh: '#c9ee9a',
  juice: 0x9be15d,
  body() {
    const florets = [[66, 82, 30], [134, 82, 30], [100, 62, 34], [82, 100, 28], [118, 100, 28]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#g)" stroke="#2f7d32" stroke-width="4"/>`)
      .join('');
    return wrap(
      `<path d="M 84 110 L 74 176 Q 100 186 126 176 L 116 110 Z" fill="url(#s)" stroke="#5f9e3a" stroke-width="4"/>` +
        florets +
        gloss(84, 50, 20, 10),
      radial('g', '#a7e88a', '#4caf50', '#2f7d32') + linear('s', '#dff5b8', '#a6d672') + SHINE,
    );
  },
};

// ---------------------------------------------------------------- bonuses

const soap = {
  name: 'Мильце',
  line: 'Мильна піна змиває мікробів з рук.',
  body() {
    const foam = [[64, 58, 16], [86, 46, 20], [112, 50, 15], [132, 60, 12], [150, 70, 8]]
      .map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" stroke="#9fd8ff" stroke-width="3"/>`)
      .join('');
    return wrap(
      `<g transform="rotate(-10 100 110)">` +
        `<rect x="36" y="70" width="128" height="86" rx="30" fill="url(#g)" stroke="#d9439b" stroke-width="5"/>` +
        `<path d="M 100 104 c -6 -12 -24 -9 -21 4 c 2 9 21 19 21 19 c 0 0 19 -10 21 -19 c 3 -13 -15 -16 -21 -4 Z" fill="#ffffff" opacity="0.55"/>` +
        gloss(68, 86, 24, 10, -10) +
        `</g>` +
        foam,
      radial('g', '#ffe0f1', '#ff7ac8', '#d9439b') + SHINE,
    );
  },
};

const vaccine = {
  name: 'Щеплення',
  line: 'Вчить тіло заздалегідь впізнавати мікробів.',
  body() {
    const star = 'M 100 104 l 7 15 l 16 2 l -12 11 l 3 16 l -14 -8 l -14 8 l 3 -16 l -12 -11 l 16 -2 Z';
    return wrap(
      `<circle cx="100" cy="104" r="80" fill="url(#halo)"/>` +
        `<rect x="66" y="58" width="68" height="116" rx="22" fill="#e9f8ff" fill-opacity="0.75" stroke="#3a8dc9" stroke-width="5"/>` +
        `<path d="M 70 104 H 130 V 152 Q 130 170 112 170 H 88 Q 70 170 70 152 Z" fill="url(#liq)"/>` +
        `<path d="${star}" fill="#ffe27a" stroke="#e0a800" stroke-width="3" stroke-linejoin="round"/>` +
        `<rect x="72" y="30" width="56" height="32" rx="10" fill="#dd2590" stroke="#a3166a" stroke-width="4"/>` +
        gloss(84, 84, 10, 26, 0),
      `<radialGradient id="halo"><stop offset="0.55" stop-color="#7df3e1" stop-opacity="0.45"/><stop offset="1" stop-color="#7df3e1" stop-opacity="0"/></radialGradient>` +
        linear('liq', '#8ff7e8', '#22b8cf') +
        SHINE,
    );
  },
};

const patch = {
  name: 'Пластир',
  line: 'Береже ранку, поки вона гоїться.',
  body() {
    const holes = [56, 70, 130, 144]
      .flatMap((x) => [92, 108].map((y) => `<circle cx="${x}" cy="${y}" r="3" fill="#c98a4f"/>`))
      .join('');
    return wrap(
      `<g transform="rotate(-30 100 100)">` +
        `<rect x="22" y="70" width="156" height="60" rx="30" fill="url(#g)" stroke="#c98a4f" stroke-width="5"/>` +
        `<rect x="76" y="74" width="48" height="52" rx="10" fill="#fde9d3"/>` +
        `<path d="M 100 92 c -5 -9 -18 -7 -16 3 c 1 7 16 15 16 15 c 0 0 15 -8 16 -15 c 2 -10 -11 -12 -16 -3 Z" fill="#ff5c8a"/>` +
        holes +
        gloss(52, 84, 18, 8, 0) +
        `</g>`,
      linear('g', '#ffd9b3', '#f2ad6e') + SHINE,
    );
  },
};

// ---------------------------------------------------------------- sticker-only art

const towel = {
  name: 'Рушничок',
  line: 'Чисті руки витирай чистим рушником.',
  body: () =>
    wrap(
      `<rect x="38" y="44" width="124" height="120" rx="20" fill="url(#g)" stroke="#1b8f8a" stroke-width="5"/>` +
        `<rect x="38" y="118" width="124" height="12" fill="#ffffff" opacity="0.8"/>` +
        `<rect x="38" y="138" width="124" height="8" fill="#dd2590" opacity="0.7"/>` +
        `<path d="M 38 64 Q 100 92 162 64 L 162 84 Q 100 112 38 84 Z" fill="#ffffff" opacity="0.35"/>` +
        gloss(70, 66),
      radial('g', '#c6fff6', '#3fd1c3', '#1b8f8a') + SHINE,
    ),
};

const bubble = {
  name: 'Бульбашка',
  line: 'Кожна мильна бульбашка ловить мікробів.',
  body: () =>
    wrap(
      `<circle cx="100" cy="100" r="76" fill="url(#b)" stroke="#ffffff" stroke-opacity="0.85" stroke-width="3"/>` +
        `<path d="M 44 120 A 60 60 0 0 0 120 160" fill="none" stroke="#ff9de2" stroke-width="5" stroke-opacity="0.6" stroke-linecap="round"/>` +
        `<path d="M 150 70 A 60 60 0 0 1 160 110" fill="none" stroke="#8ff0ff" stroke-width="5" stroke-opacity="0.7" stroke-linecap="round"/>` +
        gloss(70, 64, 28, 14),
      `<radialGradient id="b" cx="50%" cy="50%" r="50%">` +
        `<stop offset="0.6" stop-color="#ffffff" stop-opacity="0.04"/>` +
        `<stop offset="0.85" stop-color="#c9f3ff" stop-opacity="0.35"/>` +
        `<stop offset="1" stop-color="#ffd6f5" stop-opacity="0.75"/></radialGradient>` +
        SHINE,
    ),
};

const water = {
  name: 'Крапелька',
  line: 'Вода допомагає тілу працювати.',
  eyeY: 116,
  body: () =>
    wrap(
      `<path d="M 100 22 C 120 60 160 92 160 128 C 160 162 132 182 100 182 C 68 182 40 162 40 128 C 40 92 80 60 100 22 Z" fill="url(#g)" stroke="#1f78c9" stroke-width="5"/>` +
        gloss(76, 100) +
        blush(146, 38) +
        smile(148, 14),
      radial('g', '#d6f0ff', '#4fb3ff', '#1f78c9') + SHINE,
    ),
  eyes: () => wrap(eyePair(116, { gap: 22, r: 13 })),
};

const carrot = {
  name: 'Морквинка',
  line: 'З неї тіло робить вітамін А для очей.',
  flesh: '#ffb066',
  juice: 0xff8a1c,
  body: () =>
    wrap(
      `<path d="M 70 46 Q 130 40 136 62 L 92 182 Q 84 186 80 178 L 62 66 Q 60 50 70 46 Z" fill="url(#g)" stroke="#d65a00" stroke-width="5"/>` +
        `<path d="M 76 82 l 20 -2 M 82 112 l 18 -3 M 86 142 l 12 -2" stroke="#d65a00" stroke-width="3" stroke-linecap="round"/>` +
        leaf(98, 46, -70) +
        leaf(98, 46, -110) +
        gloss(80, 70, 10, 22, -10),
      radial('g', '#ffc98a', '#ff8a1c', '#d65a00') + SHINE,
    ),
};

const jar = {
  name: "Баночка здоров'я",
  line: 'Тут живуть усі зібрані вітаміни.',
  body: () =>
    wrap(
      `<rect x="44" y="56" width="112" height="124" rx="28" fill="#e9fbff" fill-opacity="0.8" stroke="#3a8dc9" stroke-width="5"/>` +
        `<circle cx="80" cy="140" r="16" fill="#ffa62b"/><circle cx="116" cy="146" r="14" fill="#9be15d"/>` +
        `<circle cx="100" cy="116" r="15" fill="#ff4d6d"/><circle cx="128" cy="116" r="10" fill="#ffe27a"/>` +
        `<circle cx="74" cy="110" r="9" fill="#4fb3ff"/>` +
        `<rect x="54" y="34" width="92" height="28" rx="10" fill="#dd2590" stroke="#a3166a" stroke-width="4"/>` +
        gloss(70, 88, 10, 26, 0),
      SHINE,
    ),
};

const heart = {
  name: 'Серденько',
  line: 'Качає кров день і ніч, навіть коли ти спиш.',
  eyeY: 92,
  body: () =>
    wrap(
      `<path d="M 100 176 C 40 136 18 104 24 72 C 30 40 74 30 100 62 C 126 30 170 40 176 72 C 182 104 160 136 100 176 Z" fill="url(#g)" stroke="#c2185b" stroke-width="5"/>` +
        gloss(58, 64) +
        blush(118, 44) +
        smile(120, 16),
      radial('g', '#ffc1d9', '#ff5c9a', '#c2185b') + SHINE,
    ),
  eyes: () => wrap(eyePair(92, { gap: 24, r: 14 })),
};

const oxygen = {
  name: 'Кисневий пузирик',
  line: 'Кисень потрібен кожній клітинці тіла.',
  body: () =>
    wrap(
      `<circle cx="100" cy="100" r="72" fill="url(#g)" stroke="#3a8dc9" stroke-width="5"/>` +
        `<text x="100" y="124" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" font-size="64" fill="#1f5063">O₂</text>` +
        gloss(70, 64),
      radial('g', '#ffffff', '#bfe7ff', '#6fb7ea') + SHINE,
    ),
};

const shield = {
  name: 'Щит імунітету',
  line: 'Імунітет — твій добрий охоронець.',
  body: () =>
    wrap(
      `<path d="M 100 24 L 164 48 Q 166 128 100 178 Q 34 128 36 48 Z" fill="url(#g)" stroke="#c98a00" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M 100 64 l 10 22 l 24 3 l -18 16 l 5 24 l -21 -12 l -21 12 l 5 -24 l -18 -16 l 24 -3 Z" fill="#ffffff" opacity="0.9"/>` +
        gloss(70, 62),
      radial('g', '#fff2b0', '#ffd23f', '#c98a00') + SHINE,
    ),
};

// ---------------------------------------------------------------- mouth

const zubchyk = {
  name: 'Зубчик',
  line: 'Любить, коли його чистять двічі на день.',
  eyeY: 84,
  body: () =>
    wrap(
      `<path d="M 52 40 Q 76 22 100 36 Q 124 22 148 40 Q 170 60 160 104 Q 154 134 146 170 Q 140 186 128 176 Q 118 140 100 140 Q 82 140 72 176 Q 60 186 54 170 Q 46 134 40 104 Q 30 60 52 40 Z" fill="url(#g)" stroke="#9fb7d6" stroke-width="5" stroke-linejoin="round"/>` +
        gloss(72, 58) +
        blush(108, 38) +
        smile(110, 16) +
        `<path d="M 118 46 l 4 -10 l 4 10 l 10 4 l -10 4 l -4 10 l -4 -10 l -10 -4 Z" fill="#8fe3f7"/>`,
      radial('g', '#ffffff', '#f4f8ff', '#c9d8ee') + SHINE,
    ),
  eyes: () => wrap(eyePair(84, { gap: 22, r: 13 })),
};

const toothbrush = {
  name: 'Щіточка',
  line: 'Чисть зубки дві хвилини — вранці та ввечері.',
  body: () =>
    wrap(
      `<g transform="rotate(-35 100 100)">` +
        `<rect x="22" y="92" width="120" height="22" rx="11" fill="url(#g)" stroke="#2f8fb8" stroke-width="4"/>` +
        `<rect x="132" y="84" width="46" height="34" rx="10" fill="#ffffff" stroke="#2f8fb8" stroke-width="4"/>` +
        [138, 148, 158, 168]
          .map((x, i) => `<rect x="${x}" y="56" width="7" height="30" rx="3" fill="${i % 2 ? '#ffffff' : '#8fe3f7'}" stroke="#2f8fb8" stroke-width="2"/>`)
          .join('') +
        `<circle cx="150" cy="46" r="12" fill="#ffffff" stroke="#9fd8ff" stroke-width="3"/>` +
        `<circle cx="168" cy="40" r="8" fill="#ffffff" stroke="#9fd8ff" stroke-width="3"/>` +
        gloss(54, 98, 20, 5, 0) +
        `</g>`,
      linear('g', '#7fdcff', '#2fa8d8') + SHINE,
    ),
};

const toothpaste = {
  name: 'Пасточка',
  line: 'Для дітей вистачить пасти розміром з горошину.',
  body: () =>
    wrap(
      `<g transform="rotate(-20 100 100)">` +
        `<path d="M 40 70 L 140 62 L 140 138 L 40 130 Q 30 100 40 70 Z" fill="url(#g)" stroke="#2f8fb8" stroke-width="5" stroke-linejoin="round"/>` +
        `<rect x="138" y="80" width="26" height="40" rx="6" fill="#dd2590" stroke="#a3166a" stroke-width="4"/>` +
        `<rect x="60" y="88" width="56" height="22" rx="11" fill="#ffffff" opacity="0.85"/>` +
        `<path d="M 74 99 l 10 0 M 92 99 l 10 0" stroke="#8fe3f7" stroke-width="5" stroke-linecap="round"/>` +
        gloss(64, 76, 22, 6, 0) +
        `</g>` +
        `<circle cx="164" cy="56" r="13" fill="#ffffff" stroke="#8fe3f7" stroke-width="4"/>`,
      linear('g', '#ffffff', '#cfefff') + SHINE,
    ),
};

const kysliuk = {
  name: 'Кислюк',
  line: 'Любить цукор і псує зубки. Щіточка — і його нема!',
  eyeY: 98,
  body() {
    const d = blobPath((a) => 62 + 9 * Math.sin(3 * a - Math.PI / 2) + 3 * Math.sin(6 * a), 100, 108);
    return wrap(
      `<path d="${d}" fill="url(#g)" stroke="#c46a00" stroke-width="5"/>` +
        `<circle cx="70" cy="140" r="6" fill="#ffe7a8" opacity="0.8"/><circle cx="134" cy="132" r="8" fill="#ffe7a8" opacity="0.8"/>` +
        gloss(76, 76) +
        blush(124, 40) +
        `<path d="M 86 130 q 14 12 28 0" fill="none" stroke="${INK}" stroke-width="4.5" stroke-linecap="round"/>` +
        `<path d="M 108 134 l 4 9 l 5 -10" fill="#ffffff" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round"/>`,
      radial('g', '#ffe7a8', '#ffb23f', '#c46a00') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(98, { gap: 22, r: 13, look: 3 })),
};

// ---------------------------------------------------------------- tummy

const dobryk = {
  name: 'Добрик',
  line: 'Корисна бактерія. Допомагає животику — не чіпай!',
  eyeY: 98,
  body() {
    const d = blobPath((a) => 64 + 4 * Math.sin(4 * a + 0.5), 100, 106);
    const halo = `<ellipse cx="100" cy="28" rx="34" ry="9" fill="none" stroke="#ffd23f" stroke-width="7"/>`;
    const heart = `<path d="M 100 156 c -4 -8 -16 -6 -14 3 c 1 6 14 13 14 13 c 0 0 13 -7 14 -13 c 2 -9 -10 -11 -14 -3 Z" fill="#ff5c9a" stroke="#ffffff" stroke-width="2"/>`;
    return wrap(
      halo +
        `<path d="${d}" fill="url(#g)" stroke="#e08a00" stroke-width="5"/>` +
        gloss(74, 74) +
        blush(124, 42) +
        smile(126, 18) +
        heart,
      radial('g', '#fff8cf', '#ffd86b', '#e0a400') + SHINE,
    );
  },
  eyes: () => wrap(eyePair(98, { gap: 24, r: 14 })),
};

const yogurt = {
  name: 'Йогуртик',
  line: 'Може містити живих корисних бактерій.',
  body: () =>
    wrap(
      `<path d="M 50 64 L 150 64 L 138 170 Q 136 180 126 180 L 74 180 Q 64 180 62 170 Z" fill="url(#g)" stroke="#9fb7d6" stroke-width="5" stroke-linejoin="round"/>` +
        `<rect x="44" y="48" width="112" height="22" rx="8" fill="#dd2590" stroke="#a3166a" stroke-width="4"/>` +
        `<circle cx="100" cy="122" r="26" fill="#ffd6e7"/>` +
        `<circle cx="92" cy="116" r="7" fill="#ff5c9a"/><circle cx="108" cy="126" r="6" fill="#ff5c9a"/><circle cx="104" cy="110" r="4" fill="#ff8fb8"/>` +
        gloss(70, 90, 8, 24, 0),
      linear('g', '#ffffff', '#e9f1ff') + SHINE,
    ),
};

const banana = {
  name: 'Банан',
  line: 'Солодкий перекус, у якому є калій.',
  flesh: '#fff3b0',
  juice: 0xffe066,
  body: () =>
    wrap(
      `<path d="M 40 70 Q 42 150 120 162 Q 162 166 172 140 Q 120 144 92 120 Q 66 98 62 64 Q 50 56 40 70 Z" fill="url(#g)" stroke="#c99a00" stroke-width="5" stroke-linejoin="round"/>` +
        `<path d="M 40 70 l -6 -14 l 12 2 Z" fill="#7a5a1d"/>` +
        `<path d="M 172 140 l 10 4 l -6 6 Z" fill="#7a5a1d"/>` +
        `<path d="M 58 84 Q 66 130 120 148" fill="none" stroke="#fff6c4" stroke-width="5" stroke-linecap="round" opacity="0.8"/>`,
      radial('g', '#fff6c4', '#ffe14d', '#e0b400') + SHINE,
    ),
};

const plate = {
  name: 'Тарілочка',
  line: 'Половина тарілки — овочі та фрукти.',
  body: () =>
    wrap(
      `<circle cx="100" cy="104" r="76" fill="#ffffff" stroke="#9fb7d6" stroke-width="5"/>` +
        `<circle cx="100" cy="104" r="60" fill="#f4f8ff"/>` +
        `<path d="M 100 104 L 100 44 A 60 60 0 0 1 160 104 Z" fill="#7ed957"/>` +
        `<path d="M 100 104 L 160 104 A 60 60 0 0 1 100 164 Z" fill="#ff9f1c"/>` +
        `<path d="M 100 104 L 100 164 A 60 60 0 0 1 40 104 Z" fill="#ffd27a"/>` +
        `<path d="M 100 104 L 40 104 A 60 60 0 0 1 100 44 Z" fill="#ff8fab"/>` +
        gloss(64, 64, 22, 10),
      SHINE,
    ),
};

// ---------------------------------------------------------------- skin

const hat = {
  name: 'Панамка',
  line: 'Береже голову від сонця влітку.',
  body: () =>
    wrap(
      `<ellipse cx="100" cy="132" rx="84" ry="26" fill="url(#g)" stroke="#2f8fb8" stroke-width="5"/>` +
        `<path d="M 50 130 Q 52 58 100 54 Q 148 58 150 130 Z" fill="url(#g)" stroke="#2f8fb8" stroke-width="5"/>` +
        `<path d="M 52 118 Q 100 132 148 118 L 149 128 Q 100 142 51 128 Z" fill="#dd2590"/>` +
        `<circle cx="80" cy="88" r="6" fill="#ffffff" opacity="0.8"/><circle cx="114" cy="80" r="5" fill="#ffffff" opacity="0.8"/><circle cx="104" cy="104" r="4" fill="#ffffff" opacity="0.8"/>` +
        gloss(76, 76, 18, 8),
      radial('g', '#c9f3ff', '#4fcdf5', '#2f8fb8') + SHINE,
    ),
};

const cream = {
  name: 'Кремчик',
  line: 'Сонцезахисний крем — для прогулянок під сонцем.',
  body: () =>
    wrap(
      `<g transform="rotate(18 100 100)">` +
        `<rect x="62" y="40" width="76" height="120" rx="22" fill="url(#g)" stroke="#e0a400" stroke-width="5"/>` +
        `<rect x="76" y="160" width="48" height="22" rx="6" fill="#ff9f1c" stroke="#d96a00" stroke-width="4"/>` +
        `<circle cx="100" cy="90" r="20" fill="#ffd23f" stroke="#ffffff" stroke-width="4"/>` +
        [0, 45, 90, 135, 180, 225, 270, 315]
          .map((deg) => {
            const r = (deg * Math.PI) / 180;
            const p = (k) => `${(100 + Math.cos(r) * k).toFixed(1)} ${(90 + Math.sin(r) * k).toFixed(1)}`;
            return `<path d="M ${p(26)} L ${p(34)}" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>`;
          })
          .join('') +
        gloss(80, 64, 8, 22, 0) +
        `</g>`,
      linear('g', '#fff8d6', '#ffe07a') + SHINE,
    ),
};

// Tutorial ghost hand (pointing finger).
const hand = {
  name: 'Підказка',
  line: '',
  body: () =>
    wrap(
      `<path d="M 86 30 Q 86 16 98 16 Q 110 16 110 30 L 110 92 L 118 92 Q 130 84 138 94 L 146 100 Q 160 96 164 110 L 164 150 Q 164 186 124 186 L 96 186 Q 70 186 58 160 L 40 122 Q 36 108 50 106 Q 60 104 68 116 L 86 140 Z" fill="#ffffff" stroke="#1f5063" stroke-width="6" stroke-linejoin="round"/>`,
    ),
};

export const ART = {
  chykhunchyk, brudnulya, lypuchka, kashlyuk, korol,
  chervonya, bilyk, latochka,
  orange, apple, kiwi, strawberry, broccoli,
  soap, vaccine, patch,
  towel, bubble, water, carrot, jar, heart, oxygen, shield,
  zubchyk, toothbrush, toothpaste, kysliuk,
  dobryk, yogurt, banana, plate,
  hat, cream,
  hand,
};

// Body + eyes in one SVG, for stickers and DOM images.
export function fullSvg(key) {
  const a = ART[key];
  const body = a.body();
  if (!a.eyes) return body;
  const eyes = a.eyes().replace(/^<svg[^>]*><defs><\/defs>/, '').replace(/<\/svg>$/, '');
  return body.replace(/<\/svg>$/, `${eyes}</svg>`);
}

export const svgDataUrl = (svg) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
