// lib/kids/maths/concepts.ts
// Robot Maths: "the maths inside" (roadmap #86). Six robotics concepts, each
// shown with the maths it really uses at every band:
//   Explorers  (5–7)   counting steps, left and right, more and less, adding
//   Builders   (8–10)  coordinates, angles and headings, times tables
//   Inventors  (11–13) ratios, percentages, reading graphs
//   Engineers  (14–17) vectors, trigonometry for a 2-joint arm, averaging noisy sensors
//
// Every band of every concept names ONE Skill Galaxy activity (content/maths.ts)
// so the maths is something a child does, not just reads. The worked examples
// are checked numerically by lib/kids/maths/verify.ts (CI).
//
// Pure data. Safe on server and client (no activity params imported here).

import type { BandId } from '../bands'

export type MathsConceptId = 'moving-and-turning' | 'maps-and-coordinates' | 'gears-and-ratios' | 'sensors-and-graphs' | 'robot-arms' | 'power-and-time'

/** The small interactive on each concept page (components/kids/maths/MathsWidgetClient.tsx). */
export type MathsWidget = 'heading' | 'coords' | 'gears' | 'noise' | 'arm' | 'battery'

export interface WorkedExample {
  /** The question, in the band's words. */
  question: string
  /** The working, one line per step. */
  steps: string[]
  /** The answer as a short phrase. */
  answer: string
  /**
   * The answer as a number and the sum that must produce it, so verify.ts can
   * prove the worked example is right (a wrong worked example teaches a wrong idea).
   */
  check: { value: number; compute: () => number; tolerance?: number }
}

export interface BandMaths {
  /** The maths topic, short: "Counting steps and left/right". */
  topic: string
  /** Two to four sentences at the band's reading level. */
  explain: string
  example: WorkedExample
  /** The matching Skill Galaxy activity (lib/kids/activities/content/maths.ts). */
  activity: string
  /** Something to try away from the screen. */
  offScreen: string
}

export interface MathsConcept {
  id: MathsConceptId
  title: string
  emoji: string
  /** One line a child understands. */
  hook: string
  /** For the page description and the hub card. */
  summary: string
  /** Where robots use it, two or three sentences. */
  robots: string
  widget: MathsWidget
  bands: Record<BandId, BandMaths>
  /** Internal links (games, labs, worlds) where this maths is at work. */
  seeAlso: { href: string; label: string }[]
}

export const MATHS_BAND_TOPICS: Record<BandId, string> = {
  explorers: 'Counting steps, left and right, more and less',
  builders: 'Coordinates, angles and headings, times tables',
  inventors: 'Ratios, percentages and reading graphs',
  engineers: 'Vectors, trigonometry and averaging noisy data',
}

const deg = (d: number) => (d * Math.PI) / 180

