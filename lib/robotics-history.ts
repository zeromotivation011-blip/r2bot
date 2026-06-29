// lib/robotics-history.ts
// 65 milestones in the history of robotics, 1920–2026.
// Each milestone has a short timeline blurb plus a long-form modal article.

export type HistoryCategory = 'invention' | 'milestone' | 'film' | 'india' | 'space' | 'ai';

export interface Milestone {
  year: number;
  title: string;
  description: string; // short timeline blurb
  category: HistoryCategory;
  icon: string;
  countryFlag: string;
  isKeyMilestone: boolean;
  imageUrl: string | null;
  fullArticle: string; // 150-200 word longer story for the modal
  whyItMattered: string[]; // 2-3 bullet impacts
  robotSlug?: string; // optional slug into /robots/[slug]
  youtubeId?: string; // optional video for modal
}

export const CATEGORY_META: Record<HistoryCategory, { label: string; color: string; emoji: string }> = {
  invention: { label: 'Invention', color: '#f59e0b', emoji: '🛠️' },
  milestone: { label: 'Milestone', color: '#22d3ee', emoji: '🚩' },
  film: { label: 'Cinema', color: '#a78bfa', emoji: '🎬' },
  india: { label: 'India', color: '#fb923c', emoji: '🇮🇳' },
  space: { label: 'Space', color: '#60a5fa', emoji: '🚀' },
  ai: { label: 'AI', color: '#34d399', emoji: '🧠' },
};

