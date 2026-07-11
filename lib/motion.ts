/**
 * R2BOT motion tokens — the single vocabulary for animation.
 * See docs/motion-system.md for the full system.
 *
 * These are plain data (no runtime deps). CSS-only motion should use the
 * matching Tailwind tokens (duration-fast/base/slow, ease-out/in-out/settle).
 * JS motion (Framer Motion, once installed) imports from here.
 */

/** Durations in seconds (Framer Motion uses seconds; Tailwind mirrors these in ms). */
export const DURATION = {
  fast: 0.15,
  base: 0.25,
  slow: 0.4,
  deliberate: 0.65,
} as const;

/** Cubic-bezier easing curves as [x1, y1, x2, y2] tuples. */
export const EASE = {
  /** Default entrance — fast start, soft land. */
  out: [0.16, 1, 0.3, 1],
  /** Symmetric moves, page transitions. */
  inOut: [0.65, 0, 0.35, 1],
  /** Signature "hardware settle" — tiny overshoot. */
  settle: [0.34, 1.4, 0.5, 1],
} as const;

/** Spring configs for physical motion (drags, reactive elements). */
export const SPRING = {
  /** Signature — slight overshoot, quick rest. */
  settle: { type: 'spring', stiffness: 420, damping: 30, mass: 1 },
  /** Toggles, UI controls — fast and tight. */
  snappy: { type: 'spring', stiffness: 600, damping: 34 },
  /** Large or heavy elements — calmer. */
  gentle: { type: 'spring', stiffness: 220, damping: 26 },
} as const;

/** Interval between staggered children, in seconds (60ms). */
export const STAGGER = 0.06;

export type DurationToken = keyof typeof DURATION;
export type EaseToken = keyof typeof EASE;
export type SpringToken = keyof typeof SPRING;
