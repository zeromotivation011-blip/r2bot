// components/kids/ui/shell.verify.ts
// Self-check for the kids shell and its shared UI (Wave 2 shell batch):
//   - navigation (#3): five phone tabs, one everyday word each (Home · Learn ·
//     Worlds · Games · Garage), header tabs, every tab path unique
//   - the grown-up front door (#20): ONE gated footer link to /kids/grown-ups,
//     which lists Parents, Teachers, Classroom, Schools, Trust Pack and privacy
//   - Rank naming (#6): no "Star Cadet" (Cadet is a game tier), the shell shows "Rank"
//   - your next mission (#9): the next tier and the mastery pick
//   - immersive play (#15): 48px tier and "?" buttons, one Exit with a leave guard
//   - no black screens (#16): createStage() handles webglcontextlost with a poster
//   - reward toasts (follow-up): a burst never shows more than the cap; the
//     overflow folds into one "+N more" toast
//   - Wave 3 polish: Calm "what's next" strip (#89), Robodex toast clear of Ask
//     Spark, Engineers + parent hub link /kids/next-step, parent-hub Passport
//     delete, worlds and episode fx follow Calm, lab episodes link the Theatre
//
// Run:  npx tsx components/kids/ui/shell.verify.ts      (exit 1 on any ✗)

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const store = new Map<string, string>()
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (k: string) => (store.has(k) ? (store.get(k) as string) : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: () => true,
    addEventListener: () => undefined,
  },
})

let failures = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`✓ ${name}`)
  else {
    failures++
    console.log(`✗ ${name}${detail ? ` — ${detail}` : ''}`)
  }
}

const ROOT = join(__dirname, '..', '..', '..')
const src = (p: string) => readFileSync(join(ROOT, p), 'utf8')

