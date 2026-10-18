// Sticker collection, location unlocks, the per-location wave run, records,
// achievements and settings. Storage is injected so the game keeps working
// when localStorage is unavailable.
import { CONFIG, LOCATION_ORDER } from './config.js';
import { earnedAchievements } from './achievements.js';
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
      }
    : base;
  const save = () => storage.save(state);

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

      state.sinceRest++;
      const rest = state.sinceRest >= CONFIG.REST_EVERY;
      if (rest) state.sinceRest = 0;
      save();
      return { sticker: { ...s, isNew, count: state.stickers[s.id] }, unlocked, rest, best, achievements };
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
