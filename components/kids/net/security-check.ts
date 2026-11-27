// components/kids/net/security-check.ts
// Robot Security Check (roadmap #88, Robot Guardians): the data and the rules
// of the four-step defensive mission at /kids/lab/network/guardian.
//   1. Audit  — find the robot that is easiest to take over (factory password,
//               two years of missed updates).
//   2. Update — install only the update whose signature checks out.
//   3. Password — choose a long passphrase of random words (picked from
//               tiles: the child never types or stores a real password).
//   4. Least privilege — give the delivery app only what its job needs.
// Defensive only: nothing here shows how to break into anything. Pure data +
// functions (no React, no DOM), checked by components/kids/net/net.verify.ts.

export const SECURITY_BEST_ID = 'net-guardian-check'

export interface FleetRobot {
  id: string
  name: string
  icon: string
  job: string
  password: string
  software: string
  updates: string
  /** The answer to step 1. */
  weakest: boolean
  /** Shown when the child picks it. */
  feedback: string
}

export const FLEET: FleetRobot[] = [
  {
    id: 'shelf',
    name: 'ShelfBot',
    icon: '📚',
    job: 'Carries books in the library',
    password: 'Changed by the IT team in March',
    software: 'Version 3.1 (up to date)',
    updates: 'Installs signed updates automatically',
    weakest: false,
    feedback: 'ShelfBot is in good shape: its password was changed and it updates itself. Look for a robot that still has its factory settings.',
  },
  {
    id: 'patch',
    name: 'Patch',
    icon: '📦',
    job: 'Delivers parcels along the corridors',
    password: 'Never changed (factory default)',
    software: 'Version 1.2, from two years ago',
    updates: 'Update 3.0 waiting since last year',
    weakest: true,
    feedback: 'Yes. Patch still has the password it left the factory with — the same on every robot of its model, printed in the manual — and two years of fixes it never installed.',
  },
  {
    id: 'mop',
    name: 'MopBot',
    icon: '🧽',
    job: 'Cleans the canteen floor at night',
    password: 'Changed by the IT team in January',
    software: 'Version 2.4 (up to date)',
    updates: 'Installs signed updates automatically',
    weakest: false,
    feedback: 'MopBot is fine: new password, up-to-date software. Find the robot with factory settings and missing updates.',
  },
  {
    id: 'greet',
    name: 'GreetBot',
    icon: '👋',
    job: 'Says hello at reception',
    password: 'Changed by the IT team in May',
    software: 'Version 2.9',
    updates: 'Update 3.0 arrived 3 days ago, installing tonight',
    weakest: false,
    feedback: 'Close, but GreetBot’s password was changed and its update is already planned for tonight. Another robot has never had either.',
  },
]

// ── Step 2: signed updates ──────────────────────────────────────────────────

/** A tiny 32-bit fingerprint (FNV-1a) so the child can SEE a changed file give a different fingerprint. */
export function fingerprint(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  const hex = h.toString(16).toUpperCase().padStart(8, '0')
  return `${hex.slice(0, 4)}-${hex.slice(4)}`
}

const OFFICIAL_CONTENT = 'PATCH 3.0 | fix: corridor lock | new rule: factory password must be changed | safety: slower near people'

/** The fingerprint the maker signed with its private key (published with the update). */
export const SIGNED_FINGERPRINT = fingerprint(OFFICIAL_CONTENT)

export interface UpdateFile {
  id: string
  file: string
  from: string
  /** What the file really contains (shown in "look inside"). */
  content: string
  /** null = no signature at all. */
  signedFingerprint: string | null
  feedback: string
}

export const UPDATES: UpdateFile[] = [
  {
    id: 'email',
    file: 'patch-3.0.bin',
    from: 'A link in an email that says “URGENT: install now”',
    content: OFFICIAL_CONTENT + ' | extra: send camera pictures to an unknown server',
    signedFingerprint: SIGNED_FINGERPRINT,
    feedback: 'Patch refused it. The file carries RoboMaker’s signature, but its fingerprint does not match: someone changed the file after it was signed. A real signature check catches exactly this.',
  },
  {
    id: 'forum',
    file: 'turbo-mod.bin',
    from: 'A forum post: “make your robot 3× faster!”',
    content: 'TURBO MOD | remove speed limit near people | skip safety checks',
    signedFingerprint: null,
    feedback: 'Patch refused it: there is no signature at all, so nobody can say who made it. (Look inside: it even removes the speed limit near people.)',
  },
  {
    id: 'official',
    file: 'patch-3.0.bin',
    from: 'RoboMaker’s update server',
    content: OFFICIAL_CONTENT,
    signedFingerprint: SIGNED_FINGERPRINT,
    feedback: 'The fingerprint of the file matches the one RoboMaker signed. Patch installs it.',
  },
]

