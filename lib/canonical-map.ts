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
//   • /ros2/fix/<slug> owns an exact ROS 2 error — "ros2: command not found",
//     "ros2 nodes not communicating". Atlas explains the concept (DDS, QoS),
//     the cheatsheet lists commands, the fix page gets a broken terminal working;
//     they cross-link (data: lib/ros2-fixes.ts).
//   • /tools/<name>-calculator owns the tool query — "motor torque calculator".
//     Atlas owns the concept ("what is torque"); they cross-link.
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
 * Atlas entries that could compete for the same query, and which one owns it.
 *
 * 22 Nov 2026 (Search Console): "moveit" ranked /atlas/concept/moveit (pos 9.7)
 * and "moveit2" ranked /atlas/concept/moveit2-stack (pos 7.9). They are kept
 * apart on purpose: moveit is the beginner overview ("what is MoveIt", MoveIt vs
 * MoveIt 2); moveit2-stack is the ROS 2 practitioner page (move_group,
 * planners, setup). Each links to the other in its first paragraph.
 * "lqr" / "lqr controller" is owned by lqr-controller; the duplicate
 * linear-quadratic-regulator entry was merged into it and 308s there
 * (next.config.mjs, app/sitemap.ts REDIRECTED_ATLAS).
 * 24 Nov 2026: "costmap" / "costmap ros2" / "what is a costmap" ranked
 * /atlas/concept/costmap (pos 4-9, 0 clicks). costmap owns the general and
 * Nav2 queries (cost scale, inflation, global vs local); costmap-layers goes
 * layer by layer and links back from its first paragraph.
 *
 * Query → owning path.
 */
export const ATLAS_QUERY_OWNER: Record<string, string> = {
  lqr: '/atlas/concept/lqr-controller',
  'lqr controller': '/atlas/concept/lqr-controller',
  'linear quadratic regulator': '/atlas/concept/lqr-controller',
  'optical flow sensor': '/atlas/concept/optical-flow-sensor',
  'optical flow': '/atlas/concept/optical-flow',
  moveit: '/atlas/concept/moveit',
  moveit2: '/atlas/concept/moveit2-stack',
  'complementary filter': '/atlas/concept/complementary-filter',
  'pose graph optimization': '/atlas/concept/pose-graph-optimization',
  'pose graph': '/atlas/concept/pose-graph-optimization',
  'differential drive': '/atlas/concept/differential-drive',
  'differential drive robot': '/atlas/concept/differential-drive',
  'physics engine': '/atlas/concept/physics-engine',
  'what is a physics engine': '/atlas/concept/physics-engine',
  'physics engine for robotics': '/atlas/concept/physics-engine',
  'vision language action model': '/atlas/concept/vision-language-action-model',
  'vision-language-action model': '/atlas/concept/vision-language-action-model',
  'vla model': '/atlas/concept/vision-language-action-model',
  'what is a vla model': '/atlas/concept/vision-language-action-model',
  'force control': '/atlas/concept/force-control',
  'force control robotics': '/atlas/concept/force-control',
  'hybrid position force control': '/atlas/concept/force-control',
  costmap: '/atlas/concept/costmap',
  'what is a costmap': '/atlas/concept/costmap',
  'costmap ros2': '/atlas/concept/costmap',
  'nav2 costmap': '/atlas/concept/costmap',
  'cost map robotics': '/atlas/concept/costmap',
  'costmap layers': '/atlas/concept/costmap-layers',
  'layered costmap': '/atlas/concept/costmap-layers',
  'robot link': '/atlas/concept/link-robot',
  'robot arm link': '/atlas/concept/link-robot',
  'link in robotics': '/atlas/concept/link-robot',
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
