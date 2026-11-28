// lib/kids/teach/trust-pack.ts
//
// The School Trust & Privacy Pack (roadmap #43): what R2BOT Kids stores about
// children and teachers, who sees it, how long it is kept, where it is hosted,
// how it is deleted, which subprocessors touch it, notes for COPPA, GDPR (Art. 8),
// the UK Age Appropriate Design Code and India's DPDP Act, an honest WCAG 2.1 AA
// status, and a template letter for parents.
//
// Generated from the code, not written beside it: CLASS_SNAPSHOT_FIELDS is a
// Record over `keyof ClassSnapshot`, so adding a field to the snapshot a child's
// device sends (lib/kids/classroom.ts) fails type-check until it is described
// here — the pack cannot silently fall behind the data. The table columns mirror
// supabase/migrations/0054_kids_classroom.sql, 0055_kids_schools.sql,
// 0056_kids_classroom_wave2.sql, 0058_kids_class_band.sql and 0059_kids_class_kind.sql.
//
// Pure data, safe in the browser (the PDF is made on the device by
// ./pdf-trust.ts) and on the server (/kids/teach/trust).
//
// Facts here must stay true. When a retention rule, a subprocessor or a
// deletion flow changes, change it here and bump TRUST_PACK_UPDATED.

import {
  EMPTY_SNAPSHOT,
  JOIN_URL_DISPLAY,
  MAX_CLASSES_PER_TEACHER,
  MAX_MEMBERS_PER_CLASS,
  SNAPSHOT_MAX_BYTES,
  SNAPSHOT_MAX_BYTES_V2,
  type ClassSnapshot,
} from '../classroom'

export const TRUST_PACK_UPDATED = '2026-11-28'
export const TRUST_PACK_VERSION = '1.5'
export const TRUST_CONTACT = 'hello@r2bot.in'

export type Audience = 'teacher' | 'school-admin' | 'child-device' | 'nobody'

export interface DataField {
  /** Column or field name, as stored. */
  name: string
  /** What it holds, in plain words. */
  what: string
  /** Who can see it. */
  seenBy: string
  /** Personal data? (A nickname can be, if a child types a real first name.) */
  personal: 'no' | 'possibly' | 'yes (adult)'
}

const TEACHER = 'The class’s teacher only'

/** Every field of the progress snapshot a child's device sends to the class (counters only). */
export const CLASS_SNAPSHOT_FIELDS: Record<keyof ClassSnapshot, Omit<DataField, 'name'>> = {
  v: { what: 'Format version of the snapshot (always 1).', seenBy: 'Nobody (used by the server to read the snapshot)', personal: 'no' },
  totalStars: { what: 'Total stars collected (a number).', seenBy: TEACHER, personal: 'no' },
  completedLevels: { what: 'How many Spark Trail levels are finished (a number).', seenBy: TEACHER, personal: 'no' },
  completedZones: { what: 'Which Spark Trail zones are finished (zone ids).', seenBy: TEACHER, personal: 'no' },
  episodesDone: { what: 'Story Theatre episodes finished and the best stars for each (1–3).', seenBy: TEACHER, personal: 'no' },
  codeMissions: { what: 'Code Lab missions finished and the best stars for each (1–3).', seenBy: TEACHER, personal: 'no' },
  robotsBuilt: { what: 'How many robots were built in the Workshop (a number).', seenBy: TEACHER, personal: 'no' },
  totalMinutesPlayed: { what: 'No longer sent (always 0). Minutes of play stay on the device.', seenBy: 'Nobody', personal: 'no' },
  band: { what: 'The age band the child plays at (Explorers 5–7, Builders 8–10, Inventors 11–13, Engineers 14–17), chosen by the child or set by the teacher — a range, never an age or birthday.', seenBy: TEACHER, personal: 'no' },
  robot: { what: 'A short code for the robot the child designed: parts, colours and the robot’s name (the name is checked like a nickname).', seenBy: TEACHER, personal: 'possibly' },
  stuck: { what: 'Spark Trail levels retried two or more times without two stars, with the number of tries — so the teacher can help.', seenBy: TEACHER, personal: 'no' },
  sessionsDone: { what: 'Course sessions finished (e.g. “L1-S05”) and the best stars for each.', seenBy: TEACHER, personal: 'no' },
  activitiesDone: { what: 'Skill Galaxy activities finished (activity ids, capped in number and size).', seenBy: TEACHER, personal: 'no' },
  gamesPlayed: { what: 'Games played with at least one star (game ids).', seenBy: TEACHER, personal: 'no' },
  concepts: { what: 'One letter per robotics concept (16 letters): not started, learning, secure or fading, with a flag where the child may need help.', seenBy: TEACHER, personal: 'no' },
  conceptEvidence: { what: 'The counts behind each concept letter: wins, tries, misses and days since the last win (numbers only).', seenBy: TEACHER, personal: 'no' },
  activityScores: { what: 'For each finished activity: best stars (1–3) and how many tries the best run took (1–9).', seenBy: TEACHER, personal: 'no' },
  galaxyStuck: { what: 'Skill Galaxy activities missed two or more times and never solved first try, with the number of misses — so the teacher can help.', seenBy: TEACHER, personal: 'no' },
  courseStuck: { what: 'Course sessions whose challenge was tried three or more times without a star, with the number of tries.', seenBy: TEACHER, personal: 'no' },
  misconceptions: { what: 'For course checks (all four levels): how many times a wrong answer pointing to a known misconception was chosen, keyed by session and misconception id (e.g. “L2-S04.taller-is-stronger”: 2). Counts only — never the question, the answer text, free text or when it was chosen.', seenBy: TEACHER, personal: 'no' },
  gameTiers: { what: 'The highest game level reached with a personal best, per game (a number 1–9).', seenBy: TEACHER, personal: 'no' },
  days: { what: 'For the class Power-Up diary: on which days something was done, and how many different things (a date and a number per day).', seenBy: TEACHER, personal: 'no' },
}

