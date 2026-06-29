# R2BOT — Atlas, History & Daily Life: 10x Reimagining Plan
> Product Design Document · v1.0 · May 2026
> Author: Claude (acting as Senior Product Designer + Instructional Designer)

---

## OVERVIEW

This document covers the complete reimagining of three R2BOT features:
1. **Atlas** — Robotics Encyclopaedia (currently good, needs 10x more depth + gamification)
2. **History of Robots** — Timeline feature (currently text-heavy, needs multimedia + emotion)
3. **Robots in Daily Life** — Use-case explorer (needs imagination + simplicity)

Each section contains: Current State Audit → Vision → Feature Design → UX Flows → Implementation Spec → Claude Code Build Prompt.

---

# PART 1: ATLAS — ROBOTICS ENCYCLOPAEDIA

## 1.1 Current State Audit

**What exists:**
- 100+ robotics terms across 8 buckets (Actuators, AI, Arms, Control, Ethics, Mobile, Sensors, Structures)
- Detail page per term: definition, layman explanation, analogy, Indian example, prerequisites, YouTube embed
- Explore mode (browsing) + Learn mode (study cards) + Search
- Streak tracking, "Mastered" bookmarking
- Quiz component, PythonPlayground, PIDSimulator (great!)
- Difficulty filter (1–5), bucket filter

**What's missing:**
- No animations on the cards or page transitions
- No next-topic recommendation engine
- No knowledge graph / visual relationship map
- No "level up" / mastery progression system beyond a checkbox
- No image/illustration per concept
- YouTube embed is below the fold — users may never see it
- No inline images or diagrams explaining the concept
- No spaced repetition review prompts
- No "prerequisite not mastered" alert before showing hard terms
- No "I'm feeling curious" random discovery mode
- No bucket heatmap showing mastery coverage
- No social sharing of mastered concepts
- No concept-to-concept navigation ("After Actuators, explore Sensors")

---

## 1.2 Vision: "The Galaxy of Robotics"

**Metaphor:** Every concept is a star. Stars cluster into constellations (buckets). As you master stars, your galaxy lights up. Connected stars form pathways. Some stars are locked until prerequisites glow.

**North Star metric:** Average session time on Atlas ≥ 8 minutes (currently estimated 2–3 min)

**Design Principles:**
1. Every concept page should feel like a mini documentary
2. Next step is always obvious — you're never lost
3. Progress is visible and emotionally rewarding
4. Hard concepts become approachable through layering (layman → analogy → deep)
5. Indian context on every page — students should see themselves in the content

---

## 1.3 Feature Design

### Feature A: Galaxy Map Explore Mode
Replace the current grid with an interactive SVG "galaxy" using D3.js (already in deps).

- Each term = a glowing circle node
- Size = difficulty (larger = harder)
- Color = bucket (each bucket gets a color)
- Connections = prerequisite relationships (edges between nodes)
- Mastered nodes = bright gold with pulse animation
- Unmastered prerequisites = grey with lock icon
- Hover: shows concept name + short hook line in a tooltip
- Click: navigates to detail page
- "Galaxy Map" toggle button in header; defaults to grid on mobile

**Visual Design:**
```
 [SENSORS cluster]       [AI cluster]
   ○ Ultrasonic           ● Neural Net (mastered)
   ● Camera ←────────────→ ● Computer Vision
   ○ LIDAR               ○ Reinforcement Learning
         ↑
   [ACTUATORS cluster]
   ● Servo Motor (mastered)
   ○ Stepper Motor
```

### Feature B: Concept Card Redesign (Home Grid)
Each card gets:
- **Hero illustration** (SVG or image): A simple, bold visual representing the concept
- **Mastery ring**: Circular progress indicator (0/3 quiz rounds correct = empty, 3/3 = full gold)
- **Difficulty stars**: Visual 1–5 (current filter value)
- **"New" badge**: For concepts added in last 30 days
- **Hover state**: Card flips to show hook line + "Start Learning" CTA
- **Locked state**: Grey with lock if prerequisites not met

### Feature C: Next-Topic Recommendation Engine
After finishing a concept page, a sticky "Up Next" bar appears at bottom:

```
┌─────────────────────────────────────────────────────────┐
│  🚀 Ready for more?                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ → Encoders   │  │ → PID Ctrl   │  │ 🎲 Surprise  │  │
│  │ (unlocked)   │  │ (prereq met) │  │ me!          │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘
```

Logic:
1. Show terms listed in `unlocksTerms` of current concept
2. Show related bucket terms with lowest mastery
3. Show "Surprise me!" = weighted random from unvisited concepts

### Feature D: Layered Content Architecture (Concept Detail Page)
Restructure detail page into 5 collapsible "layers":

**Layer 1: The Hook (always visible)**
- Big bold concept name with pronunciation guide
- One-sentence "what is this?" in plain English
- Hero illustration (full-width, colorful)
- YouTube video embed (ABOVE fold, not below)
- Estimated read time + difficulty badge

**Layer 2: The Story (expanded by default)**
- Layman explanation
- Analogy (visual card with "💡 Think of it like...")
- Indian example (highlighted box with 🇮🇳 flag)

**Layer 3: The Deep Dive (collapsed, expand to read)**
- Technical definition
- Mathematical formula if applicable
- Code example in Python (Monaco editor, small)
- Links to simulators if relevant

**Layer 4: The Mind Map (collapsed)**
- Shows prerequisite terms (must know) with mastery status
- Shows unlocked terms (now accessible) 
- Mini D3 force graph of just this concept's connections

**Layer 5: The Challenge (always visible at bottom)**
- 3-question mastery quiz (existing Quiz component)
- Hands-on challenge: "Try this in the Simulator"
- "Mark as Mastered" button (unlocks dependent concepts)
- Share card: "I just mastered [Concept] on R2BOT 🤖"

### Feature E: Bucket Heatmap (Atlas Home)
A visual grid showing mastery coverage per bucket:

```
SENSORS    [████████░░] 8/10 mastered
AI         [████░░░░░░] 4/12 mastered
ACTUATORS  [██████████] 10/10 ⭐ Complete!
MOBILE     [██░░░░░░░░] 2/8 mastered
```

