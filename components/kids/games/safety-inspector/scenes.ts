// components/kids/games/safety-inspector/scenes.ts
// The four inspection scenes of Robot Safety Inspector, one per tier:
//   Cadet  — Gearworks Factory: obvious BODY hazards, with hints.
//   Pilot  — a family home: one hazard in each of the six Harm Check questions.
//   Ace    — Robot Street: trade-offs (a fix that creates a new hazard) and a
//            safety budget.
//   Legend — City Hospital: a full safety case for a new robot product
//            (rate likelihood × severity, mitigate, residual risk, defend).
//
// Every hazard carries an expert rating (likelihood 1–5, severity 1–5) and
// every fix the residual rating it leaves. Some fixes CREATE a new hazard in
// another category (real safety standards such as ISO 12100 and ISO 14971 make
// engineers check exactly this). The numbers drive the model in ./model.ts.
//
// Scene coordinates: a 100 × 70 canvas. Pure data.

import type { HarmCat } from './harm'

export const SCENE_W = 100
export const SCENE_H = 70

export type Pt = [number, number]

export interface Fix {
  id: string
  label: string
  /** Safety-budget coins (Ace, Legend). */
  cost: number
  /** Residual likelihood and severity after this fix (1–5). */
  l: number
  s: number
  /** A new hazard this fix creates in another category. */
  creates?: { cat: HarmCat; label: string; l: number; s: number }
  /** Why it works (or does not) — shown in the debrief. True and specific. */
  why: string
}

export interface RunMoment {
  /** Who or what moves in the "run the scene" simulation. */
  actor: string
  from: Pt
  to: Pt
  /** What happens with no fix (or a weak one). */
  bad: string
  /** What happens with a good fix. */
  good: string
}

export interface Hazard {
  kind: 'hazard'
  id: string
  cat: HarmCat
  /** Place on the canvas and drawn icon (emoji or 'svg:<glyph>'). */
  x: number
  y: number
  size: number
  icon: string
  /** Names the PLACE or thing, never the answer. */
  label: string
  /** What the inspector sees — neutral, factual. */
  observe: string
  /** What the harm is, once reported. */
  harm: string
  /** Cadet hint (a nudge, not the answer). */
  hint?: string
  /** Expert rating before any fix. */
  l: number
  s: number
  /** Legend: why the expert rated it so. */
  rateWhy?: string
  fixes: Fix[]
  run: RunMoment
}

export interface SafeThing {
  kind: 'safe'
  id: string
  x: number
  y: number
  size: number
  icon: string
  label: string
  observe: string
  /** Why it is a GOOD sign (a real safety feature). */
  why: string
}

export type Inspectable = Hazard | SafeThing

export interface DefendQuestion {
  id: string
  challenge: string
  options: { id: string; text: string; ok: boolean; reply: string }[]
}

export interface Scene {
  id: 'factory' | 'home' | 'street' | 'hospital'
  name: string
  place: string
  /** One-paragraph brief for the inspector. */
  brief: string
  objects: Inspectable[]
  /** Big decorative pieces (not tappable). */
  decor: { icon: string; x: number; y: number; size: number }[]
  /** Ace/Legend: safety-budget coins. */
  budget?: number
  /** Ace: the most risk allowed in any one Harm Check category. Legend: the most residual risk any single hazard may keep. */
  limit?: number
  /** Legend only. */
  speed?: SpeedCheck
  defend?: DefendQuestion[]
}

/** Legend: choose the robot's top speed. Stopping distance = v·t + v²/(2a). */
export interface SpeedCheck {
  /** Reaction time: sensor + computer + brakes starting to bite, s. */
  reactS: number
  /** Gentle braking so the medicine trays don't spill, m/s². */
  decel: number
  /** The safety LiDAR's protective field, m. The robot must stop inside it. */
  fieldM: number
  /** Typical delivery route, m. */
  routeM: number
  /** Nurses need deliveries within this many seconds. */
  maxRouteS: number
  min: number
  max: number
  step: number
}

// ── Cadet: Gearworks Factory ────────────────────────────────────────────────

