# R2BOT nightly run

Runs at 1:04 AM IST from a scheduled task. Goal: by 6:30 AM Ravi has tonight's reel briefs on
Telegram and the website got its share of work.

**Since 20 Nov 2026 Ravi makes the reels himself** and uploads them at www.r2bot.in/studio/upload;
the Reel desk (`agents/reel-desk.md`, every 3 hours) posts them. This run no longer writes scripts
for the video factory: it writes **reel briefs** he can film from.

Follow the steps in order. Keep the whole run frugal: no exploration
beyond what a step needs.

Control room = Supabase project `rbvoelnmckmibncatpyu`, schema `autopilot` (use the Supabase
`execute_sql` tool). Brand key = `r2bot`.

## 0. Start

1. Insert a run row and keep its id:
   `insert into autopilot.runs (brand, agent) values ('r2bot','nightly') returning id;`
2. Read `autopilot/RULEBOOK.md`, then the agent files in `autopilot/agents/` as you reach
   each role. Read `CLAUDE.md` sections 6 and 12 if you will touch the website.

## 1. Planner — what's needed tonight

1. Redo first: `select * from autopilot.queue_items where brand='r2bot' and status='redo';`
   Each one gets a fresh angle (different hook, different everyday moment). Same topic_key.
2. Legacy only: Shorts Ravi approved before 20 Nov (`status='approved' and kind='short'` with no
   `payload->>'inbox_id'`) still go to the Producer (step 5). Do not create new ones.
3. Reel briefs: **3 per night**, so Ravi can pick 2 a day. If 9 or more briefs from the last 3
   days are still unused (`status='idea'`, `payload->>'type'='brief'`), write 1 and say so.
4. **Text quota (weekly plan: 20 text pieces).** Every Short already carries its lesson page.
   On top of that, by night of the week:
   - Mon–Thu: one Atlas page each night (`r2bot-atlas-entry` skill), queued as kind `page`.
     **Improve before you add.** First read
     `select * from autopilot.seo_opportunities where brand='r2bot' limit 15` (Search Console,
     refreshed daily 06:37 IST). If an Atlas page there has 100+ impressions at position 5–15 and no
     `page` queue item with topic_key `seo-<slug>` in the last 30 days, tonight's Atlas work is
     that page: make its title and first sentence answer the exact queries it is shown for, and
     bring the entry up to the house standard (beginner → advanced ladder, sources, related links).
     19 Nov baseline: screw-theory (1,111 impressions, position 10.4, 0 clicks), bipedal-robot
     (920, 8.2, 0), lqr-controller (265, 9.2), moveit (108, 10.5). Only when nothing qualifies,
     write a new entry, chosen from `autopilot.web_snapshot` queries (kind `query`) we have no page for.
     A page rewrite the Editor dropped (screw-theory was dropped on 20 Nov) is retried first the next
     night with the Editor's notes; the biggest search pages must not wait behind new entries.
     Do not judge R2BOT traffic by GA4 total users: most of it is automated direct traffic from
     Singapore. Use Google clicks and organic sessions.
   - Wed: one buying-guide or Humanoid Tracker update (kind `page`).
   - Fri: "Robot of the Week" (reel brief + page + newsletter paragraph) and the weekly
     "3 robotics stories that mattered" roundup (kind `post`).
   Check `autopilot.content_progress` for the week so far and catch up on whatever is behind.

## 2. Scout — choose topics

First read `agents/topic-picker.md` and run its query on `autopilot.topic_performance`: it says
what actually got views, how to score candidates (keep 7+ only, write `topic_score` into the
payload) and the verification/decency gate every script must pass. Then follow `agents/scout.md`.
Output: 3 topics, each with a topic_key (kebab-case), the everyday moment, the real use case and
why it should get views. Never a topic already in
`lib/shorts.ts`, `lib/shorts-scheduled.ts` or `autopilot.queue_items` for r2bot.