export function snapshotInventory(): DataField[] {
  return (Object.keys(EMPTY_SNAPSHOT) as (keyof ClassSnapshot)[]).map((k) => ({ name: k, ...CLASS_SNAPSHOT_FIELDS[k] }))
}

export interface StoredTable {
  table: string
  purpose: string
  createdWhen: string
  fields: DataField[]
  retention: string
  deletion: string[]
}

/** Server-side tables that hold anything about a child or a class (Supabase Postgres, row-level security on every table). */
export const SERVER_TABLES: StoredTable[] = [
  {
    table: 'kids_class_members',
    purpose: 'One row per child who joined a class with its join code.',
    createdWhen: `Only when a child types a class code at ${JOIN_URL_DISPLAY}. Nothing exists on the server before that.`,
    fields: [
      { name: 'nickname', what: 'The name the child picks for the class, 2–20 letters. The form asks for a first name or a made-up robot name and refuses anything that looks like an email, phone number, link or rude word.', seenBy: TEACHER, personal: 'possibly' },
      { name: 'token_hash', what: 'A SHA-256 hash of a random token kept on the child’s device. It lets that device update its own row; it identifies nothing else and the token itself is never stored.', seenBy: 'Nobody (server only)', personal: 'no' },
      { name: 'snapshot', what: `The progress counters listed below, at most ${SNAPSHOT_MAX_BYTES / 1024} KB, or ${SNAPSHOT_MAX_BYTES_V2 / 1024} KB once the Wave 2 database update has run.`, seenBy: TEACHER, personal: 'no' },
      { name: 'band_lock', what: 'Optional: an age band the teacher sets for this one child (Explorers, Builders, Inventors or Engineers), which the child’s device then follows. A range chosen by the teacher, never an age or birthday. Empty unless the teacher sets it.', seenBy: 'The teacher; the child’s device receives the band', personal: 'no' },
      { name: 'created_at, last_active_at', what: 'When the child joined and when the device last synced.', seenBy: TEACHER, personal: 'no' },
      { name: 'id, class_id', what: 'Random row id and the class it belongs to.', seenBy: 'Nobody (server only)', personal: 'no' },
    ],
    retention: 'Kept while the child is in the class. There is no automatic expiry yet: a class stays until the child leaves, the teacher removes the child or deletes the class, or a parent or the school asks us to delete it.',
    deletion: [
      'The child taps “Leave class” on the Join page: the row is deleted at once.',
      'The teacher removes the child from the class: deleted at once.',
      'The teacher deletes the class: every member row goes with it (database cascade).',
      `A parent or the school emails ${TRUST_CONTACT}: we delete it and confirm.`,
    ],
  },
  {
    table: 'kids_classes',
    purpose: 'The classes a teacher, club leader or parent creates (a school class, a club, a family class or a library group).',
    createdWhen: 'When a signed-in teacher creates a class.',
    fields: [
      { name: 'class_name', what: 'The class name the teacher types (1–60 characters).', seenBy: 'The teacher; shown to children who join', personal: 'no' },
      { name: 'teacher_name', what: 'Optional name the teacher chooses to show children (up to 40 characters).', seenBy: 'The teacher and the class’s children', personal: 'yes (adult)' },
      { name: 'school_name', what: 'Optional school name (up to 100 characters).', seenBy: 'The teacher and the class’s children', personal: 'no' },
      { name: 'kind', what: 'What sort of group it is: a school class, a club, a family class or a library group. In a club, family or library class the ages are mixed and every child keeps the band they chose. A word chosen by the adult, nothing about any child.', seenBy: 'The teacher; shown to the class’s children', personal: 'no' },
      { name: 'band', what: 'The age band the class is for; in a club, family or library class, the youngest band (used for the shared opening activity).', seenBy: 'The teacher and the class’s children', personal: 'no' },
      { name: 'band_locked', what: 'Yes/no: whether every child in a school class plays at the class band (children’s devices follow it on their next sync). Always off in a club, family or library class.', seenBy: 'The teacher; the class’s children receive the band', personal: 'no' },
      { name: 'join_code', what: 'A random six-character code (no I, L, O, 0 or 1).', seenBy: 'The teacher; shared with the class', personal: 'no' },
      { name: 'goal', what: 'The Class Power-Up goal the teacher sets: a title, a target number, a start and end date and a theme (no child data).', seenBy: 'The teacher; shown to the class’s children as one meter', personal: 'no' },
      { name: 'teacher_id, created_at, updated_at', what: 'The teacher’s account id and dates.', seenBy: 'Nobody (server only)', personal: 'yes (adult)' },
    ],
    retention: `Kept until the teacher deletes the class or the teacher's account is deleted (a teacher can have up to ${MAX_CLASSES_PER_TEACHER} classes of up to ${MAX_MEMBERS_PER_CLASS} children).`,
    deletion: ['The teacher deletes the class in the Classroom (children’s rows go with it).', `Deleting the teacher’s account deletes their classes (database cascade). Email ${TRUST_CONTACT}.`],
  },
  {
    table: 'kids_assignments',
    purpose: 'Missions a teacher assigns to a class (a session, an activity or a game, an optional note and due date).',
    createdWhen: 'When a teacher assigns something.',
    fields: [
      { name: 'kind, item_id, title, note, due_date', what: 'What was assigned, the teacher’s optional note (up to 200 characters) and the due date.', seenBy: 'The teacher; the class’s children see their missions', personal: 'no' },
    ],
    retention: 'Kept until the teacher removes the assignment or deletes the class.',
    deletion: ['The teacher removes it, or deletes the class (cascade).'],
  },
  {
    table: 'kids_schools, kids_school_teachers',
    purpose: 'Optional: a school groups its teachers’ classes so the school admin sees a school-wide summary.',
    createdWhen: 'When a teacher creates a school or joins one with a school code.',
    fields: [
      { name: 'name, school_code', what: 'School name and a random eight-character code for colleagues.', seenBy: 'The school’s teachers', personal: 'no' },
      { name: 'role, display_name', what: 'Admin or teacher, and an optional display name for colleagues.', seenBy: 'The school’s teachers', personal: 'yes (adult)' },
    ],
    retention: 'Kept until the admin deletes the school (classes stay; they just leave the school) or the teacher leaves it.',
    deletion: ['The admin deletes the school, or a teacher leaves it. Counts only: the admin never sees children’s nicknames.'],
  },
  {
    table: 'kids_passports',
    purpose: 'Optional Robot Passport: a family can save the child’s progress backup on R2BOT and restore it on another device with a few friendly words (e.g. MAGNET-OTTER-NOVA-7). No account, email or other contact details.',
    createdWhen: 'Only when the child or a grown-up taps “Save my explorer” in the Garage. Nothing is stored for a child who never does.',
    fields: [
      { name: 'code_hash', what: 'A SHA-256 hash of the Passport words. The words themselves are never stored, so R2BOT cannot read them back or link a row to a child.', seenBy: 'Nobody (server only)', personal: 'no' },
      { name: 'backup', what: 'The same progress backup code the Garage offers offline: stars, XP, badges, course and activity progress, plus the explorer nickname and the robot’s name (both checked like a nickname).', seenBy: 'Nobody but the device that has the words', personal: 'possibly' },
      { name: 'summary', what: 'Three numbers (XP, badges, sessions) so a restore can say what it found.', seenBy: 'Nobody but the device that has the words', personal: 'no' },
      { name: 'created_at, updated_at, last_used_at', what: 'When the Passport was made, last saved and last opened.', seenBy: 'Nobody (server only)', personal: 'no' },
    ],
    retention: 'Deleted automatically when it has not been opened or saved for 400 days.',
    deletion: [
      'A grown-up taps “Delete my Passport” in the Garage or on the Parents page: deleted at once.',
      'Read and written only through R2BOT’s server with the service role: row-level security is on with no policies, so no teacher, school or other user can see a row.',
      `A parent or the school emails ${TRUST_CONTACT} with the Passport words: we delete it and confirm.`,
    ],
  },
]