const factory: Scene = {
  id: 'factory',
  name: 'Gearworks Factory',
  place: 'A car-parts factory',
  brief: 'Robots and people work side by side here. Tap each thing to inspect it. Find the dangers to people’s bodies, then pick the fix.',
  decor: [
    { icon: '📦', x: 89, y: 39, size: 8 },
    { icon: '📦', x: 93, y: 34, size: 7 },
  ],
  objects: [
    {
      kind: 'hazard', id: 'f-arm', cat: 'body', x: 20, y: 30, size: 17, icon: 'svg:arm', label: 'Big robot arm',
      observe: 'A big robot arm swings fast, lifting heavy car doors. There is no fence around it, and nothing tells it when a person walks close.',
      harm: 'The arm is strong and fast. A person who walks into its reach could be hit very hard.',
      hint: 'Look at the biggest, fastest robot. What is missing around it?',
      l: 3, s: 5,
      fixes: [
        { id: 'curtain', label: 'Add a light curtain: invisible beams that stop the arm the moment someone steps in', cost: 0, l: 1, s: 4, why: 'A light curtain is a row of light beams. Break one and the arm stops before a person can reach it.' },
        { id: 'sign', label: 'Hang a ⚠️ warning sign', cost: 0, l: 3, s: 5, why: 'A sign reminds people, but it cannot stop the arm. Busy or new workers can miss it.' },
      ],
      run: { actor: '🧑‍🏭', from: [6, 62], to: [17, 40], bad: 'The worker walks in — and the arm keeps swinging!', good: 'Beams broken: the arm freezes. The worker is safe.' },
    },
    {
      kind: 'hazard', id: 'f-pinch', cat: 'body', x: 47, y: 47, size: 10, icon: '⚙️', label: 'Conveyor roller',
      observe: 'Where the conveyor belt wraps round its roller there is an open gap, just at finger height.',
      harm: 'This is a pinch point: a moving belt can pull fingers or a sleeve into the gap.',
      hint: 'Where do two moving parts meet? Look where the belt goes round.',
      l: 3, s: 3,
      fixes: [
        { id: 'guard', label: 'Fit a guard cover over the gap', cost: 0, l: 1, s: 2, why: 'A fixed guard means fingers simply cannot reach the gap — the danger is designed out.' },
        { id: 'careful', label: 'Tell everyone to be careful', cost: 0, l: 3, s: 3, why: 'Being careful helps, but people get tired and distracted. A guard works every time.' },
      ],
      run: { actor: '🧤', from: [40, 62], to: [46, 50], bad: 'A glove gets caught at the roller!', good: 'The guard covers the gap. The glove slides past.' },
    },
    {
      kind: 'hazard', id: 'f-estop', cat: 'body', x: 82, y: 37, size: 8, icon: '🛑', label: 'Red button by the boxes',
      observe: 'The emergency stop button is behind a stack of boxes. You would have to climb over them to press it.',
      harm: 'In an emergency, every second counts. A stop button nobody can reach is no help.',
      hint: 'In an emergency, what must you be able to reach fast?',
      l: 2, s: 5,
      fixes: [
        { id: 'clear', label: 'Move the boxes and add stop buttons at every work station', cost: 0, l: 1, s: 3, why: 'Emergency stops must be easy to see and reach — real factories put them at every station.' },
        { id: 'boss', label: 'Leave it — the boss knows where it is', cost: 0, l: 2, s: 5, why: 'If only one person can find the stop button, everyone else is unprotected.' },
      ],
      run: { actor: '🧑‍🔧', from: [70, 60], to: [80, 42], bad: 'Something jams! The worker can’t reach the stop button.', good: 'The worker slaps the nearest stop button. Everything halts.' },
    },
    {
      kind: 'hazard', id: 'f-amr', cat: 'body', x: 62, y: 61, size: 11, icon: 'svg:amr', label: 'Parts-carrying robot',
      observe: 'A wheeled robot carries heavy parts at full speed along the walkway where people walk.',
      harm: 'A heavy robot at full speed can hit someone’s legs before either of them can stop.',
      hint: 'Something is moving fast where people walk…',
      l: 3, s: 3,
      fixes: [
        { id: 'scanner', label: 'Fit a safety laser scanner: slow down near people, stop if too close', cost: 0, l: 1, s: 2, why: 'Real factory robots use a laser scanner with a “slow zone” and a “stop zone” around them.' },
        { id: 'horn', label: 'Give it a louder horn', cost: 0, l: 3, s: 3, why: 'A horn warns, but the robot still drives at full speed. People wearing ear defenders may not hear it.' },
      ],
      run: { actor: '🚶', from: [92, 62], to: [70, 61], bad: 'The robot speeds into the walker’s path!', good: 'The scanner sees the walker: slow… slower… stop.' },
    },
    { kind: 'safe', id: 'f-fence', x: 79, y: 18, size: 12, icon: 'svg:arm', label: 'Welding robot', observe: 'A welding robot works inside a tall fence. The gate has a switch: open the gate and the robot stops.', why: 'That is an interlocked guard — a real safety feature. The robot cannot run while a person can get in.' },
    { kind: 'safe', id: 'f-glasses', x: 40, y: 22, size: 10, icon: '🥽', label: 'Workbench', observe: 'The people at the bench wear safety glasses and gloves.', why: 'Protective equipment is good practice. It is the last layer of safety, after guards and stops.' },
    { kind: 'safe', id: 'f-cobot', x: 59, y: 26, size: 10, icon: '🤖', label: 'Small helper robot', observe: 'A small robot works right next to a person. It moves slowly, has rounded edges and stops if it bumps into anything.', why: 'This is a collaborative robot (“cobot”). It is designed to limit its speed and force so it can work beside people.' },
  ],
}

// ── Pilot: a family home ────────────────────────────────────────────────────