async function main() {
  // ── Navigation ─────────────────────────────────────────────────────────────
  const N = await import('../../../lib/kids/nav')
  check('five phone tabs', N.KIDS_TABS.length === 5)
  check('tab words: Home · Learn · Worlds · Games · Garage', N.KIDS_TABS.map((t) => t.label).join(' ') === 'Home Learn Worlds Games Garage')
  check('every tab label is one word', N.KIDS_TABS.every((t) => !/\s/.test(t.label)))
  check('tab paths are unique', new Set(N.KIDS_TABS.map((t) => t.href)).size === N.KIDS_TABS.length)
  check('each tab matches its own path', N.KIDS_TABS.every((t) => t.match(t.href)))
  check('only one tab matches each tab path', N.KIDS_TABS.every((t) => N.KIDS_TABS.filter((o) => o.match(t.href)).length === 1))
  check('header has the Galaxy and no Home', N.KIDS_HEADER_TABS.some((t) => t.href === '/kids/galaxy') && !N.KIDS_HEADER_TABS.some((t) => t.href === '/kids'))
  check('no "Hangar" or "Course" left in the tab words', !N.KIDS_TABS.some((t) => /hangar|course/i.test(t.label)))

  // ── Grown-up door ──────────────────────────────────────────────────────────
  const doors = N.KIDS_GROWNUP_DOORS.map((d) => d.href)
  for (const need of ['/kids/parents', '/kids/teach', '/kids/classroom', '/kids/schools', '/kids/teach/trust', '/privacy#kids']) {
    check(`grown-up door lists ${need}`, doors.includes(need))
  }
  check('outside doors are marked as leaving', N.KIDS_GROWNUP_DOORS.every((d) => Boolean(d.leaves) === !d.href.startsWith('/kids')))
  const shell = src('app/kids/KidsShell.tsx')
  const footer = shell.slice(shell.indexOf('<footer'), shell.indexOf('</footer>'))
  check('footer: one gated grown-up link', (footer.match(/<GrownUpLink/g) ?? []).length === 1 && /KIDS_GROWNUPS_HREF/.test(footer))
  check('footer: the child can still join a class', /href="\/kids\/join"/.test(footer))
  check('ParentTimeKeeper is outside the footer (runs on game screens)', /<ParentTimeKeeper \/>/.test(shell) && !/<ParentTimeKeeper/.test(footer))
  const doorsClient = src('app/kids/grown-ups/GrownUpDoorsClient.tsx')
  check('grown-up doors ask the gate', /requireGrownUp\(/.test(doorsClient) && /consumeGrownUpPass\(\)/.test(doorsClient))
  check('grown-up doors respect the links-out switch', /outboundLinks/.test(doorsClient))
  // Every child-surface link to a grown-up page goes through the gate (COPPA: a child
  // must never be one tap from the schools pilot form's name + email fields).
  {
    const { readdirSync, statSync } = await import('node:fs')
    const walk = (dir: string): string[] =>
      readdirSync(join(ROOT, dir)).flatMap((n) => {
        const rel = `${dir}/${n}`
        return statSync(join(ROOT, rel)).isDirectory() ? walk(rel) : /\.tsx$/.test(n) ? [rel] : []
      })
    const grownUpDirs = /^(app\/kids\/(teach|parents|schools|grown-ups|classroom)\/|components\/kids\/(teach|parents|classroom)\/)/
    const plain = [...walk('app/kids'), ...walk('components/kids')]
      .filter((f) => !grownUpDirs.test(f))
      .filter((f) => /<Link[^>]*href="\/kids\/(teach|parents|schools|grown-ups)["/?#]/.test(src(f)))
    check('no plain <Link> from a child page to a grown-up page', plain.length === 0, plain.join(', '))
    const pilot = src('app/kids/schools/PilotFormClient.tsx')
    check('schools pilot form sits behind the parental gate', /<ParentalGate[^>]*>\s*<PilotForm \/>/.test(pilot))
  }

  // ── Rank naming ────────────────────────────────────────────────────────────
  const R = await import('../../../lib/kids/universe/rewards')
  const titles = new Set<string>()
  for (let lv = 1; lv <= R.MAX_LEVEL; lv++) titles.add(R.levelInfo(R.xpForLevel(lv)).title)
  const tiers = ['Cadet', 'Pilot', 'Ace', 'Legend']
  check('no rank name uses a game tier word', [...titles].every((t) => !tiers.some((w) => new RegExp(`\\b${w}\\b`).test(t))), [...titles].join(', '))
  check('shell badge says Rank (not Lv)', /Rank /.test(shell) && !/`Lv /.test(shell))
  const card = src('components/kids/universe/ExplorerCardClient.tsx')
  check('Explorer card shows Rank and the worn title', /Rank <span/.test(card) && /bestTitle\(p\.unlocks\)/.test(card))

  // ── Your next mission ──────────────────────────────────────────────────────
  const U = await import('../universe/universe-state')
  const W = await import('../../../lib/kids/universe/worlds')
  const P = await import('../../../lib/kids-progress')
  const g = W.GAMES.find((x) => x.tiers === 4) ?? W.GAMES[0]
  const base = P.getProgress()
  check('a new Builder starts on Pilot', U.nextTierFor({ ...base, personalBests: {} }, g, 'builders') === Math.min(1, g.tiers - 1))
  check('an Explorer starts on Cadet', U.nextTierFor({ ...base, personalBests: {} }, g, 'explorers') === 0)
  check('after winning Pilot the next tier is Ace', U.nextTierFor({ ...base, personalBests: { [`${g.id}:t1`]: 10 } }, g, 'builders') === Math.min(2, g.tiers - 1))
  check('never past the top tier', U.nextTierFor({ ...base, personalBests: { [`${g.id}:t${g.tiers - 1}`]: 10 } }, g, 'engineers') === g.tiers - 1)
  check('no mastery yet → no concept pick', U.masteryPick({ ...base, conceptLog: [] }) === null)
  const learnTry = { a: 'x1', c: ['loops' as const], t: 'flowchart-builder' as const, k: 'code' as const, b: 'builders' as const, v: 2, d: '2026-11-20', ok: 1 as const }
  const almost = U.masteryPick({ ...base, conceptLog: [learnTry], conceptSecured: {} }, '2026-11-27')
  check('one first-try win → "almost secure" on that concept', almost?.kind === 'almost' && almost.state.id === 'loops')
  const fadingLog = [
    { ...learnTry, a: 'x1', t: 'flowchart-builder' as const, d: '2026-09-01' },
    { ...learnTry, a: 'x2', t: 'sequence-builder' as const, d: '2026-09-02' },
    { ...learnTry, a: 'x3', t: 'flowchart-builder' as const, d: '2026-09-03' },
  ]
  const fading = U.masteryPick({ ...base, conceptLog: fadingLog as typeof base.conceptLog, conceptSecured: { loops: '2026-09-03' } }, '2026-11-27')
  check('a secured concept left alone for weeks → "recharge"', fading?.kind === 'recharge' && fading.state.id === 'loops', JSON.stringify(fading))

  // ── Immersive play ─────────────────────────────────────────────────────────
  const gs = src('components/kids/ui/GameShellClient.tsx')
  check('tier buttons are 48px', /role="radio"[\s\S]{0,400}min-h-\[48px\] min-w-\[48px\]/.test(gs))
  check('"?" button is 48px', /min-h-\[48px\] min-w-\[48px\][^"]*"\s*aria-label="How to play"/.test(gs))
  check('one Exit button with the leave guard', (gs.match(/<ExitButton/g) ?? []).length === 1 && /useLeaveGuard\(/.test(gs) && /\{guard\.dialog && toBody\(guard\.dialog\)\}/.test(gs))
  check('a touch makes the round unsaved work', /onPointerDownCapture=\{markDirty\}/.test(gs))
  check('?tier= opens the game on a tier', /get\('tier'\)/.test(gs))
  // Phones: no fixed tab bar over a game's controls, and the shell clears the home indicator.
  check('no tab bar on /kids/play/* (immersive)', /\^\\\/kids\\\/play\\\/\[\^\/\]\+\//.test(shell) && /\{!bare && !game && \(\s*<nav className="kids-tabbar"/.test(shell))
  check('game shell pads the bottom for the safe area', /pb-\[calc\([^\]]*env\(safe-area-inset-bottom\)\)\]/.test(gs))
  // Flight Recorder for the games' own sims (#38): one recording per round, offered on the results card.
  check('a GameRecorder per round, offered on the results card', /new GameRecorder\(\)/.test(gs) && /setActiveGameRecorder\(r\)/.test(gs) && /\[game\.id, tier, round\]/.test(gs) && /data-testid="open-recorder"/.test(gs))
  {
    const recorded = [
      'drone-hover/DroneHoverGameClient.tsx',
      'sumo-arena/SumoArenaGameClient.tsx',
      'mars-rover/MarsRoverGameClient.tsx',
      'orbit-repair/OrbitRepairGameClient.tsx',
      'swarm-reef/SwarmReefGameClient.tsx',
      'ocean-rescue/DiveGameClient.tsx',
      'arm-factory/ArmFactoryClient.tsx',
    ].filter((f) => !/recordGameFrame\(/.test(src(`components/kids/games/${f}`)))
    check('the seven sim games write to the Flight Recorder', recorded.length === 0, recorded.join(', '))
  }
  {
    // A sim restarted inside one round (Abort, Reset, a re-run) starts again at t=0:
    // its frames must REPLACE the aborted run's, not trail after them.
    const GR = await import('../../../lib/kids/sim/game-recorder')
    const climb = (rec: { frame: (t: number, v: Record<string, number>) => void }) => {
      for (let i = 0; i <= 80; i++) rec.frame(i * 0.05, { 'Height (m)': 1 + i * 0.1 })
    }
    const hover = (rec: { frame: (t: number, v: Record<string, number>) => void }) => {
      for (let i = 0; i <= 60; i++) rec.frame(i * 0.05, { 'Height (m)': 2 })
    }
    // 1) The game says so (restartGameRecording) — the abort/reset/re-run buttons do.
    const r1 = new GR.GameRecorder()
    GR.setActiveGameRecorder(r1)
    climb(r1)
    GR.markGameMoment(3.9, 'Gust!')
    GR.restartGameRecording()
    hover(r1)
    GR.setActiveGameRecorder(null)
    const s1 = r1.snapshot()
    const at2 = GR.gameFrameAt(s1.frames, 2)
    check('recorder: a restarted sim replaces the aborted run', s1.frames.length === 61 && at2?.v[0] === 2 && s1.moments.length === 0 && s1.frames[s1.frames.length - 1].t <= 3.0001, `${s1.frames.length} frames, h@2s=${at2?.v[0]}, ${s1.moments.length} moments`)
    // 2) A game forgets to say so: a clock that jumps back clears the old run too.
    const r2 = new GR.GameRecorder()
    climb(r2)
    r2.mark(3.9, 'Gust!')
    hover(r2)
    const s2 = r2.snapshot()
    check('recorder: a clock that jumps back starts a fresh recording', s2.frames.length === 61 && GR.gameFrameAt(s2.frames, 2)?.v[0] === 2 && s2.moments.length === 0)
    const restarts = [
      ['drone-hover/DroneHoverGameClient.tsx', 2],
      ['swarm-reef/SwarmReefGameClient.tsx', 2],
      ['arm-factory/ArmFactoryClient.tsx', 1],
    ] as const
    const missing = restarts.filter(([f, n]) => (src(`components/kids/games/${f}`).match(/restartGameRecording\(\)/g) ?? []).length < n).map(([f]) => f)
    check('Drone Hover abort/launch, Swarm Reef reset/launch, Arm Factory re-run restart the recording', missing.length === 0, missing.join(', '))
  }
  const lg = src('components/kids/ui/LeaveGuardClient.tsx')
  check('leave guard catches links in the capture phase', /addEventListener\('click', onClick, true\)/.test(lg))
  check('leave dialog buttons are 52px+', (lg.match(/min-h-\[5[26]px\]/g) ?? []).length >= 2)

  // ── No black screens ───────────────────────────────────────────────────────
  const st = src('components/kids/three/stage.ts')
  check('createStage watches webglcontextlost and restored', /webglcontextlost/.test(st) && /webglcontextrestored/.test(st) && /guardWebGLContext\(renderer, container/.test(st))
  check('createStage shows a poster when WebGL cannot start', /catch \(err\)[\s\S]{0,300}showPoster\(/.test(st) && /WebGLUnavailableError/.test(st))
  check('the poster button is 48px', /min-h-\[48px\]/.test(st))

  // ── Toast queue ────────────────────────────────────────────────────────────
  const T = await import('./toast-queue')
  const mk = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, icon: '🏅', title: `t${i + 1}`, body: '' }))
  let q = T.enqueueToasts([], mk(3))
  check('a small burst is kept as is', q.length === 3 && q.every((t) => t.more === undefined))
  q = T.enqueueToasts([], mk(9))
  check('a big burst stays at the cap', q.length === T.TOAST_QUEUE_CAP)
  check('the overflow folds into one "+N more"', q[q.length - 1].more === 9 - (T.TOAST_QUEUE_CAP - 1) && q.filter((t) => t.more !== undefined).length === 1)
  check('oldest rewards are shown first', q[0].title === 't1')
  const q2 = T.enqueueToasts(q, [{ id: 100, icon: '🎁', title: 'late', body: '' }])
  check('a later reward joins the same fold', q2.length === T.TOAST_QUEUE_CAP && q2[q2.length - 1].more === (q[q.length - 1].more ?? 0) + 1 && q2[q2.length - 1].id === q[q.length - 1].id)
  check('fold ids never clash with reward ids', q.filter((t) => t.more !== undefined).every((t) => t.id < 0))
  const rt = src('components/kids/ui/RewardToastClient.tsx')
  check('two toasts at once on phones, three wider', /mq\.matches \? 3 : 2/.test(rt))
  check('no toast behind the level-up ceremony', /ceremony \? \[\] : queue\.slice\(0, maxVisible\)/.test(rt))
  check('on game pages toasts never catch a tap (Wave 3)', /startsWith\('\/kids\/play\/'\)/.test(rt) && /onGame \? 'pointer-events-none/.test(rt))
  const gsW3 = src('components/kids/ui/GameShellClient.tsx')
  check('a round hint reaches the shared 2-star cap (Wave 3)', /hintsUsed\?: boolean/.test(gsW3) && /hintsUsed: r\.hintsUsed/.test(gsW3))
  check('results card is fixed to the viewport and scrolls inside (Wave 3)', /fixed inset-0 z-50[^"]*" role="dialog" aria-modal="true" aria-label="Round results"/.test(gsW3) && /max-h-\[90dvh\][^"]*overflow-y-auto/.test(gsW3))

  // ── Wave 3 shell polish ────────────────────────────────────────────────────
  // #89 the fixed "what's next" strip: Calm mode only, a reserved slot (no shift), not on Home or games.
  check('"what\'s next" strip: Calm only, height reserved by html.kids-calm', /\[html\.kids-calm_&\]:block/.test(shell) && /\{calm && <NextStrip pathname=\{pathname\} \/>\}/.test(shell))
  check('"what\'s next" strip: not on Home or game screens', /const nextSlot = !bare && !game && pathname !== '\/kids'/.test(shell))
  const ns = src('components/kids/universe/NextStripClient.tsx')
  check('"what\'s next" strip: the Home mission (pickMission), a fixed 56px row, 44px button', /pickMission\(/.test(ns) && /h-14/.test(ns) && /min-h-\[44px\]/.test(ns) && !/animate-/.test(ns))
  // The Robodex toast sits clear of the Ask Spark button (bottom 84px + 56px tall up to 900px; bottom 24px from 901px).
  const rdx = src('components/kids/robodex/RobodexToastClient.tsx')
  const spark = src('components/kids/ai/spark/AskSparkClient.tsx')
  const px = (re: RegExp, text: string) => Number(re.exec(text)?.[1] ?? NaN)
  const sparkPhone = px(/bottom-\[calc\(env\(safe-area-inset-bottom\)\+(\d+)px\)\]/, spark)
  const rdxPhone = px(/bottom-\[calc\(env\(safe-area-inset-bottom\)\+(\d+)px\)\]/, rdx)
  check('Robodex toast above the Spark button on phones', rdxPhone >= sparkPhone + 56 + 8, `toast ${rdxPhone}px, Spark ${sparkPhone}px + 56px`)
  check('Robodex toast above the Spark button from 901px', /min-\[901px\]:bottom-6/.test(spark) && /min-\[901px\]:bottom-24/.test(rdx) && !/sm:bottom-6/.test(rdx))
  // Engineers' home and the parent hub link the Graduate page (#35); the hub can delete a Passport (one implementation).
  check('Engineers get "Next step" on Home', /band === 'engineers'\) out\.push\(\{ kind: 'graduate', href: '\/kids\/next-step'/.test(src('components/kids/universe/ContinueCardClient.tsx')))
  const hub = src('components/kids/parents/ParentHubClient.tsx')
  check('parent hub links /kids/next-step and says Rank', /href="\/kids\/next-step"/.test(hub) && /\['Rank', view/.test(hub) && !/Explorer level/.test(hub))
  check('parent hub has "Delete my Passport" (shared with the Garage)', /<PassportDeleteCardClient \/>/.test(hub) && /deletePassportAsGrownUp\(/.test(src('components/kids/parents/PassportDeleteCardClient.tsx')) && /deletePassportAsGrownUp\(passport\.code, \{ gate: true \}\)/.test(src('components/kids/hangar/BackupCodeClient.tsx')))
  // Calm: worlds stop their own bounce/pulse; the episode effects draw no confetti.
  for (const w of ['city', 'farm', 'guardians', 'hospital', 'ocean', 'station', 'zoo']) {
    const ws = src(`components/kids/worlds/${w}/${w[0].toUpperCase()}${w.slice(1)}WorldClient.tsx`)
    check(`world ${w}: no bounce in Calm`, /useKidsCalm\(\)/.test(ws) && !/className="[^"]*animate-/.test(ws))
  }
  const fx = src('components/kids/episodes/engine/fx.ts')
  check('episode fx: Calm read from kidsCalm() and no confetti', /calm \|\| kidsCalm\(\)/.test(fx) && /confetti\(at: THREE\.Vector3, n: number\): void \{\n    if \(this\.calm\) return/.test(fx))
  check('lab episode preview links the Episodes Theatre', /THEATRE_EPISODES/.test(src('app/kids/lab/episodes/[sessionId]/page.tsx')))

  // ── OG image + grown-ups page ──────────────────────────────────────────────
  check('/kids has its own share card', /ImageResponse/.test(src('app/kids/opengraph-image.tsx')))
  const gu = src('app/kids/grown-ups/page.tsx')
  check('/kids/grown-ups is canonical and indexable', /canonical: PAGE_URL/.test(gu) && !/index: false/.test(gu))

  console.log(failures ? `\n${failures} shell check(s) failed` : '\nAll shell checks passed')
  if (failures) process.exit(1)
}

void main()