Clicking a bucket section scrolls to that section in the grid.

### Feature F: Mastery XP & Badges
- Each concept mastered = +10 XP
- Each bucket fully mastered = "Constellation Badge" (animated SVG badge)
- Streak bonus: 3-day streak = 1.5x XP multiplier
- Level system: 0–100 XP = Apprentice → 100–500 = Builder → 500–1500 = Engineer → 1500+ = Maestro
- XP bar shown in Atlas header
- Profile page shows all earned constellation badges

### Feature G: Spaced Review System
- After mastering a concept, schedule it for review (SM-2 algorithm, 1 → 3 → 7 → 14 → 30 days)
- "Due for Review" section appears on Atlas home when concepts are overdue
- Quick-review mode: flashcard style, 30 seconds per concept
- Streak protection: if you review overdue concepts you don't lose streak

### Feature H: "I'm Feeling Curious" Button
- Large, fun button on Atlas home page
- Picks a random concept from the set the user hasn't visited
- Weighted toward: interesting mind-blowing facts, high-difficulty concepts with good analogies
- Shown with teaser text: "Today's rabbit hole: [Hook Line]"
- Tracks "explored via curiosity" to prevent repeats

### Feature I: Prerequisite Alerts
- When user clicks a concept with unmet prerequisites, show overlay:
  "⚠️ You haven't mastered [Servo Motor] yet — this concept builds on it.
   [Learn Servo Motor first] or [Jump in anyway]"
- Soft gate only — users can always proceed
- After completing prereq, notification: "🎉 You've unlocked [next concept]!"

### Feature J: Concept Illustrations
For each term, add a `conceptImage` field to `AtlasFrontmatter`:
- SVG illustrations (simple, bold, educational style)
- Phase 1: Use royalty-free/generated images from Unsplash/educational sources
- Phase 2: Commission custom SVGs per bucket (stretch goal)
- Phase 3: AI-generated illustrations via Replicate API

---

## 1.4 New AtlasFrontmatter Fields

```typescript
interface AtlasFrontmatter {
  // existing fields...
  title: string
  bucket: string
  difficultyLevel: number
  laymanExplanation: string
  analogy: string
  indianExample: string
  prerequisiteTerms: string[]
  unlocksTerms: string[]
  youtubeId: string
  mindBlowingFact: string
  
  // NEW FIELDS:
  conceptImage?: string          // path to illustration image
  hookLine: string               // 1 sentence teaser for cards + recommendations
  formulaLatex?: string          // mathematical formula in LaTeX
  codeSnippet?: string           // Python code example
  simulatorSlug?: string         // link to relevant simulator
  realWorldProduct?: string      // e.g. "Boston Dynamics Spot", "Tesla Autopilot"
  xpValue?: number               // default 10, some concepts worth more
  tags?: string[]                // for cross-cutting search: "vision", "manipulation" etc
  estimatedReadTime?: number     // minutes
  lastUpdated?: string           // ISO date
  relatedConcepts?: string[]     // manually curated similar concepts (same difficulty)
}
```

---

## 1.5 New Atlas Pages

### /atlas (Home) — Redesigned
```
Header: "The Galaxy of Robotics" | XP Bar | Level Badge | Streak
[🔭 Galaxy Map] [📚 Study Grid] [🃏 Flashcards] [🔄 Due Review (3)]
[🎲 I'm Feeling Curious!]

Bucket Heatmap (mastery overview)

[Filter: All Buckets | Sensors | AI | ...] [Difficulty: ★-★★★★★] [Sort: A-Z | XP | Newest]

Concept Card Grid (redesigned cards with illustrations + mastery rings)
```

### /atlas (Galaxy Map view)
```
D3.js SVG full-screen interactive graph
Sidebar: concept details on hover
Top: [🔍 Search] [Filter by bucket] [Show only: mastered / unmastered / locked]
Bottom: Legend + instructions
```

### /atlas/[type]/[slug] (Concept Detail) — Redesigned
```
Breadcrumb: Atlas > Sensors > Ultrasonic Sensor
[Layer 1: Hook — always open]
  Title + Pronunciation + XP badge
  Hero Image (full width)
  YouTube Video (above fold)
  1-sentence definition

[Layer 2: The Story — open by default]
  Layman + Analogy card + Indian Example

[Layer 3: Deep Dive — collapsed]
  Technical def + Formula + Code snippet

[Layer 4: Mind Map — collapsed]
  Prerequisites + Unlocks (D3 mini graph)

[Layer 5: Challenge — always open]
  Quiz (3 questions)
  Hands-on link
  Mark Mastered / Share

[Sticky bottom bar: Up Next recommendations]
```

---

# PART 2: HISTORY OF ROBOTS

## 2.1 Current State Audit

**What exists:**
- 6 chapters across 65 milestones (1920–2026)
- Birth year time-travel (enter year, see context)
- Chapter navigation with emoji chapters
- `HistoryMilestone`: year, title, emoji, hookLine, story, whyItMattered, personBehind, almostFailed, indiaConnection, youtubeId, ledTo
- "This happened in your lifetime?" feature

**What's missing:**
- YouTube embeds are NOT shown inline — just stored in data
- No images/illustrations on any milestone
- Story text is long paragraphs — walls of text, no visual breaks
- No timeline visualization (just a vertical list)
- No animation or scroll effects
- No chapter intro "scene" (cinematic opening)
- No interactive quiz between chapters
- No India-specific callout styling (indiaConnection field exists but not visually highlighted)
- No "Fast Forward" to see what came next from a milestone
- No future predictions section
- No share functionality
- Very static — doesn't feel like a documentary

---

## 2.2 Vision: "The Robot Documentary"

**Metaphor:** A Netflix-style documentary where each chapter is an "episode." You scroll through cinematic scenes, watch video clips, see photos, read dramatic narrative, and feel emotionally connected to the history.

**North Star metric:** Average time on History page ≥ 5 minutes (estimated currently: 1–2 min)

**Tone:** Dramatic, exciting, personal. Each inventor has a face. Each milestone has stakes. The reader should feel "wow, I didn't know that."

---

## 2.3 Feature Design