## 3. Writer — the brief

For each topic, one JSON brief (`"type":"brief"`) that Ravi can film from without researching:
- `why`: the pattern it fits and its evidence (vs_avg from `topic_performance`, search demand).
- `hook`: on-screen line (at most 8 words) + first spoken sentence. It must be paid off in the video.
- `facts`: 5-7 short, checked facts in the order they'd be said, **each with its source URL**.
  Mark anything that is a legend or disputed.
- `shots`: 4-6 visual ideas, honest (no look-alike places).
- `title` (YouTube, named concept), `ig_caption_seed`, `lesson_page` (does a lesson already exist?
  `grep -rn "title:" lib/shorts*.ts`).
`agents/writer.md` still applies for voice and style.

## 4. Editor — check before Ravi sees it

The Editor must not be the same mind that wrote the package. For each package, start a
**fresh subagent** (Agent tool, `general-purpose`) and give it only three things: the text of
`agents/editor.md`, `autopilot/RULEBOOK.md`, and the package JSON. Do not pass your notes,
reasoning or search results — it re-checks every fact itself from the package's `sources`
(WebFetch/WebSearch). It returns the verdict JSON described in `agents/editor.md`.

- `pass` → queue it, and store the verdict in `payload.editor`.
- `fix` → apply exactly the fixes it listed, then send the fixed package to a **new** fresh
  Editor once. Second `fix` or `fail` → drop it.
- `fail` → rewrite once from a new angle, then a new fresh Editor. Fails again → drop it.

Dropped packages are named in the run summary. Never send Ravi something an Editor did not pass.
If the Agent tool is unavailable, do the check yourself, set `payload.editor.independent=false`,
and add "(self-checked)" after the title in the Telegram message.

## 5. Producer — legacy only

Ravi's own reels are posted by the Reel desk, not here. Only for Shorts approved before 20 Nov:
follow `agents/producer.md` (up to 4 a night): render with
`autopilot/factory/render_short.py`, look at four frames, upload to YouTube at
`autopilot.next_slot('r2bot')`, queue the same file in `autopilot.ig_queue` for Instagram, add or
attach the lesson page, and mark the item `scheduled`. Commit lesson-page changes to `main` in the
same run, after `npm run type-check` passes, so each page is live hours before its video.
If rendering fails twice for an item, leave it `approved`, say why in the summary, and move on.

## 6. Queue + Telegram

1. For each brief that passed:
   `insert into autopilot.queue_items (brand, kind, title, topic_key, status, payload, created_by)
    values ('r2bot','short', <title>, <topic_key>, 'idea', <brief jsonb>, 'nightly')
    on conflict (brand, kind, topic_key) do nothing returning id;`
2. One outbox message for all briefs, **no buttons** (`item_ids '{}'`). For each brief: the title,
   the hook, the facts as short lines with a source domain after each, and the shot ideas. Keep it
   under ~3,500 characters. End with: "Film any of these and upload at www.r2bot.in/studio/upload."
   Text pages queued as kind `page` still go in their own message with Approve buttons, as before.

## 6b. Growth roles (see `agents/growth-roles.md`)

Every night, briefly: Freshness Keeper (log problems in `autopilot.freshness`) and the Signal
Strategist's daily scan (log findings in `autopilot.signals`). Record any new channel numbers in
`autopilot.metrics_daily`.

**Mondays only:** SEO Strategist and Signal Strategist each propose initiatives
(`autopilot.initiatives`, status `proposed`), and one outbox message lists them for Ravi with the
week's numbers: what grew, the top and bottom item, and the proposals. Keep it to one screen.

## 7. Finish

1. `update autopilot.runs set status='done', finished_at=now(), summary=<3 lines> where id=<run id>;`
2. If anything failed: set `status='failed'`, put the reason in `error`, and send an outbox
   message starting "R2BOT night run problem:" with one line on what broke and what you did.
   A silent failure is the worst outcome; always report.
