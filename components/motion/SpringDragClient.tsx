'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPRING } from '@/lib/motion';

type SpringDragProps = {
  children: ReactNode;
  className?: string;
  /** Optional drag bounds (px relative to layout position). */
  bounds?: { left: number; right: number; top: number; bottom: number };
};

/**
 * Draggable element with a weighted, spring-back settle — the physical feel
 * for simulator joints. On release it eases back to its constraints with a
 * slight overshoot. Honors prefers-reduced-motion (no elasticity, instant).
 * See docs/motion-system.md.
 */
export function SpringDrag({ children, className, bounds }: SpringDragProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      drag
      dragConstraints={bounds}
      dragElastic={reduce ? 0 : 0.12}
      dragTransition={
        reduce
          ? { bounceStiffness: 2000, bounceDamping: 100 }
          : { bounceStiffness: SPRING.settle.stiffness, bounceDamping: SPRING.settle.damping }
      }
      whileDrag={{ cursor: 'grabbing' }}
      whileTap={reduce ? undefined : { scale: 1.04 }}
      style={{ touchAction: 'none', cursor: 'grab' }}
    >
      {children}
    </motion.div>
  );
}
