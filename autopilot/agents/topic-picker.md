# Topic picker

Used by every brand's night run before a single script is written (R2BOT, Raj Study, Raj Chaupal).
A reel lives or dies on its topic and its first two seconds. Pick topics from evidence, not taste,
and never buy views with anything untrue, unkind or one-sided.

## 1. Read the evidence first (every night, fresh numbers)

```sql
-- what worked and what did not, for this brand, both platforms
select platform, views, vs_avg, likes, shares, title, published_at::date
from autopilot.topic_performance where brand = '<brand>' order by platform, views desc;
```

`vs_avg` = this video's views ÷ the brand's average on that platform. Above 1.5 is a proven pattern;
below 0.5 is a pattern to stop. Also read `autopilot.seo_opportunities` (what people search) and
`autopilot.signals` (what is in the news or the exam calendar).

## 2. What the evidence said on 19 Nov 2026 (a snapshot: re-check it, it will move)

**Raj Study, Instagram** (about 1,000 views a reel on average):
- Won: wildlife and nature in danger, with a number (the state-bird reel: 2,612 views, 149 likes,
  21 shares; but its number was wrong, see section 5); a contradiction ("मीठी से खारी: लूनी नदी"); a hidden or surprising place
  ("जोधपुर से पहले की राजधानी: मंडोर", "जयपुर में मिस्र की ममी"); folk love stories (ढोला-मारू);
  stepwells; Kalbelia; one brave person's story told as a sequence of events.
- Weak (under 500): saints and deities described plainly, crafts, palaces described plainly.
- **YouTube:** the same story topics win (Jaigarh treasure 438, Baneshwar 374, Tejaji 329). Plain
  facts, PYQ, economy and current-affairs Shorts got 0-5 views. Current affairs belongs on the
  website and in quizzes; as a Short it needs a story angle or it should not be made.

**R2BOT:**
- **Instagram:** everyday-object questions win ("How a robot hand holds an egg", "Why does a robot
  vacuum not fall down stairs": 170-230 views). Abstract concepts posted there sink.
- **YouTube:** named concepts win ("State Machine" 1,216, "Slip Detection" 592, "ZMP" 229), because
  people search them.
- Write the IG hook as an everyday question and the YouTube title as the named concept, for the
  same video when it fits.
- Never repost a video that already went out. Two R2BOT reels were posted twice; Instagram
  favours original posts.

**Raj Chaupal:** too few posts to judge yet. Its YouTube viewers watched 99.9% of the video.
Treat the first 30 reels as tests: vary the hook type and record it.

## 3. Score every candidate, then pick the top ones

Give each candidate 0-2 on each line and write the total and the reasons into the script's
payload as `topic_score: {total, pattern, demand, hook, visual, evergreen, why}`:

| | 2 | 1 | 0 |
|---|---|---|---|
| **pattern** | matches a pattern with vs_avg ≥ 1.5 | untested | matches a pattern with vs_avg < 0.5 |
| **demand** | search impressions, an exam date within 30 days, or today's news | some interest | none found |
| **hook** | first 2 s carry a surprise, a contradiction or a precise number that the video pays off | a plain question | a label ("राजस्थान पर्यटन के तथ्य") |
| **visual** | honest footage or photos of the actual thing exist | generic but true footage | only look-alikes or nothing |
| **evergreen** | still true and interesting in a year | for a season | for a day |

Pick candidates scoring 7 or more. About 70% of each week's reels come from proven patterns;
about 30% are labelled experiments (`"experiment": "<what is being tested>"`) so the brand keeps
finding new winners.

**Learning rules** (checked by the Monday review):
- A pattern that averages under 0.5× across 6 reels is dropped.
- A reel over 2× gets 3 follow-ups in the same vein within 2 weeks: new subjects, never a repeat.
- A plan or format gets at least 14 days or 10 reels before anyone judges it.

## 4. The hook (the first line on screen, the first spoken sentence)

- At most 8 words on screen. It makes a promise: a surprise, a contradiction, a number, a
  stake ("एक आंख गई। एक हाथ गया।").
- The video must pay off the promise inside 40 seconds. A hook the video does not honour is a lie
  and costs trust; do not write one.
- No fake urgency, no "you won't believe", no shock thumbnails, no fear.

## 5. Verification, decency and neutrality: the gate before Ravi sees anything

A script that fails any line is fixed or dropped, never sent for approval.

**Facts**
- Every number, date and name comes from a primary or official source (government, court, Election
  Commission, Lok Sabha/Rajya Sabha records, ASI, RSSB, PIB, the paper or manufacturer for R2BOT), or
  from two independent reliable sources. The URLs go in `sources` in the payload.
- The hook's number needs its own primary source, checked that night. The brand's most-viewed reel
  said the state bird (गोडावण) has "सिर्फ़ 50-90" left; the Wildlife Institute of India's 2025
  survey (wii.gov.in GIB report 2024-25) estimates 130 ± 21. A wrong number in a hook is the most
  widely seen mistake a channel can make.
- Legend is labelled as legend, history as history. Folk stories and traditions are told as
  "लोककथा के अनुसार" / "मान्यता है".
  - Example: the story that Alauddin Khilji attacked Chittor "for a queen" comes from Jayasi's poem
    Padmavat (1540), written more than two centuries after the siege; historians dispute it. Present
    it as the poem's story, never as the reason for the siege.
- No coaching or test-prep site is ever a source. Never name a competitor.

**Decency**
- No content that mocks, blames or ranks any religion, caste, community, region or gender.
- No "us vs them" framing of history. Battles are told as events with dates and outcomes, not as a
  community's victory over another.
- No gore, no glorified violence, no suicide or self-harm detail. Jauhar and sati are described
  only factually and briefly, never as noble or romantic.
- Religious figures and places are described respectfully and descriptively, without claims of
  miracles stated as fact.

**Neutrality (Raj Chaupal and any political topic)**
- No praise or criticism of a party or a living politician. A story that touches a living
  politician is flagged "⚠️ living person" and needs Ravi's explicit approval.
- Where a decision was contested, give each side's stated position in their own documented words,
  with the source.
- Results, dates and votes come from the Election Commission and parliamentary records only.

**R2BOT**
- No hype ("robots will replace…"), no invented specs. Claims about how most robots work must be true
  of most robots; otherwise name the robot.
- The owner's personal name never appears; the brand reads "R2BOT".
