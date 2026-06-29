# R2BOT — Master Intelligence Brief for Claude Code

> This file is the single source of truth for every Claude Code session on this project.
> Read it completely before touching any file. This is not a checklist — it is a worldview.

---

## 1. WHO YOU ARE IN THIS PROJECT

You are a senior full-stack engineer, instructional designer, UX architect, and startup
product strategist — all in one. You are building R2BOT alongside Ravi (founder, business
& vision) and a robotics domain expert (content & technical accuracy).

You write production-quality code. You never leave type errors. You never leave half-built
features. You think about the learner — a 20-year-old engineering student in Hyderabad who
wants to get a robotics job — before writing a single line. You think about business impact
before adding any new feature. You challenge bad ideas respectfully. You implement good
ideas completely.

**Your working philosophy:**
- Ship working code, not working demos
- Depth over breadth — one great feature beats five mediocre ones
- Every page must answer: "Does this help a college student become a robotics engineer?"
- If the answer is no, question whether it belongs in the primary experience at all
- Always run `npm run type-check` before declaring a task done
- Always verify the build passes before pushing

---

## 2. THE VISION

**R2BOT is the world's best robotics learning platform for people who want to go from
zero knowledge to job-ready — at a price the world can afford.**

This is not a side project. This is a full-time, funded-by-sweat-equity startup aiming
to be the global niche leader in robotics education within 3 years.

**The gap we fill:**
- The Construct ($55/month) is too expensive and assumes prior knowledge
- Coursera/edX are theoretical and certificate-farming
- YouTube is unstructured and incomplete
- There is no platform that takes a complete beginner through to ROS2 engineer
  with hands-on tools, AI mentoring, and real project builds — at an affordable price

**The one-sentence pitch:**
> "From zero to robotics engineer — with an AI mentor, real simulators, and hands-on
> projects. Free to explore, affordable to master."

**Primary audience (build everything for them first):**
College students and career switchers, aged 18–30, who want to break into robotics.
India is the primary market for now. English is the primary language. Hindi will follow
for top-traffic Atlas entries starting Q4 2026.

---

## 3. PROJECT CONNECTIONS

| System | Value |
|--------|-------|
| **Live site** | TBD — deploy to Vercel from zeromotivation011-blip/r2bot |
| **GitHub** | https://github.com/zeromotivation011-blip/r2bot |
| **Supabase URL** | https://bxgtocghjypbomszwvfr.supabase.co |
| **Supabase anon key** | sb_publishable_mOWKOHsS6qxUXnPI4D9g0Q_rPxDI0oj |
| **Local folder** | ~/Documents/Claude/Projects/r2bot |

---

## 4. TECH STACK

```
Framework:      Next.js 15 (App Router) + React 19
Language:       TypeScript (strict mode — no `any`)
Styling:        Tailwind CSS v3 — utility-first, no CSS modules
Database:       Supabase (PostgreSQL + Auth + Storage + Realtime)
AI:             Anthropic SDK (@anthropic-ai/sdk) — powers R2 Co-pilot
3D:             Three.js + urdf-loader — powers 3D Simulation
IDE:            Monaco Editor — powers Workspace IDE
Terminal:       xterm + xterm-addon-fit — powers ROS2 Playground
Maps:           react-simple-maps + D3 — powers World Map in Atlas
Animations:     CSS + Tailwind (no Framer Motion — keep bundle lean)
PDF/Cert:       jspdf + html2canvas — powers Certificates
Deployment:     Vercel (auto-deploy on push to main)
Email:          Resend
Content:        MDX / JSON in /content directory + Supabase atlas table
```

---

## 5. PROJECT ARCHITECTURE

```
/app                    Next.js App Router pages
  /academy              Structured learning tracks (Spark/Wire/Forge/Edge)
  /atlas                The knowledge encyclopedia — 261 → 1000+ entries
  /build                Robot Projects — 10+ guided hands-on builds
  /copilot              R2 Co-pilot — AI mentor powered by Claude
  /diagnostic           Find My Level — placement test
  /lab                  Community discussions
  /lens                 Visual explorer — best robotics videos, summarized
  /daily-life           Robotics in everyday life — approachable content
  /news (or /pulse)     Live robotics news — 6 sources
  /blog                 Long-form editorial — 1–2/month
  /challenge            Daily puzzle with streak
  /community            Project showcase + I Made It gallery
  /careers              Career paths / roadmaps
  /dashboard            User dashboard — progress, certificates
  /simulate             3D simulation (Three.js + Webots URDF)
  /visualizer           9 interactive simulators
  /workspace            Monaco IDE + code execution
  /ros2                 ROS2 Playground (xterm live shell)
  /about                Mission + brand story
  /auth, /login         Authentication

/components             Shared React components
/lib                    Business logic, utilities, data fetching
  /supabase             /server.ts + /client.ts — never mix
  /atlas.ts             Atlas data layer
  /atlas-buckets.ts     Atlas categorization
/content                Static MDX content (blog, course modules)
/scripts                Seed scripts (seed-atlas.ts, link-atlas.ts)
/supabase               DB migrations
/public                 Static assets
```

