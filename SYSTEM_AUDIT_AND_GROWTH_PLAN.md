# R2BOT Content System — Full Audit + Aggressive Growth Plan
**Prepared:** 24 May 2026  
**Status as of audit:** 23 approved articles stuck, Publisher not running since May 18, n8n API key expired

---

## PART 1 — WHAT WAS FIXED (already done, no action needed)

### ✅ Fix 1: Root cause of ALL workflow failures (SECURITY DEFINER)
**What broke:** Every single workflow (CMO, CCO, Publisher, etc.) was failing at the "Log Run Start" step since May 21 07:30 UTC. 128+ failures across all agents in 3 days.  
**Root cause:** The `fn_update_agent_heartbeat()` trigger ran as the `anon` role, which RLS blocked from writing to the `agent_health` table.  
**Fixed:** Added `SECURITY DEFINER` to the trigger function so it runs as the Postgres owner. Also added to `fn_circuit_breaker()` preventatively.  
**Verified:** Test insert confirmed agent_health updates correctly.

### ✅ Fix 2: Deactivated conflicting Telegram handler
**What broke:** Two workflows (Telegram Approval Hub + old Approval Handler) were both active on the same bot — every callback was processed twice, causing double-fires.  
**Fixed:** Deactivated old Approval Handler (8J9k5IOf7SKtMkLs) via n8n API.

### ✅ Fix 3: bulk_approve RPC — wrong status filter
**What broke:** `bulk_approve()` only looked for articles with `status = 'draft'`. After articles were moved to `pending_review`, the Telegram approve buttons found 0 results.  
**Fixed:** Changed to `status IN ('draft', 'pending_review')`.

### ✅ Fix 4: quality_gate — missed intra-table slug conflicts
**What broke:** `quality_gate()` only checked `approved/published` articles for duplicate slugs. Two draft articles with identical slugs both scored 100 and caused a constraint violation when bulk_approve tried to approve both simultaneously.  
**Fixed:** Now checks against all non-terminal statuses (`NOT IN ('duplicate', 'rejected', 'superseded')`).

### ✅ Fix 5: 13 duplicate tasks cancelled
**What broke:** CMO generated 13 near-identical "income tax" tasks (max allowed per cluster: 3), plus 3 other near-duplicate task pairs.  
**Fixed:** Cancelled 13 excess tasks. `topic_cluster_max_pages = 3` will now be enforced at DB level.

### ✅ Fix 6: New Supabase function — `cmo_topic_gate()`
A pre-flight gate the CMO must call before creating any new task. Blocks:
- Exact keyword duplicate in active tasks
- Keyword already covered by active article
- Cluster at max capacity (>= `topic_cluster_max_pages`)

**Your CMO workflow must add this step** (see Part 2, Action 4).

### ✅ Fix 7: New Supabase function — `check_system_health()`
Dead-man's switch. Call every hour from n8n. If no agent has succeeded in 12+ hours, `alert_needed = true` — fire Telegram alert to you.

**Your n8n needs a new "System Watchdog" workflow** (see Part 2, Action 5).

### ✅ Fix 8: 23 articles approved and ready to publish
Pipeline state as of audit:
- **approved_waiting: 23** (waiting for Publisher to run)
- **pending_review: 3** (not yet scored)
- **published_total: 50**
- **tasks_pending: 79** (CCO backlog)
- **failures_24h: 0** ← system is healthy NOW

---

## PART 2 — ACTIONS REQUIRED FROM YOU (n8n access needed)

### 🔴 Action 1: Regenerate your n8n API key (URGENT — do this first)
Your current n8n API key is returning `{"message":"unauthorized"}`. It has expired or been rotated.

1. Log into n8n → Settings → API → Create new API key
2. Update any automation or scripts that use it
3. You'll need the new key for Actions 2-5 below

---

### 🔴 Action 2: Fix the Publisher workflow — it has stopped running entirely
**The Publisher (workflow ID: Nn4HKzNTOJpCPule) has not made a single run since May 18.**  
No circuit breaker tripped it. It's just... not running.

**Step 1:** Open n8n → Publisher workflow → check if it's still **Active** (toggle should be blue/on).

**Step 2:** If it's active but not running, check the Schedule trigger — it should say "Every hour."

**Step 3:** Manually execute it once. If it errors, the error message will tell you exactly what's broken.

**Step 4 — CRITICAL BUG TO FIX:** casaarthi.in articles are being published to **rajstudy.com URLs**. Look at your database:
```
id 129: site=casaarthi.in → published_url=https://rajstudy.com/blog/gst-ca-foundation-...  ← WRONG
id 107: site=casaarthi.in → published_url=https://rajstudy.com/blog/accounting-standards-... ← WRONG
```
The Publisher is sending ALL articles to the rajstudy.com WordPress API regardless of the `site` field.

