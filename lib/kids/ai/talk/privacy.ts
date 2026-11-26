// lib/kids/ai/talk/privacy.ts
// Two small guards for "Talk to your robot", shared by the browser and the
// optional AI route (app/api/kids/talk):
//
//  * looksPrivate(): spots things a child should never send anywhere — an
//    email, a phone-like run of digits, an @handle, a web address, "my name is
//    …", "I live at …", "my school is …". The AI route REFUSES the call when
//    anything matches (nothing is sent to the model), and the page checks the
//    same rule first so the child gets a kind explanation instead of a request.
//
//  * kidSafeSay(): masks a small list of unkind or rude words in what the
//    robot is asked to say. The robot shows and speaks "say" text out loud,
//    often on a shared classroom device, so it should never shout an insult.
//    English-only on purpose (the parser understands English); the AI path is
//    additionally limited to words the child wrote (schema.ts).

const PRIVATE_PATTERNS: Array<{ re: RegExp; what: string }> = [
  { re: /[\p{L}\p{N}._%+-]+@[\p{L}\p{N}.-]+\.[\p{L}]{2,}/u, what: 'an email address' },
  { re: /(?:^|[^\p{L}\p{N}])@[\p{L}\p{N}_.]{2,}/u, what: 'a username' },
  { re: /\b(?:https?:\/\/|www\.)\S+|\b[\p{L}\p{N}-]+\.(?:com|net|org|in|io|co|uk|de|es|br|me|app)\b/iu, what: 'a web address' },
  // Six or more digits, allowing spaces, dots, dashes or brackets between them (phone numbers, ids).
  { re: /(?:\d[\s().-]*){6,}/, what: 'a long number' },
  {
    re: /\b(?:my\s+(?:full\s+|real\s+|first\s+|last\s+|sur)?name\s+is|my\s+names?\s+is|i\s+am\s+called|i'?m\s+called|call\s+me|they\s+call\s+me)\b/i,
    what: 'a name',
  },
  {
    re: /\b(?:i\s+live\s+(?:at|in|on|near)|i'?m\s+from|i\s+am\s+from|my\s+(?:home\s+)?address|my\s+(?:house|home|flat|apartment)\s+is|my\s+(?:street|postcode|post\s+code|zip(?:\s+code)?|pin\s*code)|\d+\s+\p{L}+\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|nagar|marg|strasse|straße|calle|rua)\b)/iu,
    what: 'where you live',
  },
  { re: /\b(?:my\s+(?:phone|mobile|cell|number|email|e-mail|password|school|class|teacher|birthday|age|parents?|mum|mom|dad))\b/i, what: 'something about you' },
  { re: /\b(?:i\s+am|i'?m)\s+\d{1,2}\s*(?:years?|yrs?)\b/i, what: 'your age' },
]

/** Returns what looks private ("an email address" …), or null when the words look safe to send. */
export function looksPrivate(text: string): string | null {
  for (const p of PRIVATE_PATTERNS) if (p.re.test(text)) return p.what
  return null
}

// Kept short and obvious: unkind words a robot should not say out loud.
const UNKIND = [
  'stupid', 'idiot', 'idiots', 'dumb', 'dummy', 'moron', 'loser', 'losers', 'ugly', 'fat', 'shut up', 'hate you', 'i hate',
  'kill', 'die', 'dead', 'hurt', 'smash you', 'freak', 'weirdo', 'nerd', 'jerk', 'stinky', 'smelly', 'retard', 'retarded',
  'damn', 'hell', 'crap', 'shit', 'fuck', 'fucking', 'bitch', 'bastard', 'ass', 'arse', 'asshole', 'dick', 'piss', 'sucks', 'suck',
  'bloody', 'wtf', 'stfu',
]
const UNKIND_RE = new RegExp(`(^|[^\\p{L}\\p{N}])(${UNKIND.map((w) => w.replace(/ /g, '\\s+')).join('|')})(?=$|[^\\p{L}\\p{N}])`, 'giu')

/** Masks unkind words in what the robot will say. `masked` tells the page to explain why. */
export function kidSafeSay(text: string): { text: string; masked: boolean } {
  let masked = false
  const out = text.replace(UNKIND_RE, (_m, pre: string, word: string) => {
    masked = true
    return `${pre}${'*'.repeat(Math.min(6, word.replace(/\s+/g, '').length))}`
  })
  return { text: out, masked }
}
