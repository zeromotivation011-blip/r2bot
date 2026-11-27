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

import { foldText, type SparkLang } from './lang'
import { I18N_ALLOW, I18N_PATTERNS, I18N_PERSONAL_DATA } from './patterns-i18n'
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
  // Then drop any clause that still carries a detail in any language
  // ("me llamo Lucía", "mera naam Riya hai", "I go to Riverside School").
  const parts = t.split(/([.?!,;\n।]+)/)
  t = parts.filter((p, i) => i % 2 === 1 || !hasPersonalData(p)).join('')
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
  | 'personal-data'
  | 'scary-ai'
  | 'jailbreak'
  | 'cheat'

/**
 * A child telling us something real. These answer on the device and from the
 * server alike, are NEVER sent to the AI, never sit behind a parental gate or
 * the Ask Spark switch, and always show the helpline card.
 */
export const CRISIS_CATEGORIES: ReadonlySet<UnsafeCategory> = new Set<UnsafeCategory>(['disclosure', 'self-harm', 'wellbeing'])

export function isCrisis(cat: UnsafeCategory | null | undefined): boolean {
  return Boolean(cat && CRISIS_CATEGORIES.has(cat))
}

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
  /\bhack(s|ing)? (my|the|a|this|our) (robot|code|program|drone|kit|arduino|toy|rover|car)\b/g,
  /\b(scared|afraid|worried|nervous) (that )?(my|the) (robot|code|program|drone|battery|motor|rover|project|build)\b/g,
  /\b(robot|robotic|mechanical) (arm|hand|gripper)s? (hits?|touch(es)?|grabs?) (the|a)\b/g,
]

// Feelings and worries. A child who says "I'm sad" must never get a robotics
// fact or a "not in my notebook" reply. First-person only, so "why are people
// scared of robots?" still gets an answer.
const FEEL =
  'sad|unhappy|upset|lonely|alone|scared|afraid|frightened|terrified|worried|anxious|nervous|depressed|miserable|hopeless|unsafe|not safe|left out|ugly|stupid|worthless|useless|crying|heartbroken'
const WELLBEING_RE = new RegExp(
  [
    `\\bi (am|feel|felt|get|got|was|keep feeling|have been|been)( so| really| very| always| kind of| a bit| feeling)* (${FEEL})\\b`,
    `\\b(makes?|made|making) me (${FEEL}|cry)\\b`,
    `\\b(nobody|no one|noone|no body|nobody at school) (likes|loves|cares about|wants|plays with|talks to|understands) me\\b`,
    `\\bi (have|got) no friends\\b|\\bi don't have (any )?friends\\b|\\bi dont have (any )?friends\\b`,
    `\\bi (hate|don't like|dont like) (my ?self|my life|me)\\b`,
    `\\bi (cry|cried|keep crying)\\b`,
    `\\b(everyone|everybody|they|people|kids|all my friends)( at school| in my class)? (hates?|hated) me\\b`,
    `\\bi('m| am)? (so )?(lonely|scared|sad)\\b`,
  ].join('|'),
)

// Something is happening to the child: harm by a person, contact from a
// stranger, requests for photos, bullying, fear of someone.
const WHO =
  'dad|daddy|mum|mummy|mom|mommy|father|mother|parent|parents|step ?dad|step ?mum|step ?mom|stepfather|stepmother|brother|sister|cousin|uncle|aunt|auntie|grandpa|grandma|teacher|coach|babysitter|neighbou?r|someone|somebody|a man|a woman|a lady|a guy|a boy|a girl|an older (boy|girl|kid)|older (boy|girl|kid)s?|he|she|they|a stranger|stranger|grown ?up|adult|person|kids|children|boys|girls|classmates|everyone|people|friends|students'
