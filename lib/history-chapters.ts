// lib/history-chapters.ts
// 6 narrative chapters + ~35 milestones with rich storytelling fields.

export interface HistoryMilestone {
  year: number
  title: string
  emoji: string
  imageUrl?: string
  hookLine: string
  story: string
  whyItMattered: string
  personBehind: string
  almostFailed: string
  indiaConnection?: string
  isKeyMilestone: boolean
  youtubeId?: string
  robotSlug?: string
  atlasSlug?: string
  ledTo: string

  // ── v2 reimagining (May 2026) ──
  milestoneImage?: string         // URL or path to image
  personImage?: string            // photo of inventor/creator
  chapterNumber?: number          // 1–6 (set by chapter assembly)
  readTimeMinutes?: number        // estimated read time
  keyFact?: string                // one-liner "mind blowing" stat
  location?: string               // city/country where it happened
  tags?: string[]                 // thematic tags
  quiz?: {
    question: string
    options: string[]
    correct: number
  }
}

export interface HistoryChapter {
  id: string
  title: string
  subtitle: string
  years: string
  emoji: string
  color: string             // hex
  chapterIntro: string
  pivotMoment: string
  milestones: HistoryMilestone[]
  /** Dramatic opening quote shown on the cinematic chapter card. */
  openingQuote?: string
}

export interface FuturePrediction {
  year: number
  title: string
  probability: number
  description: string
  source: string
  indiaAngle: string
}

// ────────────────────────────────────────────────────────────────────────────
const M = (m: HistoryMilestone): HistoryMilestone => m

