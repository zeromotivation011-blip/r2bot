// lib/content-dates.ts
//
// Honest `lastmod` dates for pages whose content is not dated by the content
// itself (Atlas uses lastReviewed, blog uses the post date, Lens uses
// publishedAt — those are already real).
//
// Why this file exists: the sitemap used to report `new Date()` for about forty
// URLs, which told Google that /privacy and /terms changed every single day.
// Once a site does that, search engines stop trusting its lastmod values
// entirely — including the ones that are true and matter.
//
// RULE: when you meaningfully change a page, update its date here in the same
// commit. If a page is not listed, DEFAULT_PAGE_UPDATED is used. Never make
// either value "today" dynamically.

/** Last structural change to the pages not listed below. */
export const DEFAULT_PAGE_UPDATED = '2026-11-08T00:00:00.000Z'

/** Path (no host, no trailing slash) → the day its content last really changed. */
export const PAGE_UPDATED: Record<string, string> = {
  '/': '2026-11-08T00:00:00.000Z',
  '/shorts': '2026-11-08T00:00:00.000Z',
  '/courses': '2026-11-08T00:00:00.000Z',
  '/ai-robotics': '2026-11-06T00:00:00.000Z',
  '/ai-robotics/glossary': '2026-11-06T00:00:00.000Z',
  '/glossary': '2026-11-09T00:00:00.000Z',
  '/learn/ros2-cheatsheet': '2026-11-09T00:00:00.000Z',
  '/compare': '2026-11-09T00:00:00.000Z',
  '/compare/lidar-vs-camera-slam': '2026-11-09T00:00:00.000Z',
  '/compare/arduino-vs-esp32-vs-raspberry-pi': '2026-11-09T00:00:00.000Z',
  '/compare/spot-vs-unitree-go2-vs-anymal': '2026-11-09T00:00:00.000Z',
  '/kids': '2026-11-09T00:00:00.000Z',
  '/atlas': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/actuator': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/sensor': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/autonomous-mobile-robot': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/ros2-actions': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/ros2-services': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/arduino': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/raspberry-pi-robotics': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/behavior-trees': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/finite-state-machine': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/future-of-work-robots': '2026-11-08T00:00:00.000Z',
  '/atlas/company/greyorange': '2026-11-08T00:00:00.000Z',
  '/academy': '2026-11-08T00:00:00.000Z',
  '/start': '2026-11-08T00:00:00.000Z',
  '/robots': '2026-11-09T00:00:00.000Z',
  '/robots/directory': '2026-11-09T00:00:00.000Z',
  '/robots/compare': '2026-11-01T00:00:00.000Z',
  '/build': '2026-10-20T00:00:00.000Z',
  '/visualizer': '2026-10-20T00:00:00.000Z',
  '/diagnostic': '2026-10-12T00:00:00.000Z',
  '/copilot': '2026-10-12T00:00:00.000Z',
  '/careers': '2026-10-12T00:00:00.000Z',
  '/daily-life': '2026-11-11T00:00:00.000Z',
  // Per-article dates for /daily-life/<slug> come from each article's frontmatter
  // (publishedAt / updatedAt), not from here — see app/sitemap.ts.
  '/blog': '2026-11-11T00:00:00.000Z',
  '/news': '2026-11-08T00:00:00.000Z',
  '/lens': '2026-10-20T00:00:00.000Z',
  '/india': '2026-11-06T00:00:00.000Z',
  '/kids/parents': '2026-11-06T00:00:00.000Z',
  '/kids/activities': '2026-11-06T00:00:00.000Z',
  '/teachers': '2026-11-06T00:00:00.000Z',
  '/about': '2026-11-08T00:00:00.000Z',
  '/about/how-this-is-written': '2026-11-08T00:00:00.000Z',
  '/mission': '2026-10-12T00:00:00.000Z',
  '/pricing': '2026-11-05T00:00:00.000Z',
  '/challenge': '2026-10-12T00:00:00.000Z',
  '/challenges': '2026-10-12T00:00:00.000Z',
  '/ros2': '2026-10-12T00:00:00.000Z',
  '/workspace': '2026-10-12T00:00:00.000Z',
  '/sources': '2026-11-08T00:00:00.000Z',
  '/privacy': '2026-11-06T00:00:00.000Z',
  '/terms': '2026-11-08T00:00:00.000Z',
  '/zh': '2026-11-08T00:00:00.000Z',
  '/hi': '2026-11-08T00:00:00.000Z',
  '/es': '2026-11-08T00:00:00.000Z',
}

/** The honest lastmod for a path, as a Date the sitemap can use. */
export function pageUpdated(path: string): Date {
  const key = path.length > 1 ? path.replace(/\/+$/, '') : path
  return new Date(PAGE_UPDATED[key] ?? DEFAULT_PAGE_UPDATED)
}

/** Dates whole content groups were last extended, for their generated pages. */
export const GROUP_UPDATED = {
  shorts: new Date('2026-11-08T00:00:00.000Z'),
  shortsTranslations: new Date('2026-11-08T00:00:00.000Z'),
  aiRobotics: new Date('2026-11-06T00:00:00.000Z'),
  simulators: new Date('2026-10-20T00:00:00.000Z'),
  builds: new Date('2026-10-20T00:00:00.000Z'),
  academy: new Date('2026-10-12T00:00:00.000Z'),
  robots: new Date('2026-11-09T00:00:00.000Z'),
} as const
