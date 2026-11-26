// lib/kids/episodes/interactions.ts
// The authored "join in" moments of every Level 1 episode, keyed by session
// and by the index of the voiced line they follow (EpisodeLineData.i).
//
//   choice — the film pauses on a question to the child. Every option has its
//            own reply, taken from what the script says next (a gentle
//            correction when the guess was off, never a "wrong!").
//   turn   — call-and-response: after a line like "Can you say it with me?"
//            the film holds for a few seconds with a visual prompt so the
//            child can say it, stand up and turn, clap or point.
//
// Pure data: safe on server and client. Written by hand against the script
// in lib/kids/curriculum/level1 (line numbers from audio-manifest.json); if a
// line moves, planEpisode ignores an interaction whose line no longer exists.

export interface ChoiceOption {
  label: string
  /** Shown (and read out by the screen reader) after the child taps. */
  reply: string
  /** false = a fair guess the script then corrects. Omitted for opinion questions. */
  good?: boolean
}

export type TurnIcon = 'say' | 'move' | 'point' | 'count' | 'clap' | 'hands' | 'wave' | 'think'

export type Interaction =
  | { kind: 'choice'; after: number; prompt: string; options: ChoiceOption[] }
  | { kind: 'turn'; after: number; prompt: string; say?: string; seconds: number; icon: TurnIcon }

const yes = (reply: string, good?: boolean): ChoiceOption => ({ label: 'Yes!', reply, good })
const no = (reply: string, good?: boolean): ChoiceOption => ({ label: 'No', reply, good })

