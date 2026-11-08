'use client';


/**
 * Superseded by the Ask R2 control in the header, and rendered nowhere.
 *
 * This was a cyan pill with a cyan glow fixed over the bottom-right corner of
 * every page — a third brand colour, on top of a header that already carries
 * "Ask R2" with its ⌘K shortcut. Two identical entry points to the same
 * drawer were visible at once on every screen, and the glow was the loudest
 * thing on a page of 900-word Atlas entries.
 *
 * Kept as a no-op rather than deleted because it is mounted in 48 files; the
 * call sites come out as those files are next touched. Do not reintroduce a
 * floating action button: the Co-pilot has one entry point, in the header,
 * plus ⌘K.
 */
export function CopilotBubble() {
  return null;
}
