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
- **Zones / games** (`GAMES`): standalone advanced games at `/kids/play/<id>`. Only
  games with a built, QA'd page are in `GAMES` (it feeds the map, the sitemap, the
  Hangar and `PLAYABLE_GAME_IDS` in `lib/kids/teach/catalogue.ts`). Copy never types
  the count: use `numberWord(GAMES.length)`.
- **Worlds** (`WORLDS`, 26 Nov 2026): seven themed places where robots really work —
  Robot Guardians, Ocean Lab, Robo Zoo, Robot Hospital, Smart Farm, Robot City, Space
  Station. Each has an indexable page `/kids/worlds/<id>`, a flagship game in `GAMES`
  (`world.game`; `WORLD_GAME_IDS`, `worldForGame()`) and Skill Galaxy activities tagged
  `world: <id>` (`byWorld()`). The index is `/kids/worlds`. On the map the flagship games
  are NOT moons: the worlds sit on the **Worlds belt** along the bottom edge, so the phone
  map keeps 4 planets + 8 moons + the Hangar. World progress (activities done, game
  played) is `components/kids/universe/WorldProgressClient.tsx`, shown on `/kids/worlds`
  and in the Hangar; activity ids come from the server, never the activity params.
- **Hangar**: the child's robot (`lib/kids/robot-design.ts`), avatar, badges, unlocks.
- **Lab**: the real-physics simulator (`lib/kids/sim/`), Rapier + Blockly.

## Navigation — one shell
`app/kids/KidsShell.tsx`. Phone tab bar, exactly five: **Home · Course · Worlds · Games ·
Hangar**. Desktop header (logo = Home): Course · Worlds · Galaxy · Games · Hangar. On
phones the Skill Galaxy is the first item of "More" (hidden there on desktop, where it is
a header link). Secondary surfaces: `KIDS_MORE` in `lib/kids/nav.ts` — More lists Galaxy
(phones only), How Robots Think `/kids/ai`, Stories, Workshop, Code Lab, Spark Trail
`/kids/spark-trail` (the old Robot World; `/kids/world/*` 308s there), Physics Lab, Make at
Home, then Settings (`KIDS_SETTINGS`). Schools and teacher pages live in the kids footer.
The More menu is pinned to the screen and scrolls when taller than it.

**Ask Spark** is mounted once in the shell (`AskSparkClient`, `next/dynamic`, `ssr:false`).
Ordinary pages: a floating button above the tab bar. Game and full-screen pages (`play/*`,
`code-lab/*`, `workshop`, `lab/*`, `stories/*`, course sessions, Galaxy activities, `ai/*`,
`spark-trail/*`, `challenge/*`): no floating button — a 44–48px Spark button in the header
calls `openSpark()`. Hidden on grown-up pages. Offline FAQ unless `KIDS_AI_ENABLED=true`.

## Settings — one device-only store
`lib/kids/settings.ts` (localStorage only; no account). Page `/kids/settings` (noindex),
which also mounts the progress backup code. Fields: `sound`, `volume`, `voice` (same key as
`lib/kids-voice.ts`, `r2bot_kids_voice`), `reduceMotion`, `largeText`, `lite3d`.
- Every change fires `KIDS_SETTINGS_EVENT` (`r2bot:kids-settings`); other tabs follow via `storage`.
- React: `useKidsSettings()`, `useKidsReducedMotion()` (device preference OR the setting),
  `useKidsLite3D()`. Non-React: `readKidsSettings()`, `kidsReducedMotion()`, `kidsLite3D()`.
- three.js: `kidsRenderHints()` → `{ dpr, antialias, shadows }`, `liteDpr()`. `createStage()`
  in `components/kids/three/stage.ts` already applies them, and its `prefersReducedMotion()`
  returns `kidsReducedMotion()`. A view that makes its own renderer must use these too.
- `<html>` classes, set before first paint by `KIDS_SETTINGS_BOOT_SCRIPT` (in
  `app/kids/layout.tsx`) and kept in step by `RewardToastClient` (removed on leaving /kids):
  `kids-large-text` (kids text ~112%), `kids-reduce-motion` (animations cut),
  `kids-lite-3d` (informational). CSS: `components/kids/settings/kids-settings.css`.
- `playSound` (lib/kids-audio.ts) is silent when sound is off and follows the volume;
  `sparkSays` is silent when voice is off.

## Data — one store
`lib/kids-progress.ts` is the only progress store (localStorage, synced to a
teacher's class by `components/kids/classroom/KidsClassSyncClient.tsx`).
Fields added for the Universe: `xp, badges, unlocks, personalBests,
sessionsDone, questProgress, playDays, avatar, explorerName`.
Star total shown to children and grown-ups: `collectedStars()` (never `totalStars` alone).
Backup without personal data: `exportProgressCode()` → `R2K1.<z|j>.<base64url>.<fnv1a>`
and `importProgressCode()` (never throws, caps every field, merges with max/union, never
lowers progress). UI: `components/kids/hangar/BackupCodeClient.tsx` (Hangar and Settings).
Checks: `lib/kids/progress-backup.verify.ts` (CI).

## Rewards — one function
`lib/kids/universe/rewards.ts` → `reportActivity({ kind, id, stars, score, badges, attempts })`.
It alone decides XP, level (`levelInfo`), badges, unlocks, weekly quests and
personal bests, and fires `REWARD_EVENT`; `components/kids/ui/RewardToastClient.tsx`
(mounted in the shell) celebrates. **Never** write those fields directly.
Surfaces that keep their own per-item stars (Story Theatre, Code Lab missions, Spark Trail
levels, `/kids/challenge`) call `reportBestRun(...)`, which reports only a first finish or a
better score, so replays never farm XP.
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