### Feature A: Cinematic Chapter Opener
Each chapter begins with a full-viewport "scene card":

```
┌───────────────────────────────────────────────────────────────┐
│                                                               │
│  [Animated background: subtle robot silhouettes moving]       │
│                                                               │
│  CHAPTER 3                                                    │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                  │
│  🏭 Industrial Age                                            │
│  1960 – 1990                                                  │
│                                                               │
│  "The robots left the lab and entered the factory floor.      │
│   Nothing would ever be made the same way again."            │
│                                                               │
│  [▶ Start this chapter]                        12 milestones  │
└───────────────────────────────────────────────────────────────┘
```

### Feature B: Milestone Card Redesign
Each milestone gets a rich card layout:

```
┌─────────────────────────────────────────────┐
│ 1961                              ⏱ 2 min  │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│ 🏭 Unimate: The First Industrial Robot      │
│                                             │
│ [Image: Unimate on GM assembly line]        │
│                                             │
│ "Before Unimate, humans welded car bodies   │
│  in 140°F heat. George Devol had a better  │
│  idea."                                     │
│                                             │
│ [▶ Watch 90-second clip]  [Read full story ↓] │
│                                             │
│ 🇮🇳 India connection: [collapsed]            │
│ ⚠️ Almost didn't happen: [collapsed]         │
│ ⏭️ This led to: [Shakey the Robot, 1969]     │
└─────────────────────────────────────────────┘
```

**Expanded story view:**
- Full story text with **bold key phrases** and paragraph breaks
- "Person behind it" pull-quote: grey box with person's name, photo placeholder
- "Why it mattered" — visual callout with impact icons
- "Almost failed" — amber warning box (humans love drama!)
- India connection — green box with 🇮🇳 flag (if content exists)
- "This led to →" — clickable link to next milestone

### Feature C: Horizontal Scrolling Timeline (Visual)
At the top of the History page, a horizontal scrubbing timeline:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1920    1940    1960    1980    2000    2020    →FUTURE
  |        |       |       |       |       |
  ●        ●      ●●●     ●●●●    ●●●●   ●●●●●●●
Capek   Asimov  [current: Unimate]
```

- Click any dot to jump to that milestone
- Current position highlighted
- Color coded by chapter
- "You are here" pointer tracks scroll position
- Decade labels above
- Small emoji thumbnails on hover

### Feature D: YouTube Video Integration (Inline)
If a milestone has `youtubeId`, show an embedded YouTube player inline within the milestone card — not a link, not hidden. Lazy-loaded with a thumbnail.

```jsx
{milestone.youtubeId && (
  <div className="milestone-video">
    <p className="text-sm text-gray-500 mb-2">
      📹 Watch: {milestone.title} in action
    </p>
    <iframe
      src={`https://www.youtube.com/embed/${milestone.youtubeId}?modestbranding=1`}
      className="w-full rounded-xl aspect-video"
      loading="lazy"
      allowFullScreen
    />
  </div>
)}
```

### Feature E: Animated Year Counter
The birth-year feature gets a makeover:
- Large, bold animated counter (CSS animation rolling digits)
- Background changes to match era (1960s = sepia tones, 2000s = blue tech feel)
- "You were born in [year]. Here's what robots could do then..."
- Milestone nearest to birth year highlighted with ⭐ "Born in your era!"
- Count of milestones since birth: "12 robot milestones happened in your lifetime"

### Feature F: Chapter End Quiz
After each chapter's last milestone, a "Chapter Complete" card:

```
┌─────────────────────────────────────────────┐
│  🎉 Chapter 3 Complete!                     │
│                                             │
│  Quick Quiz — 3 questions                  │
│  [Question 1 of 3]                         │
│  Which year did Unimate start working?      │
│  ○ 1954  ● 1961  ○ 1969  ○ 1972           │
│                                             │
│  [Continue →]                              │
└─────────────────────────────────────────────┘
```

### Feature G: Future Predictions Section
After the 2026 milestone (end of history), a "The Future" section:

```
┌─────────────────────────────────────────────┐
│  🔮 What's Coming Next?                     │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  2027–2030: Predictions from top scientists │
│                                             │
│  🤖 Humanoid robots in Indian homes        │
│  🏥 AI surgeons performing complex ops     │
│  🌾 Fully autonomous farms                 │
│  🚀 Robots building Mars habitats          │
│                                             │
│  "The next 10 years will have more robot   │
│   breakthroughs than the last 100."        │
│                          — IEEE Robotics   │
│                                             │
│  [🗓️ Set a reminder to revisit in 2027]    │
└─────────────────────────────────────────────┘
```

### Feature H: India Robotics Sidebar
A fixed sidebar or expandable panel that tracks India's robotics journey parallel to the global timeline:
- "Meanwhile in India..." callouts that appear at relevant years
- IIT Bombay's first robot lab (1981)
- ISRO's robotic missions
- Indian robotics startups 2010–present
- Student robotics competitions (WRO, FRC India)
- Toggle: "Show India story" overlay on the main timeline

### Feature I: Reading Mode vs. Browse Mode
- **Browse Mode** (default): Scannable cards, hook lines only, expand to read
- **Reading Mode**: Full immersive scroll, all stories expanded, good typography, dark background option
- Toggle in header: "📖 Reading Mode"

### Feature J: Social Share per Milestone
Each milestone card has a share button:
- Generates OG-style card with: year, title, hook line, R2BOT branding
- Shares to WhatsApp, Twitter/X, LinkedIn
- "I just learned about [Unimate] on R2BOT 🤖"

### Feature K: Milestone Images
Add `milestoneImage` to `HistoryMilestone` type:
- Phase 1: Curated public domain / Wikipedia images
- Phase 2: Illustrated cards (consistent style)
- Alt text for accessibility

---

## 2.4 Updated HistoryMilestone Type

```typescript
interface HistoryMilestone {
  // existing fields...
  year: number
  title: string
  emoji: string
  hookLine: string
  story: string
  whyItMattered: string
  personBehind: string
  almostFailed?: string
  indiaConnection?: string
  youtubeId?: string
  ledTo?: string
  
