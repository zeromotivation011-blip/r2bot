# Growth roles (beyond daily content)

Four roles that make the system grow the brand, not just fill the calendar. Each writes to the
control room (Supabase `rbvoelnmckmibncatpyu`, schema `autopilot`) so the Growth Control Room
dashboard shows its work. Nothing here publishes without Ravi's approval.

## 1. SEO Strategist (weekly, Monday; daily quick check)

R2BOT's search goal: own "how does X work" and "what is X" for robotics concepts worldwide
(`CLAUDE.md` §12: one page per query, Atlas owns "what is X", Quick Lessons own "how does X work").

- Read Search Console numbers from `autopilot.seo_pages` (filled once the API is connected; until
  then use the site's own analytics and the sitemap).
- Find: pages with impressions but low click rate (rewrite title/description), queries ranking 8–20
  (strengthen the page and its internal links), concepts with search demand but no page (new Atlas
  entry or lesson), and orphans (no inbound link).
- Output: up to 5 concrete changes a week as `autopilot.initiatives` rows (pillar `seo`, with the
  page, the query, the change and the KPI), each small enough to ship in one run.

## 2. Signal Strategist (daily scan, weekly proposals)

- Scan: robotics news (launches, demos, funding, viral clips), YouTube search suggestions for
  robotics topics, what similar channels' new uploads are about (reference only, never copy),
  platform changes (Shorts/Reels features), and R2BOT's own winners and losers.
- Record each meaningful finding in `autopilot.signals` (kind, strength 1–3, source URL).
- Weekly: turn the strongest signals into at most 3 new initiatives (pillar `signals`), each with
  why now, expected impact, effort and the KPI that proves it worked. Retire initiatives that
  missed their KPI twice.

## 3. Channel Growth (YouTube + Instagram, daily)

- For every new Short: 2 title options and 2 first-frame/thumbnail texts; the Editor picks one,
  the other is tried on a later topic (log which won in `autopilot.decisions`).
- After each video has 48 hours of data: record views, average viewed % and subscribers gained per
  video in `autopilot.metrics_daily`. Flag the top and bottom performer of the week with a reason.
- Keep playlists by theme current, pin the lesson-link comment, add end screens to long videos.
- Instagram: reel + caption with the lesson link in bio flow; propose collabs (Ravi approves).
- Posting time experiments: one variable at a time, two weeks each.

## 4. Freshness Keeper (daily, light)

- Check that pages say true, current things: dates, "latest" claims, robot specs, company facts,
  dead outbound links, Shorts whose lesson page is missing (description links to /shorts/<slug>).
- Log each problem in `autopilot.freshness`; fix small ones in the nightly run (after the
  `r2bot-ship-check` skill), queue bigger ones for approval.
- Known now: 12 Shorts uploaded on 14 Nov are private and link to lesson pages that need to exist
  before they go public.
