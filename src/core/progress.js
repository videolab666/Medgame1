// Sticker collection, location unlocks, settings. Storage is injected so the
// game keeps working when localStorage is unavailable.
import { CONFIG, LOCATION_ORDER } from './config.js';
import { pick } from './rng.js';

const ART_BY_LOCATION = {
  hands: ['chykhunchyk', 'brudnulya', 'lypuchka', 'kashlyuk', 'soap', 'bilyk', 'towel', 'bubble'],
  kitchen: ['orange', 'apple', 'kiwi', 'strawberry', 'broccoli', 'water', 'carrot', 'jar'],
  blood: ['chervonya', 'bilyk', 'latochka', 'vaccine', 'patch', 'heart', 'oxygen', 'shield'],
};

export const STICKERS = Object.fromEntries(
  Object.entries(ART_BY_LOCATION).map(([loc, arts]) => [loc, arts.map((art) => ({ id: `${loc}:${art}`, art }))]),
);

const defaults = () => ({
  version: 1,
  rounds: Object.fromEntries(LOCATION_ORDER.map((l) => [l, 0])),
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

export function createProgress(storage) {
  const loaded = storage.load();
  const base = defaults();
  const state = loaded && loaded.version === 1
    ? { ...base, ...loaded, rounds: { ...base.rounds, ...loaded.rounds } }
    : base;
  const save = () => storage.save(state);

  const isUnlocked = (loc) => {
    const i = LOCATION_ORDER.indexOf(loc);
    if (i <= 0) return i === 0;
    return state.rounds[LOCATION_ORDER[i - 1]] >= CONFIG.UNLOCK_AFTER;
  };

  return {
    state,
    isUnlocked,
    lastUnlocked() {
      return [...LOCATION_ORDER].reverse().find(isUnlocked);
    },
    completeRound(loc, rng) {
      const before = LOCATION_ORDER.filter(isUnlocked);
      state.rounds[loc]++;
      const unlocked = LOCATION_ORDER.find((l) => isUnlocked(l) && !before.includes(l)) ?? null;

      const list = STICKERS[loc];
      const missing = list.filter((s) => !state.stickers[s.id]);
      const s = pick(rng, missing.length ? missing : list);
      const isNew = !state.stickers[s.id];
      state.stickers[s.id] = (state.stickers[s.id] ?? 0) + 1;

      state.sinceRest++;
      const rest = state.sinceRest >= CONFIG.REST_EVERY;
      if (rest) state.sinceRest = 0;
      save();
      return { sticker: { ...s, isNew, count: state.stickers[s.id] }, unlocked, rest };
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
