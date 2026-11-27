// lib/atlas-redirects.ts — Atlas concept slugs that 308 to another entry.
//
// Each of these was a duplicate of another entry (same query, same idea) and
// now redirects to the one that keeps the URL. The redirects themselves live
// in next.config.mjs (which cannot import TypeScript); this set is the copy
// the app reads, so a redirected slug never appears in the sitemap, the Atlas
// index, site search or llms.txt — even while an old row for it is still in
// the atlas_entries table. Keep the two lists in step.
export const REDIRECTED_ATLAS_CONCEPTS: ReadonlySet<string> = new Set([
  'drone-uav',
  'field-programmable-gate-array',
  'ce-marking-robots',
  'state-machine',
  'linear-quadratic-regulator',
  // 25 Nov 2026 duplicate merge (reasons in next.config.mjs).
  'behaviour-cloning',
  'neural-networks-robotics',
  'reinforcement-learning-robotics',
  'embedded-systems',
  'risk-assessment',
  'nav2-stack',
  'warehouse-robot',
  'light-curtain',
  'tof-sensor',
  'last-mile-delivery',
  // 27 Nov 2026: merged into depth-sensor (one owner for depth sensor / depth camera).
  'depth-camera',
])

export function isRedirectedAtlas(type: string, slug: string): boolean {
  return type === 'concept' && REDIRECTED_ATLAS_CONCEPTS.has(slug)
}
