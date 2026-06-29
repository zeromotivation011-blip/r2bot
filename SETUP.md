# R2BOT — Setup & Deployment Guide

This file captures every step needed to go from code to live site.

---

## Step 1 — Push to GitHub

The code lives in `~/Documents/Claude/Projects/r2bot`. Run these commands in Terminal:

```bash
cd ~/Documents/Claude/Projects/r2bot

git init
git config user.email "ravi6703@gmail.com"
git config user.name "Ravi Bohra"
git branch -m main
git add -A
git commit -m "feat: initial R2BOT v0.9 — robotics platform"

# You'll need a GitHub Personal Access Token with 'repo' scope
# Create one at: https://github.com/settings/tokens/new
# Select: repo (full control)
git remote add origin https://github.com/zeromotivation011-blip/r2bot.git
git push -u origin main
# When prompted: username = zeromotivation011-blip, password = your PAT token
```

---

## Step 2 — Apply Supabase Schema

1. Go to: https://supabase.com/dashboard/project/bxgtocghjypbomszwvfr/sql/new
2. Open: `supabase/migrations/0001_initial_schema.sql` from this repo
3. Paste the entire file content into the SQL editor
4. Click **Run**
5. Verify in Table Editor: should see 10 tables (profiles, atlas_entries, pulse_articles, lens_videos, courses, lessons, user_progress, copilot_conversations, atlas_gaps, + check RPC match_atlas_entries exists)

---

## Step 3 — Get Your Supabase Service Role Key

1. Go to: https://supabase.com/dashboard/project/bxgtocghjypbomszwvfr/settings/api
2. Copy the **service_role** key (under "Project API keys")
3. Keep it secret — never commit to git

---

## Step 4 — Deploy to Vercel

1. Go to https://vercel.com/new
2. Click **Import Git Repository** → connect GitHub → select `zeromotivation011-blip/r2bot`
3. Framework preset: **Next.js** (auto-detected)
4. Add these Environment Variables (Settings → Environment Variables):

```
ANTHROPIC_API_KEY          = sk-ant-api03-...      (your Claude API key)
OPENAI_API_KEY             = sk-proj-...           (your OpenAI key)
NEXT_PUBLIC_SUPABASE_URL   = https://bxgtocghjypbomszwvfr.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = sb_publishable_mOWKOHsS6qxUXnPI4D9g0Q_rPxDI0oj
SUPABASE_SERVICE_ROLE_KEY  = <from Step 3>
RESEND_API_KEY             = re_...                (your Resend key)
RAZORPAY_KEY_ID            = rzp_...               (your Razorpay key ID)
RAZORPAY_KEY_SECRET        = ...                   (your Razorpay secret)
NEXT_PUBLIC_RAZORPAY_KEY_ID = rzp_...              (same as KEY_ID — safe to expose)
```

5. Click **Deploy**

---

## Step 5 — Seed the Atlas (after Vercel deploy)

Once env vars are set and Supabase schema is applied, seed Atlas entries + embeddings:

```bash
cd ~/Documents/Claude/Projects/r2bot
npm install
cp .env.example .env.local
# Edit .env.local to fill in all real keys
npm run seed:atlas
```

This pushes all MDX files from `content/atlas/` into the `atlas_entries` table and generates OpenAI embeddings for RAG.

---

## Local Development

```bash
cd ~/Documents/Claude/Projects/r2bot
npm install
cp .env.example .env.local
# Fill in .env.local with real keys
npm run dev
# → http://localhost:3000
```

---

## Project Connections

| System | Value |
|--------|-------|
| **GitHub** | https://github.com/zeromotivation011-blip/r2bot |
| **Supabase dashboard** | https://supabase.com/dashboard/project/bxgtocghjypbomszwvfr |
| **Supabase URL** | https://bxgtocghjypbomszwvfr.supabase.co |
| **Supabase anon key** | sb_publishable_mOWKOHsS6qxUXnPI4D9g0Q_rPxDI0oj |
| **Vercel** | Connect after GitHub push |

---

## What's in v0.9

- Atlas encyclopedia — 27 entries, pgvector RAG, growing to 1000+
- Academy — 4 learning tracks (Spark/Wire/Forge/Edge) with courses + lessons
- R2 Co-pilot — Claude-powered AI mentor with atlas RAG
- Supabase auth — magic-link login + profiles
- 3D simulation — Three.js + URDF loader
- Monaco IDE — in-browser code editor
- xterm ROS2 playground
- Pulse (news), Lens (videos), Daily-life, Blog, Diagnostic test
- Challenge, Community, Careers, Dashboard
- World Robotics Map (D3 + react-simple-maps)
- SEO: sitemap, robots.txt, schema.org JSON-LD, OG tags

## Next Steps (v1.0)

- [ ] Apply DB schema (Step 2 above)
- [ ] Push to GitHub + deploy to Vercel
- [ ] Seed Atlas + verify RAG works
- [ ] Register domain (r2bot.com or r2bot.in)
- [ ] Expand Atlas to 100 entries
- [ ] Complete Spark track (all courses)
- [ ] Wire up Razorpay Pro paywall
- [ ] Add Hindi translations for top Atlas entries
