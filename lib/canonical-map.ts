// lib/canonical-map.ts
//
// One page per query. This file is the record of which page owns which topic
// when two surfaces could both answer it.
//
// THE RULE:
//   • Atlas owns the definition query     — "what is SLAM"
//   • Quick Lessons own the video query   — "how does SLAM work" (60s + demo)
//   • /robots/<slug> owns a named robot   — "Boston Dynamics Spot"
//   • Blog owns comparison and decisions  — "X vs Y", "which board should I buy"
//
// Anything that breaks that rule is either redirected here or differentiated
// and cross-linked, so the two pages feed each other instead of competing.

import { SHORTS } from '@/lib/shorts'

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
}

export const ATLAS_ROBOTS_REDIRECTED: ReadonlySet<string> = new Set(
  Object.keys(ATLAS_ROBOT_CANONICAL),
)

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
const LESSON_BY_ATLAS_PATH: Map<string, { slug: string; title: string }> = (() => {
  const map = new Map<string, { slug: string; title: string }>()
  for (const lesson of SHORTS) {
    for (const link of lesson.atlas) {
      const path = link.href.split('?')[0].replace(/\/+$/, '')
      // First lesson to claim a concept keeps it, so the mapping is stable
      // regardless of how many lessons mention the same term in passing.
      if (!map.has(path)) map.set(path, { slug: lesson.slug, title: lesson.title })
    }
    // An exact slug match is the strongest possible signal of the same topic.
    const exact = `/atlas/concept/${lesson.slug}`
    if (!map.has(exact)) map.set(exact, { slug: lesson.slug, title: lesson.title })
  }
  return map
})()

/** The Quick Lesson for an Atlas entry, if one teaches the same idea. */
export function quickLessonForAtlas(
  type: string,
  slug: string,
): { slug: string; title: string; href: string } | null {
  const hit = LESSON_BY_ATLAS_PATH.get(`/atlas/${type}/${slug}`)
  if (!hit) return null
  return { ...hit, href: `/shorts/${hit.slug}` }
}