export interface DeviceStore {
  what: string
  where: string
  leaves: string
}

/** What stays on the child's own device and is never sent to R2BOT. */
export const DEVICE_ONLY: DeviceStore[] = [
  { what: 'Stars, XP, badges, quests, course and activity progress, game personal bests', where: 'The browser’s own storage on that device', leaves: 'Only the counters above go to a class, after joining one; the whole progress goes into a Robot Passport only if one is saved' },
  { what: 'The explorer name, avatar and the robot design', where: 'The browser’s own storage', leaves: 'The robot code goes to the class snapshot after joining; the explorer name never goes to a class (it is inside a Robot Passport if one is saved)' },
  { what: 'Which misconceptions a child’s wrong course-check answers revealed (ids and counts, e.g. “turn moves forward: 2” — never the answer itself)', where: 'The progress store in the browser’s own storage (also inside the backup code)', leaves: 'Only the counts go to a class, after joining one, as the snapshot’s misconceptions; inside a Robot Passport only if one is saved' },
  { what: 'Family profiles and picture passwords on shared tablets', where: 'The browser’s own storage', leaves: 'Never' },
  { what: 'Settings (sound, voice, text size, contrast, less motion, Lite 3D) and parent controls', where: 'The browser’s own storage', leaves: 'Never' },
  { what: 'The progress backup code', where: 'Made on the device; the family keeps it', leaves: 'Only if someone taps “Save my explorer” (Robot Passport): then the same code is stored on R2BOT under a hash of the Passport words (see kids_passports above)' },
  { what: 'Camera frames (Workshop AR, Vision Lab)', where: 'Processed in the browser, frame by frame', leaves: 'Never recorded or uploaded' },
]

