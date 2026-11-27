// lib/kids/makers/makers.ts
// Meet the Makers (roadmap #34): twenty ORIGINAL, fictional role models who
// work with real kinds of robots, from every continent. Each has a short story
// for young children (read aloud, about a minute) and "how I got here" for
// teens, with real routes into the job (apprenticeships, college, university,
// teaching yourself). Nobody here is a real person; the jobs and the robots
// are real.
//
// Inclusion (roadmap #87): every continent, more women than men (interest in
// engineering often drops for girls around 11–13), different skin tones and
// hair, a headscarf, glasses, hearing aids, a wheelchair user and a maker with
// a limb difference. No maker is ranked above another.
//
// Pure data. Safe on server and client.

import type { ConceptId } from '../curriculum/types'
import type { WorldId } from '../universe/worlds'

export type Continent = 'Africa' | 'Asia' | 'Europe' | 'North America' | 'South America' | 'Oceania' | 'Antarctica'

export const CONTINENTS: readonly Continent[] = ['Africa', 'Asia', 'Europe', 'North America', 'South America', 'Oceania', 'Antarctica']

export type HairStyle = 'short' | 'curly' | 'long' | 'bun' | 'braids' | 'afro' | 'ponytail' | 'none'

/** How the maker's portrait is drawn (components/kids/makers/MakerAvatar.tsx). */
export interface MakerLook {
  skin: string
  hair: HairStyle
  hairColor: string
  /** A headscarf in this colour (covers the hair). */
  headscarf?: string
  glasses?: boolean
  hearingAid?: boolean
  wheelchair?: boolean
  /** A prosthetic (bionic) hand. */
  bionicHand?: boolean
  /** Shirt / overall colour. */
  outfit: string
}

export interface Maker {
  /** The career slug, used in the URL /kids/careers/<id>. Stable. */
  id: string
  name: string
  /** What children call them, when it is not the first word of `name` (e.g. "Ana Lucía"). */
  called?: string
  /** The job title. */
  role: string
  /** Where they work. */
  place: string
  continent: Continent
  /** Where they grew up, when it differs from where they work. */
  from?: string
  pronoun: 'she' | 'he'
  world: WorldId
  /** "Try my job": a game id in GAMES. */
  tryGame: string
  /** The big ideas this job uses most (lib/kids/universe/mastery.ts concepts). */
  skills: readonly ConceptId[]
  /** Robodex cards for robots they work with. */
  robots: readonly string[]
  /** One line a child understands. */
  tagline: string
  /** For young children: read aloud, about a minute. */
  story: string
  /** For teens: how I got here. */
  journey: string
  /** Three things from a real working day. */
  day: readonly string[]
  /** Ways into this kind of job. */
  routes: readonly string[]
  /** Something they would tell a young person. */
  advice: string
  look: MakerLook
}

const SKIN = { s1: '#F6D7BE', s2: '#E9B98F', s3: '#C98E62', s4: '#A8693F', s5: '#7A4A2A', s6: '#4E2E1B' } as const

