'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { DURATION, EASE } from '@/lib/motion';

/**
 * Route-change transition. template.tsx re-mounts on every navigation, so a
 * soft fade-through plays between pages. Honors prefers-reduced-motion.
 * See docs/motion-system.md.
 */
export default function Template({ children }: { children: ReactNode }) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: DURATION.base, ease: EASE.inOut }}
    >
      {children}
    </motion.div>
  );
}
