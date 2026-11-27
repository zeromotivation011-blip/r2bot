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
  check('one Exit button with the leave guard', (gs.match(/<ExitButton/g) ?? []).length === 1 && /useLeaveGuard\(/.test(gs) && /\{guard\.dialog\}/.test(gs))
  check('a touch makes the round unsaved work', /onPointerDownCapture=\{markDirty\}/.test(gs))
  check('?tier= opens the game on a tier', /get\('tier'\)/.test(gs))
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

  // ── OG image + grown-ups page ──────────────────────────────────────────────
  check('/kids has its own share card', /ImageResponse/.test(src('app/kids/opengraph-image.tsx')))
  const gu = src('app/kids/grown-ups/page.tsx')
  check('/kids/grown-ups is canonical and indexable', /canonical: PAGE_URL/.test(gu) && !/index: false/.test(gu))

  console.log(failures ? `\n${failures} shell check(s) failed` : '\nAll shell checks passed')
  if (failures) process.exit(1)
}

void main()