export interface SignatureCheck {
  status: 'valid' | 'changed' | 'missing'
  fileFingerprint: string
  signedFingerprint: string | null
}

/** What the robot works out before it installs anything. */
export function checkSignature(u: UpdateFile): SignatureCheck {
  const fileFingerprint = fingerprint(u.content)
  if (!u.signedFingerprint) return { status: 'missing', fileFingerprint, signedFingerprint: null }
  return { status: fileFingerprint === u.signedFingerprint ? 'valid' : 'changed', fileFingerprint, signedFingerprint: u.signedFingerprint }
}

// ── Step 3: passwords ───────────────────────────────────────────────────────

export interface PasswordOption {
  id: string
  text: string
  /** Rough number of guesses an automatic guesser needs (order of magnitude). */
  guesses: string
  /** How long at 10 billion guesses a second (for Engineers). */
  time: string
  strong: boolean
  feedback: string
}

export const PASSWORDS: PasswordOption[] = [
  { id: 'admin', text: 'admin123', guesses: 'in the first thousand guesses', time: 'instantly', strong: false, feedback: '“admin123” is on every list of common passwords. Guessing programs try those first.' },
  { id: 'name', text: 'Patch2026', guesses: 'about a million guesses', time: 'less than a second', strong: false, feedback: 'The robot’s name plus the year is one of the first things a guesser tries.' },
  { id: 'symbols', text: 'P@ss!', guesses: 'about 8 billion guesses', time: 'under a second', strong: false, feedback: 'Symbols help a little, but it is far too short. Length beats squiggles.' },
  { id: 'words', text: 'otter lantern cactus violin meadow', guesses: 'about 3 × 10¹⁹ guesses (5 words, each one of 7,776)', time: 'about 90 years', strong: true, feedback: 'Five random words: long, easy to remember, very hard to guess. A grown-up keeps it somewhere safe, like a password manager.' },
]

// ── Step 4: least privilege ─────────────────────────────────────────────────

export interface Permission {
  id: string
  label: string
  icon: string
  needed: boolean
  why: string
}

export const PERMISSIONS: Permission[] = [
  { id: 'wheels', label: 'Drive the wheels', icon: '🛞', needed: true, why: 'It cannot deliver anything without moving.' },
  { id: 'map', label: 'Read the school map', icon: '🗺️', needed: true, why: 'It needs the map to find each classroom.' },
  { id: 'camera', label: 'Front camera, to avoid people', icon: '📷', needed: true, why: 'It must see people in the corridor to stop for them. The pictures stay on the robot.' },
  { id: 'mic', label: 'Record sound in classrooms', icon: '🎙️', needed: false, why: 'Delivering parcels does not need listening to lessons.' },
  { id: 'records', label: 'Read pupils’ names and addresses', icon: '📇', needed: false, why: 'It only needs room numbers, not anyone’s details.' },
  { id: 'admin', label: 'Change other robots’ passwords', icon: '👑', needed: false, why: 'Only the IT team should do that. If the app had a bug, every robot would be at risk.' },
  { id: 'install', label: 'Install software on the robot', icon: '📦', needed: false, why: 'Updates come only from the maker, checked by their signature.' },
]

/** Ids of permissions the child got wrong (granted but not needed, or needed but not granted). */
export function permissionMistakes(granted: ReadonlySet<string>): string[] {
  return PERMISSIONS.filter((p) => p.needed !== granted.has(p.id)).map((p) => p.id)
}

/** Stars from the number of mistakes over the whole mission. */
export function securityStars(mistakes: number): 1 | 2 | 3 {
  return mistakes === 0 ? 3 : mistakes <= 2 ? 2 : 1
}
