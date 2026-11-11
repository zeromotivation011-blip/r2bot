// lib/canonical-map.ts
//
// One page per query. This file is the record of which page owns which topic
// when two surfaces could both answer it.
//
// THE RULE:
//   • Atlas owns the definition query     — "what is SLAM"
//   • Quick Lessons own the video query   — "how does SLAM work" (60s + demo)
//   • /robots/<slug> owns a named robot   — "Boston Dynamics Spot"
//   • /compare/<slug> owns the structured head-to-head — "X vs Y" with a spec
//     table, verdict per aspect and "choose X when" (data: lib/compare/index.ts)
//   • Blog owns the narrative decision guide — "which board should I buy",
//     "how I chose". Where both exist for one pair (Arduino / ESP32 / Pi), the
//     compare page is the table and the post is the story; they cross-link and
//     carry different titles so they answer different intents.
//
// Anything that breaks that rule is either redirected here or differentiated
// and cross-linked, so the two pages feed each other instead of competing.

import { SHORTS, isLive } from '@/lib/shorts'

/**
 * Atlas robot entries that are the same robot as a far richer /robots page.
 * Nine robots had two indexable URLs each and split their own ranking signal.
 * /robots/<slug> wins: it has specs, stats, comparisons and a deep dive, where
 * the Atlas entries averaged 203 words. These Atlas slugs 308 to /robots and
 * are excluded from the sitemap (see next.config.mjs and app/sitemap.ts).
 *
 * Atlas robot slug → canonical /robots slug.
 */
export const ATLAS_ROBOT_CANONICAL: Record<string, string> = {
  asimo: 'asimo',
  atlas: 'atlas',
  optimus: 'optimus',
  roomba: 'roomba',
  spot: 'spot',
  'curiosity-rover': 'curiosity',
  'da-vinci-surgical-system': 'da-vinci',
  'kiva-warehouse-robots': 'amazon-kiva',
  'perseverance-rover': 'perseverance',
  // 9 Nov 2026: six more robots got full /robots profiles.
  digit: 'digit',
  stretch: 'stretch',
  shakey: 'shakey',
  sojourner: 'sojourner',
  unimate: 'unimate',
  'ingenuity-helicopter': 'ingenuity',
}

export const ATLAS_ROBOTS_REDIRECTED: ReadonlySet<string> = new Set(
  Object.keys(ATLAS_ROBOT_CANONICAL),
)

/**
 * Blog posts that were a thinner copy of an Atlas concept.
 *
 * 11 Nov 2026: five posts of 282–337 words restated a concept the Atlas
 * already explains at 414–1,118 words, so each pair was competing for one
 * "what is X" query with the weaker page carrying the friendlier title. The
 * Atlas entry owns the query. The MDX files are deleted (lib/blog.ts simply
 * no longer finds them, so they leave the index and the sitemap) and
 * next.config.mjs 308s the old URL. Duplicated there because next.config.mjs
 * cannot import TypeScript; keep the two lists identical.
 *
 * Blog slug → Atlas concept slug.
 */
export const BLOG_TO_ATLAS: Record<string, string> = {
  'what-is-slam-in-plain-words': 'slam',
  'pid-controller-explained-simply': 'pid-controller',
  'computer-vision-for-robots-explained': 'computer-vision',
  'sim-to-real-gap-explained': 'sim-to-real',
  'large-language-models-and-robots': 'large-language-model-robotics',
}

/**
 * Atlas path → the Quick Lesson that teaches the same idea as a 60-second
 * video with an interactive demo.
 *
 * Derived, not hand-written: every Quick Lesson already declares the Atlas
 * entries it goes deeper into, so inverting that list gives the reverse link
 * for free and can never drift out of sync. Twelve Quick Lessons share a slug
 * with an Atlas concept (slam, lidar, pid-controller, inverse-kinematics…);
 * showing the video on the Atlas page is what makes two pages on one topic
 * useful rather than competing — different intent, mutually linked.
 */
const LESSON_BY_ATLAS_PATH: Map<string, { slug: string; title: string }[]> = (() => {
  const map = new Map<string, { slug: string; title: string }[]>()
  const add = (path: string, lesson: { slug: string; title: string }) => {
    const list = map.get(path) ?? []
    if (!list.some((l) => l.slug === lesson.slug)) list.push({ slug: lesson.slug, title: lesson.title })
    map.set(path, list)
  }
  for (const lesson of SHORTS) {
    // An exact slug match is the strongest possible signal of the same topic,
    // so it goes first; otherwise the first lesson to claim a concept keeps it.
    add(`/atlas/concept/${lesson.slug}`, lesson)
  }
  for (const lesson of SHORTS) {
    for (const link of lesson.atlas) add(link.href.split('?')[0].replace(/\/+$/, ''), lesson)
  }
  return map
})()

/** The Quick Lesson for an Atlas entry, if one teaches the same idea (and its Short is public). */
export function quickLessonForAtlas(
  type: string,
  slug: string,
): { slug: string; title: string; href: string } | null {
  const list = LESSON_BY_ATLAS_PATH.get(`/atlas/${type}/${slug}`) ?? []
  const hit = list.find((l) => {
    const full = SHORTS.find((x) => x.slug === l.slug)
    return full ? isLive(full) : false
  })
  if (!hit) return null
  return { ...hit, href: `/shorts/${hit.slug}` }
}
