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
- **Hangar = the Garage** (`/kids/hangar`, 27 Nov 2026): the robot's ONE home (`lib/kids/robot-design.ts`),
  avatar, badges, unlocks. `components/kids/hangar/GarageClient.tsx`: rename the robot
  (`RobotDesign.name`, checked by `checkNickname`, letters and numbers only; used by Workshop,
  Code Lab, Classroom and certificates), a "Share robot card" 1200×630 PNG made on the device
  (robot, parts, level, stars; never the child's name), and the six Spark Trail parts with
  "Fit to robot" (`TRAIL_PART_FITS`, `isTrailPartFitted`, `fitTrailPart`): Spark's Head → Camera
  Eye, Mighty Arm → Gripper Claw, Sensor Backpack → Colour Sensor, Speedy Wheels → two wheels,
  Control Center Body → Box Body; Rocket Booster is a 3D-bay-only look (`cosmetics.booster`,
  saved with the looks and in the backup code). `/kids/my-robot` 308s to `/kids/hangar`
  (`next.config.mjs`; the page also calls `permanentRedirect`). Building parts stays in the Workshop.
- **Lab**: the real-physics simulator (`lib/kids/sim/`), Rapier + Blockly. Physics Lab
  `/kids/lab/sim` (noindex beta) and Power Lab `/kids/lab/power` (indexable). See "Lab —
  recorder, battery, robot's-eye view" below.

## Navigation — one shell
Calm mode shows a fixed "what's next" strip (`NextStripClient`, loaded by KidsShell only in Calm) on
every ordinary page; its space is reserved by `html.kids-calm` before first paint.

`app/kids/KidsShell.tsx` renders the tabs from `lib/kids/nav.ts` (the reasoning for the words is
written there, roadmap #3). Phone tab bar, exactly five (`KIDS_TABS`): **Home · Learn · Worlds ·
Games · Garage** (Learn = `/kids/course`, Garage = `/kids/hangar`; routes did not change).
Desktop header (`KIDS_HEADER_TABS`, logo = Home): Learn · Worlds · Galaxy · Games · Garage. On
phones the Skill Galaxy is the first item of "More" (hidden there on desktop, where it is a
header link). Secondary surfaces: `KIDS_MORE` — never type how many; each place listed once, then
Settings (`KIDS_SETTINGS`). The More menu is pinned to the screen and scrolls when taller than it.
**One grown-up door** (roadmap #20): the kids footer has exactly one gated link, "For grown-ups"
→ `/kids/grown-ups` (`KIDS_GROWNUPS_HREF`, indexable), which lists `KIDS_GROWNUP_DOORS` (parents,
teachers, classroom, schools, Trust Pack, privacy, main site; `leaves: true` follows the parent
"outbound links" switch), plus "Join a class". No other grown-up link in the footer.
**Rank, not Level** (roadmap #6): the XP number is "Rank N" everywhere a child sees it (header
badge, Explorer card, Garage, toasts, ceremony, results, map). "Level" means a course level only.
The Explorer card and Garage show the worn title `bestTitle(p.unlocks)`.
**Leaving a game** (roadmap #15): `components/kids/ui/LeaveGuardClient.tsx` —
`const guard = useLeaveGuard(dirty)`, one `<ExitButton href onExit={guard.requestLeave} />`,
`{guard.dialog}`. While `dirty`, every same-site link tap asks "Leave this game?" first (grown-up
links and `data-leave-guard="off"` excepted). Used by `GameShellClient` (after the first touch of
a round; `?tier=<n>` opens a tier), the Galaxy `ActivityPlayerClient` (while a mission is in
play) and `SimWorkbenchClient` (Physics/Power Lab, once the program is touched, until solved).
**Toasts**: at most 2 on a phone, 3 wider; queue of 5, the rest folds into "+N more"
(`components/kids/ui/toast-queue.ts`); nothing shows behind the level-up ceremony. On /kids/play/*
the toasts hug the top edge and never catch a tap (taps go through to the game; they still time
out). **Game results card** (`GameShellClient`): `fixed inset-0 z-50`, scrolls inside
(`max-h-[90dvh]`), so it is on screen however tall the game column is. `RoundResult.hintsUsed`
goes to `reportBestRun`, so a game's own hint cap is also enforced by the rewards engine.
**Sticky inside kids:** `app/kids/kids-shell.css` sets `overflow-x: clip` on html/body for pages
with `.kids-nav` (overflow hidden made body a scroll container, so nothing stuck) and
`scroll-padding-top` for the header. The header really sticks now: a sticky panel uses
`lg:top-20` (not top-3/top-4), and a JS-pinned phone element (Mars Rover map, Swarm Reef reef)
pins at the `.kids-nav` bottom, never at top 0.
**Your next mission** (roadmap #9): `ContinueCardClient` leads with the next session; ages 8–17
also get "Also today" (a Recharge/almost-secure concept + a game at the right tier).
**R2BOT Lab look** (roadmap #83): Engineers (14–17) get `<html data-kids-look="lab">` before first
paint (`KIDS_LOOK_BOOT_SCRIPT` in `lib/kids/teen-boot.ts`, synced by `KidsLookSyncClient`, styles in
`app/kids/kids-teen.css`). Per-look text uses `.kids-lab-only` / `.kids-kids-only` (CSS, no
flicker); the shell's tab words come from `LAB_LABELS`. The child's choice (Automatic / Lab / Kids,
`LabLookToggleClient` in Settings) is stored under `profileKey('r2bot_kids_look_v1')` — per child,
so NOT in `SWAPPED_KEYS`. `useKidsLook()` reads it.

**Ask Spark** is mounted once in the shell (`AskSparkClient`, `next/dynamic`, `ssr:false`).
Ordinary pages: a floating button above the tab bar. Game and full-screen pages (`play/*`,
`code-lab/*`, `workshop`, `lab/*`, `stories/*`, course sessions, Galaxy activities, `ai/*`,
`spark-trail/*`, `challenge/*`): no floating button — a 44–48px Spark button in the header
calls `openSpark()`. Hidden on grown-up pages. Offline FAQ unless `KIDS_AI_ENABLED=true`.
When a grown-up switches Spark off (`useParentControls().askSpark`) both buttons STAY,
relabelled "Need help?", and open the "Spark is resting" sheet whose "Get help" button and
helpline card still work: safety help is never behind the switch. Helpline anchors carry
`data-kids-safety` and tel: links are never gated by the store app's link guard.
The parental gate's wrong-answer count and 20 s pause live in sessionStorage
(`r2bot_kids_gate_lock`), shared by every gate in the tab, so Cancel + reopen cannot skip them.
The parent "Camera" switch covers Workshop AR AND the Vision Lab (both also ask the gate).

## Ask Spark safety (roadmap #78)
- ONE classifier for server and device: `classifySpark()` in `lib/kids/ai/spark/safety.ts`
  (+ `patterns-i18n.ts`, `lang.ts`), run on the child's raw words before personal details are
  stripped. Categories: disclosure (someone hurts me), self-harm, wellbeing, jailbreak,
  homework cheating, a child sharing their own details.
- The sheet checks every message ON THE DEVICE first; anything blocked is answered locally
  and never sent to the model. The server (`app/api/kids/spark/route.ts`) answers crisis
  categories before the rate limit, so a child in trouble is never told to slow down.
- Disclosure / self-harm / wellbeing: a kind, short answer (shorter for Explorers) in the
  child's language with `crisis: true`, plus the **helpline card**
  (`HelplineCardClient.tsx`, `helplines.ts`): region from the device time zone then language
  (IN 1098, UK 0800 1111, US 988 + Childhelp, CA, AU, IE, ES ANAR + 116 111, EU 116 111;
  childhelplineinternational.org always). Offline, never behind the parental gate, 44px+.
- A "Worried or not safe? Get help" button is always in the sheet. No transcripts are stored.
- Red team: `lib/kids/ai/spark/redteam/{prompts,verify}.ts` (373 prompts in EN/HI/ES incl.
  60 ordinary questions, every FAQ and starter question as false-positive checks), in CI.
  The patterns were written against the suite: grow the held-out set, and get a native
  review of the Hindi and Spanish replies before launch in those languages.

## Grown-ups: parental gate and parent controls (roadmap #2, #14)
- Gate: `components/kids/app/ParentalGateClient.tsx`. A multiplication in words (a teen number
  × one digit), keypad or keyboard; three wrong answers pause it 20 s; no personal data.
  Use `await requireGrownUp({ message?, target?, grant? })` in a click handler, or wrap UI in
  `<ParentalGate>`. Key presses stop at the dialog.
- `<GrownUpLink>` (`components/kids/app/GrownUpLinkClient.tsx`) for EVERY grown-up or outbound
  link (kids footer, Share to Classroom, AR "Start AR"/"Turn on camera", settings reset).
  With outbound links switched off, links leaving /kids render as plain text. The adult
  `SiteFooter` is not rendered under /kids (`HideOnEmbed kids` in `app/layout.tsx`).
- Controls: `lib/kids/parent-controls.ts` (device-only localStorage): `dailyMinutes`,
  `quietHours`, `askSpark`, `camera`, `outboundLinks`. React `useParentControls()`,
  `useKidsTimeStatus()`; non-React `sparkAllowed()`, `cameraAllowed()`,
  `outboundLinksAllowed()`, `isQuietTime()`. `ParentTimeKeeperClient` (in the kids footer)
  shows a wind-down note 5 min before the budget, a "time for a break" note after it and a
  quiet-hours note. It NEVER locks the screen. Camera off hides the Workshop's "See it in your
  room" and AR shows a kind message.
- `/kids/parents`: a public, indexable explainer; behind the gate the hub
  (`ParentHubClient.tsx`): this week in plain words, totals, a try-at-home idea, Galaxy track
  progress, the robot's parts, the controls, an optional PARENT email for R2BOT Weekly via
  `/api/leads` → `captureLead()` (source `kids-parents`, honeypot, no child data), reset.

## Settings — one device-only store
`lib/kids/settings.ts` (localStorage only; no account). Page `/kids/settings` (noindex),
which also mounts the progress backup code and quick setups (Calm and quiet / Help me read /
Easy to see). Fields: `sound`, `volume`, `music`, `voice` (same key as `lib/kids-voice.ts`,
`r2bot_kids_voice`; the header button writes through the store, so muting it also stops
read-aloud), `readAloud`, `reduceMotion`, `textSize` (normal/large/larger; `largeText` is derived
from it), `highContrast`, `dyslexia`, `colourSafe`, `calm`, `timeScale` (1/1.5/2), `untimed`,
`scanMode` (off/step/auto), `scanSpeed`, `lite3d` (roadmap #25, #89).
- Every change fires `KIDS_SETTINGS_EVENT` (`r2bot:kids-settings`); other tabs follow via `storage`.
- React: `useKidsSettings()`, `useKidsReducedMotion()` (device preference OR the setting),
  `useKidsLite3D()`, `useKidsCalm()`, `useKidsTime()`. Non-React: `readKidsSettings()`,
  `kidsReducedMotion()`, `kidsLite3D()`, `kidsCalm()`, `kidsMusicOn()`, `kidsTime()`.
- **Timers:** every child-facing countdown goes through `kidsTimeLimit(base)` (Infinity when
  untimed, so `t >= limit` never fires) and skips any time bonus when untimed. Done: Robot
  Surgeon (3 games), Orbit Repair, Arm Factory (every Legend re-run too), Conveyor Bug, Sky Port
  (Cadet; the Pilot/Ace/Legend clocks are simulated mission time). Pure sims take the limit as a
  parameter (`createState(tier, kidsTimeLimit)`) so they stay deterministic. Swarm Reef and
  Bio-Bots keep their limits on purpose: there the clock is simulated mission time, part of
  the engineering puzzle, not the child's reaction speed.
- **Calm:** `fire()` in `Confetti.tsx` returns early, `playSound` swaps fanfares for one soft
  chime, the level-up ceremony plays without motion, episodes build a calm scene; music beds
  play only when `music` is on.
- **Read everything to me** (`lib/kids/read-aloud.ts`, runtime
  `components/kids/settings/access-runtime.ts`, code-split, loaded only when read-aloud or
  scanning is on): a tap on text reads it, a tap on a button reads its name and still works,
  a half-second hold reads without pressing; every aria-live / role=status / role=alert change
  is spoken. Markup: `data-read-aloud`, `data-read-aloud="text"`, `data-read-aloud="off"`,
  `speakFeedback()`, `<ReadAloud>` / `<ReadAloudButton>`.
- **Scanning:** step (Space moves, Enter picks) or auto; stays inside an open dialog. A tap-only
  SVG/div shape must be `role="button"` + `tabIndex={0}` + Enter/Space, or carry
  `data-keyboard-twin="<the real control>"` when a focusable control already does the same.
- **Colour-safe cues:** a verdict carries `data-cue="ok|no|warn|info"` (icon + border style);
  patterns `.kids-cue-stripes|dots|grid`.
- Check: `lib/kids/access.verify.ts` (CI): store, boot script and a per-template checklist
  (names, labels, keyboard, alt, feedback, drag, 44px). A ratchet: `BASELINE` is empty; any new
  issue fails.
- three.js: `kidsRenderHints()` → `{ dpr, antialias, shadows }`, `liteDpr()`. `createStage()`
  in `components/kids/three/stage.ts` already applies them, and its `prefersReducedMotion()`
  returns `kidsReducedMotion()`. A view that makes its own renderer must use these too.
- `<html>` classes, set before first paint by `KIDS_SETTINGS_BOOT_SCRIPT` (in
  `app/kids/layout.tsx`) and kept in step by `RewardToastClient` (removed on leaving /kids):
  `kids-large-text` (kids text ~112%), `kids-reduce-motion` (animations cut),
  `kids-lite-3d` (informational), plus one class per new access setting (high contrast,
  dyslexia, colour-safe, calm, text size, scanning). CSS: `components/kids/settings/kids-settings.css`.
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
`checkMisconceptions` (Wave 3): wrong check answers as `"<session>.<misconception id>" → count`
(ids and counts only, capped at 60, default `{}`), written by `CheckStepClient` through
`lib/kids/misconceptions/store.ts`; travels in the backup code (a restore keeps the higher count
and drops bad keys and any free text).
Checks: `lib/kids/progress-backup.verify.ts` (CI).

### Profiles — one device, several children (roadmap #41, #90)
`lib/kids/profiles.ts`. A device with no profiles behaves exactly as before (no profile button).
- Progress and robot use per-child keys: the child who used the device first is `p1` and keeps
  the original keys (`r2bot_kids_v2`, `r2bot_kids_robot_v1`); others use `<key>::<profileId>`
  (`profileKey(base)`). `getProgressOf(id)`, `loadDesignOf`/`saveDesignOf`; backup codes take an
  optional `{ profileId }`.
- Stores read by a fixed key elsewhere (Galaxy map, course, hangar looks, class membership and
  missions, onboarded, Spark reward day, build day, vision, `r2bot_think_*`, Code Lab drafts,
  game-seen and world-complete flags) are SWAPPED on each switch (`SWAPPED_KEYS` /
  `SWAPPED_PREFIXES`): the playing child's data sits at the plain key. A switch is
  all-or-nothing and rolls back on a storage error.
- **Rule:** a new per-child localStorage store uses `profileKey(base)` OR is added to
  `SWAPPED_KEYS` — never both (one child's data could overwrite another's). Moving a swapped
  store to `profileKey()` removes it from `SWAPPED_KEYS` in the same commit.
- UI (`components/kids/profiles/`): `ProfileSwitcherClient` in the shell header, "Who's playing?"
  picker (Explorers unlock with a 3-picture password; older children may add one),
  `ParentProfilesClient` in the parent hub (Family / Shared device). At home adding a child asks
  a grown-up; on a shared tablet "Done" clears the device back to the picker. `/kids/join` binds
  the class member to a profile (`bindClassMember()`); a teacher's band lock also sets the active
  profile's band (`applyClassBandToProfile()`).
- `wipeNamespace` (shared tablet "Done") removes only `PROFILE_KEY_BASES` and swapped keys under
  `::_none`, never another store's key that happens to end in `::_none`.
- Play together (`lib/kids/together.ts`, `/kids/together`, noindex): the older child navigates,
  the younger drives; stars through `reportBestRun`, the partner's paid on their next turn.

## Mastery — concepts, Recharge, Launch Check (roadmap #27–#29)
- Every activity names 1–3 `ConceptId`s from the course's concept list; `activities/verify.ts`
  fails on a missing, unknown or duplicate concept, or one only a single template practises.
- `lib/kids/universe/mastery.ts` (pure): a concept is **secure** after 3 first-try wins on 3
  different activities using 2 templates within 21 days; it **fades** after 21 days with no
  first-try win, and one first-try win recharges it. A hinted win never counts as first-try.
- Store fields in `lib/kids-progress.ts`: `conceptLog`, `conceptSecured`, `galaxyStart` (empty by
  default; the backup code cleans and merges them).
- Evidence: `recordActivityResult(id, run, activity, { assisted })` and
  `recordActivityMiss(activity)` in `lib/kids/activities/progress.ts` (the activity player and
  `finishGalaxyRun` in `lib/kids/activities/run.ts` call them).
- Daily plan: `dailyMissionPlan()` = 1 new + 1 recharge (a fading concept, a different template
  from its last win) + 1 stretch, worked out from the state at the start of the day; skipping a
  day costs nothing.
- Launch Check (`lib/kids/activities/launch-check.ts`, `/kids/galaxy/launch-check[/track]`,
  noindex): 6–8 missions stepping up/down; pacing (`lib/kids/activities/pacing.ts`) sets the
  per-track start (Cadet/Pilot/Ace/Legend). `PacingNudgeClient` offers "skip to Ace?" after
  three first-try wins and an easier mission on the same concept after two misses in a row.
- Constellations: `/kids/galaxy/concepts` (indexable) and a compact grid in the Garage.
  Teachers: `conceptGridCode(progress)` (16 letters, decode `parseConceptGridCode`) is ready
  for the class snapshot. Check: `lib/kids/universe/mastery.verify.ts` (CI).

## Hint ladder (roadmap #26)
One component, `components/kids/galaxy/HintLadderClient.tsx`, in the Galaxy activity player and
Code Lab. It appears only after a failed try: goal → clue (the last `CheckResult.feedback`, then
a template tip from `hint-tips.ts`) → "Spark shows me": a solved twin built on the server by
`workedTwinFor()` (`worked-solution.ts`; Code Lab `codelab/worked-twin.ts`), never the activity
itself and never the same answer, sent as words only. Any hint caps the finish at 2 stars and
still earns XP; the report carries `hintsUsed` and `reportActivity` enforces the cap. Check:
`components/kids/galaxy/hint-ladder.verify.ts` (CI).

## Rewards — one function
`lib/kids/universe/rewards.ts` → `reportActivity({ kind, id, stars, score, badges, attempts, hintsUsed })`
(`hintsUsed` caps stars at 2).
It alone decides XP, level (`levelInfo`), badges, unlocks, weekly quests and
personal bests, and fires `REWARD_EVENT`; `components/kids/ui/RewardToastClient.tsx`
(mounted in the shell) celebrates. **Never** write those fields directly.
Surfaces that keep their own per-item stars (Story Theatre, Code Lab missions, Spark Trail
levels, `/kids/challenge`) call `reportBestRun(...)`, which reports only a first finish or a
better score, so replays never farm XP.
Game results go through `reportBestRun` in `GameShellClient` ("Beat your best to earn more XP"):
first finish = full XP, improvement = half, replay = 0. `RewardResult` carries `kind`, `id`, `xpBefore`.
- **Quests** (`lib/kids/universe/quests.ts`): 49 quests tagged by band, with source, track,
  min-star and improvement filters. Each week a band gets 3 quests of different kinds plus a
  bonus 4th, the same for every child in the band; missing a week costs nothing. Course-only
  quests are hidden unless `hasOpenCourse(p)`; since Wave 2 all four bands are in
  `COURSE_OPEN_BANDS` (every level is playable). Kind `discovery` (0 XP) is for Robodex /
  Makers badge claims; no quest counts it. `bugfix` counts the debug-program Galaxy activities (`DEBUG_ACTIVITY_IDS`);
  `build` counts a robot save once a day (`reportRobotSaved()`, called by `RewardToastClient`).
  UI: `components/kids/universe/QuestPanelClient.tsx` (picture cards + speaker for Explorers,
  a list for older bands), used by the Explorer card.
- **Unlocks** (`lib/kids/universe/unlocks.ts`): something at every level 1–60 (paints, a
  `title` kind; `bestTitle(p.unlocks)`).
- **Ceremony**: `components/kids/ui/LevelUpCeremonyClient.tsx`, ~3 s, skippable (button and
  Escape), reduced-motion aware, loaded by `RewardToast` only on a level-up. Distinct sounds
  per reward type in `lib/kids-audio.ts` (`badge`, `quest`, `stamp`, `best`); Spark speaks
  badges, quests and level-ups for Explorers.
- Checks: `lib/kids/universe/rewards.verify.ts` (CI).
Rules: reward learning and effort, not time; personal bests, never rankings or
leaderboards; no streak that punishes a missed day.

## Course — four levels, one progress store (roadmap #23, Wave 2)
- Levels: `lib/kids/curriculum/level1..4`. Level 1, 3 and 4 use the shared `Session` type and
  `components/kids/course/SessionRunnerClient.tsx`; Level 2 has its own `L2Session` and
  `components/kids/course/level2/` runner (server data from `level2/resolve.ts`, server-only).
  Outlines (titles, objectives, concepts, projects) come from `levels.ts`; each level's verify
  checks they match. The Builder certificate wording lives in `levels.ts` (`LEVEL2_CERTIFICATE`
  reads it back: `levels.ts` must never import a level folder — `level2/act1.ts` imports it).
- Pages: `/kids/course/<1-4>` indexable (in the sitemap; `PLAYABLE` in the level page, the
  course hub and `PLAYABLE_LEVELS` on `/kids`), `/kids/course/<level>/<n>` noindex.
- Levels 3–4 reuse what is playable today: `SessionReuse` (`level3/reuse-kit.ts`, light, no
  imports) names a game tier, Code Lab mission, Physics Lab arena or Galaxy activity. The runner
  shows a play card (`reuse` + `play` props, href from `playForL34()`), counts it done with
  `reusePlayDone()` when the child comes back (game tier / mission / activity), or an
  "I finished it" button for Physics Lab arenas and activities; done = `challengeStars: 1`,
  reported once through `reportBestRun({ kind: 'challenge' })`. Levels 2+ show the episode as
  the storybook (`EpisodeStepClient storybookOnly`): there are no 3D episode files for them.
- Check questions: every wrong option carries `misconception: <id>` (both types), listed with a
  5-minute reteach in the session's teacher notes — the data #30 will read.
- Teacher guides: `lib/kids/teach/all-guides.ts` (server only) routes every level —
  `guides.ts` (L1), `guides-level2.ts` (L2, `practise`), `curriculum/level3/teacher-guide.ts`
  (L3–4, `play`, `lookFor`, `reteach`). `TeacherGuide.level` is `LevelNumber`. `/kids/teach`
  lists all four levels; every `/kids/teach/<level>/<n>` is indexable and in the sitemap.
- Course badges for surfaces that name them: `LEVEL2_BADGES`; L3/L4 from `session.badge`.

## Robodex and Meet the Makers (roadmap #32, #34, #35)
- Robodex `/kids/robodex` (indexable): cards in `lib/kids/robodex/cards.ts`, a checked
  `robotSlug` where a `/robots/<slug>` page exists. Cards come ONLY from doing: the evidence is
  read from the existing stores (`syncRobodex()`), so nothing has to call it. The single hook
  point is `components/kids/robodex/RobodexToastClient.tsx`, mounted once in `KidsShell`
  (`dynamic`, `ssr:false`). Per child (`profileKey`); rides in the backup code as
  `extras.robodex` (`robodexBackupExtra` / `restoreRobodexExtra`, a restore never removes).
- Makers `/kids/careers` + `/kids/careers/<id>` (indexable, `MAKERS` in
  `lib/kids/makers/makers.ts`; count from the array). Career Constellation lights skills from
  `mastery.ts`, fixed order, never ranks.
- Careers badges: `CAREER_BADGE_LIST` in `rewards.ts` (track `careers`, part of
  `UNIVERSE_BADGES`); `RewardToastClient` claims them on `r2bot:kids-robodex` /
  `r2bot:kids-makers-heard` via `claimCareerBadges()` → `reportActivity({ kind: 'discovery', xp: 0 })`.
- `/kids/next-step` (noindex): Engineers see the main platform through `GrownUpLink`; under-13s
  only behind `<ParentalGate>`.

## Robot growth, X-ray, robot's-eye view (roadmap #33, #36, #37)
- `RobotDesign.upgrades?` (power, motor, second sensor, arm, World form) in
  `lib/kids/robot-design.ts`; unlocked by badges, Code Lab missions and World game rounds
  (`lib/kids/robot-growth.ts`), never locked again. Old designs and 8-field share codes still
  decode; a 9th field carries the upgrades (and so the backup code). Upgrades change the sim
  physics: `fittedSpec(d)` in `lib/kids/sim/robot-spec.ts` (motor gearing and overload, pack/arm/2nd
  sensor mass) drives the engine; course challenges strip upgrades (`sessionDesign`) so their
  calibration holds. **One source of numbers:** `specSheet()` takes volts/amp-hours from
  `packInfo(POWER_PACKS[id])`, mass/gearing from `MOTOR_GEARING`, `POWER_MASS_DELTA`, `ARM_MASS`, and a
  ground robot's runtime and draw from `cruisePower(d)` (the engine's own drain constants, including
  `moveAmpsPerSide` for tracks and legs) — change a number in robot-spec/battery, never a copy.
  World forms (drone/sub/humanoid) are never simulated and keep a power-per-kg model.
- `buildRobot(design, opts)` in `lib/kids/robot3d.ts` stays backwards-compatible; wiring is
  derived from parts (`lib/kids/robot-wiring.ts`). Volts/amps only for Inventors and Engineers.
- `computeSensors` returns `beams[]` (all 20 echo rays). Sim pages pass `run.sim.sensors()`
  for every robot; the renderer draws the distance beam only for robots that see walls, and
  `components/kids/sim/sensor-view.ts` draws the robot's-eye PiP. Less motion / Lite 3D respected.
- Check: `lib/kids/robot-growth.verify.ts` (CI).

## Lab — Flight Recorder, battery, Power Lab (roadmap #38, #39)
- `lib/kids/sim/recorder.ts`: every Physics Lab, Power Lab and course-challenge run is recorded
  into a 3-minute ring buffer; recording only reads the sim (verify: a recorded run ends exactly
  like an unrecorded one). UI `FlightRecorderClient.tsx`: scrub, events, "Why did it fail?", graphs.
- Ghost of the child's own fastest success: `lib/kids/sim/ghost-store.ts`, per child via
  `profileKey()` (so NOT in `SWAPPED_KEYS`). "Beat yourself" wording only.
- `lib/kids/sim/battery.ts`: cells, series/parallel packs, sag, brownout. An arena without a
  `battery` only meters (physics and every existing result unchanged). Arenas may add
  `chargers` and the `visit-and-return` goal; fail reasons `flat`, `not-visited`. Sensor
  `battery_pct` (also accepted by Talk to your robot).
- Games' own sims are recorded too (#38): `lib/kids/sim/game-recorder.ts`. The game shell opens one
  `GameRecorder` per round; a game adds ONE line after it steps its sim —
  `recordGameFrame(t, { 'Height (m)': z, … })` (t in SECONDS of game time, ≤ 6 channels, 20 Hz) —
  and `markGameMoment(t, 'Gust!')` for markers. The results card offers "Watch the Flight Recorder"
  (`GameRecorderClient`, lazy). shell.verify lists the games that must record.
- Sensor blocks `reflectance` (raw 0–100 under the line sensor) and `battery_pct` are curriculum
  `BlockId`s introduced at Level 3; the Physics Lab and Power Lab open a demo with `?demo=<id>`
  and games a tier with `?tier=` (links built by `lib/kids/sim/lab-links.ts`).
- The sim meters the robot's own pack (`powerPack(d)` = its power upgrade).
- **No black screens** (roadmap #16): `createStage()` in `components/kids/three/stage.ts` handles
  `webglcontextlost` with a "3D is resting" poster and "Try again"; when WebGL cannot start it shows
  the poster and throws `WebGLUnavailableError`. A view that builds its own `WebGLRenderer` calls
  `guardWebGLContext(renderer, container)` and the returned remover BEFORE it disposes (dispose
  force-loses the context). A view with its own poster passes `poster: false` (Garage).
- **Link Lab** `/kids/lab/network` + **Robot Security Check** `/kids/lab/network/guardian` (roadmap
  #88, indexable): `components/kids/net/` — a pure seeded link sim (delay, loss, jitter, radio
  shadow) with fixes the child switches on (ack + retry, sequence numbers, watchdog, speed limit,
  prediction); a tap-only, defensive four-step security mission (no password is ever typed).
  Rewards via `reportBestRun` (`net-link-<level>`, `net-guardian-check`). Guardians activities live
  in `lib/kids/activities/content/zones/guardians-net.ts`. Check: `components/kids/net/net.verify.ts` (CI).
- Checks: `lib/kids/sim/verify.ts` and `lib/kids/sim/flight.verify.ts` (CI).

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

## Offline (roadmap #17)
`public/kids-sw.js` (scope /kids, registered by KidsShell in production). Install precaches the
five tabs, Galaxy, Settings, every "More" place except `/kids/ai`, the Story Theatre hub and every
episode, Workshop, Code Lab and the labs (the list is `PRECACHE_PAGES`; `lib/kids/offline.verify.ts`
fails CI if a tab, "More" place or episode is missing or a listed page does not exist), plus the
JS/CSS each lists, the chunks they load on demand (read from Next's webpack chunk map, including
spliced `"static/chunks/"+e+"-<hash>.js"` ids) and the fonts named in the CSS. **Deploy refresh:**
the worker remembers the webpack runtime file's name; when a kids page from the network names a
new one it re-runs the precache in the background (one at a time, at most every 10 minutes), so
lazy chunks follow a deploy without a VERSION bump. No third-party request on /kids: GA is skipped
and the Supabase preconnect is added by `components/SupabasePreconnectClient.tsx` only off /kids. Pages: network first, keyed by path (`?source=` ignored), saved copy after
4 s or a 5xx; an unseen page gets a built-in offline page. Static: cache first. Episode audio:
its own cache `r2bot-kids-audio-1` that a version bump keeps. Never cached: /api/*, RSC
requests, /kids/classroom, /kids/join. Rename a precached game route → update `PRECACHE_PAGES`.

## Content hygiene (roadmap #18)
`ALL_ACTIVITIES` is authored content only: the template samples are not in the live Galaxy
(their URLs 404) and the `/kids/lab/templates/*` benches 404 in production
(`app/kids/lab/templates/bench.ts`). `/kids/challenge/*` is canonical + noindex. Spark's game and
world lists come from `GAMES` and `WORLDS`. Before promoting a sample, give
`design-estimate-vacuum-tower` and the three `world-match-*` samples realWorld text.

## Classroom wave 2 — counts only (roadmap #13, #30, #31, #40)
- The class snapshot (`ClassSnapshot` in `lib/kids/classroom.ts`, built by `KidsClassSyncClient`) now carries
  COUNTS only: `concepts` (16 letters) + `conceptEvidence` (wins/tries/misses/days), `activityScores`
  (stars + tries), `galaxyStuck`, `courseStuck`, `misconceptions` (count per `"<session>.<misconception id>"`,
  never an answer or text), `gameTiers`, and `days` (things finished per day, for the class goal).
  `totalMinutesPlayed` is always 0 (no longer sent). Budget 16 KB after migration 0056; before it, the sync
  retries trimmed to the old 8 KB.
- **Any change to `ClassSnapshot` must update `CLASS_SNAPSHOT_FIELDS` in `lib/kids/teach/trust-pack.ts` in
  the same commit** (typed against every field, so type-check fails otherwise). The Trust Pack is what
  schools read.
- Misconceptions: `CheckStepClient` gets `sessionKey={session.id}`; a wrong option carrying `misconception`
  calls `recordMisconception()` (`lib/kids/classroom-diary.ts`, only while the child is in a class) and
  the device record (`checkMisconceptions`, always). Every level's ids live in one typed catalogue,
  `lib/kids/misconceptions/` (idea, correction, child words, 5-minute reteach); `QuizOption.misconception`
  is typed. Class Mind Map and "Where to help next" show an item only when 2+ children share it, each
  with a "Re-teach it" box. Check: `lib/kids/misconceptions/verify.ts` (CI).
- **Teacher band lock** (roadmap #29, migration 0058): `kids_classes.band_locked`,
  `kids_class_members.band_lock`; PATCH `band-lock-class` / `band-lock-member`; `/api/kids/sync` returns
  `lockedBand` and the device applies it (`saveProgress({ band })` + the active profile). Band pickers
  read `classBandLock()` and say "Your teacher chose …" instead of changing it. Before 0058 runs the
  PATCH answers 503 and the panel says the feature is being switched on.
- Gradebook: children × concepts in roster order (never ranked), evidence on tap, CSV/PDF.
  `/kids/teach/standards` (indexable) from `lib/kids/classroom-standards.ts`.
- Class Power-Up (`lib/kids/classroom-goal.ts`, pure): one meter, milestones 25/50/75/100, "who helped"
  ticks with no counts. A thing counts once per `kind:id` per child per day (from `REWARD_EVENT` in
  `KidsClassSyncClient`), so replays cannot fill it. Goal in `kids_classes.goal` (migration 0056); before
  it runs the goal lives on the teacher's device and the child card stays hidden. Projector:
  `/kids/classroom/<id>/projector`. Both new device stores use `profileKey()`.
- Check: `lib/kids/classroom-wave2.verify.ts` (CI).

## Teaching tools — Present mode, Trust Pack, clubs, unplugged (roadmap #42, #43, #84, #85)
- `/kids/present` (noindex, gated entry via `<PresentButton>`): frames any `/kids` path, a session, an
  episode or a lab with timer, join code + QR (`lib/kids/teach/qr.ts`), slow motion, freeze-and-draw,
  ask-the-class and a hands-up vote. Ask Spark is hidden there (`SPARK_HIDE_GROWNUP`).
- **Present bridge** (`lib/kids/teach/present-bridge.ts`): Present sets `window.__r2botPresent` on the
  framed window and fires `r2bot:present`. Animated pages follow it: `usePresentSignal()` in React, or
  `readPresentSignal()` inside a frame loop. Multiply your own speed by `speed`; stop time while
  `frozen`. Wired: `SimWorkbenchClient` (lab + course challenges), `EpisodePlayerClient` (speed + pause),
  `StoryPlayerClient` (line time + pause). Outside Present the signal is `{ speed: 1, frozen: false }`.
- Trust Pack `/kids/teach/trust` + on-device PDF; clubs, family nights, library at `/kids/teach/{clubs,
  family,library}`; unplugged lessons `/kids/teach/unplugged/<n>` (one per Level 1 session, from
  `allUnpluggedLessons()`). Checks: `lib/kids/unplugged/verify.ts`, `lib/kids/teach/clubs.verify.ts` (CI).

## Make It at Home, portfolio, certificates (roadmap #6, #44, #45)
- Builds: `lib/kids/builds/` (`HOME_BUILDS`; count from it). Hub `/kids/printables` and
  `/kids/printables/<id>` (indexable, HowTo JSON-LD); `/kids/activities` 308s to the hub. Every build has
  hazard tags, a minimum band, a grown-up flag, a fair test and a check question; `lib/kids/builds/verify.ts`
  enforces the safety rules (#79) in CI.
- Check-ins: `r2bot_kids_builds_v1` per child (`profileKey`, NOT in `SWAPPED_KEYS`). The check-in pays
  through `reportBestRun({ kind: 'project', id: 'home-build-<id>', score: 1 })` (first finish only). Teen
  reflections pass `classifySpark` on the device; personal details are refused; a hurt child gets the
  helpline card and nothing is saved.
- Portfolio `/kids/portfolio` (noindex, device-only): reads the existing stores plus its own
  `r2bot_kids_portfolio_v1` (robot snapshots + teen reflections, `profileKey`). Certificates for levels,
  Worlds and milestones; teacher class sets at `/kids/portfolio/class-certificates` (noindex; names typed
  on the device, never sent).
- Backup code extras: `builds` (`buildsBackupExtra`: 3-char FNV tag + day + fair-test result, no
  reflections; tags are collision-checked in the builds verify) and `portfolio` (`portfolioBackupExtra`:
  the newest snapshots that fit 512 chars). Restores merge and never remove.

## Robot Passport (roadmap #12) — migration 0057
`lib/kids/passport*.ts`, route `app/api/kids/passport`, UI in `BackupCodeClient` (Garage + Settings).
Random words + number (e.g. CHEETAH-NOVA-BALLOON-89) and a QR (`/kids/hangar#passport=…`); the
server stores only the SHA-256 of the canonical words plus the same backup code the offline path
makes (progress + nicknames). Service-role only, RLS on with no policies, rate limited, deleted
after 400 days unused. Print and Delete go through `requireGrownUp()`. Delete is one function,
`components/kids/hangar/passport-delete.ts`, used by the Garage and the Parents page. Until 0057 runs the route
answers 503 and the offline backup code opens by itself. The device copy is
`profileKey('r2bot_kids_passport_v1')` (per child). Check: `lib/kids/passport.verify.ts` (CI).

## Story voices and Episodes Theatre (roadmap #8)
Story Theatre lines play recorded Piper clips (`public/kids/audio/stories/`, same cast voices as the
3D episodes) through `speakStoryLine()` / `primeStoryVoice()` / `stopStoryVoice()` in
`lib/kids/episodes/story-voice.ts`, falling back to the browser voice for any line without a clip.
Re-voice with `scripts/kids-voices/generate-stories.py`. The Episodes Theatre shelf
(`EpisodesTheatreShelf`) sits on `/kids/stories`; one indexable page per course episode at
`/kids/stories/episodes/<sessionId>` (`THEATRE_EPISODES`, in the sitemap). Check:
`lib/kids/episodes/story-voice.verify.ts` (CI).

## One block language (roadmap #21)
Code Lab keeps its grid interpreter (tap-first, verifiable missions) but its blocks share the
Blockly set's colours and emoji; `lib/kids/code-lab/shared-vocabulary.ts` maps each Code Lab block
to the shared block and holds the porting path. The Code Lab verify checks that the same robot part
locks a block in both editors and that the colours match.

## Robot Maths and inclusion (roadmap #86, #87)
- `/kids/maths` + `/kids/maths/<concept>` (indexable; count from `MATHS_CONCEPTS` in
  `lib/kids/maths/concepts.ts`, each with a worked example per band); Galaxy activities in
  `lib/kids/activities/content/maths.ts`. Check: `lib/kids/maths/verify.ts` (CI).
- "Draw me" avatar (`AvatarMakerClient`, data `lib/kids/avatar-look.ts`): skin tones, hair, head
  coverings, glasses, hearing aids, wheelchair, bionic hand; no gender question. Saved as a
  `me-…` id in the existing `avatar.id` (no new store). Engineers who never chose an avatar see the
  Lab badge (`displayAvatarId`). No combat wording in game zones (sumo is the "Push Lab").
  Check: `lib/kids/inclusion/verify.ts` (CI).

## Never
Leaderboards or comparing children. Collecting any personal data from a child.
Prices or "free forever". Copying another brand's characters, curriculum or games.
