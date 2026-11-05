# R2BOT — Operations runbook

Last audited: 2026-11-05. Keep this file honest: if reality changes, change this file.

## Where everything lives

| Thing | Where |
|---|---|
| Code | GitHub `zeromotivation011-blip/r2bot` (**public** repo — see "Known issues") |
| Hosting | Vercel, Hobby plan, project `r2bot`, domains `www.r2bot.in` and `r2bot-navy.vercel.app` |
| Database + auth | Supabase, Free plan, project `r2bot` (ref `bxgtocghjypbomszwvfr`), region ap-northeast-1 (Tokyo), Nano compute |
| Email | Resend |
| AI | Anthropic (co-pilot), OpenAI (embeddings) |
| Payments | Razorpay — **not configured** (no keys set; payment routes will fail by design for now) |

## Deploying

Production is currently deployed with the **Vercel CLI**, not from Git. Pushing to `main`
does **not** update the live site until Git is connected.

- Now: from a clean checkout of `main`, run `npx vercel --prod`.
- Better: Vercel → project `r2bot` → Settings → Git → connect the GitHub repo. After that,
  merging to `main` deploys, and every pull request gets a preview URL.
- Before merging anything, run `npm run type-check` and `npm run build` locally (a CI workflow
  to do this automatically is prepared separately and needs a token with the Workflows permission
  to add).

## Environment variables (Vercel → Settings → Environment Variables)

Set: `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`, `RESEND_API_KEY`, `NEXT_PUBLIC_GA_ID`,
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

Not set (code reads them): `RESEND_FROM_EMAIL`, `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`,
`NEXT_PUBLIC_RAZORPAY_KEY_ID`. Razorpay is intentionally off until paid plans exist.

Never commit real values. This repo is public.

## Database

- Schema lives in `supabase/migrations/*.sql`. They were applied by pasting into the Supabase
  SQL editor, so the live project's migration history table is empty. Treat the files as the
  source of truth and apply new ones in order.
- Migrations `0037_function_hardening.sql` and `0038_xp_award_once.sql` are already applied live (2026-11-05). `0039_revoke_client_award_xp.sql` must wait until the XP code is deployed.
- **Backups: the Free plan has none.** Take one by hand before any schema change and at least
  monthly:

  ```bash
  # DB URL: Supabase dashboard -> Connect -> "Session pooler" connection string.
  # Never commit it, and never store dumps in this (public) repo.
  pg_dump "$SUPABASE_DB_URL" --no-owner --format=custom -f r2bot-$(date +%F).dump
  ```

  Data that matters most: `profiles`, `leads`, `lead_events`, `newsletter_subscribers`,
  `copilot_conversations`, `lesson_completions`. `atlas_entries`, `news`, `discovery_queue`
  can be rebuilt from `content/` and the cron jobs.

## Cost guards (Hobby limits)

- ISR writes were 361K against a 200K limit. Cause: Atlas and blog pages had `revalidate = 300`
  across ~490 pages. They now use a daily safety net plus on-demand `revalidatePath` in the
  admin save/import routes. Re-check Vercel → Usage → ISR Writes ~1 week after deploying.
- Cron jobs in `vercel.json` must stay daily or less frequent on Hobby.

## Known issues / backlog (in priority order)

1. **`award_xp` can be farmed** (fix prepared; finish the rollout). Any signed-in user could call
   `award_xp` from the browser, up to 1000 XP per call, repeatedly. New flow: the browser calls
   `POST /api/academy/award-xp`, the server reads the real XP from the lesson and calls
   `award_xp_once()` (pays each user+lesson once; service role only).
   Rollout order: (a) migration `0038` (additive; already applied live 2026-11-05),
   (b) deploy the code, (c) apply `0039_revoke_client_award_xp.sql`. Do not apply 0039 before the deploy.
2. **Three SECURITY DEFINER views** bypass RLS: `public_leaderboard`, `schools_public`,
   `robot_vote_tally`. They feed public pages on purpose; replace with narrow definer
   functions or `security_invoker` views plus explicit read policies, and test the pages.
3. **Open INSERT policies** (`WITH CHECK (true)`) on `leads`, `lead_events`,
   `newsletter_subscribers`, `schools`, `robot_votes`. Confirm all writes go through rate-limited
   API routes (service role), then drop the public policies.
4. **RLS performance**: wrap `auth.uid()` as `(select auth.uid())` in policies and merge the
   duplicate permissive policies (school_*, user_achievements). Matters once there are many users.
5. `vector` extension is installed in `public`; move to `extensions` in a quiet window.
6. Leaked-password protection is off. It needs the Supabase Pro plan, and the app uses magic-link
   sign-in, so impact is low.
7. The repo is **public** while the license says "Proprietary". Decide: make it private, or
   change the license. `docs/R2BOT-Strategic-Blueprint.docx` and the brand assets are visible.
8. `npm run lint` fails because ESLint is not installed. Add `eslint` + `eslint-config-next`
   and a config, then add lint to CI.
9. `@next/bundle-analyzer` is v16 while Next is v15. `@anthropic-ai/sdk` is far behind.
10. Supabase project showed status "Unhealthy" on 2026-11-05 with no explanation on the
    dashboard. Check Project Settings → Infrastructure and the Supabase status page.
11. Account split: code, Vercel and Supabase sit under a separate login from the founder's main
    accounts. Consider consolidating.
