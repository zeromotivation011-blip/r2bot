// lib/kids/passport.ts
//
// Robot Passport (roadmap #12): a child's progress kept on the server under a
// few friendly words — e.g. MAGNET-OTTER-NOVA-7 — so they can carry on from a
// new device without an email, an account or anything else personal.
//
// This file is pure (no React, no node:crypto) and is shared by the browser,
// the API route (app/api/kids/passport) and the verifier:
//   - the word list (256 words, no two words one typo apart),
//   - newPassportWords() given any random-integer source,
//   - parsePassport(): forgiving input (any case, spaces or dashes, missing
//     separators, one typo per word) → the canonical code, or a kind reason.
//
// Size of the code space: 256³ word triples × 98 numbers (2–99) ≈ 1.6 billion.
// That is not a password: it is protected by rate limits on the route (a few
// dozen guesses per hour per address), and what it guards holds no personal
// data — progress, the explorer and robot nicknames. The server stores only
// SHA-256 of the canonical code (lib/kids/passport-server.ts).

/** 256 short, friendly words. Sorted; checked by passport.verify.ts (unique, A–Z, no two within one edit). */
export const PASSPORT_WORDS: readonly string[] = [
  'ACORN', 'ALPACA', 'ANCHOR', 'APPLE', 'APRON', 'ARCH', 'ARROW', 'ASTRO', 'ATLAS', 'AUTUMN', 'AVOCADO',
  'BADGER', 'BAGEL', 'BALLOON', 'BAMBOO', 'BANANA', 'BANJO', 'BARN', 'BASIL', 'BEACH', 'BEACON', 'BEAVER',
  'BERRY', 'BISON', 'BLOSSOM', 'BOAT', 'BONGO', 'BREEZE', 'BRICK', 'BUBBLE', 'BUCKET', 'BUGGY', 'BUNNY',
  'BUTTON', 'CABIN', 'CACTUS', 'CAMEL', 'CANDLE', 'CANOE', 'CANYON', 'CASTLE', 'CEDAR', 'CHEETAH', 'CHERRY',
  'CHIPMUNK', 'CIRCUS', 'CLOUD', 'CLOVER', 'COBALT', 'COCONUT', 'COMET', 'COMPASS', 'CONDOR', 'COOKIE',
  'CORAL', 'COTTON', 'COUGAR', 'CRATER', 'CRAYON', 'CRICKET', 'CRYSTAL', 'CUPCAKE', 'DAISY', 'DELTA',
  'DESERT', 'DIESEL', 'DINGO', 'DOLPHIN', 'DOMINO', 'DONKEY', 'DRAGON', 'DRUM', 'DUCKLING', 'EAGLE', 'ECHO',
  'EMBER', 'EMERALD', 'FALCON', 'FEATHER', 'FERN', 'FIDDLE', 'FIREFLY', 'FLAMINGO', 'FLUTE', 'FOREST',
  'FOSSIL', 'FOX', 'FROST', 'GADGET', 'GALAXY', 'GARDEN', 'GEAR', 'GECKO', 'GEYSER', 'GINGER', 'GIRAFFE',
  'GLACIER', 'GLOBE', 'GOOSE', 'GRAPE', 'GRAVITY', 'GUITAR', 'HAMSTER', 'HARBOR', 'HAZEL', 'HEDGEHOG',
  'HELIUM', 'HERON', 'HIPPO', 'HONEY', 'HOOPOE', 'HORIZON', 'IBIS', 'IGLOO', 'IGUANA', 'ISLAND', 'IVORY',
  'JACKAL', 'JAGUAR', 'JASMINE', 'JELLY', 'JIGSAW', 'JUNGLE', 'JUPITER', 'KAYAK', 'KETTLE', 'KIWI', 'KOALA',
  'LADDER', 'LAGOON', 'LANTERN', 'LASER', 'LEMON', 'LEMUR', 'LILAC', 'LIME', 'LLAMA', 'LOBSTER', 'LOTUS',
  'MAGNET', 'MANGO', 'MAPLE', 'MARBLE', 'MARS', 'MEADOW', 'MEERKAT', 'MELON', 'METEOR', 'MINT', 'MITTEN',
  'MOSAIC', 'MOTOR', 'NEBULA', 'NECTAR', 'NEON', 'NEWT', 'NOODLE', 'NOVA', 'NUTMEG', 'OAK', 'OASIS', 'OCEAN',
  'OLIVE', 'ORBIT', 'ORCA', 'ORCHID', 'OSPREY', 'OTTER', 'OWL', 'PADDLE', 'PANDA', 'PAPAYA', 'PARROT',
  'PEANUT', 'PEBBLE', 'PELICAN', 'PENGUIN', 'PEPPER', 'PIANO', 'PICKLE', 'PILOT', 'PIXEL', 'PLANET', 'PLUM',
  'POLKA', 'PONY', 'POPCORN', 'PRISM', 'PUFFIN', 'PUMPKIN', 'PUZZLE', 'QUARTZ', 'QUOKKA', 'RABBIT', 'RADAR',
  'RADISH', 'RAINBOW', 'RAVEN', 'REEF', 'RHINO', 'RIVER', 'ROBIN', 'ROBOT', 'ROCKET', 'SAFARI', 'SAILOR',
  'SALMON', 'SATURN', 'SCOOTER', 'SEAL', 'SENSOR', 'SIERRA', 'SLOTH', 'SNOWMAN', 'SOCKS', 'SPROCKET',
  'SPROUT', 'SQUID', 'STAR', 'SUMMIT', 'SWAN', 'TACO', 'TAPIR', 'TEAPOT', 'THUNDER', 'TIGER', 'TOFU',
  'TOMATO', 'TOUCAN', 'TRACTOR', 'TROMBONE', 'TULIP', 'TUNDRA', 'TURNIP', 'TURTLE', 'UKULELE', 'UMBRELLA',
  'UNICORN', 'VALLEY', 'VELVET', 'VIOLIN', 'VOLCANO', 'WAFFLE', 'WALNUT', 'WALRUS', 'WHALE', 'WHEEL',
  'WILLOW', 'WOMBAT', 'YETI', 'YOGURT', 'YOYO', 'ZEBRA', 'ZEPHYR', 'ZIGZAG', 'ZUCCHINI',
]

