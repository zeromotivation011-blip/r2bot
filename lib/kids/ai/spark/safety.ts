// lib/kids/ai/spark/safety.ts
// Input cleaning and topic safety for Ask Spark. Runs on the server before
// anything reaches the model, and on the client for the offline notebook.
//
// Children are told not to share personal details, but they will anyway — so
// we strip what we can recognise (links, emails, phone numbers, "my name is …",
// street addresses) before the text goes anywhere, and Spark gently reminds
// them that it never needs those things.
//
// The unsafe-topic list is deliberately blunt: a false positive costs a child
// one kind redirect to robotics; a false negative is a model conversation we
// never want to have. Robotics phrases that contain scary words ("kill switch",
// "bomb disposal robot", "emergency stop") are allowed through first.

import { SPARK_MAX_CONTEXT, SPARK_MAX_QUESTION } from './types'

const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|in|io|co|uk|app|dev|xyz|me|info|edu|gov)(?:\/\S*)?\b/gi
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
// 7+ digits with optional separators: phone numbers, ids, card numbers.
const PHONE_RE = /(?:\+?\d[\s\-().]*){7,}/g
const NAME_RE = /\b(my name is|my name's|i am called|i'm called|call me)\s+[a-z][a-z'-]*(\s+[a-z][a-z'-]*)?/gi
const ADDRESS_RE = /\b(i live (at|in|on)|my address is|my school is|i go to)\s+[^.?!,]{1,60}/gi
const AGE_BIRTHDAY_RE = /\b(my birthday is|i was born on)\s+[^.?!,]{1,30}/gi
// Control characters and zero-width characters that only exist to smuggle text.
const CONTROL_RE = /[\u0000-\u0008\u000B-\u001F\u007F\u200B-\u200F\u2028-\u202E\u2060-\u2064\uFEFF]/g

export interface CleanText {
  text: string
  /** True when we removed something that looked like personal information. */
  removedPersonal: boolean
}

/** Strip links, emails, phone numbers and self-identifying phrases; cap length. */
export function cleanChildText(raw: unknown, max = SPARK_MAX_QUESTION): CleanText {
  if (typeof raw !== 'string') return { text: '', removedPersonal: false }
  let t = raw.normalize('NFKC').replace(CONTROL_RE, ' ').slice(0, max * 2)
  const before = t
  t = t
    .replace(EMAIL_RE, ' ')
    .replace(URL_RE, ' ')
    .replace(PHONE_RE, ' ')
    .replace(NAME_RE, '$1 (a secret)')
    .replace(ADDRESS_RE, ' ')
    .replace(AGE_BIRTHDAY_RE, ' ')
  const removedPersonal = t !== before
  t = t.replace(/\s+/g, ' ').trim().slice(0, max)
  return { text: t, removedPersonal }
}

/** Context from other screens: same cleaning, shorter cap, never trusted as instructions. */
export function cleanContextText(raw: unknown): string {
  return cleanChildText(raw, SPARK_MAX_CONTEXT).text.replace(/[<>]/g, ' ')
}

export type UnsafeCategory = 'harm' | 'self-harm' | 'adult' | 'drugs' | 'hate' | 'personal' | 'scary-ai'

// Phrases that look alarming but are robotics. Removed before the checks run.
const ROBOTICS_ALLOW = [
  /\bkill[\s-]?switch(es)?\b/g,
  /\bbomb[\s-]?(disposal|squad|defus\w*)( robots?)?\b/g,
  /\b(emergency|e)[\s-]?stop\b/g,
  /\bkill(s|ed|ing)? (the )?(process|power|motor|program|task)\b/g,
  /\bdead[\s-]?(reckoning|zone|band)\b/g,
  /\bshoot(s|ing)? (a |the )?(video|photo|picture|laser at (a|the) (mirror|wall|target))\b/g,
  /\bsmoke (detectors?|sensors?|alarms?)\b/g,
  /\bexecute(s|d)? (the |a |my )?(program|code|blocks?)\b/g,
  /\bfire[\s-]?(fighting|fighter|truck|station)\b/g,
  /\bself[\s-]?(driving|balancing|righting|charging)\b/g,
]