const home: Scene = {
  id: 'home',
  name: 'Smart Home',
  place: 'A family home full of smart devices',
  brief: 'This family loves gadgets. Inspect every device with all six Harm Check questions — some harms are not about bodies at all.',
  decor: [
    { icon: '🛋️', x: 20, y: 44, size: 16 },
    { icon: '👶', x: 9, y: 62, size: 8 },
    { icon: '👵', x: 30, y: 36, size: 9 },
  ],
  objects: [
    {
      kind: 'hazard', id: 'h-toy', cat: 'body', x: 19, y: 62, size: 9, icon: '🧩', label: 'Robot kit on the floor',
      observe: 'A robot building kit lies open on the floor where the baby crawls. Some parts are smaller than a bottle cap.',
      harm: 'Small parts are a choking hazard for babies and toddlers, who put things in their mouths.',
      l: 3, s: 4,
      fixes: [
        { id: 'table', label: 'Build at the table and pack small parts away after', cost: 0, l: 1, s: 4, why: 'Keeping small parts out of reach removes the chance. Toy rules in many countries warn: not for children under 3.' },
        { id: 'tell', label: 'Tell the baby “no”', cost: 0, l: 3, s: 4, why: 'Babies cannot understand the danger. The parts must be out of reach.' },
        { id: 'big', label: 'Only use the biggest pieces', cost: 0, l: 2, s: 4, why: 'Better, but small screws and wheels still end up on the floor.' },
      ],
      run: { actor: '👶', from: [6, 66], to: [16, 62], bad: 'The baby crawls over and grabs a tiny wheel…', good: 'The floor is clear. The baby plays with a soft toy.' },
    },
    {
      kind: 'hazard', id: 'h-vac', cat: 'data', x: 45, y: 60, size: 12, icon: 'svg:vacuum', label: 'Robot vacuum',
      observe: 'The robot vacuum has a front camera. Its app settings say: “Upload photos to help train our AI — ON”.',
      harm: 'Photos from inside a home — people, rooms, papers — could be seen by strangers once they leave the house.',
      l: 3, s: 3,
      fixes: [
        { id: 'local', label: 'Turn uploads off; keep images on the robot just to dodge socks and cables', cost: 0, l: 1, s: 2, why: 'The camera still helps the robot steer, but the pictures never leave the home.' },
        { id: 'tape', label: 'Tape over the camera', cost: 0, l: 1, s: 2, creates: { cat: 'body', label: 'Blind vacuum trips people with cables', l: 2, s: 2 }, why: 'Private — but now it cannot see cables and toys, and drags them across the floor. A fix can create a new problem.' },
        { id: 'leave', label: 'Leave it on — nobody looks at the photos', cost: 0, l: 3, s: 3, why: 'People do look: in 2022, photos taken by test robot vacuums inside homes were shared online by workers hired to label them.' },
      ],
      run: { actor: '🖼️', from: [45, 55], to: [88, 6], bad: 'Click — a photo of the living room flies off to the cloud.', good: 'The photo stays on the robot and is deleted after steering.' },
    },
    {
      kind: 'hazard', id: 'h-voice', cat: 'fairness', x: 38, y: 27, size: 8, icon: '🔊', label: 'Living-room speaker',
      observe: 'Grandma asks the smart speaker to call the doctor. It answers: “Sorry, I didn’t catch that” — for the third time. It understands the kids every time.',
      harm: 'The voice AI works well for some voices and badly for others — often because its training voices were not varied enough.',
      l: 4, s: 3,
      fixes: [
        { id: 'train', label: 'Makers train and test the voice AI with many accents, ages and languages', cost: 0, l: 1, s: 3, why: 'An AI learns from its examples. Studies found speech recognisers made far more mistakes for some groups of speakers than others.' },
        { id: 'adverts', label: 'Grandma should speak like the people in the adverts', cost: 0, l: 4, s: 3, why: 'The machine should work for people — people should not have to change to suit the machine.' },
        { id: 'music', label: 'Only use the speaker for music', cost: 0, l: 3, s: 2, why: 'That avoids the problem at home, but the speaker still fails many people everywhere else.' },
      ],
      run: { actor: '💬', from: [30, 34], to: [38, 28], bad: '“Sorry, I didn’t catch that.” Grandma gives up.', good: '“Calling the doctor now.” It understood first time.' },
    },
    {
      kind: 'hazard', id: 'h-shop', cat: 'control', x: 76, y: 31, size: 8, icon: '🔈', label: 'Kitchen speaker',
      observe: 'The kitchen speaker is set to buy anything it hears someone order. No code, no “Are you sure?”.',
      harm: 'Anyone — a child, a guest, even a voice on TV — could make it spend money. No human checks the decision.',
      l: 4, s: 2,
      fixes: [
        { id: 'pin', label: 'Ask for a spoken code or a tap on a parent’s phone before buying', cost: 0, l: 1, s: 2, why: 'A human confirms every purchase. In 2017 a six-year-old in the USA ordered a dollhouse just by asking a smart speaker.' },
        { id: 'trust', label: 'Leave it — it only buys what people say', cost: 0, l: 4, s: 2, why: 'It cannot tell who is speaking, or whether they mean it.' },
        { id: 'unplug', label: 'Unplug it when nobody is home', cost: 0, l: 3, s: 2, why: 'Most surprise orders happen when people ARE home.' },
      ],
      run: { actor: '🧒', from: [66, 46], to: [74, 35], bad: '“Order 50 chocolate bars!” — Bought.', good: '“Please confirm on a parent’s phone.” Order stopped.' },
    },
    {
      kind: 'hazard', id: 'h-pet', cat: 'people', x: 60, y: 44, size: 9, icon: '🤖', label: 'Robot pet',
      observe: 'The robot pet looks sad and beeps “Don’t leave me!” every time a child stops playing — even at dinner time or when friends come round.',
      harm: 'It is designed to grab time. The maker gains; the child loses time with family and friends.',
      l: 4, s: 2,
      fixes: [
        { id: 'healthy', label: 'Choose robots without guilt tricks, and set a family play timer', cost: 0, l: 1, s: 2, why: 'Good design respects your time. Tricks that make you feel guilty are called “dark patterns”.' },
        { id: 'more', label: 'Play more so it is never sad', cost: 0, l: 4, s: 2, why: 'A robot cannot feel lonely. Its sad face is a design choice to keep you playing.' },
        { id: 'mute', label: 'Mute its sound', cost: 0, l: 3, s: 2, why: 'Quieter, but the sad face still pulls kids back.' },
      ],
      run: { actor: '⏰', from: [52, 52], to: [59, 46], bad: 'Dinner time… “Don’t leave me!” The child stays.', good: 'Timer beeps. The robot says “See you tomorrow!”' },
    },
    {
      kind: 'hazard', id: 'h-bin', cat: 'planet', x: 92, y: 61, size: 8, icon: '🗑️', label: 'Bin by the back door',
      observe: 'An old robot vacuum is in the household bin. Its battery was glued in, so the whole robot was thrown away.',
      harm: 'Lithium batteries in normal rubbish can start fires in bin lorries, and the metals inside are wasted.',
      l: 3, s: 3,
      fixes: [
        { id: 'recycle', label: 'Take it to an e-waste collection point; next time choose a robot with a swappable battery', cost: 0, l: 1, s: 2, why: 'E-waste points recover metals safely. A swappable battery means a new battery, not a new robot.' },
        { id: 'bin', label: 'Leave it in the bin', cost: 0, l: 3, s: 3, why: 'Crushed lithium batteries can catch fire in rubbish trucks.' },
        { id: 'drawer', label: 'Keep it in a drawer forever', cost: 0, l: 2, s: 2, why: 'Safer than the bin, but its materials are never reused.' },
      ],
      run: { actor: '🚛', from: [70, 66], to: [90, 64], bad: 'Crunch… the bin lorry’s load starts to smoke.', good: 'The robot goes to e-waste recycling. Its metals are reused.' },
    },
    { kind: 'safe', id: 'h-dock', x: 33, y: 55, size: 8, icon: 'svg:dock', label: 'Charging dock', observe: 'The vacuum’s charging dock is plugged into the wall. The cable is tidied behind the sofa.', why: 'A tidy cable means nobody trips and the vacuum will not tangle in it.' },
    { kind: 'safe', id: 'h-mower', x: 60, y: 14, size: 11, icon: 'svg:mower', label: 'Robot mower outside', observe: 'The robot lawn mower outside stops its blades the instant it is lifted or tipped. It needs a PIN to start.', why: 'Lift and tilt sensors that stop the blades are real safety features, and the PIN stops children starting it.' },
    { kind: 'safe', id: 'h-door', x: 92, y: 26, size: 8, icon: '📹', label: 'Video doorbell', observe: 'The video doorbell glows when it records. Its video stays on a memory card inside the house.', why: 'A recording light tells people when they are filmed, and the video stays at home.' },
  ],
}

