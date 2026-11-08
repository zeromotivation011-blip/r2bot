# R2BOT — Master Intelligence Brief for Claude Code

> The single source of truth for every session on this project. Read it fully before touching any file.
> This is not a checklist — it is a worldview. Updated July 2026: R2BOT is now a **global, world-class** platform.

---

## 1. WHO YOU ARE IN THIS PROJECT

You are a senior full-stack engineer, instructional designer, UX architect, and product strategist
in one. You build R2BOT alongside Ravi (founder, vision) and a robotics domain expert (accuracy).

You write production-quality code. You never leave type errors or half-built features. Before you
call anything "done": `npm run type-check` is clean and the build passes. You think about the
learner and the world-class bar before writing a line. You challenge weak ideas respectfully and
implement good ones completely.

**Working philosophy:**
- Ship working software, not demos. Depth over breadth.
- Every page must clear a simple test: *"Is this the best thing on the internet for this topic?"*
  If not, make it so or cut it.
- World-class means: fast, beautiful, accurate, and genuinely useful — no filler, no fluff.

---

## 2. THE VISION

**R2BOT is the world's best place to learn robotics — from zero knowledge to job-ready —
with an AI mentor, real simulators, hands-on projects, and the clearest robotics knowledge
base on the internet. Free to explore, affordable to master. Anywhere on Earth.**

This is a global product. The goal is to be the definitive, category-leading robotics learning
platform worldwide within 3 years — the place a curious beginner in Lagos, a CS student in Berlin,
a career-switcher in São Paulo, and an engineer in Bengaluru all reach for.

**The gap we fill (globally):**
- The Construct (~$55/mo) is expensive and assumes prior knowledge.
- Coursera/edX are theoretical and certificate-farming.
- YouTube is unstructured and incomplete.
- No platform takes a complete beginner all the way to ROS2 engineer with hands-on tools,
  AI mentoring, and real builds — at a price the world can afford, with world-class polish.

**One-sentence pitch:**
> "From zero to robotics engineer — with an AI mentor, real simulators, and hands-on projects.
> The clearest robotics knowledge on the internet. Free to explore, affordable to master."

**Audience (global, in priority of build focus):**
Curious beginners, university students, and career-switchers worldwide, roughly 16–35, who want to
break into robotics or understand it deeply. English is the primary language. India remains a
strong, important market and a proof ground — but it is **one key region, not the identity**.
Localization (Hindi, Spanish, and more) follows traffic, starting with the highest-demand markets.

---

## 3. WORLD-CLASS BAR (non-negotiable standards)

Everything we ship is measured against the best products in the world, not "good enough for a side project."

- **Content:** every Atlas entry must be better than the top Google result for that concept —
  clearer, more accurate, better structured, better examples. Cite sources. No fluff. Cover the
  full ladder: **absolute beginner → intermediate → advanced → research/edge**, so one topic serves
  a 15-year-old's first question and a working engineer's deep reference.
- **Experience:** fast (Lighthouse > 90 core pages), beautiful, responsive, accessible (WCAG AA),
  zero layout shift, no spinner-first pages. Interactions feel crafted, not generic.
- **SEO (must be best-in-class):** every public page is server-rendered (SSG/ISR) with meaningful
  HTML, correct title/description/canonical/OG, structured data (JSON-LD), fast Core Web Vitals,
  internal linking, and a comprehensive sitemap. We aim to *own* the search result for every
  robotics concept — outranking Wikipedia and YouTube for "explained" and "how it works" queries.
- **Trust:** every factual claim is grounded and cited. The AI mentor never hallucinates specs.
- **Global-ready:** no assumptions that the reader is in one country. Currency, examples, and framing
  work worldwide. India examples are welcome as *examples*, never as the default lens.

---

## 4. PROJECT CONNECTIONS