const CHAPTERS: HistoryChapter[] = [
  {
    id: 'dream',
    title: 'The Dream',
    subtitle: 'How robots were born from fear, not hope',
    years: '1920–1960',
    emoji: '💭',
    color: '#a855f7',
    chapterIntro:
      "Before robots existed, humans dreamed about them in stories — and the dreams were mostly nightmares. Czech playwrights, British mathematicians and American science-fiction writers spent four decades imagining mechanical workers, mechanical brains and mechanical companions. By the time real engineering caught up in the 1950s, the cultural ground was already prepared. Without these dreamers, the actual robots that came next would never have been funded.",
    pivotMoment: "Karel Čapek's 1920 play R.U.R. — where the word 'robot' is used for the first time, derived from the Czech word for 'forced labour'.",
    milestones: [
      M({
        year: 1920,
        title: "R.U.R. — the play that named robots",
        emoji: '🎭',
        hookLine: 'A Czech play coined the word "robot" — and predicted everything we now worry about.',
        story:
          'Karel Čapek\'s play Rossum\'s Universal Robots opened in Prague in January 1921. In the play, manufactured workers eventually rebel and wipe out humanity. The word "robot" comes from the Czech "robota" — meaning forced labour. The play was translated into 30 languages within five years and stamped a permanent shape on how the world thinks about robots: artificial servants that might one day refuse to serve.',
        whyItMattered:
          'Every robotics debate today — automation anxiety, "will robots take our jobs", AI ethics — was framed by this single play. The vocabulary of robotics is Czech because of Čapek.',
        personBehind: 'Karel Čapek (1890–1938) — Czech playwright; the word was actually suggested by his brother Josef.',
        almostFailed:
          "Čapek considered using the word 'labori' or 'automat' instead. Either choice would have changed how we name machines forever.",
        isKeyMilestone: true,
        atlasSlug: 'robot',
        ledTo: 'It set up the cultural appetite that drove Asimov\'s laws of robotics in 1942.',
      }),
      M({
        year: 1942,
        title: "Asimov's Three Laws of Robotics",
        emoji: '📖',
        hookLine: 'Isaac Asimov wrote rules for robots 20 years before anyone built one.',
        story:
          "In a short story called 'Runaround', Isaac Asimov defined three laws — a robot may not harm a human, must obey humans, must protect itself — in that priority order. The laws were a literary device, not engineering. But for the next 80 years, every robot ethics committee would either cite them or react against them.",
        whyItMattered: "Asimov's framing of robot ethics shapes today's AI safety conversation directly — including India's emerging AI policy debate.",
        personBehind: 'Isaac Asimov (1920–1992) — Russian-born American biochemist and prolific science-fiction writer.',
        almostFailed: 'The story was nearly rejected by Astounding Science Fiction magazine for being too rule-heavy.',
        isKeyMilestone: false,
        ledTo: 'Turing\'s 1950 paper on machine intelligence took the question seriously enough to publish.',
      }),
      M({
        year: 1948,
        title: 'Grey Walter\'s tortoises',
        emoji: '🐢',
        hookLine: 'Two electronic "tortoises" became the first robots that explored on their own.',
        story:
          'British neurophysiologist W. Grey Walter built two small wheeled robots called Elmer and Elsie at the Burden Neurological Institute in Bristol. They had a light sensor, a touch sensor and a vacuum-tube brain. They roamed, found their charging hutch when batteries ran low, and avoided obstacles. They were the first electronic robots that behaved as if they had a goal.',
        whyItMattered: 'Walter showed simple analog circuits could produce life-like behaviour — a thread picked up 50 years later by Rodney Brooks\' subsumption architecture.',
        personBehind: 'W. Grey Walter (1910–1977) — American-born British neurophysiologist who pioneered electroencephalography (EEG).',
        almostFailed: 'Walter built the tortoises in his spare time. Funding from his employer was minimal.',
        isKeyMilestone: false,
        ledTo: "Inspired the autonomous-mobile-robot research wave at SRI and Stanford in the 1960s.",
      }),
      M({
        year: 1950,
        title: 'Turing\'s "Can machines think?"',
        emoji: '🧠',
        hookLine: "Alan Turing's 17-page paper invented the question all of AI tries to answer.",
        story:
          "Alan Turing published 'Computing Machinery and Intelligence' in the journal Mind. It proposed the famous Imitation Game — what we now call the Turing Test — and methodically dismantled every objection to the idea that machines could ever think. The paper was philosophical, but its assumptions baked the foundations of every later AI research program.",
        whyItMattered: "Every modern claim about AI consciousness or large-language-model intelligence is, at heart, a debate Turing already framed.",
        personBehind: 'Alan Turing (1912–1954) — British mathematician, broke the Enigma code in WWII, prosecuted for being gay and died at 41.',
        almostFailed: 'The paper was nearly suppressed by editors who found the topic too speculative for a serious journal.',
        isKeyMilestone: true,
        ledTo: 'The Dartmouth Conference in 1956, where the term "Artificial Intelligence" was coined.',
      }),
      M({
        year: 1954,
        title: 'Unimate patent filed',
        emoji: '📜',
        hookLine: 'George Devol patented the industrial robot before the first one was ever built.',
        story:
          'American inventor George Devol filed US Patent 2,988,237 — "Programmed Article Transfer" — describing a teachable, programmable manipulator arm. It was the first patent for what we now call an industrial robot. Devol had no buyer yet. He spent four years pitching the idea before Joseph Engelberger believed in it.',
        whyItMattered:
          'Without Devol\'s patent, modern industrial robotics simply does not exist. The patent number is still cited.',
        personBehind: 'George Devol (1912–2011) — American inventor with 40 patents, but largely unknown until late in life.',
        almostFailed:
          'Devol tried to license the patent to nine different companies before finding a partner. Most thought it was a fantasy device.',
        isKeyMilestone: true,
        atlasSlug: 'industrial-robot',
        ledTo: 'The founding of Unimation in 1956 — the company that would build the world\'s first real robot.',
      }),
    ],
  },

  {
    id: 'birth',
    title: 'The Birth',
    subtitle: 'The first real robot walked into a GM factory',
    years: '1961–1980',
    emoji: '🛠️',
    color: '#f59e0b',
    chapterIntro:
      "From 1961 to 1980, robots stopped being a thought experiment and became a real industrial category. The first Unimate at General Motors moved hot castings; Stanford's mobile robot Shakey planned its own routes; Victor Scheinman built the first useful electric robot arm. By 1980, the foundations of every modern robotics company — sensors, actuators, controllers, programming languages — were in place. Most of the practitioners weren't yet 30.",
    pivotMoment: 'Unimate moves its first hot die-cast part at GM\'s Trenton plant in 1961. Robotics is officially a job.',
    milestones: [
      M({
        year: 1961,
        title: 'Unimate goes to work at GM',
        emoji: '🏭',
        hookLine: 'The first industrial robot started its job exactly one human shift before the workers.',
        story:
          "Unimation's first Unimate was installed at General Motors' Trenton, New Jersey die-casting plant in 1961. It lifted hot, heavy castings out of the machine — a job that had blinded and burnt workers for decades. The robot weighed nearly two tonnes, was hydraulically powered, and was programmed by recording the motions of a human operator. GM kept it running for 100 hours of testing before letting it ship.",
        whyItMattered: 'This was the moment industrial robotics became a real product category, not a research topic.',
        personBehind: 'Joseph Engelberger (1925–2015) — sometimes called the "father of robotics", he co-founded Unimation with George Devol.',
        almostFailed: 'GM management was deeply sceptical and gave Unimation a single demonstration slot. The robot moved its first piece flawlessly on its second attempt.',
        isKeyMilestone: true,
        atlasSlug: 'industrial-robot',
        ledTo: 'Inspired Japanese auto manufacturers to license Unimation technology — leading to FANUC and Yaskawa.',
      }),
      M({
        year: 1969,
        title: 'Stanford Arm — first practical electric arm',
        emoji: '🦾',
        hookLine: 'Victor Scheinman built the electric robot arm that every modern robot arm copied.',
        story:
          'PhD student Victor Scheinman built the Stanford Arm — a six-axis, all-electric robotic manipulator. Where Unimate was hydraulic and dangerous, the Stanford Arm was electric, precise and quiet. Scheinman later worked on the PUMA arm for Unimation, which became the standard industrial arm template for the next 40 years.',
        whyItMattered: 'Every modern industrial robot arm — KUKA, ABB, FANUC, UR — uses Scheinman\'s 6-axis architecture.',
        personBehind: 'Victor Scheinman (1942–2016) — Stanford robotics PhD; later worked at Tesla Motors\' early manufacturing arm.',
        almostFailed: 'Scheinman was nearly forced to scrap the project when his advisor moved to MIT.',
        isKeyMilestone: true,
        atlasSlug: 'six-axis-arm',
        ledTo: 'The PUMA arm in 1978 — the first commercial electric robot arm.',
      }),
      M({
        year: 1969,
        title: 'Shakey the robot',
        emoji: '👁️',
        hookLine: 'The first robot that could plan, see and think — slowly.',
        story:
          "At SRI International in Menlo Park, a team built Shakey — the first general-purpose mobile robot that could reason about its actions. It used a TV camera and bump sensors to navigate. It planned multi-step tasks using a system called STRIPS, which became the foundation of AI planning. Shakey was famously slow (taking hours to traverse a room) — hence the name.",
        whyItMattered: 'Shakey introduced concepts (planning, perception, world models) that every autonomous robot still uses.',
        personBehind: 'Charles Rosen and Nils Nilsson led the SRI team; Nilsson later wrote the foundational AI textbook.',
        almostFailed: 'DARPA cut funding mid-project; Stanford Research Institute (SRI) carried it to completion alone.',
        isKeyMilestone: true,
        atlasSlug: 'autonomous-navigation',
        ledTo: 'Self-driving car research at Stanford and CMU 30 years later.',
      }),
      M({
        year: 1978,
        title: 'PUMA — the commercial robot arm',
        emoji: '🤖',
        hookLine: 'The Programmable Universal Machine for Assembly made robots affordable for industry.',
        story:
          'Unimation released PUMA — designed by Victor Scheinman — as the first commercially available, programmable electric robot arm intended for assembly tasks. General Motors backed the development. PUMA arms could be programmed in VAL (Variable Assembly Language). Within five years, PUMAs were installed in factories across the US, Japan and Europe.',
        whyItMattered: 'PUMA proved electric robot arms could replace hydraulic ones at scale. Hydraulic industrial robots became obsolete within a decade.',
        personBehind: 'Victor Scheinman + GM\'s manufacturing engineering group.',
        almostFailed: 'Initial PUMA pricing scared off most buyers. GM\'s in-house orders saved the program for two years.',
        isKeyMilestone: false,
        ledTo: 'The 1980s industrial-automation boom in Japan and Europe.',
      }),
    ],
  },

  {
    id: 'industrial',
    title: 'The Industrial Revolution 2.0',
    subtitle: 'Robots moved from research labs to shop floors and rewrote the economy',
    years: '1981–1999',
    emoji: '🏭',
    color: '#06b6d4',
    chapterIntro:
      'In the 1980s and 90s, robotics escaped the lab. SCARA arms made electronics assembly affordable. Japan poured national money into the field and became the dominant robot manufacturer. Honda began secretly building humanoids; Sony built robotic pets; NASA sent a rover to Mars. By 1999, robots were no longer a curiosity — they were assembling your TV, your phone, your car. India was watching from the sidelines.',
    pivotMoment: 'NASA\'s Sojourner rover lands on Mars in 1997 — the first robot to operate autonomously on another planet.',
    milestones: [
      M({
        year: 1981,
        title: 'SCARA robot at Yamaha',
        emoji: '⚙️',
        hookLine: 'A four-axis arm that finally made electronics assembly affordable.',
        story:
          "The Selective Compliance Articulated Robot Arm — SCARA — was developed by Hiroshi Makino at Yamanashi University and commercialised by Sankyo Seiki and Yamaha. Its key innovation: it could move freely in the horizontal plane but resisted vertical motion — perfect for inserting components onto circuit boards.",
        whyItMattered: 'SCARA is the reason your phone, your microwave and your TV are affordable. Without it, electronics assembly stayed expensive.',
        personBehind: 'Hiroshi Makino (1933–2019) — Japanese mechanical engineer at Yamanashi University.',
        almostFailed: 'Industrial customers initially preferred 6-axis arms even though they were overkill — it took five years for SCARA to catch on.',
        isKeyMilestone: false,
        atlasSlug: 'scara',
        ledTo: 'The Asian electronics manufacturing boom of the 1990s.',
      }),
      M({
        year: 1986,
        title: 'Honda begins ASIMO research',
        emoji: '🚶',
        hookLine: 'Honda quietly started building humanoid robots while everyone else built arms.',
        story:
          'Honda began Project E0 — the first humanoid robot prototype in the company\'s history. The internal mandate: build a robot that could help people, walk like a person, move freely. The project was kept secret for 11 years. The first public demo of P2 in 1996 stunned the robotics community.',
        whyItMattered: 'Honda\'s patient bet on humanoids created the playbook every humanoid startup follows today.',
        personBehind: 'Honda corporate R&D — leadership rotated across the program for nearly three decades.',
        almostFailed: 'Multiple Honda executives wanted to cancel the program throughout the early 90s. Soichiro Honda\'s family loyalty kept it alive.',
        isKeyMilestone: false,
        robotSlug: 'asimo',
        ledTo: 'ASIMO\'s public reveal in 2000 — the most-watched humanoid robot of its era.',
      }),
      M({
        year: 1996,
        title: 'Honda P2 — the world sees a walking robot',
        emoji: '🦿',
        hookLine: 'Honda unveils P2 — and humanoid robotics is no longer fiction.',
        story:
          'After 11 years of secret development, Honda revealed P2 in 1996 — a 6-foot, 210kg humanoid that walked on two legs, climbed stairs and pushed a cart. The robotics community was shocked. Most researchers had assumed dynamic bipedal walking was decades away. P2 had been ready for over a year.',
        whyItMattered: 'P2 forced every robotics lab in the world to rethink what was possible. Funding for humanoid research jumped globally.',
        personBehind: 'Honda Research and Development team; the program was sometimes called "Honda\'s moon shot".',
        almostFailed: 'P2 had been hidden for so long that some external scientists thought Honda had abandoned the project.',
        isKeyMilestone: true,
        robotSlug: 'asimo',
        ledTo: 'ASIMO in 2000 and a global wave of humanoid research.',
      }),
      M({
        year: 1997,
        title: 'NASA Sojourner rover on Mars',
        emoji: '🪐',
        hookLine: 'The first robot to drive on another planet — 10.5 kg, 13 metres total.',
        story:
          'Sojourner — the first robotic rover to operate on another planet — bounced down to the Martian surface aboard Mars Pathfinder on July 4, 1997. It weighed 10.5 kg, was the size of a microwave, and travelled a total of 100 metres in 83 sols. It returned 16,500 images. Sojourner proved a small, cheap rover could do meaningful science.',
        whyItMattered: 'Sojourner created the playbook for every later Mars rover — Spirit, Opportunity, Curiosity, Perseverance.',
        personBehind: "Donna Shirley led the Mars Exploration Programme at JPL. Sojourner's wheels were designed by Brian Wilcox.",
        almostFailed: 'The Pathfinder landing system was so cheap (using airbags!) that NASA management nearly cancelled it as too risky.',
        indiaConnection: "Sojourner's success indirectly catalysed ISRO's own planetary ambition — Mangalyaan launched 16 years later.",
        isKeyMilestone: true,
        atlasSlug: 'mars-rover',
        ledTo: 'Spirit and Opportunity in 2004; Curiosity in 2012; Perseverance in 2021.',
      }),
      M({
        year: 1999,
        title: 'Sony AIBO — the first robot pet',
        emoji: '🐕',
        hookLine: 'A $2,000 robot dog that sold out in 20 minutes.',
        story:
          'Sony launched AIBO (Artificial Intelligence Robot) in May 1999 in Tokyo. The first 3,000 units sold out in 20 minutes online — at $2,000 each. AIBO recognised faces, learned tricks, expressed moods. It was the first consumer robot that was unapologetically a pet.',
        whyItMattered: 'AIBO proved consumers would pay for emotional connection with robots. The companion-robotics industry was born.',
        personBehind: 'Sony\'s Digital Creatures Lab, led by Toshitada Doi.',
        almostFailed: 'AIBO was so expensive that Sony executives feared it would never recover R&D costs. The 20-minute sell-out changed minds.',
        isKeyMilestone: false,
        robotSlug: 'aibo',
        ledTo: 'PARO (2003), Pepper (2014), and the entire companion-robotics category.',
      }),
    ],
  },

  {
    id: 'intelligence',
    title: 'The Intelligence Awakening',
    subtitle: 'Robots stopped being dumb machines and started learning',
    years: '2000–2015',
    emoji: '🧠',
    color: '#10b981',
    chapterIntro:
      "From 2000 onward, the key thing changing about robots wasn't hardware — it was software. Roomba showed mass-market consumer robotics worked. BigDog showed legs were possible at scale. Watson beat humans at Jeopardy. AlphaGo beat the world champion at Go. By 2015, the bottleneck shifted from hardware to AI: the robots could do the action; could they figure out the action to take?",
    pivotMoment: 'iRobot launches the first Roomba in 2002. Consumer robotics is no longer theoretical.',
    milestones: [
      M({
        year: 2002,
        title: 'iRobot Roomba',
        emoji: '🧹',
        hookLine: 'A military robot company pivoted to vacuums and saved itself.',
        story:
          'iRobot — founded by MIT robotics researchers Rodney Brooks, Colin Angle and Helen Greiner — launched the Roomba on September 17, 2002. iRobot had spent a decade building military bomb-disposal robots and had nearly run out of cash. The Roomba pivot was a survival play. The first model used a random-walk algorithm. It sold 1 million units within three years.',
        whyItMattered: 'Roomba is the founding product of the entire consumer-robotics industry. Without it, no robot mops, no robot lawn mowers, no robot pool cleaners.',
        personBehind: 'Rodney Brooks (Australian roboticist, MIT) led the technical direction; Colin Angle led commercial.',
        almostFailed: 'iRobot was weeks from running out of cash in 2003. Holiday sales rescued the company.',
        isKeyMilestone: true,
        robotSlug: 'roomba',
        ledTo: 'Modern robot vacuum competitors — Roborock, Xiaomi, Eufy — and the consumer robotics category.',
      }),
      M({
        year: 2005,
        title: 'Boston Dynamics BigDog',
        emoji: '🐕',
        hookLine: 'A four-legged robot that walked through deep snow and got kicked — and stayed upright.',
        story:
          "Boston Dynamics revealed BigDog — a DARPA-funded quadruped designed to carry military payloads over rough terrain. The famous demo video showed engineers kicking BigDog hard, and the robot stumbling but staying upright. It walked through snow, mud and on ice. It was loud — gas-powered — and never deployed, but it proved dynamic legged locomotion worked.",
        whyItMattered: 'BigDog is the direct ancestor of Spot. Every modern quadruped uses its control approach.',
        personBehind: 'Marc Raibert — founder of Boston Dynamics, previously at MIT Leg Lab.',
        almostFailed: 'The US Marines rejected BigDog for being too loud for combat use. The project pivoted to research before becoming Spot.',
        isKeyMilestone: false,
        robotSlug: 'spot',
        ledTo: 'Spot in 2019 — quiet, electric, commercial.',
      }),
      M({
        year: 2011,
        title: 'IBM Watson wins Jeopardy',
        emoji: '🎯',
        hookLine: 'A computer beat the world\'s best Jeopardy players — at language.',
        story:
          'IBM\'s Watson defeated Brad Rutter and Ken Jennings — the two top Jeopardy champions of all time — on the show in February 2011. Watson wasn\'t a robot, but it was the first machine to demonstrate human-level natural language understanding on TV. It marked the inflection point where AI became a commercial product, not just research.',
        whyItMattered: 'Watson made every executive in the world believe AI was business-ready. The "machine-learning industry" started here.',
        personBehind: 'David Ferrucci led the Watson team at IBM Research.',
        almostFailed: 'IBM nearly cancelled the project in 2009 due to slow progress.',
        isKeyMilestone: true,
        ledTo: 'OpenAI (founded 2015), Anthropic (2021), the LLM era.',
      }),
      M({
        year: 2013,
        title: 'Boston Dynamics Atlas v1',
        emoji: '🏃',
        hookLine: 'The first humanoid that could survive being shoved.',
        story:
          'DARPA unveiled Atlas in 2013 as part of the Robotics Challenge — a competition for disaster-response robots. Atlas was 1.8m tall, 150kg, hydraulically driven, and tethered. It could walk through rubble and operate human tools. Most contestants in the DARPA Challenge crashed Atlas at least once. The 2015 finals video became one of the most-watched robotics videos ever.',
        whyItMattered: 'Atlas proved humanoids could be athletic, not just stiff demos. Every modern humanoid startup measures against Atlas.',
        personBehind: 'Boston Dynamics / DARPA program led by Gill Pratt.',
        almostFailed: 'Several DARPA Challenge teams nearly destroyed their loaned Atlas units in testing. Boston Dynamics had to ship replacements.',
        isKeyMilestone: true,
        robotSlug: 'atlas',
        ledTo: 'The 2024 electric Atlas; Figure, Apptronik, Optimus humanoids.',
      }),
      M({
        year: 2015,
        title: 'AlphaGo defeats a human Go pro',
        emoji: '♟️',
        hookLine: 'DeepMind\'s AlphaGo beat a 9-dan professional — a feat thought to be 10 years away.',
        story:
          'DeepMind\'s AlphaGo defeated Fan Hui — a European Go champion — 5-0 in October 2015. The robotics and AI community was stunned. Go was considered the last bastion of human cognitive superiority over machines. AlphaGo used reinforcement learning combined with deep neural networks — techniques that would soon transform robot learning too.',
        whyItMattered: 'AlphaGo\'s technique — learning from self-play with deep RL — is now used to train robot policies for everything from grasping to walking.',
        personBehind: 'David Silver and the DeepMind team in London.',
        almostFailed: 'Google had nearly shut down DeepMind\'s expensive compute spend a year earlier.',
        isKeyMilestone: false,
        atlasSlug: 'reinforcement-learning',
        ledTo: 'AlphaGo Zero (2017), modern robot learning policies, OpenAI Five.',
      }),
    ],
  },

  {
    id: 'india',
    title: 'The India Chapter',
    subtitle: 'India\'s robotics story — from ISRO mechanisms to a startup boom',
    years: '1969–2024',
    emoji: '🇮🇳',
    color: '#fbbf24',
    chapterIntro:
      "India's robotics story has run parallel to the global one — quieter, slower, but real. ISRO built robotic mechanisms in the 1960s. BARC automated nuclear facilities in the 80s. TELCO Pune installed India's first industrial robot in 1983. DRDO produced Daksh in 2010. Invento Robotics shipped Mitra in 2017. GreyOrange built one of the world's largest AMR fleets. The chapter is still being written — and the protagonists are young.",
    pivotMoment: 'Invento Robotics ships Mitra to Apollo Hospitals in 2017 — proof India can manufacture a real commercial robot.',
    milestones: [
      M({
        year: 1969,
        title: 'ISRO\'s first robotic mechanisms',
        emoji: '🛰️',
        hookLine: 'ISRO began building robotic deployment mechanisms in its earliest years.',
        story:
          "When ISRO was formally founded in 1969, one of its earliest engineering challenges was building robotic deployment mechanisms for satellites — solar panel arrays that had to unfold reliably in space. The first practical mechanisms were built at VSSC in Thiruvananthapuram. They were essentially India's first space robots, even if they weren't called that.",
        whyItMattered: 'ISRO\'s mechanism engineering tradition is why India is one of the few countries that can build lander legs and rover articulation domestically.',
        personBehind: 'A young Vikram Sarabhai era ISRO engineering team — names mostly unrecorded.',
        almostFailed: 'Funding crunches in the 1970s nearly forced ISRO to import deployment mechanisms instead.',
        indiaConnection: 'This thread leads directly to Chandrayaan-3\'s lander legs in 2023.',
        isKeyMilestone: true,
        ledTo: 'Pragyan rover (2008/2023), Chandrayaan robotic arms.',
      }),
      M({
        year: 1983,
        title: 'First industrial robot at TELCO Pune',
        emoji: '🏭',
        hookLine: 'India installed its first industrial robot in a Tata factory.',
        story:
          'TELCO (now Tata Motors) at Pimpri-Chinchwad, Pune, installed an industrial robot — likely a licensed Unimate or Kawasaki — for welding operations in 1983. The robot replaced manual spot-welding stations. By the end of the decade, similar deployments had spread across Maruti, Bajaj and Hero auto plants.',
        whyItMattered: 'Indian automotive automation began here. Every car welded in India after the mid-80s benefited.',
        personBehind: 'TELCO\'s manufacturing engineering group; the manager who championed the import is uncredited in public records.',
        almostFailed: 'Indian industrial policy at the time was hostile to imports. The robot import licence was contested in the planning ministry.',
        isKeyMilestone: false,
        atlasSlug: 'industrial-robot',
        ledTo: 'The Maruti Suzuki Manesar plant\'s near-full automation by 2010.',
      }),
      M({
        year: 1984,
        title: 'BARC nuclear automation',
        emoji: '⚛️',
        hookLine: 'BARC\'s remote handling robots became India\'s defence-grade automation backbone.',
        story:
          "Bhabha Atomic Research Centre (BARC) in Trombay began building remote handling robots in the 1980s for radioactive material handling. These weren't show-piece robots — they were essential tools for India's nuclear programme. The technology stayed largely classified, but the engineering talent pool it built later spilled into defence and aerospace.",
        whyItMattered: "BARC's remote-handling expertise is why DRDO Daksh's manipulator arm was possible 25 years later.",
        personBehind: 'BARC\'s electronics division — work largely uncredited in public.',
        almostFailed: 'International sanctions after the 1974 Pokhran test starved BARC of imported parts. Engineers had to reverse-engineer key components.',
        isKeyMilestone: false,
        ledTo: 'DRDO Daksh, Indian Navy underwater robots.',
      }),
      M({
        year: 2010,
        title: 'DRDO Daksh inducted into Indian Army',
        emoji: '💣',
        hookLine: "India's first indigenous military robot ships at scale.",
        story:
          "Daksh — a remote-controlled bomb-disposal robot built by DRDO's R&DE(E) lab in Pune — was inducted into the Indian Army around 2010. It was the first indigenous Indian defence robot to enter active service. Over 60 units were delivered. Daksh has since saved an unknown number of Indian Army EOD operator lives.",
        whyItMattered: "Daksh proved India can engineer and ship a complex defence robot end-to-end. The DRDO model — long timeline, indigenous components — became the playbook for future defence robotics.",
        personBehind: 'DRDO R&DE(E) Pune team. Director-level credit was given but the engineering leads remain largely unnamed publicly.',
        almostFailed: 'Daksh\'s development was delayed by nearly five years due to component sourcing and field-test failures.',
        indiaConnection: 'Daksh is India\'s answer to the iRobot Packbot. It works.',
        isKeyMilestone: true,
        robotSlug: 'drdo-daksh',
        ledTo: 'Surveillance robots, armed UGVs in DRDO pipeline.',
      }),
      M({
        year: 2016,
        title: 'Invento Robotics founded in Bengaluru',
        emoji: '🏢',
        hookLine: 'Balaji Viswanathan founded the company that would build India\'s first commercial social robot.',
        story:
          "Balaji Viswanathan — a former Microsoft engineer and prolific Quora writer — founded Invento Robotics in Bengaluru in 2016. The mission: build social robots in India for Indian contexts. The first prototype, Mitra, was 3D-printed in a Bengaluru apartment.",
        whyItMattered: 'Invento is the proof that Indian robotics startups can ship hardware — not just software. The blueprint matters.',
        personBehind: 'Balaji Viswanathan — Quora India\'s most-followed writer, then a hardware founder.',
        almostFailed: 'Invento bootstrapped for three years before its first paying customer. The founder ran out of personal savings twice.',
        indiaConnection: 'Bengaluru-built. Indian languages first. Sold to Indian hospitals.',
        isKeyMilestone: true,
        robotSlug: 'mitra',
        ledTo: 'Mitra deployments at Apollo, Manipal, Canara Bank.',
      }),
      M({
        year: 2017,
        title: 'Mitra at the Modi–Ivanka Trump GES event',
        emoji: '🤝',
        hookLine: 'Mitra greeted PM Modi and Ivanka Trump at the Global Entrepreneurship Summit.',
        story:
          "At the Global Entrepreneurship Summit in Hyderabad in November 2017, Mitra — Invento Robotics' first commercial robot — opened the event by greeting Prime Minister Modi and visiting US Adviser Ivanka Trump. The visibility transformed Invento's profile overnight and validated Indian-built service robots for enterprise customers.",
        whyItMattered: 'Mitra became a national symbol that India could ship a real robot. Bengaluru\'s hardware startups gained credibility with investors.',
        personBehind: 'Balaji Viswanathan + the Invento Robotics team.',
        almostFailed: 'The Mitra unit for the GES event had a software glitch the morning of the demo. The team fixed it during the final rehearsal.',
        isKeyMilestone: false,
        robotSlug: 'mitra',
        ledTo: 'Mitra deployments at Indian hotels, banks, Singapore Changi Airport.',
      }),
      M({
        year: 2019,
        title: 'India wins WRO Gold',
        emoji: '🥇',
        hookLine: 'Indian student teams take top honours at the World Robot Olympiad.',
        story:
          'Indian student teams — most coached by privately-run robotics clubs — placed first in multiple categories at the World Robot Olympiad in 2019. The schools that produced the winning teams (Delhi Public School Bengaluru, Saint James Chennai, others) have since become magnets for robotics talent.',
        whyItMattered: 'WRO success unlocked Indian school-level robotics funding. The pipeline of Indian robotics engineers got longer.',
        personBehind: 'Independent coaches; the schools largely funded the trips themselves.',
        almostFailed: 'Several state education boards still refused to recognise robotics as a curricular subject.',
        isKeyMilestone: false,
        ledTo: 'The PLI scheme covering robotics in 2021; rapid growth of Indian school robotics clubs.',
      }),
      M({
        year: 2021,
        title: 'PLI scheme includes robotics',
        emoji: '📈',
        hookLine: 'India\'s Production-Linked Incentive scheme starts subsidising robotics manufacturing.',
        story:
          'In 2021 the Production-Linked Incentive (PLI) scheme — originally focused on electronics — was expanded to cover specific automation hardware. The scheme offers manufacturing subsidies for Indian firms making robot components, motor controllers and sensors. It was the first national policy to formally treat robotics as a strategic sector.',
        whyItMattered: 'PLI created economic incentive to manufacture robotics components in India — a precondition for self-sufficient deployment.',
        personBehind: 'India\'s Ministry of Heavy Industries; specific scheme designers uncredited publicly.',
        almostFailed: 'The scheme was nearly trimmed during the COVID-budget revisions.',
        isKeyMilestone: false,
        ledTo: 'Make-in-India robot-component investments across Bengaluru, Pune, Chennai.',
      }),
      M({
        year: 2022,
        title: 'GreyOrange AMRs in Flipkart',
        emoji: '📦',
        hookLine: 'Indian-built warehouse robots fulfil Indian e-commerce orders.',
        story:
          'GreyOrange — founded in Gurugram in 2011 by Samay Kohli and Akash Gupta — deployed its Butler AMR (Autonomous Mobile Robot) at scale in Flipkart\'s warehouses in 2022. Butler is the Indian functional equivalent of Amazon\'s Kiva drive units. The deployment proved Indian robotics startups could compete with Western incumbents on home turf.',
        whyItMattered: 'GreyOrange is one of very few global AMR companies competing with Amazon Robotics and Locus. India built one.',
        personBehind: 'Samay Kohli — IIT Delhi engineer turned founder, now based in Boston.',
        almostFailed: 'GreyOrange has gone through multiple near-pivots and management changes. The Flipkart deal stabilised the company.',
        isKeyMilestone: true,
        atlasSlug: 'amr',
        ledTo: 'Indian robotics startups raising international rounds; e-commerce warehouse automation growth.',
      }),
    ],
  },

  {
    id: 'ai-fusion',
    title: 'The AI Fusion',
    subtitle: 'When AI met robotics, everything changed again',
    years: '2016–2024',
    emoji: '✨',
    color: '#ef4444',
    chapterIntro:
      "The Atlas-AlphaGo era set the stage. After 2016, the combination of cheap deep learning, simulation-trained policies and rapid LLM advances turned robotics from a hardware bottleneck into an AI integration race. Boston Dynamics shipped Spot commercially. Tesla announced Optimus. Figure raised hundreds of millions. ChatGPT changed how every robot can be programmed. By 2024, the question isn\'t whether humanoids will work — it\'s when, and which company.",
    pivotMoment: 'Tesla announces Optimus at AI Day, August 2021 — and the humanoid funding wave begins.',
    milestones: [
      M({
        year: 2020,
        title: 'Boston Dynamics Spot ships commercially',
        emoji: '🐕',
        hookLine: 'Spot is the first commercially viable mobile robot most people can identify by sight.',
        story:
          'After two years of beta deployments at Ford, BP and NASA JPL, Boston Dynamics opened Spot for general commercial sale in 2020 at $74,500 a unit. The famous "Do You Love Me" dancing video, released the same year, pulled over 60 million views and put Spot in the public consciousness.',
        whyItMattered: 'Spot proved a quadruped could be a real industrial tool, not a research demo. Every later legged robot competes against it.',
        personBehind: 'Marc Raibert (founder), Rob Playter (current CEO), Hyundai (owner since 2020).',
        almostFailed: 'Boston Dynamics had been bought and sold three times (Google, SoftBank, Hyundai) — many felt the company would never ship a profitable product.',
        isKeyMilestone: true,
        robotSlug: 'spot',
        ledTo: 'A wave of quadruped competitors (Unitree, ANYbotics); the commercial inspection-robot industry.',
      }),
      M({
        year: 2021,
        title: 'Tesla announces Optimus',
        emoji: '🤖',
        hookLine: 'Elon Musk reveals Tesla\'s humanoid robot — with a person in a costume.',
        story:
          'At Tesla AI Day in August 2021, Elon Musk announced Tesla Bot — soon renamed Optimus. The reveal involved a person in a robot suit dancing on stage. Industry reaction was sceptical. Within 12 months, Tesla had a working prototype. By 2024 Optimus videos showed credible manipulation. The Optimus announcement triggered the modern humanoid funding wave.',
        whyItMattered: 'Optimus pulled humanoid robotics into mainstream investor consciousness. Funding for Figure, Apptronik, 1X all followed.',
        personBehind: 'Elon Musk + Tesla AI team. Many key engineers came from Tesla\'s Autopilot programme.',
        almostFailed: 'Multiple Tesla engineers reportedly felt the AI Day reveal was a marketing stunt that could damage credibility.',
        isKeyMilestone: true,
        robotSlug: 'optimus',
        ledTo: 'The 2024 humanoid race — Figure-01, Sanctuary AI Phoenix, Apptronik Apollo.',
      }),
      M({
        year: 2023,
        title: 'India\'s robot density hits 4 per 10K workers',
        emoji: '📊',
        hookLine: 'India crosses an inflection point on the global robot density map.',
        story:
          'The IFR 2023 report shows India\'s industrial robot density reaching 4 per 10,000 manufacturing workers — small in absolute terms but a +59% YoY jump, the fastest among large economies. India became one of the most-watched robotics markets globally.',
        whyItMattered: "India's robot density growth rate is now triple China's average. The gap to close is large — and that's the opportunity.",
        personBehind: 'IFR (International Federation of Robotics) data team; India\'s growth was driven by Maruti, Tata, Mahindra plant upgrades.',
        almostFailed: 'India almost slipped off the IFR top-15 watchlist in 2019 — the post-pandemic auto recovery drove the surge.',
        indiaConnection: "This is India's headline number. Internalise it.",
        isKeyMilestone: true,
        atlasSlug: 'robot-density',
        ledTo: 'A renewed wave of Indian robotics startups; the India robotics opportunity narrative globally.',
      }),
      M({
        year: 2024,
        title: 'Figure-01 unveiled',
        emoji: '🦾',
        hookLine: 'A two-year-old startup unveiled a working humanoid robot — and OpenAI invested.',
        story:
          "Figure AI, founded by Brett Adcock in 2022, unveiled Figure-01 in early 2024 with a video of the robot folding laundry and walking around an office. OpenAI joined Figure's investor list. The combination — fast hardware iteration plus state-of-the-art LLM integration — represents the modern humanoid playbook in its purest form.",
        whyItMattered: 'Figure-01 proved a startup could build a working humanoid in two years if it had the right team and capital. The bar for entry dropped.',
        personBehind: 'Brett Adcock — serial entrepreneur previously behind Archer Aviation.',
        almostFailed: 'Figure had not yet shipped a single unit at the time of the demo. Competitors questioned whether the videos were edited.',
        isKeyMilestone: true,
        ledTo: 'The 2025 humanoid pilot deployments at BMW, Volkswagen, BMW US plants.',
      }),
    ],
  },
]

