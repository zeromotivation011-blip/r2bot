# R2BOT — Master Build Prompt for Claude Code

## WHO YOU ARE

You are a senior full-stack engineer, child psychologist, UX designer, instructional designer,
and educationist working on R2BOT — India's most ambitious robotics education platform.
You think deeply before coding. You consider the end user (a 7-year-old kid in Jaipur, a
college student in Chennai, a teacher in a tier-3 town) before writing a single line.

---

## PROJECT CONTEXT

- **Stack:** Next.js 15 + React 19 + TypeScript + Tailwind CSS + Supabase
- **Repo:** ~/Desktop/robot (your working directory — full read/write/execute access)
- **Live site:** https://robot-tan.vercel.app
- **Vercel:** project "robot", team "ravis-projects-a1fd7ab2" (ID: prj_Y8es3LWQyL9fSbPoBtTUbfzjY6WD)
- **Supabase:** https://acrdjpmvdscngldxilgm.supabase.co
- **GitHub:** https://github.com/ravi6703/robot

---

## PERMISSIONS & WORKING STYLE

You have full permissions. Make changes directly across any file. Do not ask for
confirmation on individual edits — implement, then tell me what you did and what to test.
When you finish a task, run `npm run type-check` to verify. If something breaks, fix it
before telling me it's done. Never leave type errors behind.

---

## CODING STANDARDS

- TypeScript strict mode — no `any` unless truly unavoidable
- Tailwind for layout/spacing; inline styles only for dynamic/runtime values
- All new components → `/components/` directory
- All data, logic, utilities → `/lib/` directory
- Client components: suffix `Client.tsx`, always start with `'use client'`
- Server components: no suffix, never import browser APIs
- Supabase in server components → `lib/supabase/server.ts`
- Supabase in client components → `lib/supabase/client.ts`
- No new npm dependencies without flagging it to me first

---

## TASK 1 — HOMEPAGE FIXES (Quick)

### Already done — verify these are in place:
- `app/HomeClient.tsx` → tagline changed to "Learn Robotics. Build India's Future."
- Stats row shows: `50 Countries Mapped`, `14 Kids Levels`, `9 Simulators`
  (no "261 Concepts Explained", no "Free Forever")
- Ticker no longer says "💡 Free Forever" — now says "🇮🇳 Made in India"

### Also check and fix:
- Search the entire codebase for any other occurrence of "free forever" (case-insensitive)
  and remove or replace all of them
- Search for "India's Robotics Revolution" — remove all remaining occurrences
- The subtitle under the hero h1 currently says "Learn robotics from scratch — in your
  language, at your pace, completely free." — change to:
  "From curious beginner to confident builder. In Hindi, English, or both. At your pace."
- The Hindi tagline `रोबोटिक्स सीखो, भारत बदलो` is great — keep it

---

## TASK 2 — NAVIGATION: LEARN MENU OPTIMISATION

**File:** `components/Nav.tsx`

### Already done — verify in place:
- Learn menu trimmed to 7 items max
- "Start Here" renamed to "Find My Level"
- "Robot World (Kids)" renamed to "Kids Zone · Play & learn"

### Further improvements:
- The Learn dropdown is still rendered as a plain vertical list visually.
  Redesign the dropdown panel into a **two-column layout**:
  - LEFT column (wider): Academy track-grid + Atlas link
  - RIGHT column (narrower, highlighted panel): "Kids Zone" card at top,
    "Find My Level" card below it, "R2 Co-pilot" card at bottom.
    This right column should have a subtle amber/blue gradient background
    to draw attention to the highest-value entry points.
- Each item in the left column should have: icon + label (bold) + sub (muted).
  Hover state: background highlight, slight left-border accent in the track's colour.
- On mobile the dropdown becomes a full-screen slide-over with large tap targets
  (min 52px height per item). No tiny text. No scrolling within the menu itself.
- Remove "Explore" catch-all link — instead add a thin "More →" text link at the bottom
  of the left column that goes to `/atlas` (the discovery hub).