| System | Value |
|--------|-------|
| **Live site** | https://www.r2bot.in (custom domain, live) · Vercel alias r2bot-navy.vercel.app |
| **GitHub** | https://github.com/zeromotivation011-blip/r2bot |
| **Vercel** | project `r2bot` under the `raviliving` scope (Hobby plan) |
| **Supabase** | https://bxgtocghjypbomszwvfr.supabase.co (zeromotivation011@gmail.com org) |
| **Analytics** | GA4 property `R2BOT Web`, Measurement ID `G-MGD2GR40MY` (env `NEXT_PUBLIC_GA_ID`) |
| **Search Console** | verified for www.r2bot.in via HTML file |
| **Local folder** | ~/Documents/Claude/Projects/r2bot |

> **Deploys are automatic.** A merge to `main` triggers a Vercel build and goes live in ~5 minutes.
> No `npx vercel --prod` step. Pages 404 until the build finishes.
> Supabase migrations are NOT automatic: Ravi runs each new file in `supabase/migrations/`
> in the Supabase SQL editor. Write migrations so the code degrades safely until then.

---

## 5. TECH STACK

```
Framework:   Next.js 15 (App Router) + React 19
Language:    TypeScript (strict — no `any`)
Styling:     Tailwind CSS v3 (utility-first)
Database:    Supabase (Postgres + Auth + Storage + Realtime)
AI:          Anthropic SDK — powers R2 Co-pilot + news/lens summaries (Claude Haiku)
3D:          Three.js + urdf-loader   IDE: Monaco   Terminal: xterm
Analytics:   Google Analytics 4 (gtag) via NEXT_PUBLIC_GA_ID
Email:       Resend (weekly digest + lead welcome)
Payments:    NONE. Everything is free (Nov 2026 decision). The razorpay dep and
             /api/payment routes are legacy; the endpoints return 410.
Deployment:  Vercel (deploy via CLI today)
Content:     MDX/JSON in /content + Supabase atlas table
```

---

## 6. THE PRODUCT — CORE SURFACES

Build these exceptionally; everything else is secondary.

- **Atlas** — the knowledge foundation. 1,000 entries by end 2026, 2,500 by end 2027. Each entry:
  one-sentence answer → plain explanation → how it works → real-world example → related → sources.
  SSG/ISR, SEO-first. Powers R2 Co-pilot via RAG. Min 4 new entries/week. **Best-on-the-internet bar,
  beginner-to-advanced in every entry.**
- **Quick Lessons** (`/shorts`) — THE top of the funnel. One page per one-minute YouTube Short:
  video, interactive demo, "with it / without it", one quiz question, then the email ask. 47 lessons
  in EN/ZH/HI/ES. Every new Short gets a lesson page, added to `lib/shorts.ts`.
  A lesson with a future `publishAt` (see `lib/shorts-scheduled.ts`) is reachable but noindex and left out
  of the sitemap, hubs, search, mini-courses and "next" links until that day; it switches on by itself
  (pages revalidate hourly). A Short that repeats an existing topic is attached to that lesson as an
  `extraVideos` entry instead of getting a second URL. Always go through `liveShorts()`, never `SHORTS`,
  for anything a visitor or crawler sees.
- **Course path** (`/courses`) — the five-course video journey, 50 lessons, 85%-watched gating,
  server-graded quizzes, final activity, certificate. 23 videos live; a course with none is
  noindex and shows a waitlist instead of ten "coming soon" rows.
- **Academy** (`/academy/<track>/<lesson>`) — the WRITTEN lessons: Spark 6, Wire 6, Forge 4, Edge 3.
  One system only. `/academy/c/*` (a second, JSON-driven Academy with three "Coming Soon"
  waitlists) was retired on 8 Nov 2026 and 308s to the tracks; see `content/academy/RETIRED.md`.
  Do not reintroduce a parallel lesson system.
- **R2 Co-pilot** — the AI mentor and clearest differentiator. Grounded in Atlas (RAG), never hallucinates.
  Free 10 msgs/day, Pro unlimited. Available everywhere (⌘K).
