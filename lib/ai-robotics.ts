// AI + Robotics hub content. Plain English, timeless explanations only:
// no model names, prices or dates that go stale. Each topic follows the same
// shape so readers learn what it is, what it lets you do, and what goes wrong without it.
export interface AiTopic {
  slug: string
  title: string
  level: 'Beginner' | 'Intermediate'
  minutes: number
  short: string            // one line for cards and meta description
  what: string[]           // plain-English explanation, 2-3 short paragraphs
  example: string          // a real, concrete use
  withIt: string           // what you can do with this idea
  without: string          // what goes wrong without it
  tryIt: string            // a small activity
  faq: { q: string; a: string }[]
  related: { label: string; href: string }[]
}

export const AI_TOPICS: AiTopic[] = [
  {
    slug: 'what-is-ai-in-robotics', title: 'What is AI in robotics?', level: 'Beginner', minutes: 5,
    short: 'A robot is a machine that acts. AI is the part that decides what to do. Here is how they fit together.',
    what: [
      'A robot has three jobs: sense the world, decide what to do, and act. Motors and wheels do the acting. Cameras and sensors do the sensing. AI is one way to do the deciding.',
      'Not every robot needs AI. A factory arm that repeats the same weld a thousand times is just following a fixed script. AI matters when the world changes and the robot has to cope: a box in a new place, a person walking by, a floor it has never seen.',
    ],
    example: 'A warehouse robot that follows a painted line needs no AI. A warehouse robot that finds a parcel on a messy shelf and picks it up needs AI to recognise the parcel.',
    withIt: 'You can build robots that handle messy, changing places instead of only perfect, repeated tasks.',
    without: 'The robot works only when everything is exactly where you planned. Move one box by 5 cm and it fails.',
    tryIt: 'Pick any machine at home (a washing machine, a fan, a robot vacuum). For each, write whether it follows a fixed script or adapts to what it senses.',
    faq: [
      { q: 'Is every robot powered by AI?', a: 'No. Many robots follow fixed rules and work very well. AI is added when the robot must handle surprises.' },
      { q: 'Is AI the robot\'s brain?', a: 'It is one part of the brain. Simple rules, control code and safety checks also run inside the same robot.' },
    ],
    related: [{ label: 'Sense, think, act', href: '/atlas' }, { label: 'Robotics Foundations course', href: '/courses/robotics-foundations' }],
  },
  {
    slug: 'machine-learning-for-robots', title: 'Machine learning for robots', level: 'Beginner', minutes: 6,
    short: 'Instead of writing every rule, you show the robot examples and let it find the pattern.',
    what: [
      'Normal code is rules you write: if the sensor reads below 10 cm, stop. Machine learning flips this. You give the computer many examples, and it works out the rules itself.',
      'Think of teaching a child to spot a cat. You do not list the rules for whiskers and ears. You show many cats and not-cats until they get it. A robot learns the same way, just with numbers.',
    ],
    example: 'To sort ripe tomatoes from green ones, you show a camera thousands of labelled photos. It learns what ripe looks like, even for tomatoes it never saw.',
    withIt: 'You can solve problems that are too messy to describe with rules, like telling ripe fruit from unripe in different light.',
    without: 'You would need to write rules for every lighting, angle and shade. That is impossible, and the robot breaks on the first case you missed.',
    tryIt: 'Take 20 photos of two objects with your phone and notice how few examples already separate them.',
    faq: [
      { q: 'How much data does a robot need to learn?', a: 'It depends. Simple tasks may need a few hundred examples. Hard ones can need millions. More varied examples matter more than a huge pile of similar ones.' },
      { q: 'Can a learned model be wrong?', a: 'Yes. It can be confidently wrong on things unlike its examples, so safe robots keep simple safety rules on top.' },
    ],
    related: [{ label: 'Robot Intelligence course', href: '/courses/robot-intelligence' }, { label: 'How robots learn (guide)', href: '/blog/how-robots-learn-machine-learning-and-reinforcement-learning' }],
  },
  {
    slug: 'computer-vision-for-robots', title: 'Computer vision: how robots see', level: 'Beginner', minutes: 6,
    short: 'A camera gives a robot a grid of numbers. Computer vision turns those numbers into "that is a cup".',
    what: [
      'A camera does not see a cup. It records a grid of tiny coloured dots, each one just a number. Computer vision is the set of methods that turns that grid into meaning: edges, shapes, objects, distances.',
      'Modern robots mostly use learned models for this. They find objects in the picture, draw a box around each, and name it. Some also work out how far away things are, using two cameras or a depth sensor.',
    ],
    example: 'A fruit-picking robot finds the ripe strawberries in a photo, works out where each one is in 3D, and moves its gripper to that spot.',
    withIt: 'Your robot can find, count, follow and pick up things without being told exactly where they are.',
    without: 'The robot is blind to anything that is not in a fixed, known place. A shifted tray means a missed pick.',
    tryIt: 'Hold your phone camera on a table of objects. Imagine writing the numbers a robot gets. Which would be hardest to tell apart, and why?',
    faq: [
      { q: 'Do robots need expensive cameras?', a: 'Often not. A cheap camera with good lighting beats an expensive one in poor light.' },
      { q: 'Why does vision fail in bad light?', a: 'Dim or glaring light changes the numbers the camera records, so objects look different from what the model learned.' },
    ],
    related: [{ label: 'Robot Vision course', href: '/courses/robot-vision' }, { label: 'Computer vision in the Atlas', href: '/atlas' }],
  },
  {
    slug: 'reinforcement-learning-for-robots', title: 'Reinforcement learning: learning by trying', level: 'Intermediate', minutes: 7,
    short: 'The robot tries things, gets a score, and slowly learns which actions earn the most.',
    what: [
      'In reinforcement learning, nobody tells the robot the right answer. It tries an action, the world responds, and a reward score says whether that was good. Over many tries it learns to pick actions that earn more reward.',
      'It is how you teach a dog tricks with treats, except the robot can try millions of times. That is why most of the practice happens in a simulator, where mistakes are free and fast.',
    ],
    example: 'A walking robot is rewarded for moving forward and punished for falling. After millions of simulated tries it discovers a walking style no engineer wrote by hand.',
    withIt: 'You can get skills that are too hard to program by hand, like balancing, walking or juggling.',
    without: 'You must hand-code every motion. For complex bodies this takes years and still looks stiff.',
    tryIt: 'Play a simple game and write down your own "reward" for each move. You just did what the algorithm does.',
    faq: [
      { q: 'Why train in simulation?', a: 'A real robot can break and is slow. A simulator runs thousands of practice attempts in minutes at no risk.' },
      { q: 'Does the skill work on a real robot?', a: 'Often with extra work. The gap between simulation and reality is a well-known problem called sim-to-real.' },
    ],
    related: [{ label: 'Robot Intelligence course', href: '/courses/robot-intelligence' }, { label: 'How robots learn (guide)', href: '/blog/how-robots-learn-machine-learning-and-reinforcement-learning' }],
  },
  {
    slug: 'large-language-models-and-robots', title: 'Chatbot-style AI and robots', level: 'Beginner', minutes: 6,
    short: 'Large language models let you talk to a robot in plain words. They are good at plans, not at moving motors.',
    what: [
      'A large language model (LLM) is the kind of AI behind chat assistants. It is very good at language: understanding a request and turning it into steps.',
      'In a robot it usually plays the planner. You say "tidy the desk", it breaks that into steps, and separate, specialised software handles seeing, moving and safety. The LLM does not drive the motors directly.',
    ],
    example: 'You say "bring me the red mug". The LLM turns that into: find the red mug, go to it, grasp it, bring it here. Vision and control code do each step.',
    withIt: 'People can instruct robots in ordinary language, with no programming.',
    without: 'Every new task needs a programmer to write a new script. Non-experts cannot use the robot.',
    tryIt: 'Write a plain-English instruction for a robot, then break it into 5 tiny steps. That is the planner\'s job.',
    faq: [
      { q: 'Can an LLM control a robot by itself?', a: 'Not safely. LLMs can make mistakes and invent things, so real robots keep fast, simple safety systems separate from the language model.' },
      { q: 'Does the robot understand like a person?', a: 'No. It predicts useful responses. Treat its plans as suggestions to be checked.' },
    ],
    related: [{ label: 'LLMs and robots (guide)', href: '/atlas/concept/large-language-model-robotics' }, { label: 'Ask the R2 Co-pilot', href: '/copilot' }],
  },
  {
    slug: 'sensor-fusion', title: 'Sensor fusion: trusting more than one sensor', level: 'Intermediate', minutes: 6,
    short: 'Every sensor is wrong in its own way. Combining them gives a better answer than any single one.',
    what: [
      'No sensor is perfect. A wheel counter drifts. A GPS jumps near buildings. A camera fails in the dark. Sensor fusion combines several so their weaknesses cancel out.',
      'The idea is a weighted opinion. When one sensor is reliable right now, trust it more. When it is noisy, trust it less. A common tool for this is the Kalman filter.',
    ],
    example: 'A delivery robot uses wheel counts for short, smooth movement, and GPS to correct the slow drift. Each fixes the other\'s mistake.',
    withIt: 'Your robot knows where it is more accurately and keeps working when one sensor fails.',
    without: 'You trust one noisy sensor. Errors add up, and the robot slowly believes it is somewhere it is not.',
    tryIt: 'Close your eyes and walk 10 steps. Open them. Your "step count" drifted, your eyes corrected it. That is fusion.',
    faq: [
      { q: 'Is sensor fusion AI?', a: 'Often it is plain maths such as a Kalman filter. AI can also be used, but the idea is the same.' },
      { q: 'What is the simplest example?', a: 'Averaging two readings is a very basic form. Smarter versions weigh each by how reliable it is.' },
    ],
    related: [{ label: 'Sensors in the Atlas', href: '/atlas' }, { label: 'Kalman filter simulator', href: '/visualizer' }],
  },
  {
    slug: 'slam-and-navigation', title: 'SLAM: mapping while moving', level: 'Intermediate', minutes: 7,
    short: 'The robot builds a map and finds its place on it at the same time, with no GPS.',
    what: [
      'SLAM stands for Simultaneous Localisation And Mapping. It solves a chicken-and-egg problem: to map a room you need to know where you are, and to know where you are you need a map.',
      'The robot solves both together. It spots landmarks, notes how far it moved, and keeps correcting the map and its own position. When it returns to a place it has seen, it snaps everything back into line.',
    ],
    example: 'A robot vacuum maps your flat the first time it cleans, then plans efficient routes and knows which rooms it has finished.',
    withIt: 'Robots can work indoors, underground or in unknown places where GPS does not reach.',
    without: 'The robot needs a pre-made map or a track on the floor. A moved chair can confuse it for good.',
    tryIt: 'Draw a map of your room from memory, then walk it with your eyes closed. Notice how you correct using touch. That is SLAM.',
    faq: [
      { q: 'Does SLAM need a lidar?', a: 'No. It can use cameras, lidar or other sensors. Lidar is common because it measures distance directly.' },
      { q: 'Why is SLAM hard?', a: 'Small errors pile up over time, and moving objects like people confuse the map.' },
    ],
    related: [{ label: 'SLAM in plain words', href: '/atlas/concept/slam' }, { label: 'ROS 2 playground', href: '/ros2' }],
  },
  {
    slug: 'path-planning', title: 'Path planning: choosing the route', level: 'Intermediate', minutes: 6,
    short: 'Planning finds a safe route from here to there around obstacles, before the robot moves.',
    what: [
      'Path planning answers: given a map, how do I get from A to B without hitting anything? The map is turned into a grid or a graph, and an algorithm searches for the best route.',
      'Famous methods include A* (finds the shortest route on a grid) and RRT (grows random branches through crowded space). Planners often also care about smoothness, safety distance and energy.',
    ],
    example: 'A warehouse robot plans a route between shelves to a pick-up spot, then re-plans if a forklift blocks the aisle.',
    withIt: 'Your robot reaches goals efficiently and avoids obstacles, even in new layouts.',
    without: 'The robot moves in straight lines and bumps into things, or gets stuck in dead ends.',
    tryIt: 'Draw a grid with a few blocked squares. Find the shortest path by hand. You just ran a simple planner.',
    faq: [
      { q: 'Is path planning AI?', a: 'Classic planners are search algorithms, not learned AI. Learning can be added to speed up or improve them.' },
      { q: 'What if something moves into the path?', a: 'The robot re-plans. Fast local avoidance handles sudden obstacles while the global plan is updated.' },
    ],
    related: [{ label: 'Path planning simulator', href: '/visualizer' }, { label: 'Robot Intelligence course', href: '/courses/robot-intelligence' }],
  },
  {
    slug: 'imitation-learning', title: 'Imitation learning: learning from a person', level: 'Intermediate', minutes: 6,
    short: 'Show the robot how to do the task a few times and it learns to copy you.',
    what: [
      'In imitation learning, a person demonstrates the task, often by guiding the robot arm or using a remote control. The robot records what it sensed and what you did, then learns to repeat it.',
      'It is much faster than reinforcement learning for many physical tasks, because the robot starts from a good example instead of random tries.',
    ],
    example: 'You guide a robot arm to fold a towel twenty times. It then folds towels placed in slightly different spots.',
    withIt: 'Non-programmers can teach robots new skills by demonstration.',
    without: 'Every new skill needs a programmer, or millions of trial-and-error attempts.',
    tryIt: 'Teach a friend to tie a knot using only demonstrations, no words. Notice how many repeats they need.',
    faq: [
      { q: 'How many demonstrations are needed?', a: 'Often tens to hundreds for simple tasks. Varied demonstrations work better than many identical ones.' },
      { q: 'What can go wrong?', a: 'If the robot drifts into a situation you never showed, it may not know how to recover.' },
    ],
    related: [{ label: 'Robot Arms course', href: '/courses/robot-arms-build-ari' }, { label: 'How robots learn', href: '/blog/how-robots-learn-machine-learning-and-reinforcement-learning' }],
  },
  {
    slug: 'edge-ai-on-small-robots', title: 'Edge AI: running AI on the robot itself', level: 'Intermediate', minutes: 6,
    short: 'Small robots cannot always call the cloud. Edge AI runs the model on the robot\'s own chip.',
    what: [
      'Cloud AI sends data to a big computer far away and waits for the answer. That adds delay and needs internet. Edge AI runs the model on a small chip on the robot.',
      'To fit, models are made smaller and faster, using tricks such as quantisation (using fewer bits per number). You trade a little accuracy for a lot of speed and battery life.',
    ],
    example: 'A drone avoiding trees cannot wait half a second for a cloud reply. It runs its vision model on-board.',
    withIt: 'Fast reactions, no internet needed, better privacy, and lower running cost.',
    without: 'Delays or lost connection make the robot freeze or act on old information.',
    tryIt: 'Count how long a simple decision takes you to make. Now add one second of delay. Imagine driving like that.',
    faq: [
      { q: 'Can a Raspberry Pi run AI?', a: 'Yes, for small models such as simple object detection, often with a helper chip for more speed.' },
      { q: 'Is edge always better?', a: 'No. Heavy tasks can still use the cloud when delay does not matter.' },
    ],
    related: [{ label: 'Pick a board', href: '/blog/arduino-vs-esp32-vs-raspberry-pi-for-robots' }, { label: 'Hardware guide', href: '/hardware' }],
  },
  {
    slug: 'safety-and-ai-limits', title: 'Safety: where AI must not be trusted alone', level: 'Beginner', minutes: 5,
    short: 'AI can be wrong in surprising ways. Real robots keep simple, tested safety rules around it.',
    what: [
      'A learned model can be very good on average and still fail badly on one odd case. A robot near people cannot rely only on that.',
      'The standard approach is layers: a smart layer decides what to do, and a simple, tested safety layer can always stop it. Examples are speed limits, force limits, emergency stops and keep-out zones.',
    ],
    example: 'A robot arm that works beside people has a force limit. Even if the AI plans a fast move, the hardware stops if it touches someone.',
    withIt: 'You get smart behaviour and a guarantee that it stays within safe limits.',
    without: 'One strange input can lead to a dangerous action with nothing to stop it.',
    tryIt: 'List 3 safety rules for a robot at home, such as maximum speed near people. Check that each one is a simple number, not a judgment.',
    faq: [
      { q: 'Can AI be made fully safe?', a: 'Not by itself. Safety comes from design: limits, redundancy, testing and a human able to stop the robot.' },
      { q: 'Who decides the rules?', a: 'Standards bodies and laws, which differ by country and by robot type.' },
    ],
    related: [{ label: 'Robotics Foundations course', href: '/courses/robotics-foundations' }, { label: 'About our sources', href: '/sources' }],
  },
  {
    slug: 'ai-robotics-careers', title: 'Careers in AI and robotics', level: 'Beginner', minutes: 5,
    short: 'The jobs, the skills and a first-year plan, in plain English.',
    what: [
      'Robotics jobs sit in a few families: building the machine (mechanical and electronics), writing the software (control, perception, planning) and working with data and models (machine learning).',
      'You do not need a PhD to start. A portfolio of small, working projects often matters more than certificates. Show a robot that does something, and explain how it works.',
    ],
    example: 'A first-year plan: learn Python, build one line-following robot, add a camera, publish the project with a short write-up and video.',
    withIt: 'A clear next step and a portfolio that shows you can finish things.',
    without: 'Endless courses with nothing to show, and no idea which skill to learn next.',
    tryIt: 'Write one robot you could build in a month. List the 3 skills it needs. That is your learning plan.',
    faq: [
      { q: 'Do I need a degree?', a: 'Many roles ask for one, but projects and open-source work also open doors, especially for software and applied roles.' },
      { q: 'Which language first?', a: 'Python for learning and AI. C or C++ later for speed-critical robot code.' },
    ],
    related: [{ label: 'Career paths', href: '/careers' }, { label: 'Free course path', href: '/courses' }],
  },
]

