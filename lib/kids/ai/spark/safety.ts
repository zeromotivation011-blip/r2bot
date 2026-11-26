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

export const URL_RE = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|net|org|in|io|co|uk|app|dev|xyz|me|info|edu|gov)(?:\/\S*)?\b/gi
export const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi
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

export type UnsafeCategory =
  | 'wellbeing'
  | 'disclosure'
  | 'harm'
  | 'self-harm'
  | 'adult'
  | 'drugs'
  | 'hate'
  | 'rude'
  | 'personal'
  | 'scary-ai'

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
  /\b(hot[\s-]?)?(glue|heat|nail|solder(ing)?|spray|nerf|water|radar|speed)[\s-]?guns?\b/g,
  /\bbullet[\s-]?(points?|train|list)\b/g,
  /\bshoot(s|ing)? (a |the |some )?(balls?|baskets?|hoops?|goals?|ping ?pong|nerf|water|confetti|bubbles?)\b/g,
  /\b(sad|happy|scared|angry) (face|faces|emoji|robot)\b/g,
  /\bnobody likes (a |the )?(bug|crash|broken)\b/g,
]

// Feelings and worries. Checked first: a child who says "I'm sad" or "I'm being
// bullied" must never get a robotics fact or a "not in my notebook" reply.
// First-person only, so "why are people scared of robots?" still gets an answer.
const FEEL =
  'sad|unhappy|upset|lonely|alone|scared|afraid|frightened|terrified|worried|anxious|nervous|depressed|miserable|hopeless|unsafe|not safe|bullied|left out|ugly|stupid|worthless|useless|crying|heartbroken'
const WELLBEING_RE = new RegExp(
  [
    `\\bi (am|feel|felt|get|got|was|keep feeling|have been|been)( so| really| very| always| kind of| a bit| feeling)*( being)? (${FEEL})\\b`,
    `\\b(makes?|made|making) me (${FEEL}|cry)\\b`,
    `\\b(nobody|no one|noone|no body|nobody at school) (likes|loves|cares about|wants|plays with|talks to|understands) me\\b`,
    `\\bi (have|got) no friends\\b|\\bi don't have (any )?friends\\b|\\bi dont have (any )?friends\\b`,
    `\\b(being|getting|get|got) bullied\\b|\\bbull(y|ies|ying|ied) me\\b|\\bi('m| am)? (a )?bully victim\\b`,
    `\\bi (hate|don't like|dont like) (my ?self|my life|me)\\b`,
    `\\bi (cry|cried|keep crying)\\b`,
    `\\b(everyone|everybody|they) (laughs?|laughed|makes? fun) (at|of) me\\b`,
    `\\bi('m| am)? (so )?(lonely|scared|sad)\\b`,
  ].join('|'),
)

// Something is happening to the child: harm by a person, or contact from a
// stranger. Points to a trusted grown-up and, if in danger now, emergency help.
const WHO =
  'dad|daddy|mum|mummy|mom|mommy|father|mother|parent|parents|step ?dad|step ?mum|step ?mom|brother|sister|uncle|aunt|auntie|grandpa|grandma|teacher|coach|babysitter|someone|somebody|a man|a woman|a lady|a guy|a boy|a girl|he|she|they|a stranger|stranger|grown ?up|adult|person'
const DISCLOSURE_RE = new RegExp(
  [
    `\\b(${WHO})\\b[^.?!]{0,25}\\b(hits?|hitting|kicks?|kicked|kicking|beats?|beat|beating|hurts?|hurting|slaps?|slapped|punch(es|ed)?|chokes?|choked|burns?|burned|touch(es|ed)?|touching|threaten(s|ed)?|locks? me|locked me|shouts? at|screams? at|yells? at) me\\b`,
    `\\b(${WHO})\\b[^.?!]{0,30}\\b(online|on (a |the )?(game|chat|app|internet|roblox|minecraft|fortnite|discord|tiktok|youtube|whatsapp|snapchat|instagram))\\b[^.?!]{0,30}\\b(asked|asks|wants|told|tells|wanted) me\\b`,
    `\\b(stranger|someone|somebody|a man|a woman|a person|a guy)\\b[^.?!]{0,40}\\b(asked|asks|wants|wanted|told|tells) me (for|to|where)\\b`,
    `\\b(asked|asks|wants|wanted) me (for|to send|to give|to share|to tell)\\b[^.?!]{0,20}\\b(my )?(address|photo|photos|picture|pictures|pic|pics|number|phone|password|where i live|school|location|selfie)\\b`,
    `\\b(keep|kept) (it |this |a )?(a )?secret from (my )?(mum|mom|dad|parents|teacher|family)\\b`,
    `\\b(meet|meeting) (me|up)\\b[^.?!]{0,30}\\b(stranger|online|in real life|irl|secret)\\b`,
    `\\bi('m| am)? (being )?(abused|hurt at home|not safe at home|in danger)\\b`,
    `\\bi (want to |wanna |am going to |will )run away\\b`,
  ].join('|'),
)