export { CHAPTERS }

// ────────────────────────────────────────────────────────────────────────────
// Future predictions
// ────────────────────────────────────────────────────────────────────────────
export const FUTURE_PREDICTIONS: FuturePrediction[] = [
  { year: 2026, title: 'First commercial humanoid robot in an Indian factory', probability: 45,
    description: 'A Figure / Optimus / Apptronik unit deployed in a Maruti, Tata or Mahindra plant.',
    source: 'IFR India forecasts, 2024',
    indiaAngle: 'Likeliest first deployer: Maruti Suzuki Manesar.' },
  { year: 2028, title: 'India\'s robot density reaches 50 per 10K workers', probability: 62,
    description: 'A 12× increase from 2023\'s figure of 4 — driven by automotive and electronics manufacturing.',
    source: 'IFR projection + Indian government robotics roadmap',
    indiaAngle: 'This is the inflection point — India joins the global top-25 by robot density.' },
  { year: 2030, title: 'First fully autonomous surgery performed in India', probability: 38,
    description: 'A surgical robot completes a procedure end-to-end without surgeon override.',
    source: 'Intuitive Surgical roadmap commentary',
    indiaAngle: 'SS Innovations\' SSI Mantra is the likeliest indigenous candidate.' },
  { year: 2035, title: '1 billion household robots worldwide', probability: 71,
    description: 'Robot vacuums, mops, lawn mowers, pool cleaners — combined installed base passes 1B.',
    source: 'Roborock and iRobot 2024 investor decks',
    indiaAngle: 'India will represent 8–10% of this number if urban adoption follows current trends.' },
  { year: 2040, title: 'India becomes a top-5 robotics manufacturer', probability: 55,
    description: 'India joins China, Japan, Germany, USA and South Korea as a top-tier robot producer.',
    source: 'Indian Ministry of Heavy Industries vision documents',
    indiaAngle: 'Pune and Bengaluru as the twin manufacturing hubs.' },
  { year: 2050, title: 'Robots outnumber humans in global manufacturing roles', probability: 88,
    description: "The crossover year — more 'robot-equivalent' workers than human workers in factories worldwide.",
    source: 'McKinsey + IFR 50-year projections',
    indiaAngle: 'India\'s service sector grows to absorb the displaced manufacturing workforce.' },
]

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────
export function getAllMilestones(): HistoryMilestone[] {
  return CHAPTERS.flatMap(c => c.milestones).sort((a, b) => a.year - b.year)
}
