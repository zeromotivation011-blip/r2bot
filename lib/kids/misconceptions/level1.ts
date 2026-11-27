// lib/kids/misconceptions/level1.ts
//
// The misconceptions Level 1 (Explorers, ages 5–7) listens for. Every wrong
// option in a Level 1 session check carries one of these ids (through `mis()`
// in lib/kids/curriculum/level1/shared.ts), so a wrong pick tells the teacher
// WHAT a child believes, not just that they missed it.
//
// Each entry has two voices:
//   idea / correction  — teacher-facing, precise;
//   child              — what a teacher can say to a 5–7-year-old, kindly,
//                        never "wrong" (the check itself speaks the question's
//                        own "why" to the child);
//   reteach            — a 5-minute, mostly unplugged reteach.
//
// Pure data, no imports: safe in the browser, the server and the verify script.
// Facts must stay true; where a number or a physical claim is involved the
// physics is noted beside it.

export interface MisconceptionText {
  /** Teacher-facing: the idea a child who picks the option holds. */
  idea: string
  /** Teacher-facing: the accurate idea. */
  correction: string
  /** Child-friendly words a teacher can say to the class (ages 5–7). */
  child: string
  /** A 5-minute reteach, unplugged where possible. */
  reteach: string
}

export const L1_MISCONCEPTIONS = {
  // ── What a robot is ───────────────────────────────────────────────────────
  'tools-are-robots': {
    idea: 'Any useful object or tool is a robot.',
    correction: 'A tool (a spoon, a hammer) needs a person to work it. A robot senses, decides with its program and acts on its own.',
    child: 'A spoon is a great helper, but it cannot feel or decide anything. A robot can sense, think and act by itself.',
    reteach: 'Hold up three things (a spoon, a torch, a toy that moves when you clap). For each, the class does the three actions: hand to ear (can it sense?), finger to head (can it decide?), jump (can it act by itself?). Only a thing that gets all three is a robot.',
  },
  'battery-means-robot': {
    idea: 'Anything with a battery is a robot.',
    correction: 'A battery only stores energy. A torch has one but cannot sense or decide. A robot senses, thinks and acts.',
    child: 'Lots of things have batteries: torches, clocks, toys. A battery gives energy. Being a robot means sensing, thinking and acting.',
    reteach: 'Sort pictures into two hoops: "has a battery" and "is a robot". Show that the hoops overlap but are not the same: a torch is only in the battery hoop, a robot vacuum is in both.',
  },
  'battery-gives-senses': {
    idea: 'The battery is what lets a robot see, feel or think.',
    correction: 'The battery stores energy for every part. Sensors (camera, bumper) do the sensing and the program does the deciding.',
    child: 'The battery is like the robot’s lunch box: it gives energy. The robot senses with special parts, like a bumper or a camera.',
    reteach: 'Draw the robot on the board and label it together: battery = energy, motor = moves, bumper/camera = senses, program = decides. Children point to the part that does each job as you call it out.',
  },
  'machines-have-feelings': {
    idea: 'Machines (robots, prams, cars) are alive: they want things, like or dislike things and have feelings.',
    correction: 'Machines have no feelings or wishes. A robot follows the program people wrote; a pram rolls back down a hill because gravity pulls it.',
    child: 'Robots can show a smiley face, but they do not feel happy or sad. They do what their program says, step by step.',
    reteach: 'Play "Robot or me?": read statements ("feels tired", "follows its program", "likes ice cream", "stops when told") and children stand up for things only people do and crouch for things a robot does. Finish by drawing a robot face and saying who chose it: a person.',
  },
  // ── Moving ────────────────────────────────────────────────────────────────
  'motor-not-needed': {
    idea: 'Wheels turn by themselves, or something outside (like the wind) pushes the robot along.',
    correction: 'A motor turns each wheel, using energy from the battery. With no motor turning them, the wheels stay still.',
    child: 'Inside the robot there is a motor that spins each wheel. The motor uses the battery’s energy. No motor, no rolling!',
    reteach: 'Human wheels: two children are the robot’s wheels and one is the motor. The wheels may only move when the motor taps their shoulder. The class sees that nothing moves until the motor works.',
  },
  'robot-knows-where-to-go': {
    idea: 'The robot knows where it has to go (where the light or the goal is).',
    correction: 'A Level 1 robot has no map and, at first, no sensors. It goes exactly as far as the program tells it.',
    child: 'The robot does not know where the light is. It only goes where our blocks tell it to go. We are its map!',
    reteach: 'A child is the robot with eyes closed. The class must give exact steps ("hop 2") to reach a cushion. When a child says "go to the cushion", the robot says "I don’t know where that is!".',
  },
  'count-the-start-square': {
    idea: 'When counting hops, you count the square the robot is standing on.',
    correction: 'Count the hops (the jumps between squares), not the squares touched. Starting square + 2 hops = 2 squares away. Children who count the start square land one too far — the same slip seen on number lines.',
    child: 'We count the hops, not the square we start on. Hop… one! Hop… two! Now we are there.',
    reteach: 'Floor grid with tape squares. A child stands on START and the class counts out loud only when feet land: "one, two". Repeat with 3 and 4. Then mark the start square with a "0" card.',
  },
  'extra-parts-make-it-faster': {
    idea: 'Adding parts (a ball at the back, a bumper) makes a robot go faster.',
    correction: 'Speed comes from the motors and wheels. The caster ball holds the robot up so it balances and can roll any way; a bumper feels touches. Extra parts add weight, if anything.',
    child: 'The little ball at the back is like the wheel on a suitcase: it holds the robot up so it can roll any way. The motors make it go.',
    reteach: 'Balance a toy car body on two wheels: it tips. Add a marble or bead under the back (caster): it stands and rolls in any direction. Ask: did the marble push it faster, or hold it up?',
  },
  // ── Sequences and time ────────────────────────────────────────────────────
  'robot-can-see-without-sensor': {
    idea: 'A robot can see what is around it even if it has no camera or sensor.',
    correction: 'A robot only knows about the world through its sensors. With none, it cannot notice a cart or a wall; it just follows its program.',
    child: 'Our robot has no eyes yet! It cannot see the cart. That is why we tell it to wait.',
    reteach: 'Blindfold game: the "robot" wears a sleep mask and follows only spoken cards. A "cart" (a child with a box) crosses. The class sees the robot cannot stop by itself, then adds a "Wait" card.',
  },
  'order-does-not-matter': {
    idea: 'The same blocks in any order do the same thing.',
    correction: 'A robot runs its steps in order, top to bottom. Moving a Wait or a Hop changes what happens and when.',
    child: 'The robot does the steps in order, one after another. If we swap two steps, the robot does something different.',
    reteach: 'Act out a morning routine with picture cards in two orders: "shoes, socks" and "socks, shoes". Laugh at the first one, then lay Go and Wait cards in both orders and act them out.',
  },
  'robot-fills-in-steps': {
    idea: 'A robot will do sensible steps we forgot, like waiting.',
    correction: 'A robot does only the steps in its program. If a Wait is missing, it does not wait.',
    child: 'A robot never guesses. If we forget a step, the robot skips it. We must put in every step.',
    reteach: 'Program your teacher to make a sandwich with cards, deliberately leaving out "open the bread bag". Follow the cards exactly. Children spot the missing step and add the card.',
  },
  'wait-watches-the-world': {
    idea: 'A Wait block waits until something happens (the bridge comes down, the cart passes).',
    correction: 'Wait only waits for a time. The robot does not know about the bridge; a person chose the time. Waiting for an event needs a sensor (Level 1 Sessions 19–22).',
    child: 'Wait means “rest for a little while”. The robot does not watch the bridge — we guessed how long to rest.',
    reteach: 'One child raises and lowers a "bridge" (a ruler) at random. The robot child may only use a sand-timer wait. Sometimes it works, sometimes not. Ask: what would the robot need to know when the bridge is down?',
  },
  'timed-plan-always-works': {
    idea: 'A fixed plan (a timed wait, "Hop 3, always") keeps working even when the world changes.',
    correction: 'A fixed plan only works if the world stays the same. When the timing or the distance changes, the robot needs a sensor to check the world each time.',
    child: 'A plan that counts or waits a set time works only if nothing changes. When things change, the robot needs to feel or listen to check.',
    reteach: 'Put a box 3 steps from a child-robot and use "Hop 3". Move the box to 2 steps: bump! Now play "keep going until you touch the box" with a hand out. It works wherever the box is.',
  },
  // ── Showing and saying ────────────────────────────────────────────────────
  'say-makes-it-move': {
    idea: 'Talking (the Say block) makes the robot move.',
    correction: 'Say only speaks. A Hop or Turn block moves the robot.',
    child: 'Say lets the robot talk. Hop makes it move. They are different jobs.',
    reteach: 'Two command cards, Say and Hop. Call one at a time: on Say, children only speak ("Hello!"); on Hop, they only move. Mix them up quickly.',
  },
  'announce-after': {
    idea: 'A robot can tell people what it will do after it has done it.',
    correction: 'A warning only helps before the move, so people have time to step aside — like a car’s indicator before it turns.',
    child: 'The robot says what it will do before it moves, so people can get ready. Like a bike bell before you pass someone.',
    reteach: 'Announce your move: children walk around and must say "I’m going left!" BEFORE moving. Then try it the other way (move first, then say). Ask which one helped others more.',
  },
  'no-need-to-signal': {
    idea: 'A robot does not need to show people what it is doing (it can just hide or stay dark).',
    correction: 'Robots show their state (a light, a face, words) so people around know what to expect and stay safe.',
    child: 'When the robot shows “I am waiting”, people know what it is doing. That keeps everyone safe and calm.',
    reteach: 'Traffic-light game: a child-robot holds a red or green card to show "waiting" or "going". Others decide whether to cross in front. Then the robot hides the card: nobody knows what to do.',
  },
  // ── Turning and direction ─────────────────────────────────────────────────
  'turn-moves-forward': {
    idea: 'A turn also moves the robot forward, round a big circle.',
    correction: 'Our robot turns on the spot: one wheel forward, one wheel back. It stays on the same square; you need a Hop to move after turning.',
    child: 'A turn spins the robot on the spot, like a ballerina. To move to a new square, it needs a Hop.',
    reteach: 'Robot says turn: children stand on a spot (a paper plate) and turn without leaving it. Then "hop" off the plate. Ask: which one moved you to a new place?',
  },
  'left-right-mirror': {
    idea: 'A robot’s right is the opposite of my right, even when we face the same way.',
    correction: 'If you stand behind the robot, facing the same way, its right is your right. Sides only swap when the robot faces you.',
    child: 'Stand behind the robot and look where it looks. Now its right hand is your right hand!',
    reteach: 'Children wear a sticker on their right hand. A child-robot stands with their back to the class: everyone points right together and sees it is the same. Then the robot turns to face the class: now the sides swap.',
  },
  'turns-dont-add-up': {
    idea: 'Turning twice the same way puts the robot back to the way it was facing.',
    correction: 'Two quarter turns the same way make a half turn: the robot now faces backwards. Turning right then left would undo the first turn.',
    child: 'Right, then right again, and the robot is looking the other way! To face front again, turn left.',
    reteach: 'Everyone stands facing the board. "Turn right… turn right": they now face the back wall. "Turn left… turn left": back to the board. Then try right then left: no change.',
  },
  // ── Planning and design ───────────────────────────────────────────────────
  'skip-the-plan': {
    idea: 'Engineers just press Go and see what happens.',
    correction: 'Engineers ask, imagine and plan (draw it) first, then build and test, then improve.',
    child: 'Engineers plan first: they draw their idea, then they try it, then they make it better.',
    reteach: 'Draw a 3-step dance as arrows on paper, then perform it. Then try a dance with no plan and compare which one partners could copy.',
  },
  'changed-plan-was-bad': {
    idea: 'A plan that needs changing was a bad plan.',
    correction: 'Every plan changes when it is tested. Testing and improving is the point, not a failure.',
    child: 'Every plan gets changed. Changing it after a test is what engineers do!',
    reteach: 'Make a paper aeroplane, fly it, change one fold, fly again. Cheer each change. Say: "plan, test, change".',
  },
  'back-adds-distance': {
    idea: 'Hopping back adds more distance, like hopping forward again.',
    correction: 'Hop back undoes a hop forward: forward 1 then back 1 brings the robot to where it started.',
    child: 'Hop forward, hop back, and you are home again!',
    reteach: 'On the floor grid: forward 1, back 1. Mark where you end. Then forward 2, back 1. Children predict before moving.',
  },
  'algorithm-is-a-part': {
    idea: 'An algorithm is a thing or a part of the robot.',
    correction: 'An algorithm is a list of steps in order to do a job, like a recipe. It can be written, drawn or acted out.',
    child: 'An algorithm is a list of steps, like a recipe for a sandwich. You can draw it or say it.',
    reteach: 'Write the steps for washing hands as pictures. Call the list "our algorithm". Act it out, then shuffle two pictures and act again.',
  },
  'robot-reads-our-plan': {
    idea: 'The robot can read our drawing or our written plan.',
    correction: 'The plan is for us. The robot only follows the blocks in its program, so we turn the plan into blocks.',
    child: 'The drawing helps us think. The robot cannot read it — we turn the drawing into blocks for it.',
    reteach: 'Draw a path with arrows, hold it up to the child-robot, who does nothing. Then give the matching command cards one by one: now it moves.',
  },
  'every-segment-needs-turn': {
    idea: 'Every part of a path needs its own turn block.',
    correction: 'You turn only where the path changes direction. Straight, turn, straight has one turn.',
    child: 'We only turn at a corner. Straight lines do not need a turn.',
    reteach: 'Walk a tape path with one corner. The class claps only when the walker turns. Count claps: one. Try a path with two corners.',
  },
  // ── Debugging ─────────────────────────────────────────────────────────────
  'bug-means-broken-robot': {
    idea: 'If the program is wrong, the robot is broken.',
    correction: 'The robot did exactly what the program said. The steps need fixing, not the robot.',
    child: 'The robot is fine! It did just what we told it. We need to fix the steps.',
    reteach: 'Spot the silly step: read a recipe with one silly step ("put the bread in the bath"). Ask: is the cook broken, or the recipe? Fix the card together.',
  },
  'bug-means-start-again': {
    idea: 'When a program has a bug, you should throw it away and start again.',
    correction: 'Most bugs are one small step. Watch where the robot stops doing the plan, fix that one step and test again.',
    child: 'Let’s be bug detectives: watch where the robot stops following the plan, and fix just that step.',
    reteach: 'Run a 5-card program with one wrong card on the floor grid. Children say "freeze!" the moment the robot goes off the plan. Swap only that card.',
  },
  'good-engineers-never-bug': {
    idea: 'Good engineers (and good shows) never have bugs; making one means I am bad at this.',
    correction: 'Everyone makes bugs. Finding and fixing them is the skill engineers are proud of.',
    child: 'Everyone makes bugs, even grown-up engineers. Finding them makes you a detective!',
    reteach: 'Teacher programs the class with a deliberate bug and says "oops, a bug!". Celebrate when children find it. Give a "bug detective" sticker for each bug found and fixed.',
  },
  // ── The pen ───────────────────────────────────────────────────────────────
  'pen-up-down-mixed': {
    idea: 'Pen up puts the pen on the paper (the two blocks are mixed up).',
    correction: 'Pen down touches the paper, so moves draw. Pen up lifts it, so the robot can travel without drawing.',
    child: 'Pen DOWN touches the paper and draws. Pen UP lifts it off.',
    reteach: 'Finger trails: finger down on the table = drawing, finger up in the air = travelling. Call out "pen down", "hop", "pen up", "hop" while children move their finger.',
  },
  'pen-lifts-itself': {
    idea: 'The pen lifts by itself when the robot stops or the program ends.',
    correction: 'Only the Pen up block lifts it. Until then every move keeps drawing.',
    child: 'The pen stays down until we say Pen up. Then it stops drawing.',
    reteach: 'Draw on the board with a marker while walking a path; keep drawing until a child says "pen up!". Show the line that appeared when nobody said it.',
  },
  'pen-moves-robot': {
    idea: 'Pen down moves or steers the robot.',
    correction: 'Pen down only puts the pen on the paper. Hop and Turn move the robot.',
    child: 'Pen down just puts the pen on the paper. Hop is what moves the robot.',
    reteach: 'Call "pen down" — children press a finger on paper and keep still. Then "hop" — now they move. Ask what moved them.',
  },
  // ── Loops and patterns ────────────────────────────────────────────────────
  'repeat-is-for-one-step': {
    idea: 'Repeat is for a step that happens only once.',
    correction: 'Repeat saves writing the same steps again and again. A step that happens once just goes in the program on its own.',
    child: 'Repeat is for steps that happen again and again, like clap, clap, clap.',
    reteach: 'Clap loops: "repeat 3 { clap }" on the board, then "jump" once without a loop. Ask which one needed the Repeat.',
  },
  'square-turn-count': {
    idea: 'A square needs 2 turns (like an L) or 8 (counting sides and corners).',
    correction: 'A square has 4 corners, so the robot turns 4 times. Four quarter turns make one full turn, back to where it started facing.',
    child: 'A square has 4 corners. At each corner the robot turns, so 4 turns!',
    reteach: 'Walk round a tape square. At each corner, children hold up a finger and turn. Count fingers: 4. Notice you end up facing the way you started.',
  },
  'repeat-means-extra': {
    idea: 'Repeat 4 means do it once, then 4 extra times.',
    correction: 'Repeat 4 means do the inside steps 4 times in total.',
    child: 'Repeat 3 means 3 times altogether: one, two, three.',
    reteach: 'Repeat 3 { clap }: children hold up a finger for each clap and stop at 3. Then Repeat 2 { stamp }.',
  },
  'pattern-is-anything': {
    idea: 'A pattern can go on with anything new (or a pattern is just anything pretty).',
    correction: 'A pattern has a part that repeats in the same way: red, blue, red, blue… so the next one is blue.',
    child: 'A pattern repeats the same part again and again. Red, blue, red, blue — what comes next?',
    reteach: 'Body patterns: clap, stamp, clap, stamp… stop and ask what comes next. Then try a longer part: clap, clap, stamp.',
  },
  'pattern-unit-not-seen': {
    idea: 'To make three steps of a staircase you only need to draw one step.',
    correction: 'A repeating pattern is one piece (the unit) done again and again. Repeat 3 around one step draws three steps.',
    child: 'One step is the part that repeats. Repeat it 3 times and you have 3 steps!',
    reteach: 'Build one step with blocks, then copy it 3 times. Circle the part that repeats. Show the Repeat 3 block around one step.',
  },
  'patterns-only-in-maths': {
    idea: 'Patterns are only found in maths books.',
    correction: 'Patterns are everywhere: cloth, tiles, songs, floors, fences, nature.',
    child: 'Patterns are all around us — on clothes, floors and in songs!',
    reteach: 'Pattern hunt: two minutes to find a pattern in the room (a jumper, the floor, a window). Each child points to the part that repeats.',
  },
  'repeat-makes-bigger': {
    idea: 'Repeating a shape makes the same shape bigger.',
    correction: 'Repeat draws the shape again. With a turn between copies, the copies go round a point like the petals of a flower.',
    child: 'Repeat draws the same square again. With a turn in between, the squares go round like flower petals.',
    reteach: 'Draw one square on paper, turn the paper a quarter turn, draw it again. Do it 4 times: a flower. The square never got bigger.',
  },
  // ── Tools ─────────────────────────────────────────────────────────────────
  'any-tool-any-job': {
    idea: 'Any tool can do any job.',
    correction: 'Each tool fits a job: a scoop carries, a pen draws, a headlight lights the way. Engineers choose the tool for the job.',
    child: 'Each tool has its own job. A scoop carries, a pen draws, a light helps you see.',
    reteach: 'Spoon relay with three "tools" (a spoon, a crayon, a torch) and three jobs (carry a ball, draw a line, light a box). Children match each tool to its job.',
  },
  'robot-has-every-tool': {
    idea: 'A robot wears every tool at once.',
    correction: 'Our robot has one tool place. Engineers choose: more tools mean more weight, more cost and more to go wrong.',
    child: 'Our robot has one tool space, so we pick the best tool for today’s job.',
    reteach: 'Give a child-robot one "tool hand" (a single glove). They must swap the spoon for the crayon between jobs. Ask why real robots change tools too.',
  },
  'scoop-tip-mixed': {
    idea: 'Scoop up and Tip out do the same job (or Scoop up lets things go).',
    correction: 'Scoop up picks things up; Tip out lets them go. Opposite actions need different blocks, like Pen down and Pen up.',
    child: 'Scoop up picks it up. Tip out lets it go. Two different jobs!',
    reteach: 'With a real spoon and a pom-pom, call "scoop up" and "tip out" in mixed order. Children act each one.',
  },
  // ── Forces, ground and slopes ─────────────────────────────────────────────
  // Physics: on a slope, part of the robot's weight pulls back along the slope
  // (m·g·sin θ), and a heavier load is more weight to lift, so the same drive
  // block (the same time of driving) covers less distance uphill.
  'hills-change-nothing': {
    idea: 'A hill or a heavy load does not change how far the same block takes the robot (or it even goes further).',
    correction: 'Uphill, part of the push goes into lifting the robot, and a heavy load is more to lift, so the same block goes less far. Testing tells us how much.',
    child: 'Going uphill is hard work, like pushing a full pram up a hill. The same Hop goes less far.',
    reteach: 'Push it uphill: roll a toy car with the same flick on a flat table and then up a book ramp, with and without a load (a few coins). Mark where it stops each time.',
  },
  'robot-is-weaker-today': {
    idea: 'The robot stopped short because it is weaker today.',
    correction: 'The robot is the same. The load and the hill changed. Test, then add a hop.',
    child: 'The robot is just as strong as yesterday. The hill and the load made it harder. Let’s test and add a hop!',
    reteach: 'Same toy car, same flick, three runs on the flat: about the same each time. Now add the ramp. Ask: did the car change, or the road?',
  },
  // Physics: stopping depends on grip (friction). On ice the friction is small,
  // so a sliding robot keeps going: stopping distance ≈ v² / (2·μ·g), longer
  // when μ is small and much longer when v is bigger.
  'stopped-wheels-stop-robot': {
    idea: 'When the wheels stop, the robot stops at once.',
    correction: 'Only if the wheels can grip. On ice there is very little grip (friction), so the robot keeps sliding after the wheels stop.',
    child: 'On ice there is nothing to grip, so the robot slides on — like you in socks on a shiny floor.',
    reteach: 'Slide test: push a block across carpet and across a tray with a little water or a smooth plastic sheet. Mark where it stops on each.',
  },
  'fast-is-fine-on-ice': {
    idea: 'Driving fast on ice is fine.',
    correction: 'With little grip a fast robot slides much further before it stops (the stopping distance grows with speed squared). Slow is safer on ice.',
    child: 'On ice we go slowly, so we can stop in time.',
    reteach: 'On a smooth tray, flick a block gently and then hard. Compare how far each slides after you let go.',
  },
  'sand-like-ice': {
    idea: 'Sand is slippery like ice.',
    correction: 'Sand is the opposite: the wheels sink and it is soft and draggy, so the robot slows down instead of sliding.',
    child: 'Sand is soft and the wheels sink in. It is hard to roll, not slippery.',
    reteach: 'Roll a toy car across a tray of sand and a smooth tray. The class sees it stop quickly in sand. Feel both with fingers: grippy and draggy vs smooth.',
  },
  // ── Light and seeing ──────────────────────────────────────────────────────
  'eyes-send-beams': {
    idea: 'Eyes and cameras send out a beam to see, so they work in total darkness.',
    correction: 'Eyes and ordinary cameras catch light that comes in from things around them, so they need light. (Special heat cameras sense warmth instead, but Spark’s camera is an ordinary one.)',
    child: 'Our eyes and Spark’s camera catch light. In total darkness there is no light to catch, so we need a lamp.',
    reteach: 'What’s in the box?: a shoebox with a small hole and a toy inside. Look in: nothing. Open a second hole and shine a torch in: now you can see it. Light comes in to your eyes.',
  },
  'light-uses-no-energy': {
    idea: 'A light uses no battery energy (or the robot cannot drive with its light on).',
    correction: 'A light uses energy from the same battery as the motors. Switching it off when it is not needed saves energy for driving.',
    child: 'The light uses battery energy too. Switching it off saves energy for later.',
    reteach: 'Energy tokens: the robot starts with 10 counters. Each hop costs 1, each minute of light costs 1. Play twice, once leaving the light on: the robot runs out sooner.',
  },
  'robot-needs-light-to-follow-plan': {
    idea: 'Our robot needs the light to follow its plan.',
    correction: 'Our robot follows its program without seeing. The light is for Spark’s camera and for people to see the robot coming.',
    child: 'The robot follows its steps even in the dark. The light helps people see it — and keeps everyone safe.',
    reteach: 'A child-robot follows command cards with eyes closed and still arrives. Then ask: who needed the light? (The people watching, and a camera.)',
  },
  // ── Helping people ────────────────────────────────────────────────────────
  'design-starts-with-looks': {
    idea: 'Designing a helper starts with how it looks (its colour).',
    correction: 'Engineers start by asking what the person needs. Looks come later.',
    child: 'First we ask: what does the person need help with? Then we design.',
    reteach: 'Helper interviews: in pairs, one child says something hard at home, the other asks two questions before drawing a helper. Share one drawing that solves the need.',
  },
  'faster-is-better': {
    idea: 'A bigger, faster robot is a better, safer helper (it can go around people fast).',
    correction: 'Near people, slow, small and careful is often best. Real robots slow down and wait for a clear path around people.',
    child: 'Near people, robots go slowly and wait. Careful is better than fast.',
    reteach: 'Stop, look, wait: children walk as "robots" among standing "people". Fast robots must freeze when a person steps in; slow robots can stop in time. Ask which felt safer.',
  },
  // ── Sensors ───────────────────────────────────────────────────────────────
  'bumper-sees': {
    idea: 'A bumper lets the robot see the wall before it gets there.',
    correction: 'A bumper only feels the wall when it touches it. It knows nothing before the touch.',
    child: 'A bumper is like your hand in the dark: it only knows the wall is there when it touches it.',
    reteach: 'Feel your way: eyes closed, hand out, walk slowly to a wall. You know the wall is there only when your hand touches it.',
  },
  'if-runs-every-time': {
    idea: 'The blocks inside “if” run every time.',
    correction: 'The blocks inside “if” run only when the condition is true — here, only when the bumper is pressed.',
    child: 'The robot turns ONLY IF it feels a bump. No bump, no turn.',
    reteach: 'The “if” game: "If I clap, you jump." Clap only sometimes. Children jump only when they hear the clap.',
  },
  'sense-think-act-mixed': {
    idea: 'Sensing, thinking and acting are the same thing (the “if” is sensing, or feeling a bump is acting).',
    correction: 'Sense = getting information (bumper, echo). Think = deciding with the program (“if”). Act = doing something (moving the wheels).',
    child: 'Sense: the robot feels or hears. Think: it decides. Act: it moves.',
    reteach: 'Sense–think–act sorting: picture cards (bumper pressed, “if” block, wheels turning, echo heard) sorted under three hand signs: ear, head, jump.',
  },
  'rule-only-fits-one-maze': {
    idea: 'A rule only works in the place it was made for.',
    correction: 'A sensor rule (“if I feel a bump, I turn right”) works in any place of the same kind, because the robot checks the world each time. That is why robots use rules, not fixed routes.',
    child: 'Our bump rule works in any maze where every corner turns right, because the robot feels each wall when it gets there.',
    reteach: 'Lay out a new tape maze where every corner turns right. A child-robot uses only the rule "walk until you bump, then turn right" and still finds the toy.',
  },
  'distance-sensor-is-bumper': {
    idea: 'A distance sensor has to touch things, like a bumper.',
    correction: 'Distance Eyes measure from afar: they send a sound too high for us to hear and time how long its echo takes to come back.',
    child: 'Distance Eyes do not touch. They shout a tiny squeak we cannot hear and listen for the echo, like a bat.',
    // Physics: sound travels about 343 m/s, so the echo from a wall 5 m away
    // returns in about 0.03 s — too quick for ears to time, easy for a sensor.
    reteach: 'Echo clap: in a hall or outside a big wall, clap once and listen for the echo. Act it out: one child is the sound and runs to the wall and back; a nearer wall means a shorter trip. Distance Eyes time that trip — far too quick for our ears to notice, but the sensor can measure it.',
  },
  'distance-eyes-see': {
    idea: 'Distance Eyes are real eyes that see pictures.',
    correction: 'They do not see pictures at all. They only measure how far away the nearest thing in front is, from the echo.',
    child: 'Distance Eyes cannot see colours or faces. They only know how far away something is.',
    reteach: 'A child is the sensor with eyes closed. A partner holds up a teddy or a book, near or far, and may only say "near" or "far". Can the sensor tell what the object is? No — only how far away it is.',
  },
  // Physics: fog scatters light, so a camera sees grey; an ultrasonic echo
  // (sound, wavelength about 8.6 mm at 40 kHz) passes tiny fog droplets and
  // still comes back from the wall.
  'camera-sees-through-fog': {
    idea: 'A camera can see through thick fog.',
    correction: 'Fog scatters light, so a camera sees only grey. Distance Eyes use sound echoes, which still come back in fog.',
    child: 'In fog, cameras see grey, like our eyes. Distance Eyes listen for echoes, so they still work.',
    reteach: 'Look at a toy through tracing paper (fog): you can’t see it well. Then clap near a wall: the echo still comes back.',
  },
  'bump-is-fine-for-people': {
    idea: 'Stopping when you feel a bump is safe enough near people.',
    correction: 'To never touch a friend the robot must stop BEFORE contact, using the distance sensor (“until something is close”).',
    child: 'With people, we stop before we touch. Distance Eyes help the robot stop in time.',
    reteach: 'Two ways to stop at a friend: hand out until you touch, or stop when the friend says "close!". Ask which one is kinder.',
  },
  'sensor-rule-is-counting': {
    idea: '“Until close” is really a counted number of hops that happened to fit.',
    correction: '“Until close” checks the sensor before every hop and stops wherever the wall really is, so it works on ramps of any length.',
    child: '“Until close” keeps checking: close yet? close yet? It stops when the wall is really there.',
    reteach: 'Child-robot walks toward a wall saying "close yet?" before each step; a partner says "yes" when it is near. Move the wall and repeat: it still works.',
  },
  // ── Safety and people ─────────────────────────────────────────────────────
  'robot-responsible-for-safety': {
    idea: 'A robot keeps itself safe on its own.',
    correction: 'The people who design, build and program a robot are responsible for making it safe.',
    child: 'People make robots safe. The robot is careful only because people programmed it to be.',
    reteach: 'Ask the class to list three safety rules for our robot (slow near people, wait, light on in the dark). Then ask: who wrote these rules? We did.',
  },
  'check-once-enough': {
    idea: 'Checking once at the start is enough.',
    correction: 'Things keep moving. Our robot checks before every hop; real robots check many times every second.',
    child: 'People move around, so the robot checks again and again, before every hop.',
    reteach: 'Stop, look, wait: a child-robot looks once and walks with eyes closed while a "friend" steps in. Then the robot looks before every step. Compare.',
  },
  // ── Careers and programs ──────────────────────────────────────────────────
  'only-scientists': {
    idea: 'Only grown-up scientists work with robots.',
    correction: 'Many kinds of people do: designers, builders, programmers, testers, technicians, farmers, doctors — and children who learn.',
    child: 'Anyone who learns can work with robots: builders, fixers, testers, designers — maybe you!',
    reteach: 'Robot jobs charades: act out a robot job (fixing, testing, designing, farming with robots) and the class guesses.',
  },
  'longer-program-better': {
    idea: 'A longer program is a better program.',
    correction: 'A clear program that works and keeps people safe is best. Loops make it shorter and easier to check.',
    child: 'Short and clear is great! A Repeat block does the same job with fewer blocks.',
    reteach: 'Write "clap clap clap clap" as 4 cards, then as Repeat 4 { clap }. Ask which is quicker to read and to fix.',
  },
} as const satisfies Record<string, MisconceptionText>

export type L1MisconceptionId = keyof typeof L1_MISCONCEPTIONS