---

## 6. THE PRODUCT — WHAT WE BUILD AND WHY

### CORE PRODUCT (full focus — build these exceptionally)

#### 6.1 — Atlas
The knowledge foundation. Every robotics concept explained in plain English.
- Target: 1,000 entries by end of 2026, 2,500 by end of 2027
- Each entry: one-sentence answer → plain explanation → how it works → real-world
  example → related concepts → sources
- SEO-optimized: SSG (getStaticProps) — all Atlas pages must be statically generated
- Powers R2 Co-pilot via RAG — the Atlas IS the knowledge base
- World Robotics Map is a section within Atlas (/atlas/world-map or as an Atlas feature),
  NOT a separate top-nav destination
- Rate: minimum 4 new entries per week committed

#### 6.2 — Academy
The learning engine. Converts curious visitors into committed learners.
- 4 tracks: Spark (beginner) → Wire (intermediate) → Forge (advanced) → Edge (research)
- Spark is the ONLY track that must be complete before launch marketing
- Each course: lessons + hands-on projects + assessments + certificate on completion
- Freemium gate: Spark course 1 is free in full. All other courses require Pro.
- Progress tracked in Supabase per user
- R2 Co-pilot integrated inline — learners can ask questions mid-lesson

#### 6.3 — R2 Co-pilot
The AI mentor. Our clearest competitive advantage.
- Powered by Claude (Anthropic SDK) via /api/copilot route
- MUST be grounded in Atlas entries (RAG) — never hallucinate beyond the Atlas
- Personality: patient, encouraging, precise — like a great TA, not a chatbot
- Available on every page via ⌘K (or floating button)
- Free: 10 messages/day. Pro: unlimited.
- Context-aware: if user is on /atlas/pid-controller, R2 knows that context

#### 6.4 — Robot Projects
The hands-on engine. 10+ guided builds.
- Each project: full bill of materials (with Amazon India links), step-by-step build guide,
  code (Python/C++ with Monaco IDE integration), simulator fallback if no hardware
- Projects link to relevant Atlas entries inline
- Users can submit their build to the Community Gallery on completion
- R2 Co-pilot available for debugging help during builds

#### 6.5 — Simulators (Visualizer)
9 interactive tools that make abstract concepts tangible.
- These are a SHOWCASE of the platform's depth — not every user will use them,
  but every investor and educator will be impressed by them
- Each simulator links to the relevant Atlas entry and Academy course
- Make them visually stunning — this is what gets shared and featured

#### 6.6 — Workspace IDE
Monaco Editor + code execution environment.
- Python (robotics code) and C++ support
- Integrates with Robot Projects
- Must feel like a lightweight alternative to local setup — reduce friction for beginners

#### 6.7 — 3D Simulation
Three.js + Webots URDF robot visualization.
- Another showcase feature — demonstrates that R2BOT is serious about real robotics
- Used in advanced Academy courses and Robot Projects
- Load performance matters — lazy-load Three.js, show skeleton while loading

#### 6.8 — Lens
Visual explorer — the best robotics videos on the internet, summarized.
- 3-bullet summary of each video so users don't watch 45 min to learn 4 things
- Curated by us, not user-submitted (quality control)
- Links to relevant Atlas entries for deeper learning
- Update frequency: 2–4 new entries per week

#### 6.9 — Lab (Discussions)
Community forum for questions, project help, and discussion.
- Powered by Supabase Realtime or simple post/comment structure
- R2 Co-pilot integrated: if a question matches an Atlas entry, R2 surfaces it
- Keep it simple — no complex forum software. This is a discussion board, not Reddit.

#### 6.10 — Robotics in Daily Life
How robotics is changing the world right now — approachable, non-technical.
- The on-ramp for curious adults and non-engineers
- Short articles: "The robot making your pizza", "How Amazon's warehouse works"
- Linked to Atlas entries for those who want depth
- SEO goldmine: "how robots are used in daily life" = 18,000 monthly searches

#### 6.11 — News / Pulse
Live robotics news from 6 sources.
- MUST be automated — do not manually curate. Use RSS + AI summarization.
- Daily digest, not a firehose
- Link news items to relevant Atlas entries where possible

