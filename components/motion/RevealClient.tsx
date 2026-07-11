'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { DURATION, EASE } from '@/lib/motion';

type RevealProps = {
  children: ReactNode;
  /** Delay in seconds before the reveal starts. */
  delay?: number;
  /** Vertical offset the element rises from, in px. */
  y?: number;
  className?: string;
};

/**
 * Fades + rises content into view on scroll. Honors prefers-reduced-motion
 * (renders in place, no motion). See docs/motion-system.md.
 */
export function Reveal({ children, delay = 0, y = 8, className }: RevealProps) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: DURATION.base, ease: EASE.out, delay }}
    >
      {children}
    </motion.div>
  );
}