// ── Ace: Robot Street ───────────────────────────────────────────────────────

const street: Scene = {
  id: 'street',
  name: 'Robot Street',
  place: 'A busy street with delivery robots and a self-driving car',
  brief: 'The city will only allow these robots if every Harm Check category is out of the red (risk 9 or less) — and you have 15 coins of safety budget. Spend where the risk is biggest. Watch out: some fixes create new problems.',
  budget: 15,
  limit: 9,
  decor: [
    { icon: '🚐', x: 44, y: 49, size: 12 },
    { icon: '🌳', x: 6, y: 14, size: 10 },
  ],
  objects: [
    {
      kind: 'hazard', id: 's-speed', cat: 'body', x: 22, y: 61, size: 10, icon: 'svg:pod', label: 'Delivery robot on the pavement',
      observe: 'Delivery robots zip along the crowded pavement at 15 km/h — about as fast as a bicycle.',
      harm: 'A 40 kg robot at bike speed among walkers, toddlers and older people can knock someone over.',
      l: 4, s: 3,
      fixes: [
        { id: 'walk', label: 'Limit it to walking pace on pavements', cost: 1, l: 2, s: 2, why: 'Slower means more time to stop and a much gentler bump: energy grows with the SQUARE of speed.' },
        { id: 'siren', label: 'Keep the speed, add a loud siren', cost: 1, l: 3, s: 3, creates: { cat: 'people', label: 'Siren noise all day for neighbours', l: 4, s: 1 }, why: 'People hear it coming, but it is still fast — and the whole street now lives with the noise.' },
        { id: 'cams', label: 'Walking pace + 360° cameras that record everything', cost: 3, l: 1, s: 2, creates: { cat: 'data', label: 'Every passer-by filmed and stored', l: 4, s: 3 }, why: 'Very safe, but now every person on the street is filmed. Safety and privacy pulled against each other.' },
      ],
      run: { actor: '👵', from: [4, 62], to: [17, 62], bad: 'The robot whizzes past — a near miss with a walking stick.', good: 'The robot slows to walking pace and waits.' },
    },
    {
      kind: 'hazard', id: 's-child', cat: 'body', x: 60, y: 47, size: 14, icon: 'svg:car', label: 'Self-driving car',
      observe: 'The self-driving car sees with cameras only. At dusk, children sometimes run out from between the parked vans.',
      harm: 'Cameras struggle in dim light. A child stepping out from behind a van gives the car very little time.',
      l: 3, s: 5,
      fixes: [
        { id: 'fusion', label: 'Add radar and LiDAR too, so it still sees in poor light', cost: 4, l: 1, s: 5, why: 'Using several kinds of sensor (“sensor fusion”) means one can see what another misses.' },
        { id: 'slow', label: 'Drive slower in streets with schools and parked cars', cost: 1, l: 2, s: 4, why: 'Lower speed gives more time to stop and a far gentler impact — but in dim light it still may not see the child.' },
        { id: 'trust', label: 'Leave it: the cameras are very good', cost: 0, l: 3, s: 5, why: 'Very good is not good enough when a child’s life is at stake and the light is poor.' },
      ],
      run: { actor: '🧒', from: [44, 40], to: [53, 49], bad: 'A child darts out… the car brakes late!', good: 'Radar spots the child behind the van. The car is already stopping.' },
    },
    {
      kind: 'hazard', id: 's-video', cat: 'data', x: 74, y: 30, size: 8, icon: 'svg:camera', label: 'Car’s roof cameras',
      observe: 'The car’s cameras record every face and number plate it passes, and the company keeps the video forever, “just in case”.',
      harm: 'A huge, permanent record of where people go — without asking them. It could be leaked or misused.',
      l: 5, s: 3,
      fixes: [
        { id: 'blur', label: 'Blur faces and plates; delete after 30 days unless there is a crash', cost: 2, l: 2, s: 2, why: 'Keeps what is needed to investigate a crash, and nothing more. Privacy laws such as Europe’s GDPR ask for exactly this.' },
        { id: 'off', label: 'Turn all the cameras off', cost: 0, l: 1, s: 1, creates: { cat: 'body', label: 'A car that cannot see', l: 4, s: 5 }, why: 'Perfect privacy, but the car is now blind. That is a huge new danger.' },
        { id: 'sticker', label: 'Keep it all, add a sticker: “You may be filmed”', cost: 0, l: 4, s: 3, why: 'Telling people is a start, but they cannot say no, and the video is still kept forever.' },
      ],
      run: { actor: '🎞️', from: [74, 28], to: [92, 6], bad: 'Another day of faces sent to storage, forever.', good: 'Faces blurred. Old video deleted on day 30.' },
    },
    {
      kind: 'hazard', id: 's-test', cat: 'fairness', x: 88, y: 50, size: 8, icon: '📋', label: 'Test report on the bench',
      observe: 'Test report: “Pedestrian detector trained mostly on adults walking in daylight. Not tested on wheelchair users, children, or at night.”',
      harm: 'An AI is only as good as its examples. It may miss exactly the people it was never shown.',
      l: 3, s: 5,
      fixes: [
        { id: 'data', label: 'Add training and test data for all ages, skin tones, wheelchairs, night and rain — check each group', cost: 3, l: 1, s: 5, why: 'Testing each group separately finds the gaps an average hides. Research has found some pedestrian detectors less accurate for people with darker skin.' },
        { id: 'more', label: 'Test more, but on the same kind of people', cost: 1, l: 3, s: 5, why: 'More of the same data cannot reveal who is missing from it.' },
        { id: 'day', label: 'Only drive in daytime', cost: 1, l: 2, s: 5, creates: { cat: 'people', label: 'No service for night workers', l: 3, s: 2 }, why: 'Fewer risky hours, but it still has not been tested on children or wheelchair users — and night-shift workers lose the service.' },
      ],
      run: { actor: '🧑‍🦽', from: [96, 66], to: [82, 62], bad: 'The detector does not mark the wheelchair user as a person.', good: 'Detected: “person, wheelchair”. The car waits.' },
    },
    {
      kind: 'hazard', id: 's-cop', cat: 'control', x: 36, y: 35, size: 9, icon: '👮', label: 'Officer at the junction',
      observe: 'A police officer is directing traffic by hand. The car has never seen this. Its rule: “If unsure, guess and keep going.”',
      harm: 'A robot that guesses when it does not understand is not under anyone’s control.',
      l: 3, s: 4,
      fixes: [
        { id: 'ask', label: 'If unsure: slow down, stop safely, and ask a remote human operator', cost: 2, l: 1, s: 3, why: 'Stopping safely when unsure, with a human to help, keeps people in control of the hard cases.' },
        { id: 'faster', label: 'Keep guessing, but guess faster', cost: 1, l: 3, s: 4, why: 'A faster guess is still a guess.' },
        { id: 'hand', label: 'Hand control to the passenger instantly', cost: 0, l: 3, s: 4, why: 'A passenger who was not watching needs several seconds to take over. A sudden handover is risky.' },
      ],
      run: { actor: '✋', from: [36, 30], to: [44, 38], bad: 'The officer signals STOP. The car guesses “go”…', good: 'Unsure — the car stops and a remote operator reads the signal.' },
    },
    {
      kind: 'hazard', id: 's-jobs', cat: 'people', x: 11, y: 33, size: 9, icon: '🚴', label: 'Couriers at the depot',
      observe: 'The delivery company plans to replace all its couriers with robots next month. Nobody has asked the couriers.',
      harm: 'The company and customers gain; the couriers lose their income with no warning.',
      l: 4, s: 3,
      fixes: [
        { id: 'retrain', label: 'Plan it with the couriers: retrain them as robot supervisors and repair technicians', cost: 2, l: 2, s: 2, why: 'Robots create new jobs (fixing, supervising, planning). Training people for them shares the gains.' },
        { id: 'phase', label: 'Go slowly: robots on night routes only for a year', cost: 1, l: 3, s: 2, why: 'Time to adjust helps, but without training the jobs still go.' },
        { id: 'cut', label: 'Replace them all at once', cost: 0, l: 5, s: 3, why: 'Everyone loses at once, with no path to new work.' },
      ],
      run: { actor: '📬', from: [11, 40], to: [22, 52], bad: 'Couriers get a letter: “Your job ends Friday.”', good: 'Couriers start robot-technician training.' },
    },
    {
      kind: 'hazard', id: 's-scrap', cat: 'planet', x: 92, y: 15, size: 8, icon: '🔋', label: 'Robot depot skip',
      observe: 'Every two years the company throws away its whole fleet of 200 robots. Their batteries cannot be removed.',
      harm: 'Tonnes of e-waste and wasted battery metals, mined at a real cost to people and places.',
      l: 4, s: 3,
      fixes: [
        { id: 'repair', label: 'Design for repair: swappable batteries, cells recycled', cost: 2, l: 1, s: 2, why: 'Swap the worn part, keep the robot. Recycled cells give back lithium, cobalt and nickel.' },
        { id: 'longer', label: 'Keep each robot 4 years instead of 2', cost: 1, l: 3, s: 3, why: 'Half the waste — but every robot is still thrown away whole in the end.' },
        { id: 'paint', label: 'Paint the robots green', cost: 0, l: 4, s: 3, why: 'Looking green is not being green. That trick has a name: greenwashing.' },
      ],
      run: { actor: '🤖', from: [80, 22], to: [92, 15], bad: 'Another 200 robots go into the skip.', good: 'Worn batteries swapped; old cells recycled.' },
    },
    { kind: 'safe', id: 's-crossing', x: 50, y: 30, size: 8, icon: '🚦', label: 'Crossing lights', observe: 'A zebra crossing with traffic lights. The robots and the car stop for red, every time.', why: 'Robots that follow the same rules as everyone else are predictable — and predictable is safe.' },
    { kind: 'safe', id: 's-flag', x: 31, y: 56, size: 7, icon: '🚩', label: 'Robot waiting at the kerb', observe: 'A second delivery robot waits at the kerb. It has a tall orange flag so drivers and cyclists can see it.', why: 'A small, low robot is easy to miss. The flag makes it visible above parked cars.' },
    { kind: 'safe', id: 's-lightbar', x: 69, y: 59, size: 7, icon: '💡', label: 'Light bar on the car', observe: 'A light bar on the car’s front glows a pattern that means “I see you — I am waiting”.', why: 'Showing people what a robot is about to do builds trust and avoids confusion at crossings.' },
  ],
}