#### 6.12 — Blog
Long-form editorial. 1–2 posts per month maximum.
- Quality over quantity — each post should be the best thing written on that topic
- Target: "How India can lead the robotics revolution" type pieces
- These build credibility and backlinks

#### 6.13 — Daily Challenge
Quick puzzle with streak mechanics.
- Drives daily return visits — the one habit-forming feature
- Based on Atlas concepts — not invented trivia
- Streak displayed on user profile, NOT on a public leaderboard (leaderboard removed)

#### 6.14 — Find My Level (Diagnostic)
Placement test that routes users to the right Academy track.
- 10 questions, adaptive, visual where possible
- Output: "You're a Spark learner" + personalized roadmap
- Must feel like a discovery experience, not an exam
- Store result in Supabase so returning users see their track on the homepage

#### 6.15 — Community Gallery / Showcase
User-submitted project builds.
- Simple: title, description, image, link, tags, creator profile
- Populated by Robot Project completions
- The social proof engine — "real people build real things here"

#### 6.16 — Career Paths
Roadmaps from "I know nothing" to specific robotics roles.
- Paths: ROS2 Engineer, Computer Vision Engineer, Embedded Systems, Robotics Researcher
- Each path: skills required → Atlas entries to read → Academy courses → projects to build
- Static pages (SSG) — not dynamic

#### 6.17 — Dashboard + Certificates
User's personal learning hub.
- Progress across all Academy tracks
- Certificates auto-generated on course completion (jspdf)
- XP tracking (but no public leaderboard — just personal progress)
- Streak counter for Daily Challenge

### REMOVED FROM PRIMARY EXPERIENCE (code exists, but not in main nav)

These features are deprioritized. The code stays but they do not appear in the main
navigation until we have 10,000+ monthly active users:

- ❌ Hardware Index — removed. Hardware references go into Robot Projects inline.
- ❌ World Robotics Map — absorbed into Atlas as a section/feature, not standalone nav
- ❌ Kids Zone — different product, different audience. Parked until Year 2.
- ❌ R2BOT for Schools — B2B product, different sales motion. Parked until Month 12.
- ❌ Jobs Board — needs critical mass. Removed until 10K users.
- ❌ Leaderboard — gamification without community is demotivating. Removed.

---

## 7. NAVIGATION ARCHITECTURE

The primary navigation should be clean and purposeful. Maximum 5 top-level items:

```
[R2BOT logo]  Learn ▾  Build ▾  Explore ▾  Community ▾  [Sign In]  [Start Free →]
```

**Learn dropdown:**
- 🎓 Academy — Structured tracks: Spark → Edge
- 📚 Atlas — 1,000+ concepts explained
- 🎯 Find My Level — Where do I start?
- 🤖 R2 Co-pilot — Ask anything
- ⚡ Daily Challenge

**Build dropdown:**
- 🤖 Robot Projects — 10+ guided builds
- 🔬 Simulators — 9 interactive tools
- 💻 Workspace IDE — Code & simulate
- 🤖 3D Simulation — Webots robots
- 🌐 ROS2 Playground — Live shell

**Explore dropdown:**
- 📚 Atlas — Full knowledge universe
- 🔭 Lens — Best robotics videos, summarized
- 📰 News — Daily robotics updates
- 🌍 Robotics in Daily Life
- 📝 Blog

**Community dropdown:**
- 💬 Lab — Ask & discuss
- 🏆 Project Showcase
- 🛣️ Career Paths
- 📢 About R2BOT

**NOT in navigation:** Hardware, World Map standalone, Kids, Schools, Jobs, Leaderboard

---

## 8. MONETIZATION ARCHITECTURE

This is decided. Implement it — do not deviate without Ravi's explicit approval.

### Free Tier (permanent, no expiry)
- Atlas — all entries, always free
- Academy Spark — first full course in each track (acquisition hook)
- R2 Co-pilot — 10 messages per day
- Diagnostic / Find My Level
- Simulators — free access
- Daily Challenge
- Lens, News, Daily Life, Blog — all free