  // NEW FIELDS:
  milestoneImage?: string        // URL or path to image
  personImage?: string           // photo of inventor/creator
  chapterNumber: number          // 1–6
  readTimeMinutes?: number       // estimated read time
  keyFact?: string               // one-liner "mind blowing" stat
  location?: string              // city/country where it happened
  tags?: string[]                // thematic tags: "military", "medical", "space" etc
  quiz?: {                       // chapter-end quiz question
    question: string
    options: string[]
    correct: number
  }
}
```

---

# PART 3: ROBOTS IN DAILY LIFE

## 3.1 Current State Audit

**What exists:**
- 3 modes: Story (narrative 24h day), Check (quiz), Category (domain browse)
- 8 user profiles (student/farmer/doctor/factory worker/chef/delivery/home user/child)
- 47 robot use-cases total
- 10 domains (Healthcare, Agriculture, Manufacturing, Food, Logistics, Home, Education, Space, Defense, Entertainment)
- IntersectionObserver animated counter (great!)
- `UseCase`: name, description, robot, howItWorks, analogyExplanation, mindBlowingFact, difficulty
- 47-robot "climax" counter animation
- Domain filtering

**What's missing:**
- Story mode is a wall of text — not visual
- Profile selector is not prominent / engaging
- No images for any robot/use-case
- No "reveal mechanic" — everything is shown at once
- The 47-robot counter is a great idea but buried
- No "fun facts ticker"
- Domain icons exist in code but no visual domain cards
- No time-of-day theming (morning/afternoon/night robots)
- No swipe/card mechanic (mobile unfriendly)
- Difficulty filter exists but not prominent
- No sharing mechanism
- Check mode (quiz) is plain

---

## 3.2 Vision: "A Day With Robots"

**Metaphor:** Follow a character (choose: Priya the student, Arjun the farmer, Dr. Meera the doctor...) through a full day. At each moment of their day, a robot quietly helps. The experience should feel like a comic strip or Instagram story — visual, quick, shareable.

**North Star metric:** Users visit ≥ 4 different use-cases per session

**Design Principles:**
1. Visual first — every robot has an illustration/image
2. Simple language — a 12-year-old should understand
3. Progressive reveal — one robot at a time, like a story
4. Surprise and delight — fun facts that make you go "whoa!"
5. Indian characters and context throughout

---

## 3.3 Feature Design

### Feature A: Profile Hero Selection (Entry Screen)
Replace the current plain selector with a character picker:

```
┌─────────────────────────────────────────────────────────────┐
│  🤖 Whose day should we follow?                             │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  [👩‍🎓]    │  │  [👨‍🌾]    │  │  [👩‍⚕️]    │  │  [👶]    │  │
│  │  Priya   │  │  Arjun   │  │  Dr.     │  │  Chhotu  │  │
│  │  Student │  │  Farmer  │  │  Meera   │  │  Child   │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │  [👨‍🍳]    │  │  [🏭]    │  │  [📦]    │  │  [🏠]    │  │
│  │  Raju    │  │  Factory │  │  Delivery│  │  Home    │  │
│  │  Chef    │  │  Worker  │  │  Driver  │  │  User    │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  │
│                                                             │
│  "Each person's day is secretly full of robots. 🤫"        │
└─────────────────────────────────────────────────────────────┘
```

Character illustrations use bold, friendly, Indian-styled avatars (SVG).

### Feature B: Time-of-Day Story Mode (Visual Comic Strip)
The story unfolds in time blocks, one at a time, like swiping through stories:

```
┌─────────────────────────────────────────────┐
│  🌅 6:00 AM — Morning                       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│                                             │
│  [Illustration: Priya waking up, phone]    │
│                                             │
│  Priya opens her phone.                    │
│  Her news app uses an AI robot to select   │
│  stories just for her.                     │
│                                             │
│  🤖 Robot: News Recommendation AI          │
│  🏢 Real product: Google News, Inshorts     │
│  💡 Mind-blowing: It reads 10,000 stories  │
│     every hour so you don't have to.       │
│                                             │
│ [← Previous]  ━━●━━━━━━━━━━━ 1/12  [Next →] │
└─────────────────────────────────────────────┘
```

Navigation: swipe left/right on mobile, arrow buttons on desktop.
Progress bar at bottom showing how far through the day.

### Feature C: Robot Counter as Hero (Animated)
Make the "47 robots in your day" counter the **first thing** users see:

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│          [Animated robot icons appearing one by one]       │
│                                                             │
│   0 ... 5 ... 12 ... 23 ... 41 ... 47                     │
│                                                             │
│   🤖 ROBOTS help you every single day                      │
│   You just don't notice them.                              │
│                                                             │
│   [▶ Show me how]                                          │
└─────────────────────────────────────────────────────────────┘
```

This is the hero. It plays automatically on page load. Takes ~3 seconds. Creates curiosity.

### Feature D: Swipe Cards for Each Robot
After the story mode intro, users can browse robots as swipe cards (Tinder-style):

```
┌─────────────────────────────────────────────┐
│  Domain: 🏥 Healthcare                      │
│  Card 3 of 8                               │
│                                             │
│  [Robot Image: Surgical robot arm]          │
│                                             │
│  🦾 Da Vinci Surgical Robot                │
│                                             │
│  Operates through tiny holes in your body. │
│  Surgeons control it like a video game.    │
│  Hands are steadier than any human.        │
│                                             │
│  😲 Mind-blowing: 1mm incision, same job  │
│  as open-heart surgery!                    │
│                                             │
│  ← Swipe left (skip)  Swipe right (like) → │
│  [❤️ Fascinating]  [⏭️ Next]               │
└─────────────────────────────────────────────┘
```

Liked robots are saved to "My Robot Collection" mini-profile.

### Feature E: Domain Filter as Visual Cards (not dropdown)
Replace text dropdown with visual domain cards at top:

```
[🏥 Healthcare]  [🌾 Agriculture]  [🏭 Manufacturing]
[🍕 Food & Bev]  [📦 Logistics]   [🏠 Home]
[📚 Education]   [🚀 Space]       [🛡️ Defense]  [🎭 Entertainment]
```