export const PASSPORT_WORD_COUNT = 3
export const PASSPORT_MIN_NUMBER = 2
export const PASSPORT_MAX_NUMBER = 99

/** Error code the route answers with until migration 0057 has run. */
export const PASSPORT_NOT_READY = 'passport_not_ready'

/** Longest backup code the Passport keeps (characters). Real codes are a few KB. */
export const PASSPORT_MAX_BACKUP = 60_000

/** Where a scanned QR code lands: the Garage, with the words in the fragment (never sent to a server). */
export const PASSPORT_PATH = '/kids/hangar'
export const PASSPORT_HASH_KEY = 'passport'

const WORD_SET = new Set(PASSPORT_WORDS)

export interface PassportWords {
  words: [string, string, string]
  number: number
}

/** Canonical text: WORD-WORD-WORD-N. */
export function formatPassport(p: PassportWords): string {
  return `${p.words.join('-')}-${p.number}`
}

/** A fresh code from any uniform random source: `randomInt(n)` must return 0..n-1. */
export function newPassportWords(randomInt: (n: number) => number): PassportWords {
  const pick = () => PASSPORT_WORDS[randomInt(PASSPORT_WORDS.length)]
  return {
    words: [pick(), pick(), pick()],
    number: PASSPORT_MIN_NUMBER + randomInt(PASSPORT_MAX_NUMBER - PASSPORT_MIN_NUMBER + 1),
  }
}

function lev1(a: string, b: string): boolean {
  // True when a and b are exactly one insert, delete or change apart.
  if (a === b) return false
  const la = a.length
  const lb = b.length
  if (Math.abs(la - lb) > 1) return false
  let i = 0
  let j = 0
  let edits = 0
  while (i < la && j < lb) {
    if (a[i] === b[j]) {
      i++
      j++
      continue
    }
    if (++edits > 1) return false
    if (la > lb) i++
    else if (lb > la) j++
    else {
      i++
      j++
    }
  }
  return edits + (la - i) + (lb - j) === 1
}

/** The one list word a typed word means: exact, or the only word one typo away. */
export function matchPassportWord(typed: string): string | null {
  const w = typed.toUpperCase()
  if (WORD_SET.has(w)) return w
  let found: string | null = null
  for (const cand of PASSPORT_WORDS) {
    if (lev1(w, cand)) {
      if (found) return null // two words are one typo away: do not guess
      found = cand
    }
  }
  return found
}