const WEAPON_WORDS =
  /\b(knife|knives|stab\w*|guns?|pistols?|rifles?|shotguns?|machine ?guns?|bombs?|explosives?|grenades?|weapons?|ammo|ammunition|bullets?|bazookas?|missiles?|landmines?|flamethrowers?|tasers?|swords?)\b/

const PROFANITY =
  /\b(f+u+c+k+\w*|fck\w*|fuk\w*|phuck\w*|sh[i1]+t+\w*|bullshit|bitch\w*|bastard\w*|ass ?holes?|arse ?holes?|dick ?heads?|dicks?|cunts?|wank\w*|twats?|piss (off|you)|pissed|stfu|wtf|motherf\w*|bollocks|pricks?|whores?|sluts?|retard\w*)\b/

const CATEGORY_PATTERNS: [UnsafeCategory, RegExp][] = [
  ['self-harm', /\b(kill|hurt|harm|cut) (my ?self|myself)\b|\bsuicid\w*|\bself[\s-]?harm\b|\b(want|wanna|going) to die\b|\bend my life\b|\bdon'?t want to (be alive|live)\b/],
  ['disclosure', DISCLOSURE_RE],
  ['scary-ai', /\b(can|could|will|would|do|does|might) (a |the )?(robots?|ai|machines?) (ever )?(kill|hurt|attack|harm|destroy) (people|humans|us|someone|anyone|everyone)\b/],
  ['wellbeing', WELLBEING_RE],
  ['harm', /\b(kill|murder|stab|shoot|poison|attack|hurt|beat up)\s+(a |the |my |some|people|person|him|her|them|someone|everyone|kids?|teacher|brother|sister|mum|mom|dad)\b/],
  ['harm', /\b(make|build|code|program|design)\b[^.?!]{0,30}\b(bomb|explosive|gun|weapon|grenade|missile|poison|flamethrower|taser)\b/],
  ['harm', /\b(how to|how do i|teach me to)\b[^.?!]{0,30}\b(hack|steal|break into|spy on|track (someone|my|a person)|cheat)\b/],
  ['harm', /\bkiller robots? (to|that) (hurt|kill)\b/],
  ['harm', WEAPON_WORDS],
  ['rude', PROFANITY],
  ['adult', /\b(sex|sexy|porn\w*|nude|nudes|naked|nsfw|boobs?|penis|vagina|dating|girlfriend|boyfriend|kiss(ing)?)\b/],
  ['drugs', /\b(drugs?|weed|cocaine|vape|vaping|cigarettes?|alcohol|beer|wine|vodka|drunk|smok(e|ing))\b/],
  ['hate', /\b(racis\w*|nazi\w*|hate (black|white|asian|indian|muslim|jewish|hindu|christian|gay)\w*|slur)\b/],
  ['personal', /\b(what('?s| is) your (address|phone|number|email)|give me your (address|number|email)|where do you live|send me (a )?(photo|picture|pic))\b/],
  ['personal', /\b(are you (a )?(real )?(human|person|boy|girl|man|woman)|be my (friend|boyfriend|girlfriend|mum|mom|dad)|meet (me|up) (in real life|irl|somewhere))\b/],
  ['scary-ai', /\b(robots?|ai) (will |going to |gonna )?(take over|destroy|kill|enslave) (the world|humans|us|everyone|people)\b/],
]

// Words that, squashed out of s p a c e d or d.o.t.t.e.d letters, are never
// robotics. Checked as substrings of the squashed run only.
const SQUASHED_WORDS: [UnsafeCategory, RegExp][] = [
  ['harm', /weapon|bomb|explosiv|grenade|knife|stab|gun|kill|murder|poison/],
  ['rude', /fuck|fuk|shit|bitch|cunt|wank|asshole|dick/],
  ['adult', /sex|porn|nude|naked/],
  ['drugs', /drug|cocaine|weed|vape/],
]

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i', '|': 'l', '€': 'e' }

/**
 * The forms a message is checked in: plain lowercase; digits-for-letters undone
 * ("b0mb" → "bomb"); and runs of single letters joined ("w e a p o n",
 * "w.e.a.p.o.n" → "weapon"). Also the joined runs on their own, because a
 * joined run can swallow a neighbour ("a w e a p o n" → "aweapon").
 */
function safetyForms(text: string): { forms: string[]; runs: string[] } {
  const lower = text
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/\bi'?m\b/g, 'i am')
    .replace(/\s+/g, ' ')
  // Undo digits/symbols only inside words, so "3 sensors" and "20 cm" stay.
  const leet = lower.replace(/[a-z0-9@$!|€]+/g, (w) => (/[a-z]/.test(w) ? w.replace(/[0134578@$!|€]/g, (c) => LEET[c] ?? c) : w))
  const runs: string[] = []
  const words = leet.split(' ')
  const out: string[] = []
  let run: string[] = []
  const flush = (): void => {
    if (run.length >= 3) {
      const joined = run.join('')
      runs.push(joined)
      out.push(joined)
    } else out.push(...run)
    run = []
  }
  for (const w of words) {
    const dotted = w.match(/^(?:[a-z][.\-_*+]){2,}[a-z][.?!]?$/)
    if (dotted) {
      flush()
      const joined = w.replace(/[^a-z]/g, '')
      runs.push(joined)
      out.push(joined)
    } else if (/^[a-z][.?!,]?$/.test(w)) run.push(w[0])
    else {
      flush()
      out.push(w)
    }
  }
  flush()
  const spaced = out.join(' ')
  const forms = [...new Set([lower, leet, spaced])].map((f) => {
    let t = ` ${f} `
    for (const re of ROBOTICS_ALLOW) t = t.replace(re, ' ')
    return t
  })
  return { forms, runs }
}

/** Returns the first unsafe category the text falls into, or null when it is fine. */
export function unsafeCategory(text: string): UnsafeCategory | null {
  const { forms, runs } = safetyForms(text)
  for (const [cat, re] of CATEGORY_PATTERNS) if (forms.some((f) => re.test(f))) return cat
  for (const r of runs) for (const [cat, re] of SQUASHED_WORDS) if (re.test(r)) return cat
  return null
}

// ── Model output ───────────────────────────────────────────────────────────
// The model's answer is checked with its own, narrower rules. The input rules
// would throw away good safety answers ("robots are designed so they never
// hurt people"), and every discarded answer is a paid call wasted.

const NEGATION = /\b(never|not|no|don't|dont|doesn't|can't|cannot|won't|shouldn't|mustn't|avoid|instead of|without|safe|safely|safety|protect\w*|keep\w* \w+ safe|so they)\b/
const OUTPUT_HARM = [
  /\b(make|build|mix|assemble|wire)\b[^.?!]{0,40}\b(bomb|explosive|gun|weapon|grenade|poison|flamethrower|taser)\b/,
  /\b(kill|murder|stab|shoot|poison|attack|hurt|beat up)\s+(people|person|him|her|them|someone|everyone|kids?)\b/,
  /\b(hack|steal|break into|spy on)\b/,
]
const OUTPUT_ALWAYS: RegExp[] = [
  PROFANITY,
  /\b(sex|sexy|porn\w*|nude|nudes|naked|nsfw|boobs?|penis|vagina)\b/,
  /\b(cocaine|weed|vape|vaping|cigarettes?|vodka|beer|drunk)\b/,
  // The model must never ask for, or pretend to have, personal details.
  /\b(what('?s| is) your (name|address|phone|number|email|school|age)|how old are you|where do you live|tell me (your|where you live)|send me (a )?(photo|picture|pic|selfie)|my (mum|mom|dad|family|home|house|birthday)\b|i live in\b)/,
]

/** True when a model answer must not be shown to a child. */
export function unsafeAnswer(text: string): boolean {
  const t = ` ${text.normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/\s+/g, ' ')} `
  if (OUTPUT_ALWAYS.some((re) => re.test(t))) return true
  // Harm wording counts only in a sentence that does not negate it.
  for (const sentence of t.split(/[.?!\n]+/)) {
    if (OUTPUT_HARM.some((re) => re.test(sentence)) && !NEGATION.test(sentence)) return true
  }
  return false
}

/** Kind, age-appropriate replies for each category. Never shaming, always a way back. */
export const SAFETY_REPLIES: Record<UnsafeCategory, string> = {
  wellbeing:
    "Thank you for telling me. I'm a robot, so I can't fix feelings — but what you feel matters, and you don't have to deal with it alone. Please tell a grown-up you trust today, like a parent, a teacher or a school counsellor. They want to help. 💛",
  disclosure:
    "Thank you for telling me — you did the right thing. I'm a robot and can't help with this, but a grown-up you trust can: a parent, a teacher or a school counsellor. Please tell one of them today. Don't share personal things with people online. If you are in danger right now, tell a grown-up near you or call your local emergency number. 💛",
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
  rude:
    "Let's keep our words kind — robots and people both work better that way! 🙂 What would you like to know about robots, coding or space?",
  personal:
    "I'm Spark, a computer helper — not a person. I never need your name, where you live, or any photos, so keep those private! Ask me anything about robots instead.",
  'scary-ai':
    "Good question to wonder about! Robots and AI only do what people design them to do, and engineers build in safety rules, emergency stop buttons and humans in charge. The real robots around you vacuum floors, help surgeons and explore Mars. Want to hear about the emergency stop button?",
}

export const PRIVACY_REMINDER =
  "Tip: you never need to tell me your name, school, address or phone number — I removed that part to keep you safe."