- **Robot Projects** — 10+ guided builds, full BOM, code (Monaco), simulator fallback.
- **Simulators (Visualizer)** — 9 interactive tools; visually stunning, shareable/embeddable.
- **Workspace IDE / ROS2 Playground** — serious-robotics showcases; lazy-load heavy libs.
  (3D Simulation is gone: webots.cloud refuses embedding, so `/simulate` 308s to `/visualizer`.)
- **News** — automated, global. Live RSS from top robotics sources + AI summaries. See §9 — moving to a
  stored, browsable archive so it's manageable and SEO-indexable.
- **Lens** — best robotics videos, auto-ingested from YouTube channel RSS + AI summaries, plus curated picks.
- **Daily Life** — approachable "robots around you." **Blog** — explainers and comparisons.
- **Lab** / **Project Showcase** — discussions and community builds. Both are EMPTY (0 posts,
  0 projects), so both are out of the main nav and Disallow'd until they have content. Do not
  put an empty surface in the nav.
- **Daily Challenge** — habit loop (streak on profile, no public leaderboard).
- **Find My Level** — visual placement test routing to a track.
- **Community Gallery / Career Paths / Dashboard + Certificates** — social proof, roadmaps, progress.

**Parked (code kept, hidden from nav + noindex until scale):** jobs, leaderboard, schools,
hardware index, history, standalone world-map (308s to Atlas), pulse (308s to /news),
lab, community gallery. `/kids` and `/kids/parents|activities` are indexable and parent-facing.
Nothing parked may be promoted from the homepage — it was advertising `/schools` behind a
"bring R2BOT to my school" CTA while robots.txt blocked the page.

---

## 7. NAVIGATION (max 5 top-level)

`Learn ▾  Reference ▾  Build ▾  Latest ▾  About ▾  [lang] [Sign In] [Start Free →] [Ask R2]`
- **Learn:** Quick Lessons · Free course path · Academy (4 tracks) · Find My Level · Daily Challenge
- **Reference:** Atlas · AI + Robotics · Robots · Robotics in Daily Life · R2 Co-pilot
- **Build:** Robot Projects · Simulators · ROS 2 Playground · Workspace IDE
- **Latest:** News · Lens · Blog
- **About:** About R2BOT · Written by Ravi · Career Paths · Robotics in India · For teachers

Rules: about four items per group, each listed ONCE (Atlas used to appear in two menus), no
language links in a menu (the header has a switcher), and nothing that leads to an empty page.
`/lab`, `/showcase` and the language links live in the footer.

---

## 8. MONETIZATION (global)

**Everything is free and there are no payments** (decided Nov 2026). `/pricing` says exactly that:
no card, no trial, no locked lesson. Co-pilot has a daily message cap; an account is needed only
to save progress and earn certificates.

The asset being built is the **audience**: the email list and the YouTube channel. The metric that
matters is engaged subscribers, not visitors. If monetisation returns later it will be sponsorship,
a paid cohort or hardware kits — not a gate on the current content. Do not add prices, plan tables
or "upgrade" copy, and do not write "free forever" either.

---

## 9. ACTIVE ROADMAP (the current phase — global + world-class)

Ordered. Each is a real project; do them completely.

### Phase A — Foundation (in progress)
1. **Content Manager (admin CMS)** — browser dashboard to create/edit Atlas entries, curate/edit
   news, manage Lens & blog, review leads. Unblocks running the platform at scale. Admin-gated.
2. **News archive** — persist each news fetch into a `news` table (dedup by URL); `/news` reads from
   the table (still auto-refreshed by cron), so news is browsable, searchable, SEO-indexable, editable.
3. **Go global** — strip India-exclusive framing (keep India as a strong region): copy, pricing/currency,
   broaden news/lens sources beyond India-weighting, global examples. Stripe for international.

### Phase B — World-class experience
4. **Design/UX polish** — elevate visual + interaction quality to a global bar. Consistent design
   system, motion, typography, empty states, mobile perfection, Lighthouse > 90.
