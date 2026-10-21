// Sticker collection, location unlocks, the per-location wave run, records,
// achievements and settings. Storage is injected so the game keeps working
// when localStorage is unavailable.
import { CONFIG, LOCATION_ORDER } from './config.js';
import { earnedAchievements } from './achievements.js';
import {
  AVATARS, ECONOMY, POWERUPS, TASKS, TRAILS, avatarLevel, levelFromXp, roundEarnings, taskById,
} from './economy.js';
import { pick } from './rng.js';

const ART_BY_LOCATION = {
  hands: ['chykhunchyk', 'brudnulya', 'lypuchka', 'kashlyuk', 'soap', 'bilyk', 'towel', 'bubble'],
  kitchen: ['orange', 'apple', 'kiwi', 'strawberry', 'broccoli', 'water', 'carrot', 'jar'],
  blood: ['chervonya', 'bilyk', 'latochka', 'vaccine', 'patch', 'heart', 'oxygen', 'shield'],
  mouth: ['zubchyk', 'toothbrush', 'toothpaste', 'kysliuk', 'lypuchka', 'apple', 'carrot', 'water'],
  tummy: ['dobryk', 'yogurt', 'banana', 'plate', 'broccoli', 'kiwi', 'brudnulya', 'kashlyuk'],
  skin: ['hat', 'cream', 'patch', 'latochka', 'bilyk', 'soap', 'towel', 'chykhunchyk'],
};

export const STICKERS = Object.fromEntries(
  Object.entries(ART_BY_LOCATION).map(([loc, arts]) => [loc, arts.map((art) => ({ id: `${loc}:${art}`, art }))]),
);

// One endless run per location, exactly like one classic arcade game —
// only ours is sliced into timed rounds, so the cursor, the accumulated
// speed of the repeating set and the regrowing weights survive round
// boundaries.
export const defaultRun = () => ({ slot: 0, speeds: {}, weights: {} });

const defaults = () => ({
  version: 1,
  rounds: Object.fromEntries(LOCATION_ORDER.map((l) => [l, 0])),
  runs: Object.fromEntries(LOCATION_ORDER.map((l) => [l, defaultRun()])),
  best: Object.fromEntries(LOCATION_ORDER.map((l) => [l, 0])),
  achievements: {},
  stickers: {},
  sinceRest: 0,
  muted: false,
  seenFacts: {},
  tutorialDone: false,
  story: {}, // completed or skipped story scenes
  // Economy (economy.js): stars are earned by playing only.
  stars: 0,
  xp: 0,
  avatar: AVATARS[0],
  trails: { owned: [TRAILS[0].id], selected: TRAILS[0].id },
  tasks: { active: TASKS.slice(0, ECONOMY.ACTIVE_TASKS).map((t) => ({ id: t.id, progress: 0 })), next: ECONOMY.ACTIVE_TASKS },
});

export function memoryStorage() {
  let data = null;
  return {
    load: () => (data ? JSON.parse(data) : null),
    save: (obj) => { data = JSON.stringify(obj); },
  };
}

export function localStorageAdapter(key) {
  try {
    const probe = `${key}:probe`;
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
  } catch {
    return memoryStorage();
  }
  return {
    load() {
      try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
      } catch {
        return null;
      }
    },
    save(obj) {
      try {
        localStorage.setItem(key, JSON.stringify(obj));
      } catch {
        // Storage full or blocked: progress stays in memory for this session.
      }
    },
  };
}

