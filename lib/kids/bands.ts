// lib/kids/bands.ts
// The four age bands of R2BOT Kids. Every kids surface (stories, workshop
// missions, code lab, classroom) tags its content with one of these ids so a
// child only sees what fits them, and a teacher can pick a band for a class.
//
// Bands follow school grades because that is how schools buy and plan.
// Labels are global ("Grades"); the Indian "Class" equivalent is shown beside
// it because India is a key market, not because it is the default.

export type BandId = 'explorers' | 'builders' | 'inventors' | 'engineers'

export interface KidsBand {
  id: BandId
  name: string
  emoji: string
  ages: string
  minAge: number
  maxAge: number
  grades: string
  /** One line a child understands. */
  promise: string
  /** One line a parent or teacher understands. */
  outcome: string
  /** Tailwind gradient classes for cards. */
  gradient: string
  accent: string
}

export const KIDS_BANDS: KidsBand[] = [
  {
    id: 'explorers',
    name: 'Explorers',
    emoji: '🌱',
    ages: '5–7',
    minAge: 5,
    maxAge: 7,
    grades: 'Grades K–2 · Class 1–2',
    promise: 'Find robots everywhere and make one move!',
    outcome: 'Knows what a robot is (sense → think → act) and can give a robot step-by-step instructions.',
    gradient: 'from-emerald-500 to-teal-600',
    accent: '#10B981',
  },
  {
    id: 'builders',
    name: 'Builders',
    emoji: '🔧',
    ages: '8–10',
    minAge: 8,
    maxAge: 10,
    grades: 'Grades 3–5 · Class 3–5',
    promise: 'Build your own robot and teach it tricks!',
    outcome: 'Names the parts of a robot, chooses parts for a job, and writes programs with loops.',
    gradient: 'from-sky-500 to-blue-600',
    accent: '#3B82F6',
  },
  {
    id: 'inventors',
    name: 'Inventors',
    emoji: '💡',
    ages: '11–13',
    minAge: 11,
    maxAge: 13,
    grades: 'Grades 6–8 · Class 6–8',
    promise: 'Give your robot sensors and make it decide for itself!',
    outcome: 'Uses sensors and IF/ELSE logic, debugs programs, and explains feedback in plain words.',
    gradient: 'from-cyan-500 to-cyan-800',
    accent: '#06B6D4',
  },
  {
    id: 'engineers',
    name: 'Engineers',
    emoji: '🚀',
    ages: '14–17',
    minAge: 14,
    maxAge: 17,
    grades: 'Grades 9–12 · Class 9–12',
    promise: 'Think like a real robotics engineer.',
    outcome: 'Reads the Python behind block programs, reasons about sensors, motors and control, and is ready for the main R2BOT Academy.',
    gradient: 'from-orange-500 to-red-600',
    accent: '#F97316',
  },
]

export const BAND_ORDER: BandId[] = KIDS_BANDS.map((b) => b.id)

export function getBand(id: string | null | undefined): KidsBand | undefined {
  return KIDS_BANDS.find((b) => b.id === id)
}

export function bandForAge(age: number): KidsBand {
  return KIDS_BANDS.find((b) => age >= b.minAge && age <= b.maxAge) ?? (age < 5 ? KIDS_BANDS[0] : KIDS_BANDS[KIDS_BANDS.length - 1])
}

/** True when content for `contentBand` is suitable for a child in `childBand` (same band or an earlier one). */
export function bandAllows(childBand: BandId, contentBand: BandId): boolean {
  return BAND_ORDER.indexOf(contentBand) <= BAND_ORDER.indexOf(childBand)
}