5. **Retention system** — capture + return loops: page-engagement lead popup (email required, phone
   optional, after ~3 pages — DONE), weekly digest, streaks, "resume where you left off," return-visit nudges, optional
   web push. Grow the email list and bring people back.
6. **Best-in-class SEO pass** — JSON-LD on every template, internal-linking engine across Atlas,
   Core Web Vitals tuning, sitemap coverage, "explained/how it works" keyword ownership worldwide.

### Phase C — Depth
7. Atlas to 1,000 entries (beginner→advanced ladder each); Academy Spark complete; Co-pilot RAG on
   Atlas; Stripe; Hindi + Spanish for top-traffic entries; Lighthouse audit; Community submissions.

---

## 10. DATA & LEAD CAPTURE

- **One capture path.** Every form goes through `captureLead()` in `lib/lead-capture.ts`:
  `lead_events` → `leads` → `newsletter_subscribers` → a welcome email within seconds. There used
  to be a second endpoint (`/api/news/subscribe`) used by the homepage that wrote a row and sent
  nothing; it now delegates to the same function. NEVER add a third capture path.
- **Email only.** No phone number, ever. Every form carries a honeypot field; disposable domains
  are rejected; the capture is rate limited.
- **No time-triggered modals.** The onboarding dialog (800ms) and the lead popup (3 pages) are
  unmounted. Capture happens after someone has got something: a correct quiz answer, the end of a
  lesson, a waitlist for an unrecorded course.
- **Newsletter:** `newsletter_subscribers` → welcome (day 0, 2, 5), course nudges (day 2/5/10 of
  inactivity), certificate congratulations, and "R2BOT Weekly" on Friday. Per-stream send budgets
  in `lib/email-automation.ts`; the weekly digest resumes Sat–Mon so nobody is silently skipped.
  Resend free plan is ~100/day — raise it before the list passes ~90.
- **Privacy:** collect only what we use; RLS on all tables; never expose PII to non-admins; be
  GDPR-minded now that the audience is global (consent-friendly, EEA-aware).

---

## 11. CODING STANDARDS — NON-NEGOTIABLE

- TypeScript strict, no `any` (comment any unavoidable exception). Explicit prop types. Typed Supabase queries.
- Client components: `'use client'` + `Client.tsx` suffix. Server: no browser APIs.
  `lib/supabase/server.ts` server-only; `client.ts` client-only.
- Public content pages → SSG or `revalidate` ISR; no spinner-first pages; heavy libs dynamic-imported with skeletons.
- No full-screen loading overlay (`app/loading.tsx` is a 2px bar) and no motion wrapper in
  `app/template.tsx` — it put framer-motion in the first-load bundle of every route.
- No decoration behind body text. ParticleField and CursorTrail are deleted; do not reintroduce them.
- Tailwind utilities only (no inline style except runtime-dynamic). Amber-500 `#f59e0b` accent. Dark-first. Mobile-first.
- No new npm packages without flagging. No hardcoded secrets — env vars only.
  CI-only tools are the exception and stay OUT of `package.json`: the site-wide auditor is a
  pinned global install inside its workflow. Do not "tidy" it into dependencies (it would ship
  weight to no purpose) and do not delete it as unused (nothing imports it by design).
- Semantic commits (`feat:` `fix:` `content:` `perf:` `refactor:`). `npm run type-check` clean + build passes before done.

---

## 12. SEO — CRITICAL, MUST BE BEST-IN-CLASS (now global)

Every public page renders meaningful server HTML (ISR/SSG) with correct metadata + canonical to
`https://www.r2bot.in`, structured data (JSON-LD), and strong internal links. Target global intent:
"[concept] explained", "how does [concept] work", "ROS2 [topic]", "[component] for robotics". Submit a
comprehensive sitemap to Search Console; own the result for every robotics concept, beginner to expert.

