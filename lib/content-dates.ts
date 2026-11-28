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
  '/learn/ros2-cheatsheet': '2026-11-24T00:00:00.000Z',
  '/ros2/fix': '2026-11-24T00:00:00.000Z',
  '/tools/motor-torque-calculator': '2026-11-25T00:00:00.000Z',
  '/compare': '2026-11-09T00:00:00.000Z',
  '/compare/lidar-vs-camera-slam': '2026-11-09T00:00:00.000Z',
  '/compare/arduino-vs-esp32-vs-raspberry-pi': '2026-11-09T00:00:00.000Z',
  '/compare/spot-vs-unitree-go2-vs-anymal': '2026-11-09T00:00:00.000Z',
  '/kids': '2026-11-27T00:00:00.000Z',
  '/atlas': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/actuator': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/sensor': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/autonomous-mobile-robot': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/ros2-actions': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/ros2-services': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/arduino': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/raspberry-pi-robotics': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/behavior-trees': '2026-11-08T00:00:00.000Z',
  '/atlas/concept/finite-state-machine': '2026-11-25T00:00:00.000Z',
  '/atlas/concept/future-of-work-robots': '2026-11-08T00:00:00.000Z',
  '/atlas/company/greyorange': '2026-11-08T00:00:00.000Z',
  '/academy': '2026-11-08T00:00:00.000Z',
  '/start': '2026-11-08T00:00:00.000Z',
  '/robots': '2026-11-24T00:00:00.000Z',
  '/robots/directory': '2026-11-24T00:00:00.000Z',
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
  '/kids/parents': '2026-11-27T00:00:00.000Z',
  // 27 Nov 2026: /kids/activities became Make It at Home (/kids/printables + one page per build).
  '/kids/printables': '2026-11-27T00:00:00.000Z',
  '/kids/schools': '2026-11-27T00:00:00.000Z',
  '/kids/spark-trail': '2026-11-26T00:00:00.000Z',
  '/kids/ai': '2026-11-26T00:00:00.000Z',
  '/kids/course': '2026-11-27T00:00:00.000Z',
  '/kids/course/1': '2026-11-26T00:00:00.000Z',
  // Wave 2 batch B: Levels 2–4 written in full, playable and indexable.
  '/kids/course/2': '2026-11-27T00:00:00.000Z',
  '/kids/course/3': '2026-11-27T00:00:00.000Z',
  '/kids/course/4': '2026-11-27T00:00:00.000Z',
  '/kids/robodex': '2026-11-27T00:00:00.000Z',
  '/kids/careers': '2026-11-27T00:00:00.000Z',
  // Robot Maths (roadmap #86): the hub and one page per concept (lib/kids/maths/concepts.ts).
  '/kids/maths': '2026-11-27T00:00:00.000Z',
  '/kids/lab/power': '2026-11-27T00:00:00.000Z',
  // Link Lab + Robot Security Check (roadmap #88).
  '/kids/lab/network': '2026-11-27T00:00:00.000Z',
  '/kids/lab/network/guardian': '2026-11-27T00:00:00.000Z',
  // The one grown-up front door (roadmap #20).
  '/kids/grown-ups': '2026-11-27T00:00:00.000Z',
  '/kids/hangar': '2026-11-27T00:00:00.000Z',
  '/kids/play': '2026-11-26T00:00:00.000Z',
  '/kids/worlds': '2026-11-26T00:00:00.000Z',
  '/kids/worlds/guardians': '2026-11-26T00:00:00.000Z',
  '/kids/worlds/ocean': '2026-11-26T00:00:00.000Z',
  '/kids/worlds/zoo': '2026-11-26T00:00:00.000Z',
  '/kids/worlds/hospital': '2026-11-26T00:00:00.000Z',
  '/kids/worlds/farm': '2026-11-26T00:00:00.000Z',
  '/kids/worlds/city': '2026-11-26T00:00:00.000Z',
  '/kids/worlds/station': '2026-11-26T00:00:00.000Z',
  '/kids/play/safety-inspector': '2026-11-26T00:00:00.000Z',
  '/kids/play/ocean-rescue': '2026-11-26T00:00:00.000Z',
  '/kids/play/bio-bots': '2026-11-26T00:00:00.000Z',
  '/kids/play/robot-surgeon': '2026-11-26T00:00:00.000Z',
  '/kids/play/smart-farm': '2026-11-26T00:00:00.000Z',
  '/kids/play/robot-city': '2026-11-26T00:00:00.000Z',
  '/kids/play/orbit-repair': '2026-11-26T00:00:00.000Z',
  // Wave 3 games QA (27 Nov 2026): page copy changed with the fixed star rules / debriefs.
  '/kids/play/mars-rover': '2026-11-27T00:00:00.000Z',
  '/kids/play/drone-hover': '2026-11-27T00:00:00.000Z',
  '/kids/play/circuit-city': '2026-11-27T00:00:00.000Z',
  '/kids/play/arm-factory': '2026-11-27T00:00:00.000Z',
  '/kids/play/robot-brain': '2026-11-27T00:00:00.000Z',
  '/kids/play/swarm-reef': '2026-11-27T00:00:00.000Z',
  '/kids/galaxy': '2026-11-27T00:00:00.000Z',
  '/kids/galaxy/concepts': '2026-11-27T00:00:00.000Z',
  '/kids/workshop': '2026-11-27T00:00:00.000Z',
  '/kids/stories': '2026-11-27T00:00:00.000Z',
  '/kids/code-lab': '2026-11-25T00:00:00.000Z',
  '/kids/teach': '2026-11-27T00:00:00.000Z',
  '/kids/teach/training': '2026-11-26T00:00:00.000Z',
  // Wave 2 batch C (27 Nov 2026): standards map (= STANDARDS_UPDATED in lib/kids/classroom-standards.ts),
  // Trust Pack, clubs, family nights, library and the unplugged lessons (hub + one page per Level 1 session).
  '/kids/teach/standards': '2026-11-27T00:00:00.000Z',
  '/kids/teach/trust': '2026-11-28T00:00:00.000Z',
  '/kids/teach/clubs': '2026-11-28T00:00:00.000Z',
  '/kids/teach/family': '2026-11-28T00:00:00.000Z',
  '/kids/teach/library': '2026-11-28T00:00:00.000Z',
  '/kids/teach/unplugged': '2026-11-27T00:00:00.000Z',
  '/teachers': '2026-11-06T00:00:00.000Z',
  '/about': '2026-11-08T00:00:00.000Z',
  '/about/how-this-is-written': '2026-11-08T00:00:00.000Z',
  '/mission': '2026-10-12T00:00:00.000Z',
  '/pricing': '2026-11-05T00:00:00.000Z',
  '/challenge': '2026-10-12T00:00:00.000Z',
  '/challenges': '2026-10-12T00:00:00.000Z',
  '/ros2': '2026-11-24T00:00:00.000Z',
  '/workspace': '2026-10-12T00:00:00.000Z',
  '/sources': '2026-11-08T00:00:00.000Z',
  '/privacy': '2026-11-27T00:00:00.000Z',
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
  shorts: new Date('2026-11-20T00:00:00.000Z'),
  shortsTranslations: new Date('2026-11-08T00:00:00.000Z'),
  aiRobotics: new Date('2026-11-06T00:00:00.000Z'),
  simulators: new Date('2026-10-20T00:00:00.000Z'),
  builds: new Date('2026-10-20T00:00:00.000Z'),
  academy: new Date('2026-10-12T00:00:00.000Z'),
  robots: new Date('2026-11-09T00:00:00.000Z'),
  /** /kids/careers/<maker>: the 20 maker pages (lib/kids/makers/makers.ts). */
  kidsMakers: new Date('2026-11-27T00:00:00.000Z'),
  /** /kids/maths/<concept>: the Robot Maths concept pages (lib/kids/maths/concepts.ts). */
  kidsMaths: new Date('2026-11-27T00:00:00.000Z'),
  /** /kids/stories/episodes/<sessionId>: the Episodes Theatre pages (lib/kids/episodes/theatre.ts). */
  kidsTheatre: new Date('2026-11-27T00:00:00.000Z'),
  /** /kids/teach/2/<n> (= TEACH_GUIDES_L2_UPDATED in lib/kids/teach/guides-level2.ts). */
  kidsTeachL2: new Date('2026-11-27T00:00:00.000Z'),
  /** /kids/teach/3|4/<n> (= L34_GUIDES_UPDATED in lib/kids/curriculum/level3/teacher-guide.ts). */
  kidsTeachL34: new Date('2026-11-27T00:00:00.000Z'),
} as const