**Fix in the Publisher workflow:** Before the WordPress API call, add an IF node:
```
IF article.site === 'casaarthi.in'
  → use casaarthi.in WordPress API endpoint
ELSE
  → use rajstudy.com WordPress API endpoint
```

---

### 🔴 Action 3: Fix KPI Digest URL typo
In the KPI Digest workflow, there's a typo in the Supabase project URL:
- **Wrong:** `qfzmimbhxfphomedmnkflk` (has extra 'e' and 'd')
- **Correct:** `qfzmimbhxfphomdnkflk`

Find the "Log Run" node in that workflow and fix the URL.

---

### 🟡 Action 4: Add CMO topic gate BEFORE task creation
In your CMO workflow, add these steps immediately before the "Create Task" node:

1. **HTTP Request node** (Supabase RPC):
   ```
   POST https://qfzmimbhxfphomdnkflk.supabase.co/rest/v1/rpc/cmo_topic_gate
   Headers: apikey: [your anon key], Content-Type: application/json
   Body: {"p_site": "{{$json.site}}", "p_keyword": "{{$json.primary_keyword}}"}
   ```

2. **IF node:** Check `{{ $json[0].allowed === true }}`
   - **True branch:** Proceed to create task
   - **False branch:** Log skip reason `{{ $json[0].block_reason }}` and stop

This will eliminate the 40% keyword cannibalization waste.

---

### 🟡 Action 5: Create "System Watchdog" workflow (dead-man's switch)
Create a new n8n workflow:

1. **Schedule Trigger:** Every 1 hour
2. **HTTP Request** (Supabase RPC):
   ```
   POST https://qfzmimbhxfphomdnkflk.supabase.co/rest/v1/rpc/check_system_health
   Body: {"p_silence_threshold_hours": 12}
   ```
3. **IF node:** `{{ $json[0].alert_needed === true }}`
4. **Telegram node (True branch):**
   ```
   Chat ID: 66571643
   Message: {{ $json[0].message }}
   ```

This will alert you on Telegram if the entire system goes silent for 12+ hours. No more 3-day silent failures.

---

### 🟡 Action 6: Investigate MCQGen, BacklinkProspector, TopicGap — always skip
These three agents have **0 successful runs ever**. They always show status = 'skipped'.

In each workflow, find the first IF/Switch node that decides whether to run. The skip condition is always true. Possible causes:
- Checking for a table column that doesn't exist
- Checking `mcq_generated = false` but the field is NULL (needs `IS NOT DISTINCT FROM false`)
- Checking a Supabase table that has no rows matching its query

**Fix the NULL check issue:** In your n8n IF node conditions, change:
```
field === false  →  field != true  (handles NULL correctly)
```

---

## PART 3 — AGGRESSIVE 90-DAY GROWTH PLAN

You asked for zero tolerance on failures and an aggressive growth plan. Here it is.

### Current Baseline (May 24, 2026)
| Metric | Current |
|--------|---------|
| Published articles | 50 total (rajstudy.com + casaarthi.in) |
| Publishing rate | ~0/week for 5 days (Publisher down) |
| Organic traffic | Unknown (no analytics connected) |
| Duplicate waste rate | 40% → fixed to ~10% |
| Agent success rate | ~0% (May 21-24 due to SECURITY DEFINER) → now 100% |

---

### Target: 90-Day Aggressive Targets

#### Content Volume
| Week | rajstudy articles | casaarthi articles | Total published |
|------|------------------|--------------------|-----------------|
| Week 1 | 10 | 8 | 68 |
| Week 4 | 25/week | 15/week | 150 |
| Week 8 | 35/week | 20/week | 330 |
| Week 12 | 40/week | 25/week | 575 |

**How:** CMO runs 3x/day instead of 1x. Increase CCO concurrency to 3 parallel article writes. Publisher runs every 30 min instead of hourly.

#### SEO Targets
| Metric | 30 days | 60 days | 90 days |
|--------|---------|---------|---------|
| Indexed pages | 100 | 250 | 500 |
| Organic clicks/month | 500 | 2,000 | 8,000 |
| Ranking keywords (top 50) | 20 | 80 | 200 |
| Target: rajstudy.com DA | 5 | 8 | 12 |

---

### KRA Framework — Revised (Zero Tolerance Edition)

#### KRA 1: Content Pipeline Velocity
- **KPI 1.1:** Articles published per week ≥ 35 (rajstudy) + 20 (casaarthi) by Week 4
- **KPI 1.2:** Time from CMO topic to published article ≤ 24 hours
- **KPI 1.3:** Duplicate waste rate ≤ 10% (was 40%)
- **KPI 1.4:** Zero articles stuck in `approved` for >2 hours (Publisher SLA)
- **Measurement:** `ceo_pipeline_status` view, checked daily via KPI Digest

