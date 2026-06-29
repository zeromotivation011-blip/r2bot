# R2BOT

**ROBOT, decoded.**

The world's most accessible robotics platform — every robot, every breakthrough, every concept explained in plain English.

🌐 GitHub: [github.com/zeromotivation011-blip/r2bot](https://github.com/zeromotivation011-blip/r2bot)

---

## What's in this repo (v0.9)

| Path | What it is |
|------|------------|
| `app/page.tsx` | The homepage |
| `app/atlas/[type]/[slug]/page.tsx` | Atlas entry template — used by every encyclopedia page, statically generated, schema.org markup |
| `app/pulse/[slug]/page.tsx`, `app/lens/[slug]/page.tsx` | Pulse + Lens detail pages |
| `app/diagnostic/page.tsx` | The 4-minute diagnostic test |
| `app/login/page.tsx`, `app/signup/page.tsx` | Magic-link auth pages (Supabase) |
| `app/dashboard/page.tsx` | Logged-in dashboard — profile + diagnostic placement |
| `app/auth/callback/route.ts` | Exchanges the magic-link code for a session |
| `app/auth/sign-out/route.ts` | POST endpoint to clear the session |
| `app/api/copilot/route.ts` | R2 Co-pilot API — RAG over Atlas via OpenAI embeddings + Claude streaming |
| `middleware.ts` | Refreshes the Supabase session cookie on every request |
| `lib/supabase/client.ts` | Browser Supabase client (for Client Components) |
| `lib/supabase/server.ts` | Server + admin Supabase clients |
| `lib/supabase/middleware.ts` | Session-refresh helper used by `middleware.ts` |
| `lib/atlas.ts`, `lib/pulse.ts`, `lib/lens.ts` | MDX loaders with safe date coercion |
| `content/atlas/`, `content/pulse/`, `content/lens/` | Canonical MDX source for every content type |
| `scripts/seed-atlas.ts` | One-shot script: pushes every Atlas MDX into Supabase + generates embeddings |
| `supabase/migrations/0001_initial_schema.sql` | Full database schema (10 tables + pgvector + RLS + RPC) |
| `components/AuthForm.tsx` | Magic-link form shared by `/login` and `/signup` |
| `components/Nav.tsx` | Top nav — swaps "Sign in / Get started" for "Dashboard" when logged in |
| `docs/R2BOT-Strategic-Blueprint.docx` | Founder's strategy document |
| `design/r2bot-logo-concepts.svg` | Four logo concepts |

## Atlas entries shipped in v0.3

| Type | Title | URL |
|------|-------|-----|
| Concept | What is a robot? | `/atlas/concept/robot` |
| Concept | SLAM | `/atlas/concept/slam` |
| Concept | Lidar | `/atlas/concept/lidar` |
| Concept | PWM | `/atlas/concept/pwm` |
| Concept | Servo motor | `/atlas/concept/servo-motor` |
| Company | Boston Dynamics | `/atlas/company/boston-dynamics` |
| Company | ISRO | `/atlas/company/isro` |
| Robot | Optimus (Tesla) | `/atlas/robot/optimus` |
| Robot | Atlas (Boston Dynamics) | `/atlas/robot/atlas` |
| Person | Marc Raibert | `/atlas/person/marc-raibert` |

## Tech stack

- **Framework**: Next.js 15 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS + custom CSS
- **AI**: Claude Sonnet 4.5 (`@anthropic-ai/sdk`) — Node runtime, streaming
- **Embeddings + RAG**: OpenAI `text-embedding-3-small` (1536-dim) → Supabase pgvector → `match_atlas_entries()` RPC
- **Content**: MDX with `gray-matter` + `react-markdown` + `remark-gfm`
- **Database + Auth**: Supabase (Postgres + Auth + pgvector + RLS)
- **Hosting**: Vercel (auto-deploy on push to `main`)
- **SEO**: sitemap, robots.txt, schema.org JSON-LD, Open Graph

## Local development

```bash
npm install
cp .env.example .env.local       # fill in keys (see below)
npm run dev                       # http://localhost:3000
```

Required env vars in `.env.local`:

| Key | Why |
|-----|-----|
| `ANTHROPIC_API_KEY` | R2 Co-pilot's brain |
| `NEXT_PUBLIC_SUPABASE_URL` | Database + auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Database + auth (safe to expose) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only; bypasses RLS for seed + logging |
| `OPENAI_API_KEY` | Embeddings for RAG. Without it the Co-pilot still works, but can't ground in the Atlas. |

The same vars must also be set in **Vercel → Project → Settings → Environment Variables** for production.

## Setting up Supabase

The schema lives in `supabase/migrations/0001_initial_schema.sql`. To apply it:

1. Open https://supabase.com/dashboard → your project
2. Left sidebar → **SQL Editor** → **+ New query**
3. Copy the entire migration file → paste → **Run**
4. Verify in **Table Editor**: 9 tables should exist (`profiles`, `atlas_entries`, `pulse_articles`, `lens_videos`, `courses`, `lessons`, `user_progress`, `copilot_conversations`, `atlas_gaps`)

Then seed the Atlas:

```bash
npm run seed:atlas
```

This reads every MDX in `content/atlas/`, upserts it into `atlas_entries`, and (if `OPENAI_API_KEY` is set) generates an embedding per entry. Re-run after editing any MDX.

## Adding a new Atlas entry

1. Pick a type: `concept`, `robot`, `company`, `person`, or `paper`
2. Create `content/atlas/<type>/<slug>.mdx`
3. Add frontmatter (see existing entries for schema)
4. Write the body in markdown — first sentence is the answer
5. `git push` — Vercel rebuilds, the entry is live with sitemap + schema.org

## The name

`R2BOT` reads as **ROBOT** when you see the "2" as a "0." Tilt the "2" and you also see infinity (**∞**). One glyph. Three meanings.

## Brand quick reference

| Token | Value |
|-------|-------|
| Void Black | `#050810` |
| Steel Ink | `#0B2540` |
| R2 Cyan | `#00B8D4` → `#00E5FF` |
| Plasma Purple | `#A56BFF` |
| Signal Amber | `#FFB020` |
| Display font | Space Grotesk |
| Body font | Inter |
| Mono | JetBrains Mono |

## Status

- [x] Brand identity (Möbius 2 logo, "ROBOT, decoded." tagline)
- [x] Strategic blueprint
- [x] v0.1 — static prototype HTML
- [x] v0.2 — Next.js + Claude-powered R2 Co-pilot
- [x] v0.3 — Atlas template + 10 entries + Supabase schema
- [x] v0.4–v0.7 — Pulse, Lens, diagnostic, navigation, content polish
- [x] v0.8 — Launch-readiness polish (27 Atlas, 5 Pulse, 5 Lens)
- [x] **v0.9 — Supabase wiring + magic-link auth + RAG on Co-pilot — current**
- [ ] Domain registered (`r2bot.com` or `r2bot.in`)
- [ ] v1.0 — Public soft launch (more content + courses + custom domain)

## License

Proprietary — © 2026 Ravi Bohra. All rights reserved.