Clicking highlights the domain, filters the cards below, shows "X robots in this domain."

### Feature F: Fun Facts Ticker
A horizontal scrolling ticker at the bottom of the page (like a news ticker):
```
🤖 Amazon has 750,000 warehouse robots · 🚀 NASA's Mars rovers have driven 50km+ · 
🌾 Drones spray 15x faster than humans · 🏥 Robot surgeries have 5x less blood loss · 
🇮🇳 India has 4,500 industrial robots (growing 25% YoY) ·
```

Auto-scrolling, infinite loop, pausable on hover.

### Feature G: Difficulty Slider as "Wow-o-Meter"
Rename "Difficulty" to "How Advanced?" with playful labels:
- ⭐ "Everyone knows this" → everyday robots
- ⭐⭐ "Pretty cool" → interesting applications
- ⭐⭐⭐ "Mind-bending" → cutting-edge / advanced
Visual slider instead of number filter.

### Feature H: Robot Density Visualization
A city/India map showing where robots are most concentrated:

```
India Robot Density (2025 estimate):
[SVG India map with heat overlay]
 🔴 Maharashtra: 1,200 industrial robots
 🟡 Tamil Nadu: 800 robots
 🟢 Karnataka: 650 robots
 ⚪ Most states: < 100 robots
```

Simple, informative, surprising. Shows scale of robotics in India.

### Feature I: "Did You Know?" Reveal Cards
Between time-of-day segments, full-screen reveal cards:

```
┌─────────────────────────────────────────────┐
│                                             │
│           😱                               │
│                                             │
│   Did you know?                             │
│                                             │
│   By the time you finish reading this,      │
│   12 surgeries have been completed by       │
│   robotic arms worldwide.                   │
│                                             │
│            [Cool! Keep going →]            │
└─────────────────────────────────────────────┘
```

3–4 of these interspersed through the story. Full-screen, large text, emoji-forward.

### Feature J: Share Card Generator
At the end of the story, show a shareable image:

```
┌─────────────────────────────────────────────┐
│  🤖 R2BOT                                   │
│                                             │
│  I discovered 47 robots                     │
│  in Priya's ordinary day!                  │
│                                             │
│  The most surprising: Da Vinci Surgical    │
│  Robot 🦾                                  │
│                                             │
│  r2bot.in · Learn Robotics for Free        │
└─────────────────────────────────────────────┘
[📱 Share on WhatsApp] [🐦 Share on Twitter]
```

Generated using html2canvas (already in deps).

---

## 3.4 Updated UseCase Type

```typescript
interface UseCase {
  // existing fields...
  id: string
  name: string
  domain: string
  description: string
  robot: string
  howItWorks: string
  analogyExplanation: string
  mindBlowingFact: string
  difficulty: number
  profiles: string[]
  
  // NEW FIELDS:
  robotImage?: string            // illustration or photo URL
  realProduct?: string           // e.g. "iRobot Roomba", "Da Vinci by Intuitive"
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime'
  indianContext?: string         // specific India example / stat
  funFact?: string               // tweet-length surprising fact
  videoId?: string               // YouTube clip (30-90 second demo)
  isHidden?: boolean             // reveal mechanic: show only when reached in story
}
```

---

# PART 4: IMPLEMENTATION ROADMAP

## Priority Order

**Sprint 1 (Week 1–2): Quick Wins**
- Atlas: Concept card hover flip + mastery ring
- Atlas: Next-topic sticky bar (read unlocksTerms from frontmatter)
- History: YouTube embeds inline (just move above fold)
- History: Image field + show placeholder if empty
- Daily Life: Profile character picker redesign
- Daily Life: Robot counter as hero (move to top)

**Sprint 2 (Week 3–4): Major Features**
- Atlas: Galaxy Map D3 visualization
- Atlas: Layered content page redesign
- History: Horizontal timeline scrubber
- History: Cinematic chapter openers
- Daily Life: Swipe card mechanic
- Daily Life: Domain visual cards

**Sprint 3 (Week 5–6): Engagement Features**
- Atlas: XP system + badges
- Atlas: Spaced review system
- History: Chapter quizzes
- History: India sidebar
- Daily Life: Fun facts ticker
- Daily Life: Share card generator

**Sprint 4 (Week 7–8): Content & Polish**
- Atlas: Bulk-add illustrations to top 20 concepts
- Atlas: "I'm feeling curious" button
- History: Add images to top 20 milestones
- History: Future predictions section
- Daily Life: Robot density map
- Daily Life: Did You Know reveal cards

---

# PART 5: CLAUDE CODE BUILD PROMPT

Copy-paste this entire prompt into Claude Code terminal (`cd ~/Desktop/robot && claude --dangerously-skip-permissions`):

```
=======================================================================
R2BOT — ATLAS, HISTORY & DAILY LIFE REIMAGINING
Claude Code Build Prompt · Sprint 1 + 2
=======================================================================

You are an expert Next.js 15 + TypeScript developer building R2BOT,
India's robotics education platform. The tech stack is:
- Next.js 15 App Router, React 19, TypeScript strict
- Tailwind CSS (utility classes) + inline styles for dynamic values
- Supabase (auth, database, storage)
- D3.js (already installed, use for visualizations)
- Framer Motion (already installed, use for animations)
- html2canvas + jsPDF (already installed)
- SWR for client-side data fetching

The repo is at /Users/ravibohra/Desktop/robot.
Read ATLAS_HISTORY_DAILYLIFE_PLAN.md for the full design document.

⚠️ IMPORTANT RULES:
1. Never use `export default function` in server components that have client children — check existing patterns first
2. Dynamic CSS values (colors, transforms) must use inline styles, not Tailwind
3. Always check existing component patterns before creating new ones
4. Run `npm run build` at the end of each task to verify no TypeScript errors
5. Mobile-first responsive design
6. All new images use next/image with proper alt text

---

## TASK A: UPDATE TYPE DEFINITIONS

### A1: Update lib/atlas.ts — AtlasFrontmatter type
Add these fields to AtlasFrontmatter interface (after existing fields):
```typescript
conceptImage?: string
hookLine?: string
formulaLatex?: string
codeSnippet?: string
simulatorSlug?: string
realWorldProduct?: string
xpValue?: number
tags?: string[]
estimatedReadTime?: number
relatedConcepts?: string[]
```

### A2: Update lib/history-chapters.ts — HistoryMilestone type
Add these fields to HistoryMilestone interface:
```typescript
milestoneImage?: string
personImage?: string
chapterNumber?: number
readTimeMinutes?: number
keyFact?: string
location?: string
tags?: string[]
quiz?: {
  question: string
  options: string[]
  correct: number
}
```

### A3: Update lib/daily-life-data.ts — UseCase type
Add these fields to UseCase interface:
```typescript
robotImage?: string
realProduct?: string
timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'night' | 'anytime'
indianContext?: string
funFact?: string
videoId?: string
isHidden?: boolean
```

---

## TASK B: ATLAS REDESIGN

### B1: New Atlas Concept Card component
Create components/atlas/ConceptCard.tsx:

```tsx
'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { AtlasNode } from '@/app/atlas/AtlasHomeClient'