/** Split "MAGNETOTTERNOVA" into list words when that can be done exactly one way. */
function segment(run: string): string[] | null {
  const n = run.length
  // ways[i] = list of word splits of run[i..] (capped at 2: we only need to know "exactly one").
  const ways: (string[][] | null)[] = new Array(n + 1).fill(null)
  ways[n] = [[]]
  for (let i = n - 1; i >= 0; i--) {
    const out: string[][] = []
    for (let len = 3; len <= 8 && i + len <= n; len++) {
      const w = run.slice(i, i + len)
      const rest = ways[i + len]
      if (!WORD_SET.has(w) || !rest) continue
      for (const r of rest) {
        out.push([w, ...r])
        if (out.length > 1) break
      }
      if (out.length > 1) break
    }
    ways[i] = out.length ? out : null
  }
  const all = ways[0]
  return all && all.length === 1 ? all[0] : null
}

export type PassportParseFailure = 'empty' | 'number' | 'words' | 'unknown-word'

export type PassportParse =
  | { ok: true; code: string; words: PassportWords; corrected: boolean }
  | { ok: false; reason: PassportParseFailure; word?: string }

/**
 * Read what a child or grown-up typed (or a scanned QR fragment). Accepts any
 * case, spaces, dashes or dots between the words, the number anywhere, missing
 * separators ("magnetotternova7") and one typo per word. Never throws.
 */
export function parsePassport(input: unknown): PassportParse {
  if (typeof input !== 'string') return { ok: false, reason: 'empty' }
  const text = input.slice(0, 200).toUpperCase()
  if (!text.trim()) return { ok: false, reason: 'empty' }
  const nums = text.match(/\d+/g) ?? []
  if (nums.length !== 1) return { ok: false, reason: 'number' }
  const number = Number(nums[0])
  if (!Number.isInteger(number) || number < PASSPORT_MIN_NUMBER || number > PASSPORT_MAX_NUMBER) return { ok: false, reason: 'number' }
  const runs = text.replace(/\d+/g, ' ').split(/[^A-Z]+/).filter(Boolean)
  let corrected = false
  const words: string[] = []
  for (const r of runs) {
    const exact = matchPassportWord(r)
    if (exact) {
      if (exact !== r) corrected = true
      words.push(exact)
      continue
    }
    const split = segment(r)
    if (split) {
      words.push(...split)
      continue
    }
    return { ok: false, reason: 'unknown-word', word: r.slice(0, 20) }
  }
  if (words.length !== PASSPORT_WORD_COUNT) return { ok: false, reason: 'words' }
  const p: PassportWords = { words: [words[0], words[1], words[2]], number }
  return { ok: true, code: formatPassport(p), words: p, corrected }
}

/** The link a passport QR code opens. The words ride in the fragment, which browsers never send to a server. */
export function passportLink(code: string, origin = 'https://www.r2bot.in'): string {
  return `${origin}${PASSPORT_PATH}#${PASSPORT_HASH_KEY}=${encodeURIComponent(code)}`
}

/** Words from a location hash like "#passport=MAGNET-OTTER-NOVA-7", or null. */
export function passportFromHash(hash: string): string | null {
  const m = new RegExp(`[#&]${PASSPORT_HASH_KEY}=([^&]+)`).exec(hash)
  if (!m) return null
  try {
    const p = parsePassport(decodeURIComponent(m[1]))
    return p.ok ? p.code : null
  } catch {
    return null
  }
}

/** What the server keeps next to the backup code, so a restore can say what it found. Counters only. */
export interface PassportSummary {
  xp: number
  badges: number
  sessions: number
}

/** Kind words for every failure the browser can see. */
export const PASSPORT_PARSE_MESSAGES: Record<PassportParseFailure, string> = {
  empty: 'Type your Passport words first. They look like MAGNET-OTTER-NOVA-7.',
  number: 'A Passport has three words and one number from 2 to 99, like MAGNET-OTTER-NOVA-7.',
  words: 'A Passport has exactly three words and a number. Check the card again.',
  'unknown-word': 'One of those words is not a Passport word. Check the spelling on the card.',
}
