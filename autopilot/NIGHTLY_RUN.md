# R2BOT nightly run

Runs at 1:30 AM IST from a scheduled task. Goal: by 6:30 AM Ravi has a pack on Telegram he can
approve in two minutes. Follow the steps in order. Keep the whole run frugal: no exploration
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
2. Approved scripts waiting for a video: `status='approved' and kind='short'`. These go to the
   Producer (step 5).
3. New scripts: aim for **2 new Short scripts** per night, so there are always about 3 days of
   approved scripts ahead of the posting slots. If 6 or more are already approved and waiting,
   write none and say so.

## 2. Scout — choose topics

Follow `agents/scout.md`. Output: 2 topics, each with a topic_key (kebab-case), the everyday
moment, the real use case and why it should get views. Never a topic already in
`lib/shorts.ts`, `lib/shorts-scheduled.ts` or `autopilot.queue_items` for r2bot.

## 3. Writer — the package

Follow `agents/writer.md`. For each topic produce one JSON package (see that file) with:
hook, voiceover, on-screen text, scene list, title, description, tags, pinned comment,
lesson-page draft and sources.

## 4. Editor — check before Ravi sees it

Follow `agents/editor.md`. A package that fails is rewritten once; if it fails again it is
dropped and named in the run summary. Never send Ravi something the Editor failed.

## 5. Producer — videos for approved scripts

Follow `agents/producer.md`. Until the render pipeline is connected (see that file), skip this
step and say "Producer: waiting for render pipeline" in the summary.

## 6. Queue + Telegram

1. For each package that passed:
   `insert into autopilot.queue_items (brand, kind, title, topic_key, status, payload, created_by)
    values ('r2bot','short', <title>, <topic_key>, 'awaiting_approval', <package jsonb>, 'nightly')
    on conflict (brand, kind, topic_key) do update set status='awaiting_approval', payload=excluded.payload
    returning id;`
2. One outbox message for the whole pack. Text = for each item: the title, the hook line, and
   the voiceover (shortened to fit; Telegram allows ~4,000 characters in total). End with one line:
   "Approve = goes to video. Redo = new angle tomorrow. Reject = dropped."
   `insert into autopilot.outbox (brand, text, item_ids) values ('r2bot', <text>, array[<ids>]::uuid[]);`

## 7. Finish

1. `update autopilot.runs set status='done', finished_at=now(), summary=<3 lines> where id=<run id>;`
2. If anything failed: set `status='failed'`, put the reason in `error`, and send an outbox
   message starting "R2BOT night run problem:" with one line on what broke and what you did.
   A silent failure is the worst outcome; always report.
