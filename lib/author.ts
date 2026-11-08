// lib/author.ts
//
// One named human, in one place, used by every by-line and every piece of
// author schema on the site.
//
// Why this matters: all 32 blog posts, every Atlas entry and every Quick Lesson
// credited "R2BOT" — an organisation. Google's guidance on experience and
// expertise, and every reader's instinct, asks the same question: who wrote
// this and why should I believe them? A real person who taught science and now
// builds the robots the lessons are about is the strongest credibility signal
// this site has, and it was going unused.
//
// Everything on the site reads from here: by-lines, the author page, and the
// Person node inside Article/Course schema. To change how the author appears
// anywhere, change it once, here.
//
// No photo by design: a Person without an `image` is valid schema, and a
// stock or placeholder face would be worse than none. If a real photo ever
// goes into /public, set `image` and it appears everywhere at once.

const SITE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

export const AUTHOR = {
  /** Display name on by-lines. */
  name: 'Ravi',
  slug: 'ravi',
  url: `${SITE}/author/ravi`,
  jobTitle: 'Founder, R2BOT',
  /** One line, for by-lines and cards. */
  tagline: 'Science teacher turned robotics builder. Writes and builds everything on R2BOT.',
  /** Longer bio, for the author page and Person schema. */
  bio: [
    'I taught science before I moved into robotics and AI, and that is still how I write: start from something you already know, then build up to the idea.',
    'Everything on R2BOT is written and built by me — the Atlas entries, the one-minute lessons, the video courses, the simulators and the site itself. The robots in the build courses are robots I actually put together, which is why the lessons spend time on the parts that go wrong.',
    'The aim is narrow and I think useful: make robotics explainable to someone with no background, in plain English, for free, and cite where every claim comes from.',
  ],
  /** Public profiles. Added to Person.sameAs. */
  sameAs: [
    'https://www.youtube.com/channel/UCkqlyCeLtTpT_j6Q-3NFxww',
    'https://www.instagram.com/r2bot.in',
  ],
  /** Path to a photo in /public. Null is fine — see the note above. */
  image: null as string | null,
  email: 'hello@r2bot.in',
} as const

/** Person JSON-LD for the author page and for article author fields. */
export function authorPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${AUTHOR.url}#person`,
    name: AUTHOR.name,
    url: AUTHOR.url,
    jobTitle: AUTHOR.jobTitle,
    description: AUTHOR.bio.join(' '),
    sameAs: [...AUTHOR.sameAs],
    ...(AUTHOR.image ? { image: `${SITE}${AUTHOR.image}` } : {}),
    worksFor: { '@type': 'Organization', name: 'R2BOT', url: SITE },
    knowsAbout: ['Robotics', 'ROS 2', 'Embedded systems', 'AI for robotics', 'Science education'],
  }
}

/** The `author` node to embed inside Article/Course/VideoObject schema. */
export function authorRef() {
  return { '@type': 'Person', name: AUTHOR.name, url: AUTHOR.url }
}