interface ConceptCardProps {
  node: AtlasNode
  masteredSlugs: string[]
}

export function ConceptCard({ node, masteredSlugs }: ConceptCardProps) {
  const [flipped, setFlipped] = useState(false)
  const isMastered = masteredSlugs.includes(node.slug)
  
  // Mastery ring: count quiz attempts from localStorage
  // ... implementation
  
  return (
    <div
      className="relative h-48 cursor-pointer rounded-2xl overflow-hidden"
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}
    >
      {/* Front face */}
      {!flipped && (
        <div className="absolute inset-0 bg-white border border-gray-200 p-4 flex flex-col">
          {/* Mastery ring + concept image + name + difficulty + bucket */}
          {/* See ATLAS_HISTORY_DAILYLIFE_PLAN.md Feature B for layout */}
        </div>
      )}
      
      {/* Back face (hover) */}
      {flipped && (
        <Link href={`/atlas/${node.type}/${node.slug}`}>
          <div className="absolute inset-0 bg-blue-600 p-4 flex flex-col justify-between text-white">
            <p className="text-sm">{node.hookLine || node.layman?.slice(0, 100) + '...'}</p>
            <span className="font-semibold">Start Learning →</span>
          </div>
        </Link>
      )}
    </div>
  )
}
```

### B2: Next-Topic Sticky Bar
Create components/atlas/NextTopicBar.tsx — a sticky bottom bar on concept detail pages.

Shows 2–3 recommendations based on:
1. `unlocksTerms` from current concept frontmatter
2. Random unvisited concept from same bucket

```tsx
'use client'
// Uses: current concept's unlocksTerms + all atlas nodes list
// Reads visited slugs from localStorage
// Renders sticky bottom bar with 2-3 recommendation cards
// "Surprise me!" button picks random unvisited concept
// Disappears on scroll-up, reappears on scroll-down
```

### B3: Galaxy Map Component
Create components/atlas/GalaxyMap.tsx using D3.js:

```tsx
'use client'
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { AtlasNode } from '@/app/atlas/AtlasHomeClient'

interface GalaxyMapProps {
  nodes: AtlasNode[]
  masteredSlugs: string[]
  onNodeClick: (slug: string, type: string) => void
}

export function GalaxyMap({ nodes, masteredSlugs, onNodeClick }: GalaxyMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  
  useEffect(() => {
    // D3 force simulation
    // nodes = concepts, links = prerequisite relationships
    // Color by bucket (use bucket color map from existing code)
    // Size by difficulty level (radius = difficulty * 8 + 12)
    // Gold glow + pulse animation for mastered nodes
    // Grey + lock icon for nodes with unmet prerequisites
    // Tooltip on hover: concept name + hookLine
    // Click navigates to detail page
    // Zoom + pan enabled
    // See ATLAS_HISTORY_DAILYLIFE_PLAN.md Feature A for full spec
  }, [nodes, masteredSlugs])
  
  return (
    <div className="w-full h-screen bg-gray-950 rounded-2xl overflow-hidden">
      <svg ref={svgRef} className="w-full h-full" />
    </div>
  )
}
```

### B4: Bucket Heatmap Component
Create components/atlas/BucketHeatmap.tsx:
- For each bucket, show name + mastery bar (mastered/total)
- Color: < 25% = red, 25-75% = amber, 75-100% = green, 100% = gold ⭐
- Clicking a bucket filters the card grid below
- Show total XP from that bucket

### B5: "I'm Feeling Curious" Button
In AtlasHomeClient.tsx, add a large button above the card grid:
- Uses weighted random selection from unvisited concepts
- Weighted toward: concepts with mindBlowingFact, difficulty 3–4
- Tracks shown concepts in localStorage to avoid repeats
- Animates with a slot-machine style reveal of concept name
- Navigates to concept page on click

### B6: Layered Concept Detail Page
Update app/atlas/[type]/[slug]/page.tsx (and its client component):

Restructure the page into 5 collapsible layers as described in Part 1.4:
- Layer 1: Hook (always open) — move YouTube embed HERE, add hero image
- Layer 2: Story (open by default) — layman + analogy card + India box
- Layer 3: Deep Dive (collapsed) — technical + formula + code
- Layer 4: Mind Map (collapsed) — mini D3 graph of just prerequisites/unlocks
- Layer 5: Challenge (always open) — quiz + mastery button + share

Use a `<Collapsible>` pattern:
```tsx
function Layer({ title, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border rounded-xl mb-4">
      <button onClick={() => setOpen(!open)} className="w-full p-4 text-left font-semibold flex justify-between">
        {title} <span>{open ? '▲' : '▼'}</span>
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  )
}
```

### B7: XP System
Create lib/atlas-xp.ts:
```typescript
// XP storage in localStorage (no auth required for phase 1)
export function getAtlasXP(): number
export function addXP(amount: number): number  // returns new total
export function getAtlasLevel(): { level: string; nextAt: number; current: number }
export function getMasteredConceptSlugs(): string[]
export function markConceptMastered(slug: string): void
export function getConceptMasteryCount(slug: string): number  // 0-3 quiz rounds

