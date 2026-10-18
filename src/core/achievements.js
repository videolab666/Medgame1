// Round achievements for the reward screen. Each one is tested against the
// round summary (the 'end' event of src/core/round.js); progress.completeRound
// marks the first win of every id so the screen can add a «нова» badge.
// Fruits Ninja-like talents, Ukrainian, short enough for a child's card.
import { CONFIG } from './config.js';

export const ACHIEVEMENTS = Object.freeze([
  { id: 'noMiss', icon: '🎯', title: 'Без промахів', test: (s) => s.reason === 'time' && s.missed === 0 && s.sliced >= 5 },
  { id: 'combo5', icon: '⚡', title: 'Комбо ×5', test: (s) => s.bestCombo >= 5 },
  { id: 'king5', icon: '👑', title: 'Король приборканий', test: (s) => s.kingHits >= 5 },
  { id: 'threeHearts', icon: '❤️', title: 'Три сердечка', test: (s) => s.reason === 'time' && s.lives === CONFIG.MAX_LIVES },
  { id: 'swift', icon: '⚡', title: 'Спритні пальці', test: (s) => s.sliced >= 30 },
]);

export function earnedAchievements(summary, { gameOver = CONFIG.GAME_OVER } = {}) {
  return ACHIEVEMENTS.filter((a) => (a.id !== 'threeHearts' || gameOver) && a.test(summary));
}