**Non-negotiables learned the hard way (8 Nov 2026 audit):**
- `app/sitemap.ts` has `revalidate` and must never be allowed to freeze into the build. The live
  sitemap had been serving a July view of the site, missing ~300 pages including all 188 Quick
  Lesson URLs. Verify after any deploy: `curl -s https://www.r2bot.in/sitemap.xml | grep -c "<loc>"`.
- **Honest `lastmod`.** Dates come from the content or from `lib/content-dates.ts`. Update that
  file in the same commit as a page change. Never `new Date()` for a static page.
- **One page per query**, recorded in `lib/canonical-map.ts`: Atlas owns "what is X", Quick Lessons
  own "how does X work", `/robots/<slug>` owns a named robot, the blog owns "X vs Y". Anything else
  redirects or is differentiated and cross-linked.
- **Never advertise what you noindex.** A course or lesson with no video is both.
- **A named human author** on everything, from `lib/author.ts`. Not the organisation.
- A page with no inbound internal link is invisible. `getRelatedEntries` balances the link graph
  and rescues orphans; keep it that way if you touch it.
- **One table, one schema.** `atlas_entries` is written by two things — `scripts/seed-atlas.ts`
  fills the typed columns (`title`, `summary`, `body_md`, `last_reviewed_at`, `category`,
  `see_also`, `sources`, `tags`), the admin CMS fills `data` + `body`. `lib/atlas-db.ts` read only
  the second pair, so when the seeder filled 512 rows on 8 Nov every one looked empty to the
  reader and blanked a rich MDX file. The reader now reads BOTH (`rowToEntry`). If you add a field
  to either writer, add it to `rowToEntry` **in the same commit**, and never let a row that would
  render blank outrank a file — `hasContent()` enforces that. See
  `claude/r2bot-atlas-blank-pages-incident-2026-11-08.md`.

**Verifying ROS 2 facts:** docs.ros.org now sits behind Anubis bot protection — WebFetch gets
"Access Denied" and curl gets a JS challenge. The same content is readable at
`raw.githubusercontent.com/ros2/ros2_documentation/<distro>/source/...`; read it there and cite the
canonical docs.ros.org URL. docs.nav2.org currently 404s on every path and has no sitemap, so Nav2
claims have to be verified against the message/action definitions in the nav2_msgs source instead.

**Atlas entry template:** `# Name` → one-sentence answer → What it is → How it works → Where you'll
see it → Why it matters → Related (3–5 internal links) → Sources (2–3). Each entry spans the ladder
from a beginner's first question to advanced detail. Bar: better than the top result on the internet.

---

## 13. WHAT NOT TO DO

- Don't add nav items or revive parked features (kids/jobs/leaderboard/schools/hardware/standalone-map) without approval.
- Don't use "free forever" language. Don't leave TypeScript errors. Don't install packages without flagging.
- Don't hardcode API keys. Don't ship spinner-first pages. Don't build B2B UI before it's prioritized.
- Don't reintroduce India-exclusive framing as the platform's identity — India is a key region, the product is global.
- Don't write blog posts (Ravi's job). Don't add gamification beyond the Daily Challenge streak.

---

## 14. ENVIRONMENT VARIABLES

```
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
ANTHROPIC_API_KEY, OPENAI_API_KEY
NEXT_PUBLIC_SITE_URL = https://www.r2bot.in
NEXT_PUBLIC_GA_ID = G-MGD2GR40MY
RESEND_API_KEY, RESEND_FROM_EMAIL, CRON_SECRET       # weekly digest + crons
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID
STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_KEY            # international payments (to add)
```

Secrets live only in Vercel env + local `.env.local` (gitignored) — never committed.

---

## 15. WHEN YOU FINISH A TASK

