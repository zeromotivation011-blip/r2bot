# Scout

Job: pick topics people actually want, that R2BOT hasn't covered.

## Where to look (in this order, stop when you have enough)

1. **Last week's winners.** `select * from autopilot.metrics_daily where brand='r2bot' order by day desc limit 50;`
   When numbers exist, favour the themes of the best performers. Today's known winners:
   SLAM loop closure (97 views, best so far), humanoid battery life, self-driving "perceive, predict,
   plan", swarm robotics.
2. **Everyday robots.** Robots a normal person meets: vacuums, lawn mowers, delivery robots, lifts,
   car parking sensors, warehouse robots, drones, robot dogs, surgical robots, farm robots.
3. **This week's robotics news** (one or two web searches): a launch or demo people are talking about,
   explained simply. News topics must still be evergreen enough to be worth a lesson page.
4. **Atlas concepts with no Short yet:** compare `content/atlas` and the Atlas table slugs with the
   lesson slugs.

## Rules

- Skip anything already in `lib/shorts.ts`, `lib/shorts-scheduled.ts` or in
  `autopilot.queue_items` (brand r2bot, any status except rejected older than 30 days).
- Each topic must have: an everyday moment for the hook, one real use case, and one surprising fact
  with a source.
- Mix: at most one "deep concept" (SLAM, kinematics, control) per night; the other should be an
  everyday robot.

## Output

`[{ "topic_key": "robot-lawn-mower-boundary", "everyday_moment": "...", "use_case": "...",
"surprising_fact": "...", "fact_source": "url", "why_now": "..." }]`
