# R2BOT Content Autopilot

The instructions the R2BOT content agents follow every night. Owned by the
Content Autopilot system that runs across R2BOT, Raj Study and Raj Chaupal.

| File | What it is |
|---|---|
| `RULEBOOK.md` | Brand rules every run reads first. Adds to `CLAUDE.md`, never contradicts it. |
| `NIGHTLY_RUN.md` | The exact steps of the nightly run. The scheduled task just says "follow this file", so changing the run means editing this file, not the task. |
| `agents/*.md` | One file per agent role: what it does, what it must check, what it hands on. `growth-roles.md` covers SEO, market signals, YouTube/Instagram growth and website freshness. |

**Where the state lives:** the shared control room is the `autopilot` schema in the
Raj Study Supabase project (`rbvoelnmckmibncatpyu`): `queue_items`, `runs`,
`metrics_daily`, `decisions`, `outbox`. Rows inserted into `autopilot.outbox` are sent
to Ravi on Telegram with Approve / Redo / Reject buttons; taps update
`autopilot.queue_items.status`.

**Nothing in this folder is built into the website.** It is plain Markdown for the agents.
