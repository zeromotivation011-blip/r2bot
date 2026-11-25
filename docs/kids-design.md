# R2BOT Kids — design system

R2BOT Kids is R2BOT, turned up for children. Same identity as www.r2bot.in
(`app/globals.css`, `brand/README.md`), more play in the content. A parent
who knows r2bot.in must recognise it instantly; a child must want to touch it.

## Identity (inherited, do not change)
- **Logo:** the 3D robot-helmet mark (`/kids-icon.svg` for the app, `brand/r2bot-*`
  lockups). Never an emoji in place of the logo.
- **Background:** navy `--void #0A1120`. Surfaces `--surface-1 #111C32`,
  `--surface-2 #19263F`. Borders `rgba(255,255,255,.08)` / `.16`.
- **Accent:** R2BOT orange — Tailwind `amber-*` in this repo IS the orange scale
  (`amber-500 #FC6818`, `amber-400 #FF8A4C`, `amber-300 #FFA878`). Text on orange
  is `--amber-ink #1A1103` (dark), never white.
- **Secondary:** cyan `#00B8D4` / `#00E5FF` for tech, sensors, data, links in the lab.
- **Success** green `#22C55E`. Purple is reserved for the adult Academy — do not
  use purple as a kids background. (Badge/world art may use any colour.)
- **Type:** `font-display` (Space Grotesk) for headings and numbers,
  `font-body` (Inter) for text. Text greys: `--text-1 #EEF2F8`, `--text-2 #A7B0C0`,
  `--text-3 #6E7888` — three levels only.
- **Shape:** radii 14 / 20 / 28 px (`rounded-2xl`, `rounded-[20px]`, `rounded-[28px]`),
  card shadow `0 8px 24px rgba(0,0,0,.45)`.

## The kids layer
- **Scale up:** body 17–18px, headings bolder, tap targets ≥ 48px (44 minimum),
  generous spacing. A 6-year-old's thumb is the input device.
- **Colour lives in the content:** worlds, games, badges and robots are vivid
  (each world/game has its own gradient in `lib/kids/universe/worlds.ts`); the
  chrome around them stays navy + orange so it never gets noisy.
- **Depth:** content cards sit on navy with a subtle top highlight
  (`bg-gradient-to-b from-white/[0.06] to-white/[0.02]`), a 1px border and the
  card shadow. Hover/press: lift 2px, border brightens; press scales to .97.
- **Motion:** quick and springy (150–300ms, `cubic-bezier(.22,.61,.36,1)`),
  purposeful (state change, reward, feedback), always behind
  `motion-safe:`/`prefers-reduced-motion`. No decoration behind text.
- **Feedback everywhere:** every action answers within 100ms (sound via
  `playSound`, a visual change). Errors are kind and specific, never "Wrong!".
- **Icons:** emoji are fine for content (badges, parts) but UI controls use
  clear labels + simple SVG icons.
- **Characters:** Spark (orange robot) and the cast appear to guide, celebrate
  and explain — they are the voice of the product.
- **Empty states and loading:** never a spinner-first screen; skeletons with the
  final size; empty states say what to do next with a character.
- **Accessibility:** WCAG AA contrast (orange `#FC6818` on navy passes for large
  text; use `amber-300/400` for small orange text on navy), visible focus rings
  (`focus-visible:ring-4 ring-amber-400/60`), full keyboard support, captions on.

## Components (use these, extend them, don't fork them)
`components/kids/ui/` — `GameShellClient` (every game), `RewardToastClient`
(global celebrations). Build new shared pieces there.