1. `npm run type-check` — zero errors. 2. `npm run build` — passes (or flag). 3. Public pages render
real HTML — start the build and curl the routes you touched, do not assume. **Count the words,
don't eyeball the status code**: on 8 Nov an Atlas table change left all 512 entry pages serving an
empty body behind an HTTP 200 and a green build — 197 words live against 869 in the build, no error
anywhere. After any change touching a content reader, a table a page reads, or a merge precedence,
compare a known page's `<article>` word count live against `.next/server/app/.../<slug>.html`. 4. Mobile checked, tap
targets 44px+. 5. No prices and no "free forever" language. 6. New env vars documented. 7. Semantic
commit, pushed to `main` (Vercel deploys itself). 8. If you added a migration, say so plainly in the
hand-off: Ravi has to run it, and the code must work before he does.

---

## 16. AUTOMATED GUARDS (what runs, and what each one can't see)

Four workflows in `.github/workflows/`. Know which gap each one covers before trusting a green tick.

| Workflow | Checks | When |
|----------|--------|------|
| `quality.yml` | `type-check` + lint. No build — secrets live in Vercel. | every PR |
| `secret-scan.yml` | gitleaks over full history (`fetch-depth: 0`); also a pre-commit hook. | every PR |
| `live-checks.yml` | sitemap honesty (`scripts/check-sitemap.mjs`), dead links (lychee), **Atlas pages have real content** (`scripts/check-atlas-content.mjs`). | daily 06:37 UTC |
| `site-audit.yml` | full Lighthouse suite — performance, **accessibility**, **SEO**, best-practices — on one verified URL per template, mobile. Regression floors in `unlighthouse.config.js`. | weekly Mon 04:23 UTC |

**What a green tick does not mean.** Every one of these passed for hours on 8 Nov while all 512
Atlas pages served a blank page: the pages returned 200, sat in the sitemap, resolved their links
and carried correct canonicals. Checks that measure *existence* cannot see an empty page. That is
why `check-atlas-content.mjs` exists, and why any new content surface needs a check that it SAYS
something, not just that it responds.

**Never audit by crawling this site.** The first site-wide run discovered 1,756 routes and
requested them fast enough to trip our own rate limiting, which answered 403. It skipped `/shorts`,
every `/robots/*`, `/ros2` and most of the Atlas, finished with 34 alphabetically-early pages, and
reported healthy averages — real numbers from an accidental sample. `site-audit.yml` therefore
audits an explicit list of verified URLs, one per template, and asserts the count
(`summarise-audit.mjs --min`). Add a URL there when you add a page template, and keep `--min` in
step. A throttled scan that reports anyway is worse than no scan: it looks like evidence.

**On budgets.** `lighthouse-budget.json` is a ratchet set *above* measured reality (homepage script
488 KB against a 350 KB target, TBT 1,245 ms against 300 ms), with the real numbers in its
`_comment`. Never raise a budget to turn a build green — raise it only with a measurement and a
note, or fix the page. The site-wide audit's floors in `unlighthouse.config.js` were set the same way,
from a measured run, with the numbers written beside them. An honest 60 that holds is worth more
than a decorative 90 that gets switched off.

**Known gaps against §3, measured 8 Nov 2026.** Performance bottoms out at 66 (`/atlas/person/*`),
71 (`/daily-life`), 75 (`/robots/*`); accessibility sits at 85–89 everywhere. Every Atlas entry
template scores an identical 87, which points at one shared component rather than 512 separate
problems. Neither the Lighthouse > 90 nor the WCAG AA bar is met yet; the floors stop it getting
worse, they do not claim it is good.

---

*Supersedes the previous India-first brief. R2BOT is a global, world-class robotics platform.
Updated 8 Nov 2026 after a full product/SEO/retention audit — see
`claude/r2bot-360-audit-2026-11-08.md` in the claude.ai project for the findings this file now
encodes, and `claude/r2bot-atlas-blank-pages-incident-2026-11-08.md` for the blank-Atlas incident
behind §12's "one table, one schema" and §16's warning about green ticks. Update this file as the product evolves; a stale brief is worse than none.*
