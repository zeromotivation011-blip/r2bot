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

> Deploys are done via the Vercel CLI (`npx vercel --prod`) from the local repo. Pushing to GitHub
> does NOT auto-deploy yet — connecting the GitHub repo to Vercel for auto-deploy is a P1 improvement.

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
Payments:    Razorpay (India) + Stripe (international — to add)
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
- **Academy** — Spark → Wire → Forge → Edge. Spark course 1 free in full; rest is Pro. Progress in Supabase.
- **R2 Co-pilot** — the AI mentor and clearest differentiator. Grounded in Atlas (RAG), never hallucinates.
  Free 10 msgs/day, Pro unlimited. Available everywhere (⌘K).
- **Robot Projects** — 10+ guided builds, full BOM, code (Monaco), simulator fallback.
- **Simulators (Visualizer)** — 9 interactive tools; visually stunning, shareable/embeddable.
- **Workspace IDE / 3D Simulation / ROS2 Playground** — serious-robotics showcases; lazy-load heavy libs.
- **News** — automated, global. Live RSS from top robotics sources + AI summaries. See §9 — moving to a
  stored, browsable archive so it's manageable and SEO-indexable.
- **Lens** — best robotics videos, auto-ingested from YouTube channel RSS + AI summaries, plus curated picks.
- **Lab** — discussions. **Daily Life** — approachable "robots around you." **Blog** — long-form editorial.
- **Daily Challenge** — habit loop (streak on profile, no public leaderboard).
- **Find My Level** — visual placement test routing to a track.
- **Community Gallery / Career Paths / Dashboard + Certificates** — social proof, roadmaps, progress.

**Parked (code kept, hidden from nav + noindex until scale):** kids, jobs, leaderboard, schools,
hardware index, standalone world-map (absorbed into Atlas).

---

## 7. NAVIGATION (max 5 top-level)

`Learn ▾  Build ▾  Explore ▾  Community ▾  [Sign In] [Start Free →]`
- **Learn:** Academy · Atlas · Find My Level · R2 Co-pilot · Daily Challenge
- **Build:** Robot Projects · Simulators · Workspace IDE · 3D Simulation · ROS2 Playground
- **Explore:** Atlas · Lens · News · Robotics in Daily Life · Blog
- **Community:** Lab · Project Showcase · Career Paths · About

---

## 8. MONETIZATION (global)

- **Free (permanent):** Atlas (all), Academy Spark course 1, Co-pilot 10 msgs/day, Diagnostic,
  Simulators, Daily Challenge, News/Lens/Daily Life/Blog.
- **Pro:** full Academy, unlimited Co-pilot, project review, certificates, offline downloads.
  Price by region — India ₹799/mo·₹5,999/yr; international USD (~$9/mo·$69/yr) via Stripe.
- **B2B / Institution:** licenses for schools/universities/bootcamps (data model only for now).
- **Payments:** Razorpay (India) + Stripe (rest of world). Never use "free forever" language.

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

- **Leads:** site-wide dismissible popup captures email (required) + phone (optional), triggered once the
  visitor has viewed ~3 pages (engagement signal) or after a long single-page read. Stored in `leads`
  (migration 0031), auto-subscribed to the newsletter, admin-viewable at `/admin/leads` with CSV export.
- **Newsletter:** `newsletter_subscribers` (0021/0030) → weekly digest (Friday cron), one-click
  unsubscribe for registered users and anonymous subscribers.
- **Privacy:** collect only what we use; RLS on all tables; never expose PII to non-admins; be
  GDPR-minded now that the audience is global (consent-friendly, EEA-aware).

---

## 11. CODING STANDARDS — NON-NEGOTIABLE

- TypeScript strict, no `any` (comment any unavoidable exception). Explicit prop types. Typed Supabase queries.
- Client components: `'use client'` + `Client.tsx` suffix. Server: no browser APIs.
  `lib/supabase/server.ts` server-only; `client.ts` client-only.
- Public content pages → SSG or `revalidate` ISR; no spinner-first pages; heavy libs dynamic-imported with skeletons.
- Tailwind utilities only (no inline style except runtime-dynamic). Amber-500 `#f59e0b` accent. Dark-first. Mobile-first.
- No new npm packages without flagging. No hardcoded secrets — env vars only.
- Semantic commits (`feat:` `fix:` `content:` `perf:` `refactor:`). `npm run type-check` clean + build passes before done.

---

## 12. SEO — CRITICAL, MUST BE BEST-IN-CLASS (now global)

Every public page renders meaningful server HTML (ISR/SSG) with correct metadata + canonical to
`https://www.r2bot.in`, structured data (JSON-LD), and strong internal links. Target global intent:
"[concept] explained", "how does [concept] work", "ROS2 [topic]", "[component] for robotics". Submit a
comprehensive sitemap to Search Console; own the result for every robotics concept, beginner to expert.

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
real HTML (verify with curl if SSR). 4. Mobile checked, tap targets 44px+. 5. No "free forever" language.
6. New env vars documented. 7. Semantic commit. 8. If it needs deploying, note a `npx vercel --prod` is required.

---

*Supersedes the previous India-first brief. R2BOT is a global, world-class robotics platform.
Update this file as the product evolves.*