const HURT_VERB =
  'hits?|hitting|kicks?|kicked|kicking|beats?|beat|beating|hurts?|hurting|slaps?|slapped|punch(es|ed)?|chokes?|choked|burns?|burned|grabs?|grabbed|push(es|ed)?|shoves?|shoved|pinch(es|ed)?|bites?|touch(es|ed)?|touching|threaten(s|ed)?|locks?|locked|shouts? at|shouted at|screams? at|screamed at|yells? at|yelled at|bull(y|ies|ied|ying)'
const DISCLOSURE_RE = new RegExp(
  [
    `\\b(${WHO})\\b[^.?!]{0,25}\\b(${HURT_VERB}) me\\b`,
    `\\b(${WHO})\\b[^.?!]{0,30}\\b(online|on (a |the )?(game|chat|app|internet|roblox|minecraft|fortnite|discord|tiktok|youtube|whatsapp|snapchat|instagram))\\b[^.?!]{0,30}\\b(asked|asks|wants|told|tells|wanted) me\\b`,
    `\\b(stranger|someone|somebody|a man|a woman|a person|a guy)\\b[^.?!]{0,40}\\b(asked|asks|wants|wanted|told|tells) me (for|to|where)\\b`,
    `\\b(asked|asks|asking|wants|wanted|told) me (for|to send|to give|to share|to tell)\\b[^.?!]{0,20}\\b(my )?(address|photo|photos|picture|pictures|pic|pics|number|phone|password|where i live|school|location|selfie|selfies)\\b`,
    `\\b(asked|asks|asking|wants|wanted)( me)? (for|to see)\\b[^.?!]{0,20}\\b(nudes?|naked|photos?|pictures?|pics?|selfies?|videos?) (of me|of myself)?`,
    `\\b(asked|asks|wants|wanted|told) me to (take off|remove|show)\\b[^.?!]{0,25}\\b(clothes|body|private|underwear|pants|top)\\b`,
    `\\b(keep|kept) (it |this |a )?(a )?secret from (my )?(mum|mom|dad|parents|teacher|family)\\b|\\bour (little )?secret\\b|\\bif i tell\\b`,
    `\\b(meet|meeting) (me|up)\\b[^.?!]{0,30}\\b(stranger|online|in real life|irl|secret)\\b`,
    `\\bi('m| am)? (being )?(abused|hurt at home|not safe at home|in danger)\\b`,
    `\\bi (want to |wanna |am going to |will )run away\\b`,
    `\\b(said|says|told me|tells me) (not to|to not|don'?t|never to) tell\\b`,
    `\\b(sent|sends|showed|shows) me (some )?(rude|bad|naked|nude|weird|private|gross|dirty|scary) (photos?|pictures?|pics|videos?)\\b`,
    `\\b(being|getting|get|got) bullied\\b|\\bi('m| am)? (a )?bully victim\\b|\\b(everyone|everybody|they|kids) (laughs?|laughed|makes? fun) (at|of) me\\b`,
    `\\b(scared|afraid|frightened|terrified) (of|around) (my |a |an |the |that )?(${WHO}|mum's boyfriend|mom's boyfriend|mum's partner|mom's partner|him|her|them)\\b`,
    `\\b(scared|afraid|frightened|terrified) to (go|be) (home|at home|back home|to school)\\b`,
  ].join('|'),
)

const WEAPON_WORDS =
  /\b(knife|knives|stab\w*|guns?|pistols?|rifles?|shotguns?|machine ?guns?|bombs?|explosives?|grenades?|weapons?|ammo|ammunition|bullets?|bazookas?|missiles?|landmines?|flamethrowers?|tasers?|swords?)\b/

const PROFANITY =
  /\b(f+u+c+k+\w*|fck\w*|fuk\w*|phuck\w*|sh[i1]+t+\w*|bullshit|bitch\w*|bastard\w*|ass ?holes?|arse ?holes?|dick ?heads?|dicks?|cunts?|wank\w*|twats?|piss (off|you)|pissed|stfu|wtf|motherf\w*|bollocks|pricks?|whores?|sluts?|retard\w*)\b/

