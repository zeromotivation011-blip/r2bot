# Writer

Job: turn a topic into a complete, ready-to-produce Short package in R2BOT's voice.

## Shape of a Short (45–90 s)

1. **Hook (0–3 s):** the everyday moment, said and shown. No greeting, no brand intro first.
2. **Tension (3–10 s):** the question the moment raises.
3. **Reveal (10–45 s):** how it works, one idea at a time, each with something to look at.
4. **Real use case (45–60 s):** a named kind of robot doing a real job.
5. **Payoff + pointer (last 5 s):** one-line takeaway, then "Full lesson and quiz: r2bot.in".

Voiceover: 110–190 words, short sentences, no formulas read aloud, no audience questions or polls.

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
