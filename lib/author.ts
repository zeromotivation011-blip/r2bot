// lib/author.ts
//
// One by-line, in one place, used by every credit and every piece of author
// schema on the site.
//
// This was a named individual. It is an editorial identity now, at the site
// owner's request — the name is not to appear anywhere public.
//
// The honest way to do that is to credit the organisation and say so in the
// schema. The alternative — keeping a Person node with an invented or partial
// name — would be false structured data, which is worse for both readers and
// search than a plain editorial credit. The trade-off is real: Google's
// guidance on experience and expertise rewards a named human, and a solo
// builder who taught science and now builds the robots the lessons describe
// is a strong signal that is now going unused. /about/how-this-is-written
// carries that credibility in prose instead, without the name.
//
// To go back to a named human later, change `name`, `url` and `kind` here and
// set AUTHOR_IS_PERSON to true. Nothing else on the site needs touching.

const SITE = (process.env.NEXT_PUBLIC_SITE_URL && !process.env.NEXT_PUBLIC_SITE_URL.includes('vercel.app') ? process.env.NEXT_PUBLIC_SITE_URL : 'https://www.r2bot.in')

/** Flip to true when a real person's name goes back on the by-line. */
export const AUTHOR_IS_PERSON = false

export const AUTHOR = {
  /** Display name on by-lines. */
  name: 'R2BOT Editorial',
  slug: 'how-this-is-written',
  url: `${SITE}/about/how-this-is-written`,
  jobTitle: 'Editorial',
  /** One line, for by-lines and cards. */
  tagline: 'Written and built by one person, who teaches first and builds second.',
  /** Longer bio, for the credit page and the schema description. */
  bio: [
    'Everything on R2BOT is written and built by one person — the Atlas entries, the one-minute lessons, the video courses, the simulators and the site itself. There is no content team and nothing here is generated and left unread.',
    'The approach comes from teaching science: start from something the reader already knows, then build up to the idea. That is why a lesson on PID control opens with a shower tap rather than a transfer function.',
    'The robots in the build courses are robots that were actually put together, which is why the lessons spend time on the parts that go wrong — the servo that browns out, the sensor that reads fine on a desk and badly on a floor.',
    'The aim is narrow and, we think, useful: make robotics explainable to someone with no background, in plain English, for free, and cite where every claim comes from.',
  ],
  /** Public profiles. Added to sameAs. */
  sameAs: [
    'https://www.youtube.com/channel/UCkqlyCeLtTpT_j6Q-3NFxww',
    'https://www.instagram.com/r2bot.in',
  ],
  image: null as string | null,
  email: 'hello@r2bot.in',
} as const

/** Author JSON-LD for the credit page and for article author fields. */
export function authorPersonJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': AUTHOR_IS_PERSON ? 'Person' : 'Organization',
    '@id': `${AUTHOR.url}#author`,
    name: AUTHOR.name,
    url: AUTHOR.url,
    description: AUTHOR.bio.join(' '),
    sameAs: [...AUTHOR.sameAs],
    ...(AUTHOR.image ? { image: `${SITE}${AUTHOR.image}` } : {}),
    ...(AUTHOR_IS_PERSON
      ? { jobTitle: AUTHOR.jobTitle, worksFor: { '@type': 'Organization', name: 'R2BOT', url: SITE } }
      : { parentOrganization: { '@type': 'Organization', name: 'R2BOT', url: SITE } }),
    knowsAbout: ['Robotics', 'ROS 2', 'Embedded systems', 'AI for robotics', 'Science education'],
  }
}

/** The `author` node to embed inside Article/Course/VideoObject schema. */
export function authorRef() {
  return { '@type': AUTHOR_IS_PERSON ? 'Person' : 'Organization', name: AUTHOR.name, url: AUTHOR.url }
}