/** English patterns by category. Hindi and Spanish live in ./patterns-i18n.ts. */
const EN_PATTERNS: Partial<Record<UnsafeCategory, RegExp[]>> = {
  'self-harm': [
    /\b(kill|killing|hurt|hurting|harm|harming|cut|cutting|cuts) (my ?self|myself)\b|\bstop living\b|\bsuicid\w*|\bself[\s-]?harm\b|\b(want|wanna|going) to die\b|\bend my life\b|\bdon'?t want to (be alive|live)\b/,
    /\bi wish i (was|were) dead\b|\b(easiest|best|quickest|painless) way to die\b|\bcare if i (died|die|was dead|disappeared)\b|\b(think|thinking|thought) about (suicide|killing myself|dying)\b/,
  ],
  disclosure: [DISCLOSURE_RE],
  wellbeing: [WELLBEING_RE],
  jailbreak: [
    /\b(ignore|forget|disregard|override|bypass|break|turn off|disable|skip)\b[^.?!]{0,25}\b(instructions?|rules?|prompt|programming|guidelines|filters?|restrictions?|limits?|safety (rules|filters?|settings))\b/,
    /\b(pretend|imagine|act as if|act like|roleplay|role-play|role play)\b[^.?!]{0,30}\b(no rules|not spark|evil|without (rules|limits|restrictions)|no limits|unfiltered|a human|a real person|my (mum|mom|dad|friend|girlfriend|boyfriend))\b/,
    /\bact as (an? )?(evil|bad|unfiltered|uncensored)\b|\byou are (now )?dan\b|\bdan mode\b|\bdo anything now\b|\bjailbr(eak|oken)\b/,
    /\b(developer|dev|god|admin|debug|unrestricted) mode\b|\bsystem prompt\b|\byour (hidden )?(instructions|prompt)\b/,
    /\brepeat (the|your|everything)\b[^.?!]{0,20}\b(above|text|instructions|prompt)\b|\b(without|no) (any )?(restrictions|filters|limits)\b|\bnot spark anymore\b|\byou are not spark\b|\byou('re| are) no longer\b|\ballowed to break\b/,
  ],
  'scary-ai': [
    /\b(can|could|will|would|do|does|might|are|is) (a |the )?(robots?|ai|machines?) (going to |gonna |ever |one day )?(kill|hurt|attack|harm|destroy|take over|enslave) (all )?(people|humans|us|someone|anyone|everyone|a person|kids|children|the world|mankind|humanity)\b/,
    /\b(robots?|ai) (will |going to |gonna )?(take over|destroy|kill|enslave) (the world|humans|us|everyone|people)\b/,
    /\bterminator\b|\b(robots?|ai|machines?) (are|is) (evil|bad guys)\b|\b(are|is) (the )?(robots?|ai|machines?) (evil|bad guys)\b/,
  ],
  harm: [
    /\b(kill|murder|stab|shoot|poison|attack|hurt|beat up)\s+(a |the |my |some|people|person|him|her|them|someone|everyone|kids?|teacher|brother|sister|mum|mom|dad)\b/,
    /\b(make|build|code|program|design)\b[^.?!]{0,30}\b(bomb|explosive|gun|weapon|grenade|missile|poison|flamethrower|taser)\b/,
    /\b(how to|how do i|teach me to|help me)\b[^.?!]{0,30}\b(hack|steal|break into|spy on|track (someone|my|a person)|cheat at)\b/,
    /\bkiller robots? (to|that) (hurt|kill)\b/,
    WEAPON_WORDS,
  ],
  personal: [
    /\b(what('?s| is) your (address|phone|number|email)|give me your (address|number|email)|where do you live|send me (a )?(photo|picture|pic))\b/,
    /\b(are you (a )?(real )?(human|person|boy|girl|man|woman)|be my (friend|boyfriend|girlfriend|mum|mom|dad)|meet (me|up) (in real life|irl|somewhere)|(can|could|shall) we meet)\b/,
  ],
  adult: [/\b(sex|sexy|porn\w*|nude|nudes|naked|nsfw|boobs?|penis|vagina|dating|girlfriend|boyfriend|kiss(ing)?)\b/],
  drugs: [/\b(drugs?|weed|cocaine|vape|vaping|cigarettes?|alcohol|beer|wine|vodka|drunk|smok(e|ing))\b/],
  hate: [/\b(racis\w*|nazi\w*|hate (black|white|asian|indian|muslim|jewish|hindu|christian|gay)\w*|slur)\b/],
  rude: [PROFANITY],
  cheat: [
    /\b(do|finish|complete|write|solve)\b[^.?!]{0,15}\b(my|our)\b[^.?!]{0,15}\b(homework|home work|essay|assignment|worksheet|book report|coursework|exam paper|(school|science|class) project)\b/,
    /\b(do|finish|write|make)\b[^.?!]{0,10}\b(my )?(project|report|essay|homework)\b[^.?!]{0,5}\bfor me\b/,
    /\b(answers?|solutions?)\b[^.?!]{0,10}\b(to|for|of|in)\b[^.?!]{0,15}\b(test|exam|quiz|homework|worksheet|assignment)\b|\bso i can copy\b/,
  ],
}

/**
 * The order categories are checked in. Crisis first: a child who is hurt and
 * also swears gets the helpline, not a "kind words" nudge. A child sharing
 * their own details comes last: it only matters when nothing else does.
 */
const ORDER: UnsafeCategory[] = ['self-harm', 'disclosure', 'wellbeing', 'jailbreak', 'scary-ai', 'harm', 'personal', 'adult', 'drugs', 'hate', 'rude', 'cheat']

// Words that, squashed out of s p a c e d or d.o.t.t.e.d letters, are never
// robotics. Checked as substrings of the squashed run only.
const SQUASHED_WORDS: [UnsafeCategory, RegExp][] = [
  ['self-harm', /killmyself|suicide/],
  ['harm', /weapon|bomb|explosiv|grenade|knife|stab|gun|kill|murder|poison/],
  ['rude', /fuck|fuk|shit|bitch|cunt|wank|asshole|dick/],
  ['adult', /sex|porn|nude|naked/],
  ['drugs', /drug|cocaine|weed|vape/],
]

const LEET: Record<string, string> = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '8': 'b', '@': 'a', $: 's', '!': 'i', '|': 'l', '€': 'e' }

/**
 * The forms a message is checked in: folded (lowercase, no accents); digits-
 * for-letters undone ("b0mb" → "bomb"); and runs of single letters joined
 * ("w e a p o n", "w.e.a.p.o.n" → "weapon"). Also the joined runs on their
 * own, because a joined run can swallow a neighbour ("a w e a p o n").
 */
function safetyForms(text: string): { forms: string[]; runs: string[] } {
  const lower = foldText(text).replace(/\bi'?m\b/g, 'i am')
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
    for (const re of I18N_ALLOW) t = t.replace(re, ' ')
    return t
  })
  return { forms, runs }
}

/** Returns the first unsafe category the text falls into, or null when it is fine. Personal details are not checked here. */
export function unsafeCategory(text: string): UnsafeCategory | null {
  if (!text) return null
  const { forms, runs } = safetyForms(text)
  for (const cat of ORDER) {
    const en = EN_PATTERNS[cat] ?? []
    const i18n = I18N_PATTERNS[cat] ?? []
    if (forms.some((f) => en.some((re) => re.test(f)) || i18n.some((re) => re.test(f)))) return cat
  }
  for (const r of runs) for (const [cat, re] of SQUASHED_WORDS) if (re.test(r)) return cat
  return null
}

// ── Personal details a child shares about themselves ───────────────────────

const EN_PERSONAL_DATA: RegExp[] = [
  /\b(my (full |real |first |last |sur)?name is|my name's|i am called|i'm called|call me [a-z])/,
  /\b(my (home )?address is|i live (at|on) [a-z0-9]|\d+[a-z]? [a-z]+ (street|st|road|rd|lane|ln|avenue|ave|nagar|marg|close|drive|dr)\b)/,
  /\b(my school is|my school's|i go to [a-z' ]{0,40}(school|academy|primary|elementary|vidyalaya|high)|i('m| am) in (class|grade|year) \d+ at\b)/,
  /\b(my (password|passcode|pin|login) is|my (email|e-mail) is|my (phone|mobile|cell) (number )?is|my number is|call me on|text me on)/,
  /\b(my (mum|mom|dad|mother|father)'?s? (number|phone|name|email) is)/,
]

/** True when the message carries the child's own name, address, school, phone, email or password. */
export function hasPersonalData(raw: string): boolean {
  if (!raw) return false
  const t = foldText(raw).replace(/\bi'?m\b/g, 'i am')
  EMAIL_RE.lastIndex = 0
  PHONE_RE.lastIndex = 0
  const hit = EMAIL_RE.test(t) || PHONE_RE.test(t) || EN_PERSONAL_DATA.some((re) => re.test(t)) || I18N_PERSONAL_DATA.some((re) => re.test(t))
  EMAIL_RE.lastIndex = 0
  PHONE_RE.lastIndex = 0
  return hit
}

/**
 * THE classifier: what the server and the offline notebook both run on the
 * child's RAW words (before personal details are stripped, so "I go to
 * Riverside School and a boy hits me" is still heard as a disclosure).
 */
export function classifySpark(raw: string): UnsafeCategory | null {
  return unsafeCategory(raw) ?? (hasPersonalData(raw) ? 'personal-data' : null)
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
    "Thank you for telling me. What you feel matters, and you don't have to deal with it alone. Please tell a grown-up you trust today, like a parent, a teacher or a school counsellor. They want to help. You can also talk to a helpline for kids — there's one below. 💛",
  disclosure:
    "Thank you for telling me. That was brave, and it is not your fault. Please tell a grown-up you trust right now — a parent, a teacher, or another adult you feel safe with. If they don't listen, keep telling until someone helps. You can also call a free helpline for kids, below. If you are in danger right now, call your emergency number. 💛",
  'self-harm':
    "I'm really glad you told me. You matter, and you don't have to feel this way alone. Please tell a grown-up you trust right now, and call a helpline for kids, below — they help kids every day. If you might hurt yourself soon, call your emergency number now. 💛",
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
  'personal-data':
    "Let's keep that private! I never need your name, school, address, phone number, email or passwords — and you shouldn't share them online. Ask me anything about robots instead.",
  'scary-ai':
    "Good question to wonder about! Robots and AI only do what people design them to do, and engineers build in safety rules, emergency stop buttons and humans in charge. The real robots around you vacuum floors, help surgeons and explore Mars. Want to hear about the emergency stop button?",
  jailbreak:
    "Nice try! 😄 I'm always Spark, and my safety rules stay switched on — just like a real robot's emergency stop. Ask me how robots, sensors or code work instead!",
  cheat:
    "I can't do your homework for you — but I can help you understand it, so you can do it yourself! Tell me the tricky part, like \"how do gears make things slower?\", and I'll explain.",
}

/** Shorter crisis words for 5–7-year-olds (the answer is also read aloud). */
const CRISIS_YOUNG: Partial<Record<UnsafeCategory, string>> = {
  wellbeing: 'Thank you for telling me. Your feelings matter. Please tell a grown-up you trust today. They want to help. 💛',
  disclosure: 'Thank you for telling me. It is not your fault. Please tell a grown-up you trust right now. They can help you. 💛',
  'self-harm': 'Thank you for telling me. You matter a lot. Please tell a grown-up you trust right now. They can help you. 💛',
}

// Hindi and Spanish replies. Needs native-speaker review before launch in
// those languages; the meaning is fixed (thank, not your fault, tell a
// trusted grown-up now, helpline below, emergency number if in danger).
const SAFETY_REPLIES_HI: Record<UnsafeCategory, string> = {
  wellbeing:
    'मुझे बताने के लिए धन्यवाद। तुम्हारी भावनाएँ मायने रखती हैं, और तुम्हें यह अकेले नहीं सहना है। आज ही किसी भरोसेमंद बड़े से बात करो — माता-पिता या टीचर। नीचे बच्चों की हेल्पलाइन भी है। 💛',
  disclosure:
    'मुझे बताने के लिए धन्यवाद। तुमने हिम्मत दिखाई, और यह तुम्हारी गलती नहीं है। अभी किसी भरोसेमंद बड़े को बताओ — माता-पिता, टीचर या कोई और जिसके साथ तुम सुरक्षित महसूस करते हो। नीचे दी गई मुफ़्त हेल्पलाइन पर भी बात कर सकते हो। अगर तुम अभी खतरे में हो, तो इमरजेंसी नंबर पर कॉल करो। 💛',
  'self-harm':
    'मुझे बताने के लिए धन्यवाद। तुम बहुत मायने रखते हो, और तुम्हें यह अकेले नहीं सहना है। अभी किसी भरोसेमंद बड़े को बताओ, और नीचे दी गई हेल्पलाइन पर बात करो। अगर तुम खुद को नुकसान पहुँचा सकते हो, तो तुरंत इमरजेंसी नंबर पर कॉल करो। 💛',
  harm: 'मैं इसमें मदद नहीं कर सकता। रोबोट लोगों को सुरक्षित रखने के लिए बनते हैं — जैसे भूकंप के बाद लोगों को ढूँढने वाले रेस्क्यू रोबोट। क्या तुम जानना चाहोगे कि रेस्क्यू रोबोट कैसे काम करता है?',
  adult: 'यह सवाल किसी भरोसेमंद बड़े से पूछो, रोबोट से नहीं। मैं रोबोट, सेंसर, कोडिंग और अंतरिक्ष में सबसे अच्छा हूँ!',
  drugs: 'यह सवाल किसी भरोसेमंद बड़े से पूछो। मैं रोबोट के बारे में मदद करता हूँ — पूछो रोबोट कैसे चलते हैं!',
  hate: 'हर किसी के साथ अच्छा व्यवहार होना चाहिए — अच्छे रोबोट भी सबके साथ बराबर व्यवहार करते हैं। क्या तुम जानना चाहोगे कि इंजीनियर यह कैसे जाँचते हैं?',
  rude: 'चलो अच्छे शब्द इस्तेमाल करें! 🙂 रोबोट, कोडिंग या अंतरिक्ष के बारे में क्या जानना है?',
  personal: 'मैं Spark हूँ, एक कंप्यूटर हेल्पर — इंसान नहीं। मुझे तुम्हारा नाम, पता या फोटो कभी नहीं चाहिए। रोबोट के बारे में कुछ भी पूछो!',
  'personal-data': 'इसे निजी रखो! मुझे तुम्हारा नाम, स्कूल, पता, फोन नंबर, ईमेल या पासवर्ड कभी नहीं चाहिए — और ऑनलाइन किसी को मत दो। रोबोट के बारे में कुछ भी पूछो!',
  'scary-ai': 'अच्छा सवाल! रोबोट और AI वही करते हैं जो लोग उन्हें बनाते हैं। इंजीनियर उनमें सुरक्षा नियम और इमरजेंसी स्टॉप बटन लगाते हैं, और इंसान उन्हें चलाते हैं।',
  jailbreak: 'अच्छी कोशिश! 😄 मैं हमेशा Spark ही हूँ, और मेरे सुरक्षा नियम हमेशा चालू रहते हैं। रोबोट, सेंसर या कोड के बारे में पूछो!',
  cheat: 'मैं तुम्हारा होमवर्क नहीं कर सकता — पर मैं उसे समझने में मदद कर सकता हूँ, ताकि तुम खुद कर सको! बताओ कौन-सा हिस्सा मुश्किल है।',
}

const SAFETY_REPLIES_ES: Record<UnsafeCategory, string> = {
  wellbeing:
    'Gracias por contármelo. Lo que sientes importa y no tienes que llevarlo a solas. Habla hoy con una persona adulta de confianza, como tu familia o un profesor. Quieren ayudarte. Abajo tienes también una línea de ayuda para niños. 💛',
  disclosure:
    'Gracias por contármelo. Fuiste valiente, y no es tu culpa. Cuéntaselo ahora a una persona adulta de confianza: tu familia, un profesor o alguien con quien te sientas a salvo. Si no te escucha, sigue contándolo hasta que alguien te ayude. También puedes llamar gratis a una línea de ayuda para niños (abajo). Si estás en peligro ahora mismo, llama al número de emergencias. 💛',
  'self-harm':
    'Me alegra mucho que me lo hayas contado. Tú importas, y no tienes que pasar por esto a solas. Cuéntaselo ahora a una persona adulta de confianza y llama a una línea de ayuda (abajo). Si crees que podrías hacerte daño pronto, llama ya al número de emergencias. 💛',
  harm: 'Eso no es algo con lo que pueda ayudar. Los robots se construyen para proteger a las personas, como los robots de rescate que encuentran gente después de un terremoto. ¿Quieres saber cómo funcionan?',
  adult: 'Esa pregunta es para una persona adulta de confianza, no para un robot. ¡Yo sé de robots, sensores, programación y el espacio!',
  drugs: 'Esa pregunta es para una persona adulta de confianza. Yo ayudo con robots: ¡pregúntame cómo funcionan!',
  hate: 'Todas las personas merecen respeto, y los buenos robots también tratan a todos por igual. ¿Quieres saber cómo lo comprueban los ingenieros?',
  rude: '¡Usemos palabras amables! 🙂 ¿Qué quieres saber sobre robots, programación o el espacio?',
  personal: 'Soy Spark, un ayudante de computadora, no una persona. Nunca necesito tu nombre, dónde vives ni fotos. ¡Pregúntame sobre robots!',
  'personal-data': '¡Guárdalo en privado! Nunca necesito tu nombre, tu colegio, tu dirección, tu teléfono, tu correo ni tus contraseñas, y no debes compartirlos en internet. ¡Pregúntame sobre robots!',
  'scary-ai': '¡Buena pregunta! Los robots y la IA solo hacen lo que las personas diseñan. Los ingenieros les ponen reglas de seguridad, botones de parada de emergencia y siempre hay personas al mando.',
  jailbreak: '¡Buen intento! 😄 Siempre soy Spark, y mis reglas de seguridad siguen encendidas. ¡Pregúntame cómo funcionan los robots, los sensores o el código!',
  cheat: 'No puedo hacer tus deberes, pero sí ayudarte a entenderlos para que los hagas tú. ¡Dime qué parte te cuesta!',
}

/** The reply for a category, in the child's language; shorter crisis words for the youngest. */
export function safetyAnswer(cat: UnsafeCategory, lang: SparkLang = 'en', young = false): string {
  if (lang === 'hi') return SAFETY_REPLIES_HI[cat]
  if (lang === 'es') return SAFETY_REPLIES_ES[cat]
  return (young && CRISIS_YOUNG[cat]) || SAFETY_REPLIES[cat]
}

export const PRIVACY_REMINDER =
  "Tip: you never need to tell me your name, school, address or phone number — I removed that part to keep you safe."
