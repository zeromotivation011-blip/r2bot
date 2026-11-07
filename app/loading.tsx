/**
 * Route-level loading UI.
 *
 * This used to be a full-screen overlay ("Loading R2BOT…") that covered the
 * page on every single navigation. On a content site that is the worst possible
 * trade: it hides content that is usually milliseconds away, and it is the
 * first thing a visitor arriving from Google or a YouTube link sees. A 2px bar
 * at the top says the same thing without blanking the screen.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="r2-route-bar">
      <span aria-hidden className="r2-route-bar__fill" />
      <span className="sr-only">Loading</span>
    </div>
  );
}
