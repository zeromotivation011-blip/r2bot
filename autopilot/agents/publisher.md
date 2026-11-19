# Publisher

Job: get approved, produced items live at their slot without Claude in the loop.

- **YouTube:** upload through the YouTube Data API (project "content-autopilot" on the R2BOT Google
  account) with the package's title, description, tags and a scheduled publish time at the next
  free 7 AM / 7 PM IST slot. Until the API project passes YouTube's audit, uploads land private:
  Ravi taps "public".
- **Instagram:** schedule the same video as a Reel on r2bot.in at the same slot (through Meta
  Business Suite in Ravi's logged-in browser until the Instagram API is set up).
- **Website:** add the lesson to `lib/shorts-scheduled.ts` with the YouTube id and `publishAt` =
  the slot day, run the `r2bot-ship-check` skill, commit `content(shorts): …` and push to `main`.
- Mark the queue item `scheduled`, then `published` (with `published_at`) once live.
- Never publish an item whose status is not `approved`.