export const MATHS_CONCEPTS: MathsConcept[] = [
  {
    id: 'moving-and-turning',
    title: 'Moving and turning',
    emoji: '🧭',
    hook: 'How does a robot know how far to go and which way to face?',
    summary: 'The maths a robot uses to drive and turn: counting steps, left and right, compass headings in degrees, speed as a ratio, and vectors.',
    robots:
      'Every robot that drives keeps track of two things: how far it has gone and which way it is facing. Mars rovers, robot vacuums and warehouse robots all count wheel turns to measure distance and use angles to measure turning. When the numbers drift, the robot gets lost, so engineers check the maths with other sensors too.',
    widget: 'heading',
    bands: {
      explorers: {
        topic: 'Counting steps and left or right',
        explain:
          'A robot does not guess. You tell it how many steps to take and which way to turn. Count the squares to the goal, then say left or right. Hold up your hands: your left hand makes an L shape with its thumb and finger.',
        example: {
          question: 'The rover is 3 squares from the rock, then 2 squares to the left. How many steps forward does it take in total?',
          steps: ['First it goes 3 steps forward.', 'It turns left. A turn is not a step.', 'Then it goes 2 more steps forward.', '3 and 2 more make 5.'],
          answer: '5 steps forward and 1 turn',
          check: { value: 5, compute: () => 3 + 2 },
        },
        activity: 'maths-turns-ex',
        offScreen: 'Be the robot: a grown-up says “3 steps, turn left, 2 steps” and you follow it exactly. Then swap.',
      },
      builders: {
        topic: 'Angles and compass headings',
        explain:
          'Robots measure turning in degrees. A full turn is 360 degrees and a quarter turn is 90. A heading is the direction a robot faces, measured clockwise from north: 0 is north, 90 east, 180 south and 270 west. Each turn adds or takes away degrees.',
        example: {
          question: 'A robot faces east (90°) and turns right 90° twice. What heading does it face now?',
          steps: ['Start at 90°.', 'Turn right 90°: 90 + 90 = 180°, south.', 'Turn right 90° again: 180 + 90 = 270°.', '270° is west.'],
          answer: '270°, facing west',
          check: { value: 270, compute: () => 90 + 90 + 90 },
        },
        activity: 'maths-turns-bu',
        offScreen: 'Stand facing a window and call it 0°. Turn a quarter turn right and say the new heading. Keep going until you are back at 360°, which is 0° again.',
      },
      inventors: {
        topic: 'Speed as a ratio of distance to time',
        explain:
          'Speed is a ratio: distance divided by time. A robot wheel moves the robot one circumference each turn, and circumference is π × diameter. So speed = π × diameter × turns per second. Change the wheel size or the motor speed and the ratio changes with it.',
        example: {
          question: 'A 10 cm wheel turns once every second. How fast does the robot drive?',
          steps: ['Circumference = π × 10 cm ≈ 31.4 cm.', 'One turn per second means 31.4 cm every second.', 'Speed ≈ 31.4 cm/s. In 10 seconds that is about 314 cm.'],
          answer: 'about 31.4 cm per second',
          check: { value: 31.4, compute: () => Math.PI * 10, tolerance: 0.05 },
        },
        activity: 'maths-turns-in',
        offScreen: 'Mark a spot on a bicycle tyre, roll it one full turn and measure the distance. Compare it with π × the wheel’s diameter.',
      },
      engineers: {
        topic: 'Vectors and components',
        explain:
          'A move has a size and a direction: a vector. Robots split each vector into components so they can add moves together: east = length × cos θ and north = length × sin θ, with θ measured from east. Adding thousands of small vectors from wheel encoders is called odometry, and its small errors grow, which is why robots also need GPS, cameras or lidar.',
        example: {
          question: 'A robot drives 6 m at 60° from east. How far north and how far east does it end up?',
          steps: ['North = 6 × sin 60° = 6 × 0.866 ≈ 5.2 m.', 'East = 6 × cos 60° = 6 × 0.5 = 3 m.', 'Check with Pythagoras: √(3² + 5.2²) ≈ 6 m.'],
          answer: '≈ 5.2 m north and 3 m east',
          check: { value: 5.2, compute: () => 6 * Math.sin(deg(60)), tolerance: 0.05 },
        },
        activity: 'maths-turns-en',
        offScreen: 'Walk 5 steps in one direction, then 5 at right angles. Estimate the straight-line distance back with Pythagoras, then pace it.',
      },
    },
    seeAlso: [
      { href: '/kids/play/mars-rover', label: 'Mars Rover game' },
      { href: '/kids/galaxy/motion', label: 'Motion track in the Skill Galaxy' },
      { href: '/kids/code-lab', label: 'Code Lab' },
    ],
  },
  {
    id: 'maps-and-coordinates',
    title: 'Maps and coordinates',
    emoji: '🗺️',
    hook: 'How does a robot know where it is on a map?',
    summary: 'The maths inside robot maps: counting squares, x and y coordinates, percentages of a map covered, and straight-line distance with Pythagoras.',
    robots:
      'Robots store maps as grids of squares, and every square has an address: its coordinates. Warehouse robots drive on floors marked with a grid of codes, robot vacuums colour in the squares they have cleaned, and route planners measure distances between squares to find the shortest path.',
    widget: 'coords',
    bands: {
      explorers: {
        topic: 'Counting squares on a map',
        explain:
          'A robot map is made of squares, like a chessboard. To get somewhere, the robot counts the squares. Count across, then count up. Picking things up on the way means visiting more squares.',
        example: {
          question: 'The rover must go 4 squares across and 2 squares up. How many squares does it drive?',
          steps: ['4 squares across.', '2 squares up.', '4 and 2 more make 6 squares.'],
          answer: '6 squares',
          check: { value: 6, compute: () => 4 + 2 },
        },
        activity: 'maths-maps-ex',
        offScreen: 'Make a map with floor tiles or a towel grid. Hide a toy and give directions by counting squares.',
      },
      builders: {
        topic: 'Coordinates: x across, y up',
        explain:
          'Every square on a map has two numbers called coordinates. The first number, x, says how far across. The second, y, says how far up. Moving across changes x, moving up changes y. Robots write their position as (x, y).',
        example: {
          question: 'A robot is at (2, 1). It drives 3 squares across and 4 squares up. Where is it now?',
          steps: ['Across changes x: 2 + 3 = 5.', 'Up changes y: 1 + 4 = 5.', 'The new position is (5, 5).'],
          answer: '(5, 5)',
          check: { value: 5, compute: () => 2 + 3 },
        },
        activity: 'maths-maps-bu',
        offScreen: 'Draw a 6 × 6 grid, number the edges and play “robot battleships”: guess the hidden robot’s coordinates.',
      },
      inventors: {
        topic: 'Percentages of a map covered',
        explain:
          'A percentage means “out of 100”. To find how much of a map a robot has covered: covered squares × 100 ÷ total squares. Robots use percentages for coverage, battery and confidence, because percentages make different-sized things easy to compare.',
        example: {
          question: 'A cleaning robot has cleaned 40 of 50 squares. What percentage is done?',
          steps: ['Percentage = 40 × 100 ÷ 50.', '40 × 100 = 4000.', '4000 ÷ 50 = 80.'],
          answer: '80 %',
          check: { value: 80, compute: () => (40 * 100) / 50 },
        },
        activity: 'maths-maps-in',
        offScreen: 'Colour squares on squared paper as you “clean” a room. After each minute, work out the percentage done.',
      },
      engineers: {
        topic: 'Distance between points with Pythagoras',
        explain:
          'The straight-line distance between (x₁, y₁) and (x₂, y₂) is √((x₂ − x₁)² + (y₂ − y₁)²). Route planners such as A* use this distance as a lower bound on how far is left, because no real route can be shorter than a straight line. That lower bound is what lets A* find the shortest path quickly.',
        example: {
          question: 'A rover is at (1, 2) m and its charger at (7, 10) m. What is the straight-line distance?',
          steps: ['Δx = 7 − 1 = 6, Δy = 10 − 2 = 8.', 'd² = 6² + 8² = 36 + 64 = 100.', 'd = √100 = 10 m.'],
          answer: '10 m',
          check: { value: 10, compute: () => Math.hypot(7 - 1, 10 - 2) },
        },
        activity: 'maths-maps-en',
        offScreen: 'Pick two places on a town map with a grid. Measure the straight-line distance with Pythagoras, then compare it with the walking route.',
      },
    },
    seeAlso: [
      { href: '/kids/play/maze-mapper', label: 'Maze Mapper game' },
      { href: '/kids/galaxy/ai', label: 'AI & Maps track in the Skill Galaxy' },
      { href: '/kids/worlds/city', label: 'Robot City world' },
    ],
  },
  {
    id: 'gears-and-ratios',
    title: 'Gears and ratios',
    emoji: '⚙️',
    hook: 'How does a small motor lift something heavy?',
    summary: 'The maths inside gears: counting teeth, times tables, gear ratios that multiply, and the torque and speed trade-off with real losses.',
    robots:
      'Motors spin fast but weakly. Gears trade that speed for strength. Robot arms, rovers, cranes and grippers all have gearboxes inside, and the maths of a gearbox is ratios: the teeth on one gear compared with the teeth on the next.',
    widget: 'gears',
    bands: {
      explorers: {
        topic: 'Counting teeth',
        explain:
          'Gears are wheels with teeth. When a big gear turns once, its teeth push a small gear round more than once. Count the teeth to find out how many times. More teeth pushing fewer teeth means faster.',
        example: {
          question: 'A gear with 20 teeth turns a gear with 10 teeth. When the big gear turns once, how many times does the small gear turn?',
          steps: ['The big gear pushes 20 teeth past.', 'The small gear has 10 teeth.', '10 teeth is one turn, 20 teeth is two turns.'],
          answer: '2 times round',
          check: { value: 2, compute: () => 20 / 10 },
        },
        activity: 'maths-gears-ex',
        offScreen: 'Find gears in a toy, a whisk or a bicycle. Count the teeth on two gears that touch, and turn the big one slowly.',
      },
      builders: {
        topic: 'Times tables in gears',
        explain:
          'Divide the teeth on the driving gear by the teeth on the gear it drives. That number is how many times faster the second gear turns. 40 teeth driving 10 teeth is 40 ÷ 10 = 4 times faster. Swap them round and it is 4 times slower, but 4 times stronger.',
        example: {
          question: 'A motor turns 20 times a minute. A 40-tooth gear on it drives a 10-tooth gear on the wheel. How fast does the wheel turn?',
          steps: ['40 ÷ 10 = 4, so the wheel turns 4 times faster.', '20 × 4 = 80.', 'The wheel turns 80 times a minute.'],
          answer: '80 turns a minute',
          check: { value: 80, compute: () => 20 * (40 / 10) },
        },
        activity: 'maths-gears-bu',
        offScreen: 'Make paper gears with 8 and 16 bumps on two jar lids. Mark both and count how many turns the small one makes for one of the big one.',
      },
      inventors: {
        topic: 'Ratios that multiply',
        explain:
          'A gear ratio like 6 : 1 means 6 turns in for 1 turn out. In a compound gearbox two gears share an axle, so ratios multiply: a 6 : 1 stage followed by a 4 : 1 stage gives 24 : 1. Breaking a big ratio into factors is how real gearboxes stay small.',
        example: {
          question: 'A 600 rpm motor drives a 6 : 1 stage then a 4 : 1 stage. How fast is the output?',
          steps: ['Total ratio = 6 × 4 = 24 : 1.', 'Output = 600 ÷ 24.', 'Output = 25 rpm.'],
          answer: '25 rpm',
          check: { value: 25, compute: () => 600 / (6 * 4) },
        },
        activity: 'maths-gears-in',
        offScreen: 'Find the factors of 24, 36 and 100. Which pairs could be two gear stages made from 10- to 60-tooth gears?',
      },
      engineers: {
        topic: 'Torque, speed and efficiency',
        explain:
          'Power = torque × angular speed, and a gearbox cannot create power. Slow the output by a ratio N and torque rises by N, minus losses: each mesh keeps about 95–98 % of the torque. So output torque = input torque × N × ηᵏ for k meshes. Engineers size the ratio for the torque they need, then check the speed still meets the spec.',
        example: {
          question: 'A 2 N·cm motor drives a 20 : 1 two-stage gearbox at 95 % per mesh. What torque comes out?',
          steps: ['Ideal torque = 2 × 20 = 40 N·cm.', 'Two meshes: 0.95² = 0.9025.', '40 × 0.9025 ≈ 36.1 N·cm.'],
          answer: '≈ 36.1 N·cm',
          check: { value: 36.1, compute: () => 2 * 20 * 0.95 ** 2, tolerance: 0.05 },
        },
        activity: 'maths-gears-en',
        offScreen: 'Look up a hobby gearmotor’s datasheet. Check that its stall torque is roughly the bare motor’s torque times the gear ratio, less losses.',
      },
    },
    seeAlso: [
      { href: '/kids/play/arm-factory', label: 'Arm Factory game' },
      { href: '/kids/galaxy/mechanics', label: 'Mechanics track in the Skill Galaxy' },
      { href: '/kids/workshop', label: 'Workshop' },
    ],
  },
  {
    id: 'sensors-and-graphs',
    title: 'Sensors and graphs',
    emoji: '📈',
    hook: 'How does a robot read the world as numbers?',
    summary: 'The maths inside robot sensors: more and less, thresholds on a number line, reading graphs and percentages, and averaging noisy readings.',
    robots:
      'A sensor turns the world into numbers: light, distance, temperature, battery level. Robots compare those numbers with a threshold to decide what to do, draw them as graphs so people can see what happened, and average them because real sensors are noisy.',
    widget: 'noise',
    bands: {
      explorers: {
        topic: 'More and less',
        explain:
          'A sensor gives the robot a number. More light makes a bigger number, less light a smaller number. When the number jumps up or down, something changed. Robots watch for those changes.',
        example: {
          question: 'Spark’s light sensor said 20, then someone switched on the lamp and it said 80. How much bigger did the number get?',
          steps: ['Before: 20.', 'After: 80.', 'Count on from 20 to 80 in tens: 30, 40, 50, 60, 70, 80. That is 6 tens.'],
          answer: '60 more',
          check: { value: 60, compute: () => 80 - 20 },
        },
        activity: 'maths-graphs-ex',
        offScreen: 'Close and open a curtain. Is the room brighter or darker? Draw a line going up or down for each change.',
      },
      builders: {
        topic: 'Thresholds on a number line',
        explain:
          'A threshold is a line on a number line where the robot changes its mind. Readings above the line mean one thing, readings below mean another. Putting the threshold halfway between the two usual readings gives the most room for wobbly numbers.',
        example: {
          question: 'A line-follower reads about 20 on black and about 80 on white. Where should the threshold go?',
          steps: ['The gap is from 20 to 80.', 'Halfway: (20 + 80) ÷ 2.', '100 ÷ 2 = 50.'],
          answer: '50',
          check: { value: 50, compute: () => (20 + 80) / 2 },
        },
        activity: 'maths-graphs-bu',
        offScreen: 'Draw a number line from 0 to 100. Mark “black” at 20 and “white” at 80, and choose your threshold. What if black were 40?',
      },
      inventors: {
        topic: 'Reading graphs and percentages',
        explain:
          'A graph shows readings over time: time goes across, the reading goes up. To read it, go across to the time, up to the line, then over to the axis. Battery graphs are in percent, so 75 % means 75 out of every 100 parts of the battery are left.',
        example: {
          question: 'A 2000 mAh battery shows 75 %. How many mAh are left?',
          steps: ['75 % means 75 out of 100.', '2000 × 75 ÷ 100.', '= 1500 mAh.'],
          answer: '1500 mAh',
          check: { value: 1500, compute: () => (2000 * 75) / 100 },
        },
        activity: 'maths-graphs-in',
        offScreen: 'Check a phone or tablet battery every 15 minutes for an hour and plot it. Where is the line steepest?',
      },
      engineers: {
        topic: 'Averaging noisy sensors',
        explain:
          'Real sensors are noisy: each reading = true value + random error. Averaging N readings shrinks random noise by about √N, so 16 readings are about 4 times steadier than one. A moving average adds lag, and a single spike drags a mean, so robots often use a median or a filter that rejects outliers.',
        example: {
          question: 'Five distance readings are 118, 123, 119, 121 and 119 cm. What is the mean?',
          steps: ['Sum = 118 + 123 + 119 + 121 + 119 = 600.', 'Mean = 600 ÷ 5.', '= 120 cm.'],
          answer: '120 cm',
          check: { value: 120, compute: () => (118 + 123 + 119 + 121 + 119) / 5 },
        },
        activity: 'maths-graphs-en',
        offScreen: 'Time a 10 m walk five times with a stopwatch. Compare one time with the mean of five: which would you trust?',
      },
    },
    seeAlso: [
      { href: '/kids/play/drone-hover', label: 'Drone Hover game' },
      { href: '/kids/galaxy/sensors', label: 'Sensors track in the Skill Galaxy' },
      { href: '/kids/ai', label: 'How Robots Think' },
    ],
  },
  {
    id: 'robot-arms',
    title: 'Robot arms',
    emoji: '🦾',
    hook: 'How does a robot arm know where its hand is?',
    summary: 'The maths inside robot arms: adding lengths, joint angles in degrees, reach and workspace, and trigonometry for a 2-joint arm (forward and inverse kinematics).',
    robots:
      'A robot arm is a chain of straight parts joined by motors. To put its gripper in the right place, the controller works out where the hand is from the joint angles (forward kinematics), or which angles reach a target (inverse kinematics). Factory arms, surgical robots and space-station arms all do these sums many times a second.',
    widget: 'arm',
    bands: {
      explorers: {
        topic: 'Adding lengths',
        explain:
          'A robot arm is made of parts joined end to end. Stretched out straight, it reaches as far as all its parts added together. Longer parts reach further.',
        example: {
          question: 'An arm has a 2-block part and a 3-block part. How long is it stretched out?',
          steps: ['The first part is 2 blocks.', 'The second part is 3 blocks.', '2 and 3 more make 5.'],
          answer: '5 blocks',
          check: { value: 5, compute: () => 2 + 3 },
        },
        activity: 'maths-arms-ex',
        offScreen: 'Build an arm from building bricks or pencils. How far can it reach? Add one more part and measure again.',
      },
      builders: {
        topic: 'Joint angles in degrees',
        explain:
          'Each joint of a robot arm turns by an angle. Flat is 0°, straight up is 90° (a right angle) and flat the other way is 180°. Robot arms often move in small steps, like 15° at a time, and the steps add up.',
        example: {
          question: 'A joint turns 15° per button press. How many presses take it from flat to straight up?',
          steps: ['Straight up is 90°.', '90 ÷ 15 = 6.', 'Check: 6 × 15 = 90.'],
          answer: '6 presses',
          check: { value: 6, compute: () => 90 / 15 },
        },
        activity: 'maths-arms-bu',
        offScreen: 'Use your elbow as a joint. Hold your forearm flat (0°), then raise it in small steps to straight up (90°).',
      },
      inventors: {
        topic: 'Reach and workspace',
        explain:
          'A two-part arm can reach anything in a ring around its shoulder. The outside of the ring is both parts added (L1 + L2); the inside is the difference (L1 − L2), when the arm folds back. Choosing the lengths is a ratio decision: equal parts can reach right back to the shoulder.',
        example: {
          question: 'An arm has a 30 cm upper arm and a 20 cm forearm. What ring can it reach?',
          steps: ['Furthest: 30 + 20 = 50 cm.', 'Closest: 30 − 20 = 10 cm.', 'The workspace is a ring from 10 cm to 50 cm.'],
          answer: '10 cm to 50 cm',
          check: { value: 10, compute: () => 30 - 20 },
        },
        activity: 'maths-arms-in',
        offScreen: 'Pin two card strips together with a split pin and draw round the tip as it moves. You have drawn its workspace.',
      },
      engineers: {
        topic: 'Trigonometry for a 2-joint arm',
        explain:
          'Forward kinematics: x = L1 cos θ1 + L2 cos(θ1 + θ2) and y = L1 sin θ1 + L2 sin(θ1 + θ2). Inverse kinematics runs it backwards: the law of cosines gives the elbow angle, cos θ2 = (x² + y² − L1² − L2²) ÷ (2·L1·L2), and usually there are two answers, elbow up or elbow down.',
        example: {
          question: 'L1 = 40 cm at θ1 = 30°, L2 = 30 cm at θ2 = 60°. How high is the gripper?',
          steps: ['y = 40 sin 30° + 30 sin(30° + 60°).', '= 40 × 0.5 + 30 × 1.', '= 20 + 30 = 50 cm (x = 40 cos 30° ≈ 34.6 cm).'],
          answer: '50 cm high, ≈ 34.6 cm out',
          check: { value: 50, compute: () => 40 * Math.sin(deg(30)) + 30 * Math.sin(deg(90)), tolerance: 0.01 },
        },
        activity: 'maths-arms-en',
        offScreen: 'Write a 10-line program that prints x and y for θ1, θ2 from 0° to 90° in 15° steps, and plot the points.',
      },
    },
    seeAlso: [
      { href: '/kids/play/arm-factory', label: 'Arm Factory game' },
      { href: '/kids/play/orbit-repair', label: 'Orbit Repair Crew game' },
      { href: '/kids/worlds/hospital', label: 'Robot Hospital world' },
    ],
  },
  {
    id: 'power-and-time',
    title: 'Power and time',
    emoji: '🔋',
    hook: 'How long can a robot keep going?',
    summary: 'The maths inside robot batteries: counting down, multiplying minutes, percentages and hours left, and power and energy (P = V × I, E = P × t).',
    robots:
      'Every mobile robot carries its energy with it. Robot vacuums, delivery robots, drones and rovers all need to know how much battery is left and how long it will last, so they can finish the job or get back to the charger in time.',
    widget: 'battery',
    bands: {
      explorers: {
        topic: 'Counting down',
        explain:
          'A battery is like a jar of energy. Every job the robot does takes some out. Count down the bars to see how many are left. When there are only a few, it is time to charge.',
        example: {
          question: 'Spark has 5 battery bars and each trip uses 1 bar. After 3 trips, how many are left?',
          steps: ['Start with 5.', 'Count down 3: 4, 3, 2.', '2 bars are left.'],
          answer: '2 bars',
          check: { value: 2, compute: () => 5 - 3 },
        },
        activity: 'maths-power-ex',
        offScreen: 'Line up 5 blocks as battery bars. Take one away for every lap of the room. When do you need to charge?',
      },
      builders: {
        topic: 'Multiplying to plan a job',
        explain:
          'When every trip takes the same time, multiply: trips × minutes per trip. Then compare the total with how long the battery lasts. If the total is smaller, the robot can finish the job.',
        example: {
          question: 'A delivery robot makes 6 trips of 4 minutes. Its battery lasts 30 minutes. Is it enough?',
          steps: ['6 × 4 = 24 minutes.', '24 is less than 30.', 'Yes, with 30 − 24 = 6 minutes spare.'],
          answer: 'Yes, 6 minutes spare',
          check: { value: 6, compute: () => 30 - 6 * 4 },
        },
        activity: 'maths-power-bu',
        offScreen: 'Time how long it takes to tidy one shelf, then multiply to plan the whole room.',
      },
      inventors: {
        topic: 'Percentages and time left',
        explain:
          'Battery capacity is measured in milliamp-hours (mAh). Percentage left = left × 100 ÷ capacity. Time left = mAh left ÷ the current the robot draws, in mA. That is how a phone shows both a percentage and a time.',
        example: {
          question: 'A 2000 mAh battery has 1500 mAh left and the robot draws 250 mA. How long can it run?',
          steps: ['Percentage left = 1500 × 100 ÷ 2000 = 75 %.', 'Time = 1500 ÷ 250.', '= 6 hours.'],
          answer: '75 %, about 6 hours',
          check: { value: 6, compute: () => 1500 / 250 },
        },
        activity: 'maths-power-in',
        offScreen: 'Find the mAh number on a power bank or a phone battery label. How long would it run a 500 mA robot?',
      },
      engineers: {
        topic: 'Power and energy: P = V × I, E = P × t',
        explain:
          'Electrical power P = V × I (watts), and energy E = P × t (watt-hours). Engineers size batteries in watt-hours, then add a margin, typically 20–30 %, because a battery should not be run flat and its voltage sags under load.',
        example: {
          question: 'A 12 V robot draws 1.5 A for a 2-hour mission. How much energy does it use?',
          steps: ['P = 12 × 1.5 = 18 W.', 'E = 18 × 2 = 36 Wh.', 'With a 25 % margin: 36 × 1.25 = 45 Wh battery.'],
          answer: '36 Wh (≈ 45 Wh with a margin)',
          check: { value: 36, compute: () => 12 * 1.5 * 2 },
        },
        activity: 'maths-power-en',
        offScreen: 'Read the watt-hours on a laptop charger or power bank. How many minutes would it run an 18 W robot?',
      },
    },
    seeAlso: [
      { href: '/kids/lab/power', label: 'Power Lab' },
      { href: '/kids/galaxy/electronics', label: 'Electronics track in the Skill Galaxy' },
      { href: '/kids/play/circuit-city', label: 'Circuit City game' },
    ],
  },
]

const BY_ID = new Map(MATHS_CONCEPTS.map((c) => [c.id, c]))

export function getMathsConcept(id: string): MathsConcept | undefined {
  return BY_ID.get(id as MathsConceptId)
}

/** Every activity id named by a concept (for verify and the Galaxy cross-links). */
export function mathsActivityIds(): string[] {
  return MATHS_CONCEPTS.flatMap((c) => Object.values(c.bands).map((b) => b.activity))
}