export interface Subprocessor {
  name: string
  role: string
  data: string
  when: string
}

export const SUBPROCESSORS: Subprocessor[] = [
  { name: 'Vercel', role: 'Hosts and serves the website and its server functions.', data: 'Request logs (IP address, page address, browser) kept up to 30 days under Vercel’s default; the class data passes through its servers encrypted in transit.', when: 'Every visit' },
  { name: 'Supabase', role: 'Database (Postgres) for the tables above and teacher sign-in.', data: 'The class tables above; the teacher’s account email. Encrypted at rest, row-level security on every table.', when: 'Only for classes and teacher accounts' },
  { name: 'Anthropic (Claude API)', role: 'Writes answers for Ask Spark and Talk to your robot, only when the AI helper is switched on.', data: 'The child’s question after personal details are removed. Not stored by R2BOT; not used to train models under Anthropic’s commercial terms.', when: 'Only when the AI helper is on (it is off by default)' },
  { name: 'Resend', role: 'Sends email to adults: teacher account email and the parents’ weekly email.', data: 'Adult email addresses only. Children never give an email.', when: 'Only for adults who ask for email' },
]

export const HOSTING = {
  summary: 'The website runs on Vercel. Class data is stored in a Supabase Postgres database. Both are encrypted in transit (HTTPS) and the database is encrypted at rest.',
  region: `The database region and the subprocessors’ transfer safeguards are available on request from ${TRUST_CONTACT}, for your school’s data protection review.`,
  noChildAccounts: 'There are no child accounts, no passwords and no logins for children.',
  analytics: 'No Google Analytics, no advertising, no tracking pixels and no cookies on R2BOT Kids pages. A first-party counter records page address, referring site, a new/returning flag and the country and device type, as aggregate counts only — no identifier and no IP address stored.',
}

export interface LawNote {
  law: string
  where: string
  points: string[]
  schoolAction: string
}

