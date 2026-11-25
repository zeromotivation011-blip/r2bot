# R2BOT Universe — architecture and contracts

The kids product is ONE universe, not a set of pages. Everything below is a
contract: every screen, game and lesson uses these pieces, so the product feels
like one thing.

## Look and feel
World-class, and unmistakably R2BOT: follow `docs/kids-design.md` (navy + R2BOT orange,
Space Grotesk/Inter, the helmet logo, vivid colour only inside content). No purple backgrounds.

## Who it is for
Ages 5–17 in four bands (`lib/kids/bands.ts`): Explorers 5–7, Builders 8–10,
Inventors 11–13, Engineers 14–17. Today's children are advanced: nothing is
"tap the right answer" busywork. Every game has a real system underneath (real
physics, real control loops, real kinematics, real circuits, real machine
learning) and four difficulty tiers — **Cadet, Pilot, Ace, Legend** — so a
7-year-old and a 16-year-old both find their edge in the same game.

## The map
- **Planets** (`lib/kids/universe/worlds.ts` → `PLANETS`): the four course levels
  (curriculum in `lib/kids/curriculum/`), 24 sessions each.
- **Zones / games** (`GAMES`): standalone advanced games at `/kids/play/<id>`.
- **Hangar**: the child's robot (`lib/kids/robot-design.ts`), avatar, badges, unlocks.
- **Lab**: the real-physics simulator (`lib/kids/sim/`), Rapier + Blockly.

## Data — one store
`lib/kids-progress.ts` is the only progress store (localStorage, synced to a
teacher's class by `components/kids/classroom/KidsClassSyncClient.tsx`).
Fields added for the Universe: `xp, badges, unlocks, personalBests,
sessionsDone, questProgress, playDays, avatar, explorerName`.

## Rewards — one function
`lib/kids/universe/rewards.ts` → `reportActivity({ kind, id, stars, score, badges, attempts })`.
It alone decides XP, level (`levelInfo`), badges, unlocks, weekly quests and
personal bests, and fires `REWARD_EVENT`; `components/kids/ui/RewardToastClient.tsx`
(mounted in the shell) celebrates. **Never** write those fields directly.
Rules: reward learning and effort, not time; personal bests, never rankings or
leaderboards; no streak that punishes a missed day.

## Games — one shell
Every game renders inside `components/kids/ui/GameShellClient.tsx`:
```tsx
<GameShell game={getGame('drone-hover')!} howToPlay={...} lesson="...">
  {({ tier, round, finish, restart }) => <MyGameClient tier={tier} key={round} onFinish={finish} />}
</GameShell>
```
`finish({ stars, score, scoreLabel, message, badges, attempts })` shows the
results card and calls `reportActivity` for you. Stars 0 = failed round.

Each game:
- lives in `components/kids/games/<id>/` with a page at `app/kids/play/<id>/page.tsx`;
- the page is a server component with metadata (canonical
  `https://www.r2bot.in/kids/play/<id>`) and ≥ 400 words of real server-rendered
  teaching text (what the real-world robotics is, how the game models it, tips per tier);
- loads its heavy client code with `next/dynamic` (`ssr: false`) behind a same-size skeleton;
- works with touch AND keyboard, at 390×844 and desktop; tap targets ≥ 44px;
- respects `prefers-reduced-motion`; pauses when the tab is hidden; disposes on unmount;
- uses no new npm packages (three.js, Rapier and Blockly are already installed);
- is deterministic where it scores (seeded randomness), so a result is fair.

## Never
Leaderboards or comparing children. Collecting any personal data from a child.
Prices or "free forever". Copying another brand's characters, curriculum or games.
