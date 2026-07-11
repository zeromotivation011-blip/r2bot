# R2BOT — Motion System

> The single source of truth for animation on R2BOT. Motion is on-brand here — robotics *is* motion —
> but every animation must clear the world-class bar: purposeful, fast, calm, accessible.
> Build the system first; never scatter one-off animations.

---

## 1. Principles (non-negotiable)

1. **Motion explains or guides — never just entertains.** Every animation either teaches a concept
   (a joint rotating, ROS2 messages passing) or directs attention (what changed, what to do next).
   If it does neither, cut it.
2. **Physical, not flashy.** Robotics feels mechanical and precise. Motion eases like real hardware —
   weighted, spring-based, settling. Never bouncy-cartoonish. This is our differentiator vs. generic SaaS.
3. **Invisible when it counts.** Content pages paint instantly with zero layout shift. Motion enters
   *after* paint, never blocks reading, and always has an off-switch.

**The hard guardrails, every time:**

- Animate `transform` and `opacity` only (GPU-composited, no layout thrash). Never animate `width`,
  `height`, `top`, `left`, `margin`.
- Every animation respects `prefers-reduced-motion` — reduced means "settle instantly, no drift,"
  not "broken."
- Nothing animates on the first paint of a content page. No animation on the critical render path.
- Heavy motion (hero 3D, simulators) is `next/dynamic` lazy-loaded with a static fallback.
- Core pages stay Lighthouse > 90 and CLS ≈ 0. Motion is measured, not assumed.

---

## 2. Motion tokens

The vocabulary. Everything below composes from these — no magic numbers in components.

### Durations

| Token   | Value | Use |
|---------|-------|-----|
| `fast`  | 150ms | Hover, press, focus, small state flips |
| `base`  | 250ms | Reveals, page fade-through, most transitions |
| `slow`  | 400ms | Larger moves, hero entrances, staggered groups |
| `deliberate` | 650ms | Rare — path-draw, certificate reveal |

### Easing curves

| Token      | cubic-bezier | Feel / use |
|------------|--------------|------------|
| `out`      | `cubic-bezier(0.16, 1, 0.3, 1)` | Default for entrances — fast start, soft land |
| `in-out`   | `cubic-bezier(0.65, 0, 0.35, 1)` | Symmetric moves, page transitions |
| `settle`   | `cubic-bezier(0.34, 1.4, 0.5, 1)` | The signature "hardware settle" — tiny overshoot |

For anything the user drags or that should feel physical, prefer a **spring**, not a bezier.

### Springs (Framer Motion configs)

| Token      | Config | Use |
|------------|--------|-----|
| `spring.settle` | `{ type: 'spring', stiffness: 420, damping: 30, mass: 1 }` | Signature — slight overshoot, quick rest |
| `spring.snappy` | `{ type: 'spring', stiffness: 600, damping: 34 }` | Toggles, UI controls, fast + tight |
| `spring.gentle` | `{ type: 'spring', stiffness: 220, damping: 26 }` | Large / heavy elements, calmer |

### Stagger

- Child interval: **60ms** (lists, cards, nav items).
- Cap the stagger group at ~8 visible children; beyond that it feels slow — animate the container instead.

---

## 3. Wiring the tokens

### Tailwind (`tailwind.config.ts`)

Add to `theme.extend`. Keeps CSS-only motion (hovers, reveals) consistent with the JS springs.

```ts
transitionDuration: {
  fast: '150ms',
  base: '250ms',
  slow: '400ms',
},
transitionTimingFunction: {
  out: 'cubic-bezier(0.16, 1, 0.3, 1)',
  'in-out': 'cubic-bezier(0.65, 0, 0.35, 1)',
  settle: 'cubic-bezier(0.34, 1.4, 0.5, 1)',
},
keyframes: {
  'reveal-up': {
    from: { opacity: '0', transform: 'translateY(8px)' },
    to: { opacity: '1', transform: 'translateY(0)' },
  },
  shimmer: {
    '100%': { transform: 'translateX(100%)' },
  },
},
animation: {
  'reveal-up': 'reveal-up 250ms cubic-bezier(0.16,1,0.3,1) both',
  shimmer: 'shimmer 1.4s infinite',
},
```

### Global reduced-motion kill-switch (`globals.css`)

A blanket guard so nothing slips through. Components still handle reduced-motion explicitly for
correctness, but this is the safety net.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

### Shared motion tokens for JS (`lib/motion.ts`)

```ts
export const DURATION = { fast: 0.15, base: 0.25, slow: 0.4, deliberate: 0.65 } as const;

export const EASE = {
  out: [0.16, 1, 0.3, 1],
  inOut: [0.65, 0, 0.35, 1],
  settle: [0.34, 1.4, 0.5, 1],
} as const;

export const SPRING = {
  settle: { type: 'spring', stiffness: 420, damping: 30, mass: 1 },
  snappy: { type: 'spring', stiffness: 600, damping: 34 },
  gentle: { type: 'spring', stiffness: 220, damping: 26 },
} as const;

export const STAGGER = 0.06; // 60ms between children
```