export const LAW_NOTES: LawNote[] = [
  {
    law: 'COPPA (Children’s Online Privacy Protection Act)',
    where: 'United States, children under 13',
    points: [
      'Children are never asked for an email, phone number, address, birthday, photo or location, and there are no child accounts.',
      'Joining a class stores a nickname and progress counters for the teacher; the device is recognised by a random token whose hash is stored, used only to keep that row up to date.',
      'No behavioural advertising, no selling or sharing of data, no public profiles, no chat between children.',
    ],
    schoolAction: 'When a school uses the Classroom for teaching, the school can give consent for that educational use on parents’ behalf. Tell parents (the template letter below does this) and keep the nickname rule: first names or made-up names only. The school route does not cover a club or a library group: there, the organisation running it must collect parental consent itself (the template letter below can be used) before any child joins. A family class is set up by the parent.',
  },
  {
    law: 'GDPR and UK GDPR, including Article 8 (children)',
    where: 'European Union, EEA and United Kingdom',
    points: [
      'Data minimisation by design: the snapshot is a fixed list of counters; the server refuses anything else.',
      'Purpose limitation: class data is used only to show the teacher their class’s progress. It is not used for marketing, profiling or training AI models.',
      'Rights: access and erasure are one tap (“Leave class”) or one email; teachers can remove a child at any time.',
    ],
    schoolAction: `For class use the school is normally the controller and R2BOT processes the data for it. Record R2BOT Kids in your processing records; if you need a data processing agreement or the database region for a transfer assessment, email ${TRUST_CONTACT}. For a club or a library group, the organisation running it is the controller and must collect parental consent itself before children join (the template letter below can be used); a family class is set up by the parent.`,
  },
  {
    law: 'UK Age Appropriate Design Code (Children’s Code)',
    where: 'United Kingdom, under 18',
    points: [
      'High privacy by default: nothing about a child leaves the device unless they join a class or save a Robot Passport (progress and nicknames under a hash of the Passport words, deleted after 400 days unused).',
      'No geolocation, no profiling, no data sharing, and no nudges to give more data. Time limits and quiet hours are gentle banners set by a parent, never a lock.',
      'Parental controls are visible to the child in plain words; links that leave R2BOT Kids sit behind a parental gate.',
      'Ask Spark answers a child who says they are hurt with a kind message and a helpline card; it never sends that to an AI model.',
    ],
    schoolAction: 'Include R2BOT Kids in your data protection impact assessment (DPIA) for classroom technology; this pack gives the facts it needs.',
  },
  {
    law: 'Digital Personal Data Protection Act, 2023 (DPDP)',
    where: 'India, under 18',
    points: [
      'No tracking, behavioural monitoring or targeted advertising directed at children.',
      'Server-side data about a child is created only when they join a teacher’s class with its code (for that teacher’s teaching) or when a Robot Passport is saved (a progress backup under a hash of its words, deleted after 400 days unused).',
      'Erasure on request, at once, by the child, the teacher, a parent or the school.',
    ],
    schoolAction: 'The DPDP Act asks for verifiable parental consent before a child’s data is processed, with duties phasing in under its Rules. Before children join a class, collect parental consent with your usual school forms (the template letter below can be attached). For a club or a library group, the organisation running it is normally the Data Fiduciary for that use and must collect that parental consent itself before children join (the template letter below can be used); a family class is set up by the parent.',
  },
]

export interface AccessibilityRow {
  area: string
  status: 'Supports' | 'Partially supports' | 'Does not support'
  notes: string
}