export function getTopic(slug: string): AiTopic | undefined {
  return AI_TOPICS.find((t) => t.slug === slug)
}

export interface Term { term: string; plain: string }
export const GLOSSARY: Term[] = [
  { term: 'Actuator', plain: 'The part that makes a robot move, such as a motor.' },
  { term: 'Algorithm', plain: 'A step-by-step recipe a computer follows to solve a problem.' },
  { term: 'Autonomous', plain: 'Able to do a task without a person steering every move.' },
  { term: 'Classification', plain: 'Putting something into a category, such as "ripe" or "unripe".' },
  { term: 'Computer vision', plain: 'Methods that let a computer understand pictures and video.' },
  { term: 'Dataset', plain: 'The collection of examples used to teach a model.' },
  { term: 'Deep learning', plain: 'Machine learning that uses many layers of simple units, called a neural network.' },
  { term: 'Edge AI', plain: 'Running AI on the device itself instead of in the cloud.' },
  { term: 'End effector', plain: 'The "hand" at the end of a robot arm, such as a gripper.' },
  { term: 'Imitation learning', plain: 'Learning a skill by copying demonstrations from a person.' },
  { term: 'Inference', plain: 'Using a trained model to make a prediction. This is the model "working".' },
  { term: 'Kalman filter', plain: 'A maths method that blends noisy sensor readings into one better estimate.' },
  { term: 'Lidar', plain: 'A sensor that measures distance by timing how long laser light takes to bounce back.' },
  { term: 'Localisation', plain: 'Working out where the robot is.' },
  { term: 'LLM (large language model)', plain: 'The kind of AI behind chat assistants. Good at language and planning.' },
  { term: 'Machine learning', plain: 'Computers finding patterns from examples instead of following hand-written rules.' },
  { term: 'Model', plain: 'The learned "recipe" produced by training. You feed it input and it gives an output.' },
  { term: 'Neural network', plain: 'A model made of many connected simple units whose strengths are learned from data.' },
  { term: 'Object detection', plain: 'Finding and naming things in an image, usually with a box around each.' },
  { term: 'Path planning', plain: 'Finding a safe route from one place to another.' },
  { term: 'Perception', plain: 'Everything a robot does to understand its surroundings from sensors.' },
  { term: 'Quantisation', plain: 'Shrinking a model by using fewer bits per number so it runs faster on small chips.' },
  { term: 'Reinforcement learning', plain: 'Learning by trial, error and a reward score.' },
  { term: 'Reward', plain: 'The score that tells a learning robot whether an action was good.' },
  { term: 'ROS 2', plain: 'Free software that helps different parts of a robot talk to each other.' },
  { term: 'Sensor fusion', plain: 'Combining several sensors so their errors cancel out.' },
  { term: 'Sim-to-real', plain: 'Moving a skill learned in simulation onto a real robot.' },
  { term: 'SLAM', plain: 'Building a map and finding your place on it at the same time.' },
  { term: 'Training', plain: 'The process of letting a model learn from examples.' },
  { term: 'Training data', plain: 'The examples a model learns from. Poor data gives a poor model.' },
]
