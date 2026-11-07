import type { ReactNode } from 'react';

/**
 * Route-change wrapper.
 *
 * It used to render a framer-motion fade on every navigation. That put
 * framer-motion in the first-load JavaScript of every single route — including
 * Atlas pages, which are where most visitors arrive — to buy a 200ms fade that
 * nobody asked for, and it made every click feel like a page reload.
 *
 * Kept as a plain pass-through so route transitions stay instant. Motion that
 * earns its place belongs in the component that needs it, loaded with it.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