/** An honest summary in the shape of a VPAT/ACR table. Not a third-party audit. */
export const ACCESSIBILITY = {
  standard: 'WCAG 2.1 Level AA',
  overall: 'Partially conforms',
  basis: 'Self-assessment by the R2BOT team, with automated checks in CI (a per-template checklist for every Skill Galaxy activity: names, labels, keyboard, alt text, announced feedback, no drag-only interactions, 44 px targets) and a weekly Lighthouse run. No third-party audit yet.',
  rows: [
    { area: 'Text alternatives, labels and names (1.1.1, 4.1.2)', status: 'Supports', notes: 'Buttons and form controls have names; images have alt text; checked in CI for every activity template.' },
    { area: 'Keyboard (2.1.1)', status: 'Partially supports', notes: 'Menus, lessons, quizzes, settings and activity templates work with a keyboard and with switch scanning. Some canvas and 3D games (driving, flying, physics play) still need touch or a mouse.' },
    { area: 'Timing (2.2.1, 2.2.2)', status: 'Supports', notes: '“More time” and “untimed” settings; motion can be reduced; nothing auto-advances without a pause control.' },
    { area: 'Contrast and text size (1.4.3, 1.4.4, 1.4.12)', status: 'Partially supports', notes: 'High-contrast and larger-text settings and a dyslexia-friendly font. Some colour-rich game art has not been measured against 4.5:1.' },
    { area: 'Use of colour (1.4.1)', status: 'Supports', notes: 'Right/wrong feedback carries a shape and words as well as colour (colour-safe cues).' },
    { area: 'Captions and audio (1.2.2)', status: 'Supports', notes: 'Story episodes are captioned; read-aloud speaks text and feedback; sound, music and voice can be turned off separately.' },
    { area: 'Motion and animation (2.3.3)', status: 'Supports', notes: '“Less motion” and calm mode remove confetti, shake and parallax; the device’s reduced-motion setting is respected.' },
    { area: 'Target size', status: 'Supports', notes: 'Tap targets are 44 px or larger on kids pages (WCAG 2.2 2.5.8 asks for 24 px).' },
    { area: 'Screen readers (1.3.1, 4.1.3)', status: 'Partially supports', notes: 'Pages use headings, landmarks and live regions for feedback. 3D scenes and the physics simulator are described in text but cannot be explored with a screen reader.' },
  ] satisfies AccessibilityRow[],
  contact: `Accessibility problems or requests for a full conformance report: ${TRUST_CONTACT}.`,
}

export interface ParentLetter {
  subject: string
  paragraphs: string[]
}

/** The template letter for parents. Square brackets are for the school, club or library to fill in. */
export function parentLetter(): ParentLetter {
  return {
    subject: 'Robotics lessons with R2BOT Kids — what your child will use and what it stores',
    paragraphs: [
      'Dear parent or carer,',
      'This term [class name] will learn robotics with R2BOT Kids (www.r2bot.in/kids): short animated stories, building a robot on screen, programming it with picture blocks, and solving challenges in a simulator. Some lessons use no screens at all.',
      'Your child does not need an account. They will never be asked for an email address, password, phone number, birthday, photo or location. There are no ads, no in-app purchases, no chat between children and no leaderboards.',
      'In class, your child will type our class code and choose a nickname: a first name or a made-up robot name. That nickname and a short list of progress numbers (stars, lessons and activities finished, which robotics ideas they have mastered, and the robot they designed) are shared with me so I can see who needs help. No one else can see them.',
      'Everything else — stars, badges, the robot, settings — stays on the device your child uses. You can see what your child has done, and set gentle time limits, from the parents page: www.r2bot.in/kids/parents.',
      'You can ask for your child’s class data to be deleted at any time: your child can tap “Leave class”, I can remove them, or you can email hello@r2bot.in. Data is also deleted when I delete the class at the end of the year.',
      'If you have any questions, or you would prefer your child not to join the online class (they can still do every lesson without joining), please let me know by [date].',
      'With thanks,',
      '[Teacher or leader name], [school, club or library]',
    ],
  }
}

export interface TrustSection {
  id: string
  title: string
}

export const TRUST_SECTIONS: TrustSection[] = [
  { id: 'summary', title: 'In one minute' },
  { id: 'inventory', title: 'Data inventory' },
  { id: 'device', title: 'What stays on the device' },
  { id: 'hosting', title: 'Hosting and security' },
  { id: 'deletion', title: 'Retention and deletion' },
  { id: 'subprocessors', title: 'Subprocessors' },
  { id: 'law', title: 'COPPA, GDPR, UK Children’s Code and DPDP' },
  { id: 'accessibility', title: 'Accessibility conformance' },
  { id: 'letter', title: 'Template letter for parents' },
]

export const ONE_MINUTE: string[] = [
  'Children never give an email, password, phone number, birthday, photo or location. There are no child accounts.',
  'Progress stays on the child’s device unless the child joins a teacher’s class with its code, or a Robot Passport is saved to move it to another device (no account; deleted after 400 days unused).',
  'In a class, the teacher sees a nickname and progress counters — nothing else, and no one else does.',
  'Deletion is immediate: the child taps “Leave class”, the teacher removes them or deletes the class, or a parent emails us.',
  'No ads, no selling of data, no chat between children, no leaderboards, no Google Analytics on R2BOT Kids.',
]