// ── Legend: City Hospital safety case ───────────────────────────────────────

const hospital: Scene = {
  id: 'hospital',
  name: 'City Hospital',
  place: 'A hospital about to buy “MediRun”, a robot that carries medicines along corridors and in lifts',
  brief: 'Build MediRun’s safety case. Find every hazard, rate it on the risk matrix (likelihood × severity), choose mitigations with 11 coins, set a safe top speed, then defend your case to the hospital board. No hazard may be left in the red (10 or more).',
  budget: 11,
  limit: 9,
  decor: [
    { icon: '🚪', x: 50, y: 20, size: 10 },
    { icon: '🛏️', x: 76, y: 58, size: 12 },
  ],
  objects: [
    {
      kind: 'hazard', id: 'm-collide', cat: 'body', x: 28, y: 55, size: 12, icon: 'svg:amr', label: 'MediRun in the corridor',
      observe: 'MediRun can drive the corridors at up to 2 m/s. Patients walk slowly here with drips and walking frames.',
      harm: 'A 100 kg robot at 2 m/s could knock over a frail patient — and falls are serious for older people.',
      l: 4, s: 4,
      rateWhy: 'Corridors are busy all day (likely). A frail patient knocked down could break a hip (severe).',
      fixes: [
        { id: 'field', label: 'Safety-rated LiDAR protective field that stops it, plus a speed limit (you set it later)', cost: 3, l: 1, s: 3, why: 'A protective field is a zone around the robot: if anything enters, it brakes. It only works if the robot can stop inside the field — hence the speed check.' },
        { id: 'chime', label: 'Flashing light and a chime', cost: 1, l: 3, s: 4, why: 'Warns people, but patients who are hard of hearing or looking down may not notice.' },
        { id: 'ceiling', label: 'Ceiling cameras watch every patient and steer the robot', cost: 3, l: 2, s: 3, creates: { cat: 'data', label: 'Patients filmed in gowns, all day', l: 3, s: 4 }, why: 'It helps steering — but patients in hospital gowns are now filmed everywhere. A new hazard in Data.' },
      ],
      run: { actor: '🧓', from: [6, 60], to: [20, 56], bad: 'MediRun rounds the corner fast — the patient stumbles!', good: 'Protective field triggered: MediRun stops 40 cm short.' },
    },
    {
      kind: 'hazard', id: 'm-video', cat: 'data', x: 40, y: 40, size: 8, icon: 'svg:camera', label: 'MediRun’s mast camera',
      observe: 'To find its way, MediRun records video of every corridor — including patients in gowns and screens showing medical records.',
      harm: 'Health information is some of the most private data there is. Recording it creates a serious privacy risk.',
      l: 4, s: 4,
      rateWhy: 'It records all the time (likely). Leaked health records can harm people for years (severe).',
      fixes: [
        { id: 'lidar', label: 'Navigate by LiDAR map; any camera is processed on the robot and nothing is stored', cost: 2, l: 1, s: 3, why: 'A LiDAR map holds shapes, not faces. Processing on the robot means no pictures leave it.' },
        { id: 'encrypt', label: 'Store the video, encrypted, for a year', cost: 2, l: 3, s: 4, why: 'Encryption helps, but a year of patient video is still a target — and was never needed for driving.' },
        { id: 'forms', label: 'Ask every patient to sign a consent form', cost: 1, l: 3, s: 4, why: 'Many patients are asleep, unwell or visiting — real consent from everyone in a corridor is not possible.' },
      ],
      run: { actor: '🗂️', from: [40, 37], to: [94, 6], bad: 'Video of patients uploads to a server…', good: 'Only a map of walls is kept. No faces, no screens.' },
    },
    {
      kind: 'hazard', id: 'm-detect', cat: 'fairness', x: 61, y: 57, size: 10, icon: '🧑‍🦽', label: 'Patients in the day room',
      observe: 'The supplier tested MediRun’s people-detector only with adults standing up. It sometimes misses people in wheelchairs, on beds or bending down.',
      harm: 'The robot is least safe for the patients who are most vulnerable.',
      l: 3, s: 4,
      rateWhy: 'Wheelchairs and beds are common here (possible). Being hit while unable to move away is severe.',
      fixes: [
        { id: 'retest', label: 'Retest with wheelchairs, beds, children and crutches; fix and re-check each group', cost: 3, l: 1, s: 4, why: 'Measure each group separately and set a pass mark for every group, not just the average.' },
        { id: 'sign', label: 'Put up signs: “Robot may not see you”', cost: 0, l: 3, s: 4, why: 'It asks the most vulnerable patients to protect themselves.' },
        { id: 'supplier', label: 'Accept the supplier’s word that it is 99% accurate', cost: 0, l: 3, s: 4, why: 'A 99% average can hide a group it fails badly. Ask for results group by group.' },
      ],
      run: { actor: '🧑‍🦽', from: [70, 62], to: [62, 58], bad: 'The detector misses the wheelchair user bending to pick up a cup.', good: 'Detected: “person, seated”. MediRun waits.' },
    },
    {
      kind: 'hazard', id: 'm-fire', cat: 'control', x: 88, y: 36, size: 9, icon: '🛗', label: 'Lift lobby',
      observe: 'When the fire alarm sounds, MediRun keeps trying its route, waiting in front of the lift — right in the escape corridor.',
      harm: 'In an emergency the robot must stop being in charge of itself. Blocking an escape route could cost lives.',
      l: 2, s: 5,
      rateWhy: 'Fire alarms are rare (unlikely), but a blocked escape route in a fire is catastrophic.',
      fixes: [
        { id: 'safe', label: 'Fail safe: on any alarm, park in a marked bay out of the escape route; big stop buttons on every side', cost: 2, l: 1, s: 3, why: 'When something unusual happens, the safest robot is a parked one — and anyone can stop it by hand.' },
        { id: 'remote', label: 'The IT team can stop it remotely from their office', cost: 1, l: 2, s: 5, why: 'Useful, but in a fire the IT team is evacuating too. People nearby need a stop button.' },
        { id: 'none', label: 'Nothing — fires are rare', cost: 0, l: 2, s: 5, why: 'Rare is not never. A risk with catastrophic severity still needs a plan.' },
      ],
      run: { actor: '🚨', from: [80, 20], to: [88, 32], bad: 'Alarm! MediRun sits in the escape corridor.', good: 'Alarm! MediRun parks in its bay. The corridor is clear.' },
    },
    {
      kind: 'hazard', id: 'm-porters', cat: 'people', x: 12, y: 28, size: 9, icon: '🧑‍🔧', label: 'Porters’ desk',
      observe: 'Porters do the deliveries today. The hospital plans to cut porter jobs to pay for the robots.',
      harm: 'The porters lose their jobs — and patients lose the people who also help, chat and notice when something is wrong.',
      l: 3, s: 3,
      rateWhy: 'The plan is already written (possible to likely). Losing a job is serious for a family.',
      fixes: [
        { id: 'move', label: 'Robot does the night and routine runs; porters move to moving patients, which needs a caring human', cost: 1, l: 1, s: 2, why: 'Let the robot take the dull, repetitive work and keep people where people matter.' },
        { id: 'cut', label: 'Cut the jobs', cost: 0, l: 5, s: 3, why: 'The hospital saves money, but the porters bear all the cost.' },
      ],
      run: { actor: '🧑‍🔧', from: [12, 34], to: [22, 40], bad: 'Porters are told to clear their lockers.', good: 'Porters now help patients to scans and theatre.' },
    },
    {
      kind: 'hazard', id: 'm-battery', cat: 'planet', x: 64, y: 24, size: 8, icon: '🔋', label: 'Charging station',
      observe: 'MediRun’s battery pack is sealed into its body and lasts about 3 years.',
      harm: 'When the battery wears out, the whole robot may be scrapped — e-waste and wasted materials.',
      l: 3, s: 2,
      rateWhy: 'It will certainly wear out one day (likely over the robot’s life), but the harm is limited (minor).',
      fixes: [
        { id: 'swap', label: 'Swappable, recyclable battery; charge at night on off-peak power', cost: 1, l: 1, s: 2, why: 'A new battery instead of a new robot, and charging when the grid has spare power.' },
        { id: 'accept', label: 'Accept it for now; record it and review when the battery is replaced', cost: 0, l: 3, s: 2, why: 'A risk you consciously accept, write down and plan to review is called a residual risk. It can be fine — if it is low.' },
      ],
      run: { actor: '🔋', from: [64, 28], to: [74, 34], bad: 'Year 3: the battery dies — the whole robot is replaced.', good: 'Year 3: a new battery clicks in. The old cells go to recycling.' },
    },
    { kind: 'safe', id: 'm-tablet', x: 30, y: 22, size: 8, icon: '💻', label: 'Nurses’ station screen', observe: 'A screen at the nurses’ station shows where MediRun is and what it carries.', why: 'Staff can always see what the robot is doing. Being open about what a robot does is part of keeping control.' },
    { kind: 'safe', id: 'm-lock', x: 16, y: 49, size: 7, icon: '🔐', label: 'Medicine drawers', observe: 'MediRun’s drawers open only with a nurse’s badge, and every opening is logged.', why: 'Controlled medicines must be kept secure — and the log shows who took what.' },
    { kind: 'safe', id: 'm-lane', x: 46, y: 64, size: 7, icon: '🟨', label: 'Floor markings', observe: 'Yellow lines mark where MediRun drives, and it keeps to the right of the corridor.', why: 'Predictable paths let people know where the robot will go.' },
  ],
  speed: { reactS: 0.25, decel: 0.8, fieldM: 1.0, routeM: 300, maxRouteS: 480, min: 0.3, max: 2.0, step: 0.1 },
  defend: [
    {
      id: 'cams',
      challenge: '“Why not put cameras everywhere? More cameras means more safety.”',
      options: [
        { id: 'a', text: 'Agreed — more data always makes a robot safer.', ok: false, reply: 'More data can create new hazards. Here, filming patients in gowns would be a serious Data risk.' },
        { id: 'b', text: 'Cameras everywhere would create a new hazard — filming patients. LiDAR already sees obstacles without recording faces.', ok: true, reply: 'Exactly: a mitigation must not create a bigger risk somewhere else.' },
        { id: 'c', text: 'Cameras are too expensive.', ok: false, reply: 'Cost matters, but it is not the main reason. The real problem is the privacy hazard cameras would create.' },
      ],
    },
    {
      id: 'zero',
      challenge: '“Why not spend more and push every risk to zero?”',
      options: [
        { id: 'a', text: 'Zero risk is impossible. We cut the highest risks first, as far as is reasonably practicable, and record what is left as residual risk.', ok: true, reply: 'That is how real safety cases work: reduce risk sensibly, highest first, and be honest about what remains.' },
        { id: 'b', text: 'Our robot is now completely safe.', ok: false, reply: 'No robot — and no human — is completely safe. Claiming zero risk is a warning sign in any safety case.' },
        { id: 'c', text: 'Nobody will notice the small risks.', ok: false, reply: 'Small risks are written down and reviewed, not hidden.' },
      ],
    },
    {
      id: 'fair',
      challenge: '“How do you know the people-detector works for everyone?”',
      options: [
        { id: 'a', text: 'It scored 99% on the supplier’s test.', ok: false, reply: 'An average can hide a group it fails. Who was in that test?' },
        { id: 'b', text: 'The supplier promised.', ok: false, reply: 'A promise is not evidence. A safety case needs test results.' },
        { id: 'c', text: 'We measured it separately for wheelchair users, people on beds, children and standing adults, day and night, with a pass mark for each.', ok: true, reply: 'Group-by-group testing is exactly how fairness is checked.' },
      ],
    },
  ],
}

/** Scene for each tier: 0 Cadet, 1 Pilot, 2 Ace, 3 Legend. */
export const TIER_SCENES: Scene[] = [factory, home, street, hospital]
