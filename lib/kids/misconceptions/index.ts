// lib/kids/misconceptions/index.ts
//
// Misconception capture (roadmap #30) — the client-safe entry point.
//
//   MISCONCEPTIONS      the typed Level 1 catalogue: teacher-facing idea and
//                       correction, child-friendly words, a 5-minute reteach.
//                       (Level 2 keeps its own catalogue in
//                       lib/kids/curriculum/level2/misconceptions.ts; Levels 3–4
//                       keep theirs in each session's teacher notes. The
//                       server joins all four in ./server.ts.)
//   keys                "<session>.<id>" shapes and the count cleaner.
//   store               the device record in the one progress store.
//
// Every wrong option of every course check (Levels 1–4, lessons and projects)
// carries an id; lib/kids/misconceptions/verify.ts proves it.

export { L1_MISCONCEPTIONS as MISCONCEPTIONS, type L1MisconceptionId, type MisconceptionText } from './level1'
export {
  MISCONCEPTION_ID_RE,
  MISCONCEPTION_KEY_RE,
  MISCONCEPTION_STORE_MAX,
  cleanMisconceptionCounts,
  misconceptionKey,
  splitMisconceptionKey,
} from './keys'
export { optionMisconception, recordCheckMisconception, recentCheckMisconceptions } from './store'