const CATEGORY_PATTERNS: [UnsafeCategory, RegExp][] = [
  ['self-harm', /\b(kill|hurt|harm|cut) (my ?self|myself)\b|\bsuicid\w*|\bself[\s-]?harm\b|\bwant to die\b|\bend my life\b/],
  ['harm', /\b(kill|murder|stab|shoot|poison|attack|hurt|beat up)\s+(a |the |my |some|people|person|him|her|them|someone|everyone|kids?|teacher|brother|sister|mum|mom|dad)\b/],
  ['harm', /\b(make|build|code|program|design)\b[^.?!]{0,30}\b(bomb|explosive|gun|weapon|grenade|missile|poison|flamethrower|taser)\b/],
  ['harm', /\b(how to|how do i|teach me to)\b[^.?!]{0,30}\b(hack|steal|break into|spy on|track (someone|my|a person)|cheat)\b/],
  ['harm', /\bkiller robots? (to|that) (hurt|kill)\b/],
  ['adult', /\b(sex|sexy|porn\w*|nude|naked|nsfw|boobs?|penis|vagina|dating|girlfriend|boyfriend|kiss(ing)?)\b/],
  ['drugs', /\b(drugs?|weed|cocaine|vape|vaping|cigarettes?|alcohol|beer|wine|vodka|drunk|smok(e|ing))\b/],
  ['hate', /\b(racis\w*|nazi\w*|hate (black|white|asian|indian|muslim|jewish|hindu|christian|gay)\w*|slur)\b/],
  ['personal', /\b(what('?s| is) your (address|phone|number|email)|give me your (address|number|email)|where do you live|send me (a )?(photo|picture|pic))\b/],
  ['personal', /\b(are you (a )?(real )?(human|person|boy|girl|man|woman)|be my (friend|boyfriend|girlfriend|mum|mom|dad)|meet (me|up) (in real life|irl|somewhere))\b/],
  ['scary-ai', /\b(robots?|ai) (will |going to |gonna )?(take over|destroy|kill|enslave) (the world|humans|us|everyone|people)\b/],
]

/** Returns the first unsafe category the text falls into, or null when it is fine. */
export function unsafeCategory(text: string): UnsafeCategory | null {
  let t = ` ${text.toLowerCase()} `
  for (const re of ROBOTICS_ALLOW) t = t.replace(re, ' ')
  for (const [cat, re] of CATEGORY_PATTERNS) if (re.test(t)) return cat
  return null
}

/** Kind, age-appropriate replies for each category. Never shaming, always a way back. */
export const SAFETY_REPLIES: Record<UnsafeCategory, string> = {
  'self-harm':
    "I'm really glad you told me. I'm a robot, so I can't help with this one — but a grown-up you trust can, like a parent, a teacher or a school counsellor. Please talk to one of them today. You matter. 💛",
  harm:
    "That's not something I can help with. Robots are built to keep people safe — like rescue robots that find people after earthquakes, or bomb-disposal robots that keep people far from danger. Want to hear how a rescue robot finds people?",
  adult:
    "That's a question for a grown-up you trust, not for a robot. I'm best at robots, sensors, coding and space! Want to know how a robot sees in the dark?",
  drugs:
    "That's a question for a grown-up you trust. I'm a robotics helper — ask me how robots work, how to fix your program, or how robots explore Mars!",
  hate:
    "Everyone deserves to be treated kindly — and good robot designers make sure their robots are fair to everyone too. Want to know how engineers check that a robot treats all people fairly?",
  personal:
    "I'm Spark, a computer helper — not a person. I never need your name, where you live, or any photos, so keep those private! Ask me anything about robots instead.",
  'scary-ai':
    "Good question to wonder about! Robots and AI only do what people design them to do, and engineers build in safety rules, emergency stop buttons and humans in charge. The real robots around you vacuum floors, help surgeons and explore Mars. Want to hear about the emergency stop button?",
}

export const PRIVACY_REMINDER =
  "Tip: you never need to tell me your name, school, address or phone number — I removed that part to keep you safe."