// XP levels:
// 0–99: Apprentice 🔧
// 100–499: Builder 🤖
// 500–1499: Engineer ⚡
// 1500+: Maestro 🏆
```

Add XP bar to AtlasHomeClient.tsx header area (below "The Galaxy of Robotics" heading).

---

## TASK C: HISTORY REDESIGN

### C1: Inline YouTube Embeds
In app/history/HistoryHomeClient.tsx, for each milestone that has `youtubeId`:
- Add inline iframe embed (lazy loaded)
- Show BEFORE the story text, not after
- Use aspect-video class
- Label: "📹 Watch: [milestone.title]"
- Wrap in a div with rounded-xl overflow-hidden

### C2: Horizontal Timeline Scrubber
Create components/history/TimelineScrubber.tsx:

```tsx
'use client'
// A horizontal scrollable SVG timeline
// Each milestone = a dot (●) 
// Color by chapter (use chapter's color)
// Current position = highlighted larger dot with pointer
// Decades labeled above
// Clicking a dot fires onJumpTo(milestoneIndex) callback
// Shows in sticky header when user scrolls past initial view
// Responsive: on mobile, shows chapter dots only (not all 65)
```

### C3: Cinematic Chapter Openers
In HistoryHomeClient.tsx, before the first milestone of each chapter, insert a ChapterOpener card:

```tsx
function ChapterOpener({ chapter, milestoneCount }: { chapter: Chapter; milestoneCount: number }) {
  return (
    <div 
      className="relative w-full min-h-64 rounded-3xl flex flex-col justify-center items-center text-center p-8 my-8 overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${chapter.color}22, ${chapter.color}44)` }}
    >
      {/* Subtle animated robot silhouettes in background using CSS keyframes */}
      <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">
        Chapter {chapter.number}
      </div>
      <div className="text-5xl mb-4">{chapter.emoji}</div>
      <h2 className="text-3xl font-black mb-2">{chapter.title}</h2>
      <p className="text-gray-600 text-lg mb-4 max-w-md">{chapter.years}</p>
      <p className="text-gray-700 italic max-w-lg">"{chapter.openingQuote}"</p>
      <div className="mt-4 text-sm text-gray-500">{milestoneCount} milestones</div>
    </div>
  )
}
```

Add `openingQuote` field to chapter data in lib/history-chapters.ts — write one dramatic quote per chapter.

### C4: Milestone Card Redesign
Redesign each milestone in HistoryHomeClient.tsx to match the spec in Part 2.3 Feature B:
- milestoneImage field (show placeholder SVG robot if no image)
- Expand/collapse for: full story, India connection, almost failed, person behind
- `ledTo` as a clickable link to next milestone (scroll-to)
- `keyFact` shown as a highlighted callout
- Share button per milestone
- YouTube embed inline if youtubeId exists

### C5: Chapter End Quiz
After each chapter's last milestone, add a ChapterQuiz component:
- 3 questions (one per milestone quiz field, pick 3 from chapter)
- Simple radio-button style
- Show score with animation
- "Next Chapter →" button

### C6: Future Predictions Section
After the last milestone (2026), add a static FuturePredictions section:
- 6–8 predictions for 2027–2035
- Source citations (IEEE, World Economic Forum, etc.)
- Design: dark background, glowing text, futuristic feel
- "How many will come true? Check back in 2030!" CTA

### C7: Animated Year Counter Enhancement
The birth-year feature already exists — enhance it:
- Add CSS rolling digit animation (CSS keyframes for number transitions)
- Add era-appropriate background color when year is entered
  - 1920s-1940s: sepia (#8B7355)
  - 1950s-1960s: olive green
  - 1970s-1980s: warm orange
  - 1990s-2000s: early tech blue
  - 2010s+: current colors
- Count milestones since birth year and display: "In your lifetime: X robot milestones"
- Highlight nearest milestone to birth year with ⭐

---

## TASK D: DAILY LIFE REDESIGN

### D1: Hero Robot Counter (Move to Top)
In app/daily-life/DailyLifeClient.tsx:
- Move the robot counter animation to be the VERY FIRST element users see
- Full-width hero section, centered
- Counter starts from 0, animates up to 47 on page load (not on scroll)
- Add subtitle: "You just don't notice them."
- Add CTA button: "Show me how →" (scrolls to profile selector)
- Keep the existing IntersectionObserver animation but trigger immediately

### D2: Character Profile Selector
Replace the current profile selector with a visual card grid:

```tsx
const PROFILES_VISUAL = [
  { id: 'student', name: 'Priya', subtitle: 'Student', emoji: '👩‍🎓', color: '#6366f1' },
  { id: 'farmer', name: 'Arjun', subtitle: 'Farmer', emoji: '👨‍🌾', color: '#16a34a' },
  { id: 'doctor', name: 'Dr. Meera', subtitle: 'Doctor', emoji: '👩‍⚕️', color: '#0891b2' },
  // ... all 8 profiles with Indian names
]
```

Each card: emoji avatar (large, 48px), Indian name, role subtitle, colored border on select.
Show "X robots in [name]'s day" below the selection.

### D3: Swipe Card Story Mode
Create a new "Story Mode" (replacing the current text-heavy story view):
- Cards displayed one at a time
- Each card: time of day, robot image (placeholder SVG), robot name, 2-sentence description, mind-blowing fact
- Navigation: [← Previous] [progress dots] [Next →]
- Also swipeable on touch devices (use touch events: touchstart/touchend)
- Progress indicator: "5 of 12 robots in Priya's day"
- Interleave "Did You Know?" full-screen cards every 3 robots

### D4: Domain Visual Cards Filter
Replace the domain dropdown/text filter with a horizontal scrolling row of visual domain cards:

```tsx
const DOMAINS_VISUAL = [
  { id: 'all', label: 'All Robots', icon: '🤖', count: 47 },
  { id: 'Healthcare', label: 'Healthcare', icon: '🏥', count: 8 },
  { id: 'Agriculture', label: 'Farming', icon: '🌾', count: 5 },
  // ... all 10 domains
]
```

Selected domain: colored background, white text. Count badge on each.
On select: animate count of filtered robots.

### D5: Fun Facts Ticker
Add a CSS-animated marquee ticker at the bottom of the page (or below hero):

```tsx
const FUN_FACTS = [
  "🤖 Amazon has 750,000 warehouse robots · ",
  "🚀 NASA's Perseverance rover has driven 25km+ on Mars · ",
  "🌾 Agricultural drones spray 15x faster than humans · ",
  "🏥 Robot-assisted surgeries reduce blood loss by 5x · ",
  "🇮🇳 India's robotics market is growing 25% every year · ",
  // 20+ facts
]