export function createProgress(storage, { unlockAll = CONFIG.UNLOCK_ALL } = {}) {
  const loaded = storage.load();
  const base = defaults();
  const state = loaded && loaded.version === 1
    ? {
        ...base,
        ...loaded,
        rounds: { ...base.rounds, ...loaded.rounds },
        runs: Object.fromEntries(LOCATION_ORDER.map((l) => {
          const r = loaded.runs?.[l] ?? {};
          return [l, { ...defaultRun(), ...r, speeds: { ...r.speeds }, weights: { ...r.weights } }];
        })),
        best: { ...base.best, ...loaded.best },
        achievements: { ...loaded.achievements },
        story: { ...base.story, ...(loaded.story ?? {}) },
        trails: { ...base.trails, ...loaded.trails, owned: [...(loaded.trails?.owned ?? base.trails.owned)] },
        tasks: loaded.tasks?.active?.length
          ? { active: loaded.tasks.active.map((t) => ({ ...t })), next: loaded.tasks.next ?? ECONOMY.ACTIVE_TASKS }
          : base.tasks,
      }
    : base;
  const save = () => storage.save(state);

  // ── economy ──
  // Adds XP and stars; every new level brings stars, an avatar and maybe a trail.
  function gain(xp, stars) {
    const before = levelFromXp(state.xp).level;
    state.xp += xp;
    state.stars += stars;
    const after = levelFromXp(state.xp).level;
    const levelUps = [];
    for (let lv = before + 1; lv <= after; lv++) {
      state.stars += ECONOMY.LEVEL_STARS;
      levelUps.push({
        level: lv,
        stars: ECONOMY.LEVEL_STARS,
        avatar: AVATARS[lv - 1] ?? null,
        trail: TRAILS.find((t) => t.level === lv) ?? null,
      });
    }
    return levelUps;
  }

  // The next task in the cycle that is not already on the board.
  function nextTask() {
    for (let i = 0; i < TASKS.length; i++) {
      const t = TASKS[(state.tasks.next + i) % TASKS.length];
      if (!state.tasks.active.some((a) => a.id === t.id)) {
        state.tasks.next = (state.tasks.next + i + 1) % TASKS.length;
        return { id: t.id, progress: 0 };
      }
    }
    return null;
  }

  // Moves tasks forward by `amount(task)`; finished ones pay out and are
  // replaced right away. Returns the finished tasks and any level-ups.
  function advanceTasks(amount) {
    const done = [];
    let levelUps = [];
    state.tasks.active = state.tasks.active.map((a) => {
      const t = taskById(a.id);
      if (!t) return nextTask() ?? a;
      const add = amount(t);
      if (!add) return a;
      const progress = Math.min(t.target, a.progress + add);
      if (progress < t.target) return { ...a, progress };
      done.push({ id: t.id, text: t.text, reward: t.reward });
      return null;
    }).filter(Boolean);
    for (const d of done) {
      levelUps = levelUps.concat(gain(d.reward, d.reward));
      const n = nextTask();
      if (n) state.tasks.active.push(n);
    }
    return { done, levelUps };
  }

  const isUnlocked = (loc) => {
    const i = LOCATION_ORDER.indexOf(loc);
    if (unlockAll) return i >= 0;
    if (i <= 0) return i === 0;
    return state.rounds[LOCATION_ORDER[i - 1]] >= CONFIG.UNLOCK_AFTER;
  };

  return {
    state,
    isUnlocked,
    // The last location in the chain (used for the calm backdrop behind menus).
    lastUnlocked() {
      return [...LOCATION_ORDER].reverse().find(isUnlocked);
    },
    // «Грати» follows the chain: the first location that still needs rounds
    // (CONFIG.UNLOCK_AFTER), or the last one when the journey is complete.
    nextLocation() {
      const i = LOCATION_ORDER.findIndex((l) => (state.rounds[l] ?? 0) < CONFIG.UNLOCK_AFTER);
      return i === -1 ? LOCATION_ORDER[LOCATION_ORDER.length - 1] : LOCATION_ORDER[i];
    },
    // The live run object of a location: the round reads and writes it, so the
    // difficulty keeps climbing across rounds.
    runFor(loc) {
      if (!state.runs[loc]) state.runs[loc] = defaultRun();
      return state.runs[loc];
    },
    // Saves the state as it is now (leaving a round mid-way keeps the cursor).
    persist: save,
    completeRound(loc, rng, summary = null) {
      const before = LOCATION_ORDER.filter(isUnlocked);
      state.rounds[loc]++;
      const unlocked = LOCATION_ORDER.find((l) => isUnlocked(l) && !before.includes(l)) ?? null;

      const list = STICKERS[loc];
      const missing = list.filter((s) => !state.stickers[s.id]);
      const s = pick(rng, missing.length ? missing : list);
      const isNew = !state.stickers[s.id];
      state.stickers[s.id] = (state.stickers[s.id] ?? 0) + 1;

      // Record and achievements come from the round summary (points = microbes
      // plus vitamins, the same sum that returns hearts).
      let best = null;
      let achievements = [];
      if (summary) {
        const points = summary.points ?? summary.score + summary.vitamins;
        const prev = state.best[loc] ?? 0;
        const isRecord = points > prev;
        if (isRecord) state.best[loc] = points;
        best = { value: isRecord ? points : prev, isRecord, points };
        achievements = earnedAchievements(summary).map((a) => {
          const fresh = !state.achievements[a.id];
          state.achievements[a.id] = (state.achievements[a.id] ?? 0) + 1;
          return { id: a.id, icon: a.icon, title: a.title, isNew: fresh };
        });
      }

      // Stars, XP, tasks.
      let economy = null;
      if (summary) {
        const earned = roundEarnings(summary);
        const levelUps = gain(earned.xp, earned.stars);
        const tasks = advanceTasks((t) => (t.calm ? 0 : t.stat({ ...summary, location: summary.location ?? loc })));
        economy = {
          stars: earned.stars, xp: earned.xp, gold: earned.gold,
          levelUps: levelUps.concat(tasks.levelUps), tasksDone: tasks.done,
        };
      }

      state.sinceRest++;
      const rest = state.sinceRest >= CONFIG.REST_EVERY;
      if (rest) state.sinceRest = 0;
      save();
      return { sticker: { ...s, isNew, count: state.stickers[s.id] }, unlocked, rest, best, achievements, economy };
    },
    hasSeenStory: (id) => Boolean(state.story[id]),
    markStorySeen(id) {
      if (!state.story[id]) { state.story[id] = true; save(); }
    },
    levelInfo: () => levelFromXp(state.xp),
    // A calm-mode session long enough to count (main decides) moves calm tasks.
    recordCalm() {
      const r = advanceTasks((t) => (t.calm ? 1 : 0));
      save();
      return r;
    },
    powerupCost: (ids) => ids.reduce((sum, id) => sum + (POWERUPS.find((p) => p.id === id)?.price ?? 0), 0),
    // Pays for the power-ups of the next round; false if the stars are short.
    buyPowerups(ids) {
      const list = [...new Set(ids)].filter((id) => POWERUPS.some((p) => p.id === id)).slice(0, ECONOMY.MAX_POWERUPS);
      const cost = this.powerupCost(list);
      if (cost > state.stars) return false;
      state.stars -= cost;
      save();
      return list;
    },
    trailState(id) {
      const t = TRAILS.find((x) => x.id === id);
      if (!t) return 'none';
      if (state.trails.owned.includes(id)) return state.trails.selected === id ? 'selected' : 'owned';
      if (levelFromXp(state.xp).level < t.level) return 'locked';
      return 'buyable';
    },
    buyTrail(id) {
      const t = TRAILS.find((x) => x.id === id);
      if (!t || this.trailState(id) !== 'buyable' || state.stars < t.price) return false;
      state.stars -= t.price;
      state.trails.owned.push(id);
      state.trails.selected = id;
      save();
      return true;
    },
    selectTrail(id) {
      if (!state.trails.owned.includes(id)) return false;
      state.trails.selected = id;
      save();
      return true;
    },
    avatarOpen: (key) => avatarLevel(key) > 0 && avatarLevel(key) <= levelFromXp(state.xp).level,
    selectAvatar(key) {
      if (!this.avatarOpen(key)) return false;
      state.avatar = key;
      save();
      return true;
    },
    setSeenFacts(loc, ids) {
      state.seenFacts[loc] = ids;
      save();
    },
    setMuted(b) {
      state.muted = b;
      save();
    },
    markTutorialDone() {
      state.tutorialDone = true;
      save();
    },
    reset() {
      Object.assign(state, defaults());
      save();
    },
  };
}