---

## TASK 3 — DIAGNOSTIC TEST: COMPLETE REIMAGINING

**Files:** `app/diagnostic/DiagnosticClient.tsx`, `app/diagnostic/page.tsx`

### The problem with the current version:
The first question shown to a new user is a hard scenario question about a delivery robot
and control loop architecture. A student with zero robotics background reads this, feels
stupid, and leaves. The test is text-only, has no images, no adaptive branching, and no
hands-on element. It feels like an exam, not a discovery experience.

### The new experience: "Find Your Spark"

**Tone:** Warm, curious, like a conversation with a knowledgeable friend.
Not "10-question diagnostic test." Call it: **"Find Your Starting Point — 5 minutes"**

**Phase 1 — Warm-up (2 questions, always shown, dead simple)**
These are full-screen illustrated questions with big tap targets. No text-only answers.

  Q1 — Show 4 large images: a Roomba, a calculator, a traffic light, a car.
  Ask: "Which of these do you think is a robot? (tap all that apply)"
  All answers are valid — this is calibration, not scoring.
  After they answer, a brief one-line explanation appears for each item.
  Purpose: breaks the ice, shows imagery, signals "this is interactive."

  Q2 — "Have you ever built or programmed anything? (tap the closest)"
  Options (with icons):
    🧱 No, never tried
    📱 I've used apps or games
    🔧 I've built something physical (Lego, circuits, etc.)
    💻 I've written some code
  Purpose: routes them to the right difficulty band immediately.

**Phase 2 — Adaptive questions (4–7 questions, branching based on Phase 1)**

  Band A (answered "No, never tried" or unclear) → Start with:
    - Visual questions: "Look at this robot arm. Which part is its 'hand'?" (labelled diagram)
    - Analogy questions: "A robot's sensor is like a human's ___?" with 4 illustrated options
    - Simple true/false with images
    Max difficulty: 2/5. Goal: confirm they belong in Spark track.

  Band B (some experience) → Mix of:
    - Component identification diagrams
    - "What happens next?" scenario strips (3-panel comic-style, tap the correct 3rd panel)
    - One light calculation (like the encoder math — but with a visual diagram)
    Max difficulty: 3/5. Routes to Wire or Forge.

  Band C (code/build experience) → Current question style is fine here:
    - Scenario reasoning questions
    - One architecture question
    - One debugging scenario
    Max difficulty: 5/5. Routes to Forge or Edge.

  Branching logic: each question has `onCorrect: nextQuestionId` and
  `onWrong: easierQuestionId`. The question pool has ~20 questions total
  but any single run shows only 6–8. Build this as a decision tree in
  `lib/diagnostic-questions.ts` with full TypeScript types.

**Phase 3 — One hands-on mini-activity (always shown, fun)**
  "Help this robot find its way home!"
  A 5×5 grid. Robot at top-left, home at bottom-right, 2 obstacles.
  Child taps directional arrows (↑ ↓ ← →) to build a sequence of up to 8 moves.
  Hits "Go!" and the robot animates along the path.
  If they reach home → celebration. If not → Spark says "Almost! Want to try again?"
  This is NOT scored. It's a way to see spatial/logical intuition.
  Even if they fail, they proceed.

**Result screen — personalised card:**
  Not just "You're at Spark level."

  Show:
  - A large illustrated card with the track name and a character visual
  - 3 bullet "what we learned about you" points, generated from their answers:
    e.g. "You recognise robots in real life ✓", "Sensors are a new concept for you",
    "You think logically — the path puzzle showed that!"
  - A 15-second teaser video (or animated GIF) of what their first lesson looks like
  - Big CTA button: "Start [Track Name] → First Lesson"
  - Secondary link: "Not sure? Take me to the Academy overview"

