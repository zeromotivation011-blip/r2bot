// lib/kids/teach/training.ts
//
// The R2BOT Kids teacher training: six short, self-paced modules (about 45
// minutes in all) that get a teacher from "never seen it" to running a
// 40-minute class, assigning work and tracking it — with a completion
// certificate. Pure data, safe on server and client; the page renders every
// word on the server, the client island only remembers which modules are done.

export interface TrainingCheck {
  question: string
  options: string[]
  answer: number
  /** Shown after any answer. */
  why: string
}

export interface TrainingSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface TrainingModule {
  id: string
  number: number
  title: string
  minutes: number
  /** One line under the title. */
  summary: string
  sections: TrainingSection[]
  /** Something to do in the product before ticking the module off. */
  tryIt: { label: string; href: string; text: string }
  check: TrainingCheck
}

export const TRAINING_UPDATED = '2026-11-26'
export const TRAINING_STORAGE_KEY = 'r2bot_kids_teacher_training_v1'

export const TRAINING_MODULES: TrainingModule[] = [
  {
    id: 'how-it-works',
    number: 1,
    title: 'How R2BOT Kids works',
    minutes: 7,
    summary: 'The four age bands, the course, the Skill Galaxy, the games — and why children never need an account.',
    sections: [
      {
        heading: 'One platform, four age bands',
        paragraphs: [
          'R2BOT Kids is a robotics learning platform for ages 5 to 17. Every piece of content is tagged with one of four bands by school grade: Explorers (5–7), Builders (8–10), Inventors (11–13) and Engineers (14–17). A class is created for one band, and children see content pitched at it.',
          'Children build their own robot in a 3D workshop, and the same robot is the one they program, race and show off everywhere else. Learning feels like caring for a robot that is theirs.',
        ],
      },
      {
        heading: 'What children actually do',
        bullets: [
          'The course: four levels, one per band. Level 1 (Explorers) is written in full — 24 sessions of 40 minutes, each with a short animated episode, a robot build, a coding mission and a challenge in a physics simulator, three spoken check questions and a badge.',
          'The Skill Galaxy: hundreds of short activities in ten tracks (motion, sensors, code, electronics, mechanics, control, AI and maps, design, space, robots and us). Each takes a few minutes and teaches one idea.',
          'Games: longer simulations (a drone to keep steady, a robot arm, a Mars rover with signal delay) that reward understanding, not reflexes.',
          'Story Theatre, the Code Lab and Robot World: voiced stories with choices, block-coding missions and a gentle adventure map for the youngest.',
        ],
      },
      {
        heading: 'No accounts for children — by design',
        paragraphs: [
          'You use a normal R2BOT account. Children never do: they join your class with a 6-character code and a nickname. There is no email, password, phone number or birthday, ever. Their progress is saved on their device and a small summary (stars, sessions finished, activities done, the robot they built) is sent to your class.',
        ],
      },
    ],
    tryIt: { label: 'Open the course map', href: '/kids/course/1', text: 'Open Level 1 and look at how the 24 sessions are grouped into four acts.' },
    check: {
      question: 'What does a child need to join your class?',
      options: ['An email address and a password', 'A parent’s phone number', 'The class code and a nickname', 'Their date of birth'],
      answer: 2,
      why: 'Only the class code and a nickname. R2BOT Kids never asks a child for contact details or a birthday.',
    },
  },
  {
    id: 'forty-minute-class',
    number: 2,
    title: 'Running a 40-minute class',
    minutes: 8,
    summary: 'The rhythm every Level 1 session follows, and how to keep 30 children on task with one big screen.',
    sections: [
      {
        heading: 'The shape of a session',
        paragraphs: [
          'Every lesson session follows the same minute-by-minute plan, and the minutes add up to exactly 40 including handing out devices. The printable teacher guide for each session has the full plan.',
        ],
        bullets: [
          '4 min — unplugged warm-up on the rug: a body game that acts out today’s idea before anyone touches a screen.',
          '5 min — play the episode once for everyone on the big screen, captions on. Pause at Spark’s question and let children answer aloud.',
          '3 min — devices out; pairs join with the class code.',
          '4 min — BUILD: snap on today’s part, then press “Try without it” and say what went wrong.',
          '8 min — CODE: the guided program, in pairs.',
          '7 min — CHALLENGE: the mission. Spark speaks the hints; a teacher nudge is fine after the second hint.',
          '3 min — CHECK: three spoken questions answered by tapping pictures; the badge.',
          '2 min — screens face-down, back to the rug.',
          '4 min — share circle: two children show their run on the big screen; ask the discussion questions.',
        ],
      },
      {
        heading: 'Pairs, not individuals',
        paragraphs: [
          'Work in pairs: one “driver” taps, one “navigator” checks the plan against the mission, and they swap halfway. Pairs talk about the program, which is where most of the learning happens, and you need half the devices.',
        ],
      },
      {
        heading: 'Project sessions',
        paragraphs: [
          'Sessions 6, 12, 18 and 24 are “Make it yours” projects with a different rhythm: plan on paper first, 15 minutes of build–code–test, then a pair share where each pair shows its run to the neighbouring pair and gets “a star and a wish”. Listen in during the pair share: it is your best evidence of who can explain a fix.',
        ],
      },
    ],
    tryIt: { label: 'Open a session guide', href: '/kids/teach/1/1', text: 'Read the guide for Session 1, “Hello, Robot!”, and print it or download the PDF.' },
    check: {
      question: 'Why does every session start with an unplugged warm-up?',
      options: ['So children act out the idea with their bodies before they meet it on screen', 'To use up time while devices charge', 'Because the episode will not play without it', 'To decide who gets a device first'],
      answer: 0,
      why: 'Concrete before abstract: a child who has hopped one tile per step understands “forward 2” on screen straight away.',
    },
  },
  {
    id: 'physics-lab',
    number: 3,
    title: 'Using the physics lab',
    minutes: 8,
    summary: 'Code missions run in a real physics simulator. Here is how to use that to teach — and to calm a frustrated pair.',
    sections: [
      {
        heading: 'Real physics, not a cartoon',
        paragraphs: [
          'The CODE and CHALLENGE steps run in a physics simulator. Parts have mass, floors have grip, and a heavier robot starts and stops a little more slowly. A program that works on the workshop mat may slide on ice or slow down in sand — exactly as it would with a real robot.',
          'This is deliberate. Children discover that the same program can give different results in a different place, which is the start of real engineering thinking.',
        ],
      },
      {
        heading: 'Teaching moves that work',
        bullets: [
          '“Try without it”: after every build, children remove the new part and watch what goes wrong. Ask them to say why before they put it back.',
          'Predict, then run: before a pair presses Go, ask “where will it stop?” and let them point. A wrong prediction is the most useful moment of the lesson.',
          'Change one thing: when a run fails, ask the pair to change one block or one number at a time. That is a fair test.',
          'Bugs are normal: say “let’s find the bug” rather than “that’s wrong”. Fixing a bug earns stars in its own right.',
        ],
      },
      {
        heading: 'Stars reward care, not speed',
        paragraphs: [
          'One star means the mission was done. Two and three stars reward craft — planning first, a shorter program with a loop, explaining what the robot did. Stars are never about being faster than another child, and there are no leaderboards anywhere in R2BOT Kids.',
        ],
      },
    ],
    tryIt: { label: 'Try a session yourself', href: '/kids/course/1/2', text: 'Play Session 2, “Wheels to Roll”, as a child would. Try to make the robot overshoot on purpose.' },
    check: {
      question: 'A pair’s robot slides past the target on the ice level. What is the best next step?',
      options: ['Give them the answer so they can move on', 'Tell them to start the session again', 'Move them to an easier activity', 'Ask them to change one thing at a time and predict what will happen'],
      answer: 3,
      why: 'Changing one thing at a time and predicting the result turns a frustrating failure into a fair test — the skill the challenge is there to teach.',
    },
  },
  {
    id: 'assign-and-track',
    number: 4,
    title: 'Assigning and tracking work',
    minutes: 7,
    summary: 'Create a class, set “From your teacher” missions with due dates, and read the dashboard.',
    sections: [
      {
        heading: 'Set up once',
        bullets: [
          'Create a class in the Classroom and choose its age band. You get a 6-character join code and a printable card for the wall.',
          'Children go to r2bot.in/kids/join, type the code and a nickname. They appear on your roster as they play.',
          'If colleagues use R2BOT Kids too, one of you creates a school and shares the 8-character school code. The school admin then sees every class with a school-wide summary.',
        ],
      },
      {
        heading: 'Assign missions',
        paragraphs: [
          'On a class page, open Assignments and pick a course session, a Skill Galaxy activity (filter by track and band) or a game. Add a due date and a short note if you like. Children see it as a “From your teacher” mission on their Universe home, with a tick once they have done it.',
          'Completion comes from the progress children already sync — nothing new is collected. A child who plays on a device that has not synced yet will appear once it does.',
        ],
      },
      {
        heading: 'Read the dashboard',
        bullets: [
          'Per-assignment completion: how many have finished and who still needs a nudge.',
          '“Where to help next”: the levels children retry most and the missions solved with one star — good ones to work through on the board.',
          '“Not played for a week”: a quiet prompt, never a public list.',
          'Download a CSV of the roster for your own records.',
        ],
      },
    ],
    tryIt: { label: 'Open the Classroom', href: '/kids/classroom', text: 'Create a practice class, assign Session 1 with a due date, and look at the assignment card.' },
    check: {
      question: 'Where does assignment completion on your dashboard come from?',
      options: ['Children tick a box saying they finished', 'The progress summary each child’s device already syncs to the class', 'Parents confirm it by email', 'You mark it by hand'],
      answer: 1,
      why: 'It is derived from the synced progress summary — the same stars and finished sessions the child sees — so nothing extra is asked of children.',
    },
  },
  {
    id: 'every-child',
    number: 5,
    title: 'Supporting struggling and advanced children',
    minutes: 8,
    summary: 'Every session guide has “faster” and “slower” routes. How to use them without labelling anyone.',
    sections: [
      {
        heading: 'Children who need more time',
        bullets: [
          'Use the “slower” suggestions in each guide: fewer blocks, the teacher pointing to the top of the screen, acting it out with Spark first.',
          'Spark’s three hints go from a nudge to a near-answer. Let a child hear all three before you step in.',
          'Pair a hesitant child as the navigator first: checking the plan is a real job and builds confidence before they drive.',
          'Every block, hint and question is spoken and has a picture, so non-readers and early readers can work independently. Captions are on by default.',
        ],
      },
      {
        heading: 'Children who finish early',
        bullets: [
          'Use the “faster” suggestions: a longer program, teaching it to a friend, explaining one choice.',
          'Aim for three stars: a shorter program with a loop, or an explanation of what the robot did and why.',
          'Assign a Skill Galaxy activity from the guide’s “Extend in the Skill Galaxy” list, or a game from a higher band.',
        ],
      },
      {
        heading: 'Access for every child',
        paragraphs: [
          'Every sound has a visual twin (a beep flashes a ring, “Say” shows a speech bubble); colours always come with a shape or an icon; blocks are tapped, never dragged; keyboard and switch access work on every control; a reduced-motion setting calms the episode camera.',
        ],
      },
    ],
    tryIt: { label: 'Read the differentiation for Session 7', href: '/kids/teach/1/7', text: 'Find the “faster” and “slower” routes and the misconceptions to listen for.' },
    check: {
      question: 'A child finishes the challenge in half the time. What fits R2BOT Kids best?',
      options: ['Offer a “faster” extension or a three-star goal such as a shorter program with a loop', 'Announce that they won', 'Let them watch videos until the end', 'Move them to the next session alone'],
      answer: 0,
      why: 'Extensions deepen the same idea. Speed is never celebrated against other children.',
    },
  },
  {
    id: 'safety-privacy',
    number: 6,
    title: 'Safety and privacy',
    minutes: 6,
    summary: 'What is collected, what never is, and what to tell families.',
    sections: [
      {
        heading: 'What R2BOT Kids collects about a child',
        bullets: [
          'A nickname, chosen by the child and checked for contact details and unkind words.',
          'A small progress summary: stars, sessions and activities finished, games played, the robot they built and its name.',
          'A random token, kept only in the child’s browser, that proves which roster row is theirs. R2BOT stores only a scrambled (SHA-256) copy.',
        ],
      },
      {
        heading: 'What is never collected',
        paragraphs: [
          'No email, password, phone number, birthday, photo, location or free-text chat. The camera is used only for the Workshop’s “magic window” AR, and frames never leave the device. Children cannot message each other or anyone else.',
        ],
      },
      {
        heading: 'Your responsibilities',
        bullets: [
          'Ask children to use a first name or a made-up name, never a full name.',
          'Share the family note (on your Classroom page) with parents. They can see what is shared and leave the class at any time on r2bot.in/kids/join.',
          'Remove a child from the roster when they leave your class: their nickname and class progress are deleted from R2BOT. Progress on their own device is not touched.',
          'Follow your school’s policies on devices and supervision. In class, keep devices where you can see the screens.',
        ],
      },
    ],
    tryIt: { label: 'Read what families see', href: '/kids/join', text: 'Open the join page and read the note for parents that appears before a child joins.' },
    check: {
      question: 'Which of these does R2BOT Kids store about a child in your class?',
      options: ['Their email, to send reminders', 'A photo for their profile', 'Their nickname and a progress summary', 'Their full name and date of birth'],
      answer: 2,
      why: 'A nickname and a progress summary, plus a scrambled token. Nothing that identifies or contacts the child.',
    },
  },
]

export const TRAINING_TOTAL_MINUTES = TRAINING_MODULES.reduce((a, m) => a + m.minutes, 0)
