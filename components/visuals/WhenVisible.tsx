'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Render children only once the wrapper is near the viewport.
 *
 * WHY THIS EXISTS: `next/dynamic` defers the *download* until the component
 * MOUNTS — and on a page that renders the component immediately, that is page
 * load. The Visualizer hub renders all nine simulators at once, so the Robot
 * Playground mounted on arrival and pulled 897 KB of Monaco editor from
 * cdn.jsdelivr.net before anyone had scrolled to it. The 8 Nov audit measured
 * the hub at LCP 13.4s, 763 KiB of unused JavaScript, performance 49 against a
 * floor of 60 (CLAUDE.md §11: heavy libs dynamic-imported with skeletons).
 *
 * `height` is REQUIRED and must match what the real child occupies, because a
 * placeholder of the wrong height trades a download for a layout shift — and
 * the same audit already measures CLS 0.903 on this page. Both call sites pass
 * the exact height their existing dynamic() skeleton already reserved.
 *
 * One-shot: once visible it stays mounted, so scrolling away does not tear the
 * editor down and refetch it.
 */
export function WhenVisible({
  height,
  placeholder,
  children,
  rootMargin = '300px',
}: {
  /** Exact height the real child occupies, e.g. 480 or '540px'. */
  height: number | string;
  /** Shown until the child mounts. Should look like the child's own skeleton. */
  placeholder: ReactNode;
  children: ReactNode;
  /** How early to start loading. 300px ≈ one flick of the thumb away. */
  rootMargin?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer (old browser, jsdom) means render it rather than hide content.
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return (
    <div ref={ref} style={visible ? undefined : { minHeight: height }}>
      {visible ? children : placeholder}
    </div>
  );
}
