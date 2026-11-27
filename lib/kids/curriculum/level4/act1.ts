// lib/kids/curriculum/level4/act1.ts
// Level 4, Act 1 (sessions 1–6): "Landing".
// Systems thinking, measuring the motors (and their dead zone), differential-
// drive kinematics, heading hold on rough ground, P, I and D, and the first
// project: precision docking.

import type { Session } from '../types'
import { CREW, DOCK_BAY, TEST_TRACK, TURN_PAD, VALLEY_FLOOR } from './shared'
import { DIST, HEADING, LOGIC, MOVE, SAY, TALK, TIMER, VARS_MATH } from '../level3/shared'
import { arena, challenge, crit, episode, lessonPlan, makeSession, mc, o, projectPlan, q, right, scene, teacher, wrong } from '../level3/kit'

const L = 4 as const

export const ACT1: Session[] = [
  // ── 1 ────────────────────────────────────────────────────────────────────
  makeSession(L, 1, {
    objectives: [
      o('Decomposes the rover into power, sensing, compute, actuation and communication subsystems and traces one command through them.', 'I can break a robot into subsystems and trace a command through them.', ['computing-systems', 'algorithms']),
      o('Writes a program whose output names each subsystem as the command passes through it.', 'I can make my program show which subsystem is working at each step.', ['programming'], { concepts: ['sense-think-act'] }),
    ],
    episode: episode('Sol 1', undefined, [
      scene('Red Valley Analog Station: white domes in a red desert, a rover garage, a crew in dusty overalls.', 'The crew live as if on Mars for 24 sols. The rover rolls out of its crate.', 65, [
        ['narrator', 'In a red desert, a crew is rehearsing for Mars. For twenty-four days — twenty-four “sols” — they live as if they were 225 million kilometres from home.'],
        ['guest', 'Welcome, engineer. Rule one at Red Valley: if you can’t explain how it works, you can’t fix it at two in the morning.', CREW.adeyemi],
        ['guest', 'So before it drives anywhere — draw me the rover. Not the shape. The systems.', CREW.kim],
      ]),
      scene('The garage whiteboard. Hana draws five boxes and the arrows between them.', 'POWER → feeds everything. SENSING → COMPUTE → ACTUATION. COMMS ↔ COMPUTE.', 70, [
        ['guest', 'Battery and regulators. Sensors. The computer running your code. Motors and the gripper. And the radio. Every fault you will ever chase lives in one box or in an arrow between two.', CREW.kim],
        ['myrobot', 'So “dock” is: the radio delivers the command, the computer reads the distance, works out a speed, and the motors move — all on battery.'],
        ['spark', 'Trace it once, slowly, and you understand the whole rover.'],
      ]),
      scene('The charging bay. The rover approaches the pad, a label flashing above it at each step: SENSE · THINK · ACT.', 'It stops at the pad.', 45, [
        ['guest', 'Good. Now when it doesn’t dock, you’ll know which box to open first.', CREW.kim],
      ]),
    ], 'Hana slides a sheet across: “Motor test, tomorrow 08:00. I don’t trust a motor I haven’t measured.”'),
    build: {
      part: { slot: 'head', id: 'distance' },
      action: 'inspect',
      narration: 'Inspect the sensing subsystem: Distance Eyes feed the computer one number many times a second.',
      why: 'Every command starts with sensing; knowing what each subsystem does tells you where to look when something fails.',
      tryWithout: 'Pull the sensing box out of the diagram and “dock” has nothing to compute from: the rover can only drive blind.',
      physicsEffect: 'No change. Distance Eyes: 2–200 cm, about ±1 cm on a flat wall.',
      realWorld: 'Every space mission, car and factory robot is designed and tested subsystem by subsystem, with documented interfaces between them.',
    },
    code: challenge({
      title: 'Trace One Command',
      mission: 'Run a single “approach” step: say the distance (SENSING), compute a speed (COMPUTE), say it, then drive for 1 s at that speed (ACTUATION).',
      arena: DOCK_BAY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, ...TALK],
      example: [
        'say("COMMS: dock command received")',
        'variable_set(d, distance_cm); say("SENSE: distance"); say(variable_get(d))',
        'variable_set(speed, math(0.4 × math(variable_get(d) − 30))); say("THINK: speed"); say(variable_get(speed))',
        'say("ACT: motors"); drive_for(variable_get(speed), 1)',
      ],
      success: [crit('uses-blocks', 'Says each subsystem in order and acts on the computed speed.'), crit('no-collision', 'Does not touch the wall.')],
      two: 'Your subsystem diagram is drawn beside your program.',
      three: 'You named one fault that could happen in each subsystem.',
      hints: ['Which box comes first for “dock”?', 'Sense, then think, then act — with a say at each.', 'Read distance into d; speed = 0.4 × (d − 30); say both; drive for 1 s.'],
    }),
    challenge: challenge({
      title: 'Dock and Report',
      mission: 'Approach the pad in a loop and stop 25–35 cm from the wall. Every loop, update variables named after the subsystem they belong to (sense_d, think_speed) and say a one-line status at the end.',
      arena: DOCK_BAY,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, TIMER, ...TALK],
      example: [
        'variable_set(loops, 0)',
        'repeat_until(compare(distance_cm < 31)) {',
        '  variable_set(sense_d, distance_cm)',
        '  variable_set(think_speed, math(0.4 × math(variable_get(sense_d) − 30)))',
        '  if (compare(variable_get(think_speed) < 12)) { variable_set(think_speed, 12) }  ← above the motor dead zone',
        '  set_motors(variable_get(think_speed), variable_get(think_speed))',
        '  variable_change(loops, 1)',
        '}',
        'stop; say("Docked. Loops:"); say(variable_get(loops))',
      ],
      success: [crit('stop-in-zone', 'Stops 25–35 cm from the wall.'), crit('uses-blocks', 'Variables named by subsystem; a status report at the end.')],
      two: 'Works from three start positions.',
      three: 'Your status line would tell a flight controller what happened without watching the run.',
      hints: ['Loop: sense, think, act.', 'Keep the speed above the dead zone or the rover stalls.', 'Stop when the distance is below 31.'],
    }),
    quiz: [
      q('The rover sits still after a “dock” command. The radio log shows the command arrived and the code ran. Which subsystem do you check next?', [
        right('Actuation and power: motors, driver and battery', '🔋'),
        wrong('Comms, again — the command must have been lost', '📡', 'symptom-is-the-cause'),
        wrong('Nothing: the code ran, so the rover must have moved', '✅', 'symptom-is-the-cause'),
      ], 'The log rules out comms and compute. The fault lies further along the chain: the motors, their driver or the power feeding them.'),
      q('Which list is a correct trace of “dock” through the rover’s subsystems?', [
        right('Comms → compute reads sensing → compute sets speed → actuation, all powered by the battery', '🔗'),
        wrong('Actuation → sensing → comms', '🔀', 'subsystems-are-independent'),
        wrong('Each subsystem does “dock” on its own', '🧩', 'subsystems-are-independent'),
      ], 'Subsystems pass information along defined paths. A command arrives, sensing informs the computation, and actuation carries it out — with power under everything.'),
      q('Why name variables after subsystems (sense_d, think_speed)?', [
        right('So anyone debugging can see where each value comes from', '🏷️'),
        wrong('The robot runs faster with long names', '⚡', 'names-do-not-matter'),
        wrong('Names don’t matter as long as it works', '🤷', 'names-do-not-matter'),
      ], 'Clear names are documentation. At two in the morning, “think_speed” tells you where to look; “x2” does not.'),
    ],
    badge: { id: 'l4-systems-thinker', name: 'Systems Thinker', icon: '🧩', earnedFor: 'You broke the rover into subsystems and traced a command through them.' },
    reward: { note: 'Text view unlocked: see every program as read-only text, the bridge to Python and ROS 2.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Five boxes', 'which subsystem would you check first, and why?'),
      warmup: {
        title: 'Five boxes',
        minutes: 5,
        steps: ['Pairs draw a phone as five boxes: power, sensing, compute, actuation (screen, speaker, vibration), comms.', 'Trace “take a photo” through the boxes with arrows.', 'Swap with another pair: does their trace match yours?'],
        materials: ['Paper and pens'],
      },
      discussion: ['What happens to the whole rover if one arrow (an interface) breaks?', 'Why do engineers draw systems before they build them?'],
      misconceptions: [
        mc('symptom-is-the-cause', 'Where you see the problem is where the fault is.', 'Symptoms show up at the end of a chain; trace the chain with evidence (logs) to find the faulty box.', 'Show a “dead torch”: is it the bulb, the switch, the battery or a wire? Pairs plan the order of checks using evidence, then compare plans.'),
        mc('subsystems-are-independent', 'Each subsystem works on its own.', 'Subsystems depend on each other through interfaces; a command flows through several.', 'Remove one box from the phone diagram (power). What still works? Pairs mark every arrow that fails.'),
        mc('names-do-not-matter', 'Variable names do not matter if the program works.', 'Names are documentation: they make programs readable, checkable and fixable by others.', 'Give two identical programs, one with a, b, c names and one with clear names. Time pairs finding a planted bug in each.'),
      ],
      faster: ['Add a fifth say for POWER: estimate battery used from loop count.', 'Draw the interfaces between subsystems with the data that crosses each one.'],
      slower: ['Provide the five-box diagram; students label the trace.', 'Do the single-step code challenge only.'],
      notes: ['Students starting at Level 4 should complete the two bridge missions first (about 2 × 30 minutes).', 'This level uses spec-sheet language on purpose; read it aloud the first time.'],
    }),
    parent: {
      today: 'Your teen broke a planetary rover into subsystems (power, sensing, compute, actuation, comms) and traced one command through them.',
      tryAtHome: 'Pick a device at home (a washing machine, a car) and name its five subsystems together. Where would you look first if it stopped?',
      askYourChild: 'Which subsystem would you check first if the rover didn’t move — and why?',
    },
  }),

  // ── 2 ────────────────────────────────────────────────────────────────────
  makeSession(L, 2, {
    objectives: [
      o('Measures speed at several motor powers with a program, tabulates and plots the results, and identifies the dead zone.', 'I can measure how fast my robot goes at different powers and find where it stops moving.', ['data', 'mathematics-measurement']),
      o('Explains why speed is not exactly proportional to power at low power (friction, the dead zone).', 'I can explain why a motor at low power may not move at all.', ['science-forces'], { concepts: ['physics'] }),
    ],
    episode: episode('Trust, but Measure', 'The engineer drew the rover as five subsystems and traced a command through them.', [
      scene('The motor test track at 08:00. Hana with a clipboard and coffee.', 'The rover sits at the start line. Hana types “set_motors(8, 8)”. Nothing happens.', 60, [
        ['guest', 'Eight per cent. Motor’s humming, wheels aren’t turning. That’s the dead zone — not enough push to beat friction.', CREW.kim],
        ['myrobot', 'So my docking code that slows to 5 % near the pad… just stops short.'],
        ['guest', 'Exactly the bug I wanted you to find on a test track, not on Mars.', CREW.kim],
      ]),
      scene('A plot on the garage screen: speed (cm/s) against power (%).', 'Points climb in a near-straight line from about 12 %, flat at zero below.', 70, [
        ['spark', 'Measure the wall before and after a two-second run: speed is distance over time. Repeat at each power. Plot it.'],
        ['myrobot', 'Above twelve, nearly a straight line. Below it, zero. Now I know the real shape of my motor.'],
        ['guest', 'A model you measured yourself beats a datasheet every time.', CREW.kim],
      ]),
      scene('The garage, end of the test day. Hana pins the plot above the workbench.', 'A red line marks 12 % on the power axis.', 30, [
        ['guest', 'Anything that commands this rover below that line is a bug. Write it on your hand if you have to.', CREW.kim],
      ]),
    ], 'Next: two motors at different speeds. Where does the rover go?'),
    build: {
      part: { slot: 'drive', id: 'wheels2' },
      action: 'swap',
      narration: 'Fit two wheels and a caster for the test: a clean differential drive to measure.',
      why: 'A simple, known drive makes the measurement clean; you can repeat it with your own drive afterwards.',
      tryWithout: 'With legs, speed depends on gait timing as well as power — a messier first experiment.',
      physicsEffect: 'Two-wheel drive tops out at about 0.42 m/s; below about 12 % power the wheels do not turn.',
      realWorld: 'Engineers characterise every motor on a test bench before trusting it in a controller.',
    },
    code: challenge({
      title: 'One Point on the Curve',
      mission: 'Measure the speed at 40 % power: read the wall, drive 2 s, wait, read again, and say (before − after) ÷ 2.',
      arena: TEST_TRACK,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, SAY],
      example: ['variable_set(before, distance_cm)', 'drive_for(40, 2)', 'wait(0.5)', 'variable_set(after, distance_cm)', 'say(math(math(variable_get(before) − variable_get(after)) ÷ 2))  ← cm/s'],
      success: [crit('uses-blocks', 'Reports a speed computed from two readings.'), crit('no-collision', 'Never reaches the wall.')],
      two: 'You wrote the units (cm/s) next to the number.',
      three: 'You repeated it three times and reported the spread.',
      hints: ['Speed = distance ÷ time.', 'Distance travelled = before − after.', 'Divide by the 2 seconds you drove.'],
    }),
    challenge: challenge({
      title: 'The Motor Curve',
      mission: 'With one program, measure speed at 0, 5, 10, 15, 20, 30, 45 and 60 % (back up between runs), say each pair (power, speed), plot them and mark the dead zone.',
      arena: TEST_TRACK,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, SAY],
      example: [
        'variable_set(p, 0)',
        'repeat(8) {',
        '  variable_set(before, distance_cm); drive_for(variable_get(p), 2); wait(0.5)',
        '  variable_set(v, math(math(variable_get(before) − distance_cm) ÷ 2))',
        '  say(variable_get(p)); say(variable_get(v))',
        '  drive_for(math(0 − variable_get(p)), 2); wait(0.5)  ← back to the start',
        '  … next power from the list: 0, 5, 10, 15, 20, 30, 45, 60 …',
        '}',
      ],
      success: [crit('uses-blocks', 'Eight (power, speed) pairs reported by one program.'), crit('no-collision', 'Never touches the wall.')],
      two: 'Your plot marks where the dead zone ends.',
      three: 'You fitted a straight line above the dead zone and wrote its slope (cm/s per %).',
      hints: ['Store the power in a variable and change it each run.', 'Reverse the same run to return to the start line.', 'The dead zone is where speed reads 0 but power is not 0.'],
    }),
    quiz: [
      q('At 8 % power the motor hums but the rover doesn’t move. Why?', [
        right('The motor’s push is too small to overcome friction: the dead zone', '🧱'),
        wrong('The motor is broken', '💥', 'linear-all-the-way'),
        wrong('Speed is always exactly proportional to power, so it must be moving very slowly', '📈', 'linear-all-the-way'),
      ], 'Below a threshold, the torque cannot beat static friction and the gears’ losses, so speed is zero. Above it, speed rises roughly in proportion.'),
      q('Your docking controller asks for 5 % near the pad. What happens?', [
        right('The rover stops short, because 5 % is inside the dead zone', '🛑'),
        wrong('It creeps in perfectly slowly', '🐢', 'linear-all-the-way'),
        wrong('It overshoots because low power is unstable', '🌊', 'more-runs-not-needed'),
      ], 'A controller that commands less than the dead-zone threshold produces no motion. Real controllers add a minimum command or compensate for the dead zone.'),
      q('Why repeat each measurement three times?', [
        right('To see how much the results vary and avoid trusting one odd run', '🔁'),
        wrong('One careful run is enough for a motor', '1️⃣', 'more-runs-not-needed'),
        wrong('So the average comes out at a round number', '🔢', 'more-runs-not-needed'),
      ], 'Repeats show the spread (how sure you can be) and catch an odd run. They do not make the answer round — they make it trustworthy.'),
    ],
    badge: { id: 'l4-motor-characterised', name: 'Motor Characterised', icon: '📉', earnedFor: 'You measured your motor’s speed curve and found its dead zone.' },
    reward: { note: 'Your motor curve is saved: later controllers can use your dead-zone threshold.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Push the box', 'where does the dead zone come from, and how should a controller handle it?'),
      warmup: {
        title: 'Push the box',
        minutes: 5,
        steps: ['Place a heavy book on a table. A student pushes with one finger, very gently, increasing slowly.', 'Ask the class to call the moment it starts to move.', 'Name it: below that push, nothing happens — static friction.'],
        materials: ['A heavy book', 'A table'],
      },
      discussion: ['Where else is there a “dead zone”? (A sticky door, a stiff tap, a car pulling away uphill.)', 'Why plot data instead of just listing numbers?'],
      misconceptions: [
        mc('linear-all-the-way', 'Speed is proportional to power all the way down to zero.', 'Below a threshold (the dead zone) friction wins and speed is zero; above it the relation is roughly linear.', 'Plot the class data on the board. Draw the “straight line through zero” students expected next to the real curve. Discuss the gap near zero.'),
        mc('more-runs-not-needed', 'One careful measurement is enough.', 'Repeated runs show the spread and catch odd results; you need them to trust a number.', 'Pairs measure the same 2 s run three times and write all three on the board. Compute the spread for the class.'),
      ],
      faster: ['Repeat the curve with your own drive (legs or tracks) and compare slopes.', 'Use your fitted line to predict the power for exactly 20 cm/s, then test it.'],
      slower: ['Measure four powers only (0, 10, 30, 60).', 'Provide a plotting grid with axes labelled.'],
      notes: ['Honest limit: the dead zone is part of the Level 4 simulator motor model; the playable challenge today is the Skill Galaxy “Half a metre by encoder”, and the warm-up shows the physics directly.'],
    }),
    parent: {
      today: 'Your teen measured the robot’s speed at different motor powers, plotted a curve and found the “dead zone” where it doesn’t move at all.',
      tryAtHome: 'Push a heavy box or chair very gently, increasing slowly. Notice the moment it starts to move — that is the same effect.',
      askYourChild: 'What is a motor’s dead zone, and why does it matter for a controller?',
    },
  }),

  // ── 3 ────────────────────────────────────────────────────────────────────
  makeSession(L, 3, {
    objectives: [
      o('Predicts the turning radius of a differential-drive robot from its wheel speeds and track width, and tests the prediction.', 'I can predict how sharply my robot turns from its two wheel speeds.', ['mathematics-geometry', 'science-forces']),
      o('Explains why equal speeds go straight, opposite speeds spin on the spot, and unequal speeds trace a circle.', 'I can explain the three kinds of motion a two-wheeled robot makes.', ['science-forces'], { concepts: ['physics'] }),
    ],
    episode: episode('Circles in the Sand', 'The engineer measured the motor curve and found its dead zone.', [
      scene('The turning pad: concentric circles painted on the sand.', 'The rover drives left 30 %, right 50 %. It traces a circle — but not the one Arjun drew on the map.', 60, [
        ['guest', 'I need it to curve round the habitat at exactly 75 centimetres. Can you tell me the wheel speeds — before you try it?', CREW.mehta],
        ['myrobot', 'I can try speeds until it fits…'],
        ['guest', 'On Mars, every try costs a day. Predict first.', CREW.mehta],
      ]),
      scene('Spark draws the rover from above: two wheels, a track width W between them, the centre of the circle off to one side.', 'Arrows show the inner wheel slow, the outer wheel fast.', 75, [
        ['spark', 'The middle of the rover moves at the average of the two wheel speeds. It turns at the difference divided by W. Radius equals W over 2, times the sum over the difference.'],
        ['myrobot', 'W is 20 centimetres. Left 30, right 50: R = 10 × 80 ÷ 20 = 40 centimetres.'],
        ['spark', 'Equal speeds: the difference is zero, the radius is infinite — a straight line. Opposite speeds: the sum is zero — a spin on the spot.'],
      ]),
      scene('The turning pad. The rover drives the predicted circle; it lands on the 40 cm ring, a little outside.', 'Arjun measures with a tape.', 30, [
        ['guest', 'Forty-three. Close enough to plan with — and now we know the slip adds about seven per cent.', CREW.mehta],
      ]),
    ], 'Predictions are good. But out on the rough valley floor, the wind has its own ideas about where the rover should point.'),
    build: {
      part: { slot: 'drive', id: 'wheels2' },
      action: 'inspect',
      narration: 'Measure your track width W: the distance between the centres of the two drive wheels.',
      why: 'W is the one number about your robot’s body that sets how sharply it turns for a given speed difference.',
      tryWithout: 'Without W you can say “it turns left” but not “it turns on a 40 cm radius”.',
      physicsEffect: 'Track width depends on the body you chose (about 18–24 cm in the simulator). Wheel speed is proportional to power above the dead zone.',
      realWorld: 'Warehouse robots, robot vacuums and many planetary rovers use this exact model (differential-drive kinematics) to plan every turn.',
    },
    code: challenge({
      title: 'Predict the Circle',
      mission: 'Compute R from your track width and two wheel speeds, say it, then drive one full circle with set_motors and compare against the painted rings.',
      arena: TURN_PAD,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, SAY],
      example: [
        'variable_set(W, 20); variable_set(vl, 30); variable_set(vr, 50)',
        'variable_set(R, math(math(variable_get(W) ÷ 2) × math(math(variable_get(vl) + variable_get(vr)) ÷ math(variable_get(vr) − variable_get(vl)))))',
        'say(variable_get(R))',
        'set_motors(variable_get(vl), variable_get(vr)); wait(8); stop',
      ],
      success: [crit('uses-blocks', 'Says a predicted radius computed from W and the wheel speeds.'), crit('draw-path', 'Drives a circle whose radius can be read off the rings.')],
      two: 'You measured your own W rather than using 20.',
      three: 'Your measured radius is within 15 % of your prediction.',
      hints: ['R = (W ÷ 2) × (vl + vr) ÷ (vr − vl).', 'Use powers above the dead zone, so speed ∝ power.', 'Drive long enough for a full circle and read the ring it follows.'],
    }),
    challenge: challenge({
      title: 'Round the Habitat at 75',
      mission: 'Choose wheel powers (above the dead zone) that you predict give a 75 cm radius turn; prove it on the pad by driving a half-circle that ends on the 75 cm ring opposite the start.',
      arena: TURN_PAD,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, SAY],
      example: [
        'variable_set(W, 20); variable_set(vr, 50)',
        'variable_set(vl, math(variable_get(vr) × math(math(75 − 10) ÷ math(75 + 10))))  ← solved from R = (W/2)(vl+vr)/(vr−vl) with W/2 = 10',
        'set_motors(variable_get(vl), variable_get(vr))',
        'repeat_until(compare(heading_deg < 271)) { wait(0.05) }  ← from 90° turning left through 180° to 270°',
        'stop',
      ],
      success: [crit('stop-in-zone', 'Ends within 10 cm of the 75 cm ring point opposite the start.'), crit('uses-blocks', 'Wheel powers are computed from the kinematics, not tuned by trial.')],
      two: 'You solved the formula for vl on paper first.',
      three: 'You explained the remaining error (slip, the dead zone, the caster).',
      hints: ['Rearrange R = (W/2)(vl + vr)/(vr − vl) for vl.', 'vl = vr × (R − W/2) ÷ (R + W/2).', 'Stop when the heading has turned through 180°.'],
    }),
    quiz: [
      q('Left wheel 40 %, right wheel 40 %. What does the rover do?', [
        right('Drives straight: no difference, so an infinite radius', '⬆️'),
        wrong('Turns gently left', '↰', 'turn-towards-fast-wheel'),
        wrong('Spins on the spot', '🔄', 'spin-needs-one-wheel'),
      ], 'Equal wheel speeds mean no difference, so no turning. The radius formula divides by zero: the circle is infinitely big — a straight line.'),
      q('Left −30 %, right +30 %. What does the rover do?', [
        right('Spins on the spot (radius 0)', '🔄'),
        wrong('Stays still: the speeds cancel out', '⏸️', 'spin-needs-one-wheel'),
        wrong('Drives a wide circle', '⭕', 'turn-towards-fast-wheel'),
      ], 'Opposite speeds: the centre’s speed (the average) is zero but the turning rate is high, so it rotates in place. The motions do not cancel — the forward speed does.'),
      q('Left 30 %, right 50 %: which way does the rover curve?', [
        right('Left, towards the slower wheel', '↰'),
        wrong('Right, towards the faster wheel', '↱', 'turn-towards-fast-wheel'),
        wrong('Straight, because both wheels go forward', '⬆️', 'turn-towards-fast-wheel'),
      ], 'The faster right wheel travels further, so the rover curves round its slower left wheel — to the left.'),
    ],
    badge: { id: 'l4-kinematics', name: 'Kinematics', icon: '⭕', earnedFor: 'You predicted a turning radius from wheel speeds and proved it on the pad.' },
    reward: { note: 'Turning-pad overlay: the predicted circle is drawn before you press Go.' },
    teacher: teacher({
      timing: lessonPlan(6, 'The human differential drive', 'why does an infinite radius mean a straight line?'),
      warmup: {
        title: 'The human differential drive',
        minutes: 6,
        steps: ['Two students link arms (the wheels); a third stands between them (the robot centre).', 'Call speeds: same speed (straight), one faster (a circle), opposite directions (a spin).', 'Measure the circle radius with a tape for one pair of speeds.'],
        materials: ['A tape measure', 'A cleared space'],
      },
      discussion: ['Why can’t a car spin on the spot, but a robot vacuum can?', 'What limits how exact a prediction can be on sand?'],
      misconceptions: [
        mc('turn-towards-fast-wheel', 'A robot turns towards its faster wheel.', 'It turns towards its slower wheel; the faster wheel travels further on the outside of the curve.', 'Linked-arms walk: the outside walker must go faster. Ask which side is outside when turning left.'),
        mc('spin-needs-one-wheel', 'Opposite wheel speeds cancel out (the robot stays still), or spinning needs one wheel stopped.', 'Opposite speeds cancel the forward motion but add up to rotation: the robot spins on the spot.', 'Linked-arms pair walks one forward, one backward at the same pace. They spin round their middle. Then try one wheel stopped: a circle round the stopped wheel, not a spin on the spot.'),
      ],
      faster: ['Derive the turning rate ω = (vr − vl) ÷ W and predict the time for a full circle.', 'Include the dead zone: what is the tightest circle possible at low speed?'],
      slower: ['Give R for three speed pairs; students only drive and measure.', 'Use the turning-pad overlay to see predictions.'],
      notes: ['Students need wheel speeds, not powers: above the dead zone speed ∝ power, so the Session 2 motor curve lets them convert.'],
    }),
    parent: {
      today: 'Your teen used differential-drive kinematics to predict how sharply a two-wheeled robot turns, then proved it.',
      tryAtHome: 'Push a shopping trolley or wheelbarrow and notice: to turn, one side has to move faster than the other.',
      askYourChild: 'How do you make a two-wheeled robot spin on the spot?',
    },
  }),

  // ── 4 ────────────────────────────────────────────────────────────────────
  makeSession(L, 4, {
    objectives: [
      o('Implements heading hold with proportional control on gyro error over rough ground with a crosswind.', 'I can hold a heading across rough ground with proportional control.', ['programming', 'algorithms']),
      o('Measures the steady error that proportional control leaves under a constant disturbance.', 'I can measure the error that proportional control leaves behind.', ['data'], { concepts: ['feedback-control', 'sensors'] }),
    ],
    episode: episode('Crosswind', 'The engineer predicted turning circles from wheel speeds.', [
      scene('The valley floor. Rocks, loose sand, and a steady wind blowing dust from the right.', 'The rover heads for the survey beacon and drifts steadily left.', 60, [
        ['guest', 'The beacon’s four and a half metres away and you’re off by a metre. The wind never stops here.', CREW.petrova],
        ['myrobot', 'I’ll hold heading 90 with the gyro, like at Ridgeback. Correction equals gain times error.'],
      ]),
      scene('A graph on Arjun’s screen: heading over time.', 'With the P controller, the heading settles — at 86°, not 90°.', 70, [
        ['guest', 'It’s steady… but steadily wrong. Four degrees off, forever.', CREW.mehta],
        ['spark', 'To push back against a wind that never stops, P needs an error that never stops. The bigger the gain, the smaller that error — until it wobbles.'],
        ['myrobot', 'So P alone can’t get to exactly zero against a constant push.'],
        ['spark', 'Not alone. Tomorrow we give it a memory.'],
      ]),
      scene('The valley floor again. Arjun raises Kp; the steady error shrinks to two degrees — then the heading starts to swing.', 'He winds the gain back down.', 30, [
        ['guest', 'Smaller error, more wobble. There is a better way than just turning up the gain.', CREW.mehta],
      ]),
    ], 'Hana writes three letters on the whiteboard: P, I, D.'),
    build: {
      part: { slot: 'drive', id: 'tracks' },
      action: 'choose',
      narration: 'Choose your drive for the valley floor: tracks, legs or wheels. The gyro works with all of them.',
      why: 'Rough ground and wind push every drive off course; only feedback brings it back.',
      tryWithout: 'Open loop, the crosswind pushes the rover about a metre off target over 4.5 m.',
      physicsEffect: 'Loose sand grip 0.5; the crosswind is a constant sideways push (a disturbance). Wheels on two-wheel drive need rough-ground parts here.',
      realWorld: 'Ships, aircraft autopilots and Mars rovers hold heading against constant currents and winds with feedback control.',
    },
    code: challenge({
      title: 'P on Heading',
      mission: 'Hold heading 90° across the valley with steer = Kp × (heading − 90), base 45 %. Say the average error over the last 2 s.',
      arena: VALLEY_FLOOR,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, TIMER, SAY],
      example: [
        'variable_set(Kp, 1.5); variable_set(sumErr, 0); variable_set(n, 0)',
        'repeat_until(compare(timer_s > 10)) {',
        '  variable_set(e, math(heading_deg − 90))',
        '  set_motors(math(45 − math(variable_get(Kp) × variable_get(e))), math(45 + math(variable_get(Kp) × variable_get(e))))',
        '  if (compare(timer_s > 8)) { variable_change(sumErr, variable_get(e)); variable_change(n, 1) }',
        '  wait(0.05)',
        '}',
        'stop; say(math(variable_get(sumErr) ÷ variable_get(n)))',
      ],
      success: [crit('reach-zone', 'Reaches the beacon zone.'), crit('uses-blocks', 'Reports the steady error (average over the last 2 s).')],
      two: 'You tried two values of Kp and recorded the steady error for each.',
      three: 'You explained why the steady error shrinks as Kp grows.',
      hints: ['Error = heading − target.', 'Average the error only near the end, once it has settled.', 'Bigger Kp: smaller steady error, but watch for wobble.'],
    }),
    challenge: challenge({
      title: 'Hold the Line in the Wind',
      mission: 'Reach the beacon with the final heading within 3° of 90 using P control only. Log Kp against steady error for at least three gains and find the trade-off point.',
      arena: VALLEY_FLOOR,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, TIMER, SAY],
      example: [
        'variable_set(Kp, 3)  ← from the log: 1 → 7° error, 3 → 2.5°, 6 → oscillates',
        'repeat_until(compare(timer_s > 10)) {',
        '  variable_set(e, math(heading_deg − 90))',
        '  set_motors(math(45 − math(variable_get(Kp) × variable_get(e))), math(45 + math(variable_get(Kp) × variable_get(e))))',
        '  wait(0.05)',
        '}',
        'stop; say(heading_deg)',
      ],
      success: [crit('stop-in-zone', 'Ends in the beacon zone with heading 87–93°.'), crit('uses-blocks', 'A Kp log of at least three values with the steady error of each.')],
      two: 'Your log shows the steady error falling as Kp rises.',
      three: 'You marked the Kp where oscillation starts, and chose a value below it with a reason.',
      hints: ['Raise Kp to shrink the steady error.', 'Stop raising it when the heading starts to swing.', 'Pick the highest Kp that settles calmly.'],
    }),
    quiz: [
      q('With P control against a steady crosswind, the heading settles at 86° instead of 90°. Why?', [
        right('P needs a non-zero error to produce the steady correction that balances the wind', '🌬️'),
        wrong('The gyro is miscalibrated by 4°', '🧭', 'p-reaches-zero'),
        wrong('The controller is broken: P always reaches the target', '🎯', 'p-reaches-zero'),
      ], 'Correction = Kp × error. To keep pushing against a constant wind, the correction must stay non-zero — so the error does too. This steady-state error is a property of P control.'),
      q('Raising Kp from 1 to 3 makes the steady error…', [
        right('Smaller, but too high a Kp makes it oscillate', '⚖️'),
        wrong('Zero, and higher Kp is always better', '🔼', 'gain-bigger-is-better'),
        wrong('Bigger', '📈', 'gain-bigger-is-better'),
      ], 'A larger Kp produces the same correction from a smaller error, so the steady error shrinks — up to the point where over-correction makes the system wobble.'),
      q('What is the “disturbance” in this session?', [
        right('The steady crosswind pushing the rover left', '💨'),
        wrong('The error', '📏', 'error-is-disturbance'),
        wrong('The gyro reading', '🧭', 'error-is-disturbance'),
      ], 'A disturbance is an outside push the controller must reject. The error is the controller’s measure of how far off it is; the gyro reading is the measurement.'),
    ],
    badge: { id: 'l4-heading-hold', name: 'Heading Hold', icon: '🧭', earnedFor: 'You held a heading against a crosswind and measured the error P control leaves.' },
    reward: { note: 'Error graph: every heading run now plots error over time.' },
    teacher: teacher({
      timing: lessonPlan(5, 'Walk into the wind', 'why can’t P control alone reach zero error against a constant push?'),
      warmup: {
        title: 'Walk into the wind',
        minutes: 5,
        steps: ['A student walks a straight line while a partner pushes gently and steadily on one shoulder (the wind).', 'The walker must lean into it to stay straight: ask, how far off course did they settle?', 'Discuss: to keep leaning, they must keep feeling the push.'],
        materials: ['A straight line on the floor'],
      },
      discussion: ['Where do constant disturbances act on machines? (Gravity on a drone, a current on a boat, a slope on a car.)', 'Is a 2° steady error acceptable for a survey rover? Who decides?'],
      misconceptions: [
        mc('p-reaches-zero', 'Proportional control always reaches the target exactly.', 'Against a constant disturbance, P control settles with a steady-state error: it needs some error to keep pushing.', 'Spring scale demo: hang a weight; the spring stretches until its pull balances the weight. It never returns to zero stretch while loaded — like P.'),
        mc('gain-bigger-is-better', 'A bigger gain always means better, faster control.', 'Too big a gain over-corrects and oscillates; there is a sweet spot.', 'Show the three gap graphs (gain 0.5, 2, 6). Pairs label each “lag”, “steady” or “wobble” and rank them for the tractor driver.'),
        mc('error-is-disturbance', 'The error and the disturbance are the same thing.', 'The disturbance is the outside push; the error is the controller’s measured difference from the target.', 'Card sort: wind, gyro reading, target 90°, heading − 90. Students label disturbance, measurement, set-point and error.'),
      ],
      faster: ['Plot heading against time for three Kp values on one graph.', 'Add a feed-forward term: a constant steer that cancels the known wind, and measure the new error.'],
      slower: ['Two Kp values only; describe the graphs in words.', 'Provide the averaging code; students set Kp.'],
      notes: ['This sets up Session 5: students should leave able to say “P leaves a steady error against a steady push”.'],
    }),
    parent: {
      today: 'Your teen held a robot’s heading against a steady crosswind with proportional control, and measured the small error it leaves behind.',
      tryAtHome: 'Hold a broom upright in your palm, or walk while someone gently pushes your shoulder. Notice the constant correction.',
      askYourChild: 'Why doesn’t proportional control get rid of all the error when there’s a steady wind?',
    },
  }),

  // ── 5 ────────────────────────────────────────────────────────────────────
  makeSession(L, 5, {
    objectives: [
      o('Implements P, I and D terms with variables (error, sum, change) and tunes all three on a disturbed heading-hold task.', 'I can build and tune a PID controller.', ['programming', 'algorithms']),
      o('Explains what each term does: P reacts to now, I to the past (removes steady error), D to the trend (damps overshoot).', 'I can explain what P, I and D each do.', ['science-forces', 'data'], { concepts: ['feedback-control', 'data'] }),
    ],
    episode: episode('P, I and D', 'P control held the heading against the wind — but four degrees off.', [
      scene('The garage whiteboard: P, I, D in big letters. Hana with three coloured markers.', 'Under each letter, a word: NOW · PAST · FUTURE.', 70, [
        ['guest', 'P looks at the error now. I adds up the error over time — it remembers that you’ve been off to the left for ages, and pushes harder until you’re not. D looks at how fast the error is changing — and brakes before you overshoot.', CREW.kim],
        ['myrobot', 'Three variables: error, sum of error, change in error. Three gains.'],
        ['guest', 'And three ways to make it worse if you tune them carelessly.', CREW.kim],
      ]),
      scene('The valley floor in the wind. Four runs side by side on a graph.', 'P: settles at 86°. P+I: creeps to 90° but overshoots. P+I+D: rises, barely overshoots, settles at 90°. Too much I: big slow swings.', 70, [
        ['spark', 'I removes the steady error. Too much I winds up and swings. D calms the swing — but D on a noisy sensor amplifies noise.'],
        ['myrobot', 'Tune P first, then add a little I, then a little D. One at a time, logged.'],
      ]),
      scene('The habitat. The crew watch the final run on the big screen: the heading line climbs to 90 and stays there through a gust.', 'A small cheer.', 30, [
        ['guest', 'That’s a controller I’d fly. Keep the tuning log — it’s the most valuable thing you made today.', CREW.kim],
      ]),
    ], 'Commander Adeyemi: “Good. Now the rover docks by itself. Two centimetres. Three degrees. Every time.”'),
    build: {
      part: { slot: 'sensor', id: 'line' },
      action: 'inspect',
      narration: 'The controller lives in the compute subsystem; the gyro is its sensor. Look at the error graph — that is what PID works on.',
      why: 'PID needs only an error signal; the same controller can hold a heading, a distance or a speed.',
      tryWithout: 'Without the I term the rover settles off target; without D it overshoots on every correction.',
      physicsEffect: 'No change. The crosswind is constant; gusts (±30 %) come every few seconds.',
      realWorld: 'PID controllers run inside drones, 3D printers, cruise control, industrial ovens and most robot joints.',
    },
    code: challenge({
      title: 'Add I',
      mission: 'Start from your P heading hold. Add sum = sum + error each loop and steer = Kp × e + Ki × sum. Show the steady error disappear.',
      arena: VALLEY_FLOOR,
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, TIMER, SAY],
      example: [
        'variable_set(Kp, 2); variable_set(Ki, 0.05); variable_set(sum, 0)',
        'repeat_until(compare(timer_s > 12)) {',
        '  variable_set(e, math(heading_deg − 90))',
        '  variable_change(sum, variable_get(e))',
        '  variable_set(u, math(math(variable_get(Kp) × variable_get(e)) + math(variable_get(Ki) × variable_get(sum))))',
        '  set_motors(math(45 − variable_get(u)), math(45 + variable_get(u)))',
        '  wait(0.05)',
        '}',
        'stop; say(heading_deg)',
      ],
      success: [crit('stop-in-zone', 'Reaches the beacon with heading 89–91°.'), crit('uses-blocks', 'Uses an error sum (I term).')],
      two: 'You compared the final heading with and without I.',
      three: 'You explained where the sum ends up when the error is zero (it holds the steady correction).',
      hints: ['Keep a running sum of the error.', 'u = Kp × e + Ki × sum.', 'Start Ki very small (0.02–0.05).'],
    }),
    challenge: challenge({
      title: 'Full PID',
      mission: 'Add D: change = e − lastE each loop, u = Kp·e + Ki·sum + Kd·change. Tune all three so the rover reaches the beacon at 90° ±1° with at most 3° of overshoot through the gusts. Log every tuning run.',
      arena: arena(VALLEY_FLOOR, { features: ['Rocks to 3 cm.', 'Crosswind from the right plus gusts every 3–5 s.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, HEADING, TIMER, SAY],
      example: [
        'variable_set(Kp, 2.5); variable_set(Ki, 0.04); variable_set(Kd, 6); variable_set(sum, 0); variable_set(lastE, 0)',
        'repeat_until(compare(timer_s > 12)) {',
        '  variable_set(e, math(heading_deg − 90))',
        '  variable_change(sum, variable_get(e))',
        '  if (compare(variable_get(sum) > 300)) { variable_set(sum, 300) }  ← anti-windup',
        '  if (compare(variable_get(sum) < −300)) { variable_set(sum, −300) }',
        '  variable_set(dE, math(variable_get(e) − variable_get(lastE))); variable_set(lastE, variable_get(e))',
        '  variable_set(u, math(math(math(variable_get(Kp) × variable_get(e)) + math(variable_get(Ki) × variable_get(sum))) + math(variable_get(Kd) × variable_get(dE))))',
        '  set_motors(math(45 − variable_get(u)), math(45 + variable_get(u)))',
        '  wait(0.05)',
        '}',
        'stop; say(heading_deg)',
      ],
      success: [crit('stop-in-zone', 'Reaches the beacon with heading 89–91°.'), crit('within-time', 'Overshoot never exceeds 3° after the first 2 s.'), crit('uses-blocks', 'P, I and D terms present; a tuning log of at least four runs.')],
      two: 'You tuned in the order P, then I, then D, and logged each change.',
      three: 'You limited the sum (anti-windup) and can explain why.',
      hints: ['Get P right first, then add a little I, then a little D.', 'If it swings slowly and widely, Ki is too big; if it jitters, Kd is too big.', 'Clamp the sum so I cannot wind up while the rover is stuck on a rock.'],
    }),
    quiz: [
      q('Which term removes the steady error left by P against a constant crosswind?', [
        right('I, because it keeps growing while any error remains', '➕'),
        wrong('D, because it reacts fastest', '⚡', 'd-removes-steady-error'),
        wrong('A bigger P, which can reach exactly zero', '🔼', 'p-reaches-zero'),
      ], 'The I term adds up error over time; as long as any error remains, it keeps growing until the correction balances the wind with zero error. D only responds to change; a steady error has no change.'),
      q('Your PID heading hold swings slowly from side to side with big overshoots. Most likely cause?', [
        right('Ki too large: the sum winds up and overshoots', '🌊'),
        wrong('Kd too large', '📉', 'd-removes-steady-error'),
        wrong('The target is wrong', '🎯', 'tune-all-at-once'),
      ], 'A large integral keeps pushing after the error has crossed zero, causing slow, wide swings. Reduce Ki (and limit the sum).'),
      q('What is the best order for tuning a PID controller by hand?', [
        right('P first, then add I, then add D — one change at a time, logged', '1️⃣'),
        wrong('Set all three to big values and turn them down together', '🎛️', 'tune-all-at-once'),
        wrong('D first, because it is the most important', '🔝', 'tune-all-at-once'),
      ], 'Changing one gain at a time shows what each does. Starting with P gives a stable base; I then removes the steady error; D tames the overshoot.'),
    ],
    badge: { id: 'l4-pid', name: 'PID Tuner', icon: '🎛️', earnedFor: 'You built and tuned a PID controller and can explain each term.' },
    reward: { note: 'PID template: a commented P, I, D block group is now in your toolbox (you still choose the gains).' },
    teacher: teacher({
      timing: lessonPlan(5, 'Now, past, future', 'what does each of P, I and D look at?'),
      warmup: {
        title: 'Now, past, future',
        minutes: 5,
        steps: ['Three students steer a “robot” (a fourth student walking to a target): one only sees the error now (P), one keeps a tally of how long it has been off (I), one watches how fast the error is changing (D).', 'Each advises in turn; discuss which advice helps when.'],
        materials: ['None'],
      },
      discussion: ['Where could a big I term be dangerous? (A robot stuck against a rock keeps winding up.)', 'Why can a large D make a noisy sensor worse?'],
      misconceptions: [
        mc('d-removes-steady-error', 'The D term removes steady error.', 'D responds only to how fast the error changes; a steady error has zero change, so D ignores it. I removes steady error.', 'Table: error 4, 4, 4, 4. Students compute change each step (0, 0, 0). What does D add? Then compute the running sum: what does I add?'),
        mc('p-reaches-zero', 'Proportional control always reaches the target exactly.', 'Against a constant disturbance, P control settles with a steady-state error: it needs some error to keep pushing.', 'Spring scale demo: hang a weight; the spring stretches until its pull balances the weight. It never returns to zero stretch while loaded — like P.'),
        mc('tune-all-at-once', 'Tune all gains together, or start with D.', 'Tune one at a time, usually P, then I, then D, logging each change so you know what each did.', 'Give pairs a log where all three gains changed between runs. Can they explain the improvement? Then a clean log with one change per run.'),
      ],
      faster: ['Use the Sky Port drone at Legend tier and compare your gains with the drone’s.', 'Filter the D term (average the last two changes) and measure the effect on jitter.'],
      slower: ['Add I only (P+I) and show the steady error vanish.', 'Provide the full PID code; students tune Ki and Kd.'],
      notes: ['Sky Port: Drone Pilot at Legend tier is this session’s playable challenge — full P, I and D tuning through gusts.'],
    }),
    parent: {
      today: 'Your teen built and tuned a PID controller — the same control idea used in drones, cruise control and 3D printers.',
      tryAtHome: 'Ask your teen to explain P, I and D using a shower temperature or riding a bike as the example.',
      askYourChild: 'What do the P, I and D in PID each pay attention to?',
    },
  }),

  // ── 6 ────────────────────────────────────────────────────────────────────
  makeSession(L, 6, {
    objectives: [
      o('Designs a closed-loop docking controller on distance and heading that meets 2 cm and 3° tolerances from random starts, and logs ten runs.', 'I can design a docking controller that meets a tolerance and prove it with ten logged runs.', ['engineering-design', 'programming']),
      o('Uses logged results (success rate, errors) to argue that a design meets its specification.', 'I can use my run log to show my design meets the spec.', ['data', 'communication'], { concepts: ['design-process'] }),
    ],
    episode: episode('Precision Docking', 'The engineer tuned P, I and D on the valley floor.', [
      scene('Sol 6. The charging bay at night. The rover’s battery is at 9 %.', 'Commander Adeyemi watches from the habitat door.', 60, [
        ['guest', 'On Mars nobody walks out at night to plug a rover in. It docks itself — two centimetres, three degrees — or it’s dead by morning.', CREW.adeyemi],
        ['guest', 'And “it worked once” isn’t a result. Ten runs, from random starts, logged.', CREW.kim],
      ]),
      scene('The engineer’s desk: a sketch with two controllers — one for distance, one for heading — feeding the same two motors.', 'A results table with ten empty rows.', 50, [
        ['myrobot', 'Heading PID to square up, distance P to approach, a minimum speed above the dead zone, and a speed limit near the wall.'],
      ]),
    ], 'Docking works. Arjun pulls up a satellite image: the crater ahead has never been mapped.'),
    build: {
      part: { slot: 'tool', id: 'child-choice' },
      action: 'choose',
      narration: 'Choose the tool to carry while docking — or none. It changes your mass, and so your controller.',
      why: 'Design decisions interact: a heavier rover needs different gains. Choose, then tune for what you chose.',
      tryWithout: 'There is no “without” here: whatever you carry, the controller must dock it.',
      physicsEffect: 'Tools add 0.10–0.12 kg; heavier means slower to start and to stop.',
      realWorld: 'Robot vacuums, warehouse robots and the International Space Station’s docking systems all use closed-loop control to dock precisely.',
    },
    code: challenge({
      title: 'Square Up, Then Approach',
      mission: 'From a start angled 20° off, turn until the heading is within 2° of 90, then approach with speed = 0.6 × (distance − 5), minimum 13 %, until the distance is 5 cm or less.',
      arena: arena(DOCK_BAY, { extraStarts: [{ col: 0, row: 1, heading: 'right' }, { col: 1, row: 2, heading: 'right' }] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(e, math(heading_deg − 90))',
        'repeat_until(and(compare(variable_get(e) < 2), compare(variable_get(e) > −2))) {',
        '  set_motors(math(0 − math(1.2 × variable_get(e))), math(1.2 × variable_get(e)))  ← spin on the spot towards 90°',
        '  variable_set(e, math(heading_deg − 90))',
        '}',
        'repeat_until(compare(distance_cm < 6)) {',
        '  variable_set(e, math(heading_deg − 90))',
        '  variable_set(v, math(0.6 × math(distance_cm − 5)))',
        '  if (compare(variable_get(v) < 13)) { variable_set(v, 13) }',
        '  set_motors(math(variable_get(v) − math(1.5 × variable_get(e))), math(variable_get(v) + math(1.5 × variable_get(e))))',
        '}',
        'stop',
      ],
      success: [crit('stop-in-zone', 'Front 3–7 cm from the wall, heading within 3° of 90°.'), crit('no-collision', 'Contact with the wall slower than 5 cm/s.')],
      two: 'Works from all three starts.',
      three: 'You explained why the minimum speed is 13 % (your Session 2 dead zone).',
      hints: ['Square up first, then approach.', 'Keep correcting heading while approaching.', 'Never command less than your dead-zone threshold.'],
    }),
    challenge: challenge({
      title: 'Precision Docking',
      mission: 'Your design: dock from anywhere in the bay to within 2 cm and 3°, with no contact faster than 5 cm/s. Log ten runs from random starts (distance error, heading error, success).',
      arena: arena(DOCK_BAY, { features: ['Charging pad at col 5, contacts 5 cm from the wall.', 'Random start anywhere in cols 0–2, heading 60°–120°.'] }),
      blocks: [...MOVE, ...LOGIC, ...VARS_MATH, DIST, HEADING, TIMER, ...TALK],
      example: [
        'variable_set(sum, 0); variable_set(lastE, 0)',
        'repeat_until(compare(distance_cm < 6)) {',
        '  variable_set(e, math(heading_deg − 90)); variable_change(sum, variable_get(e)); variable_set(dE, math(variable_get(e) − variable_get(lastE))); variable_set(lastE, variable_get(e))',
        '  variable_set(turn, math(math(math(1.5 × variable_get(e)) + math(0.02 × variable_get(sum))) + math(4 × variable_get(dE))))',
        '  variable_set(v, math(0.6 × math(distance_cm − 5))); if (compare(variable_get(v) < 13)) { variable_set(v, 13) }; if (compare(variable_get(v) > 50)) { variable_set(v, 50) }',
        '  set_motors(math(variable_get(v) − variable_get(turn)), math(variable_get(v) + variable_get(turn)))',
        '}',
        'stop; say(distance_cm); say(math(heading_deg − 90))',
      ],
      success: [crit('stop-in-zone', 'At least nine of ten logged runs within 2 cm and 3°.'), crit('no-collision', 'No contact faster than 5 cm/s in any run.'), crit('uses-blocks', 'Closed-loop control on distance and heading; ten runs logged by the simulator.')],
      two: 'Your log has ten rows and a success rate.',
      three: 'You can say what each controller term does in your design and show one tuning decision from your log.',
      hints: ['Two loops in one: heading correction and distance approach, both every cycle.', 'Limit speed near the wall and keep it above the dead zone.', 'Log each run before changing anything.'],
    }),
    quiz: [
      q('Your docking succeeded in 7 of 10 runs; the 3 failures all started at −30°. What next?', [
        right('Investigate the −30° starts: replay, find the cause, change one thing, re-run all ten', '🔍'),
        wrong('Report 70 % as “works” — most runs passed', '✅', 'average-hides-failures'),
        wrong('Only test from +30° from now on', '🙈', 'one-case-is-enough'),
      ], 'A pattern in the failures is evidence. Fix that case, then rerun the whole set — a fix can break other cases.'),
      q('Why does the brief demand ten runs from random starts instead of one?', [
        right('One success could be luck; ten random runs estimate how reliable the design is', '🎲'),
        wrong('To make the challenge take longer', '⏳', 'one-case-is-enough'),
        wrong('Because the simulator is unreliable', '💻', 'one-case-is-enough'),
      ], 'Reliability is a rate. Random starts cover cases you didn’t think of; ten runs give a first estimate of how often it works.'),
      q('Your rover stops 4 cm short of the pad on most runs. The commanded speed near the end is 6 %. Most likely cause?', [
        right('The command is inside the dead zone, so the rover stalls', '🧱'),
        wrong('The distance sensor is 4 cm off', '📏', 'linear-all-the-way'),
        wrong('Ki is too big', '🎛️', 'linear-all-the-way'),
      ], 'Near the target, proportional speed shrinks below the dead-zone threshold and the motors stop pushing. A minimum command fixes it.'),
    ],
    badge: { id: 'l4-precision-dock', name: 'Precision Docking', icon: '🔌', earnedFor: 'You designed a docking controller and proved it with ten logged runs.' },
    reward: { note: 'Project saved to your portfolio: Precision Docking, with your ten-run log.' },
    teacher: teacher({
      timing: projectPlan(3, 'Spec check (pairs rewrite the brief as three measurable pass/fail tests)'),
      warmup: {
        title: 'Spec check',
        minutes: 3,
        steps: ['Pairs rewrite the brief as pass/fail tests: distance error ≤ 2 cm, heading error ≤ 3°, contact speed ≤ 5 cm/s.', 'Agree how each is measured in the simulator.'],
        materials: ['Paper'],
      },
      discussion: ['Is 9 out of 10 good enough for a Mars rover? For a toy? Who decides?', 'What would you test next if you had a week?'],
      misconceptions: [
        mc('average-hides-failures', 'A good average means the design works.', 'An average can hide a pattern of failures; look at the failing cases and their causes.', 'Show a log where the average error looks fine but three runs failed from the same start. Ask what a Mars team would do.'),
        mc('one-case-is-enough', 'One successful run proves the program works.', 'You need several different cases, especially extremes, to trust a design.', 'Pairs list every combination of 3 huts (8 cases). Which 3 would they test if they could test only 3? Discuss why “none” and “all” are good choices.'),
        mc('linear-all-the-way', 'Speed is proportional to power all the way down to zero.', 'Below a threshold (the dead zone) friction wins and speed is zero; above it the relation is roughly linear.', 'Plot the class data on the board. Draw the “straight line through zero” students expected next to the real curve. Discuss the gap near zero.'),
      ],
      faster: ['Dock backwards (rear contacts) using the same controllers.', 'Report the mean and worst-case error over ten runs.'],
      slower: ['Dock from straight-on starts only, then add angled starts.', 'Log five runs; the full ten is a stretch.'],
      notes: ['Self-checks are reflection only and never gate the badge.', 'The write-up goes into the portfolio: no personal data in it.'],
    }),
    parent: {
      today: 'Your teen designed a self-docking controller for a rover and proved it worked with ten logged test runs.',
      tryAtHome: 'Ask your teen how many tries they would want before trusting something important (a bike brake, a smoke alarm) — and why.',
      askYourChild: 'How did you prove your docking controller works, not just that it worked once?',
    },
  }),
]