---

## 4. Library choice — needs your sign-off

- **`framer-motion`** (installed — v12.42.2, React 19 compatible) for orchestration — reveals,
  staggers, spring drags, layout animations, `AnimatePresence` for page/route transitions.
  Tree-shakeable, reads `prefers-reduced-motion` natively via `useReducedMotion()`.

Everything else uses what's already in the stack:
- **CSS / Tailwind** for the cheap stuff — hovers, presses, skeleton shimmer, simple reveals.
- **Three.js** (already present) for the hero arm and 3D simulators.

If you'd rather avoid the dependency, the primitives below can be rebuilt on the Web Animations API +
IntersectionObserver — more code, same behavior. My recommendation is Framer Motion; it pays for itself
by the third animated surface.

---

## 5. Reusable primitives

Three components cover ~90% of site motion. All are `'use client'`, all honor reduced-motion.

### `<Reveal>` — scroll-into-view entrance

`components/motion/RevealClient.tsx`

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { DURATION, EASE } from '@/lib/motion';

type RevealProps = {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
};

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
```

### `<Stagger>` — reveal a group with rhythm

`components/motion/StaggerClient.tsx`

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { DURATION, EASE, STAGGER } from '@/lib/motion';

const container = {
  hidden: {},
  show: { transition: { staggerChildren: STAGGER } },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: DURATION.base, ease: EASE.out } },
};

export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      variants={reduce ? undefined : container}
      initial={reduce ? false : 'hidden'}
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} variants={reduce ? undefined : item}>
      {children}
    </motion.div>
  );
}
```

### `<SpringDrag>` — the physical, weighted drag (simulators)

`components/motion/SpringDragClient.tsx`

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { SPRING } from '@/lib/motion';

type SpringDragProps = {
  children: ReactNode;
  className?: string;
  bounds?: { left: number; right: number; top: number; bottom: number };
};

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
```

### Page / route transition (App Router)

Wrap the route content in a `template.tsx` (re-mounts per navigation) so a fade-through plays on
every route change without extra wiring.

`app/template.tsx`

```tsx
'use client';

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';
import { DURATION, EASE } from '@/lib/motion';

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
```

---

## 6. Where motion lives (by surface)

| Surface | Signature motion | Notes |
|---------|-----------------|-------|
| **Hero / landing** | 3D robot arm (Three.js) idling + cursor-reactive with `spring.settle` | Lazy-load; static image fallback for reduced-motion and first paint |
| **Atlas entries** | `<Reveal>` on sections + inline concept animations (PID settle, servo sweep, LiDAR scan) | Concept anims are SVG/CSS, lazy-loaded, static SVG fallback → SEO/Lighthouse-safe |
| **Simulators / Visualizer** | `<SpringDrag>` on joints — momentum + settle | The craft moment; this is where polish shows most |
| **R2 Co-pilot** | Pulsing amber "thinking" node, streaming text with soft cursor, message entry | Feels present, alive — it's the mentor |
| **Academy progress** | Self-drawing path as lessons complete, streak tick, certificate reveal | Retention loop; `deliberate` duration ok here |
| **Micro-interactions** | Button press-depth (`whileTap` scale 0.98), nav underline draw, skeleton shimmer | CSS/Tailwind only — no JS needed |

**Every page's rule:** content is server-rendered and readable with zero motion; animation is a
progressive enhancement layered on after paint.

---

## 7. Definition of done (per animation)

1. Uses tokens from `lib/motion.ts` / Tailwind — no inline magic numbers.
2. `transform` / `opacity` only. Verified no layout shift (CLS check).
3. `prefers-reduced-motion` path tested — settles instantly, idle drift stopped, still usable.
4. Heavy libs `next/dynamic` with a skeleton or static fallback.
5. Not on the critical render path; content readable before it runs.
6. `npm run type-check` clean; Lighthouse on the page still > 90.
7. Mobile checked — touch targets 44px+, drag works with `touch-action: none`.

---

## 8. Rollout order

1. Land the tokens (`lib/motion.ts`, Tailwind config, global reduced-motion CSS). No visual change yet.
2. Ship the three primitives + page template. Adopt `<Reveal>`/`<Stagger>` across Atlas and Academy.
3. Prototype the hero arm and one Atlas concept animation to production quality (proof pieces).
4. Roll `<SpringDrag>` into the Visualizer tools.
5. Co-pilot thinking state + Academy reward loop.
6. Measure CWV after each step; tune or cut anything that costs > a couple Lighthouse points.

---

*Motion serves the learner and the world-class bar. When in doubt, make it quieter and faster.*
