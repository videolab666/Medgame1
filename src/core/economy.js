// Stars, levels, power-ups, trails, avatars and Bilyk's tasks. Pure data and
// rules; the save lives in progress.js. Stars are only ever earned by playing:
// no purchases for money, no ads, no random boxes, no expiring rewards
// (spec R7/R8).

export const ECONOMY = Object.freeze({
  POINTS_PER_STAR: 10, // 1 star per 10 points (microbes + vitamins)
  ROUND_STARS: 5, // every finished round
  GOLD_STARS: 5, // a sliced golden star
  LEVEL_STARS: 10, // every new level
  GOLD_CHANCE: 0.03, // per sliceable throw outside the opening
  GOLD_MAX: 2, // per round
  MAX_POWERUPS: 3, // picked before one round
  ACTIVE_TASKS: 3,
});

// One-round boosts, bought on the pre-round screen.
export const POWERUPS = Object.freeze([
  { id: 'shield', icon: '🛡️', name: 'Щит Білика', desc: '3 дотики до своїх пробачаються', price: 15 },
  { id: 'time', icon: '⏱️', name: 'Ще трішки', desc: '+2 с за кожен апельсин', price: 10 },
  { id: 'berry', icon: '🍓', name: 'Іскриста полуниця', desc: 'Полуниця ловить мікробів поруч', price: 12 },
  { id: 'wide', icon: '🌊', name: 'Велика хвиля', desc: 'Слід пальця ширший', price: 10 },
  { id: 'heart', icon: '❤️', name: 'Ще сердечко', desc: '4 сердечка на старті', price: 15 },
  { id: 'slow', icon: '🐢', name: 'Повільний старт', desc: 'Перші 10 с повільніше', price: 8 },
]);
export const POWERUP_FX = Object.freeze({
  SHIELD_FORGIVES: 3,
  TIME_PER_ORANGE: 2,
  BERRY_RADIUS: 300,
  WIDE_SCALE: 1.5,
  EXTRA_LIVES: 1,
  SLOW_SEC: 10,
  SLOW_SCALE: 0.6,
});

// Finger trails: open at a level, then bought once and kept.
export const TRAILS = Object.freeze([
  { id: 'rainbow', name: 'Веселка', level: 1, price: 0 },
  { id: 'stars', name: 'Зорепад', level: 2, price: 30 },
  { id: 'hearts', name: 'Сердечка', level: 4, price: 45 },
  { id: 'snow', name: 'Сніжинки', level: 6, price: 60 },
  { id: 'bubbles', name: 'Мильні бульбашки', level: 8, price: 75 },
  { id: 'confetti', name: 'Конфеті', level: 10, price: 90 },
  { id: 'neon', name: 'Неон', level: 12, price: 105 },
  { id: 'gold', name: 'Золотий', level: 14, price: 120 },
]);

// Avatar icons (art keys), one more with every level: index 0 is level 1.
export const AVATARS = Object.freeze([
  'bilyk', 'chervonya', 'latochka', 'zubchyk', 'dobryk', 'water', 'heart', 'chykhunchyk',
  'lypuchka', 'kysliuk', 'kashlyuk', 'brudnulya', 'oxygen', 'soap', 'shield',
]);
export const avatarLevel = (key) => AVATARS.indexOf(key) + 1;

// XP needed to go from level n to n + 1.
export const xpForLevel = (n) => 40 + 20 * n;

export function levelFromXp(xp) {
  let level = 1;
  let rest = Math.max(0, xp);
  while (rest >= xpForLevel(level)) {
    rest -= xpForLevel(level);
    level++;
  }
  return { level, into: rest, need: xpForLevel(level) };
}

// Stars and XP for one finished round. XP = points; stars = points / 10 +
// a round bonus + golden stars.
export function roundEarnings(summary) {
  const points = summary.points ?? (summary.score ?? 0) + (summary.vitamins ?? 0);
  return {
    stars: Math.floor(points / ECONOMY.POINTS_PER_STAR) + ECONOMY.ROUND_STARS + (summary.gold ?? 0) * ECONOMY.GOLD_STARS,
    xp: points,
    gold: summary.gold ?? 0,
  };
}

// Bilyk's tasks. `stat(summary)` is what one round adds to the task; `calm`
// tasks grow from the calm mode instead. All tasks are counted forward only —
// no deadlines.
const LOC_NAMES = {
  hands: 'Долоньках', kitchen: 'Кухні вітамінів', blood: 'Клітинковій річці',
  mouth: 'Ротику', tummy: 'Животику', skin: 'Шкірі',
};
export const TASKS = Object.freeze([
  { id: 'wash20', text: 'Помий 20 мікробів', target: 20, reward: 10, stat: (s) => s.score },
  { id: 'vit15', text: 'Збери 15 вітамінів', target: 15, reward: 10, stat: (s) => s.vitamins },
  { id: 'combo5', text: 'Зроби комбо ×5', target: 1, reward: 15, stat: (s) => (s.bestCombo >= 5 ? 1 : 0) },
  { id: 'rounds3', text: 'Зіграй 3 раунди', target: 3, reward: 15, stat: () => 1 },
  { id: 'calm1', text: 'Подихай разом із бульбашками', target: 1, reward: 15, calm: true },
  { id: 'gold1', text: 'Злови золоту зірочку', target: 1, reward: 20, stat: (s) => s.gold ?? 0 },
  { id: 'clean1', text: 'Раунд без дотику до своїх', target: 1, reward: 20, stat: (s) => (s.reason === 'time' && !s.cellTouches ? 1 : 0) },
  { id: 'wash50', text: 'Помий 50 мікробів', target: 50, reward: 20, stat: (s) => s.score },
  { id: 'king5', text: 'Зроби 5 ударів по королю', target: 5, reward: 20, stat: (s) => s.kingHits ?? 0 },
  { id: 'power1', text: 'Візьми підпитку перед раундом', target: 1, reward: 10, stat: (s) => (s.powerups?.length ? 1 : 0) },
  { id: 'vit40', text: 'Збери 40 вітамінів', target: 40, reward: 25, stat: (s) => s.vitamins },
  { id: 'combo10', text: 'Зроби комбо ×10', target: 1, reward: 30, stat: (s) => (s.bestCombo >= 10 ? 1 : 0) },
  { id: 'points30', text: 'Набери 30 очок за раунд', target: 1, reward: 25, stat: (s) => ((s.points ?? 0) >= 30 ? 1 : 0) },
  { id: 'wash100', text: 'Помий 100 мікробів', target: 100, reward: 40, stat: (s) => s.score },
  { id: 'calm3', text: 'Подихай із бульбашками 3 рази', target: 3, reward: 30, calm: true },
  ...Object.entries(LOC_NAMES).map(([loc, where]) => ({
    id: `play-${loc}`, text: `Зіграй у ${where}`, target: 1, reward: 10, stat: (s) => (s.location === loc ? 1 : 0),
  })),
]);
export const taskById = (id) => TASKS.find((t) => t.id === id);
