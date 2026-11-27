// lib/kids/curriculum/level2/misconceptions.ts
// The misconceptions Level 2 listens for. Every wrong option in a session's
// three-question check carries one of these ids, so a wrong answer tells the
// teacher WHAT the child believes, not just that they missed it — and the
// session's teacher notes list exactly the misconceptions its check can reveal
// (built by teacher() in ./shared.ts, so the two never drift apart).
//
// Pure data. Corrections are said to the teacher; the child hears the
// question's own "why", never "wrong".

export const L2_MISCONCEPTIONS = {
  // ── Robots and programs ────────────────────────────────────────────────
  'robot-is-remote-control': { idea: 'A robot is anything you can drive with a remote control.', correction: 'A remote-control car has no sensing or deciding of its own. A robot senses, decides with its program and acts, even when nobody is holding a controller.' },
  'parts-do-everything': { idea: 'The more parts a robot has, the cleverer it is.', correction: 'Parts only sense or act. The program decides. A robot with one sensor and a good program beats one with five sensors and no plan.' },
  'stop-not-needed': { idea: 'A robot stops by itself when the program ends.', correction: 'Motors can keep turning (or the robot keeps rolling). A clear Stop block ends the move on purpose, exactly where you want it.' },
  // ── Measuring and moving ───────────────────────────────────────────────
  'time-equals-distance': { idea: 'Driving for the same time always goes the same distance.', correction: 'Distance = speed × time, and speed changes with load, slope, battery and floor. Encoders measure wheel turns, so drive_distance fixes most of that.' },
  'encoders-measure-ground': { idea: 'Wheel encoders measure how far the robot really travelled over the ground.', correction: 'Encoders count wheel turns. On ice or loose sand the wheel can spin without moving the robot, so the count says it went further than it did (measured properly in Level 3).' },
  'bigger-number-faster': { idea: 'drive_distance(50) is faster than drive_distance(20).', correction: 'The first number is how FAR (centimetres). How fast is the power percentage. A longer distance at the same power just takes longer.' },
  'turn-360-is-nothing': { idea: 'Turning 360° does nothing, so shapes never need it.', correction: 'Going all the way round once is exactly what brings a closed shape back to its starting heading: the outside turns of any closed shape add up to 360°.' },
  'inside-angle-is-turn': { idea: 'To draw a triangle the robot turns 60° at each corner, because the inside angles are 60°.', correction: 'The robot turns by the OUTSIDE angle: 180° − 60° = 120°. Three turns of 120° make 360°, one full turn.' },
  'taller-is-stronger': { idea: 'A taller robot can carry more without tipping.', correction: 'Tipping depends on where the weight is. A wide base and a low centre of mass resist tipping; height makes it easier to tip.' },
  'more-wheels-faster': { idea: 'Four wheels make a robot faster than two.', correction: 'Speed comes from the motors and wheel size. Four wheels spread the load and make a wider, steadier base; they can even make turning harder.' },
  'steer-needs-wheel-turn': { idea: 'A robot can only change direction by turning its wheels like a car.', correction: 'With two motors you steer by speed difference: left faster than right curves right. No wheel has to swivel.' },
  'same-power-curves': { idea: 'Giving both motors the same power makes the robot curve.', correction: 'Equal power drives (nearly) straight. A curve needs a DIFFERENCE between left and right; the bigger the difference, the tighter the curve.' },
  // ── Sensors and conditions ─────────────────────────────────────────────
  'sensor-sees-everything': { idea: 'A line sensor sees the whole line, like our eyes see a road.', correction: 'A simple line sensor only knows "dark or light" right under itself. Following a line means checking again and again and correcting each time.' },
  'if-checks-forever': { idea: 'An if block keeps watching the sensor for the rest of the program.', correction: 'An if checks ONCE, at the moment the program reaches it. To keep checking, put it inside a loop.' },
  'else-optional-means-nothing': { idea: 'The else part of if / else runs as well when the condition is true.', correction: 'Exactly one branch runs each time: the if part when the condition is true, the else part when it is false.' },
  'forever-is-fine': { idea: 'A forever loop is fine with no way to stop.', correction: 'Every forever needs a way to end safely: a stop condition (repeat until), a time-out or a human stop button. Real robots have an emergency stop.' },
  'loop-runs-once': { idea: 'Blocks inside a loop run only once and then the loop ends.', correction: 'A loop runs its inside blocks again and again: a set number of times (repeat), until something is true (repeat until), or always (forever).' },
  'and-or-same': { idea: '"and" and "or" mean the same thing in a condition.', correction: 'AND needs both things true. OR needs at least one. "Clear AND green" is much stricter than "clear OR green".' },
  'not-flips-action': { idea: '"not" makes the robot do the opposite action.', correction: 'NOT flips a true/false answer, not the action: "not line_seen" is true when the sensor sees NO line.' },
  'timer-is-clock': { idea: 'The timer tells the time of day.', correction: 'timer_s counts seconds since the program started (or since it was reset). It is a stopwatch, not a clock.' },
  'wait-for-event-guess': { idea: 'Waiting a guessed number of seconds is as good as checking.', correction: 'A guessed wait works only if the world is always the same. Checking the timer or a sensor works when things change.' },
  // ── Debugging and testing ──────────────────────────────────────────────
  'bug-means-start-again': { idea: 'When a program has a bug, you should delete it and start again.', correction: 'Most bugs are one small step. Predict, run, compare with your prediction, and change one thing at a time.' },
  'change-many-at-once': { idea: 'Changing lots of things at once finds the bug faster.', correction: 'If you change three things and it works, you do not know which fixed it, and one of them may break something else later. One change, one test.' },
  'worked-once-done': { idea: 'If the program worked once, it is finished.', correction: 'Real robots meet different starts, floors and batteries. Test many times from different starts; fix anything that fails even once.' },
  'sensors-always-right': { idea: 'Sensors always give the right answer.', correction: 'Sensors can be fooled: glare, a gap in a line, soft surfaces that swallow an echo. Careful programs check twice or combine readings.' },
  // ── Fair tests and data ────────────────────────────────────────────────
  'one-run-proves': { idea: 'One run is enough to decide which part is better.', correction: 'Results vary. Run each option several times on the same course and compare the results in a table.' },
  'change-everything-fair': { idea: 'A fair test can change the drive AND the load AND the floor at the same time.', correction: 'A fair test changes ONE thing (the drive) and keeps everything else the same, so you know what made the difference.' },
  'tracks-always-best': { idea: 'Tracks are always better than wheels.', correction: 'Tracks grip on sand and rock but are slower, heavier and use more energy on a smooth floor. The best drive depends on the ground.' },
  // ── Tools and gripping ─────────────────────────────────────────────────
  'grip-hard-is-best': { idea: 'A gripper should always squeeze as hard as it can.', correction: 'Too hard crushes soft things and wastes energy. Real grippers limit their force and approach slowly.' },
  'close-before-reach': { idea: 'The order of open, approach and close does not matter.', correction: 'Open first, approach slowly, then close. Closing too early grabs air; approaching fast knocks the object away.' },
  // ── Colour and camera ──────────────────────────────────────────────────
  'colour-sensor-sees-far': { idea: 'A colour sensor can see the colour of things across the room.', correction: 'A colour sensor reads the floor right under it, lit by its own small light. A camera can see further, but needs light.' },
  'camera-understands': { idea: 'A camera understands what it sees, just like a person.', correction: 'A camera gives numbers for every pixel. The program has to turn those numbers into "wall" or "red", and it can get it wrong.' },
  'camera-always-better': { idea: 'A camera is always better than single-job sensors.', correction: 'A camera does many jobs but needs light, more computing and more power, and costs more. A bumper or echo sensor can be simpler and more reliable for one job.' },
  // ── Nature, safety, people ─────────────────────────────────────────────
  'nature-rules-optional': { idea: 'Rules for robots in nature only matter if someone is watching.', correction: 'Nests, animals and plants are harmed whether or not anyone sees. A good robot follows the rule every time; its program makes that automatic.' },
  'robots-cannot-harm-nature': { idea: 'Robots are machines, so they cannot hurt animals or places.', correction: 'Robots can crush nests, scare animals, leak oil and make noise. Designers add zones, slow speeds and quiet modes on purpose.' },
  'design-for-me': { idea: 'If a design works for me, it works for everyone.', correction: 'People differ: height, sight, hearing, how they move. Ask the people who will use it, and test with them.' },
  'accessibility-extra': { idea: 'Making something work for disabled people is an extra you add at the end.', correction: 'Designing for everyone from the start usually makes it better for all: a spoken message and a light help in noise and in the dark too.' },
  // ── Patterns, autonomy, careers ────────────────────────────────────────
  'random-search-ok': { idea: 'Driving around at random is a good way to search an area.', correction: 'Random driving misses spots and repeats others. A pattern (back and forth, like mowing a lawn) covers everything exactly once.' },
  'nested-loop-adds': { idea: 'A loop inside a loop repeats (outer + inner) times.', correction: 'The inside runs (outer × inner) times: repeat 4 { repeat 3 { … } } runs the inner blocks 12 times.' },
  'robots-replace-all-jobs': { idea: 'Robots will do every job, so there is no robot work for people.', correction: 'Robots create jobs too: people design, build, program, test, repair and supervise them, and decide where they should be used.' },
  'autonomous-means-alone': { idea: 'An autonomous robot never needs a person.', correction: 'Autonomous robots decide small things alone, but people set the mission, watch for trouble and can always stop them.' },
} as const

export type MisconceptionId = keyof typeof L2_MISCONCEPTIONS

export function misconception(id: MisconceptionId): { idea: string; correction: string } {
  const m = L2_MISCONCEPTIONS[id]
  return { idea: m.idea, correction: m.correction }
}