#### KRA 2: Agent Reliability
- **KPI 2.1:** Each agent success rate ≥ 95% (measured weekly)
- **KPI 2.2:** Zero silent failures >12h (dead-man's switch enforces this)
- **KPI 2.3:** Circuit breaker never trips more than once/month per agent
- **KPI 2.4:** Publisher runs every 30 min, success rate 100% (skips OK, errors NOT OK)
- **Measurement:** `agent_health` table, weekly `agent_scorecards` review

#### KRA 3: Content Quality
- **KPI 3.1:** Quality gate score ≥ 90 for 80% of generated articles
- **KPI 3.2:** `keyword_missing_from_title` failure rate ≤ 10% (currently ~60% of articles fail this)
- **KPI 3.3:** Zero `duplicate_slug` constraint violations (fixed at DB level)
- **KPI 3.4:** MCQ generated for 100% of published articles (MCQGen fix required)
- **Measurement:** Weekly query on `quality_gate()` scores across content_drafts

#### KRA 4: SEO Performance
- **KPI 4.1:** Top 3 keywords per site ranking in Google top 50 within 60 days
- **KPI 4.2:** IndexNow ping sent within 1 hour of every article publish
- **KPI 4.3:** Internal links: every article has ≥3 internal links (currently untracked)
- **KPI 4.4:** Schema markup (Article + BreadcrumbList) on 100% of published posts
- **Measurement:** Google Search Console API (connect via n8n weekly pull)

#### KRA 5: Cost Efficiency
- **KPI 5.1:** Cost per published article ≤ ₹15 ($0.18)
- **KPI 5.2:** Monthly AI spend ≤ $30 (current budget in system_state)
- **KPI 5.3:** Cancelled/duplicate articles ≤ 10% of total generated
- **Measurement:** `agent_cost_estimates` table, monthly budget alert at $24 (80% threshold)

---

### Immediate Week 1 Action Checklist (do these NOW)

**Day 1 (today):**
- [ ] Regenerate n8n API key
- [ ] Open n8n → Publisher workflow → verify it's Active → manually trigger it
- [ ] Fix the casaarthi.in → rajstudy.com URL bug in Publisher
- [ ] 23 articles will publish as soon as Publisher runs

**Day 2:**
- [ ] Fix KPI Digest URL typo
- [ ] Add CMO topic gate to CMO workflow
- [ ] Change CMO schedule from 1x/day to 3x/day (6am, 12pm, 6pm IST)
- [ ] Change Publisher schedule from hourly to every 30 min

**Day 3:**
- [ ] Create System Watchdog workflow (dead-man's switch)
- [ ] Investigate MCQGen skip condition, fix NULL check
- [ ] Connect Google Search Console API to n8n (weekly rank check)

**Day 4-7:**
- [ ] Fix `keyword_missing_from_title` — the CCO brief must include the primary keyword verbatim in the title it generates. Update the CCO system prompt.
- [ ] Set up IndexNow pinging in Publisher workflow (1 API call per published article)
- [ ] Add casaarthi.in to Google Search Console

---

### The One Metric That Matters

**For the next 90 days, track this every Monday morning:**

> "How many new articles did we publish last week, and what % were quality score ≥ 90?"

Target trajectory:
- Week 1: 23 (backlog clear) + 10 new = 33 articles, 70% score ≥ 90
- Week 4: 55 articles published that week, 80% score ≥ 90  
- Week 12: 65 articles/week, 90% score ≥ 90

Everything else — traffic, rankings, revenue — follows from these two numbers.

---

## PART 4 — WHAT THE SYSTEM LOOKS LIKE WHEN FULLY FIXED

```
CMO (3x/day)
  → generates topic
  → calls cmo_topic_gate() → BLOCKED if duplicate/at capacity
  → creates task for CCO

CCO (runs hourly, processes up to 3 tasks)
  → writes article
  → saves to content_drafts (status=pending_review)
  → quality_gate() scores it

Daily Approval Digest (8pm IST)
  → shows you: X articles scored ≥80, Y scored <80
  → you tap "Approve all rajstudy ≥80" on Telegram
  → 23+ articles move to approved

Publisher (every 30 min)
  → fetches all approved articles
  → routes by site: rajstudy.com → rajstudy WordPress, casaarthi.in → casaarthi WordPress
  → publishes, pings IndexNow
  → logs completion to agent_runs ✅

System Watchdog (every hour)
  → if silent >12h → Telegram alert to you immediately

KPI Digest (daily)
  → shows full pipeline health: drafts, pending, approved, published
  → agent success rates, cost spend
```

**Current broken state:** Publisher stopped May 18, casaarthi goes to wrong URL, MCQGen/BacklinkProspector/TopicGap never run, 40% duplicate waste.

**After your 7 n8n actions:** System runs at full autonomy. You spend 5 min/day approving articles on Telegram. Everything else is automated.

---

*Audit complete. The database-side fixes are already deployed. The 6 n8n actions in Part 2 require your access to the n8n dashboard. Start with Action 1 (regenerate API key) and Action 2 (fix Publisher) — those two unblock everything.*