export const INTERACTIONS: Record<string, Interaction[]> = {
  'L1-S01': [
    {
      kind: 'choice',
      after: 12,
      prompt: 'What does Bolt do FIRST?',
      options: [
        { label: '👀 Sees the ball', reply: 'Yes! First he senses. Then he thinks. Then he acts!', good: true },
        { label: '🏃 Runs', reply: 'Running comes last! First he sees the ball, then he thinks “Ball!”', good: false },
      ],
    },
    { kind: 'turn', after: 14, prompt: 'Your turn! Say it out loud:', say: 'Sense! Think! Act!', seconds: 3.6, icon: 'say' },
    {
      kind: 'choice',
      after: 17,
      prompt: 'Which body do you like best?',
      options: [
        { label: '📦 Box', reply: 'A strong box body. You will build it next!' },
        { label: '🛸 Dome', reply: 'A round dome body. You will build it next!' },
        { label: '🗼 Tower', reply: 'A tall tower body. You will build it next!' },
        { label: '🐞 Bug', reply: 'A little bug body. You will build it next!' },
      ],
    },
  ],
  'L1-S02': [
    {
      kind: 'choice',
      after: 3,
      prompt: 'Only two wheels. Will it fall over?',
      options: [
        yes('Good worry! Look — a little ball at the back holds it up.'),
        no('Right! A little ball at the back holds it up.'),
      ],
    },
    { kind: 'turn', after: 9, prompt: 'Count the squares with Spark!', say: 'One… two… three!', seconds: 3.8, icon: 'count' },
  ],
  'L1-S03': [
    {
      kind: 'choice',
      after: 6,
      prompt: 'Go, go, THEN wait. Is that OK?',
      options: [
        yes('Hmm — then it waits AFTER the crash! The order is important.', false),
        { label: 'No, crash!', reply: 'Yes! It would wait too late. The order is important!', good: true },
      ],
    },
    {
      kind: 'choice',
      after: 8,
      prompt: 'Which card comes first?',
      options: [
        { label: '✋ Wait', reply: 'Yes! Wait first, so the bread cart can pass.', good: true },
        { label: '➡️ Go', reply: 'Then it rolls in front of the cart! Wait comes first.', good: false },
      ],
    },
  ],
  'L1-S04': [
    {
      kind: 'choice',
      after: 1,
      prompt: 'How could Noor know what the robot will do?',
      options: [
        { label: '🙂 It could tell her', reply: 'Great idea! Let’s see how a robot can show it.', good: true },
        { label: '🤷 She can’t know', reply: 'Not yet! But a robot can show a face and tell her.', good: false },
      ],
    },
    {
      kind: 'choice',
      after: 8,
      prompt: 'What would YOUR robot say?',
      options: [
        { label: '“Excuse me!”', reply: 'So polite! Kind words help people feel safe.' },
        { label: '“Going forward!”', reply: 'Now everyone knows what it will do. Safe!' },
        { label: '“Hello!”', reply: 'A friendly hello! People feel safe when robots talk.' },
      ],
    },
  ],
  'L1-S05': [
    {
      kind: 'choice',
      after: 1,
      prompt: 'How does a robot turn?',
      options: [
        { label: '↻ One wheel forward, one back', reply: 'Yes! Then it spins right on the spot.', good: true },
        { label: '⬆️ Both wheels forward', reply: 'That goes straight! Watch: one wheel forward, one back.', good: false },
      ],
    },
    { kind: 'turn', after: 7, prompt: 'Stand up and turn like the robot!', say: 'Turn right! Now turn left!', seconds: 4.2, icon: 'move' },
    {
      kind: 'choice',
      after: 11,
      prompt: 'Can our robot dance?',
      options: [yes('Let’s plan a robot dance next time!'), { label: 'Not yet', reply: 'Not yet — but YOU can plan a dance next time!' }],
    },
  ],
  'L1-S06': [
    { kind: 'turn', after: 1, prompt: 'Think of a name for your robot!', say: 'Say it out loud!', seconds: 3.4, icon: 'think' },
    {
      kind: 'choice',
      after: 2,
      prompt: 'Amara’s plan bumped the bench. What should she do?',
      options: [
        { label: '🔧 Change one step', reply: 'Yes! Try. Look. Fix. Try again.', good: true },
        { label: '🛑 Give up', reply: 'Never! Engineers change one step and try again.', good: false },
      ],
    },
  ],
  'L1-S07': [
    {
      kind: 'choice',
      after: 3,
      prompt: 'Just go, or plan first?',
      options: [
        { label: '🏃 Just go', reply: 'In a maze we would get lost! Let’s plan the whole way first.', good: false },
        { label: '🗺️ Plan first', reply: 'Yes! Plan the whole way first.', good: true },
      ],
    },
    { kind: 'turn', after: 7, prompt: 'Point to the turns on the map!', say: 'Straight… turn… straight!', seconds: 3.6, icon: 'point' },
  ],
  'L1-S08': [
    {
      kind: 'choice',
      after: 6,
      prompt: 'Where did the robot go wrong?',
      options: [
        { label: '↪️ At the turn', reply: 'Yes! It turned right, but the arrow says left.', good: true },
        { label: '🏁 At the start', reply: 'The start was fine! Look at the turn — right, not left.', good: false },
      ],
    },
    { kind: 'turn', after: 9, prompt: 'Watch, and point when it goes wrong!', seconds: 3.2, icon: 'point' },
  ],
  'L1-S09': [
    {
      kind: 'choice',
      after: 7,
      prompt: 'If you forget “pen up”, what happens?',
      options: [
        { label: '✏️ It keeps drawing', reply: 'Yes! It draws everywhere — even on the road!', good: true },
        { label: '🛑 It stops drawing', reply: 'Surprise! The pen stays down, so it keeps drawing.', good: false },
      ],
    },
  ],
  'L1-S10': [
    {
      kind: 'choice',
      after: 2,
      prompt: 'How many times does “forward, turn” repeat?',
      options: [
        { label: '2', reply: 'Count the sides: four! Four sides, four turns.', good: false },
        { label: '4', reply: 'Yes! Four sides, four turns.', good: true },
        { label: '8', reply: 'Eight blocks — but the pair repeats four times!', good: false },
      ],
    },
    { kind: 'turn', after: 6, prompt: 'Your turn! Do it with them:', say: 'Clap, clap, stomp!', seconds: 4, icon: 'clap' },
  ],
  'L1-S11': [
    {
      kind: 'choice',
      after: 3,
      prompt: 'Stripe, zig-zag, stripe… what comes next?',
      options: [
        { label: '〰️ Zig-zag', reply: 'Yes! That is the part that repeats.', good: true },
        { label: '⭕ Circle', reply: 'Look again: stripe, zig-zag, stripe, zig-zag!', good: false },
      ],
    },
    { kind: 'turn', after: 6, prompt: 'Count the steps with Spark!', say: 'One… two… three!', seconds: 3.6, icon: 'count' },
  ],
  'L1-S12': [
    {
      kind: 'choice',
      after: 3,
      prompt: 'What will YOU draw?',
      options: [
        { label: '🏠 A house', reply: 'Lovely! Repeat makes the windows easy.' },
        { label: '🌸 A flower', reply: 'A flower of squares — Repeat will help!' },
        { label: '⛰️ Mountain steps', reply: 'Up and up! A pattern of steps.' },
      ],
    },
    { kind: 'turn', after: 4, prompt: 'Show six fingers!', say: 'Six lights — halfway!', seconds: 3, icon: 'hands' },
  ],
  'L1-S13': [
    {
      kind: 'choice',
      after: 2,
      prompt: 'Which tool can carry a float?',
      options: [
        { label: '✏️ Pen', reply: 'A pen draws, but it can’t carry. We need a scoop!', good: false },
        { label: '🥄 Scoop', reply: 'Yes! The tool for the job.', good: true },
      ],
    },
    {
      kind: 'choice',
      after: 5,
      prompt: 'What could a robot scoop?',
      options: [
        { label: '🏖️ Sand', reply: 'Yes! A scoop can carry sand.' },
        { label: '🍚 Rice', reply: 'Yes! A scoop can carry rice.' },
        { label: '🧸 Toys', reply: 'Yes! A scoop can tidy up toys.' },
      ],
    },
  ],
  'L1-S14': [
    {
      kind: 'choice',
      after: 1,
      prompt: 'What changed?',
      options: [
        { label: '🏮 A heavy lantern, uphill', reply: 'Yes! Heavy and uphill means slower.', good: true },
        { label: '😴 The robot is tired', reply: 'Robots don’t get tired! The lantern is heavy, and it’s uphill.', good: false },
      ],
    },
    {
      kind: 'choice',
      after: 5,
      prompt: 'Which goes the LEAST far?',
      options: [
        { label: 'Flat, no load', reply: 'That one goes the farthest! Heavy and uphill goes least far.', good: false },
        { label: 'Uphill + heavy', reply: 'Yes! Slower means less far.', good: true },
      ],
    },
  ],
  'L1-S15': [
    {
      kind: 'choice',
      after: 1,
      prompt: 'Why did it keep going?',
      options: [
        { label: '🧊 The ice is slippery', reply: 'Yes! On ice, the wheels can’t grip.', good: true },
        { label: '🤖 It forgot to stop', reply: 'It did stop its wheels! But on ice nothing grips.', good: false },
      ],
    },
    { kind: 'turn', after: 6, prompt: 'Show me with your hands!', say: 'Slide on ice… sink in sand!', seconds: 4, icon: 'hands' },
  ],
  'L1-S16': [
    { kind: 'turn', after: 2, prompt: 'Count with Spark!', say: '1… 2… 3… 4!', seconds: 4, icon: 'count' },
    {
      kind: 'choice',
      after: 7,
      prompt: 'If the bridge changes its timing…',
      options: [
        { label: 'Our count is wrong', reply: 'Yes! One day your robot will need senses.', good: true },
        { label: 'Still fine', reply: 'Our count would be wrong! The robot needs senses to notice.', good: false },
      ],
    },
  ],
  'L1-S17': [
    {
      kind: 'choice',
      after: 0,
      prompt: 'Why can’t Spark see?',
      options: [
        { label: '💡 No light', reply: 'Yes! Cameras need light, just like your eyes.', good: true },
        { label: '🙈 Eyes shut', reply: 'Spark’s eyes are open! Cameras need light to see.', good: false },
      ],
    },
    {
      kind: 'choice',
      after: 5,
      prompt: 'Light on BEFORE the tunnel or after?',
      options: [
        { label: 'Before', reply: 'Yes! Then everyone sees us coming.', good: true },
        { label: 'After', reply: 'Then we would bump in the dark! On before we go in.', good: false },
      ],
    },
  ],
  'L1-S18': [
    {
      kind: 'choice',
      after: 3,
      prompt: 'Which job will your robot do?',
      options: [
        { label: '📦 Carry things', reply: 'Kind! Ask first what Nana needs, then choose the tool.' },
        { label: '💡 Light the hall', reply: 'Kind! Ask first what Nana needs, then choose the tool.' },
        { label: '✉️ Bring the post', reply: 'Kind! Ask first what Nana needs, then choose the tool.' },
      ],
    },
  ],
  'L1-S19': [
    { kind: 'turn', after: 2, prompt: 'Close your eyes and feel the floor!', say: 'What can you feel?', seconds: 3.6, icon: 'hands' },
    {
      kind: 'choice',
      after: 6,
      prompt: 'How many hops to the wall?',
      options: [
        { label: '3', reply: 'We can’t see to count! Just go until you feel a bump.', good: false },
        { label: '5', reply: 'We can’t see to count! Just go until you feel a bump.', good: false },
        { label: 'We don’t need to know!', reply: 'Yes! Keep going until you feel a bump.', good: true },
      ],
    },
  ],
  'L1-S20': [
    {
      kind: 'choice',
      after: 2,
      prompt: 'Nana bumps a hedge. What does she do?',
      options: [
        { label: '↪️ Turn right', reply: 'Yes! One rule — no map needed.', good: true },
        { label: '🛑 Stop for ever', reply: 'Then she’d never get out! Her rule: bump, turn right.', good: false },
      ],
    },
    { kind: 'turn', after: 6, prompt: 'Say it with Spark!', say: 'Sense! Think! Act!', seconds: 3.4, icon: 'say' },
  ],
  'L1-S21': [
    {
      kind: 'choice',
      after: 0,
      prompt: 'How do bats not crash in the dark?',
      options: [
        { label: '👂 Echoes', reply: 'Yes! A tiny squeak, then they listen for the echo.', good: true },
        { label: '🔦 Torches', reply: 'Bats don’t carry torches! They squeak and listen for echoes.', good: false },
      ],
    },
    {
      kind: 'choice',
      after: 6,
      prompt: 'Better for not bumping into a friend?',
      options: [
        { label: 'Bumper', reply: 'A bumper only knows AFTER the touch. Distance Eyes know before!', good: false },
        { label: 'Distance Eyes', reply: 'Yes! They know BEFORE the touch.', good: true },
      ],
    },
  ],
  'L1-S22': [
    { kind: 'turn', after: 2, prompt: 'Do it with Noor!', say: 'Stop. Look. Wait. Go!', seconds: 4, icon: 'say' },
    {
      kind: 'choice',
      after: 7,
      prompt: 'Who keeps a robot safe?',
      options: [
        { label: '🤖 The robot', reply: 'The robot follows its program. The builders keep it safe — that’s you!', good: false },
        { label: '🧑‍🔧 The people who build it', reply: 'Yes! The people who build and program it. That’s you now!', good: true },
      ],
    },
  ],
  'L1-S23': [
    {
      kind: 'choice',
      after: 1,
      prompt: 'What never goes wrong on a hill?',
      options: [
        { label: 'Counting hops', reply: 'Hops get shorter on a hill! The Distance Eyes never go wrong.', good: false },
        { label: '👀 Distance Eyes', reply: 'Yes! Go until the wall is close.', good: true },
      ],
    },
    { kind: 'turn', after: 8, prompt: 'Cheer with Amara!', say: 'All twelve lights!', seconds: 3, icon: 'wave' },
  ],
  'L1-S24': [
    { kind: 'turn', after: 0, prompt: 'Count the lights with us!', say: '…ten, eleven, twelve!', seconds: 3, icon: 'count' },
    {
      kind: 'choice',
      after: 2,
      prompt: 'What will your robot show have?',
      options: [
        { label: '💃 A dance', reply: 'A dance with a loop in it — brilliant!' },
        { label: '✏️ A drawing', reply: 'A drawing show — pen down!' },
        { label: '💡 Lights', reply: 'A light show for the festival!' },
      ],
    },
    { kind: 'turn', after: 7, prompt: 'Wave goodbye to everyone!', say: 'Bye, Spark! Bye, Amara!', seconds: 3, icon: 'wave' },
  ],
}

export function interactionsFor(sessionId: string): Interaction[] {
  return INTERACTIONS[sessionId] ?? []
}
