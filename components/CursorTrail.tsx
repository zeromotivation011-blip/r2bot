'use client';

/**
 * Disabled by design.
 *
 * This used to render eight glowing cyan dots chasing the cursor on every page.
 * On a learning site that is a liability: it pulls the eye away from the text
 * the reader is following, it reads as decoration compensating for thin
 * content, and it ran a requestAnimationFrame loop on every page for the whole
 * session.
 *
 * Kept as a no-op rather than deleted because it is mounted in ~40 route files
 * — one change instead of forty, with no chance of a missed import breaking the
 * build. If the effect is ever wanted again, restore it from git history, but
 * consider limiting it to the marketing homepage rather than reading surfaces.
 */
export function CursorTrail() {
  return null;
}
