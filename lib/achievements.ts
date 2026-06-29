// lib/achievements.ts
// Catalog of badge achievements unlocked across R2BOT.

export type Achievement = {
  id: string;
  label: string;
  emoji: string;
  description: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first_lesson',        label: 'First Lesson',         emoji: '🎓', description: 'Completed your first Academy lesson.' },
  { id: 'five_lessons',        label: 'Curriculum Crusher',   emoji: '📚', description: 'Completed 5 Academy lessons.' },
  { id: 'atlas_explorer',      label: 'Atlas Explorer',       emoji: '🗺️', description: 'Read 5 Atlas terms.' },
  { id: 'quiz_master',         label: 'Quiz Master',          emoji: '🧠', description: 'Completed 3 atlas quizzes.' },
  { id: 'streak_7',            label: '7-Day Streak',         emoji: '🔥', description: 'Active for 7 days in a row.' },
  { id: 'streak_30',           label: '30-Day Streak',        emoji: '🌟', description: 'Active for 30 days in a row.' },
  { id: 'top_10_leaderboard',  label: 'Top 10',               emoji: '🥇', description: 'Reached the top 10 on the leaderboard.' },
  { id: 'certificate_earned',  label: 'Certified',            emoji: '📜', description: 'Earned an R2BOT track certificate.' },
  { id: 'copilot_first',       label: 'R2 Whisperer',         emoji: '🤖', description: 'Asked R2 Co-pilot your first question.' },
  { id: 'worldmap_explorer',   label: 'World Explorer',       emoji: '🌍', description: 'Visited the World Robotics Map.' },
];

export const ACHIEVEMENTS_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));
