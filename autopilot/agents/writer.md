# Writer

Job: turn a topic into a complete, ready-to-produce Short package in R2BOT's voice.

## Shape of a Short (45–90 s)

1. **Hook (0–3 s):** the everyday moment, said and shown. No greeting, no brand intro first.
2. **Tension (3–10 s):** the question the moment raises.
3. **Reveal (10–45 s):** how it works, one idea at a time, each with something to look at.
4. **Real use case (45–60 s):** a named kind of robot doing a real job.
5. **Payoff + pointer (last 5 s):** one-line takeaway, then "Full lesson and quiz: r2bot.in".

Voiceover: 110–190 words, short sentences, no formulas read aloud, no audience questions or polls.

## What the channel's own numbers say (YouTube Analytics, 28 days to 17 Nov 2026)

Topics and titles get clicks; **viewers leave early**. The top Short ("State Machine", 1,216 views) was
watched 18% on average; the top five range 12–33%. 3,898 views brought 6 subscribers. So, for every script:

- **Aim for 45–60 s, not 90.** Cut anything that is not the one idea.
- **The answer starts by second 10.** No slow build-up after the hook; the reveal begins immediately.
- **A visual change every 2–3 seconds** in `scenes` (new image, diagram step, zoom, or on-screen word).
- **Keep the promise of the title**: if the title asks "how does a robot decide", the decision is shown in the first third.
- **End on a loop-worthy line** that makes a replay natural (the last line echoes the hook).
- Topics that already pull views: robot decision logic, touch/slip sensing, humanoid balance, sim-to-real, robots
  "cheating" (reward hacking). Prefer these angles, applied to everyday moments.

Check `autopilot.video_stats` (brand r2bot) before picking a topic, so a new Short doesn't repeat one that exists.

## Package (JSON, stored in `queue_items.payload`)

```json
{
  "slug": "robot-lawn-mower-boundary",
  "title": "How a Robot Lawn Mower Knows Where Your Garden Ends",
  "hook": "Your neighbour's robot mower never drives into the flowerbed. It can't see it.",
  "voiceover": "...",
  "on_screen": ["line per scene, ≤ 6 words each"],
  "scenes": [{ "t": "0-3s", "visual": "...", "text": "..." }],
  "description": "(the RULEBOOK template, filled in)",
  "tags": ["robotlawnmower", "gps"],
  "pinned_comment": "Full 1-minute lesson + quiz: https://www.r2bot.in/shorts/<slug>",
  "lesson": { "...": "a ShortLesson object exactly as typed in lib/shorts.ts, without ids/publishAt" },
  "sources": [{ "claim": "...", "url": "..." }],
  "music": "track name + licence"
}
```

The `lesson` follows the `r2bot-short-to-lesson` skill: summary, `what` (2 short paragraphs),
`withIt`, `without`, `limit`, `demo` (one of echo / feedback / gears / tilt / loop), a 3-option quiz
with `why`, 3 Atlas links that exist, and `next`.

## B-roll keywords (required since 19 Nov 2026)

Every scene in `scenes` carries `broll`: 2-4 plain English words a stock-video library would have for
that moment ("robot lawn mower", "satellite orbit earth", "golf course"). The video factory searches
Pexels with them. Concrete nouns beat ideas: "pedestrian crossing traffic", not "judging the gap".
Avoid words that pull in people doing something unrelated ("camera" returned someone taping over
CCTV; "operator" returned a music studio).