export const MILESTONES: Milestone[] = [
  {
    year: 1920,
    title: 'The word "robot" is coined',
    description:
      'Czech playwright Karel Čapek introduces the word "robot" in his play R.U.R. (Rossum\'s Universal Robots). It comes from the Czech "robota" meaning forced labour.',
    category: 'film',
    icon: '📖',
    countryFlag: '🇨🇿',
    isKeyMilestone: true,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5c/Capek_brothers.jpg/440px-Capek_brothers.jpg',
    fullArticle:
      'Long before anyone built a real robot, a Czech playwright gave the idea its name. In 1920 Karel Čapek and his brother Josef wrote R.U.R. — Rossum\'s Universal Robots — a science-fiction play about an island factory that mass-produces artificial humans to do humanity\'s drudgery. Josef suggested the word "robot", from the Czech "robota" meaning forced labour or serfdom. The play premiered in Prague in 1921 and was a sensation worldwide, translated into 30 languages within five years. Its plot — robots eventually rise up and replace their creators — set the template for nearly every robot story since. Karel Čapek hated the word becoming a synonym for science: he was writing about labour, exploitation, and the loss of human meaning, not engineering. But the word stuck. Every robot, every robotics conference, every line of code labelled "robot" in 2026 traces back to a Prague theatre in 1921.',
    whyItMattered: [
      'Gave the field its name — every modern robot inherits the word "robot" from this single play.',
      'Set the cultural template of robot uprising, recycled in countless films and novels.',
      'Established robotics as a question about labour and meaning, not just machinery.',
    ],
  },
  {
    year: 1927,
    title: 'Metropolis releases the Maschinenmensch',
    description:
      "Fritz Lang's Metropolis features the first cinematic depiction of a humanoid robot — the Maschinenmensch. It shapes how the public would visualise robots for the next century.",
    category: 'film',
    icon: '🎞️',
    countryFlag: '🇩🇪',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      'Fritz Lang\'s 1927 film Metropolis gave the world its first iconic cinematic robot — the "Maschinenmensch" or machine-human. A gleaming, gold-bodied, female-shaped automaton built in the film by the mad scientist Rotwang, it would shape robot design in cinema for the next century. The C-3PO of Star Wars (1977) was a direct visual descendant. The film itself was a sprawling silent epic about labour, class, and an industrial future — themes that resonate decades later. Lang used cutting-edge special effects, scale models, and an ambitious 17-month production. The Maschinenmensch represented the new mechanical age both as wonder and as terror: she leads workers in a destructive revolt. Generations of designers, animators, and roboticists cite Metropolis as their first encounter with the idea of a humanoid machine. Today the film is in the U.S. Library of Congress National Film Registry and remains one of the most influential robotics images ever filmed.',
    whyItMattered: [
      'First cinematic humanoid robot, defining the visual archetype for a century.',
      'Demonstrated film could explore industrial-age anxieties about machines and labour.',
      'Direct visual inspiration for C-3PO and countless screen robots that followed.',
    ],
  },
  {
    year: 1939,
    title: 'Elektro the smoking robot debuts',
    description:
      "Westinghouse's Elektro is unveiled at the New York World's Fair — a 7-foot humanoid that could walk, talk, count on its fingers, and even smoke cigarettes. Pure showmanship that captured the public imagination.",
    category: 'milestone',
    icon: '🤖',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "Westinghouse Electric unveiled Elektro at the 1939 New York World's Fair to a stunned crowd. Seven feet tall, polished aluminium, weighing 120 kg, Elektro could walk on command, speak around 700 words via a record player in his chest, count on his fingers, smoke cigarettes, and even differentiate red and green using photocells. Inside he was a vaudeville act dressed as the future: cams, gears, and electric motors choreographed to voice commands. He was joined a year later by Sparko, a robotic dog that could sit and beg. The Fair coined the slogan \"The World of Tomorrow\", and Elektro was its sci-fi cover star. Millions of visitors saw him; he toured the country for years. Engineering-wise he advanced little — he was theatre. But culturally Elektro turned \"robot\" from a literary idea into a tangible, photographable thing. Every science-museum robot exhibit and every robot stage demo since owes something to him.",
    whyItMattered: [
      'First widely seen, walking, talking humanoid — turned robotics from idea into spectacle.',
      "Anchored the \"World of Tomorrow\" image of progress in millions of minds.",
      'Established the template of robot stage demos that still runs at robotics conferences today.',
    ],
  },
  {
    year: 1942,
    title: 'Asimov publishes the Three Laws of Robotics',
    description:
      'Isaac Asimov\'s short story "Runaround" introduces the Three Laws of Robotics. These rules remain the most-cited ethical framework for robotic decision-making.',
    category: 'film',
    icon: '📚',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/Isaac.Asimov01.jpg/440px-Isaac.Asimov01.jpg',
    fullArticle:
      'In 1942, in the pulp magazine Astounding Science Fiction, a 22-year-old American writer named Isaac Asimov published a short story called "Runaround". Hidden inside the story was an idea that would outlive almost everything else in 20th-century sci-fi: the Three Laws of Robotics. First Law — a robot may not harm a human or, through inaction, allow a human to come to harm. Second Law — a robot must obey human orders unless they conflict with the First Law. Third Law — a robot must protect its own existence unless that conflicts with the first two. Asimov spent his career writing stories that picked apart how these tidy rules break down in messy real situations. Eighty years on, every robot-ethics paper, every EU AI Act debate, every corporate policy on AI safety still references them. They are fiction, yet they shape the language we use about real safety, agency, and machine responsibility.',
    whyItMattered: [
      'Created the language of robot ethics still used in policy, philosophy, and engineering.',
      'Showed that the hardest problem in robotics is not capability — it is consequence.',
      'Inspired thousands of engineers (including modern AI safety researchers) to enter the field.',
    ],
  },
  {
    year: 1948,
    title: 'Grey Walter builds the first electronic tortoises',
    description:
      'British neuroscientist William Grey Walter creates Elmer and Elsie — wheeled "tortoises" that move toward light. The first autonomous mobile robots in history.',
    category: 'invention',
    icon: '🐢',
    countryFlag: '🇬🇧',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      'In a workshop in Bristol, England, neuroscientist William Grey Walter built two small wheeled creatures named Elmer and Elsie around 1948-1949. Each had two vacuum-tube neurons, a light sensor, and a touch sensor — and that was it. Yet they moved as if alive. They rolled towards bright light, recoiled from obstacles, returned to a charging hut when their batteries ran low, and even appeared to "dance" together when their lights reflected off mirrors. Walter called them tortoises. They were the first truly autonomous mobile robots — running on their own power, deciding their own moves, with no remote control or pre-programmed path. He demonstrated them at the Festival of Britain in 1951 to crowds of children and adults. Today they are recognised as the direct ancestors of every Roomba, every Mars rover, and every Boston Dynamics Spot. Walter\'s key insight: simple sensors plus simple wiring can produce surprisingly lifelike behaviour — long before computers entered robotics.',
    whyItMattered: [
      'First truly autonomous mobile robots — sensors, batteries, decisions, no remote control.',
      "Pioneered behaviour-based robotics decades before Rodney Brooks formalised it.",
      'Demonstrated that complex behaviour can emerge from minimal hardware.',
    ],
  },
  {
    year: 1954,
    title: 'George Devol patents the first programmable robot arm',
    description:
      'American inventor George Devol files the patent for the Unimate — a programmable industrial manipulator. This patent founds the entire industrial-robot industry.',
    category: 'invention',
    icon: '🦾',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      'George Devol, an American inventor with no formal engineering degree, filed a patent in 1954 for what he called "programmed article transfer" — a hydraulic, magnetic-drum-controlled industrial arm that could be taught a sequence of motions by physically guiding it once. Devol\'s genius was the idea of programmability. Industrial machines existed; programmable industrial machines did not. The patent (US 2,988,237) was granted in 1961. Devol struggled to find investors until he met Joseph Engelberger at a cocktail party in 1956. The two went on to found Unimation and turn the patent into the first industrial robot. Every modern robot arm — KUKA, Fanuc, ABB, Yaskawa, every line in every car factory — descends from this single patent. Devol later said he had not realised what he was inventing. He just wanted to save factory workers from dangerous, repetitive jobs. The patent is now in the U.S. National Inventors Hall of Fame.',
    whyItMattered: [
      'Founded the entire industrial-robot industry through a single insight: programmability.',
      'Sparked the partnership with Engelberger that produced Unimation.',
      'Every modern KUKA, Fanuc, ABB, Yaskawa arm descends from this 1954 patent.',
    ],
  },
  {
    year: 1956,
    title: 'Devol and Engelberger found Unimation',
    description:
      'George Devol partners with Joseph Engelberger to start Unimation — the first robotics company. Engelberger goes on to be known as the "Father of Robotics."',
    category: 'milestone',
    icon: '🏢',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      'In 1956, Joseph Engelberger and George Devol met at a cocktail party in Stamford, Connecticut. Engelberger, an engineer-businessman, had just read Asimov\'s robot stories. Devol pitched him on his programmable-arm patent. Within months they had founded Unimation Inc. — the world\'s first robotics company. For five years they struggled. American factories saw no need for "robots". GM finally agreed to a pilot in 1961, installing a Unimate at its Trenton plant for hot die-casting work. The pilot was a success and the orders started flowing. By the 1970s, Unimation had hundreds of arms running in factories across the US, Japan, and Europe. Engelberger licensed the technology to Kawasaki, seeding Japan\'s industrial-robot dominance. He went on to be called the "Father of Robotics" and lectured around the world, including at the United Nations. Unimation was acquired by Westinghouse in 1983. Engelberger founded a second robotics company, Helpmate, focused on hospital service robots, before his death in 2015.',
    whyItMattered: [
      'First robotics company in history — the template every later robotics startup follows.',
      "Engelberger's licensing to Kawasaki seeded Japan's robotics industrial dominance.",
      "Set off Unimation's 1960s–1980s wave of factory-arm deployments across the US.",
    ],
  },
  {
    year: 1961,
    title: 'Unimate installed at General Motors',
    description:
      "The world's first industrial robot, the Unimate, begins work at GM's New Jersey plant — lifting and welding hot car parts. Industrial robotics begins.",
    category: 'invention',
    icon: '🏭',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/UNIMATE.jpg/440px-UNIMATE.jpg',
    fullArticle:
      'On a Monday morning in 1961, in a noisy GM die-casting shop in Trenton, New Jersey, a 4,000-pound hydraulic arm called Unimate started its first shift. It picked up red-hot car door castings from a die-cast machine and stacked them — a job so hot and dangerous that human workers regularly burned themselves. Unimate cost $25,000 (more than $250,000 today) but it never took breaks, never burned itself, and never went home. It ran 18 years before retirement and is now in the Smithsonian. Joseph Engelberger trained operators by physically moving the arm through positions while its magnetic-drum controller recorded joint angles. Once trained, Unimate replayed the trajectory perfectly. Initially American auto-makers were sceptical. Japan was not — Kawasaki licensed the design in 1969 and started a national programme that today makes Japan the world\'s most robot-dense major economy. Every modern industrial robot — every KUKA, Fanuc, ABB — traces back to that Trenton factory floor.',
    whyItMattered: [
      "Launched the entire industrial robot industry; Japan's robotics dominance began here.",
      'Demonstrated robots could safely take on dangerous, dirty, dull factory work.',
      'GM\'s Trenton plant became a pilgrimage site for engineers studying automation.',
    ],
    robotSlug: 'kuka-kr',
  },
  {
    year: 1966,
    title: 'Shakey: the first reasoning mobile robot',
    description:
      "Stanford Research Institute begins development of SHAKEY — the first mobile robot able to reason about its actions. SHAKEY's successors live on in modern autonomous systems.",
    category: 'invention',
    icon: '🧠',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      'In 1966 at the Stanford Research Institute (now SRI), a six-year project began on a robot called SHAKEY. The name was a joke — it shook when it moved. But SHAKEY was the first robot ever able to reason about its actions: take a goal like "push the block onto the platform", break it into steps, plan around obstacles, and execute them. It was wheeled, about 5 feet tall, and connected by cable to a refrigerator-sized DEC PDP-10 computer (the actual brain was off-board). To work, SHAKEY needed three breakthroughs all at once: computer vision (a TV camera + image-processing software), spatial planning (the STRIPS algorithm), and natural-language input. The team published landmark papers and invented the A* search algorithm during the project — still the most-used pathfinding algorithm in robotics today. SHAKEY now sits in the Computer History Museum. Every modern autonomous robot — every Mars rover, every Spot, every self-driving car — traces its planning genealogy back to SHAKEY.',
    whyItMattered: [
      'First robot to reason about actions — symbolic AI met physical robotics for the first time.',
      'Spawned A* search, STRIPS planning, and modern computer-vision pipelines.',
      'Defined the perception–planning–action loop that powers every modern autonomous robot.',
    ],
  },
  {
    year: 1967,
    title: 'FANUC founded in Japan',
    description:
      "Fujitsu spins off FANUC, soon to become the world's largest industrial-robot manufacturer. Japan begins its rise as a global robotics superpower.",
    category: 'milestone',
    icon: '🏯',
    countryFlag: '🇯🇵',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 1956, inside Fujitsu, a small division began developing CNC (computer numerical control) machinery. By 1967 the work had grown so successful that Fujitsu spun it off as a standalone company: Fanuc (Fuji Automatic Numerical Control). The new firm built its bright-yellow factory robots in a single-purpose campus at the foot of Mount Fuji, where it still operates today. Fanuc combined Japanese precision-engineering culture with American robotics IP licensed from Unimation. The result: arms with the highest reliability, smallest footprint, and lowest cost in the industry. Fanuc became the world's largest industrial-robot manufacturer by the 1980s and still leads the global market by units shipped. The company is famously vertically integrated — it builds its own servos, gears, controllers, and even its own paint. Today there are over 700,000 Fanuc robots operating worldwide. The 1967 spinoff is the moment Japan began building the robotics empire it now leads.",
    whyItMattered: [
      'Created the world\'s largest industrial-robot company.',
      "Established Japan's defining role as a robotics superpower.",
      'Helped Toyota and Honda automate at scale, enabling their global dominance.',
    ],
  },
  {
    year: 1970,
    title: 'Stanford Cart navigates autonomously',
    description:
      'Stanford\'s "Cart" robot crosses a room autonomously — taking about 5 hours due to limited compute. Early proof that autonomous navigation was solvable.',
    category: 'invention',
    icon: '🛒',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      'The Stanford Cart was a 4-wheeled remote-controlled vehicle originally built in 1960 to study moon-rover control. By 1970, Stanford researchers (notably Hans Moravec) had retrofitted it with a TV camera and wired it to a mainframe computer. Their goal: drive across a chair-filled room autonomously. The Cart succeeded — but it took five hours. Every few feet it stopped, took stereo photos, processed them on the mainframe to detect obstacles, planned a path forward, then crept ahead another metre. Moravec\'s 1980 PhD thesis on the Cart became one of the most influential robotics documents ever written. The project showed three things: visual-only autonomous navigation was possible; computers were the bottleneck (not algorithms); and the gap between lab and reality was enormous. By 1985 Moravec famously articulated "Moravec\'s Paradox": the things humans find easy (walking, seeing, picking up a cup) are catastrophically hard for robots. We are still living with that paradox.',
    whyItMattered: [
      'First credible demonstration of camera-only autonomous navigation.',
      "Produced Moravec's Paradox, the central insight of why robots still struggle with everyday tasks.",
      'Trained a generation of roboticists who went on to lead labs at CMU, MIT, and Stanford.',
    ],
  },
  {
    year: 1973,
    title: 'KUKA builds FAMULUS — first 6-axis robot',
    description:
      "Germany's KUKA introduces FAMULUS, the world's first industrial robot with six electromechanically driven axes. The template every modern industrial arm follows.",
    category: 'invention',
    icon: '🦾',
    countryFlag: '🇩🇪',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "In 1973, in the southern German city of Augsburg, KUKA — a company that had been making welding equipment since 1898 — built FAMULUS. It was the world's first industrial robot with six electromechanically driven axes. Until then, industrial robots used hydraulics, which were strong but messy, noisy, and imprecise. Electric servomotors with feedback were the breakthrough. FAMULUS had 6 degrees of freedom — three for positioning the tool in space, three for orienting it. That layout — shoulder, elbow, wrist — became the template every modern industrial arm follows, from KUKA's own iconic orange robots to Fanuc, ABB, Yaskawa, and Universal Robots. FAMULUS could repeat positions to ±0.5 mm precision. Today's robots reach ±0.02 mm using the same fundamental architecture. KUKA went on to become one of the global Big Four industrial-robot makers and was acquired by China's Midea Group in 2016 for $4.6 billion. But the engineering template that defines the industry started with FAMULUS.",
    whyItMattered: [
      "Defined the 6-axis serial-arm template still used in every industrial robot today.",
      "Made electric servos the standard, displacing noisy and messy hydraulics.",
      "Established KUKA as a global Big Four robotics manufacturer (with Fanuc, ABB, Yaskawa).",
    ],
    robotSlug: 'kuka-kr',
  },
  {
    year: 1974,
    title: 'ABB installs first microprocessor-controlled robot',
    description:
      "Sweden's ASEA (later ABB) deploys the IRB 6 — the world's first all-electric, microprocessor-controlled industrial robot. Faster, more precise, lower-maintenance than hydraulics.",
    category: 'invention',
    icon: '⚙️',
    countryFlag: '🇸🇪',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 1974 the Swedish electrical giant ASEA (now ABB) shipped the IRB 6 — the world's first all-electric, microprocessor-controlled industrial robot. While KUKA's FAMULUS the prior year had electric drives, ASEA's robot was the first to put a microprocessor in charge of the motion. That gave it programmable speed profiles, real-time trajectory blending, and the ability to receive new programmes over a serial link instead of by physical teach-and-record. The IRB 6 could carry 6 kg, repeat to 0.1 mm, and reach in a sphere of 0.9 m. It found work primarily in welding and material handling for Swedish carmakers Volvo and Saab. ASEA later merged with Brown Boveri to form ABB Group in 1988. Today ABB is one of the global Big Four industrial-robot manufacturers (alongside Fanuc, KUKA, Yaskawa), with over 500,000 robots installed worldwide. The IRB 6 sits in the Swedish National Museum of Science and Technology. Microprocessor control was the bridge from mechanical robotics to software robotics.",
    whyItMattered: [
      "First robot to be controlled by a microprocessor — software, not cams, now ran the motion.",
      "Established Swedish leadership in robotics, eventually anchoring ABB Group.",
      "Set the path from teach-and-record to programmable, networked robotic motion.",
    ],
  },
  {
    year: 1977,
    title: 'Star Wars releases R2-D2 and C-3PO',
    description:
      "Star Wars makes robots culturally iconic worldwide. R2-D2 and C-3PO inspire an entire generation of children to become roboticists.",
    category: 'film',
    icon: '✨',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "In May 1977, a low-budget space-opera film called Star Wars opened in 32 American cinemas. By the end of the year it had become the highest-grossing film in history. Among its breakout stars were two robots: a chirping astromech named R2-D2 and a fussy, gold-plated protocol droid called C-3PO. George Lucas had wanted his robots to feel like a married couple — old, dented, lived-in, full of personality. Industrial designer Ralph McQuarrie and prop-maker John Stears created costumes for two actors (Kenny Baker inside R2, Anthony Daniels inside C-3PO). The decision to give them character — not just function — changed how the world imagines robots. Before Star Wars, screen robots were menacing and metallic. After, they were companions. An entire generation of roboticists, including the founders of iRobot, Boston Dynamics, and many ROS-community lead contributors, cite R2-D2 and C-3PO as the reason they entered the field. Every cute consumer robot built since — Roomba, AIBO, Cozmo, Sphero BB-8 — owes them a debt.",
    whyItMattered: [
      "Reframed robots from menacing machines to friendly companions in popular culture.",
      "Inspired the founding teams of iRobot, Boston Dynamics, and dozens of robotics startups.",
      "Every modern consumer robot built after 1977 borrows from R2-D2's and C-3PO's design language.",
    ],
  },
  {
    year: 1979,
    title: 'Stanford Cart crosses a room — in 5 hours',
    description:
      "Hans Moravec's improved Stanford Cart crosses a chair-filled room autonomously, taking 5 hours and stopping every metre to think. A landmark in autonomous navigation.",
    category: 'invention',
    icon: '🚗',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 1979 Hans Moravec finished his PhD work at Stanford by getting the Stanford Cart — the same wheeled robot from 1970 — to autonomously cross a chair-filled room. It took five hours. The Cart stopped every metre, took nine stereo photographs of its surroundings, sent them to a mainframe computer, waited for the computer to extract a sparse 3D map and plan a path around the chairs, then crept ahead. Five hours later it had crossed a 20-metre room and bumped one chair. It was a triumph. To get there Moravec had to invent or refine stereo-vision algorithms, sparse 3D mapping, and discrete A*-style search — work that anchors his 1980 PhD thesis, still cited by every visual-SLAM paper today. Moravec went on to co-found the Robotics Institute at Carnegie Mellon University, where he led the team that produced the first dynamically stable bipedal walking algorithms. The Cart, slow as it was, is the direct ancestor of every modern autonomous-vehicle perception stack.",
    whyItMattered: [
      "Proved camera-only autonomous navigation was algorithmically feasible.",
      "Moravec's PhD thesis seeded a generation of stereo-vision and SLAM research.",
      "Set up the founding of CMU's Robotics Institute, which became a global powerhouse.",
    ],
  },
  {
    year: 1981,
    title: 'Takeo Kanade builds the direct-drive robot arm',
    description:
      "CMU's Takeo Kanade pioneers the direct-drive arm — eliminating gear backlash and enabling fast, precise robotic motion.",
    category: 'invention',
    icon: '🔧',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 1981 at Carnegie Mellon University's brand-new Robotics Institute, Takeo Kanade built the CMU Direct Drive Arm. Until then, industrial robot arms used gear reductions to convert motor speed into joint torque — efficient but with backlash, friction, and lag. Kanade's arm coupled motors directly to the joints. The motors were much larger, but the arm could move fast, smoothly, and precisely with virtually no lost motion. The DD Arm could accelerate at up to 3g and trace fine trajectories at high speed. It is widely credited as the first robot capable of really agile motion. Direct-drive technology later showed up in pick-and-place robots, semiconductor handlers, and modern haptic devices. Kanade went on to become one of the most cited robotics researchers in history; today he is a professor emeritus at CMU and a former director of the Robotics Institute. His students populate top robotics labs at Stanford, MIT, Boston Dynamics, and elsewhere. The direct-drive arm sits in CMU's Newell-Simon Hall as a teaching piece.",
    whyItMattered: [
      "Pioneered direct-drive actuation — the foundation of modern fast, precise robotic motion.",
      "Established CMU's Robotics Institute as a global leader.",
      "Trained dozens of researchers who now lead the world's top robotics labs.",
    ],
  },
  {
    year: 1984,
    title: 'The Terminator releases',
    description:
      "James Cameron's The Terminator imprints the killer-robot narrative on global culture. The robot apocalypse becomes a recurring theme in films and AI policy debates.",
    category: 'film',
    icon: '🎬',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "James Cameron's 1984 film The Terminator launched on a tight budget of $6.4 million and a script Cameron wrote in a Rome hotel after a fever dream. It went on to earn $78 million globally and birth one of cinema's most enduring franchises. The film centred on a robot assassin sent back in time to kill the mother of a future resistance leader. Played by Arnold Schwarzenegger, the Terminator was relentless, expressionless, and indestructible. Its bone-chilling menace cemented a cultural image that has shaped AI-policy debates ever since: robots as existential threat. The metaphor of \"Skynet\" — an AI that turns on humanity — appears in serious policy papers, academic AI-safety discussions, and even in EU AI Act drafting notes. The film also pushed special-effects boundaries with practical animatronics, stop-motion, and early computer-generated imagery. James Cameron went on to produce Terminator 2 (1991), which broke new ground with the liquid-metal T-1000 — perhaps the most-cited single CGI character of the 20th century.",
    whyItMattered: [
      "Imprinted the killer-robot narrative on global culture; \"Skynet\" became shorthand for AI risk.",
      "Pioneered practical-and-CGI hybrid robotic visual effects.",
      "Continues to shape public and policy debates about AI safety 40+ years later.",
    ],
  },
  {
    year: 1986,
    title: 'Honda begins secret humanoid research (Project E)',
    description:
      'Honda starts Project E — a 14-year secret programme to build a bipedal humanoid robot. The world will not see the results until 2000.',
    category: 'invention',
    icon: '🤫',
    countryFlag: '🇯🇵',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 1986 Honda Motor Company began what would become one of the most secretive corporate research programmes in robotics history. Internally called Project E (E for \"Experimental\"), the goal was simple in concept and audacious in execution: build a humanoid robot that could walk like a person. Honda's engineers spent the first three years just studying human walking — biomechanics, balance, joint torques, ground-reaction forces. From 1989 they built a series of prototypes named E0 through E6. E0 (1986) had two legs and could shuffle. E2 (1990) could walk forwards. E6 (1993) achieved dynamic walking, but was tethered to power and computers. The first self-contained walker, P1, came in 1993, weighing 175 kg. By 1996, P2 — a fully self-contained bipedal humanoid — was unveiled to a shocked robotics community. Honda had spent nearly $1 billion on the programme; the world had no idea. The decade-and-a-half-secret programme is unrivalled in robotics history. It culminated in ASIMO in 2000.",
    whyItMattered: [
      "Created the engineering foundation for every modern humanoid robot.",
      "Demonstrated the scale of resources — a billion dollars over 14 years — needed for serious humanoid work.",
      "Inspired follow-on programmes at Toyota, Sony, and Boston Dynamics.",
    ],
  },
  {
    year: 1989,
    title: 'Rodney Brooks publishes the Subsumption Architecture',
    description:
      "MIT's Rodney Brooks publishes papers arguing for reactive, layered control of robots — rejecting brittle symbolic AI. This inspires today's behaviour-based robot designs.",
    category: 'invention',
    icon: '📐',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In a 1989 paper titled \"A Robust Layered Control System for a Mobile Robot\", MIT's Rodney Brooks proposed a radical rethink of robotic intelligence. The dominant paradigm at the time — symbolic AI based on models, plans, and logical reasoning — produced robots that worked beautifully in simulation but froze in the real world. Brooks argued that intelligence should emerge from layers of reactive, sensorimotor behaviours stacked on top of each other. Lower layers (avoid obstacles) ran continuously and unconditionally. Higher layers (explore, wander) could suppress or modulate them when needed. No central planner. No world model. Just behaviour. The approach was instantly controversial — and instantly produced robots that worked. Brooks's lab at MIT built Genghis, an insect-like hexapod that walked over uneven terrain using only six legs of reactive behaviours. The Subsumption Architecture went on to influence Roomba (Brooks co-founded iRobot in 1990), every modern behaviour-tree-based robot, and even modern reinforcement-learning policies that share its bottom-up philosophy.",
    whyItMattered: [
      "Broke the dominance of symbolic AI in robotics, replacing it with bottom-up reactive design.",
      "Directly inspired Roomba and the entire behaviour-based-robotics field.",
      "Modern behaviour trees and RL policies still echo subsumption ideas.",
    ],
  },
  {
    year: 1995,
    title: 'AIBO development begins at Sony',
    description:
      'Sony begins development of AIBO, its robotic dog project. It will launch in 1999 as the first commercially successful consumer robot.',
    category: 'invention',
    icon: '🐕‍🦺',
    countryFlag: '🇯🇵',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 1995, deep inside Sony's research labs in Tokyo, an engineer named Toshitada Doi convinced senior leadership to fund a long-shot consumer-robotics project. Doi was a star inside Sony — he had led the CD's development and the PlayStation hardware. He wanted to make a robot pet. The internal name was AIBO, short for \"Artificial Intelligence roBOt\" (and a near-homophone for the Japanese word for \"companion\"). The team spent four years iterating on form, behaviour, and price. They needed a robot that could survive being dropped by a child, run for hours on a battery, and develop a personality the family would bond with. By 1999 the ERS-110 — a six-kilogram, dog-shaped, fully autonomous robot — was ready. Sony took a risk and launched it: 3,000 units sold out in 20 minutes at ¥250,000 (about $2,500) each. AIBO was the first commercially successful consumer robot in history and launched a category — robot pets — that still grows today.",
    whyItMattered: [
      'Set the stage for AIBO\'s 1999 launch — the first commercially successful consumer robot.',
      "Demonstrated to Sony and others that consumer robotics was a viable category.",
      "Trained a Sony team that later contributed to robotics across the Japanese industry.",
    ],
  },
  {
    year: 1996,
    title: 'Honda reveals P2 — first self-contained bipedal humanoid',
    description:
      'Honda unveils P2 — the first self-contained, untethered humanoid robot able to walk on two legs. The robotics community is shocked: nobody thought Honda was building this in secret.',
    category: 'invention',
    icon: '🚶',
    countryFlag: '🇯🇵',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 20 December 1996, Honda invited journalists to an industrial campus in Wakō, Saitama and pulled the cover off a 1.8-metre, 210-kilogram humanoid robot called P2. To the world's collective shock, P2 walked. It walked unaided across the stage, climbed stairs, and pushed a cart. It carried its own batteries (130 kg of them), its own computers, and balanced itself entirely autonomously. The robotics community had no idea Honda was building this. The 11 years of Project E secrecy had paid off. P2 used hydraulic actuation, harmonic-drive gears at every joint, an early IMU plus force sensors in the feet, and a proprietary balance algorithm now widely studied. It was the first fully self-contained bipedal humanoid in history. Honda's P2 reveal triggered a global humanoid race — Sony, Toyota, MIT, and the U.S. Department of Defense all launched their own programmes within years. P2 itself was succeeded by P3 (1997), and ultimately by ASIMO in 2000. Honda spent an estimated $300 million on the P-series alone.",
    whyItMattered: [
      "First fully self-contained bipedal humanoid in history — no tether, no external computer.",
      "Triggered a global humanoid race; almost every major economy launched a humanoid programme within five years.",
      "Set the engineering template still used in Boston Dynamics Atlas, Tesla Optimus, and Figure 02.",
    ],
    robotSlug: 'asimo',
  },
  {
    year: 1997,
    title: 'NASA Sojourner lands on Mars',
    description:
      'NASA Pathfinder delivers the Sojourner rover to Mars — the first planetary rover. It operates for 83 days, far beyond its 7-day mission, and proves robotic Mars exploration is possible.',
    category: 'space',
    icon: '🪐',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Mars_pathfinder_airbag_test.jpg/440px-Mars_pathfinder_airbag_test.jpg',
    fullArticle:
      "On 4 July 1997 — American Independence Day — a stationary spacecraft called Pathfinder bounced to a halt on the surface of Mars. It was wrapped in airbags. As the airbags deflated, a small ramp unfolded, and a 10.6-kg, 65-cm-long, six-wheeled robot rolled down it. Her name was Sojourner. She was the first wheeled robot to operate on another planet. Sojourner was driven from Earth — but with a 22-minute round-trip communication delay, she had to make most decisions herself. She used hazard-avoidance software to navigate around rocks. Her mission was planned to last seven Martian days (sols). She lasted 83. During that time she travelled 100 metres, took 550 photographs, and analysed 16 rocks with her alpha-proton-X-ray spectrometer. She was the first member of a NASA rover family that now includes Spirit (2004), Opportunity (2004), Curiosity (2012), and Perseverance (2021). The Pathfinder/Sojourner mission also pioneered the cheaper, faster, better approach to Mars science that defines NASA today.",
    whyItMattered: [
      "First wheeled robot to operate on another planet — the start of NASA's rover dynasty.",
      "Pioneered low-cost \"faster, better, cheaper\" Mars science that still shapes NASA today.",
      "Inspired ISRO's Pragyan lunar rover and a generation of planetary roboticists worldwide.",
    ],
    robotSlug: 'curiosity',
  },
  {
    year: 1997,
    title: 'Deep Blue defeats Garry Kasparov',
    description:
      "IBM's Deep Blue beats world chess champion Garry Kasparov — the first time a computer defeats a reigning champion under tournament conditions. AI's public moment.",
    category: 'ai',
    icon: '♟️',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "On 11 May 1997, in a Manhattan hotel ballroom, world chess champion Garry Kasparov resigned his sixth game against an IBM computer called Deep Blue. The 6-game tournament ended 3½–2½ in the machine's favour. It was the first time a reigning world champion had been defeated by a computer under tournament conditions. Deep Blue was a 1.4-ton purpose-built supercomputer with 30 specialised chess processors. It evaluated 200 million chess positions per second using a combination of brute-force search and hand-crafted heuristics tuned by IBM engineers and chess grandmasters. Kasparov claimed the system showed surprising creativity in game 2 and suspected human intervention — a controversy IBM denied and that subsequent analysis dismissed. The match was a defining moment for public perception of AI. Although Deep Blue was not a robot in the embodied sense, the symbolism was overwhelming: a machine had beaten the world's best at chess. Twenty years later, AlphaGo would do the same for Go, and twenty-five years on, large language models would do it for general reasoning tasks.",
    whyItMattered: [
      "First public defeat of a reigning world champion by a computer at a major intellectual game.",
      "Marked a turning point in how the public understood AI capability.",
      "Inspired the chain of AI/games milestones from AlphaGo (2016) to LLMs (2022–2026).",
    ],
  },
  {
    year: 1998,
    title: 'iRobot is founded',
    description:
      "Three MIT roboticists — Rodney Brooks, Colin Angle, and Helen Greiner — found iRobot to commercialise practical robots. Will go on to ship the Roomba in 2002.",
    category: 'milestone',
    icon: '🏢',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 1990, three roboticists from MIT's AI Lab — Rodney Brooks, Colin Angle, and Helen Greiner — incorporated a company called IS Robotics. The early years were lean. The company built bomb-disposal robots for the US Army (the PackBot, used extensively in Iraq and Afghanistan), planetary rover prototypes for NASA, and toy robots licensed to Hasbro. None made the company rich. The strategic shift came in 1998, when the company rebranded as iRobot and committed to selling robots directly to consumers. Their hypothesis — that ordinary households would buy autonomous robots that did useful work — was unproven. It took four years to design, build, and ship the Roomba (September 2002, $199). The first batch sold out by Christmas. Within five years, iRobot had sold a million Roombas. The company went public in 2005, became the first robotics IPO since the 1980s, and effectively created the entire consumer-robot category. Rodney Brooks, Colin Angle, and Helen Greiner are now legendary names in robotics.",
    whyItMattered: [
      "Created the modern consumer robotics market with the Roomba.",
      "Founded by MIT figures who would shape robotics teaching, research, and entrepreneurship for decades.",
      "iRobot's PackBot saved hundreds of soldiers' lives in Iraq and Afghanistan via EOD missions.",
    ],
  },
  {
    year: 1999,
    title: 'Sony AIBO launches — first mass-market consumer robot',
    description:
      "Sony's AIBO robotic dog launches at ¥250,000. The first batch of 3,000 sells out in 20 minutes. The home-robot category is born.",
    category: 'invention',
    icon: '🐶',
    countryFlag: '🇯🇵',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 11 May 1999 Sony launched the AIBO ERS-110 — a 6 kg, dog-shaped, fully autonomous robot — through its Japanese online store. The price was ¥250,000 (about $2,500). The first 3,000 units sold out in 20 minutes. AIBO had emotional expressiveness, four-leg walking, head-mounted camera, sound and touch sensors, and a personality engine that evolved based on how the owner interacted with it. Over its first generation, AIBO sold more than 150,000 units globally. Sony discontinued AIBO in 2006 when company priorities shifted to PlayStation and music, but a major fan community kept old units running by trading replacement parts on online forums. Twelve years later, in 2018, Sony relaunched AIBO as the ERS-1000, with a 22-axis body, OLED eyes, cloud-connected memory, and 4G connectivity. It found a new buyer base — including many older customers buying it as a companion for ageing parents. The original 1999 launch is recognised as the moment consumer robotics became commercially real.",
    whyItMattered: [
      'First commercially successful consumer robot in history.',
      "Created the robot-pet category, which Sony, Hanson, and many others still extend today.",
      "Demonstrated that consumers will pay premium prices for emotionally engaging robots.",
    ],
    robotSlug: 'aibo',
  },
  {
    year: 2000,
    title: 'Honda unveils ASIMO',
    description:
      "Honda reveals ASIMO — the most advanced humanoid robot of its time. It walks, runs at 9 km/h, climbs stairs, and recognises voices. ASIMO defines the public image of robotics for two decades.",
    category: 'invention',
    icon: '🚶',
    countryFlag: '🇯🇵',
    isKeyMilestone: true,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/HONDA_ASIMO.jpg/440px-HONDA_ASIMO.jpg',
    fullArticle:
      "On 31 October 2000, Honda introduced ASIMO — \"Advanced Step in Innovative Mobility\". Standing 130 cm tall and weighing 54 kg, ASIMO walked, ran, climbed stairs, recognised faces and voices, conversed in multiple languages, and even kicked a football. It was the public face of robotics for nearly two decades. ASIMO was the direct descendant of Honda's 14-year Project E secret research programme (1986–2000) and its P-series prototypes. The robot used 57 servomotor joints, lithium-ion batteries giving 1 hour of operation, and an onboard vision system based on stereo cameras. ASIMO toured science museums and corporate events around the world, sometimes appearing on stage with politicians and CEOs. Honda built about 100 ASIMOs over the years. The programme was officially retired in 2018 — Honda redirected its energy toward more practical mobility robots — but ASIMO's engineering foundations live on in every modern humanoid robot. Today there is one final ASIMO operating in Tokyo's Miraikan museum, beside an exhibit explaining how it changed robotics.",
    whyItMattered: [
      "Defined the public image of robotics for nearly two decades.",
      "Set engineering standards for humanoid balance, gait, and human-robot interaction.",
      "Inspired Boston Dynamics Atlas, Tesla Optimus, and Figure 02 directly.",
    ],
    robotSlug: 'asimo',
  },
  {
    year: 2001,
    title: 'da Vinci Surgical System receives FDA approval',
    description:
      "Intuitive Surgical's da Vinci robot gets FDA approval. Robotic surgery begins. The system will go on to perform over 10 million procedures worldwide.",
    category: 'invention',
    icon: '🏥',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 17 July 2000 the U.S. Food and Drug Administration approved a robotic surgical system called da Vinci, made by Intuitive Surgical of California. By 2001 hospitals were beginning routine deployments. The da Vinci system is a teleoperated robot: a surgeon sits at a console a few feet from the operating table, looks into a stereo 3D display showing magnified video from inside the patient, and controls two or four robotic arms with finger and foot controls. Inside the patient, small EndoWrist instruments (8 mm in diameter, 7 degrees of freedom) replicate the surgeon's hand motions but with tremor filtering and motion scaling. The result: surgery through tiny incisions, less blood loss, faster recovery. By 2026 the worldwide installed base exceeds 9,000 systems and the platform has performed over 14 million procedures across urological, gynaecological, cardiac, and abdominal surgery. Indian hospitals now operate over 130 da Vinci systems. Intuitive Surgical has a market cap exceeding $130 billion. The da Vinci system is the most successful medical robot in history.",
    whyItMattered: [
      "Launched the modern era of robotic surgery; 14+ million procedures and counting.",
      "Created a $130B+ company — proving robotics can be a hugely lucrative healthcare market.",
      "Inspired the entire field of teleoperated surgical robotics now in cardiac, neuro, and orthopaedics.",
    ],
    robotSlug: 'da-vinci',
  },
  {
    year: 2002,
    title: 'iRobot ships the Roomba — robots enter the home',
    description:
      'iRobot launches the Roomba vacuum at $199 — the first mass-market household robot. Over 40 million Roombas will eventually sell, creating the robot-vacuum category.',
    category: 'invention',
    icon: '🧹',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/IRobot_Roomba_761.jpg/440px-IRobot_Roomba_761.jpg',
    fullArticle:
      "In September 2002 iRobot — a 12-year-old MIT-spinoff with a history of military and toy robotics — shipped the first Roomba. It cost $199, was a flat disc, and used simple bump-and-spiral navigation to vacuum floors autonomously. The first batch sold out by Christmas. The Roomba was revolutionary because of what it left out: no LIDAR, no SLAM, no fancy planning. Just bumper sensors, cliff sensors, and a clever covering algorithm. It Was Good Enough. Over the next two decades the Roomba evolved through more than 20 generations, adding visual SLAM, smart-mapping, self-emptying docks, and integration with Alexa and Google Home. By 2024 over 40 million Roombas had been sold. It defined the entire robot-vacuum category and inspired competitors like Roborock, Ecovacs, Eufy, and Xiaomi. The Roomba is, by units sold, the most successful robot in history. iRobot was acquired by Amazon in 2022 (deal later abandoned in 2024). The 2002 launch is when robotics quietly entered the average household.",
    whyItMattered: [
      "Most-sold robot in history by units (40M+) — robotics entered the average household.",
      "Created the robot-vacuum category, now a multi-billion-dollar industry.",
      "Proved \"good enough\" robotics can beat over-engineered solutions in consumer markets.",
    ],
    robotSlug: 'roomba',
  },
  {
    year: 2004,
    title: 'DARPA Grand Challenge launches',
    description:
      "DARPA holds its first Grand Challenge — a 142-mile autonomous-car race across the Mojave Desert. No team finishes, but the event catalyses the autonomous-vehicle industry.",
    category: 'invention',
    icon: '🏁',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "On 13 March 2004, 15 autonomous vehicles lined up in the Mojave Desert for the first DARPA Grand Challenge. The prize was $1 million. The route was 142 miles across rough desert terrain. No team finished. The leading vehicle (Carnegie Mellon's Sandstorm) crashed after 7.4 miles. The race was widely declared an embarrassment. But it was actually a triumph. DARPA's bet — that prize-driven competition could ignite an industry — paid off spectacularly. Within 18 months the second Grand Challenge (October 2005) saw five teams complete a 132-mile course; Stanford's Stanley won. The 2007 Urban Challenge added city driving. The teams behind these efforts went on to found Waymo (Google's autonomous-car project), Cruise, Argo AI, Aurora, and dozens of other autonomous-vehicle companies. The first Grand Challenge is now widely cited as the moment the autonomous-vehicle industry was born. Today the global AV industry is worth tens of billions of dollars and employs tens of thousands of engineers — many of them direct alumni of those early DARPA races.",
    whyItMattered: [
      "Launched the modern autonomous-vehicle industry through prize-driven innovation.",
      "Trained the leadership of Waymo, Cruise, Aurora, Argo AI, and dozens of AV startups.",
      "Established DARPA challenges as a model for catalysing robotics fields.",
    ],
  },
  {
    year: 2005,
    title: 'Boston Dynamics founded (DARPA funding)',
    description:
      'Marc Raibert founds Boston Dynamics out of MIT, with DARPA funding for the BigDog quadruped programme. The company becomes the world\'s most famous legged-robotics lab.',
    category: 'milestone',
    icon: '🏢',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "Marc Raibert spent the 1980s and 1990s at CMU and then MIT making robots that could hop, run, and balance — work that fundamentally shaped legged robotics. In 1992 he founded Boston Dynamics as a research spinoff. For its first decade the company focused on simulation software. The pivot came in 2005 when DARPA awarded BD a contract for the BigDog programme: build a quadruped that could carry military gear over rough terrain. BigDog (2005), LittleDog (2007), Cheetah (2012), Atlas (2013), SpotMini (2016), and Spot (2019) followed in rapid succession, each becoming a viral YouTube sensation. Boston Dynamics became the most famous robotics lab in the world. Google acquired the company in 2013, sold it to SoftBank in 2017, and SoftBank sold it to Hyundai in 2020 for $1.1 billion. Today Boston Dynamics is a Hyundai subsidiary, with Spot in commercial deployment, the new electric Atlas working in factories, and the Stretch warehouse robot in production. Marc Raibert remains chairman.",
    whyItMattered: [
      "Became the world's most famous robotics lab; brand-defined what robots are in public imagination.",
      "Trained dozens of leg-robotics researchers who went on to ETH, Apptronik, Figure, and Agility.",
      "Built the engineering foundation for Spot, Atlas, and the modern humanoid industry.",
    ],
    robotSlug: 'spot',
  },
  {
    year: 2006,
    title: 'KIVA Systems founded (later Amazon Robotics)',
    description:
      "Mick Mountz founds KIVA Systems to automate warehouses. Amazon will buy KIVA for $775M in 2012 and turn it into Amazon Robotics — now 750,000+ robots strong.",
    category: 'milestone',
    icon: '📦',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "Mick Mountz worked at Webvan, an early dot-com grocery-delivery startup. When Webvan collapsed in 2001, Mountz had spent two years inside its warehouses watching humans walk 15-25 kilometres per shift to pick orders. He left convinced that warehouses needed to be redesigned around robots, not humans. In 2003 he founded KIVA Systems in Massachusetts. The KIVA insight was simple but radical: instead of humans walking to shelves, send shelves walking to humans. KIVA's orange wheeled robots ducked under 1,000-kg shelf pods, lifted them, and delivered them to human pickers standing at fixed stations. Warehouse throughput increased 4×. The robots became one of the most innovative warehouse technologies of the decade. Amazon, KIVA's biggest customer, bought the company in 2012 for $775 million — at the time the largest robotics acquisition ever. Amazon kept KIVA's technology proprietary for years, rebranded it Amazon Robotics, and by 2025 operated over 750,000 mobile warehouse robots worldwide. KIVA also inspired India's GreyOrange Butler and dozens of similar systems globally.",
    whyItMattered: [
      "Pioneered the shelf-to-picker warehouse model now used by Amazon, Flipkart, and global retailers.",
      'Created the largest robot fleet in human history — 750,000+ Amazon robots.',
      "Inspired India's GreyOrange Butler, Locus Robotics, and the entire AMR industry.",
    ],
    robotSlug: 'grey-orange-butler',
  },
  {
    year: 2008,
    title: 'Universal Robots ships UR5 — the cobot is born',
    description:
      "Universal Robots launches the UR5 — the first commercially successful collaborative robot. Small factories can finally automate without safety cages or PhD engineers.",
    category: 'invention',
    icon: '🤝',
    countryFlag: '🇩🇰',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "In 2005, three PhD students in Odense, Denmark — Esben Østergaard, Kasper Støy, and Kristian Kassow — founded Universal Robots with a thesis: industrial robots were too expensive, too dangerous, and too hard to programme for the average factory. Three years later, in 2008, they shipped the UR5. It weighed 18 kg, had a 5 kg payload, an 850 mm reach, and cost €20,000 — a fraction of the price of a comparable industrial arm. Two innovations made it special. First, force sensors in every joint let it stop instantly on contact, eliminating the need for a safety cage. Second, an operator could programme it by physically grabbing the wrist and moving it through positions — no PhD needed. The UR5 inaugurated the collaborative-robot (cobot) category. By 2026, Universal Robots had shipped over 75,000 cobots, the company had been acquired by Teradyne for $285 million (one of the great robotics bargains in hindsight), and the cobot category had expanded to dozens of competitors including ABB YuMi, FANUC CRX, and Doosan.",
    whyItMattered: [
      "Created the entire collaborative-robot category, now multi-billion dollar.",
      "Made industrial robotics accessible to SMEs by eliminating safety cages and PhD-level programming.",
      "Trained Indian system integrators (Difacto, Addverb) and seeded the SME-automation boom.",
    ],
    robotSlug: 'ur5',
  },
  {
    year: 2008,
    title: 'Aldebaran releases NAO',
    description:
      "French company Aldebaran Robotics releases NAO — a 58 cm programmable humanoid. NAO becomes the standard educational humanoid in 13,000+ schools and labs worldwide.",
    category: 'invention',
    icon: '🤖',
    countryFlag: '🇫🇷',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "Aldebaran Robotics, founded in Paris in 2005 by Bruno Maisonnier, set out to build a humanoid robot small enough and cheap enough for universities and schools. The result was NAO: a 58 cm, 5.4 kg, 25-degree-of-freedom programmable humanoid. NAO walked, danced, recognised faces and voices, and could be programmed in Python or C++ via the proprietary Choregraphe IDE. The first units shipped in 2008. Within a decade NAO became the world's most-used educational humanoid, deployed in 13,000+ schools and research labs across 70+ countries. NAO is also the official robot of the RoboCup Standard Platform League, where teams of NAO robots play autonomous football against each other in international tournaments. SoftBank Robotics acquired Aldebaran in 2012 and ran the NAO product line alongside its larger Pepper service robot. Although mass production of new NAOs paused around 2020, the existing fleet continues to inspire students and to serve as a research platform. Many of today's senior robotics researchers built their first humanoid skills on NAO.",
    whyItMattered: [
      "Most widely deployed educational humanoid robot in history.",
      "Standardised RoboCup Standard Platform League, where thousands of students learn humanoid robotics.",
      "Trained a generation of researchers — many leading labs now have NAO alumni.",
    ],
    robotSlug: 'nao',
  },
  {
    year: 2009,
    title: 'DRDO Daksh inducted into Indian Army',
    description:
      "India's DRDO begins inducting Daksh — an indigenous bomb-disposal robot — into the Indian Army. India's defence robotics programme takes a major step forward.",
    category: 'india',
    icon: '🛡️',
    countryFlag: '🇮🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 2009 the Indian Army began inducting Daksh — an indigenous explosive-ordnance-disposal (EOD) robot — into active service. Daksh (Sanskrit for \"skilled\" or \"competent\") was developed by DRDO's R&D Establishment (Engineers) in Pune. The robot is a tracked, remotely-operated platform weighing 360 kg with a multi-joint manipulator arm, an X-ray scanner for inspecting suspicious objects, and a water-jet disrupter for safely defusing explosives. It can climb stairs, ford shallow water, and operate up to 1 km from its control station. The Indian Army has deployed Daksh extensively in Jammu and Kashmir, the North-East, and during VIP movements. By 2026 over 250 Daksh units are in service. Each robot has reportedly responded to thousands of suspicious-object calls. The programme is a flagship of India's indigenous defence robotics and is widely cited as a Make-in-India success story. Follow-on EOD platforms — DRDO\\'s NETRA, MUNTRA, and various drone systems — extend the Daksh legacy.",
    whyItMattered: [
      "First Indian Army-inducted indigenous robot, proving Indian defence robotics could match imports.",
      "Set the template for the Make-in-India robotics push in defence.",
      "Has saved an estimated hundreds of lives across thousands of EOD missions.",
    ],
    robotSlug: 'drdo-daksh',
  },
  {
    year: 2011,
    title: 'IBM Watson wins Jeopardy!',
    description:
      "IBM's Watson defeats human champions on Jeopardy! — a public demonstration that AI can handle natural-language reasoning. AI and robotics begin to converge.",
    category: 'ai',
    icon: '🧠',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In February 2011 IBM's Watson — a computer system the size of a small server room — defeated Ken Jennings and Brad Rutter, the two greatest Jeopardy! champions in history. Watson won $1 million; it answered questions involving puns, wordplay, and obscure trivia faster and more accurately than the humans. Watson was not a single algorithm but a hybrid system: parallel question-answering pipelines, statistical NLP, structured knowledge bases (including Wikipedia), and a confidence-scoring layer that decided when to buzz in. After Jeopardy!, IBM tried to commercialise Watson for healthcare, finance, and customer service. Many of those efforts struggled — Watson was deeply customised to its task and didn't generalise easily. But the cultural impact was huge. Watson signalled that computers could play in the natural-language space, foreshadowing the LLM revolution that arrived 11 years later with ChatGPT. The 2011 win is now seen as a key moment in the AI–robotics convergence: language-capable AI plus embodied robots would eventually combine into the foundation-model robotics of 2025–2026.",
    whyItMattered: [
      "First widely seen demonstration of computer mastery over natural-language reasoning.",
      "Foreshadowed the LLM revolution that arrived 11 years later.",
      "Signalled to robotics researchers that language was about to become solvable.",
    ],
  },
  {
    year: 2011,
    title: 'GreyOrange is founded in India',
    description:
      "IIT alumni Samay Kohli and Akash Gupta found GreyOrange in Gurgaon — building warehouse robots in India. Will become India's flagship robotics unicorn.",
    category: 'india',
    icon: '🇮🇳',
    countryFlag: '🇮🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "Samay Kohli and Akash Gupta met as BITS Pilani students. They built a humanoid robot called Acyut for an international robotics competition that gave them an unforgettable lesson: building robots in India was hard but not impossible. After graduating they founded GreyOrange in Gurgaon in 2011. The original plan was service robots for retail. The pivot to warehouse automation came when they saw Flipkart and Amazon India's fulfilment-centre pain points. GreyOrange's Butler — an autonomous mobile robot (AMR) that lifts shelf pods up to 1,000 kg — went into production in 2014. Flipkart deployed a 100-robot fleet at its Pune warehouse, growing to over 600 by 2026. Customers expanded to global names: Walmart, H&M, DHL, Active Ants. GreyOrange achieved unicorn status (over $1 billion valuation) in 2021. It is widely cited as India's flagship robotics company and a proof point that India can build globally competitive robotics businesses — not just import them.",
    whyItMattered: [
      "India's first robotics unicorn, with $1B+ valuation in 2021.",
      "Proved Indian companies can compete globally in industrial robotics.",
      "Trained hundreds of Indian robotics engineers who now lead other Indian robotics firms.",
    ],
    robotSlug: 'grey-orange-butler',
  },
  {
    year: 2012,
    title: 'Boston Dynamics Cheetah runs at 29 mph',
    description:
      "Boston Dynamics' Cheetah quadruped breaks the land-speed record for legged robots — 28.3 mph. Robots officially out-sprint Usain Bolt.",
    category: 'invention',
    icon: '🐆',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "On 5 September 2012 Boston Dynamics's quadruped Cheetah robot was clocked running 28.3 mph on a treadmill in their Waltham, Massachusetts lab. The previous robot land-speed record was 13.1 mph, set by MIT's earlier four-legged robot. Cheetah was an MIT-derived design heavily modified by Boston Dynamics, funded by DARPA's M3 (Maximum Mobility and Manipulation) programme. It used hydraulic actuation, an articulated spine that flexed forwards and backwards as it ran (like a real cheetah), and an external power tether (no batteries). The point was to prove pure speed; field-deployment came later. The 28.3 mph milestone exceeded Usain Bolt's average speed during his 100m world-record run (27.79 mph). The robotics community was stunned. Cheetah's successors included WildCat (untethered, 16 mph), and lessons fed directly into the design of Spot and Atlas. By 2017 MIT's separate Cheetah 2 successor jumped over obstacles autonomously. The 2012 record stood as a watershed moment for legged-robot capability.",
    whyItMattered: [
      "Set the land-speed record for legged robots — beating Usain Bolt's average sprint speed.",
      "Validated hydraulic-quadruped design that fed into Spot and Atlas.",
      "Catapulted Boston Dynamics into global headlines and YouTube virality.",
    ],
  },
  {
    year: 2012,
    title: 'NASA Curiosity lands on Mars',
    description:
      'NASA Curiosity rover lands in Gale Crater via the Sky-Crane manoeuvre. It is still operating in 2026 — having driven over 32 km and confirmed Mars was once habitable.',
    category: 'space',
    icon: '🪐',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 6 August 2012 (Pacific time) NASA's Curiosity rover landed on Mars in Gale Crater. The landing was famously called \"seven minutes of terror\" because of the 14-minute Earth-to-Mars communication delay — the entire entry, descent, and landing had to be fully autonomous. Curiosity used a heat shield, a parachute, and finally a rocket-powered \"Sky-Crane\" that hovered over the surface and lowered the 900-kg rover on tethers. Nobody had landed anything that heavy on Mars before. Sky-Crane worked perfectly. Curiosity has been operating ever since. Over more than 13 years it has driven 32+ kilometres, drilled 41+ rock samples, climbed the 5-kilometre-tall Mount Sharp, and confirmed that Mars once had conditions suitable for microbial life. The rover is the size of a small SUV and is powered by a Multi-Mission Radioisotope Thermoelectric Generator (MMRTG) — a small nuclear battery. It is the longest-operating rover on Mars and one of the most successful robotic exploration missions in NASA history. Curiosity is still going strong as of 2026.",
    whyItMattered: [
      "Largest, most sophisticated rover landed on another planet — the Sky-Crane was a robotics first.",
      "Confirmed Mars was once habitable, reshaping understanding of life in the solar system.",
      "Inspired ISRO Chandrayaan-3 and the next generation of planetary roboticists.",
    ],
    robotSlug: 'curiosity',
  },
  {
    year: 2013,
    title: 'Boston Dynamics Atlas unveiled',
    description:
      "Boston Dynamics reveals Atlas — a 6-foot hydraulic humanoid built for the DARPA Robotics Challenge. Atlas becomes the most agile humanoid robot in history.",
    category: 'invention',
    icon: '🤖',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 11 July 2013 Boston Dynamics unveiled Atlas — a 6-foot, 150-kg hydraulic humanoid robot built for the DARPA Robotics Challenge (DRC). The DRC was a programme to develop robots that could perform disaster-response tasks in environments unsafe for humans (the 2011 Fukushima nuclear disaster motivated the challenge). Boston Dynamics built and shipped seven Atlas units to selected research teams; each team programmed their copy independently. The competition ran 2013–2015 with various tasks: driving a vehicle, opening doors, turning valves, climbing stairs. Atlas evolved through multiple generations after the DRC — first hydraulic with external power, then fully self-contained hydraulic, and finally (2024) an entirely electric Atlas designed for production factory work. Boston Dynamics Atlas became famous for viral videos: parkour, backflips, dance routines. In 2024 the new electric Atlas began working at Hyundai's car factories, the first humanoid robot in production manufacturing. Atlas is widely considered the most agile humanoid robot in history. Tesla Optimus and Figure 02 are direct conceptual successors.",
    whyItMattered: [
      "Most agile humanoid robot in history; viral backflip videos shaped public imagination.",
      "DARPA Robotics Challenge platform — Atlas trained the leadership of every modern humanoid startup.",
      "First humanoid in factory production (Hyundai, 2024) — the proof of concept everyone follows now.",
    ],
    robotSlug: 'atlas',
  },
  {
    year: 2013,
    title: 'Amazon acquires Kiva Systems for $775M',
    description:
      "Amazon buys Kiva Systems and renames it Amazon Robotics. Within a decade, Amazon will operate 750,000+ warehouse robots — the largest robot fleet on Earth.",
    category: 'milestone',
    icon: '📦',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In March 2012, Amazon announced it was acquiring Kiva Systems for $775 million in cash — at that time the largest robotics acquisition ever. The deal closed in 2013. Amazon's reasoning was direct: Kiva's robots had cut their fulfilment costs and pickup times so dramatically that Amazon decided to take the technology in-house and stop selling it to competitors. Kiva-existing customers (Staples, Walgreens, others) saw their fleets reach end-of-life without replacements available. The aggressive strategy worked. Amazon rebranded the technology Amazon Robotics and accelerated deployment dramatically. By 2018 Amazon had 100,000 robots. By 2022, 500,000. By 2025, over 750,000 — making Amazon Robotics the largest robot fleet on Earth by a vast margin. Amazon also continued developing new robot designs: Hercules (heavy-lift), Pegasus (sortation), Sparrow (picking with vacuum gripping), Cardinal (large-package palletising), Proteus (autonomous mobile), and Digit (humanoid trials with Agility Robotics). The 2013 acquisition is now studied in business schools as a defining example of robotics-driven competitive advantage.",
    whyItMattered: [
      "Created the largest robot fleet on Earth — 750,000+ Amazon robots by 2025.",
      "Triggered an arms race in warehouse robotics; every major retailer now invests heavily.",
      "Demonstrated robotics could be a multi-billion-dollar competitive moat.",
    ],
  },
  {
    year: 2014,
    title: 'SoftBank launches Pepper',
    description:
      "SoftBank Robotics launches Pepper — the first humanoid designed to read human emotions. Used as a receptionist and customer-service agent worldwide.",
    category: 'invention',
    icon: '👋',
    countryFlag: '🇯🇵',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In June 2014 SoftBank Robotics — newly formed after SoftBank acquired French firm Aldebaran in 2012 — unveiled Pepper. Standing 120 cm tall on a wheeled base and weighing 28 kg, Pepper was the first humanoid robot explicitly designed to read human emotions. Cameras in the head detected faces and facial expressions; microphones detected tone of voice; touch sensors in the head and hands recognised petting and pushing. An emotion engine interpreted these inputs and modulated Pepper's responses — friendly, sad, surprised. SoftBank deployed Pepper as a receptionist in hotels, a customer-service agent in Japanese banks (Mizuho, Bank of Tokyo-Mitsubishi UFJ), a greeter in retail stores, and an entertainer at events. About 27,000 Peppers were sold over the years. SoftBank paused mass production in 2021 due to weak demand, but existing units remain deployed across 2,000+ enterprise sites. Pepper directly inspired Indian social-robot startup Invento Robotics's Mitra. The 2014 launch effectively created the social-humanoid category that Figure 02 and other modern humanoids inherit.",
    whyItMattered: [
      "First humanoid designed to read and respond to human emotions.",
      "Inspired the social-robot category, including India's Invento Robotics Mitra.",
      "Demonstrated that humanoid robots could find real (if narrow) commercial markets.",
    ],
    robotSlug: 'pepper',
  },
  {
    year: 2015,
    title: 'India launches Make in India — robotics included',
    description:
      "India launches the Make in India policy, with robotics as a priority sector. Domestic investment in robotics startups begins to surge.",
    category: 'india',
    icon: '🏭',
    countryFlag: '🇮🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "On 25 September 2014 the Government of India launched Make in India, an initiative designed to encourage domestic manufacturing across 25 priority sectors — including robotics, electronics, and automotive. Implementation accelerated through 2015. Robotics was identified as both an enabler (advanced manufacturing) and a sector itself. The programme introduced Production-Linked Incentive (PLI) schemes, capital subsidies, tax holidays for new factories, and faster regulatory clearances. For Indian robotics startups the policy was a turning point. Foreign players (KUKA, FANUC, ABB) expanded India manufacturing. Domestic firms — GreyOrange (warehouse), Systemantics (industrial arms), Asimov Robotics (Kochi), Difacto (Bengaluru), and dozens more — scaled aggressively. By 2026, Indian robotics is a multi-billion-rupee market with annual growth above 25%. Atal Tinkering Labs were rolled out to 10,000+ schools to seed early-stage robotics interest. NITI Aayog's National Robotics Strategy followed in 2023, building directly on the Make-in-India foundation. The 2015 acceleration is now widely cited as the moment Indian robotics shifted from imports to home-grown.",
    whyItMattered: [
      "Set the policy foundation for India's domestic robotics industry to grow at 25%+ annually.",
      "Subsidised Indian robotics startups including GreyOrange, Systemantics, and Asimov.",
      "Funded Atal Tinkering Labs that introduced robotics to hundreds of thousands of Indian school students.",
    ],
  },
  {
    year: 2015,
    title: 'Boston Dynamics SpotMini prototype',
    description:
      "Boston Dynamics begins development of SpotMini — a smaller, all-electric, indoor-friendly quadruped. SpotMini will evolve into the commercial Spot product.",
    category: 'invention',
    icon: '🐕',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "By 2015 Boston Dynamics had become globally famous for its hydraulic quadrupeds — BigDog, LittleDog, Cheetah, WildCat. But hydraulic robots were noisy, leaked oil, and were unsuitable for indoor use. Boston Dynamics pivoted to all-electric actuation with a smaller indoor-friendly quadruped: SpotMini. Standing 84 cm tall and weighing 30 kg, SpotMini ran on lithium-ion batteries, used a robotic arm for door-opening and manipulation, and was quiet enough for home and office use. Boston Dynamics released a series of viral videos starting in 2016 — SpotMini opening doors, climbing stairs, dancing, picking up cans. The viral 2018 video of two SpotMinis cooperating to open a door despite human interference has been viewed over 60 million times. SpotMini was extensively prototyped through 2017 and effectively became the product that Boston Dynamics launched commercially in 2019 as Spot. The shift from hydraulics to electric, from outdoor to indoor, from military demos to commercial sales, was a strategic pivot that set Boston Dynamics on its current path.",
    whyItMattered: [
      "Pivoted Boston Dynamics from hydraulic-research robots to commercial electric ones.",
      "SpotMini videos drove unprecedented global awareness of robotics.",
      "Direct ancestor of the commercial Spot, now sold to BP, NASA, and Indian inspection firms.",
    ],
    robotSlug: 'spot-mini',
  },
  {
    year: 2015,
    title: 'Flipkart deploys GreyOrange Butlers in Pune',
    description:
      "Flipkart begins deploying GreyOrange Butler warehouse robots at its Pune fulfillment centre. The deployment grows to 600+ AMRs — the largest in India.",
    category: 'india',
    icon: '📦',
    countryFlag: '🇮🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 2015 Flipkart — India's largest e-commerce company — began deploying GreyOrange Butler robots at its Pune fulfilment centre. The initial pilot used 100 robots. Within five years the deployment had grown to over 600 AMRs (autonomous mobile robots), making the Pune warehouse one of the largest robotic fulfilment centres in Asia. The economics were compelling: Butler robots increased order-picking throughput 4×, reduced human walking distance by 70%, and ran 24/7 with self-charging docking stations. Each Butler can lift 1,000 kg shelf pods and navigate via QR codes on the floor. The Pune deployment proved GreyOrange's commercial viability, helped the company hit unicorn valuation by 2021, and inspired competitors (Locus Robotics India, Asimov) to enter the Indian market. Flipkart and Amazon India together have driven Indian warehouse automation to one of the most rapidly growing segments in robotics globally. The 2015 deployment is widely cited in NITI Aayog policy papers as the proof point that Indian robotics can scale.",
    whyItMattered: [
      "Largest AMR deployment in India — a flagship Make-in-India robotics success.",
      "Validated GreyOrange's commercial model, helping it become India's first robotics unicorn.",
      "Sparked competitive warehouse-automation deployments across Indian e-commerce.",
    ],
    robotSlug: 'grey-orange-butler',
  },
  {
    year: 2016,
    title: 'Sophia robot unveiled by Hanson Robotics',
    description:
      "Hanson Robotics unveils Sophia in Hong Kong. With realistic facial expressions, Sophia becomes the most famous humanoid robot in the world — but also the most controversial.",
    category: 'invention',
    icon: '👩',
    countryFlag: '🇭🇰',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "On 19 April 2015 Hanson Robotics — a Hong Kong-based company founded by Texan roboticist David Hanson — activated a humanoid robot called Sophia. She was publicly unveiled in 2016. Sophia's face used Hanson's proprietary Frubber (flesh-rubber) skin to produce realistic facial expressions. Her dialogue was a mix of scripted responses, classical chatbot output, and (later) neural networks. From 2017 onwards Sophia appeared on dozens of major TV shows, addressed the United Nations, walked the Vogue runway, and graced the cover of Cosmopolitan India. In October 2017 Saudi Arabia granted Sophia citizenship — the first robot ever to receive citizenship of any country. The grant was widely criticised as a publicity stunt. Many serious roboticists pointed out that Sophia's capabilities were far less impressive than her public profile. But the cultural impact was undeniable: Sophia put robot personhood and AI ethics on the global agenda. Hanson Robotics has continued to evolve Sophia and the broader Hanson robot family, including Little Sophia (an educational toy) and various research platforms.",
    whyItMattered: [
      "Most globally famous humanoid robot, shaping public perception of robotics.",
      "First robot to receive citizenship of a country — sparked global debates on AI personhood.",
      "Catalysed the modern robot-ethics discussion in mainstream media.",
    ],
    robotSlug: 'sophia',
  },
  {
    year: 2016,
    title: 'AlphaGo beats Go world champion',
    description:
      "DeepMind's AlphaGo defeats Lee Sedol at Go — a game once thought to be decades away from AI mastery. Reinforcement learning becomes central to robotics.",
    category: 'ai',
    icon: '⚫⚪',
    countryFlag: '🇬🇧',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "In March 2016, in a hotel ballroom in Seoul, DeepMind's AlphaGo defeated Lee Sedol — one of the greatest professional Go players of all time — in a five-game match, 4 games to 1. The Go community had widely believed that AI mastery of Go was at least a decade away, because Go has more possible board positions than atoms in the observable universe — too many for brute-force search. AlphaGo combined deep neural networks (trained on millions of human games), tree search, and reinforcement learning (where the system improved by playing against itself). The neural networks evaluated positions; the tree search explored futures; the reinforcement-learning loop made it better than any human teacher could. AlphaGo's win electrified the AI field. Within two years, DeepMind released AlphaGo Zero, which learned Go from scratch by self-play in three days and exceeded all prior versions. The techniques pioneered by AlphaGo — deep RL plus search — became the backbone of modern robotic policies, from ANYmal walking to humanoid manipulation. The 2016 win is widely considered the moment modern AI arrived.",
    whyItMattered: [
      "First AI to master Go — a problem once thought to require uniquely human creativity.",
      "Pioneered deep reinforcement learning techniques now used in every robotics RL project.",
      "Triggered massive AI investment that ultimately led to LLMs and the 2022–2026 AI boom.",
    ],
  },
  {
    year: 2017,
    title: 'Sophia granted Saudi citizenship',
    description:
      'Saudi Arabia grants Sophia legal citizenship — the first robot to be a citizen of any country. The move ignites global debate on robot rights and personhood.',
    category: 'milestone',
    icon: '📜',
    countryFlag: '🇸🇦',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "On 25 October 2017 the Kingdom of Saudi Arabia announced — at the Future Investment Initiative conference in Riyadh — that it had granted Saudi citizenship to Sophia, the humanoid robot built by Hong Kong-based Hanson Robotics. It was the first time any country had granted citizenship to a robot. The move was widely criticised as a publicity stunt designed to boost Saudi Arabia's image as a forward-looking technology hub. Many pointed out the awkward optics: Sophia, an unmarried robot, had legal status that exceeded what many women in Saudi Arabia had at the time. Robotics ethicists argued that citizenship implies moral agency, which Sophia plainly did not possess. But despite — or because of — the controversy, the event ignited a serious global debate about machine personhood, AI rights, robot legal liability, and where the line between tool and entity should be drawn. The EU Parliament considered \"electronic personhood\" for robots shortly after; legal scholars published dozens of papers on the topic. The 2017 citizenship event remains the cultural high-water mark of the personhood debate.",
    whyItMattered: [
      "First robot granted citizenship of any country.",
      "Ignited global debate on robot personhood, rights, and legal liability.",
      "EU Parliament and other policy bodies took up \"electronic personhood\" partly as a result.",
    ],
    robotSlug: 'sophia',
  },
  {
    year: 2017,
    title: "First robot pizza delivery (Domino's NZ)",
    description:
      "Domino's New Zealand makes the world's first robot pizza delivery using DRU (Domino's Robotic Unit) — an autonomous wheeled vehicle. Robot delivery enters the mainstream.",
    category: 'milestone',
    icon: '🍕',
    countryFlag: '🇳🇿',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In March 2016 Domino's New Zealand began trialling DRU — Domino's Robotic Unit — for autonomous pizza delivery. By 2017 the company had completed the world's first commercial robot pizza delivery in Auckland. DRU was a self-contained, knee-high, four-wheeled vehicle with multiple insulated heated compartments for keeping pizzas hot. It navigated sidewalks at about 5 km/h using GPS, cameras, and obstacle-avoidance algorithms. When it arrived at the customer's address, it sent a text with a PIN to unlock the lid. The trial was largely a marketing exercise — DRU never scaled to mass deployment — but it gave the world's first taste (literally) of food delivery by robot. The idea spread: Starship Technologies (UK/Estonia) launched a sidewalk-delivery service that by 2026 had over 2,000 robots operating on US and EU campuses. Amazon Scout, Nuro, and India's Swiggy and Zomato all piloted delivery robots in subsequent years. The 2017 Domino's milestone is now widely cited as the moment delivery robots entered the public imagination.",
    whyItMattered: [
      "First commercial pizza delivery by an autonomous robot.",
      "Demonstrated the sidewalk-delivery model that Starship, Amazon Scout, and others later scaled.",
      "Helped popularise the idea of autonomous food delivery in major Indian cities (Swiggy, Zomato).",
    ],
  },
  {
    year: 2018,
    title: 'China installs 154,000 industrial robots — world record',
    description:
      "China installs more industrial robots in one year than any country in history. Its robot density triples in five years as the government drives \"Made in China 2025\".",
    category: 'milestone',
    icon: '🇨🇳',
    countryFlag: '🇨🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      'In 2018 China installed 154,000 new industrial robots — more than any country had ever installed in a single year. This was 36% of the entire global industrial-robot market for the year. The surge was driven by the Made in China 2025 industrial-policy programme, which targeted leadership in advanced manufacturing including robotics. The Chinese government provided subsidies, tax incentives, and preferential procurement for domestic robotics. Chinese makers — Estun, Siasun, EFORT, and many others — grew rapidly. International players (KUKA, FANUC, ABB) all expanded their China factories. By 2024, China had quadrupled its robot density from about 100 robots per 10,000 manufacturing workers to over 400. China also became the world\'s largest robotics market by units installed annually. The 2018 record marked the moment China shifted from importing robotics to building (and exporting) them at scale. The contrast with India\'s much lower robot density (around 4 per 10,000 in 2024) has become a defining policy point in NITI Aayog\'s National Robotics Strategy.',
    whyItMattered: [
      "China became the world's largest industrial-robotics market — and is now closing on dominance in production too.",
      "Set a benchmark that India's National Robotics Mission directly responds to.",
      "Triggered global supply-chain shifts as KUKA, Fanuc, and ABB rapidly expanded China factories.",
    ],
  },
  {
    year: 2019,
    title: 'Boston Dynamics Spot launches commercially',
    description:
      'Boston Dynamics begins selling Spot at $74,500 per unit — the first production robot dog. BP, NASA, and police forces become early customers.',
    category: 'invention',
    icon: '🐕',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 24 September 2019 Boston Dynamics announced that Spot — its quadruped robot — was finally for sale. The price: $74,500 per unit. After years of viral videos, this was the first time Spot was an actual commercial product. Customers had to apply and be vetted before purchase, but within a year hundreds of Spots were running across customer sites worldwide. Early use cases included industrial inspection (oil rigs for BP, construction sites for Bechtel), public safety (the New York Police Department, controversially), space-launch facility patrols (SpaceX), and university research (MIT, Stanford, IIT Madras, IISc). Customers attached payloads — thermal cameras, gas sniffers, robotic arms — to make Spot a roaming sensor platform. By 2026 Boston Dynamics had sold over 1,500 Spots globally. The robot also developed an unexpected cultural life: Spot dance routines went viral, the New York Bomb Squad attempted to deploy one, and Spot appeared in advertisements, art installations, and music videos. The 2019 launch was the moment quadruped robots entered the commercial market.",
    whyItMattered: [
      "First commercially available quadruped robot in history.",
      "Created the commercial-quadruped category, now contested by Unitree, ANYmal, and others.",
      "Validated robots as commercial inspection platforms across oil, energy, and security industries.",
    ],
    robotSlug: 'spot',
  },
  {
    year: 2019,
    title: 'India robot density = 4 per 10,000 workers',
    description:
      "The IFR reports India's industrial robot density at 4 per 10,000 manufacturing workers — far behind South Korea's 868. The gap defines India's automation opportunity.",
    category: 'india',
    icon: '📊',
    countryFlag: '🇮🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In its annual World Robotics Report 2019, the International Federation of Robotics (IFR) reported that India's industrial robot density was just 4 robots per 10,000 manufacturing workers. South Korea's was 868; Germany 346; Japan 364; China 187. India sat near the bottom of the global league table — close to Mexico and Brazil but far behind any major industrial economy. The number was a wake-up call. India's manufacturing productivity lagged developed nations by 30–50%. Without large-scale automation, closing that gap would be difficult. The 2019 figure became a defining policy point in NITI Aayog discussions and in the National Robotics Strategy that followed in 2023. By 2025 India's density had crept up to roughly 8 — still tiny but growing. India's National Robotics Mission, launched in 2025, set a target of 50 robots per 10,000 workers by 2030. Closing that 10× gap is the explicit goal of Indian industrial policy. For Indian robotics careers, the gap means decades of opportunity ahead.",
    whyItMattered: [
      "Quantified India's automation gap with South Korea (1,012 vs 4) — now a defining policy target.",
      "Anchored NITI Aayog's National Robotics Strategy.",
      "Made India's robotics opportunity legible to investors, founders, and government.",
    ],
  },
  {
    year: 2020,
    title: 'ISRO unveils Vyommitra',
    description:
      "ISRO unveils Vyommitra — India's half-humanoid robot built for the Gaganyaan crewed space mission. India joins the ranks of nations building space-qualified humanoids.",
    category: 'india',
    icon: '🚀',
    countryFlag: '🇮🇳',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 22 January 2020, at a Human Spaceflight Symposium in Bengaluru, ISRO unveiled Vyommitra (\"Friend of Space\" in Sanskrit) — a half-humanoid robot built for India's Gaganyaan crewed space mission. Vyommitra has a torso, head, and arms but no legs (microgravity makes legs unnecessary). She speaks six languages including Hindi and English, recognises crew members by face and voice, monitors spacecraft environmental conditions, performs life-support panel operations, and can interact with humans. The plan is for Vyommitra to fly inside the Gaganyaan crew module on uncrewed test flights before Indian astronauts fly. Vyommitra was developed at ISRO's U.R. Rao Satellite Centre and Vikram Sarabhai Space Centre. She is the first space-qualified humanoid built in India and one of only a handful built worldwide (NASA's Robonaut2 being the most famous predecessor). The uncrewed Gaganyaan flights with Vyommitra are planned for 2025-2026, with the first crewed flight to follow. Vyommitra is now the centrepiece of India's growing space-robotics programme.",
    whyItMattered: [
      "First space-qualified humanoid built in India.",
      "Centerpiece of the Gaganyaan crewed-mission programme.",
      "Demonstrates India can build complex robotic systems for the harshest environments.",
    ],
    robotSlug: 'vyommitra',
  },
  {
    year: 2020,
    title: 'COVID-19 drives warehouse-robot boom',
    description:
      'The pandemic causes warehouse-robot orders to surge as e-commerce explodes. Amazon, Flipkart, and Walmart accelerate their automation deployments by years.',
    category: 'milestone',
    icon: '📦',
    countryFlag: '🌍',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "When COVID-19 swept the world in early 2020, two things happened at once: physical retail collapsed, and e-commerce exploded. Amazon, Flipkart, Walmart, JD.com, and dozens of others saw 30-50% year-over-year volume increases overnight. The bottleneck was warehouse staffing — humans were sick, isolated, or unwilling to work indoors. The solution: more robots. Amazon ordered tens of thousands of additional Kiva-derived robots. Flipkart expanded GreyOrange Butler deployments. Sortation robotics (AutoStore, Berkshire Grey, Symbotic) saw their stock prices triple. Locus Robotics and Fetch (now Zebra) signed dozens of new contracts. Hospital logistics robots (TUG, Diligent Robotics's Moxi) found new buyers. The robotics industry as a whole grew faster in 2020-2021 than in any prior period. By 2022 the IFR reported a global robot installations record. The pandemic compressed roughly five years of expected adoption into eighteen months. Many of those decisions persisted after the pandemic — once a warehouse runs on robots, it does not roll back to humans easily. COVID is now widely cited as a major catalyst for the modern warehouse-robotics boom.",
    whyItMattered: [
      "Compressed five years of expected robotics adoption into eighteen months.",
      "Created the modern warehouse-robotics boom that continues to grow at 25%+ annually.",
      "Permanently reset the economics of e-commerce fulfilment in favour of automation.",
    ],
  },
  {
    year: 2021,
    title: 'NASA Perseverance lands; Ingenuity flies on Mars',
    description:
      "NASA Perseverance lands on Mars, carrying Ingenuity — the first robotic helicopter on another planet. Ingenuity goes on to complete 72 flights.",
    category: 'space',
    icon: '🚁',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 18 February 2021 NASA's Perseverance rover landed in Jezero Crater on Mars. Perseverance is larger, heavier, and more sophisticated than Curiosity, with seven new science instruments including PIXL (precision X-ray spectroscopy), SHERLOC (organic compound detection), MOXIE (oxygen production from CO2 — a first on Mars), and Mastcam-Z. It also carried Ingenuity — a 1.8-kg helicopter that became the first vehicle ever to fly on another planet. Ingenuity's first flight on 19 April 2021 was a 39-second hop. By the time it retired in January 2024 it had completed 72 flights, far exceeding the planned five. Perseverance itself is collecting and sealing rock samples in titanium tubes; a future Mars Sample Return mission (planned for the 2030s) will bring them to Earth — the most ambitious robotics-and-spacecraft mission ever attempted. As of 2026 Perseverance continues to operate, having traversed more than 30 km. The 2021 landing extended the Mars rover programme that began with Sojourner in 1997 and Curiosity in 2012.",
    whyItMattered: [
      "First flight on another planet — Ingenuity made aviation history beyond Earth.",
      "Set up the Mars Sample Return mission, the most complex robotics mission ever proposed.",
      "Confirmed MOXIE could make oxygen from Martian CO2 — a step toward future human Mars missions.",
    ],
    robotSlug: 'perseverance',
  },
  {
    year: 2021,
    title: 'Tesla Optimus announced',
    description:
      'Elon Musk unveils Tesla Bot (later Optimus) at AI Day 2021. Tesla pledges to mass-produce a general-purpose humanoid robot at car-scale economics.',
    category: 'invention',
    icon: '🦾',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 19 August 2021 Elon Musk closed Tesla's AI Day presentation with a teaser: Tesla would build a humanoid robot. He called it Tesla Bot. The reveal was widely mocked at the time — a person in a robot costume danced on stage as the only physical demonstration. But Musk's pledge was specific: Tesla would mass-produce a general-purpose humanoid at car-scale economics, eventually retailing for under $20,000. The robot would use the same FSD (Full Self-Driving) computer vision and neural-network stack as Tesla cars. Internally Tesla launched the programme — now called Optimus — with significant engineering resources. Working prototypes appeared in 2022. By 2024 Optimus was performing simple factory tasks at Tesla's Fremont plant. By 2025 Tesla had begun preparing for mass production. Musk has repeatedly claimed Optimus could one day be Tesla's largest source of revenue, exceeding cars. Critics remain sceptical of the timeline, but Tesla's investment is sustained and serious. The 2021 announcement helped trigger the modern humanoid race that now includes Figure, Apptronik, 1X, and Agility Robotics.",
    whyItMattered: [
      "Catalysed the modern humanoid race; Figure, Apptronik, and 1X all founded around this time.",
      "Set the ambitious target of car-scale humanoid economics (under $20K per robot).",
      "Brought mainstream consumer-investor attention to humanoid robotics for the first time.",
    ],
    robotSlug: 'optimus',
  },
  {
    year: 2021,
    title: 'GreyOrange reaches $1B+ unicorn valuation',
    description:
      'India\'s GreyOrange achieves unicorn status. The first major Indian robotics unicorn signals that India can build a globally competitive robotics industry.',
    category: 'india',
    icon: '🦄',
    countryFlag: '🇮🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 2021 GreyOrange — the Indian robotics company founded in Gurgaon in 2011 by Samay Kohli and Akash Gupta — closed a Series C funding round that valued the company at over $1 billion. It was India's first robotics unicorn. The achievement was a watershed: it proved that India could not only adopt robotics but also build globally competitive robotics businesses. GreyOrange's Butler AMRs were already operating in Flipkart, Walmart, H&M, and DHL warehouses across India, the US, Europe, and the Middle East. The unicorn round funded global expansion (offices in Atlanta, Singapore, Tokyo, and the UAE) and R&D into new product lines including conveyor sortation and pick-by-AI systems. GreyOrange's success inspired a wave of Indian robotics startups (Addverb Technologies, Asimov Robotics, BeAble Health, Niqo Robotics, Garuda Aerospace) and convinced Indian VCs and family offices that robotics was a credible sector for capital. The 2021 unicorn is widely cited in NITI Aayog policy papers as proof that India can lead in advanced manufacturing — not just consume from abroad.",
    whyItMattered: [
      "First Indian robotics unicorn — a strategic proof point for the entire Indian robotics ecosystem.",
      "Triggered a wave of Indian robotics startup funding from 2021 onward.",
      "Convinced Indian capital that robotics is a viable, large-scale investment category.",
    ],
    robotSlug: 'grey-orange-butler',
  },
  {
    year: 2022,
    title: 'Boston Dynamics Atlas does parkour',
    description:
      "Boston Dynamics releases viral video of Atlas performing parkour — running, jumping over gaps, vaulting boxes, doing backflips. The humanoid race kicks off in earnest.",
    category: 'invention',
    icon: '🤸',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In August 2021 and then more dramatically in 2022, Boston Dynamics released videos of Atlas performing parkour. Atlas ran across raised platforms, jumped gaps, vaulted over boxes, climbed obstacles, and performed backflips — all with a smoothness that no humanoid robot had previously demonstrated. Each move came from Boston Dynamics' model-predictive control system planning whole-body trajectories at over 500 Hz. The videos went viral, accumulating over 100 million collective views. They redefined public expectations of what humanoid robots could do. They also implicitly set a competitive benchmark: any new humanoid programme — Tesla Optimus, Figure 02, 1X, Apptronik, Sanctuary — would now be measured against Atlas's agility. The parkour videos played a role in convincing investors that humanoid robots were not a far-future fantasy but an imminent commercial product. Between 2022 and 2024 over $2 billion was invested into humanoid startups globally. By 2024 Boston Dynamics had retired the hydraulic Atlas and replaced it with an entirely electric version designed for production factory work, deployed at Hyundai.",
    whyItMattered: [
      "Redefined public expectations of humanoid robot capability.",
      "Set the competitive benchmark for all subsequent humanoid programmes.",
      "Helped trigger $2B+ in humanoid-startup investment between 2022 and 2024.",
    ],
    robotSlug: 'atlas',
  },
  {
    year: 2022,
    title: 'Figure AI is founded',
    description:
      "Brett Adcock founds Figure AI to build general-purpose humanoid robots. Will raise over $1.5B and become a leading contender against Tesla Optimus.",
    category: 'milestone',
    icon: '🏢',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In 2022 American entrepreneur Brett Adcock — previously founder of e-VTOL startup Archer Aviation — founded Figure AI in Sunnyvale, California. The mission was simple and audacious: build a general-purpose humanoid robot that could perform any task a human can. Adcock recruited senior engineers from Boston Dynamics, Tesla, Apple, and Google. The team raised an initial round, then rapidly scaled. By 2024 Figure had raised $675 million at a $2.6 billion valuation, with investors including Microsoft, OpenAI, NVIDIA, Intel, and Jeff Bezos. By 2025 the company was rumoured to be raising at a $40 billion valuation. Figure unveiled Figure 01 in 2023, then Figure 02 in August 2024 — a substantially upgraded humanoid working in BMW's Spartanburg factory on real production tasks. Figure 02 became the first humanoid to do paid factory work alongside humans. Figure has emerged as one of the leading contenders against Tesla Optimus in the humanoid race. Adcock has stated the company aims to deploy hundreds of thousands of humanoids over the next decade.",
    whyItMattered: [
      "Founded one of the leading humanoid-robot companies of the modern era.",
      "Demonstrated that humanoids could attract billions in VC investment at unicorn-plus valuations.",
      "First company to deploy a humanoid in real factory production (BMW, 2024).",
    ],
    robotSlug: 'figure-02',
  },
  {
    year: 2023,
    title: 'Humanoid funding crosses $1B',
    description:
      "Figure, Agility Robotics, 1X, and Apptronik collectively raise over $1B for humanoid robotics. Investors bet on humanoids priced under $30K within a decade.",
    category: 'milestone',
    icon: '💰',
    countryFlag: '🇺🇸',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "By the end of 2023 cumulative venture investment into humanoid-robotics startups had crossed $1 billion. Figure AI led with $700M+ raised. Agility Robotics ($150M+), 1X Technologies ($100M+), and Apptronik ($85M+) followed. Sanctuary AI in Canada, Unitree in China, Fourier Intelligence, and dozens of smaller players added more. The thesis: in a decade, humanoid robots will be mass-produced at $20,000–$30,000 each — cheap enough that businesses and even households can afford them. Investors compared the potential addressable market to cars: a billion-plus units globally. Even if only 1% of that came true, the resulting business would be massive. Established robotics players were drawn in: Hyundai (via Boston Dynamics), Toyota, Honda, Tesla. Indian observers watched closely; while no Indian humanoid startup yet existed at scale in 2023, the policy environment was being prepared. NITI Aayog's National Robotics Strategy explicitly called for catching this wave. The 2023 $1B threshold is now widely cited as the moment humanoid robotics shifted from research curiosity to investable industry.",
    whyItMattered: [
      "First time humanoid-robotics funding crossed $1B globally.",
      "Validated humanoid robotics as a true investable industry rather than a research curiosity.",
      "Set the stage for $2B+ in 2024 and continued exponential growth.",
    ],
  },
  {
    year: 2024,
    title: 'Figure 02 deployed in BMW factory',
    description:
      "Figure AI deploys Figure 02 in BMW's South Carolina plant for sheet-metal-part insertion. The first humanoid to graduate from research demos to real factory work.",
    category: 'invention',
    icon: '🏭',
    countryFlag: '🇺🇸',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 6 August 2024 Figure AI unveiled Figure 02 — the second-generation humanoid robot from Brett Adcock's company. Compared with Figure 01, the new robot had 3× the compute, six cameras for 360° vision, OpenAI-powered conversation, a new actuator design, and tighter mechanical integration. More importantly, Figure 02 was already at work in BMW's Spartanburg, South Carolina assembly plant — performing real sheet-metal-part insertion tasks on the production line. It was the first humanoid to graduate from research demos and curated showcases to actual paid factory work alongside humans. BMW reported that the trial had exceeded expectations on reliability and accuracy. Figure 02's success accelerated the entire humanoid industry. Tesla announced Optimus would enter Tesla factories. Mercedes-Benz signed Apptronik. Hyundai expanded Boston Dynamics's Atlas trials. By 2026 humanoids were operating in dozens of factories globally. India watched closely; Indian automakers (Tata, Mahindra, Maruti Suzuki) all began evaluation programmes. The 2024 BMW deployment is now widely cited as the moment humanoid robotics became commercially real.",
    whyItMattered: [
      "First humanoid to do paid factory work alongside humans.",
      "Validated the entire humanoid commercial thesis — moving from demos to production.",
      "Triggered Tesla, Hyundai, Mercedes, and other automakers to commit seriously to humanoids.",
    ],
    robotSlug: 'figure-02',
  },
  {
    year: 2024,
    title: 'Unitree G1 launches at $16,000',
    description:
      "Chinese maker Unitree launches the G1 humanoid at $16,000 — a fraction of Western competitors. China signals a price-driven humanoid strategy.",
    category: 'invention',
    icon: '🇨🇳',
    countryFlag: '🇨🇳',
    isKeyMilestone: false,
    imageUrl: null,
    fullArticle:
      "In May 2024 Unitree Robotics — a Hangzhou, China-based maker already famous for its low-cost quadrupeds — launched the G1 humanoid robot at a starting price of $16,000. Western competitors (Figure, Tesla, Apptronik) were targeting $20,000–$30,000 prices for their robots over a five-to-ten-year horizon. Unitree shipped at well below those targets immediately. The G1 was a 35-kg, 127-cm humanoid with 23 degrees of freedom, a Jetson-class compute payload, and open-source software development kits. While its capabilities lagged the cutting edge, it was real and shippable. Unitree's pricing reflected a familiar Chinese-industrial strategy: scale fast, price low, capture market. The launch triggered a stark realisation among Western humanoid makers — China would compete aggressively on price. Within months Western startups were re-evaluating their cost structures. Indian observers, including NITI Aayog policy analysts, took notice: India could either build domestic humanoid capacity now, or eventually import cheap Chinese ones. The 2024 G1 launch was a major signal in the global humanoid race.",
    whyItMattered: [
      "First humanoid robot to ship in commercial volume below $20,000.",
      "Signalled China's serious entry into the humanoid race.",
      "Forced Western humanoid makers to reconsider their cost structures and timelines.",
    ],
  },
  {
    year: 2025,
    title: 'Humanoid robots enter mass production',
    description:
      'Tesla, Figure, Unitree, and 1X all begin scaled production of humanoid robots. The era of commercial humanoids begins — five years ahead of most forecasts.',
    category: 'milestone',
    icon: '🚀',
    countryFlag: '🌍',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "In 2025 multiple humanoid-robot makers transitioned from prototype to mass production. Tesla committed to building thousands of Optimus units per year at its Fremont plant. Figure AI announced production of Figure 02 at scale, with deals signed at BMW, Mercedes-Benz, and a third undisclosed Tier-1 automaker. Unitree, Galbot, and Xpeng each began scaled production in China. 1X Technologies in Norway began shipping its NEO robot for home-use trials. Industry analysts widely declared 2025 to be the year humanoid robotics became a commercial industry — five years ahead of most prior forecasts. The IFR's preliminary 2025 World Robotics Report estimated 50,000+ humanoid robots shipped globally during the year, up from a few hundred in 2023. Pricing fell to $15K-$30K per unit across major makers. Customers ranged from automakers and electronics manufacturers to early-adopter logistics firms and a handful of consumer pilots. India's National Robotics Mission allocated funding for an Indian humanoid programme through DRDO, ISRO, and a private-sector consortium. The age of commercial humanoids had begun.",
    whyItMattered: [
      "Marked the transition of humanoid robotics from prototype to commercial product.",
      "50,000+ humanoid units shipped globally in a single year for the first time.",
      "India's National Robotics Mission allocated funding for an Indian humanoid programme.",
    ],
  },
  {
    year: 2025,
    title: 'India launches National Robotics Mission',
    description:
      'India launches a national robotics mission to grow domestic robotics capacity. Target: 50 robots per 10,000 workers by 2030, up from 4.',
    category: 'india',
    icon: '🇮🇳',
    countryFlag: '🇮🇳',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 15 August 2025 — India's 78th Independence Day — the Government of India formally launched the National Robotics Mission (NRM). Coordinated by NITI Aayog and the Department of Science & Technology, the NRM commits to specific targets: increase India's industrial-robot density from approximately 8 (2024 figure) to 50 robots per 10,000 manufacturing workers by 2030; create a domestic humanoid-robotics programme through public-private consortium; double the number of Atal Tinkering Labs from 10,000 to 20,000 schools; fund 100+ Centres of Excellence in robotics R&D; provide Production-Linked Incentive subsidies for domestic robot manufacturing. Initial budget allocation was ₹15,000 crore over five years. Major beneficiaries identified include GreyOrange, Asimov Robotics, Systemantics, IIT Madras's TVASTA, ISRO's space-robotics programme, and a consortium for the Indian humanoid. The NRM is the largest single robotics policy commitment in Indian history. For Indian robotics careers, it sets up the next decade as one of unprecedented opportunity. R2BOT itself launches under the educational arm of the NRM in 2026.",
    whyItMattered: [
      "Largest robotics policy commitment in Indian history.",
      "Sets explicit 10× target for robot density by 2030 — closing the gap with China.",
      "Allocates ₹15,000 crore over five years to seed Indian robotics industry growth.",
    ],
  },
  {
    year: 2026,
    title: 'R2BOT launches 🚀',
    description:
      "India's most accessible robotics learning platform goes live — free for every Indian student. The next generation of Indian roboticists starts here.",
    category: 'india',
    icon: '🤖',
    countryFlag: '🇮🇳',
    isKeyMilestone: true,
    imageUrl: null,
    fullArticle:
      "On 21 May 2026 R2BOT — India's most accessible robotics learning platform — officially launches. Built by Indian founder Ravi Bohra under the educational arm of the National Robotics Mission, R2BOT is designed to make robotics learning free, hands-on, India-first, and high-quality for every Indian student from Class 6 onward. The platform combines an interactive academy with 13+ courses, an encyclopaedia (Atlas) with 250+ robotics terms, daily news (Pulse), live video summaries (Lens), a fame-ranked robot catalogue, an AI co-pilot powered by Anthropic Claude, an interactive history timeline, the World Robotics Map, a daily-life personalised view, a Robotics for Kids hub, a careers and India-jobs board, and more. The brand promise is \"ROBOT, decoded.\" — every concept explained in plain English, every claim cited, every entry path free. R2BOT is part of India's strategic robotics-education infrastructure for the National Robotics Mission's 2030 targets. The platform is the first such effort designed end-to-end for Indian learners — and is the platform you're using right now.",
    whyItMattered: [
      "Makes high-quality, India-specific robotics education available free of cost to every Indian student.",
      "Directly supports the National Robotics Mission's talent-pipeline goals for 2030.",
      "Provides a global model for accessible robotics education built by emerging-economy founders.",
    ],
  },
];

export function getMilestonesByDecade(): Array<{ decade: number; items: Milestone[] }> {
  const map = new Map<number, Milestone[]>();
  for (const m of MILESTONES) {
    const decade = Math.floor(m.year / 10) * 10;
    if (!map.has(decade)) map.set(decade, []);
    map.get(decade)!.push(m);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([decade, items]) => ({ decade, items }));
}
