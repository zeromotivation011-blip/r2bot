# R2BOT Academy — Master Plan & Build Prompt
## "The World's Best Robotics Academy"
### Version 1.0 — May 2026

---

# PART 1: CURRENT STATE AUDIT

## What Exists Today (Honest Assessment)

The current Academy is a **content reader, not a learning system**.

- 4 tracks: Spark (6 lessons), Wire (6 lessons), Forge (4 lessons), Edge (3 lessons)
- Content format: MDX files rendered with ReactMarkdown — pure text + headings
- No video, no embedded simulations, no graded assessments
- Progress tracking: binary completion flag only (done / not done)
- No course structure (modules) — just a flat list of lessons per track
- Wire, Forge, Edge all show "Coming soon" CTA — 75% of the Academy is empty
- No certificates, no monetization layer, no cohorts
- Lesson extras: PDF download, bookmark, Ask R2 bubble, discussion (Supabase-backed)
- No SCORM, no xAPI, no LRS
- No instructor tooling
- No enrollment system

**Verdict:** The bones are good (track structure, Atlas integration, co-pilot, clean UI).
The content and learning systems need to be built from scratch.

---

# PART 2: GLOBAL COMPETITOR INTELLIGENCE

## What the Best Platforms in the World Do — and What We Steal

### Coursera (Stanford, Google, IBM partnerships)
**What works:**
- Structured syllabus: Week 1 → Week 2 progression with clear time estimates
- Specialisations = course bundles that lead to a credential
- Audit for free, pay for certificate + graded assignments
- Peer-reviewed projects (community grades each other's work)
- Personalised recommendations based on learning profile
- Progress email nudges ("You're 2 lessons from your weekly goal")

**What we steal:** Specialisation bundles, audit-vs-verified model, peer review, weekly goal tracking

---

### Udacity (Nanodegrees)
**What works:**
- Project-based learning — every module ends with a substantial project
- Human mentor feedback on projects (not just auto-graded)
- Career services integration (resume review, interview prep)
- In-browser coding workspaces inside lessons
- "Review my project" flow with structured rubric

**What we steal:** Project-first design, rubric-based human review, in-browser coding

---

### Brilliant.org
**What works:**
- Zero passive video — everything is interactive problem-solving
- Step-by-step guided problems with instant feedback at each step
- Spaced repetition: revisits weak concepts automatically
- Adaptive difficulty: gets harder as you improve, easier if you struggle
- Problems feel like puzzles, not tests
- No grades — just "did you get there with or without hints?"

**What we steal:** Interactive problem blocks (not just MCQ), step-by-step guided problems,
spaced repetition system, hint system that doesn't penalise curiosity

---

### Khan Academy
**What works:**
- Mastery-based progression: cannot move to next topic until current topic is mastered
  (not just "watched the video" — must get 5 correct answers in a row)
- Energy points + badges create intrinsic motivation
- Teacher/parent dashboard: see exactly where each student is stuck
- Video + practice together: every video has a paired exercise set
- Hints available (3 levels) without marking you wrong for using them

**What we steal:** Mastery gate (must score 80% to unlock next lesson),
hint levels, paired video + practice design, teacher/parent tracking dashboard

---

### Codecademy
**What works:**
- In-browser IDE: write code, run it, see output — never leave the lesson
- Immediate feedback on code: "This output is wrong. Expected X, got Y. Hint: check line 4"
- Bite-sized lessons: 5–10 minutes max
- "Check" button removes the anxiety of submission
- Progress is visible on every page (% complete, streak)
- Projects build on previous lessons (cumulative)

**What we steal:** In-browser code runner inside lesson content blocks,
live feedback on code output, "check my code" not "submit for grading"

---

### Carnegie Mellon Robotics Academy
**What works:**
- Virtual robot embedded *inside* the curriculum (not a separate tab)
- NGSS/STEM standards alignment — each lesson maps to a learning standard
- Teacher progress dashboard
- Progression: Concept → Robot challenge → Reflection
- Physical robot and virtual robot versions of same curriculum

**What we steal:** Simulation embedded inside lesson (not separate page),
learning objectives mapped to standards, concept → challenge → reflection flow

---

### Duolingo
**What works:**
- Streaks are the single most powerful retention mechanism in education tech
- Hearts/lives: mistakes have a small cost → increases attention
- Leaderboards: weekly competition with friends or strangers
- Celebration design: every correct answer is a dopamine hit
- Path format: each node on the path has a clear type (lesson, practice, checkpoint)
- Bite-sized: 5–10 minutes to complete one node
- Notifications timed to when you usually practice

**What we steal:** Streak system (already partially there), hearts/lives for quizzes,
weekly leaderboard, path visual for course progress, timed notifications

---

### Pluralsight
**What works:**
- Skill IQ: 20-question adaptive test that tells you your skill level (1–300)
- Role IQ: measures readiness for a specific job role
- Learning paths tied to job roles (e.g., "ROS2 Developer", "Robotics QA Engineer")
- Channels: curated learning for teams
- Analytics for managers: see team skill gaps

**What we steal:** Skill IQ test (our diagnostic, but better),
role-based learning paths, team/school analytics dashboard

---

### MasterClass
**What works:**
- Cinematic production quality makes watching feel like a privilege, not a chore
- Storytelling structure: every lesson has a narrative arc
- Expert instructors with real credibility
- Workbooks: downloadable PDF companion for every course
- Community: discussion connected to specific video timestamps

**What we steal:** Workbook download per lesson/module, timestamp-linked discussion,
credentialed instructor branding, narrative structure in video scripts

---

### freeCodeCamp
**What works:**
- Entirely free, certificate at end of each path
- All certificates require building real projects, not passing tests
- Curriculum is open-source and community-maintained
- Forum community is enormous and searchable
- "Build X" format: clear deliverable for every project

**What we steal:** Project-as-certificate (certificate only issued when project passes review),
open curriculum that community can contribute to

---

### India-specific Insight: upGrad, BYJU'S, Unacademy
**What works in the Indian market:**
- Live classes with top educators (Unacademy's killer feature)
- Doubt-clearing sessions (not async Q&A — scheduled live doubt hours)
- EMI payment options (₹999/month feels better than ₹11,999/year)
- Certificate recognition: IIT/IIM branded certificates convert well
- Vernacular content: Hindi-medium courses have massive untapped demand
- Placement assistance: "Get a job or money back" resonates strongly
- WhatsApp integration: reminders, Q&A, community via WhatsApp groups

**What we steal:** Hindi toggle on every lesson, WhatsApp notification option,
EMI pricing, placement-linked certificate programs, live doubt sessions (Phase 2)

---

# PART 3: R2BOT ACADEMY — THE VISION

## One-Line Vision
**"The Duolingo of Robotics — where every lesson teaches you something you can build."**

## Design Principles (non-negotiable)

1. **Every lesson has a deliverable.** Not "read this." → "After this lesson, you will have [X]."
   Could be a quiz score, a working code snippet, a simulation output, a physical build.

2. **You cannot passively complete anything.**
   Watching a video counts for 20% of lesson completion.
   The other 80% is earned by doing (quiz, code, simulation, project).

3. **Mastery gates.** You need 75%+ on a lesson's assessment to mark it complete.
   But you have unlimited retries, always with different question permutations.

4. **Spaced repetition built in.** Every 5 lessons, a "Checkpoint" lesson appears
   that reviews concepts from the last 5. You can't skip it.

5. **Indian context first.** Every course has:
   - ₹ pricing for all hardware referenced
   - Indian career outcome stats ("Robotics engineers in India earn ₹8–25L/year")
   - At least one Indian real-world example per module
   - Hindi translation available for all text content

6. **Mobile-first.** 63% of Indian learners are on mobile. Every content block
   must render perfectly on a 375px screen. Videos load at 360p by default,
   switchable to 720p.

7. **Offline-capable for key content.** Service worker caches text + quiz content
   for the current lesson. Learners in low-bandwidth areas can start a lesson
   on WiFi and complete it offline.

---

# PART 4: ARCHITECTURE

## Data Model (Supabase Tables)

```sql
-- COURSE CATALOG
CREATE TABLE courses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            TEXT UNIQUE NOT NULL,           -- 'spark-robotics-foundations'
  title           TEXT NOT NULL,
  subtitle        TEXT,
  track           TEXT NOT NULL,                  -- 'spark' | 'wire' | 'forge' | 'edge'
  level           TEXT NOT NULL,                  -- 'beginner' | 'intermediate' | 'advanced' | 'research'
  description     TEXT,
  thumbnail_url   TEXT,
  trailer_url     TEXT,                           -- 60-second course trailer video
  instructor_id   UUID REFERENCES profiles(id),
  price_inr       INTEGER DEFAULT 0,              -- 0 = free
  is_free         BOOLEAN DEFAULT true,
  duration_hours  DECIMAL(4,1),
  total_lessons   INTEGER DEFAULT 0,
  total_xp        INTEGER DEFAULT 0,
  tags            TEXT[],
  prerequisites   TEXT[],                         -- array of course slugs
  certificate_template TEXT,                      -- template ID
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now(),
  language        TEXT DEFAULT 'en',              -- 'en' | 'hi' | 'both'
  cbse_aligned    BOOLEAN DEFAULT false,
  nep_aligned     BOOLEAN DEFAULT false,
  hardware_kit    TEXT                            -- optional hardware kit slug
);

-- MODULES (chapters within a course)
CREATE TABLE modules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
  order_index     INTEGER NOT NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  unlock_after    UUID REFERENCES modules(id),    -- null = always unlocked
  is_checkpoint   BOOLEAN DEFAULT false,          -- spaced repetition review module
  duration_minutes INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- LESSONS (individual learning units within a module)
CREATE TABLE lessons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id       UUID REFERENCES modules(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES courses(id) ON DELETE CASCADE,
  order_index     INTEGER NOT NULL,
  slug            TEXT NOT NULL,
  title           TEXT NOT NULL,
  lesson_type     TEXT NOT NULL,                  -- see LESSON TYPES below
  duration_minutes INTEGER DEFAULT 10,
  xp_reward       INTEGER DEFAULT 100,
  is_free_preview BOOLEAN DEFAULT false,          -- accessible without enrollment
  passing_score   INTEGER DEFAULT 75,             -- % required to mark complete
  content_mdx     TEXT,                           -- rich text content (MDX)
  content_hi      TEXT,                           -- Hindi translation of content
  objectives      TEXT[],                         -- "After this lesson you will..."
  atlas_links     TEXT[],                         -- linked Atlas term slugs
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- CONTENT BLOCKS (modular content within a lesson)
CREATE TABLE content_blocks (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       UUID REFERENCES lessons(id) ON DELETE CASCADE,
  order_index     INTEGER NOT NULL,
  block_type      TEXT NOT NULL,                  -- see BLOCK TYPES below
  data            JSONB NOT NULL,                 -- flexible per block type
  is_required     BOOLEAN DEFAULT true,           -- must complete to finish lesson
  created_at      TIMESTAMPTZ DEFAULT now()
);

-- ENROLLMENTS
CREATE TABLE enrollments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  course_id       UUID REFERENCES courses(id),
  enrolled_at     TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  progress_pct    DECIMAL(5,2) DEFAULT 0,
  last_active_at  TIMESTAMPTZ DEFAULT now(),
  is_paid         BOOLEAN DEFAULT false,
  payment_id      TEXT,
  UNIQUE(user_id, course_id)
);

-- LESSON PROGRESS (granular tracking)
CREATE TABLE lesson_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES lessons(id),
  course_id       UUID REFERENCES courses(id),
  started_at      TIMESTAMPTZ DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  best_score      INTEGER DEFAULT 0,
  attempts        INTEGER DEFAULT 0,
  time_spent_sec  INTEGER DEFAULT 0,
  xp_earned       INTEGER DEFAULT 0,
  UNIQUE(user_id, lesson_id)
);

-- BLOCK PROGRESS (track which blocks completed within a lesson)
CREATE TABLE block_progress (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  block_id        UUID REFERENCES content_blocks(id),
  lesson_id       UUID REFERENCES lessons(id),
  completed_at    TIMESTAMPTZ DEFAULT now(),
  score           INTEGER,
  response_data   JSONB                          -- what the user answered/submitted
);

-- QUIZ ATTEMPTS
CREATE TABLE quiz_attempts (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES lessons(id),
  block_id        UUID REFERENCES content_blocks(id),
  answers         JSONB NOT NULL,
  score           INTEGER NOT NULL,
  passed          BOOLEAN NOT NULL,
  time_taken_sec  INTEGER,
  attempted_at    TIMESTAMPTZ DEFAULT now()
);

-- PROJECT SUBMISSIONS
CREATE TABLE project_submissions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES lessons(id),
  course_id       UUID REFERENCES courses(id),
  content         TEXT,                          -- markdown write-up or code
  repo_url        TEXT,                          -- GitHub link
  demo_url        TEXT,                          -- live demo or video
  images          TEXT[],                        -- screenshots
  status          TEXT DEFAULT 'submitted',      -- submitted|under_review|passed|failed
  grade           INTEGER,                       -- 0-100
  feedback        TEXT,                          -- reviewer feedback
  reviewed_by     UUID REFERENCES auth.users(id),
  submitted_at    TIMESTAMPTZ DEFAULT now(),
  reviewed_at     TIMESTAMPTZ
);

-- COURSE CERTIFICATES
CREATE TABLE course_certificates (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cert_id         TEXT UNIQUE NOT NULL,           -- public verification ID e.g. 'R2B-2026-SP-001234'
  user_id         UUID REFERENCES auth.users(id),
  course_id       UUID REFERENCES courses(id),
  course_title    TEXT NOT NULL,
  user_name       TEXT NOT NULL,
  issued_at       TIMESTAMPTZ DEFAULT now(),
  pdf_url         TEXT
);

-- SPACED REPETITION QUEUE
CREATE TABLE review_queue (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id       UUID REFERENCES lessons(id),
  next_review_at  TIMESTAMPTZ NOT NULL,
  interval_days   INTEGER DEFAULT 1,
  ease_factor     DECIMAL(3,2) DEFAULT 2.5,      -- SM-2 algorithm
  repetitions     INTEGER DEFAULT 0,
  last_score      INTEGER
);

-- INSTRUCTOR PROFILES (future)
CREATE TABLE instructors (
  id              UUID PRIMARY KEY REFERENCES auth.users(id),
  display_name    TEXT NOT NULL,
  bio             TEXT,
  credentials     TEXT[],
  photo_url       TEXT,
  linkedin_url    TEXT,
  courses_count   INTEGER DEFAULT 0
);
```

---

## Lesson Types

```typescript
type LessonType =
  | 'video'           // Primary: watch video, then do exercises
  | 'reading'         // Long-form text article (current MDX format, enhanced)
  | 'interactive'     // Brilliant-style: series of interactive problem blocks
  | 'code-challenge'  // In-browser coding with test runner
  | 'simulation'      // Embedded robotics simulator
  | 'hands-on'        // Physical project instructions + checklist
  | 'quiz'            // Standalone assessment (checkpoint or module quiz)
  | 'project'         // Major assessed project (peer review or auto)
  | 'scorm'           // Embedded SCORM 1.2 or 2004 package
  | 'live'            // Live session (scheduled, Zoom/Google Meet embed)
  | 'podcast'         // Audio lesson (Hindi + English)
```

---

## Content Block Types (data shapes)

```typescript
// VIDEO BLOCK
{
  type: 'video',
  data: {
    provider: 'youtube' | 'vimeo' | 'self-hosted',
    video_id: string,          // YouTube ID or full URL
    title: string,
    duration_seconds: number,
    transcript_en: string,     // full transcript (for accessibility + SEO)
    transcript_hi?: string,    // Hindi transcript
    chapters: { time: number; label: string }[],
    auto_advance: boolean,     // auto-show next block after video ends
    completion_threshold: 0.8  // 80% watch = "watched"
  }
}

// RICH TEXT BLOCK
{
  type: 'text',
  data: {
    content_mdx: string,       // MDX with components
    content_hi?: string,       // Hindi version
    estimated_read_minutes: number
  }
}

// MULTIPLE CHOICE QUIZ BLOCK
{
  type: 'quiz-mcq',
  data: {
    question: string,
    question_hi?: string,
    image?: string,            // optional question image
    options: {
      id: string,
      text: string,
      text_hi?: string,
      image?: string,
      correct: boolean,
      explanation: string      // shown after answering
    }[],
    allow_multiple: boolean,
    hint?: string,
    points: number
  }
}

// CODE CHALLENGE BLOCK
{
  type: 'code-challenge',
  data: {
    language: 'python' | 'cpp' | 'javascript' | 'arduino',
    starter_code: string,
    instructions: string,
    instructions_hi?: string,
    test_cases: {
      input?: string,
      expected_output: string,
      hidden: boolean          // hidden test cases (like LeetCode)
    }[],
    solution: string,          // shown only after passing or on hint
    hints: string[],           // reveal one at a time
    points: number
  }
}

// SIMULATION BLOCK
{
  type: 'simulation',
  data: {
    sim_type: 'line-follower' | 'pid-controller' | 'pathfinder'
            | 'arm-kinematics' | 'sensor-fusion' | 'grid-navigator'
            | 'custom',
    embed_url?: string,        // if using existing /visualizer route
    config: Record<string, unknown>, // simulation parameters
    task_description: string,
    success_condition: string, // what the learner must achieve
    points: number
  }
}

// DRAG-DROP / MATCHING BLOCK
{
  type: 'match-pairs',
  data: {
    instruction: string,
    pairs: { left: string; right: string; left_image?: string; right_image?: string }[],
    points: number
  }
}

// FILL-IN-THE-BLANK BLOCK
{
  type: 'fill-blank',
  data: {
    template: string,          // "A robot's ___ helps it detect obstacles"
    blanks: {
      id: string,
      correct_answers: string[], // multiple accepted spellings
      hint?: string
    }[],
    points: number
  }
}

// HANDS-ON PROJECT BLOCK
{
  type: 'hands-on',
  data: {
    title: string,
    difficulty: 'easy' | 'medium' | 'hard',
    time_estimate_minutes: number,
    hardware_required: { name: string; buy_url_india?: string; price_inr?: number }[],
    steps: {
      order: number,
      instruction: string,
      image?: string,
      video_url?: string,
      checkpoint: string       // "Take a photo when your circuit looks like this"
    }[],
    submission_type: 'photo' | 'video' | 'code' | 'description',
    rubric: { criterion: string; max_points: number }[],
    points: number
  }
}

// SCORM BLOCK
{
  type: 'scorm',
  data: {
    package_url: string,       // path to SCORM zip in /public/scorm/
    scorm_version: '1.2' | '2004',
    width: number,
    height: number,
    completion_criteria: 'passed' | 'completed' | 'passed_or_completed'
  }
}

// REFLECTION / DISCUSSION BLOCK
{
  type: 'discussion',
  data: {
    prompt: string,
    prompt_hi?: string,
    min_words: number,
    peer_visible: boolean      // can others see your response?
  }
}

// FLASHCARD BLOCK (spaced repetition review)
{
  type: 'flashcard',
  data: {
    cards: {
      front: string,
      back: string,
      front_image?: string,
      back_image?: string
    }[],
    points_per_card: number
  }
}
```

---

## File Structure

```
app/
  academy/
    page.tsx                        ← Course catalog (redesigned)
    [courseSlug]/
      page.tsx                      ← Course landing page
      enroll/
        page.tsx                    ← Enrollment + payment
      learn/
        [lessonSlug]/
          page.tsx                  ← Lesson player page
    dashboard/
      page.tsx                      ← My learning dashboard

components/
  academy/
    CourseCatalog.tsx               ← Grid of course cards
    CourseCard.tsx                  ← Individual course card
    CourseLanding.tsx               ← Course detail + enroll CTA
    LessonPlayer.tsx                ← Main lesson container
    LessonSidebar.tsx               ← Module/lesson nav sidebar
    LessonProgressBar.tsx           ← Top progress bar
    blocks/
      VideoBlock.tsx                ← YouTube/Vimeo embed + transcript
      TextBlock.tsx                 ← MDX renderer
      QuizBlock.tsx                 ← MCQ + multi-select + true/false
      CodeBlock.tsx                 ← In-browser code runner
      SimulationBlock.tsx           ← Embedded simulator iframe
      HandsOnBlock.tsx              ← Step-by-step physical project
      MatchPairsBlock.tsx           ← Drag-drop matching
      FillBlankBlock.tsx            ← Fill in the blanks
      FlashcardBlock.tsx            ← Spaced repetition cards
      DiscussionBlock.tsx           ← Reflection + community
      ScormBlock.tsx                ← SCORM package iframe
    LessonComplete.tsx              ← Completion celebration screen
    CertificateViewer.tsx           ← Certificate display + download
    MasteryGate.tsx                 ← "Score 75% to continue" wall
    SkillIQWidget.tsx               ← Skill level display
    SpacedRepetitionBanner.tsx      ← "Time to review!" reminder

lib/
  academy/
    index.ts                        ← Re-exports
    courses.ts                      ← Course catalog data
    lessons.ts                      ← Lesson metadata
    blocks.ts                       ← Block type definitions + validators
    progress.ts                     ← Progress calculation logic
    spaced-repetition.ts            ← SM-2 algorithm implementation
    mastery.ts                      ← Mastery gate logic
    certificates.ts                 ← Certificate generation
    xapi.ts                         ← xAPI statement helpers
    scorm.ts                        ← SCORM API bridge

content/
  academy/
    spark/
      course.json                   ← Course metadata
      modules.json                  ← Module structure
      lessons/
        s1-m1-l1-what-is-a-robot/
          lesson.json               ← Lesson metadata + block order
          content.mdx               ← Rich text content
          content.hi.mdx            ← Hindi translation
          quiz.json                 ← Quiz questions (randomised pool)
    wire/
      [same structure]
    forge/
      [same structure]
    edge/
      [same structure]
```

---

# PART 5: LEARNING EXPERIENCE DESIGN

## The Lesson Player — Component Architecture

The `LessonPlayer.tsx` is the heart of the academy. Layout:

```
┌─────────────────────────────────────────────────────────┐
│  ← Back  |  Course: Spark  |  Module 2: Sensors  │ 40% │  ← Top bar
├───────────────────────────┬─────────────────────────────┤
│                           │  MODULE 1: What is a Robot? │
│                           │    ✓ Lesson 1               │
│   CONTENT AREA            │    ✓ Lesson 2               │
│                           │    → Lesson 3 (current)     │
│   Block 1: Video          │    ○ Lesson 4               │
│   Block 2: Text           │    ○ Lesson 5               │
│   Block 3: Quiz           │                             │
│   Block 4: Simulation     │  MODULE 2: Sensors          │
│   Block 5: Reflection     │    🔒 (needs Module 1)      │
│                           │                             │
│   [Mark Complete →]       │  YOUR PROGRESS              │
│                           │  ⭐ 480 XP  🔥 5-day streak │
│                           │  [🏆 Certificate: 60%]      │
└───────────────────────────┴─────────────────────────────┘
```

On mobile: sidebar becomes a bottom sheet, accessible via "Contents" button.

## Mastery Gate Flow

```
Lesson has a quiz block with passing_score = 75

Learner attempts quiz → scores 60%
  → Show: "You scored 60%. You need 75% to unlock the next lesson."
  → Show: which questions were wrong + explanations
  → Button: "Try Again" (new question permutation from the pool)

Learner retries → scores 80%
  → Confetti + XP animation
  → "Lesson Complete! +100 XP"
  → Next lesson unlocks with a visual "unlock" animation in sidebar
```

## Spaced Repetition — SM-2 Implementation

Every completed lesson enters the review queue.

```typescript
// lib/academy/spaced-repetition.ts
interface ReviewItem {
  lessonId: string
  nextReviewAt: Date
  intervalDays: number
  easeFactor: number       // starts at 2.5
  repetitions: number
}

// After each review, update using SM-2 algorithm
function updateReviewItem(item: ReviewItem, score: number): ReviewItem {
  // score: 0-5 (0=blackout, 5=perfect)
  if (score < 3) {
    return { ...item, repetitions: 0, intervalDays: 1, nextReviewAt: tomorrow() }
  }
  const newEF = Math.max(1.3, item.easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)))
  const newInterval = item.repetitions === 0 ? 1
    : item.repetitions === 1 ? 6
    : Math.round(item.intervalDays * newEF)
  return {
    ...item,
    repetitions: item.repetitions + 1,
    intervalDays: newInterval,
    easeFactor: newEF,
    nextReviewAt: daysFromNow(newInterval)
  }
}
```

A "Review Due" banner appears on the learner's dashboard and Academy home
when they have lessons due for spaced review.

---

# PART 6: COURSE CATALOG — 3 COMPLETE COURSES

---

## COURSE 1: "Your First Robot: Foundations of Robotics"
### Track: Spark | Level: Complete Beginner | Price: FREE | Duration: ~8 hours

**Tagline:** "Start with zero. End with a robot that moves and thinks."

**Learning Outcomes (end of course):**
1. Explain what a robot is and what makes it different from a machine
2. Identify the 3 core systems of any robot (Sense-Think-Act)
3. Understand how 6 types of sensors work
4. Know how motors, servos, and actuators create movement
5. Read a simple Arduino program and understand what each line does
6. Build a virtual line-following robot in the R2BOT simulator
7. Explain what your robot is doing in Hindi OR English

**Hardware requirement:** None (fully virtual) — but lesson suggests
optional ₹999 Arduino Uno for hands-on extension activities.

**Certificate:** R2BOT Spark Foundations Certificate (shareable, verifiable)

---

### MODULE 1: "What Exactly Is a Robot?" (Unlock: free)
*Estimated time: 45 minutes | 4 lessons*

**Lesson 1: Robots vs. Machines — The Real Difference**
*Type: video + reading | Duration: 12 min | XP: 100*
Objectives: Define a robot; distinguish from simple machines

Content blocks:
- `video`: 5-minute video "Your washing machine isn't a robot — here's why"
  (YouTube embed with chapters: 0:00 Intro, 1:20 What machines do,
   2:45 What robots add, 4:10 The key difference)
- `text`: 400-word explainer with the Sense-Think-Act diagram (SVG inline)
  Indian analogies: pressure cooker (machine) vs. Roomba (robot)
- `quiz-mcq`: 5 questions, 75% to pass
  Q1: "Which of these is a robot?" (4 images: calculator, traffic light with AI, Roomba, microwave)
  Q2: "A robot MUST be able to ___" (sense its environment / move fast / cost a lot / be made of metal)
  Q3-5: scenario questions with explanations
- `flashcard`: 6 cards — key vocab (robot, machine, sensor, actuator, autonomous, feedback)

**Lesson 2: Inside Every Robot — The 3-Part Formula**
*Type: interactive | Duration: 15 min | XP: 120*
Objectives: Identify Sense-Think-Act in real robots

Content blocks:
- `text`: The Sense-Think-Act framework with animated diagram
- `match-pairs`: Match 8 robot components to Sense / Think / Act
  (camera→Sense, CPU→Think, motor→Act, microphone→Sense, etc.)
- `simulation`: Interactive "Robot Anatomy Explorer" — click on parts of a
  3D robot diagram, each part reveals its role + category
- `fill-blank`: 4 sentences about the delivery robot scenario
- `quiz-mcq`: 4 questions testing Sense-Think-Act application

**Lesson 3: Robots in Your Life Right Now**
*Type: reading + discussion | Duration: 8 min | XP: 80*
Objectives: Find robots in everyday Indian life

Content blocks:
- `text`: "10 robots you use every week in India without realising"
  (ATM, Google Maps navigation AI, railway booking system,
   Zomato/Swiggy delivery route AI, UPI fraud detection,
   YouTube recommendation engine, spam filter)
- `discussion`: "Think of your home or school. What is the most robot-like
  thing there that isn't a traditional robot? Describe it."
  (peer_visible: true — learners read each other's responses)

**Lesson 4: MODULE CHECKPOINT ⚡**
*Type: quiz | Duration: 10 min | XP: 150*
Objectives: Consolidate Module 1 knowledge

Content blocks:
- `quiz-mcq`: 10 questions drawing from Lessons 1–3 question pool
  Mix of recall, application, and analysis questions
  Must score 75% to unlock Module 2
- `flashcard`: Spaced review of all 6 vocab cards from Lesson 1

---

### MODULE 2: "How Robots See and Hear" (Unlock: Module 1 complete)
*Estimated time: 1.5 hours | 5 lessons*

**Lesson 5: The 6 Sensors Every Roboticist Knows**
*Type: video + interactive | Duration: 20 min | XP: 150*

Content blocks:
- `video`: "Sensor types explained in 6 minutes" — animated explainer
  Covers: Ultrasonic, IR, Camera, IMU, Encoder, Lidar
- `text`: Sensor comparison table with India use-case column
  (ultrasonic: ₹60 HC-SR04 on Amazon.in | camera: ₹350 OV2640 | etc.)
- `simulation`: "Sensor Sandbox" — place a virtual robot on a grid,
  add obstacles, watch sensor readings update in real time.
  Task: position obstacles so the ultrasonic sensor reads exactly 30cm.
- `quiz-mcq`: 6 questions (one per sensor type)

**Lesson 6: Ultrasonic Sensors — Deep Dive**
*Type: interactive + hands-on | Duration: 25 min | XP: 180*

Content blocks:
- `text`: How ultrasonic works (sound pulse → echo timing → distance calculation)
  With the maths: distance = (time × speed of sound) / 2
- `fill-blank`: Fill in the distance formula with drag-drop numbers
- `code-challenge` (Python simulation):
  ```python
  # Calculate distance from sensor reading
  # time_microseconds is the echo pulse duration
  def calculate_distance(time_microseconds):
      # Speed of sound = 343 m/s = 0.0343 cm/μs
      # YOUR CODE HERE
      pass
  ```
  Test cases: input 1000μs → expected 17.15cm; input 2940μs → expected 50.4cm
- `hands-on` (OPTIONAL — requires HC-SR04 + Arduino ₹299):
  Build a "Parking Sensor" — LED lights up when object is within 10cm
  Step-by-step with wiring diagram, starter code, expected output
  Submission: photo of working circuit

**Lesson 7: Cameras and Computer Vision**
*Type: video + interactive | Duration: 18 min | XP: 150*

Content blocks:
- `video`: "How a robot camera is different from your phone camera"
  (image processing, frame rate vs. resolution trade-off, colour spaces)
- `text`: From pixels to decisions — how OpenCV processes frames
- `simulation`: "Colour Detector" — upload any image, the sim highlights
  objects of a chosen colour (demonstrates basic CV pipeline)
- `quiz-mcq`: 5 questions on camera + CV concepts
- `discussion`: "What problem in India could be solved with a camera on a robot?
  Describe the robot, what it sees, and what decision it makes."

**Lesson 8: IMU — How Robots Know Which Way Is Up**
*Type: reading + simulation | Duration: 15 min | XP: 130*

Content blocks:
- `text`: Accelerometers, gyroscopes, magnetometers — explained with
  the analogy of a blindfolded person feeling which way they're tilting
- `simulation`: "IMU Visualiser" — tilt a virtual phone, see X/Y/Z acceleration
  readings update in real time. Task: identify which axis changes when tilted forward.
- `fill-blank`: 4 sentences about IMU applications
- `quiz-mcq`: 4 questions

**Lesson 9: MODULE CHECKPOINT ⚡**
*Type: quiz | Duration: 12 min | XP: 200*

Content blocks:
- `quiz-mcq`: 12 questions from Module 2 pool
  Includes 2 "apply your knowledge" scenarios with images
- `flashcard`: 12 sensor vocabulary cards (spaced review)

---

### MODULE 3: "How Robots Move" (Unlock: Module 2 complete)
### MODULE 4: "The Robot's Brain" (Unlock: Module 3 complete)
### MODULE 5: "Your First Robot Program" (Unlock: Module 4 complete)
### MODULE 6: "Build Your Virtual Robot" (Unlock: Module 5 complete)

*[Module 3–6 follow the same pattern — full detail in separate content files]*

**MODULE 6 FINAL PROJECT:**
*Type: project | Duration: 45 min | XP: 500*

"Design and test a virtual line-following robot in the R2BOT Simulator."

Submission requirements:
1. Screenshot of robot completing the test course (3 laps)
2. 150-word write-up: "What sensor does your robot use? What happens if
   the line curves sharply? How could you make it better?"
3. (Bonus) Modify the starter code to make it 20% faster

Rubric (auto-graded):
- Robot completes all 3 laps: 40 points
- Write-up answers all 3 questions: 30 points
- Code is commented: 20 points
- Bonus speed improvement: 10 points

Pass = 70/100. Certificate issued on passing.

---

## COURSE 2: "Arduino Robotics: Build Your First Physical Robot"
### Track: Spark → Wire | Level: Beginner (hands-on) | Price: ₹999 | Duration: ~15 hours

**Tagline:** "From a ₹2,999 kit to a robot that navigates your room."

**Hardware kit:** Arduino Starter Kit (links to Amazon.in, Flipkart, Robocraze)
- Arduino Uno R3: ₹650
- HC-SR04 Ultrasonic: ₹60
- L298N Motor Driver: ₹120
- 2× DC Motors + wheels: ₹200
- Servo Motor SG90: ₹80
- Jumper wires + breadboard: ₹150
- 9V battery + chassis: ₹340
Total: ~₹1,600 (budget) to ₹2,999 (full kit)

**Free preview:** Module 1 + Lesson 1 of Module 2 (3 free lessons)

**Course structure (8 modules, 32 lessons):**

Module 1: Arduino Basics (FREE PREVIEW) — 4 lessons
- What is a microcontroller?
- The Arduino IDE: install + first sketch
- Blink the LED — your first program
- Digital vs. Analog pins

Module 2: Reading Sensors — 5 lessons
- Wiring your first ultrasonic sensor
- Reading serial monitor data
- Code challenge: distance alarm
- Troubleshooting common wiring mistakes
- MODULE CHECKPOINT

Module 3: Making Things Move — 5 lessons
- DC motors: voltage, current, direction
- L298N motor driver wiring
- Code: forward, backward, turn
- PWM: speed control with analogWrite()
- MODULE CHECKPOINT

Module 4: Servo Motors — 4 lessons
- How servos differ from DC motors
- Wiring + Arduino Servo library
- Code challenge: sweep 0→180→0
- Project: build a robotic arm segment

Module 5: Combining Sensors + Movement — 5 lessons
- If sensor reads X → do Y (conditional logic)
- Obstacle detection: stop before hitting a wall
- Turn and avoid: the simplest autonomous behaviour
- Tuning: what to adjust when the robot behaves unexpectedly
- MODULE CHECKPOINT

Module 6: Navigation Algorithms — 4 lessons
- Wall following algorithm
- Bug algorithm: navigate around obstacles
- Code challenge: complete a maze (virtual + physical version)
- Simulation: test your algorithm before wiring

Module 7: Your Robot, Your Rules — 3 lessons
- Adding LEDs: visual feedback
- Adding a buzzer: audio feedback
- Personalise: make your robot do something unique

Module 8: FINAL PROJECT — 2 lessons
- Project brief: "Autonomous Room Navigator"
  Your robot must: start on one side of a room, reach the other side,
  avoid all obstacles, and stop within 20cm of the target wall.
- Submission: 2-minute video demonstration + code on GitHub + 200-word reflection

**Certificate:** R2BOT Arduino Robotics Certificate

---

## COURSE 3: "ROS2 Fundamentals: Program Real Robots"
### Track: Wire | Level: Intermediate | Price: ₹2,499 | Duration: ~20 hours

**Tagline:** "The language of professional robotics. Learn it properly."

**Prerequisites:** Course 2 (or equivalent Arduino experience), basic Python

**This course is for:** Engineering students, working professionals,
anyone targeting a robotics job in India (₹8–25L/year salary range).

**Course structure (10 modules, 40 lessons):**

Module 1: ROS2 Architecture — 4 lessons
- What is ROS2 and why it exists
- Nodes, topics, services, actions — the 4 core concepts
- The publish-subscribe pattern (with real-time visualisation)
- Your first ROS2 node (Python): publish a message

Module 2: Development Environment — 3 lessons
- Installing ROS2 Humble on Ubuntu (step-by-step)
- OR: use R2BOT's browser-based ROS2 playground (no install needed)
- Colcon build system: packages, workspaces, CMakeLists
- SIMULATION BLOCK: Launch a Gazebo simulation from the browser

Module 3: Topics and Messages — 5 lessons
- msg types: String, Int32, Float64, custom
- Code challenge: temperature publisher + subscriber
- RQt tools: visualise your topic graph
- Debugging: rqt_console, ros2 topic echo
- MODULE CHECKPOINT + peer discussion

Module 4: Services and Actions — 4 lessons
- When to use services vs. topics (request/response vs. stream)
- Code: write a service server in Python
- Actions: long-running tasks with feedback
- Code challenge: implement a "drive to goal" action

Module 5: Robot Description (URDF) — 4 lessons
- What URDF is: describe your robot in XML
- Joints: fixed, revolute, prismatic, continuous
- Visualise URDF in RViz2 (browser simulation)
- HANDS-ON: write the URDF for a 2-wheeled robot

Module 6: TF2 — Coordinate Frames — 3 lessons
- Why frames matter: base_link, odom, map
- Broadcasting and listening to transforms
- Simulation: visualise your TF tree in RViz2

Module 7: Navigation Stack — Nav2 — 5 lessons
- Nav2 architecture overview
- Costmaps: global vs. local
- Path planners: A*, Dijkstra, DWB
- Configuring Nav2 for a custom robot
- SIMULATION BLOCK: Navigate a robot through a warehouse map

Module 8: Perception — 4 lessons
- Camera integration in ROS2
- Point cloud processing with PCL
- Object detection: ROS2 + YOLOv8 pipeline
- Sensor fusion: combining lidar + camera

Module 9: Real Hardware — 4 lessons
- Connecting a Raspberry Pi robot to ROS2
- GPIO control from ROS2 nodes
- Troubleshooting: latency, message drops, tf errors
- HANDS-ON PROJECT: run a Nav2 navigation demo on physical robot

Module 10: CAPSTONE PROJECT — 4 lessons
- Project brief: "Autonomous Warehouse Robot Simulation"
  Build a complete ROS2 stack in Gazebo:
  - SLAM mapping of a warehouse environment
  - Navigate to 3 waypoints in sequence
  - Detect and report a "package" (coloured box) at each waypoint
- Part 1: Architecture planning (peer review)
- Part 2: Implementation + GitHub submission
- Part 3: Code review by R2BOT team OR peer review with rubric

**Certificate:** R2BOT ROS2 Fundamentals Certificate
*Industry-recognised. Listed on R2BOT Verified Graduates page.*
*LinkedIn certificate share button built in.*

---

# PART 7: MONETISATION STRATEGY

## Tier Structure

### FREE Tier — "Audit Mode"
Everything in Course 1 (Spark Foundations) is free, always.
- All video content viewable
- All reading content accessible
- Quizzes available but no grade tracking
- Simulations fully functional
- No certificate
- Community discussion access

**Why:** India has 182 million online learners. The TAM is enormous.
Free content builds trust, SEO, and word-of-mouth.
This is the funnel top.

### R2BOT PRO — ₹499/month or ₹3,999/year (~₹333/month)
*Target: serious learners, students, job-seekers*
- All free content + graded assessments
- Progress tracking + streak system
- All certificate courses
- Spaced repetition dashboard
- Priority access to new courses
- Download content for offline use
- Ad-free experience
- Hindi translations

### R2BOT PRO+ — ₹999/month or ₹7,999/year
*Target: professionals, job-changers, placed students*
Everything in PRO plus:
- Project review by human mentor (turnaround: 48 hours)
- Live doubt sessions (2× monthly group calls)
- Career services: resume review, LinkedIn optimisation
- Job placement assistance (referrals to R2BOT partner companies)
- 1-on-1 mentorship (1 session/month)

### School/College Plan — ₹15,000/year per institution
- Teacher dashboard with student progress tracking
- Class management (create cohorts, assign courses)
- CBSE/NEP alignment reports
- Bulk certificates (school-branded)
- Curriculum planning support

### Corporate/Team Plan — Custom pricing
- Custom learning paths for teams
- Progress reporting for managers
- SCORM export for internal LMS
- Private cohorts

## Additional Revenue Streams (Phase 2+)

1. **Hardware kits** — White-label or partner with Robocraze/Evive
   Bundle Course 2 + physical kit → ₹3,499 combo deal
   Margin: 20–30% on hardware

2. **SCORM licensing** — Companies buying R2BOT courses for internal training
   Export any course as SCORM for ₹25,000/course/year

3. **Cohort programmes** — Live 8-week cohorts, 50 seats, ₹4,999/seat
   High-touch, community-based. Instructor-led. 2× per year.

4. **Enterprise certification** — Companies paying to have employees certified
   "This employee is R2BOT Verified in ROS2" — ₹2,000/certification

5. **Instructor marketplace** — Phase 3: external instructors publish courses
   Revenue split: 70% instructor, 30% R2BOT

## Conversion Funnel

```
Free content user
  → Completes Course 1 (free)
  → Gets partway through Course 2 (free preview)
  → Hits paywall on Module 2, Lesson 2
  → Upgrade prompt: "₹499/month — less than a textbook"
  → Converts to PRO

PRO user
  → Completes Course 2
  → Starts Course 3 (ROS2)
  → Hits job search moment
  → Upgrade prompt: "Want mentor feedback on your capstone project?"
  → Converts to PRO+
```

---

# PART 8: TECHNICAL IMPLEMENTATION ROADMAP

## Phase 1 — Foundation (Weeks 1–4)
Build the data layer and lesson player.

- [ ] Supabase migrations for all new tables (courses, modules, lessons, content_blocks,
      enrollments, lesson_progress, block_progress, quiz_attempts, project_submissions,
      course_certificates)
- [ ] Content type definitions in TypeScript (`lib/academy/blocks.ts`)
- [ ] `LessonPlayer.tsx` — renders any sequence of content blocks
- [ ] `VideoBlock.tsx` — YouTube embed + progress tracking
- [ ] `TextBlock.tsx` — MDX renderer (upgrade existing)
- [ ] `QuizBlock.tsx` — MCQ with mastery gate logic
- [ ] `FlashcardBlock.tsx` — flip-card spaced review
- [ ] Lesson progress API routes (`/api/academy/progress`)
- [ ] Migrate existing Spark 01–06 MDX content to new block format
- [ ] Course landing page (`/academy/[courseSlug]`)
- [ ] Lesson player page (`/academy/[courseSlug]/learn/[lessonSlug]`)

## Phase 2 — Interactive Content (Weeks 5–8)
Add the interactive and code blocks.

- [ ] `CodeBlock.tsx` — Monaco Editor + Pyodide (Python in browser, no server)
- [ ] `SimulationBlock.tsx` — iframe wrapper for existing /visualizer routes
- [ ] `MatchPairsBlock.tsx` — drag-drop with touch support
- [ ] `FillBlankBlock.tsx`
- [ ] `HandsOnBlock.tsx` — step checklist + photo submission
- [ ] `DiscussionBlock.tsx` — lesson-level discussion threads
- [ ] Course 1 content: write all 24 lessons in new block format
- [ ] Spaced repetition engine + review dashboard

## Phase 3 — Monetisation (Weeks 9–12)
Add payments and certificates.

- [ ] Enrollment system (free auto-enroll, paid via Razorpay/Stripe)
- [ ] `MasteryGate.tsx` — paywall for non-enrolled users past free preview
- [ ] Certificate generation (jsPDF is already in dependencies)
- [ ] Certificate verification public page (`/certificates/[certId]`)
- [ ] Course 2 content: all 32 Arduino lessons
- [ ] Learner dashboard (`/academy/dashboard`)
- [ ] Streak + XP integration with existing system

## Phase 4 — Scale (Weeks 13–20)
Advanced features and Course 3.

- [ ] `ScormBlock.tsx` — SCORM player
- [ ] xAPI statement logging to Supabase (acts as LRS)
- [ ] School dashboard (teacher view)
- [ ] Course 3 content: all 40 ROS2 lessons
- [ ] Project submission + peer review system
- [ ] Mobile app (React Native, reuses all components)
- [ ] Hindi content for all Course 1 lessons
- [ ] SEO: course pages with full schema.org LearningResource markup

---

# PART 9: CLAUDE CODE BUILD PROMPT

Run this in your terminal to start building:

```bash
cd ~/Desktop/robot && claude --dangerously-skip-permissions
```

Then paste this as your opening message:

---

## CLAUDE CODE PROMPT — ACADEMY BUILD

You are building the R2BOT Academy — the world's best robotics learning platform.
Read ACADEMY_MASTER_PLAN.md in this repo first. That is your complete specification.

PROJECT CONTEXT:
- Next.js 15 + React 19 + TypeScript + Supabase
- Repo: ~/Desktop/robot
- Live: https://robot-tan.vercel.app
- Current Academy: flat MDX lessons rendered with ReactMarkdown
  (see app/academy/, components/AcademyLessonView.tsx, content/academy/)

YOUR GOAL: Transform the Academy from a text reader into a world-class
interactive learning platform — with video, quizzes, code challenges,
simulations, mastery gates, spaced repetition, and certificates.

IMPLEMENTATION ORDER (strictly follow this):

STEP 1 — DATABASE SCHEMA
Run these migrations in Supabase (project: acrdjpmvdscngldxilgm):
Create all tables from Part 4 of the master plan.
Write migration files to supabase/migrations/0023_academy_v2.sql
Include all foreign keys, indexes, and RLS policies.
RLS policy pattern:
  - SELECT: auth.uid() = user_id OR is_public = true
  - INSERT/UPDATE/DELETE: auth.uid() = user_id

STEP 2 — TYPE DEFINITIONS
Create lib/academy/blocks.ts with full TypeScript types for all ContentBlock
variants (VideoBlock, QuizBlock, CodeBlock, etc.) from Part 4 of the plan.
Create lib/academy/courses.ts with Course, Module, Lesson types.
Export everything from lib/academy/index.ts

STEP 3 — LESSON PLAYER SHELL
Create components/academy/LessonPlayer.tsx:
- Takes: lesson (with content_blocks array), enrollment status, user progress
- Renders: top progress bar, sidebar (module/lesson nav), content area
- Content area renders blocks in order
- Each block has a completion state: pending | in_progress | completed
- "Continue" button at bottom advances through blocks
- Final block completion → triggers lesson complete flow (XP animation, confetti)
- Sidebar is sticky on desktop, bottom sheet on mobile

STEP 4 — CONTENT BLOCKS (build in this order)
4a. VideoBlock.tsx:
    - YouTube embed via youtube-nocookie.com (privacy-respecting)
    - Progress tracked at 80% watch threshold
    - Expandable transcript (collapsed by default)
    - Hindi transcript toggle if available
    - Chapter markers in a timeline bar below video

4b. TextBlock.tsx:
    - Upgrade existing MDX renderer
    - Add: estimated read time, scroll progress, highlight-to-note feature
    - Hindi toggle button if content_hi available

4c. QuizBlock.tsx:
    - MCQ, multi-select, true/false variants (driven by data.allow_multiple)
    - Shows one question at a time (not all at once)
    - After answering: show explanation for each option
    - After all questions: show score, pass/fail, retry button if failed
    - Mastery gate: if lesson has passing_score > 0 and score < passing_score,
      next lesson remains locked + MasteryGate component shown
    - Question pool: shuffle question order on each attempt
    - Store each attempt in quiz_attempts table

4d. FlashcardBlock.tsx:
    - 3D flip animation (CSS perspective)
    - Self-assessment buttons: "Easy" / "Hard" (feeds SM-2 algorithm)
    - Progress: "3 of 8 cards"

4e. MatchPairsBlock.tsx:
    - Two columns: left items, right items (shuffled)
    - Tap left item → highlights → tap right item → draws connecting line
    - Correct: green line, stays connected, items grey out
    - Wrong: red flash, line disappears, try again
    - Works with touch events on mobile

4f. FillBlankBlock.tsx:
    - Render template with ______ gaps
    - Type into each gap or drag from word bank
    - Fuzzy match (lowercase, trim, accept alternate spellings)

4g. CodeBlock.tsx:
    - Monaco Editor (already in dependencies) for syntax highlighting
    - Language: Python → run via Pyodide (WebAssembly Python, no server)
    - Language: Arduino C++ → syntax only (no execution, show expected output)
    - Run button → execute → show stdout/stderr in terminal panel below
    - Test runner: compare output to expected → pass/fail per test case
    - Hints: collapsible, reveal one at a time
    - "Show solution" button (records that hint was used — no penalty)

4h. SimulationBlock.tsx:
    - Iframe wrapper for /visualizer/[type] routes
    - postMessage API for task communication:
      parent sends: { type: 'SET_TASK', config: {...} }
      child sends: { type: 'TASK_COMPLETE', score: number }
    - Loading skeleton while iframe loads
    - Mobile: expand to full-screen button

4i. HandsOnBlock.tsx:
    - Step-by-step checklist (each step has checkbox)
    - Steps can have: text instruction, wiring diagram image, video clip
    - Hardware list at top with ₹ prices and Amazon.in links
    - Photo submission: file upload → stored in Supabase Storage
    - Progress: "3 of 8 steps completed"

4j. DiscussionBlock.tsx:
    - Prompt shown prominently
    - Text area for response (min_words enforced with live count)
    - If peer_visible: show other learners' responses (after you submit)
    - Upvote / reply on other responses
    - Backed by existing lab/posts Supabase tables

STEP 5 — LESSON COMPLETE FLOW
Create components/academy/LessonComplete.tsx:
- Triggered when all required blocks are completed
- Full-screen overlay:
  - XP counter animation (rolls up from current to new value)
  - Confetti burst (use existing confetti system or build with CSS particles)
  - "Lesson Complete! +[xp] XP" heading
  - Skill preview: "You can now: [list of objectives]"
  - Next lesson button → navigates to next lesson, sidebar updates
  - If module complete: special "Module Complete" variant with robot part reward
  - If course complete: Certificate flow begins

STEP 6 — MASTERY GATE
Create components/academy/MasteryGate.tsx:
- Shown when: lesson has passing_score > 0, user's best_score < passing_score,
  AND user is not enrolled (or is on free tier past preview limit)
- Two modes:
  Mode A (not enrolled): "This lesson requires R2BOT Pro. Enroll to track progress
  and earn your certificate." → Upgrade CTA
  Mode B (enrolled, failed): "Score [X]% to unlock the next lesson.
  Your best: [score]%. Try again?" → Retry button

STEP 7 — COURSE LANDING PAGE
Create app/academy/[courseSlug]/page.tsx:
- Course hero: title, subtitle, instructor, rating (future), total lessons, duration
- "What you'll learn" grid (8 bullet points from objectives)
- Course structure accordion (modules list, lesson titles, duration, type icon)
- First 3 lessons marked as "Free Preview"
- Instructor card
- Prerequisites section
- Hardware requirements (if any) with India pricing
- Sticky CTA: "Enroll Free" or "Enroll for ₹999" + "Preview first 3 lessons"
- Reviews section (future — placeholder for now)

STEP 8 — CONTENT: MIGRATE COURSE 1
Migrate all Spark lessons (01–06) to new block format.
Create content/academy/spark/course.json (metadata)
Create content/academy/spark/modules.json (module structure)
For each existing lesson (01–06): create a lesson.json + blocks.json
in content/academy/spark/lessons/s1-m[X]-l[Y]-[slug]/

Map existing MDX content to TextBlock + quiz questions from the
"Check your understanding" sections at bottom of each MDX file.
Add FlashcardBlock for key terms in each lesson.

STEP 9 — SPACED REPETITION SYSTEM
Create lib/academy/spaced-repetition.ts:
- SM-2 algorithm implementation (see Part 5 of master plan)
- updateReviewItem(item, score) function
- getItemsDueForReview(userId) → query review_queue table
- scheduleReview(userId, lessonId, score) → insert/update review_queue

Create a "Review Due" banner component that appears on the Academy home page
when the user has items due. Banner: "📖 3 lessons ready for review. Keep your
streak alive → [Start Review]"

STEP 10 — ACADEMY HOME PAGE REDESIGN
Replace the current track-card grid with a proper course catalog.
New layout:
- Top: personalized greeting if logged in ("Welcome back, Ravi. Continue where you left off →")
- Featured course (Course 1, always highlighted for new users)
- Progress section (if enrolled in any courses)
- Course grid: filter by track, level, free/paid
- "Review Due" banner (if items in spaced repetition queue)
- Skill IQ teaser: "Don't know where to start? Take the 5-minute placement test →"

WORKING RULES:
- Build in strict order (Steps 1→10), complete each step before moving to next
- After each step: run npm run type-check, fix all errors
- Never leave // TODO comments — implement or create a follow-up task for me
- For any new Supabase table: write the migration SQL first, confirm with me, then run it
- For content blocks: build the component, then immediately use it in Lesson 1
  so we can see it working in the browser immediately
- Mobile-first for every component: test at 375px viewport width
- All monetary amounts in INR (₹), all links to Indian retailers where relevant

Let's build the world's best robotics academy. Start with Step 1.

---