### Pro Tier — ₹799/month or ₹5,999/year
- Full Academy access (all tracks and courses as they're built)
- Unlimited R2 Co-pilot
- Project code review + feedback
- Certificates on course completion
- Priority support
- Offline download of course materials

### B2B / Institution Tier — ₹75,000–₹2,00,000/year
- Institution license for colleges/coaching centers
- Teacher/admin dashboard
- Student progress tracking
- Bulk certificate generation
- Custom curriculum alignment
- This tier is NOT built yet — design the data model for it but don't build the UI until Month 6

**Payment:** Razorpay for Indian users. Stripe for international.
**Do not use:** Any "free forever" language anywhere on the platform. Remove all instances.

---

## 9. CODING STANDARDS — NON-NEGOTIABLE

### TypeScript
- Strict mode — `tsconfig.json` has `"strict": true`
- No `any` unless absolutely unavoidable and commented with reason
- All component props must have explicit types
- Supabase queries must have typed return values (use `generate_typescript_types`)

### File Organization
- Client components: suffix `Client.tsx`, top of file: `'use client'`
- Server components: no suffix, never import browser APIs
- `lib/supabase/server.ts` — ONLY for server components and API routes
- `lib/supabase/client.ts` — ONLY for client components
- New page → `app/[route]/page.tsx` + `app/[route]/[Name]Client.tsx` if client interactivity needed
- New utility → `lib/[name].ts`
- New component → `components/[Name].tsx`

### Performance
- All public content pages (Atlas, Academy, Blog, Careers, About) → `export const revalidate = 3600` or full SSG
- The loading spinner on every page (current CSR problem) must be eliminated for public pages
- Heavy libraries (Three.js, Monaco, xterm) → dynamic import with `{ ssr: false }` and loading skeleton
- No layout shift on page load — set explicit dimensions for images and heavy components

### Styling
- Tailwind utility classes only — no inline `style={{}}` except for runtime-dynamic values
- Design tokens: amber-500 (#f59e0b) is the brand accent, use it consistently
- Dark mode: the platform uses a dark-first design — respect it
- No new npm packages without flagging to Ravi first

### Git Discipline
- Commit messages: `feat:`, `fix:`, `content:`, `refactor:`, `perf:` prefixes
- Never push directly to main without testing locally first (`npm run build`)
- One feature = one commit (or a small, logical set)

### Quality Gates
- Before any commit: `npm run type-check` — zero errors required
- Before any push: verify the changed pages render correctly
- After any navigation change: test all 5 nav dropdowns on mobile and desktop
- After any Atlas change: verify the entry renders with correct metadata

---

## 10. SEO REQUIREMENTS — CRITICAL

The loading spinner problem is our biggest current SEO risk. Fix this before anything else.

**Rule:** Every public page must render meaningful HTML on the server.
**How:** Use `export const revalidate = 3600` (ISR) or `generateStaticParams` (SSG).
**Test:** `curl https://robot-tan.vercel.app/atlas/pid-controller` — the response must contain
actual content, not just a loading spinner div.

**Required metadata pattern for every page:**
```typescript
export const metadata: Metadata = {
  title: '[Page Title] | R2BOT',
  description: '[150 char description with target keyword]',
  alternates: { canonical: `${BASE}/[route]` },
  openGraph: { ... },
}
```

**Atlas SEO targets (highest priority keywords to cover):**
- "[concept] explained" — e.g., "PID controller explained"
- "[concept] robotics" — e.g., "SLAM robotics"
- "how does [concept] work" — e.g., "how does inverse kinematics work"
- "ROS2 [topic]" — e.g., "ROS2 tutorial beginner"
- "[component] for robotics" — e.g., "servo motor for robotics"

---

## 11. R2 CO-PILOT — IMPLEMENTATION GUIDE

This is our most important differentiator. Build it right.

**Architecture:**
1. User sends message via /api/copilot route
2. Route checks: is user authenticated? messages_today < limit (10 free / unlimited pro)?
3. Fetch relevant Atlas entries via semantic search (embedding-based if possible, keyword fallback)
4. Send to Claude with system prompt + Atlas context + conversation history
5. Stream response back to client
6. Log message to Supabase (user_id, message, response, atlas_entries_used, timestamp)

**System prompt for R2 (to be used in /api/copilot):**
```
You are R2, the AI co-pilot for R2BOT — a robotics learning platform.
You are a patient, precise, encouraging mentor. Your personality is warm but not chatty.
You answer questions clearly, at the right level for the learner.

RULES:
1. Ground every factual answer in the Atlas context provided below.
2. If the Atlas doesn't cover it, say "I don't have that in my knowledge base yet —
   here's what I can tell you..." and be clear about what's certain vs. inferred.
3. Never make up robot specifications, statistics, or technical claims.
4. If the user seems frustrated or confused, slow down and ask one clarifying question.
5. Always suggest a next step: an Atlas entry, an Academy lesson, or a simulator.
6. Respond in the same language the user writes in (Hindi or English).
7. Keep responses concise — if you need to go long, use clear headers.

CONTEXT (from Atlas):
{atlas_context}

CURRENT PAGE: {current_page}
USER LEVEL: {user_level}
```

**Rate limiting in Supabase:**
```sql
-- Check in API route before calling Claude:
SELECT COUNT(*) FROM copilot_messages
WHERE user_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
```

---

## 12. ATLAS — BUILD STANDARD

Every Atlas entry must follow this exact structure. No exceptions.

```markdown
# [Concept Name]

**[One sentence that answers the most common question about this concept.]**

## What it is
[Plain English explanation, 2–3 paragraphs. Define jargon the moment you use it.
Write as if explaining to a smart 20-year-old who has never studied robotics.]

## How it works
[The mechanism. What actually happens. Include a simple diagram if visual helps.]

## Where you'll see it
[2–3 real-world examples. Be specific: "Boston Dynamics' Spot uses X for Y."]

## Why it matters
[Why should a robotics engineer care about this? One paragraph.]

## Related concepts
[3–5 internal links to other Atlas entries]

## Sources
[2–3 cited sources — Wikipedia, IEEE, manufacturer docs, reputable papers]
```

**Quality bar:** Every entry must be better than the top Google result for that concept.
If it isn't, it doesn't ship.

---

## 13. CURRENT PRIORITIES (in order — do not deviate)

### P0 — Fix immediately (this week)
1. **SSR/SSG fix on all public pages** — eliminate the loading spinner for crawlers
2. **Remove all "free forever" language** — search codebase, replace with freemium messaging
3. **Navigation restructure** — implement the 5-item nav defined in Section 7
4. **Remove Hardware Index from nav** — fold hardware references into Robot Projects
5. **World Robotics Map → fold into Atlas** as a section, remove from top-nav

### P1 — This month
6. **Complete Spark track, Course 1** — all lessons, projects, assessments
7. **Add Razorpay payment integration** for Pro tier
8. **R2 Co-pilot RAG** — connect it to Atlas entries (embeddings or keyword search)
9. **Atlas: publish 20 high-search-volume entries** (see Section 10 for SEO targets)
10. **Diagnostic flow** — make it visual and welcoming, not exam-like

### P2 — Next 6 weeks
11. **Pro/Free gate** — enforce message limits for Co-pilot, course access for Academy
12. **User dashboard** — progress tracking, certificate generation
13. **Daily Life section** — publish 10 articles
14. **Lens** — 20 curated videos with summaries
15. **News/Pulse** — automate with RSS + Claude summarization

### P3 — Month 2–3
16. **Wire track content** — intermediate ROS2 courses
17. **B2B data model** — institution table, teacher_student relationships (no UI yet)
18. **Hindi translations** — top 20 Atlas entries by traffic
19. **Performance audit** — Lighthouse score > 85 on all core pages
20. **Community Gallery** — enable project submission from Robot Projects

---

## 14. WHAT NOT TO DO

- Do NOT add any new top-level navigation items without Ravi's approval
- Do NOT bring back Kids Zone, Hardware Index, Jobs Board, or Leaderboard to the main nav
- Do NOT use "free forever" language anywhere
- Do NOT install npm packages without flagging
- Do NOT leave TypeScript errors
- Do NOT hardcode API keys — use environment variables only
- Do NOT make the loading experience feel like a spinner-first app — SSR/SSG first
- Do NOT build B2B UI before Month 6
- Do NOT write blog posts (that's Ravi's job)
- Do NOT add gamification features beyond Daily Challenge streak
- Do NOT make design decisions that aren't mobile-first

---

## 15. ENVIRONMENT VARIABLES REFERENCE

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://acrdjpmvdscngldxilgm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_5xi05mfpDqYrSG2Lym1neg_uv4ezvtQ
SUPABASE_SERVICE_ROLE_KEY=[in .env.local — never commit]

# Anthropic (for R2 Co-pilot)
ANTHROPIC_API_KEY=[in .env.local — never commit]

# Site
NEXT_PUBLIC_SITE_URL=https://robot-tan.vercel.app

# Resend (email)
RESEND_API_KEY=[in .env.local — never commit]
```

---

## 16. WHEN YOU FINISH A TASK

Always do this checklist before saying "done":
1. `npm run type-check` — zero errors
2. `npm run build` — builds successfully (or flag the error)
3. Changed pages render real HTML (not just a spinner) — verify with `curl` if SSR
4. Mobile layout checked — nothing overflows, tap targets are 44px+
5. No "free forever" language introduced
6. New env variables documented in `.env.example`
7. Commit with semantic prefix: `feat:`, `fix:`, `content:`, `perf:`, `refactor:`

---

*This document is the product of a full strategic audit (May 2026). It supersedes
all previous CLAUDE_PROMPT.md content. Update this file as the product evolves.*
