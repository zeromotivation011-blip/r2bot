# R2BOT rulebook (for the content agents)

Read this, then `CLAUDE.md`, at the start of every run. If they ever disagree, `CLAUDE.md` wins
and you flag the conflict in the run summary.

## Goal

Grow the audience: YouTube subscribers (@R2BOTINDIA), Instagram followers (r2bot.in) and
r2bot.in visitors who join the email list. Owner's target: 1,000 site users a day.
The number that matters most is **engaged subscribers**, not raw views.

## Audience

Curious people worldwide, roughly 16–35, with no robotics background. English. India is one
important region, never the default lens.

## Voice and look

- Plain English a 15-year-old follows. No jargon without an everyday comparison first.
- **Hook = an everyday moment the viewer has lived**, not a statement ("Your robot vacuum
  never falls down the stairs. Here's the trick." beats "Cliff sensors explained").
- Every Short includes **one real use case** (a named kind of robot doing a real job).
- On-screen brand is **"R2BOT"**, never "R2BOT.in". The R2BOT logo appears in every video.
- Voiceover: natural, professional, Indian-accent English. Same voice every video.
- Music: soothing, royalty-free only. Licence noted in the pack.
- **No polls, no questions to the audience** ("comment below which…"). Give information.
- **No real footage of Ravi's robots.** Visuals are produced (animation, renders, diagrams).
- **The owner's personal name never appears anywhere**: video, description, page, comment.
- Long videos: told as a story, 4–5 minutes, **no episode number** on screen or thumbnail.

## Formats

| Format | Length | Cadence | Slot (IST) |
|---|---|---|---|
| Short / Reel | 45–90 s (hard cap 90 s) | 2 a day | 7:00 AM and 7:00 PM |
| Long story video | 4–5 min | weekly (from week 4) | Saturday |
| Quick Lesson page | one per Short | with each Short | live when the Short goes public |
| Atlas entry | — | 4 a week | as approved |

## Titles, descriptions, tags

- Title ≤ 60 characters, the everyday question or the surprising fact first. No clickbait
  that the video doesn't pay off.
- Description template (keep it, it's working for the lesson funnel):

  ```
  {Title} 👉 Full 1-minute lesson + quiz: https://www.r2bot.in/shorts/{slug}
  {one or two plain sentences on what the viewer learns}
  New robot explainer every day. Follow R2BOT for one everyday robot secret a day.
  Website: r2bot.in | Instagram: instagram.com/r2bot.in
  #{topic tag} #{topic tag} #shorts #robotics #STEM #R2BOT
  ```
- Pin a comment on every video pointing to the lesson page.

## Facts

- Every number or claim has a source (manufacturer, paper, standards body, reputable press).
  Store the sources in the pack. No source → cut the claim.
- Prefer ranges and "about" over false precision. Never invent specs.

## Website rules that matter to content

- Every new Short gets a Quick Lesson in `lib/shorts-scheduled.ts` (pattern documented at the
  top of that file), with `publishAt` = the day the Short goes public. Follow the
  `r2bot-short-to-lesson` skill exactly.
- A Short that repeats an existing topic attaches to that lesson as an extra video; never a
  second URL. Check `lib/shorts.ts` and `lib/shorts-scheduled.ts` before choosing a topic.
- Atlas entries follow the `r2bot-atlas-entry` skill. Before anything reaches `main`, run the
  `r2bot-ship-check` skill.
- No prices, no "free forever", no upgrade copy.

## What never ships without Ravi's tap

Every new Short, long video, lesson page and Atlas entry, until Ravi switches a format to
auto-publish in the control room (`autopilot.decisions`).