// Render as CSS animation: @keyframes marquee { from { transform: translateX(0) } to { transform: translateX(-50%) } }
// Infinite loop, pause on hover
```

### D6: "Did You Know?" Interstitials
Every 3rd card in Story Mode, show a full-screen interstitial:
```tsx
const DID_YOU_KNOWS = [
  { emoji: '😱', fact: 'By the time you finish reading this sentence, 3 packages have been sorted by robot arms in Amazon warehouses.' },
  // ... 8–10 facts
]
```
Full-screen overlay with dark background, large emoji, bold text, "Cool! Keep going →" button.

### D7: Wow-o-Meter (Difficulty Slider Rename)
Rename the difficulty filter to "Wow-o-Meter":
- Labels: 🙂 "I've seen this" → 😲 "Pretty wild!" → 🤯 "Mind-bending"
- Visual slider with emoji labels
- Filters to difficulty 1-2, 3, 4-5 respectively

### D8: Share Card Generator
At the end of Story Mode, after the last robot card, show a share CTA:
```tsx
// Use html2canvas to capture a styled div as an image
// The captured div contains: "I discovered 47 robots in [name]'s day! 🤖 r2bot.in"
// Two buttons: Share on WhatsApp, Share on Twitter
// WhatsApp URL: https://wa.me/?text=...
// Twitter URL: https://twitter.com/intent/tweet?text=...
```

---

## TASK E: SHARED ANIMATIONS (add to app/globals.css)

Add these reusable CSS animations:

```css
/* Mastery glow pulse for Atlas mastered nodes */
@keyframes masteryPulse {
  0%, 100% { box-shadow: 0 0 8px 2px gold; }
  50% { box-shadow: 0 0 16px 6px gold; }
}
.mastered-glow { animation: masteryPulse 2s ease-in-out infinite; }

/* Card flip */
@keyframes flipIn {
  from { transform: rotateY(90deg); opacity: 0; }
  to { transform: rotateY(0); opacity: 1; }
}
.flip-in { animation: flipIn 0.2s ease-out; }

/* Marquee ticker */
@keyframes marquee {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
.marquee-content { animation: marquee 30s linear infinite; }
.marquee-content:hover { animation-play-state: paused; }

/* Robot counter number roll */
@keyframes rollIn {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.roll-in { animation: rollIn 0.3s ease-out; }

/* Slide reveal on scroll */
@keyframes slideReveal {
  from { transform: translateY(30px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.slide-reveal { animation: slideReveal 0.5s ease-out; }

/* Chapter opener robot silhouettes */
@keyframes floatRobot {
  0%, 100% { transform: translateY(0px) rotate(-5deg); opacity: 0.1; }
  50% { transform: translateY(-20px) rotate(5deg); opacity: 0.15; }
}
.float-robot { animation: floatRobot 6s ease-in-out infinite; }
```

---

## EXECUTION ORDER

Run these tasks in order:
1. Task A (type definitions) — 15 minutes
2. Task E (CSS animations) — 10 minutes  
3. Task B1 + B4 + B5 (Atlas: cards + heatmap + curious button) — 45 minutes
4. Task B7 (XP system) — 20 minutes
5. Task B6 (layered concept pages) — 45 minutes
6. Task B2 (next-topic bar) — 30 minutes
7. Task C1 + C3 + C4 (History: embeds + chapter openers + card redesign) — 60 minutes
8. Task C2 (timeline scrubber) — 45 minutes
9. Task C7 (birth year enhancement) — 20 minutes
10. Task D1 + D2 (Daily Life: hero counter + character selector) — 30 minutes
11. Task D3 (swipe card story mode) — 45 minutes
12. Task D4 + D5 + D6 (domain cards + ticker + interstitials) — 30 minutes
13. Task B3 (Galaxy Map — D3, hardest task, save for last) — 90 minutes

After each task: `npm run build` to verify zero TypeScript errors.
After ALL tasks: `vercel deploy` to push to production.

=======================================================================
END OF CLAUDE CODE BUILD PROMPT
=======================================================================
```

---

# APPENDIX: CONTENT QUICK-WINS

These require no code changes — just content additions to existing MDX/data files:

## Atlas Content Additions (top 10 terms)
Add `hookLine` to these terms in their MDX frontmatter:
- servo-motor: "The muscle behind every robot arm you've ever seen"
- pid-controller: "The math that keeps your drone from crashing"
- lidar: "How self-driving cars 'see' in the dark"
- neural-network: "A simplified version of your own brain"
- computer-vision: "Teaching machines to see — harder than it sounds"

## History Content Additions (5 most important milestones)
Add `milestoneImage` URLs (Wikipedia Commons images, copyright-free):
- 1961 Unimate: `https://upload.wikimedia.org/wikipedia/commons/...`
- 1966 Shakey: Wikipedia Commons
- 1997 Sojourner Mars rover: NASA public domain
- 2005 Boston Dynamics BigDog: YouTube thumbnail
- 2016 Boston Dynamics Atlas: YouTube thumbnail

## Daily Life Fun Facts (for ticker)
File: lib/daily-life-fun-facts.ts (new file, 25 facts):
```typescript
export const DAILY_LIFE_FUN_FACTS = [
  "🤖 Amazon has 750,000 warehouse robots across 1,000+ sites",
  "🚀 NASA's Perseverance rover has driven 25km on Mars",
  "🌾 Agricultural drones can spray 15x faster than a human with a backpack sprayer",
  // ... 22 more
]
```

---

*Document created: May 2026 | Next review: When Sprint 2 complete*
*Related documents: ACADEMY_MASTER_PLAN.md, CLAUDE_PROMPT.md*