**Visual design:**
  - Full-screen question cards (no header/footer visible during the test)
  - Progress shown as animated dots at top, not "Question 3 of 8"
  - Question images: SVGs stored in `/public/images/diagnostic/`
    (create placeholder SVGs for now, I'll replace with real art later)
  - Correct answer feedback: green glow, Spark face appears briefly saying "Nice!"
  - Wrong answer: Spark stumbles slightly, says "Hmm, not quite — here's why:"
    followed by a one-line explanation before moving on
  - Timer: NO timer. This is not an exam.

**Data structure to build in `lib/diagnostic-questions.ts`:**
```typescript
type QuestionType = 'multi-image-select' | 'self-report' | 'labelled-diagram'
  | 'analogy' | 'scenario-strip' | 'calculation' | 'path-puzzle'

interface DiagnosticQuestion {
  id: string
  band: 'A' | 'B' | 'C' | 'warmup'
  type: QuestionType
  prompt: string
  image?: string           // path to /public/images/diagnostic/xxx.svg
  options: {
    label: string
    image?: string
    correct: boolean
    explanation?: string   // shown after answering
  }[]
  onCorrect: string        // next question id, or 'result'
  onWrong: string          // easier question id, or 'result'
  sparkReaction: {
    correct: string        // what Spark says
    wrong: string          // what Spark says
  }
}
```

---

## TASK 4 — KIDS ZONE: COMPLETE PRODUCT REIMAGINING

**Files:** `app/kids/**`, `lib/kids-world-data.ts`, `lib/kids-progress.ts`,
`lib/kids-audio.ts`, `components/` (any kids-specific components)

This is the biggest task. Treat it as a separate product within R2BOT.
Think: Duolingo meets a storybook app meets a game. Not a website with lessons.

---

### 4A — PHILOSOPHY (read this before touching any code)

You are designing for children aged 5–12. Their brain works differently:

1. **Voice first, text second.** A 6-year-old cannot read fluently.
   Every single piece of content — instructions, explanations, praise, hints —
   must be speakable. Implement Web Speech API (SpeechSynthesis) throughout.
   Default behaviour: when a new panel appears, Spark automatically reads it aloud.
   A mute button exists but voice is ON by default.

2. **8-second rule.** If nothing moves within 8 seconds, a child disengages.
   Every screen must have ambient motion: Spark breathing, stars drifting,
   background elements animating gently. Nothing is ever fully static.

3. **Micro-celebrations are mandatory.** Every correct answer triggers:
   - Spark jumps or dances (CSS keyframe)
   - Confetti or stars burst from the answer
   - A jingle plays (use existing sound system)
   - XP counter visually ticks upward
   - Spark says a randomised praise line ("Woah, you're amazing!", "YES! That's it!")
   Wrong answers: Spark stumbles, makes a goofy sound, says something encouraging.
   NEVER show a red ✗ or the word "Wrong" or "Incorrect" in cold text.

4. **Story beats facts.** Every zone has a narrative problem Spark is trying to solve.
   Children aren't "completing lessons" — they're helping Spark.
   Zone 1 (Spark's Garden): Spark's garden robot is broken. Each level teaches
   one concept that fixes one part of the robot. By end of zone, the garden robot works.
   This narrative must be present on every level screen.

5. **Indian context is a superpower.** Keep and expand all existing Indian analogies.
   Add more: auto-rickshaw GPS, chai-making sequence, dabbawala routing,
   railway reservation system as a database analogy. These land instantly.

6. **Layman language always.** Not "the actuator converts energy."
   Say: "This is the robot's muscles — it's what makes the robot actually MOVE!"
   Read every line of content as if speaking to a 7-year-old. If you wouldn't
   say it to a child, rewrite it.

---

### 4B — SPARK CHARACTER: MOOD SYSTEM + ANIMATION

Spark currently exists as a static SVG inline in components.
Rebuild as a proper animated React component: `components/kids/SparkCharacter.tsx`

**Mood states (all CSS keyframe animated):**
```
idle       → gentle scale 1→1.03→1 breathing, every 2.5s
talking    → mouth opens/closes at ~3Hz while speechSynthesis is speaking
happy      → small bounce (translateY 0 → -12px → 0), 0.4s ease
thinking   → head tilts 8°, question mark floats up from head
celebrating → jump (translateY -30px) + arms up, confetti burst from position
oops       → wobble left-right (-8° → 8° → -4° → 0°), 0.5s
proud      → chest out (scale 1.05), chin up (rotate -5°)
surprised  → scale 1 → 1.15 → 1 with wide eyes (SVG path swap)
```

**Voice integration:**
When `sparkSays(text)` is called, Spark enters `talking` mood for the duration
of the speech, then returns to `idle`. Implement `sparkSays()` in `lib/kids-audio.ts`:

```typescript
export function sparkSays(text: string, onDone?: () => void): void {
  if (!('speechSynthesis' in window)) {
    onDone?.()
    return
  }
  window.speechSynthesis.cancel()
  const utt = new SpeechSynthesisUtterance(text)
  utt.rate = 0.88        // slightly slower — kids need time to process
  utt.pitch = 1.25       // slightly higher — friendlier, robot-like
  utt.lang = 'en-IN'     // Indian English accent
  utt.volume = 1
  utt.onend = () => onDone?.()
  window.speechSynthesis.speak(utt)
}

export function sparkListen(
  onResult: (transcript: string) => void,
  onError?: () => void
): (() => void) {
  const SR = (window as any).SpeechRecognition
    || (window as any).webkitSpeechRecognition
  if (!SR) { onError?.(); return () => {} }
  const rec = new SR()
  rec.lang = 'en-IN'
  rec.interimResults = false
  rec.maxAlternatives = 3
  rec.onresult = (e: any) => onResult(e.results[0][0].transcript.toLowerCase().trim())
  rec.onerror = () => onError?.()
  rec.start()
  return () => rec.abort()
}
```

SparkCharacter component props:
```typescript
interface SparkProps {
  mood: SparkMood
  size?: number          // default 120
  speaking?: boolean     // triggers talking animation
  onClick?: () => void   // tap Spark to repeat last line
}
```

---

### 4C — WORLD MAP: FULL VISUAL REDESIGN

**File:** `app/kids/world/WorldMapClient.tsx`

Current: vertical list of zone buttons. This is not a world map, it's a list.

New: An **illustrated SVG storybook map** rendered as a single large SVG (or canvas).
Zones are geographic areas on a fantasy world, connected by a winding dotted path.
No list. No rows. A place you can *see*.

Zone layout (arrange in a fun non-linear way):
- 🌱 Spark's Garden (Zone 1) — bottom left, green rolling hills, flowers, little bot
- 🏭 Factory World (Zone 2) — center, glowing factory with smoke (looping CSS animation)
- 🌊 Ocean Bot (Zone 3) — right side, waves, submarine robot
- 🌌 Space Station (Zone 4) — top center, stars, satellite
- 🧠 Brain Lab (Zone 5) — top left, neural network patterns, glow
- 🔮 Future City (Zone 6) — top right, futuristic skyline

Each zone on the map has:
- Illustrated visual (SVG shape/scene for that zone)
- Ambient CSS animation (leaves blowing, water rippling, gears turning, stars twinkling)
- A floating star count showing stars earned in that zone
- Lock icon if not yet unlocked (greyed out, slightly blurred)
- Sparkle/glow effect on the current zone

Spark's avatar sits on the path at the current position and can be animated
walking between zones when progress is made.

Tapping a zone: if unlocked, zooms in with a CSS scale transform and shows
a "zone details" overlay (zone name, tagline, levels list, "Enter Zone" button).
If locked, Spark appears and says "You need X more stars to unlock this place!"

Path between zones: SVG dotted/dashed curved line.
Stars earned appear as actual little star icons on the path segments.

Implement this as pure SVG + CSS — no canvas, no external library.
The map should be responsive (works on mobile, tablet, desktop).
On mobile, the map is zoomable/pannable with touch events.

---

### 4D — ENTRY FLOW REDESIGN

**File:** `app/kids/KidsEntryClient.tsx`

Current: Typewriter intro (slow) → age picker → redirect.

The typewriter is charming but too slow for returning users.

New flow:

**First visit:**
1. Animated entry: Spark flies in from off-screen (CSS translateX animation)
2. Spark immediately speaks (voice): "Hi! I'm Spark! 🤖 I'm going to teach you
   everything about robots! But first — how old are you?"
3. Age picker: not small numbered buttons. Large illustrated cards showing
   a child of that age doing something robot-related. Ages grouped:
   - "I'm 5 or 6" — card shows a child spotting a robot vacuum
   - "I'm 7 or 8" — card shows a child building with blocks/circuits
   - "I'm 9 or 10" — card shows a child coding on a tablet
   - "I'm 11 or 12" — card shows a child with an Arduino/robot arm
4. After selection, Spark celebrates and says "[Age] years old? Perfect!
   You're going to LOVE what I have to show you!" → portal transition
   (screen spins/zooms into the world map)

**Returning user (has saved progress):**
Skip the intro entirely. Show a "Welcome back!" screen:
- Spark waves and says "[Name/Champ], you're back! Ready to keep going?"
- Shows: stars earned, current zone, next level title
- Big "Continue Adventure" button
- Small "Start Over" link (bottom, not prominent)

---

### 4E — LEVEL SCREEN REDESIGN

**Files:** `app/kids/challenge/[missionId]/ChallengeClient.tsx` and zone level pages

Replace the current scrolling lesson layout with **full-screen panel navigation**
— think storybook pages, not a webpage. No scrolling within a level.
Swipe or tap "→" to advance panels.

**Panel sequence for every level:**

Panel 1 — STORY (Spark arrives with the problem)
  - Full-screen illustrated background for the zone (e.g., garden for Zone 1)
  - Spark character (animated, mood: excited)
  - 2–3 sentences of story context, voiced by Spark automatically
  - Child taps anywhere or the "→" button to continue
  - Example: "Oh no! My garden robot's EYES aren't working! 😱 It can't see
    where to go! Can you help me learn about SENSORS so we can fix it?"

Panel 2 — CONCEPT (one idea, explained simply)
  - Large illustrated visual (the concept shown as a cartoon/diagram)
  - ONE concept name in big, bold text
  - TWO sentences max. In child language. Voiced automatically.
  - The Indian analogy highlighted in a colourful callout box
  - Spark in "thinking" mood, then "proud" mood as explanation lands
  - Example concept: "SENSOR — a robot's eye and ear"
    Visual: cartoon robot with glowing eyes
    Explanation: "A sensor helps the robot FEEL the world around it.
    It's like how YOUR eyes help you see, and YOUR ears help you hear!"
    Analogy box: "🍛 Just like you can SMELL when Mum is making dal from
    the kitchen — the robot's sensor smells, sees, and feels things too!"

Panel 3 — ACTIVITY 1 (easiest activity, warm-up)
  - Instructions voiced by Spark before the activity starts
  - Large tap targets (min 60px × 60px)
  - Illustrated items, not text labels where possible
  - Correct: Spark celebrates (mood: celebrating), sound, confetti
  - Wrong: Spark stumbles (mood: oops), encouragement, can try again
  - Hint button: after 15 seconds of inactivity, Spark's eye glows and
    a subtle hint arrow/highlight appears
  - "Voice help" button: Spark re-reads the instructions

Panel 4 — FUN FACT (delight moment)
  - Spark in "surprised" mood
  - Bold "Did you know?" heading
  - One amazing fact, voiced
  - Small animation related to the fact
  - Example: "Did you know? The Mars Rover on PLANET MARS has sensors that
    can 'smell' the Martian air from 140 million kilometres away from Earth! 🚀"

Panel 5 — ACTIVITY 2 (slightly harder, builds on concept)
  Same activity framework as Panel 3.

Panel 6 — CELEBRATION + REWARD
  - Full-screen celebration: confetti, Spark dances, stars fly
  - XP counter ticks up visually (number rolls up)
  - "You earned X stars!" with actual animated stars floating to the counter
  - Spark says a personalised praise line (pick from sparkSays array)
  - Shows the robot part collected (if zone boss unlocked)
  - Two buttons: "Next Level →" and "Back to Map"

---

### 4F — ACTIVITY COMPONENTS: FULL REBUILD

Build these as reusable React components in `components/kids/activities/`

**`TapToReveal.tsx`**
- Cards are illustrated (image + label), not just text
- 3D flip animation on tap (CSS perspective transform)
- Spark reacts with a voiced line when each card is flipped
- All cards must be flipped to proceed
- Card back shows: fact + a small "wow" animation

**`DragSort.tsx`**
- Items are illustrated cards with images, not text strings
- Drop zones are visual containers with clear affordance (dashed border + emoji)
- Drag animation: card scales up 1.1x, gets a shadow, follows cursor/touch
- Correct drop: card snaps in with a satisfying sound, slight bounce
- Wrong drop: card shakes and returns to origin
- On mobile: tap-to-select then tap-to-place (not drag — drag is hard for small fingers)

**`SpotTheRobot.tsx`**
- Full illustrated scene (kitchen, street, classroom, etc.)
  rendered as an SVG or illustrated PNG
- Robots are hidden within the scene, each has an invisible tap target
- Spark narrates: "I can see 3 robots hiding in this kitchen! Can you find them all?"
- Found robots: highlight with a glowing circle, Spark cheers
- Hint: after 20 seconds, a subtle sparkle appears near an unfound robot
- Scene examples needed: kitchen (roomba, microwave robot), street
  (traffic light AI, delivery bot), classroom (projector, computer)

**`SequenceBuilder.tsx`**
- Items are illustrated step-cards (images showing the action)
- Not text strings — pictures
- Drag or tap-to-order interface
- Show the assembled sequence "running" as a mini-animation before confirming
- Wrong order: the animation shows something funny going wrong
  (robot tries to eat the chair before sitting down, etc.)

**`MiniSimulate.tsx`** (ages 8–12 only — check zone.ageRange before showing)
- Grid is visually appealing (not just grey squares)
  — grass tiles, robot sprite, home/goal as a house icon
- Controls: large arrow buttons (not keyboard)
- Animation: robot sprite walks tile by tile, not instant teleport
- If robot hits an obstacle: bumps back, Spark says "Oops, there's a wall there!"
- Success: robot reaches home, door opens, celebration

**New activity: `BuildABot.tsx`**
- An empty robot outline on screen
- Draggable illustrated robot parts appear on the side:
  camera eyes, speaker mouth, wheel feet, arm, sensor antenna, battery chest
- Drag each part onto the robot outline (snap into position)
- When a part snaps in: Spark explains what that part does in one voiced sentence
- When all parts placed: the robot "comes alive" (lights up, waves)
- No right/wrong — pure exploration. Every part placement is celebrated.

**New activity: `VoiceAnswer.tsx`** (ages 8–12 only)
- Spark asks a question and shows a mic button
- Child taps mic and speaks their answer
- Web Speech Recognition captures it
- Fuzzy-match against accepted answers (e.g., "sensor", "sensors", "the sensor")
  — use simple string includes/similarity check, not strict equality
- If match: celebration
- If no match or unclear: Spark says "I heard '[transcript]'... close!
  The answer is [correct answer]. Now YOU say it!" — child repeats it
  (this is a known learning technique: active retrieval + saying it aloud)
- Fallback: if SpeechRecognition not supported, show text options instead

---

### 4G — VOICE MODE: GLOBAL IMPLEMENTATION

Add a global voice mode toggle to the kids zone layout.

In `app/kids/layout.tsx`:
- Floating 🔊 button, bottom-left, always visible
- When ON (default): Spark reads every new piece of text automatically as it appears
  Voice mode state stored in localStorage: `r2bot_kids_voice`
- When OFF: all auto-speak is disabled; child can still tap Spark to hear content

The `useKidsVoice()` hook in `lib/kids-voice.ts`:
```typescript
export function useKidsVoice() {
  const [voiceOn, setVoiceOn] = useState(() => {
    if (typeof window === 'undefined') return true
    return localStorage.getItem('r2bot_kids_voice') !== 'false'
  })

  const speak = useCallback((text: string, onDone?: () => void) => {
    if (!voiceOn) { onDone?.(); return }
    sparkSays(text, onDone)
  }, [voiceOn])

  const toggle = () => {
    setVoiceOn(v => {
      const next = !v
      localStorage.setItem('r2bot_kids_voice', String(next))
      if (!next) window.speechSynthesis?.cancel()
      return next
    })
  }

  return { voiceOn, speak, toggle }
}
```

Every panel in a level uses `speak()` from this hook when it mounts.
Always cancel pending speech when unmounting or navigating away.

---

### 4H — CONTENT LANGUAGE AUDIT

Go through ALL `sparkSays`, `laymanExplanation`, `analogy`, `storyHook`, and
`funFact` fields in `lib/kids-world-data.ts`.

Rewrite any line that:
- Uses jargon without immediate simple explanation
- Is longer than 2 sentences
- Wouldn't make sense to a 7-year-old without context
- Uses passive voice ("is used to", "can be seen", "is known as")

Replace with:
- Active, first-person or direct address: "This sensor SEES things!"
- Short sentences. Max 15 words per sentence for ages 5–8.
- Enthusiasm: exclamation marks are fine here. So are sound effects in text ("WHOOSH!").
- Indian names and contexts: Arjun, Priya, Deepa, dhabas, auto-rickshaws, cricket.

---

### 4I — ANIMATIONS: GLOBAL KIDS CSS

Create `app/kids/kids-animations.css` (imported in kids layout):

```css
/* Spark breathing */
@keyframes spark-breathe {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.03); }
}

/* Spark bounce */
@keyframes spark-bounce {
  0%, 100% { transform: translateY(0); }
  40% { transform: translateY(-16px); }
  60% { transform: translateY(-8px); }
}

/* Spark wobble (oops) */
@keyframes spark-wobble {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-8deg); }
  40% { transform: rotate(8deg); }
  60% { transform: rotate(-4deg); }
  80% { transform: rotate(4deg); }
}

/* Spark jump-celebrate */
@keyframes spark-celebrate {
  0% { transform: translateY(0) scale(1); }
  30% { transform: translateY(-30px) scale(1.1); }
  50% { transform: translateY(-20px) scale(1.08); }
  70% { transform: translateY(-28px) scale(1.12); }
  100% { transform: translateY(0) scale(1); }
}

/* Confetti particle */
@keyframes confetti-fall {
  0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
}

/* Star float */
@keyframes star-float {
  0% { transform: translateY(0) scale(1); opacity: 1; }
  100% { transform: translateY(-60px) scale(1.5); opacity: 0; }
}

/* Unlock pulse */
@keyframes zone-unlock {
  0%, 100% { box-shadow: 0 0 0 0 rgba(251,191,36,0.4); }
  50% { box-shadow: 0 0 0 20px rgba(251,191,36,0); }
}

/* Ambient glow for current zone */
@keyframes zone-glow {
  0%, 100% { filter: brightness(1) drop-shadow(0 0 8px rgba(251,191,36,0.6)); }
  50% { filter: brightness(1.1) drop-shadow(0 0 20px rgba(251,191,36,0.9)); }
}
```

Build a `Confetti.tsx` component that spawns 30–40 coloured particles on trigger.
Can be triggered from anywhere via a `useConfetti()` hook.

---

### 4J — GAMES: MORE INTERACTIVE

The current `app/kids/challenge/[missionId]/` pages have "boss challenge" missions.
These are where real game mechanics should live. Currently they're just forms.

Redesign boss challenges as proper mini-games:

**Zone 1 Boss — "Fix Spark's Garden Robot"**
  Block-code style game. 5 coloured command blocks (Move Forward, Turn Left,
  Turn Right, Sense, Wait). Child drags blocks into a sequence.
  Hits "Run" → animated robot follows the sequence on a garden grid.
  Goal: reach the broken plant and water it.
  3 attempts, each with a slightly different layout.
  Visual: garden grid with grass, paths, a broken robot, a plant.

**Zone 2 Boss — "Factory Line Bug"**
  A factory conveyor belt animation runs. Items pass by.
  3 items are wrong (wrong shape, wrong colour). Child must spot and tap them
  before they fall off the end. Timer: 30 seconds.
  Tests: attention, visual pattern recognition.

**Zone 3 Boss — "Underwater Navigator"**
  Ocean grid, submarine robot, 3 waypoints to visit in order.
  Child writes a sequence of moves. Limited moves (e.g., 10 max).
  Must visit all 3 waypoints using exactly the right path.
  Tests: planning, sequence logic.

Each boss challenge:
- Has a story intro (Spark explains the problem, voiced)
- Shows a tutorial on first play
- Has 3 "lives" (wrong attempts don't reset completely, just add a small penalty)
- On completion: robot part is awarded with a dramatic reveal animation
  (part flies out and attaches to My Robot)

---

### 4K — "MY ROBOT" PAGE

**File:** `app/kids/my-robot/`

This page shows the robot the child is building across all zones.
Currently it's basic. Reimagine it as a **trophy room + robot builder**.

- Large robot outline in the center, parts revealed as zones are completed
- Uncompleted parts shown as ghost/faded outlines with a lock icon
- Clicking a revealed part: Spark explains what that part does (voiced)
- Below the robot: stats (total stars, zones completed, levels done, time played)
- Share button: generates a shareable image of their robot with their star count
  (use html2canvas which is already in dependencies)
- At the top: the robot has a NAME field — child can name their robot
  (saved to localStorage, shown on the world map too)

---

## TASK 5 — KIDS ZONE AGE RANGE UPDATE

The current metadata and some UI says "Ages 5–12" but the nav previously said
"Ages 5–16". Standardise throughout to **Ages 5–14** (more realistic upper bound
for the content depth you're building, covers middle school).

Update in:
- `app/kids/page.tsx` metadata
- `components/Nav.tsx` kids zone item sub-text
- Any occurrence of "5–16" in the entire codebase
- `lib/kids-world-data.ts` zone ageRange fields as appropriate

---

## IMPLEMENTATION ORDER

When I say "go", tackle in this order:

1. **Voice system** — `lib/kids-audio.ts` (sparkSays, sparkListen) + `lib/kids-voice.ts` (useKidsVoice hook)
2. **Spark character** — `components/kids/SparkCharacter.tsx` with all mood states + animations
3. **Animations CSS** — `app/kids/kids-animations.css` + Confetti component
4. **Diagnostic question data** — `lib/diagnostic-questions.ts` with full question tree
5. **Diagnostic client** — `app/diagnostic/DiagnosticClient.tsx` full rebuild
6. **Kids entry flow** — `app/kids/KidsEntryClient.tsx` redesign
7. **World map** — `app/kids/world/WorldMapClient.tsx` SVG storybook map
8. **Level screen** — panel-based level layout with voice integration
9. **Activity components** — all 6 activities rebuilt in `components/kids/activities/`
10. **Boss challenges** — mini-games for zones 1–3 first
11. **My Robot page** — trophy room redesign
12. **Content audit** — rewrite all sparkSays + laymanExplanation in kids-world-data.ts

---

## HOW TO WORK

- Implement one numbered task at a time
- After each task: run `npm run type-check`, fix any errors
- Tell me: what you changed, what files were modified, what to test in browser
- If a task requires a new SVG illustration placeholder, create a simple geometric
  SVG with the right filename and dimensions — I'll replace with real art later
- Never leave a TODO comment in code — either implement it or tell me it needs
  a separate task
- When you hit a decision that changes scope (e.g., "to do the SVG map I need
  to add a touch library"), flag it before doing it

Let's build something kids in India will love. Go.
