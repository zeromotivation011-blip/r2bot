// lib/famous-robots.ts
// Documentary-style narrative for 12 hand-selected robots.
// Keyed by `slug` — pairs with the existing lib/robots-data.ts shape.

export interface FamousRobotDetail {
  slug: string
  // Hook
  whyYouShouldCare: string
  // Narrative
  origin: string
  theProblemItSolved: string
  howItActuallyWorks: string
  failureMoment: string
  breakthroughMoment: string
  // Impact
  economicImpact: string
  jobsAffected: string
  // India
  indiaRelevance: string
  indiaLearning: string
  // Connections
  robotFamily: string[]            // sibling/lineage slugs
  competitorRobots: string[]
  atlasLinks: string[]
  // Curiosity
  wowFacts: string[]               // 3 mind-blowing facts
  controversies: string            // empty string if none
  legacy: string
  // Classification
  category: 'industrial' | 'service' | 'medical' | 'military' | 'space' | 'social' | 'research' | 'consumer' | 'indian'
  isIndian: boolean
}

const D = (d: FamousRobotDetail): FamousRobotDetail => d

export const FAMOUS_ROBOT_DETAILS: FamousRobotDetail[] = [
  D({
    slug: 'spot',
    whyYouShouldCare:
      'Spot is the robot that proved four-legged machines can do real work. Where it walks, the next generation of inspection robots will follow.',
    origin:
      "Spot began in Marc Raibert's Boston Dynamics lab in the early 2010s, born from decades of hydraulically-powered legged-robot research. The team spent years getting earlier robots like BigDog and LS3 to walk reliably for the military. Spot is the electric, commercial answer — smaller, quieter, and tame enough to sell.",
    theProblemItSolved:
      'Industrial sites — oil rigs, nuclear plants, construction zones — have miles of pipes, gauges and grates that have to be walked and inspected by humans, in places where one slip can be fatal. Spot does those walks instead.',
    howItActuallyWorks:
      "Five stereo cameras on Spot's body build a live 3D map of its surroundings. An on-board controller picks foot placements roughly 500 times a second to stay balanced. Operators draw a route once; Spot repeats it autonomously, charging itself at a dock when low on battery.",
    failureMoment:
      'In the late 2010s several reviewers concluded Spot was a beautiful research demo with no real commercial use — too expensive, too odd-looking, too narrow in capability. Boston Dynamics nearly shelved consumer plans entirely.',
    breakthroughMoment:
      "Then the 'Do You Love Me' dancing video dropped in 2020 and pulled 60M+ views. At the same time, BP and Ford put Spot on real sites for routine inspections. The combination — viral fame + early enterprise contracts — gave Boston Dynamics the runway to scale.",
    economicImpact:
      'Spot has built an entirely new category — commercial mobile inspection robotics — that analysts now value in the multi-billions. At $74,500 a unit it has become a familiar item in factory capex budgets.',
    jobsAffected:
      'Spot does the rounds that human inspectors used to do. Most operators report it freeing skilled technicians for higher-judgement work rather than directly replacing them — yet.',
    indiaRelevance:
      "Spot's biggest Indian footprint today is in Reliance refineries and a handful of academic labs (IIT-Madras, IISc). Indian utilities are early in adopting quadrupeds — the gap between western and Indian deployment is roughly five years.",
    indiaLearning:
      "Spot's playbook — find a single, repetitive, dangerous job, automate that one job perfectly, then sell to industry — is exactly the strategy Indian robotics startups should copy. The Indian opportunity isn't humanoids; it's narrow, useful quadrupeds for power, oil and infrastructure.",
    robotFamily: ['atlas', 'spot-mini'],
    competitorRobots: ['drdo-daksh'],
    atlasLinks: ['quadruped-robot', 'lidar', 'slam'],
    wowFacts: [
      'Spot climbs stairs faster than most humans descend them.',
      "NASA's Jet Propulsion Lab uses Spot to prototype the next generation of Mars surface rovers.",
      'BP keeps Spots running on UK oil platforms — they walk for hours longer than human inspectors can safely operate.',
    ],
    controversies:
      'The NYPD trialled Spot with the Bomb Squad and dropped the contract within months after public backlash over "robot dog policing." Spot now ships with an explicit policy banning weapon integrations.',
    legacy:
      'Spot is the robot that taught industry to treat quadrupeds as a tool, not a curiosity. Every commercial four-legged robot launched after 2020 is being measured against it.',
    category: 'industrial',
    isIndian: false,
  }),

  D({
    slug: 'atlas',
    whyYouShouldCare:
      "Atlas is the robot most likely to be the technical ancestor of the humanoids that'll work in factories within a decade. Every backflip you've seen is real engineering — and it's getting cheaper every year.",
    origin:
      'Atlas was born inside Boston Dynamics in 2013, originally funded by DARPA as a disaster-response humanoid after the Fukushima nuclear accident. The first version was hydraulic, tethered, and weighed 150 kg.',
    theProblemItSolved:
      "After Fukushima it became obvious nobody had a robot able to walk into a damaged reactor, climb stairs and operate human tools. Atlas was DARPA's answer — a humanoid built for environments designed for humans.",
    howItActuallyWorks:
      'Atlas runs on a custom-built electric drive (the 2024 version) with model-predictive control. It plans its body trajectory hundreds of milliseconds into the future, then iteratively corrects in real time. The control software treats the whole body as one coupled system — not separate legs and arms.',
    failureMoment:
      'For most of the 2010s Atlas was a research curiosity that could barely walk on flat ground. Many engineers inside the company privately doubted whether bipedal robots would ever be commercially useful.',
    breakthroughMoment:
      "In 2017 Atlas did a parkour routine including a backflip — the moment the world realised humanoids could be athletic. In 2024 Boston Dynamics retired the hydraulic version and unveiled an all-electric Atlas with a much wider range of motion — the company's clearest signal that it wants Atlas to do work, not just demos.",
    economicImpact:
      'Atlas is still pre-commercial, but its existence helped trigger the humanoid-robot funding wave — Figure, Apptronik, 1X and Sanctuary have collectively raised over $2B in just three years.',
    jobsAffected:
      'Today: zero. Within a decade: warehouse worker, manufacturing helper, hazardous-environment inspector. Every projection of humanoid economics points back to Atlas-class capabilities.',
    indiaRelevance:
      "No commercial Atlas units operate in India yet. But Indian researchers — particularly at IIT-Bombay's robotics lab — actively study Boston Dynamics' published gait research.",
    indiaLearning:
      "India should not chase Atlas. It should chase Atlas's adjacent opportunities: warehouse cobots, agricultural bipeds, lightweight humanoids for the Indian retail floor. The full-fat humanoid is a $30B race; the niche-Indian humanoid is wide open.",
    robotFamily: ['spot'],
    competitorRobots: ['optimus', 'figure-02', 'asimo'],
    atlasLinks: ['humanoid-robot', 'bipedal-locomotion', 'model-predictive-control'],
    wowFacts: [
      'Atlas can do a backflip, but it still cannot reliably fold laundry.',
      'The 2024 electric Atlas has 360° rotating hip joints — motion no human can match.',
      'Boston Dynamics took 11 years to make Atlas affordable enough to manufacture at scale.',
    ],
    controversies:
      "Atlas demo videos have been criticised for implying capabilities that don't generalise — every famous video is hand-crafted for that one shot.",
    legacy:
      'Atlas is the proof that bipedal robotics is solvable. Every humanoid startup pitched after 2020 cites it. The legacy is the entire humanoid market existing.',
    category: 'research',
    isIndian: false,
  }),

  D({
    slug: 'roomba',
    whyYouShouldCare:
      'Roomba is the first robot most Indian families will ever own. Its design choices — circular, sensor-light, brutally simple — are a masterclass in what consumer robotics has to be.',
    origin:
      "iRobot was founded in 1990 by MIT's Rodney Brooks, Colin Angle and Helen Greiner. They spent a decade building military and research robots — bomb-disposal Packbots — before pivoting to consumer cleaning. The first Roomba launched in 2002.",
    theProblemItSolved:
      'Vacuuming the floor was the most mundane piece of household labour that no one wanted to automate because the previous attempts (1980s research vacuum robots) were too expensive and too unreliable.',
    howItActuallyWorks:
      'The first Roomba used a deliberately simple algorithm — random walk with wall-following — instead of the expensive mapping approaches used in research labs. Modern Roombas add visual SLAM with a single camera, building a real floor plan they refine across cleaning sessions.',
    failureMoment:
      "Roomba launched into a market that didn't believe consumer robots could be useful. Early reviews called it a toy. iRobot nearly ran out of cash in 2003 before holiday sales rescued the company.",
    breakthroughMoment:
      "Roomba's volume crossed one million units in 2005 — proving consumer robotics had a real market. By 2025 the cumulative installed base passes 50 million.",
    economicImpact:
      "iRobot's market created a global consumer-robotics industry now worth ~$10B annually. Chinese competitors (Roborock, Xiaomi, Eufy) drove prices from $200 in 2002 to under $30 by 2024.",
    jobsAffected:
      "Domestic-help economics in Indian metros — typical maid wages and time saved per household. Robot vacuums don't replace the maid, but they shift what people pay her to do.",
    indiaRelevance:
      'India is a fast-growing Roomba market — Eufy, Roborock and Xiaomi all sell aggressively, and Mi vacuums have become the entry-level Indian consumer robot. Even smaller cities are seeing adoption.',
    indiaLearning:
      "Roomba's key lesson: don't aim for technical elegance, aim for a single chore done autonomously and cheaply. India needs Indian-priced consumer robots — ₹5,000 mop robots that survive Indian floors, dust, hair and power cuts.",
    robotFamily: [],
    competitorRobots: [],
    atlasLinks: ['slam', 'consumer-robotics', 'autonomous-navigation'],
    wowFacts: [
      'The original Roomba used the same random-walk algorithm as the Packbot bomb-disposal robot — iRobot literally repurposed a military behaviour for vacuuming.',
      'Modern Roombas can dock, empty their own bin and refill water tanks.',
      'iRobot was nearly bought by Amazon in 2022 — the deal collapsed under EU competition review.',
    ],
    controversies:
      'iRobot collected anonymised home floor-plan data via Roomba; in 2017 a CEO interview about selling that data triggered privacy backlash. The plan was walked back.',
    legacy:
      "Roomba normalised home robotics. Every household robot launched after it — robot mops, lawn mowers, pool cleaners — owes its existence to Roomba's commercial viability.",
    category: 'consumer',
    isIndian: false,
  }),

  D({
    slug: 'da-vinci',
    whyYouShouldCare:
      'Da Vinci is the most successful medical robot in history. Tens of millions of surgeries have been performed with one — and every Indian metropolitan hospital now has one or is shopping for one.',
    origin:
      "Da Vinci's roots go back to a DARPA-funded telesurgery project at SRI International in the 1980s — built to operate on wounded soldiers from a distance. SRI spun out Intuitive Surgical in 1995, and the first Da Vinci was FDA-approved in 2000.",
    theProblemItSolved:
      "Laparoscopic surgery — operating through tiny incisions with chopstick-like tools — is exhausting and error-prone for surgeons. Da Vinci translates a surgeon's hand movements into ultra-precise instrument motion, scales down tremors, and rotates beyond what a human wrist can.",
    howItActuallyWorks:
      "The surgeon sits at a console looking into a 3D HD viewer of the surgical field. The surgeon's hand movements are tracked by the console. The robot's four arms hold scopes and instruments inside the patient and mirror the surgeon's motion — typically scaling down (5:1) so a 5 cm hand sweep becomes a 1 cm instrument motion.",
    failureMoment:
      'Da Vinci nearly died in the dot-com crash; Intuitive Surgical lost most of its market value, and many hospitals refused to commit to the $1.5M-$2.5M price tag.',
    breakthroughMoment:
      'By 2010 robot-assisted prostatectomy had become the default approach in US urology. Da Vinci had crossed the critical threshold — surgeons trained on it preferred it. Today over 90% of US prostate surgeries use it.',
    economicImpact:
      "Intuitive Surgical's market cap is over $130B (2024). A single Da Vinci system costs ~$2M up-front plus expensive consumables — yet over 8,000 systems are deployed globally.",
    jobsAffected:
      "Da Vinci doesn't replace surgeons — it gives one surgeon the steadiness of three. The economic story is mostly redistribution: longer training, higher per-case fees, faster patient recovery.",
    indiaRelevance:
      'Apollo Hospitals operates the largest Indian Da Vinci fleet, followed by Fortis and the AIIMS network. Da Vinci-assisted urological and gynaecological procedures are now routine across Indian metros.',
    indiaLearning:
      "Da Vinci's economics rely on rich-world hospitals affording the consumables. India needs an indigenous, cheaper surgical robot — exactly what SS Innovations (Sudhir Srivastava's company) is trying to build with SSI Mantra.",
    robotFamily: [],
    competitorRobots: [],
    atlasLinks: ['medical-robotics', 'haptic-feedback', 'teleoperation'],
    wowFacts: [
      "Da Vinci's wrist can rotate 540° — well past any human surgeon's range.",
      'A typical Da Vinci surgery uses about $1,500 of disposable instruments per case.',
      'Over 10 million Da Vinci-assisted surgeries have been performed worldwide since 2000.',
    ],
    controversies:
      'Multiple lawsuits and studies questioned whether Da Vinci surgeries actually produce better patient outcomes vs. trained laparoscopists — the consensus today is "comparable, with steeper hospital margins."',
    legacy:
      'Da Vinci proved robots belong inside humans. Every modern surgical robot — Hugo, Versius, SSI Mantra — owes its product playbook to Intuitive.',
    category: 'medical',
    isIndian: false,
  }),

  D({
    slug: 'perseverance',
    whyYouShouldCare:
      "Perseverance is the most autonomous robot ever sent to another planet, and it's actively collecting the samples humanity will return from Mars within a decade.",
    origin:
      "Perseverance was greenlit in 2012 as the follow-up to Curiosity. NASA's Jet Propulsion Lab built it over eight years, including a substantial hardware re-use from Curiosity to save cost. It launched on 30 July 2020 and landed in Jezero Crater on 18 February 2021.",
    theProblemItSolved:
      'Earlier Mars rovers were tele-operated step by step with 20-minute round-trip signal delays. Perseverance was designed to plan its own routes, choose its own science targets and store rock samples for a future return mission.',
    howItActuallyWorks:
      'Perseverance carries 23 cameras, two microphones, and a 7-foot robotic arm. The on-board AutoNav software takes stereo images, builds a local map, and plans the next 50 metres of driving without ground-control approval. It also carries Ingenuity, the first powered aircraft to fly on another planet.',
    failureMoment:
      "Perseverance's entry-descent-landing (EDL) sequence had over 1,000 things that had to go right in 7 minutes — JPL engineers privately gave it a single-digit failure budget. There was no second-chance plan.",
    breakthroughMoment:
      'The Ingenuity helicopter, originally a 30-day tech demo, flew over 70 missions before retiring in 2024 — vastly outliving its budget. It proved that flight on Mars was practical.',
    economicImpact:
      'The Mars Sample Return mission Perseverance enables is the single most expensive scientific project NASA has ever proposed (~$10B). Whatever Perseverance brings back will define planetary science for decades.',
    jobsAffected:
      "Mars exploration jobs — and the entire UK-India-US industry of small satellite and lander providers benefiting from Perseverance's flight-proven hardware.",
    indiaRelevance:
      'ISRO is a quiet but real partner — Indian engineers have flown imagers on NASA Mars missions, and ISRO\'s Mangalyaan (2014) made India the fourth nation to reach Mars. The next ISRO Mars orbiter draws on lessons from Perseverance.',
    indiaLearning:
      "Perseverance shows long-cycle, AI-heavy planetary missions are doable. India's ISRO should bet on a Mars sample-related cubesat or a co-led return mission. The strategic gap is autonomy software.",
    robotFamily: ['curiosity'],
    competitorRobots: [],
    atlasLinks: ['mars-rover', 'autonomous-navigation', 'isro'],
    wowFacts: [
      'Perseverance contains a piece of Mars rock — a tiny meteorite found on Earth — that was sent back to calibrate its instruments.',
      'It is the first rover with a microphone that has recorded the wind on Mars.',
      'Its computer is essentially a hardened 2002 PowerPC chip — slow by phone standards but radiation-proof.',
    ],
    controversies:
      'Some scientists argue Mars Sample Return is too expensive given recurring NASA budget cuts. The mission has been re-scoped multiple times since 2022.',
    legacy:
      'Perseverance is the rover that justified humanoid-mission planning to Mars in the 2030s. Every later rover or lander now starts with autonomy assumed.',
    category: 'space',
    isIndian: false,
  }),

  D({
    slug: 'optimus',
    whyYouShouldCare:
      "Whether or not Optimus succeeds, Tesla's gambit moved the entire humanoid industry's clock forward by five years. Optimus is the loudest single bet in robotics.",
    origin:
      'Elon Musk announced Optimus at Tesla AI Day in August 2021 — initially with a person in a robot suit. The first working prototype walked out a year later. Tesla repurposed its self-driving compute stack (the AI dojo) to train Optimus.',
    theProblemItSolved:
      "Tesla's premise is that humanoid form factor is the universal interface for human-made spaces — kitchens, factories, warehouses. Build one robot that can do any task a human can.",
    howItActuallyWorks:
      "Optimus uses 28 actuators, a Tesla-designed AI compute board, and the same neural-network training pipeline Tesla uses for Full Self-Driving. The robot learns from human demonstrations — recorded by people wearing motion-capture suits — then refined with reinforcement learning in simulation.",
    failureMoment:
      "At the 2022 reveal Optimus could barely walk. Critics called it a publicity stunt. Internal Tesla engineers reportedly questioned whether they had the right team to build it.",
    breakthroughMoment:
      "By late 2024 Optimus videos showed coordinated bimanual manipulation — folding laundry, sorting items, walking up stairs with a load. Tesla committed to internal factory deployment in 2025.",
    economicImpact:
      'Musk has publicly stated Optimus could become bigger than the car business. Even at 10% of that valuation, Optimus would move Tesla\'s market cap by hundreds of billions.',
    jobsAffected:
      'If Optimus works, the first jobs disrupted are factory tending, warehouse picking, and basic assembly — exactly the categories where India also has growth.',
    indiaRelevance:
      "Optimus's CTO-level engineering chain includes several Indian-origin engineers; India is also one of the largest Tesla AI-team hiring grounds remotely.",
    indiaLearning:
      "India shouldn't compete head-on. India should be the manufacturing partner for Optimus-class robots — actuators, sensors, electronics. Whoever builds the components wins the cheaper-humanoid race.",
    robotFamily: [],
    competitorRobots: ['atlas', 'figure-02', 'asimo'],
    atlasLinks: ['humanoid-robot', 'reinforcement-learning', 'imitation-learning'],
    wowFacts: [
      'Optimus uses the same neural network architecture as Tesla cars — robots and cars are training each other.',
      'Tesla AI Day demos involved 100,000 hours of human-motion capture data.',
      'Musk has promised Optimus prices will eventually drop below $20,000 — cheaper than most cars.',
    ],
    controversies:
      'At the 2024 Tesla "We, Robot" event, Optimus robots were partially teleoperated. Tesla disclosed it; critics called it misleading. The line between demo and capability remains contested.',
    legacy:
      'Whether Optimus ships or not, it has irreversibly normalised the idea of buying a humanoid for the house or factory.',
    category: 'industrial',
    isIndian: false,
  }),

  D({
    slug: 'kuka-kr',
    whyYouShouldCare:
      "If you've ever driven a car, your car was probably welded by a KUKA robot. The KR series is the workhorse of global manufacturing — and the German pride that catalysed the entire industrial robot industry.",
    origin:
      "KUKA was founded in 1898 as an Augsburg-based welding company. It built its first industrial robot, FAMULUS, in 1973 — the first electric six-axis industrial robot in the world. The KR series evolved into the modern KR QUANTEC line in the 2000s.",
    theProblemItSolved:
      "Automotive welding requires identical, repeatable welds across millions of vehicles. Before KUKA, this was either done with single-axis spot welders or by skilled humans. KUKA's six-axis arms gave car-makers a flexible, programmable welder that could be reused across body styles.",
    howItActuallyWorks:
      "A KR QUANTEC has six rotational joints, each driven by a brushless servo motor. A KUKA controller (KRC4) interprets a teach-pendant program and uses inverse kinematics to convert tool-tip motion into per-joint angle commands at ~1 kHz. Repeatability is typically ±0.05 mm — better than any human welder.",
    failureMoment:
      'In the 2008 financial crisis KUKA nearly went bankrupt as European car-makers froze capex. The company survived only because BMW signed a long-term integrator deal.',
    breakthroughMoment:
      'KUKA was acquired by Midea (China) in 2016 for €4.5B — a deal that became politically controversial in Germany and revealed how strategically central robotics had become to national industry. Today KUKA is the dominant Western-engineered industrial robot brand inside China.',
    economicImpact:
      'KUKA Group revenue is around €4B/year. KR-class robots are core to almost every major car factory worldwide — Maruti, Tata, Mahindra, Hyundai-India all run KUKA fleets.',
    jobsAffected:
      'Industrial welders. Over the past 50 years the entire automotive welding job category has shifted from hundreds of thousands of human welders to a few thousand technicians operating KR fleets.',
    indiaRelevance:
      "KUKA India (Pune) is a real, deep operation — engineering, integration, and field support. KUKA-trained Indian integrators are some of the country's most senior automation specialists.",
    indiaLearning:
      "India can't out-engineer KUKA on industrial arms. But India can dominate the service, integration and retrofit layer — exactly where Pune and Bengaluru companies (Difacto, Yaskawa India) are quietly winning.",
    robotFamily: ['ur5'],
    competitorRobots: [],
    atlasLinks: ['industrial-robot', 'six-axis-arm', 'inverse-kinematics'],
    wowFacts: [
      "A modern KUKA arm can move at over 2 m/s while maintaining sub-millimetre repeatability.",
      "Every modern Mercedes-Benz body shell is welded by a coordinated dance of 50+ KUKA arms.",
      "KUKA published an open-source robot programming language (KRL) — but most professional programmers still use the teach pendant directly.",
    ],
    controversies:
      "The 2016 Chinese acquisition of KUKA was viewed in Berlin as a loss of strategic industrial capability and partially triggered Germany's stricter foreign-investment screening.",
    legacy:
      'KUKA is the company that defined what an industrial robot looks like. Even the colour orange of robot arms in factories — KUKA chose that.',
    category: 'industrial',
    isIndian: false,
  }),

  D({
    slug: 'asimo',
    whyYouShouldCare:
      "ASIMO is the humanoid that made the world believe two-legged robots were possible. Without ASIMO's 20-year run, Atlas and Optimus would have nothing to stand on.",
    origin:
      "Honda's humanoid research began secretly in 1986 — the company wanted to build a robot that could help people in their daily lives. After 14 years of unreleased prototypes (E0 through P3), Honda unveiled ASIMO in October 2000.",
    theProblemItSolved:
      'Before ASIMO, dynamic bipedal walking outside a research lab was considered an unsolved problem. ASIMO walked, climbed stairs and pushed carts in front of live audiences — repeatedly.',
    howItActuallyWorks:
      'ASIMO has 34 degrees of freedom and walks via Honda\'s "intelligent real-time flexible walking" algorithm — it constantly senses tilt and shifts its centre of gravity. Force sensors in its feet and inertial measurement give it the same loop a human ankle does.',
    failureMoment:
      'ASIMO was famously expensive (each unit cost over $1M) and was never sold commercially. Honda stopped active development in 2018 — many felt the project ended without ever proving humanoid utility.',
    breakthroughMoment:
      'ASIMO ringing the New York Stock Exchange bell in 2002 became the iconic image of humanoid robotics for a decade. It performed alongside conductors, served drinks, and shook hands with three different US Presidents.',
    economicImpact:
      'Direct revenue: near zero. Indirect impact: every Japanese humanoid program, every Sony AIBO, every modern Boston Dynamics humanoid stands on ASIMO\'s research foundation.',
    jobsAffected:
      "Service jobs were ASIMO's stated target — none were ever truly replaced. The economic story is that ASIMO never reached commercial scale.",
    indiaRelevance:
      "Honda's Indian arm imports research-grade robots for technical demos, including ASIMO units that have toured IIT campuses.",
    indiaLearning:
      "ASIMO is a cautionary tale. India should not build a 20-year, billion-dollar humanoid program for prestige. India should build one narrow, useful robot — well — and ship it.",
    robotFamily: [],
    competitorRobots: ['atlas', 'optimus', 'pepper'],
    atlasLinks: ['humanoid-robot', 'bipedal-locomotion', 'degrees-of-freedom'],
    wowFacts: [
      "ASIMO's 4.3 km/h running speed in 2005 was the first dynamic running ever achieved by a bipedal robot.",
      'ASIMO performed at Disneyland\'s "Innoventions" attraction for over 11 years.',
      "Honda retired the project quietly in 2018 — but the team that built ASIMO went on to spin off Honda's electric vehicle prosthetics work.",
    ],
    controversies:
      "ASIMO was repeatedly criticised for being a marketing prop more than a research platform. Honda's response — keeping the algorithms internal — was seen as unhelpful to academia.",
    legacy:
      'ASIMO showed humanoid robots could be real. Two decades later, every humanoid startup founder grew up watching ASIMO on TV.',
    category: 'research',
    isIndian: false,
  }),

  D({
    slug: 'pepper',
    whyYouShouldCare:
      'Pepper was the first robot designed to read human emotions. Over 20,000 units sold — most were retired by 2020. Its rise and fall is the most honest case study in social robotics.',
    origin:
      "Pepper was created by Aldebaran Robotics in France (the same team behind NAO) and acquired by SoftBank in 2012. The first Pepper shipped in 2014 to SoftBank's Japanese mobile shops as a customer-greeting robot.",
    theProblemItSolved:
      "Customer-facing service in Japan suffers from chronic labour shortage. SoftBank's bet was that a 1.2 m friendly humanoid could greet, inform and reduce queue stress in retail.",
    howItActuallyWorks:
      'Pepper has 20 degrees of freedom, a touchscreen on its chest, and (most famously) an "emotion engine" that tracks face tilt, voice tone and posture to estimate the human\'s mood. Apps for Pepper were written in a custom IDE called Choregraphe.',
    failureMoment:
      'SoftBank ended production of Pepper in 2020. The robots were technically impressive but commercially weak — customers got bored after the novelty, and Pepper rarely covered its operating cost.',
    breakthroughMoment:
      "Pepper was the first humanoid robot used at scale — in the SoftBank stores, in Japanese banks, and at the Pizza Hut Asia chain. For a brief window in the mid-2010s, Pepper was the most-deployed humanoid in the world.",
    economicImpact:
      "Direct revenue: positive but modest (SoftBank bought Aldebaran for ~$100M). Indirect impact: Pepper made hospitality robotics a recognised category — Diligent's Moxi, Bear Robotics, and Toyota's HSR all draw from Pepper's playbook.",
    jobsAffected:
      "Greeter and informer jobs in Japanese retail. The economic verdict: Pepper didn't reduce headcount, it became one more uniform-wearing employee.",
    indiaRelevance:
      "Pepper made limited Indian appearances — a few hotel chains tried it pre-2019. It never penetrated, partly because Indian customer service expectations differ sharply from Japan's.",
    indiaLearning:
      "Indian social robots will only work if they speak Indian languages fluently. The lesson from Pepper: design the language stack first, hardware second.",
    robotFamily: ['nao'],
    competitorRobots: ['mitra'],
    atlasLinks: ['social-robot', 'emotion-recognition', 'human-robot-interaction'],
    wowFacts: [
      "Pepper's emotion engine was the first commercial implementation of affective computing.",
      "Over 100 Pepper robots were deployed in Buddhist funerals in Japan to chant sutras at lower cost than human monks.",
      "When SoftBank quietly ended Pepper production in 2020, the robot's cloud services kept running — but updates effectively stopped.",
    ],
    controversies:
      "Pepper was officially banned from Japanese church services after one congregation complained Pepper was being deployed as a 'cheap monk replacement.'",
    legacy:
      "Pepper is the robot that taught the industry hospitality robotics is hard — and that emotional design matters more than emotional sensing.",
    category: 'social',
    isIndian: false,
  }),

  D({
    slug: 'amazon-kiva',
    whyYouShouldCare:
      "If you've ever received an Amazon package, an Amazon robot moved your item to the human picker. Kiva (now Amazon Robotics) is the most economically successful warehouse-robot deployment in history.",
    origin:
      "Kiva Systems was founded in 2003 by Mick Mountz, a former engineer at the failed Webvan. He'd watched Webvan's warehouses fail because human pickers walked miles per shift. Kiva's solution: bring the shelf to the picker.",
    theProblemItSolved:
      "Order-picking in warehouses had been built on the same model since the 19th century — human pickers walking endless aisles. Kiva inverted it: robots carry mobile shelves to a stationary picker.",
    howItActuallyWorks:
      "Each Kiva 'drive unit' is a low orange robot that drives under a movable shelf-rack (a 'pod') and lifts it. The drive unit follows QR-code-like markers stuck to the warehouse floor and a central traffic-controller assigns routes. The picker stays in one ergonomic station; pods queue up at them.",
    failureMoment:
      "Pre-Amazon, Kiva almost failed. Big retail customers (Toys R Us, Staples) deployed pilots but few committed at scale. Mountz pitched 50+ companies before serious customers signed.",
    breakthroughMoment:
      "Amazon acquired Kiva for $775M in 2012 — and then stopped selling Kiva to anyone else. The acquisition transformed Amazon's fulfilment economics overnight; throughput per warehouse rose 2-4× and labour cost per package fell sharply.",
    economicImpact:
      "Amazon Robotics operates over 750,000 robots across global fulfilment centres (2024). The category Kiva created — Autonomous Mobile Robots in warehouses — is now a $5B+ industry.",
    jobsAffected:
      "Walking-picker jobs. Amazon's data shows total fulfilment headcount actually rose post-Kiva — but the nature of warehouse work shifted to stationary picking, fewer miles walked, and tighter performance metrics.",
    indiaRelevance:
      'GreyOrange (Gurugram-Bengaluru) is the Indian Kiva — its Butler AMR has deployed in Flipkart and dozens of global warehouses. India\'s e-commerce warehouse automation race is already on.',
    indiaLearning:
      "India built one of the world's best Kiva equivalents in GreyOrange — and almost no one outside the industry knows. Indian B2B robotics can compete globally; we just need to publish more and brand louder.",
    robotFamily: [],
    competitorRobots: ['grey-orange-butler'],
    atlasLinks: ['amr', 'warehouse-automation', 'fleet-management'],
    wowFacts: [
      'A single Amazon Kiva drive unit can lift 1,360 kg shelves and drive at over 5 km/h.',
      "Amazon Robotics' fleet now exceeds 750,000 mobile robots — more than the population of Bhutan.",
      "After the Amazon acquisition, Kiva's website disappeared overnight and the brand was retired — a rare 'win by absorption' in tech M&A.",
    ],
    controversies:
      "Amazon's warehouse injury rates rose alongside Kiva deployment — partly because pickers now stand in fixed positions doing more repetitions per hour. Multiple labour-board investigations followed.",
    legacy:
      "Kiva proved warehouse automation can be a $1B+ category. Every AMR company today — GreyOrange, Locus, Geek+ — is selling a version of Kiva's bet.",
    category: 'industrial',
    isIndian: false,
  }),

  D({
    slug: 'mitra',
    whyYouShouldCare:
      "Mitra is India's most-deployed indigenous robot. Built in Bengaluru by Invento Robotics, it's the answer to whether India can ship a real social robot — and the answer is yes.",
    origin:
      "Invento Robotics was founded by Balaji Viswanathan in Bengaluru in 2016, focused on building social robots in India for Indian conditions. Mitra is the company's flagship — a wheeled service robot designed for hospitals, hotels, and retail.",
    theProblemItSolved:
      "Indian hospitals and hotels can't afford the labour cost of dedicated greeters, queue managers and information desks. Mitra fills the gap with a friendly, screen-faced robot that recognises faces, holds short conversations, and guides visitors.",
    howItActuallyWorks:
      "Mitra uses a tablet face for expressive emotion, a base with omnidirectional wheels, a microphone array for far-field voice and a camera for face recognition. The software stack runs on standard PC hardware with custom Invento middleware in Python and ROS.",
    failureMoment:
      'Invento spent years searching for product-market fit — Mitra deployments were one-off pilots that rarely scaled. The pandemic temporarily destroyed the hospital greeting market that had been its main bet.',
    breakthroughMoment:
      "Mitra was on stage at the 2017 Global Entrepreneurship Summit in Hyderabad — introducing PM Modi and Ivanka Trump. The visibility transformed Invento's profile and helped Mitra reach Apollo, Manipal, Singapore Changi Airport, and Canara Bank.",
    economicImpact:
      'Invento has shipped ~75 Mitra units commercially as of 2024 — modest by global standards, but the largest indigenous Indian social-robot deployment ever.',
    jobsAffected:
      'Mitra augments — not replaces — front-desk staff. It handles greeting, queue management and FAQs, leaving humans for the actual problem solving.',
    indiaRelevance:
      'Mitra IS the India relevance. Designed in Bengaluru. Manufactured in India. Speaks Hindi, English, Telugu, Tamil, Kannada. Deployed across Indian healthcare and hospitality.',
    indiaLearning:
      "Mitra proves India can build a real commercial robot. The next step: indigenous components (vision chips, motor controllers, batteries) so the supply chain isn't just final assembly.",
    robotFamily: [],
    competitorRobots: ['pepper'],
    atlasLinks: ['social-robot', 'human-robot-interaction', 'speech-recognition'],
    wowFacts: [
      'Mitra speaks five Indian languages and Mandarin Chinese.',
      "Mitra was the first robot to formally welcome a sitting US presidential family member to India.",
      'A standard Mitra deployment costs roughly one-third of an equivalent Pepper setup.',
    ],
    controversies: '',
    legacy:
      "Mitra is proof India can produce commercial robots — not just integrate imported ones. Every Indian robotics startup looks at Invento's playbook.",
    category: 'indian',
    isIndian: true,
  }),

  D({
    slug: 'drdo-daksh',
    whyYouShouldCare:
      "Daksh is India's first indigenous defence robot to enter active military service. It's done what dozens of failed Indian R&D programs never managed: shipped, scaled and saved lives.",
    origin:
      "Daksh was developed at DRDO's R&DE(E) lab in Pune across the 2000s, with the Indian Army Corps of Engineers as the primary customer. It was inducted into service around 2010.",
    theProblemItSolved:
      "Improvised explosive device (IED) disposal was killing Indian Army bomb-disposal squad members at unacceptable rates, especially in Kashmir and the Northeast. Daksh let operators inspect and disarm suspect devices from a safe distance.",
    howItActuallyWorks:
      "Daksh is a 350-400 kg tracked vehicle with a 5-DOF manipulator arm, multiple cameras, X-ray equipment for explosive inspection, and a water-jet disruptor for safe ordnance disposal. Operators control it over an encrypted RF link from up to 500 metres away.",
    failureMoment:
      'Like many DRDO programs, Daksh suffered prolonged delays — the initial requirement was filed in the early 2000s and induction took nearly a decade. Multiple subsystems had to be redesigned to handle Indian operating temperatures.',
    breakthroughMoment:
      "Daksh's induction into the Indian Army marked the first time the country deployed an indigenous defence robot at scale. Over 60 units are now in service. The platform has since exported variants to several friendly nations.",
    economicImpact:
      "Daksh saved lives — that's the real ROI. Comparable foreign robots (TALON, Packbot) cost $200K-$400K each; Daksh is significantly cheaper while doing the same job.",
    jobsAffected:
      "EOD (explosive ordnance disposal) operator roles are redistributed — not reduced. Daksh keeps humans further from the bomb.",
    indiaRelevance:
      "100% indigenous. Designed, built and deployed in India. Every Indian Army Corps of Engineers EOD team uses it.",
    indiaLearning:
      "Daksh's lesson is patience pays. DRDO programs are slow, but the ones that ship — Daksh, Tejas, AKASH — are durable. India's defence robotics opportunity is huge if we accept multi-year cycles.",
    robotFamily: [],
    competitorRobots: ['spot'],
    atlasLinks: ['military-robot', 'teleoperation', 'eod-robotics'],
    wowFacts: [
      "Daksh can climb staircases up to 40°, traverse trenches, and operate continuously for over 3 hours.",
      "It carries portable X-ray equipment that can image a suspect package from multiple angles before disrupting it.",
      "Daksh was the first DRDO product to win the Raksha Mantri's Award for Excellence in indigenous defence technology.",
    ],
    controversies: '',
    legacy:
      "Daksh proved India can build complex defence robots end-to-end. The follow-on programs — armed UGVs, surveillance robots — all build on Daksh's electronics and chassis design.",
    category: 'military',
    isIndian: true,
  }),
]

export const FAMOUS_ROBOT_DETAILS_BY_SLUG = new Map(FAMOUS_ROBOT_DETAILS.map(d => [d.slug, d]))

export function getRobotDetail(slug: string): FamousRobotDetail | undefined {
  return FAMOUS_ROBOT_DETAILS_BY_SLUG.get(slug)
}