export const MAKERS: readonly Maker[] = [
  {
    id: 'rov-pilot', name: 'Tavita Faleolo', role: 'Underwater robot (ROV) pilot', place: 'Auckland, New Zealand', continent: 'Oceania', pronoun: 'he',
    world: 'ocean', tryGame: 'ocean-rescue', skills: ['feedback-control', 'sensors', 'physics', 'debugging'], robots: ['ocean-rov', 'ocean-snake'],
    tagline: 'I drive robots at the bottom of the sea.',
    story: 'My name is Tavita, and I drive a robot at the bottom of the sea! I sit in a little room on a big ship. On my screens I can see what my robot sees, deep down in the dark water. My robot has bright lights, strong arms and a very long cable that joins it to the ship. Today we are looking at a pipe on the seabed. A crab walks past my camera and waves its claw. Hello, crab! I move my joystick very gently, because the sea is always pushing my robot around. When I was little, I loved snorkelling with my grandad and looking at fish. Now I help scientists explore places no person can swim to. If you love the sea, maybe one day you will drive a robot there too.',
    journey: 'I grew up in a Samoan family in Auckland and spent every weekend in the water. School maths did not click until a teacher showed me it was how boats and engines worked. After school I did an electrical apprenticeship, fixing motors and wiring on fishing boats, and studied for a diploma at night. An offshore company was looking for technicians who understood both electronics and the sea, and they trained me as an ROV pilot technician: you learn to repair the robot before you are allowed to fly it. My first year was mostly night shifts, cleaning connectors and fixing leaks. Now I pilot and lead a small team. The skills I use most are reading sensor data under pressure, staying calm, and debugging a fault when the robot is two kilometres below the ship.',
    day: ['Check the tether and seals before the dive', 'Fly the ROV along a pipeline and log every fault', 'Fix a leaking connector before the next shift'],
    routes: ['Electrical or mechanical apprenticeship', 'College diploma in electronics or marine engineering', 'Company training to become an ROV pilot technician'],
    advice: 'Learn to fix things, not only to use them. The pilot who can repair the robot is the one who gets to fly it.',
    look: { skin: SKIN.s4, hair: 'curly', hairColor: '#1F1A17', outfit: '#00B8D4' },
  },
  {
    id: 'surgical-robot-engineer', name: 'Aiko Tanaka', role: 'Surgical-robot engineer', place: 'Osaka, Japan', continent: 'Asia', pronoun: 'she',
    world: 'hospital', tryGame: 'robot-surgeon', skills: ['feedback-control', 'safety-ethics', 'physics', 'design-process'], robots: ['hospital-surgery'],
    tagline: 'I make robot tools that help surgeons work gently.',
    story: 'Hi, I am Aiko! I build robots that help doctors with operations. The doctor sits at a special desk and moves two handles, and my robot moves tiny tools inside the patient, very gently and very steadily. Your hand wobbles a little bit all the time, even when you try to keep it still. Try it! My robot can take away that wobble, so the tools stay steady. Every day I test my robot on soft practice models, again and again, to make sure it is safe. When I was a girl, I took apart my grandmother’s old radio to see how it worked. I could not put it back together! But I kept trying with other things. Now I help doctors make people better. Being careful and curious is my superpower.',
    journey: 'In secondary school I liked physics and biology but could not choose, so I picked a degree in mechanical engineering with a medical-devices project in the final year. I wear glasses and I am not sporty; what I had was patience for measuring things properly. My first job was testing tiny gears for camera lenses, which taught me about precision. Then I joined a team designing the wrist of a surgical instrument. A surgical robot is mostly a safety problem: what happens if a cable stretches, a motor stops, or the surgeon lets go? I write test plans, run thousands of cycles on a test rig, and sit with surgeons to learn what they need. If you like this job, take physics and maths seriously, and learn some programming: every test rig I build has code in it.',
    day: ['Run a test rig that bends a robot wrist ten thousand times', 'Watch surgeons practise on a training model and take notes', 'Change a design so a cable cannot slip'],
    routes: ['University degree in mechanical, electrical or biomedical engineering', 'Master’s degree in robotics or medical devices (optional)', 'Starting in testing or quality and moving into design'],
    advice: 'Good engineers ask “what could go wrong?” before anyone gets hurt. Being careful is a skill, not a weakness.',
    look: { skin: SKIN.s1, hair: 'bun', hairColor: '#111111', glasses: true, outfit: '#F59E0B' },
  },
  {
    id: 'farm-robot-technician', name: 'Wanjiru Kamau', role: 'Farm-robot technician', place: 'Nakuru, Kenya', continent: 'Africa', pronoun: 'she',
    world: 'farm', tryGame: 'smart-farm', skills: ['sensors', 'data', 'debugging', 'design-process'], robots: ['farm-drone', 'farm-tractor', 'farm-milker', 'farm-feed-pusher', 'farm-indoor', 'farm-ranch'],
    tagline: 'I keep the robots on farms working, so farmers grow more food.',
    story: 'Jambo! I am Wanjiru. I look after robots that help farmers. Some fly in the sky like big buzzing bees. They take pictures of the plants to see which ones are thirsty. Some live in the soil, like little sensors that feel if the ground is wet or dry. When a robot breaks, the farmers call me, and I drive out in my truck with my toolbox. Today a drone will not fly. Is the battery tired? Is a wire loose? I check one thing at a time, like a detective. Found it! A wire was loose. Now the drone can fly and help the farmer save water. When I was small, I helped my mum on our farm. Now I help lots of farms with robots. Food and robots together: that is my job!',
    journey: 'I grew up on my family’s smallholding growing maize and beans, so I knew how much depends on rain. At secondary school I joined the science club and built a soil-moisture alarm from a kit. I did a diploma in electrical engineering at a technical college, then a short course in drone piloting and the licence that goes with it. My first job was with a company that maps farms from the air. I fixed drones, flew survey missions and learnt to turn camera images into plant-health maps that farmers can read on a phone. Now I train other technicians and help co-operatives choose sensors that suit their budget. The most useful skill in this job is debugging: change one thing, test, write down what happened.',
    day: ['Fly a mapping drone over a tea farm at sunrise', 'Turn the photos into a plant-health map for the farmer', 'Teach two new technicians to replace a motor'],
    routes: ['Technical college diploma in electrical engineering or agriculture', 'Drone pilot training and licence', 'Learning on the job with a farm-technology company'],
    advice: 'Talk to the farmer first. The best robot is the one that solves their real problem.',
    look: { skin: SKIN.s6, hair: 'braids', hairColor: '#1A1410', outfit: '#22C55E' },
  },
  {
    id: 'rover-driver', name: 'Diego Quispe', role: 'Mars rover driver', place: 'A Mars mission control room', continent: 'South America', from: 'Cusco, Peru', pronoun: 'he',
    world: 'station', tryGame: 'mars-rover', skills: ['autonomy', 'sequences', 'sensors', 'events-timing'], robots: ['space-mars-rover', 'space-helicopter', 'space-first-rover', 'space-moon-rover'],
    tagline: 'I plan the drives of a robot on another planet.',
    story: 'Hola! I am Diego, and I help drive a robot on Mars! Mars is very, very far away. When I send my rover a message, it takes many minutes to get there. So I cannot drive it like a toy car with a remote. Instead, I plan the whole day’s drive carefully, step by step: go forward, turn, stop, take a picture. Then I send the plan, and the rover follows it all by itself. Sometimes the rover sees a big rock and stops to stay safe. Clever rover! I grew up in the mountains of Peru, where the night sky is full of stars. I used to look at the red dot of Mars and wonder what was there. Now I help find out.',
    journey: 'I grew up in Cusco, high in the Andes, and fell for space through a free astronomy club run by university students. I studied systems engineering in Lima, where I learnt programming and control, and joined a student satellite team: we built a small CubeSat, and I wrote the code that decided when to point its antenna. That project got me a master’s scholarship abroad in aerospace engineering. My first job was testing rover software in a sandpit, driving a copy of the rover over rocks. Rover drivers plan sequences of commands, check them in a simulator, and decide how much the rover may decide for itself. The skills I use every day are careful sequencing, reading terrain from stereo images, and thinking about what happens with a 20-minute delay.',
    day: ['Study the new 3D images of the ground near the rover', 'Write and simulate tomorrow’s drive', 'Check the rover’s report: did it stop for a hazard?'],
    routes: ['University degree in engineering, computer science or physics', 'Student satellite, rocket or robot teams', 'Master’s degree in aerospace or robotics (common, not required)'],
    advice: 'Join a team that builds something real, even something small. You learn more from one launch than from ten exams.',
    look: { skin: SKIN.s3, hair: 'short', hairColor: '#16110D', glasses: true, outfit: '#EF4444' },
  },
  {
    id: 'robot-safety-tester', name: 'Ingrid Solberg', role: 'Robot safety tester', place: 'Trondheim, Norway', continent: 'Europe', pronoun: 'she',
    world: 'guardians', tryGame: 'safety-inspector', skills: ['safety-ethics', 'sensors', 'conditions', 'debugging'], robots: ['guard-cobot', 'guard-humanoid', 'hospital-uv', 'farm-mower', 'city-patrol'],
    tagline: 'My job is to find the dangers before a robot meets people.',
    story: 'Hei! I am Ingrid, and my job is to keep people safe from robots. Before a new robot can work next to people, I test it. I ask lots of questions. What if someone walks in front of it? What if a child touches it? What if the battery runs out? Then I try it, very carefully, with soft test dummies. If the robot does not stop in time, I tell the engineers, and they make it safer. Some people think testing means breaking things, and it does a little bit! But really it means caring about people. When I was a girl, I always asked “but what if…?” Now asking that question is my job.',
    journey: 'I was the child who read the safety card on aeroplanes. I studied cybernetics and robotics at university, and in a summer job at a factory I saw a near-miss with a robot arm that nobody had imagined. After that I wanted to work on safety. I joined a testing lab where we measure how hard a robot can push a person, how fast it stops, and whether its sensors can be fooled. A lot of the job is writing: risk assessments, test reports and checking robots against international safety standards. I also test robots for things beyond bumps, like privacy and fairness, because a camera robot can harm people without touching them. The skills I use most are logic (“if this fails, then…”), measuring carefully, and explaining risk to people who are not engineers.',
    day: ['Measure how fast a cobot stops when it touches a test pad', 'Try to trick a robot’s sensors with mirrors and shadows', 'Write a risk report the factory can understand'],
    routes: ['University degree in robotics, engineering or computer science', 'Training in safety standards and risk assessment', 'Moving into safety from testing, maintenance or quality jobs'],
    advice: 'Asking “what if?” is not being negative. It is how you protect people.',
    look: { skin: SKIN.s1, hair: 'ponytail', hairColor: '#E8C872', outfit: '#FC6818' },
  },
  {
    id: 'prosthetics-designer', name: 'Layla Haddad', role: 'Prosthetics designer', place: 'Amman, Jordan', continent: 'Asia', pronoun: 'she',
    world: 'hospital', tryGame: 'robot-surgeon', skills: ['sensors', 'design-process', 'data', 'feedback-control'], robots: ['hospital-bionic-hand', 'hospital-exoskeleton'],
    tagline: 'I design robot hands, and I wear one myself.',
    story: 'Marhaba! I am Layla. I was born without my left hand, and today I wear a robot hand that I helped design! Here is how it works. When I squeeze a muscle in my arm, tiny sensors on my skin feel it, and my robot hand closes. When I relax, it opens. I can hold a cup, carry my bag, and even paint. Now I design robot hands for other people, especially children. Some children want their hand to look like a superhero, so we make that happen! I always ask the person who will wear it what they want, because they are the expert. Our differences can be our superpowers.',
    journey: 'I was born with a limb difference and got my first myoelectric hand at twelve. It was heavy and I hated it, so I started redesigning it in my head. I studied biomedical engineering at university and spent every spare hour in the 3D-printing lab. My final project was a low-cost printed hand with a simpler EMG controller. After university I worked with a team of prosthetists who fit limbs for children and refugees, and I learnt that comfort and repair matter as much as clever electronics. Now I design hands and wrists, test EMG sensor placement and write the code that turns muscle signals into grips. The skills I use most are design thinking, signal processing (filtering noisy data) and listening to users.',
    day: ['Fit a new printed hand with a twelve-year-old and adjust the grip', 'Filter noisy muscle signals so the hand does not flicker', 'Redesign a finger joint that keeps breaking'],
    routes: ['University degree in biomedical or mechanical engineering', 'Prosthetics and orthotics training (clinical route)', 'Maker and open-source hand projects as a portfolio'],
    advice: 'Design with people, not just for them. The person who uses it knows things no engineer does.',
    look: { skin: SKIN.s2, hair: 'long', hairColor: '#2B1B12', bionicHand: true, outfit: '#22D3EE' },
  },
  {
    id: 'warehouse-robot-technician', name: 'Nomvula Dlamini', role: 'Warehouse robot technician', place: 'Johannesburg, South Africa', continent: 'Africa', pronoun: 'she',
    world: 'city', tryGame: 'swarm-reef', skills: ['debugging', 'autonomy', 'sensors', 'loops'], robots: ['city-shelf-mover', 'city-unloader'],
    tagline: 'I look after hundreds of robots that work together in a giant warehouse.',
    story: 'Sawubona! I am Nomvula. I work in a warehouse as big as ten football fields, and it is full of robots! Hundreds of little orange robots zoom around, carrying shelves to people who pack your orders. They read special codes on the floor so they know exactly where they are. My job is to keep them all happy and healthy. If one robot stops, I find out why. Is a wheel stuck? Is a floor code dirty? I fix it and send it back to work. It is like being a doctor for robots! I wear my bright vest and my safety boots, and I always know where the robots are going. When I was young, I fixed my neighbours’ radios. Now I fix robots.',
    journey: 'I finished school not knowing what to do and took a job packing boxes in a warehouse. When the company brought in robots, they asked who wanted to train as a technician, and I put my hand up. They sent me on a mechatronics learnership: half in a training centre, half on the floor. I learnt electronics, pneumatics, sensors and how to read error logs. I was nervous because I had never studied engineering, but I was good at finding faults. Now I lead the night maintenance shift. Big fleets of robots are a lesson in systems: when one robot stops, traffic jams appear, so we look at data across the whole fleet, not one robot. I am now studying part-time for a national diploma.',
    day: ['Read the fleet dashboard for robots that keep stopping', 'Replace a wheel motor and calibrate the floor camera', 'Clean a section of floor codes after a spill'],
    routes: ['Mechatronics learnership or apprenticeship', 'Moving up from operations jobs with company training', 'Part-time diploma in electrical or mechatronic engineering'],
    advice: 'You do not have to know your whole path at sixteen. Put your hand up when a chance comes.',
    look: { skin: SKIN.s5, hair: 'afro', hairColor: '#120D0A', outfit: '#FACC15' },
  },
  {
    id: 'self-driving-safety-engineer', name: 'Jamal Carter', role: 'Self-driving car safety engineer', place: 'Atlanta, USA', continent: 'North America', pronoun: 'he',
    world: 'city', tryGame: 'robot-city', skills: ['autonomy', 'safety-ethics', 'conditions', 'sensors'], robots: ['city-robotaxi', 'city-sidewalk', 'city-shuttle'],
    tagline: 'I teach self-driving cars to handle the surprises of a real street.',
    story: 'Hey there! I am Jamal. I help self-driving cars learn to be safe. A self-driving car has no driver, so it has to see everything by itself: people, bikes, dogs, balls rolling into the road. My job is to think of every tricky surprise and test the car with it. What if a ball bounces into the street? A child might run after it, so the car must slow down! We test in a pretend town with pretend streets before the car ever drives on a real one. When I was nine, I built a car out of a shoebox and a motor. It crashed into the wall. Now I make sure cars do not crash at all.',
    journey: 'I grew up in Atlanta and built a lot of things that crashed. I studied computer engineering at a state university, joined the robotics club, and did a summer internship testing driver-assistance features for a car-parts company. Now I work on scenario testing for an autonomous-vehicle team. I write scenarios (a cyclist swerves, a light is broken, a truck blocks a lane) and run millions of them in simulation, then the dangerous ones on a closed test track. I spend a lot of time on “edge cases”: rare events that a car still has to handle. The skills I use most are writing clear rules in code, statistics, and asking what a human driver would have noticed.',
    day: ['Write ten new tricky scenarios for the simulator', 'Watch test-track runs and label what the car did', 'Argue for a slower speed near schools in a safety meeting'],
    routes: ['University degree in computer, electrical or mechanical engineering', 'Internships in automotive or robotics testing', 'Robotics competitions and clubs'],
    advice: 'Robots have to handle the weird stuff. Notice the weird stuff around you, and write it down.',
    look: { skin: SKIN.s5, hair: 'short', hairColor: '#0F0B08', outfit: '#3B82F6' },
  },
  {
    id: 'rescue-drone-pilot', name: 'Ana Lucía Rojas', called: 'Ana Lucía', role: 'Search-and-rescue drone pilot', place: 'Bogotá, Colombia', continent: 'South America', pronoun: 'she',
    world: 'guardians', tryGame: 'safety-inspector', skills: ['sensors', 'autonomy', 'safety-ethics', 'data'], robots: ['guard-rescue-drone', 'zoo-snake'],
    tagline: 'I fly drones that help rescue teams find people.',
    story: 'Hola! I am Ana Lucía. When someone is lost in the mountains, my drone and I help find them. My drone has a special camera that can see warm things, even at night. People are warm, so they glow on my screen like little lights! I fly my drone over the forest in neat lines, back and forth, like mowing a lawn. When I see a warm glow, I tell the rescue team where to go. Last month we found a hiker who had hurt his ankle. He was so happy to see us! I love the mountains, and I love helping people. My drone helps me do both.',
    journey: 'I grew up near the Andes and volunteered with the civil defence youth group at fifteen, learning first aid and radio. I studied electronic engineering, and my thesis was about detecting people in thermal video. I got my drone pilot licence, then joined a rescue organisation as its first drone specialist. Now I plan search patterns, fly in bad weather and train other volunteers. Software is a big part: we use maps, flight logs and image tools to search large areas. I also care about privacy: our cameras see a lot, so we have rules about what we record and who can see it. The skills I use are sensing, planning, calm decisions and teamwork.',
    day: ['Check batteries, propellers and the thermal camera', 'Fly a search pattern over a valley with the rescue team', 'Teach volunteers how to read thermal images'],
    routes: ['University degree in electronic engineering, geography or computer science', 'Drone pilot licence and flight training', 'Volunteering with rescue or civil-defence groups'],
    advice: 'Technology is only half of rescue. The other half is people who keep calm and work as a team.',
    look: { skin: SKIN.s3, hair: 'ponytail', hairColor: '#2A1A10', outfit: '#FC6818' },
  },
  {
    id: 'robot-vision-engineer', name: 'Arjun Mehta', role: 'Robot vision engineer', place: 'Pune, India', continent: 'Asia', pronoun: 'he',
    world: 'farm', tryGame: 'robot-brain', skills: ['data', 'sensors', 'debugging', 'variables'], robots: ['farm-weeder', 'farm-picker'],
    tagline: 'I teach robots to see the difference between a weed and a crop.',
    story: 'Namaste! I am Arjun, and I teach robots to see. A farm robot looks at plants with its camera. But how does it know which one is a little tomato plant and which one is a weed? I show it thousands and thousands of pictures, and tell it: this is a weed, this is a tomato. Little by little, the robot learns. Then it can pull out only the weeds, so the farmer does not need weed spray. I use a wheelchair, and I do most of my work at my computer. When I visit the farms, I go with my team and watch the robots in the fields. Teaching robots to see is like teaching a very fast, very serious baby!',
    journey: 'I have used a wheelchair since a road accident when I was eleven. I spent a lot of time at home and taught myself programming from free online courses. In college I studied computer engineering and found image processing in my third year. My first job labelled images for a self-driving project, which taught me that data quality matters more than clever models. Now I train vision models for weeding and picking robots. A lot of my time goes into the data: collecting photos in different light and seasons, fixing wrong labels, and checking the model does not fail on crops it has not seen. Remote work tools and accessible offices made this career possible; ask employers about them.',
    day: ['Find and fix mislabelled weed photos in the training set', 'Test the model on pictures taken at sunset', 'Join a field trial video call with the farm team'],
    routes: ['Degree in computer science, electronics or data science', 'Free online courses in programming and machine learning', 'A portfolio of small vision projects'],
    advice: 'Look at your data before you trust your model. Most robot mistakes start with bad examples.',
    look: { skin: SKIN.s3, hair: 'short', hairColor: '#120D0A', wheelchair: true, outfit: '#22C55E' },
  },
  {
    id: 'space-robotics-engineer', name: 'Hana Kowalska', role: 'Space robotics engineer', place: 'Kraków, Poland', continent: 'Europe', pronoun: 'she',
    world: 'station', tryGame: 'orbit-repair', skills: ['physics', 'feedback-control', 'safety-ethics', 'design-process'], robots: ['space-arm', 'space-servicer', 'space-floater', 'space-humanoid', 'space-comet-lander'],
    tagline: 'I design robot arms that work in space.',
    story: 'Cześć! I am Hana, and I design robot arms for space. In space, everything floats! If you push something, it keeps going and going and never stops by itself. So a space robot arm has to move very, very slowly and carefully when it catches a satellite. If it bumps too hard, the satellite floats away! I test my arms in a special room where they glide on air, almost like floating. When I was a little girl, I watched a rocket launch on TV and jumped up and down on the sofa. My mum said, “Maybe you will build space machines one day.” Now I do!',
    journey: 'I studied automatic control and robotics at a technical university and joined a student team building a Mars rover for international competitions. That team taught me more than any lecture: wiring at midnight, testing in a quarry, and fixing what broke. I did my master’s thesis on controlling an arm mounted on a floating base, where every arm movement also moves the spacecraft. Now I work for a space company on grippers and arms for satellite servicing. We test on air-bearing tables, where models float on a thin layer of air to imitate weightlessness. My days are a mix of simulation, maths, testing and very long safety reviews, because you cannot send a technician to orbit.',
    day: ['Simulate an arm grabbing a slowly tumbling satellite', 'Test a gripper on an air-bearing table', 'Review every way the capture could fail'],
    routes: ['Degree in robotics, control, mechanical or aerospace engineering', 'Student rover, rocket or satellite teams', 'Internships with space agencies or companies'],
    advice: 'Join a team that builds something and competes. Breaking things together teaches you engineering.',
    look: { skin: SKIN.s1, hair: 'short', hairColor: '#8A4B2A', outfit: '#94A3B8' },
  },
  {
    id: 'ocean-robot-scientist', name: 'Kalinda Morgan', role: 'Ocean robot scientist', place: 'A research station in Antarctica', continent: 'Antarctica', from: 'Darwin, Australia', pronoun: 'she',
    world: 'ocean', tryGame: 'ocean-rescue', skills: ['data', 'autonomy', 'physics', 'sensors'], robots: ['ocean-glider', 'ocean-float', 'ocean-auv', 'ocean-sailboat'],
    tagline: 'I send robots under the Antarctic ice to measure the ocean.',
    story: 'G’day! I am Kalinda, and I work in Antarctica, the coldest place on Earth! There are penguins here, and lots and lots of ice. I send robots called gliders into the freezing sea. They have wings, and they glide up and down under the water for months, all by themselves. They measure how warm and how salty the water is. This helps us understand how our planet is changing. Every few hours, my gliders pop up and send me a message by satellite: “Hello, here is my data!” I wear three jackets when I go outside. Brrr! I grew up where it is hot, so Antarctica was a big surprise.',
    journey: 'I grew up in Darwin, about as far from snow as you can get. I loved maths and the sea, so I studied marine science with a lot of statistics and programming, then a PhD on ocean currents. During my PhD I learnt to pilot ocean gliders, because robots can collect data through winters when no ship can sail. Now I spend summer seasons at an Antarctic research station deploying gliders and floats, and the rest of the year analysing their data at a university. The robots are the easy part; the hard part is turning millions of numbers into a clear answer. The skills I use most are data analysis, programming and planning missions that must work with nobody nearby to help.',
    day: ['Plan a glider’s route under the sea ice', 'Launch a glider from a small boat among icebergs', 'Write code to clean months of temperature data'],
    routes: ['Degree in marine science, physics, maths or engineering', 'Research projects or a PhD in oceanography', 'Technician roles on research ships and stations'],
    advice: 'Learn to code, whatever science you love. Robots collect the data, and code turns it into answers.',
    look: { skin: SKIN.s5, hair: 'curly', hairColor: '#2A1C14', outfit: '#00B8D4' },
  },
  {
    id: 'robotics-teacher', name: 'Yusuf Adeyemi', role: 'Robotics teacher and maker-space founder', place: 'Lagos, Nigeria', continent: 'Africa', pronoun: 'he',
    world: 'guardians', tryGame: 'circuit-city', skills: ['design-process', 'decomposition', 'loops', 'careers'], robots: ['zoo-hexapod', 'city-vacuum', 'city-traffic-robot'],
    tagline: 'I help children build their first robots.',
    story: 'Hello! I am Yusuf, and I teach children to build robots. In my maker space in Lagos, we build robots from motors, wires and recycled things, like bottle caps and old toys. Yesterday a girl called Bisi built a robot that drives around and waters plants. Wow! The first robot I ever built did not work at all. It just went round and round in circles. But I found the mistake and fixed it. Mistakes are how we learn! Now I help other children fix their mistakes too. Building robots together is noisy and messy and so much fun. Maybe you could build one too.',
    journey: 'I studied electrical engineering and worked for a telecoms company maintaining mobile masts, which taught me a lot about power and reliability. On weekends I ran a free robotics club in a church hall with donated kits. It grew so much that I left my job and started a maker space with a few friends. Now I teach, write lesson plans, repair kits and train teachers from other schools. We use recycled parts and cheap microcontrollers so families do not need money for kits. Teaching is engineering too: you break a hard idea into small steps, test them with real children and improve them. Many of my students now study engineering; two have started their own companies.',
    day: ['Teach a class to make a robot follow a line', 'Fix a box of broken motors with my older students', 'Train teachers from three schools in a workshop'],
    routes: ['Degree in engineering or a science, plus teacher training', 'Volunteering at clubs and maker spaces', 'Starting small: one club, one kit, one afternoon a week'],
    advice: 'Start with what you have. Some of the best robots I have seen were made from rubbish.',
    look: { skin: SKIN.s6, hair: 'short', hairColor: '#0E0A08', outfit: '#FC6818' },
  },
  {
    id: 'bio-inspired-robot-researcher', name: 'Emma Tremblay', role: 'Bio-inspired robot researcher', place: 'Montréal, Canada', continent: 'North America', pronoun: 'she',
    world: 'zoo', tryGame: 'bio-bots', skills: ['design-process', 'physics', 'sensors', 'feedback-control'], robots: ['zoo-gecko', 'zoo-cheetah', 'zoo-insect-flyer', 'zoo-octopus', 'zoo-bird', 'zoo-robot-dog', 'ocean-robofish'],
    tagline: 'I copy animals’ tricks to build better robots.',
    story: 'Bonjour! I am Emma, and animals are my teachers! Did you know a gecko can walk up a window? Its feet have tiny, tiny hairs that stick to the glass. I copy ideas like that to build robots. I have built a robot that climbs walls like a gecko, and one that wiggles like a fish. I spend a lot of time watching animals, at the zoo, in the forest and in slow-motion videos. I wear hearing aids, so I like to watch very carefully. Watching closely is a great way to notice things other people miss! Nature has had millions of years to solve problems, so I always ask: how would an animal do it?',
    journey: 'I have worn hearing aids since I was small, and I became a very careful watcher. I studied mechanical engineering, with biology electives because I could not stop going to the animal-behaviour lectures. For my master’s and PhD I studied how small animals climb, using high-speed cameras, then built climbing robots to test the ideas. Now I run a small research lab at a university. Research is a lot of failed experiments, writing papers, applying for funding and mentoring students. My lab uses live captions in meetings, which helps everyone. If you like this, learn physics and some biology, and learn to build: 3D printing, simple electronics and coding.',
    day: ['Film a gecko climbing in slow motion', 'Help a student fix a climbing robot that keeps slipping', 'Write a paper about what we learnt'],
    routes: ['Degree in mechanical engineering, physics or biology', 'Research projects, then a master’s or PhD', 'Making things: 3D printing, electronics and code'],
    advice: 'Notice small things. A tiny detail in how an animal moves can become a whole new robot.',
    look: { skin: SKIN.s2, hair: 'long', hairColor: '#B5651D', hearingAid: true, outfit: '#22C55E' },
  },
  {
    id: 'firefighting-robot-operator', name: 'Fatima Zahra Benali', called: 'Fatima Zahra', role: 'Firefighter and robot operator', place: 'Casablanca, Morocco', continent: 'Africa', pronoun: 'she',
    world: 'guardians', tryGame: 'safety-inspector', skills: ['safety-ethics', 'sensors', 'conditions', 'feedback-control'], robots: ['guard-firefighter', 'guard-bomb-disposal'],
    tagline: 'I send a robot into fires that are too dangerous for people.',
    story: 'Salam! I am Fatima Zahra, and I am a firefighter. My team has a robot that helps us fight big fires. It is very strong and rolls on tracks like a tank. When a fire is too hot or too dangerous for people to go in, the robot goes in instead! I drive it with a controller and look through its special camera, which can see heat through the smoke. Then the robot sprays lots of water on the fire. My team and I stay safe outside. Being brave is important, but being smart and safe is even more important. And robots help us be both.',
    journey: 'I joined the civil protection service after school and trained as a firefighter: fitness, first aid, hazardous materials and a lot of teamwork. When our unit received its first firefighting robot, I volunteered for the training because I had always liked technology. I learnt teleoperation, radio links, battery care and how heat and smoke affect sensors. Later I studied part-time for a diploma in industrial maintenance so I could repair it myself. Now I train other crews and work with the engineers who improve the robot. Robots do not replace firefighters, but they change where we stand: further away from the danger. The skills I use most are fast decisions, clear radio talk and knowing exactly what the robot can and cannot do.',
    day: ['Check the robot’s tracks, hose and battery at the start of a shift', 'Drive it through a smoke-filled training building', 'Teach a new crew how to read the thermal camera'],
    routes: ['Firefighter or civil-protection training', 'Specialist robot-operator courses', 'Part-time technical diploma in maintenance or electronics'],
    advice: 'Brave is good. Brave and well-trained is better.',
    look: { skin: SKIN.s3, hair: 'none', hairColor: '#000000', headscarf: '#0EA5E9', outfit: '#EF4444' },
  },
  {
    id: 'subsea-inspection-engineer', name: 'Mohammed Al-Farsi', role: 'Inspection robot engineer', place: 'Muscat, Oman', continent: 'Asia', pronoun: 'he',
    world: 'ocean', tryGame: 'ocean-rescue', skills: ['feedback-control', 'sensors', 'autonomy', 'safety-ethics'], robots: ['ocean-snake', 'guard-inspection-dog', 'guard-nuclear'],
    tagline: 'I send robots to check places that are dangerous for people.',
    story: 'Marhaba! I am Mohammed. I build robots that check pipes, tanks and machines in places that are dangerous for people: very deep under the sea, very hot, or full of smelly gas. One of my robots looks like a snake and lives at the bottom of the sea. Another one has four legs, like a dog, and walks around a big factory reading the dials. If something is leaking or getting too hot, the robots tell us, and we fix it before anyone gets hurt. When I was a boy, I loved taking the lid off things to see inside. Now my robots look inside things for me!',
    journey: 'I studied mechatronics at university in Oman, with a final project on a pipe-crawling robot. My first job was as a field engineer on oil and gas sites, doing inspections by hand in heat and noise, which made me want robots to do the risky parts. I moved into a team that brings inspection robots into these sites: legged robots on land and resident robots under the sea. I write the control software that keeps a robot steady next to a pipe, choose sensors (thermal, acoustic, gas) and plan missions with the site teams. The energy industry is changing, and the same robots now inspect wind farms and solar plants. The skills I use most are control, sensor choice and safety planning.',
    day: ['Tune the controller that holds a robot still in a current', 'Plan an inspection route with the site safety team', 'Compare this month’s thermal images with last month’s'],
    routes: ['Degree in mechatronics, mechanical or electrical engineering', 'Field engineering jobs that teach how sites really work', 'Training in industrial safety'],
    advice: 'Go and see the real place your robot will work. It is always messier than the drawing.',
    look: { skin: SKIN.s3, hair: 'short', hairColor: '#1A120C', outfit: '#00B8D4' },
  },
  {
    id: 'care-robot-designer', name: 'Isabela Costa', role: 'Care-robot designer', place: 'Lisbon, Portugal', continent: 'Europe', pronoun: 'she',
    world: 'hospital', tryGame: 'robot-surgeon', skills: ['design-process', 'safety-ethics', 'sense-think-act', 'sensors'], robots: ['hospital-seal', 'hospital-ward-helper', 'hospital-delivery'],
    tagline: 'I design robots that help nurses and comfort patients.',
    story: 'Olá! I am Isabela. I design robots that help in hospitals. Some carry medicine down the long corridors, so the nurses have more time to look after people. Some are soft and cuddly, like a fluffy seal, and help people feel calm. Before I design a robot, I spend a whole day with the nurses, watching what they do. I ask them: what makes your day hard? Then I draw ideas, make a model, and test it with them. If a robot is scary or confusing, nobody will use it. So I make sure it is kind, clear and safe. Robots should help people take care of each other.',
    journey: 'I studied product design, then a master’s in human–robot interaction because I wanted to design machines people actually like. I started as a researcher running studies in care homes: does this robot calm people, or confuse them? What do nurses need from it? Now I design the behaviour, sounds, lights and screens of hospital robots, and I work closely with engineers on what the robot should do when something goes wrong. Ethics is part of the job: a companion robot must never trick someone or replace human care. The skills I use most are observing people, prototyping quickly, and turning what nurses say into requirements engineers can build.',
    day: ['Shadow a night nurse to see where time goes', 'Test new robot sounds with patients and staff', 'Write what the robot should do when a corridor is blocked'],
    routes: ['Degree in design, psychology, engineering or computer science', 'Master’s in human–robot or human–computer interaction', 'Research assistant roles in universities or hospitals'],
    advice: 'Spend time with the people who will use your robot. Your best ideas will come from them.',
    look: { skin: SKIN.s2, hair: 'curly', hairColor: '#3B2416', glasses: true, outfit: '#F472B6' },
  },
  {
    id: 'mechatronics-technician', name: 'Lucas Ferreira', role: 'Mechatronics technician', place: 'Curitiba, Brazil', continent: 'South America', pronoun: 'he',
    world: 'guardians', tryGame: 'arm-factory', skills: ['sequences', 'debugging', 'safety-ethics', 'physics'], robots: ['guard-factory-arm', 'guard-first-robot'],
    tagline: 'I program and repair the robot arms that build cars.',
    story: 'Oi! I am Lucas, and I work in a car factory full of giant robot arms. They lift car doors, weld metal with bright sparks, and paint cars shiny colours. I teach the robots what to do: move here, grab this, weld there. I do it with a handheld controller called a teach pendant. And when a robot stops working, I find out why and fix it. The robots work behind big fences, because they are fast and strong. Before I go in, I always switch them off and put on my lock, so nobody can switch them on while I am inside. Safety first, always!',
    journey: 'I did a technical high school course in mechatronics, which mixed mechanics, electronics and programming with lots of workshop time. At seventeen I started an apprenticeship at a car-parts plant, splitting my week between the training school and the factory floor. I learnt to program robots with a teach pendant, read electrical drawings, and follow lock-out procedures before entering a robot cell. Now I maintain and reprogram a line of welding robots. When the factory changes a car model, we reteach dozens of paths. I am also studying for an engineering degree at night, paid for by the company. My favourite skill is fault-finding: following a problem from a symptom to the real cause.',
    day: ['Lock out a robot cell and replace a worn welding tip', 'Reteach a robot path for a new door shape', 'Check the light curtains still stop the robot'],
    routes: ['Technical high school or college course in mechatronics', 'Industrial apprenticeship', 'Part-time engineering degree while working'],
    advice: 'Learn the safety rules so well that you never skip them, even when you are in a hurry.',
    look: { skin: SKIN.s4, hair: 'curly', hairColor: '#17110C', outfit: '#3B82F6' },
  },
  {
    id: 'machine-learning-engineer', name: 'Mariam Yusupova', role: 'Machine-learning engineer for robots', place: 'Tashkent, Uzbekistan', continent: 'Asia', pronoun: 'she',
    world: 'city', tryGame: 'robot-brain', skills: ['data', 'variables', 'autonomy', 'debugging'], robots: ['city-robotaxi', 'farm-weeder', 'city-vacuum'],
    tagline: 'I help robots learn from examples instead of fixed rules.',
    story: 'Salom! I am Mariam. I help robots learn, a bit like you learn at school! But robots learn from examples. If I want a robot to know what a cat looks like, I show it lots and lots of pictures of cats, and pictures of things that are not cats. After a while, the robot can find a cat in a new picture all by itself. But if I only show it orange cats, it might think a grey cat is not a cat! So I must choose my examples very carefully, and fairly. I love puzzles, and teaching robots is the biggest puzzle of all.',
    journey: 'I was strong at maths olympiads in school and studied applied mathematics and computer science at university in Tashkent. I taught myself machine learning from online courses and open datasets, and built a small project that recognised handwritten Uzbek letters. That project got me a remote internship, and then a job building perception models for robots. My work is training models, but mostly it is data: collecting it, cleaning it, checking whether it is fair to everyone, and measuring how a model fails. I also make models small enough to run on a robot’s own computer. Maths, programming in Python, and honesty about your results are the skills that matter most.',
    day: ['Check a training dataset for missing kinds of examples', 'Train a smaller model that runs on the robot itself', 'Show the team where the model still makes mistakes'],
    routes: ['Degree in maths, computer science or engineering', 'Online courses, open datasets and personal projects', 'Remote internships and open-source contributions'],
    advice: 'A model is only as fair as its examples. Always ask who is missing from your data.',
    look: { skin: SKIN.s2, hair: 'long', hairColor: '#1C130E', glasses: true, outfit: '#A3E635' },
  },
  {
    id: 'drone-swarm-engineer', name: 'Sun-hee Park', role: 'Drone swarm engineer', place: 'Seoul, South Korea', continent: 'Asia', pronoun: 'she',
    world: 'city', tryGame: 'swarm-reef', skills: ['loops', 'autonomy', 'events-timing', 'feedback-control'], robots: ['city-medical-drone'],
    tagline: 'I make hundreds of drones fly together like one.',
    story: 'Annyeong! I am Sun-hee. I make hundreds of drones fly together! At night, my drones light up and fly into shapes in the sky: a star, a heart, a giant robot waving hello. Each drone follows three simple rules: do not bump your neighbours, fly the same way as them, and stay close to the group. Like birds flying together! I write the computer program that tells each drone where to go and when. Before a show, I test everything on my computer, then outside with a few drones, then with all of them. When the drones lift off together, everyone says “Wow!” and so do I, every time.',
    journey: 'I studied aerospace engineering and joined a university drone-racing club, where I learnt to build and tune quadcopters. My master’s project was about many small robots coordinating with simple local rules, the same ideas you see in flocks of birds. Now I work on drone light shows and on swarms for mapping and delivery. A show is choreography plus safety: every drone needs a path that never comes too close to another, timed to the music, with a plan for any drone that fails mid-air. I use simulation every day, and a lot of maths about distances and timing. The skills I use most are loops, timing, control and very careful testing.',
    day: ['Plan a new shape so no two drones come too close', 'Test a hundred drones in simulation, then twenty outside', 'Check wind limits before the evening show'],
    routes: ['Degree in aerospace, electrical engineering or computer science', 'Drone clubs and competitions', 'Master’s research on multi-robot systems (optional)'],
    advice: 'Simple rules can make amazing things. Start simple, test, then add.',
    look: { skin: SKIN.s1, hair: 'short', hairColor: '#111111', outfit: '#EC4899' },
  },
]

const BY_ID = new Map(MAKERS.map((m) => [m.id, m]))

export function getMaker(id: string): Maker | undefined {
  return BY_ID.get(id)
}

/** The name children use for a maker: `called`, else the first word of the name. */
export function makerFirstName(m: Pick<Maker, 'name' | 'called'>): string {
  return m.called ?? m.name.split(' ')[0]
}

export function makersInWorld(world: WorldId): Maker[] {
  return MAKERS.filter((m) => m.world === world)
}
