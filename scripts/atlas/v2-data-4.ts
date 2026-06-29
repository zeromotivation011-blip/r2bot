// Batch 4: materials, HRI, India, space, medical, agri, history, business
import type { TermV2 } from './v2-types';

export const TERMS_BATCH_4: TermV2[] = [
  // ===== Materials =====
  {
    slug: 'carbon-fibre-composite',
    title: 'Carbon-Fibre Composites in Robotics — Complete Guide | R2BOT',
    description:
      'Carbon-fibre composites give robots incredibly high strength-to-weight ratios. Standard in drone arms, surgical-robot links, and racing humanoid frames.',
    bucket: 'materials-manufacturing',
    category: 'fundamentals',
    difficulty: 'intermediate',
    tags: ['carbon-fibre', 'composite', 'lightweight', 'drone', 'humanoid'],
    relatedTerms: ['additive-manufacturing', 'cnc-milling', 'humanoid-robot', 'drone-uav'],
    youtubeSearchQuery: 'carbon fibre composite robotics tutorial',
    definition:
      'Carbon-fibre reinforced polymer (CFRP) is a composite of fine carbon strands embedded in an epoxy or thermoplastic matrix. It is stronger than steel at a fraction of the weight, making it the material of choice for drone arms, prosthetic limbs, surgical-robot links, and high-performance humanoid frames.',
    howItWorks:
      "Carbon-fibre tows are woven into sheets or laid as unidirectional plies, then impregnated with epoxy resin and cured under heat and pressure. The resulting laminate is anisotropic — strongest along the fibre direction. Engineers can tailor stiffness and strength by stacking plies at different angles. CNC machining, water-jet cutting, and 3D-printed mould-tooling are common ways to shape parts.",
    realWorld:
      'DJI Mavic propellers, every commercial drone arm, Boston Dynamics Atlas link covers, Hocoma rehabilitation exoskeletons, and Honda Stride Management Assist all use CFRP. Indian e-mobility startups (Ultraviolette, Liger Mobility) use carbon for their frames.',
    whyItMatters:
      'Weight directly drives a robot\'s power consumption, payload capacity, and dynamic performance. Carbon composites are the key to high-bandwidth motion at reasonable battery sizes — non-negotiable for advanced humanoids and drones.',
    tryItYourself:
      'Buy a 1 mm carbon-fibre sheet (~₹500 on Robu.in). Try drilling a hole — feel how it shatters if you push too hard, vs ductile aluminium. This is exactly the design trade-off engineers face when choosing composites.',
    quiz: [
      {
        q: 'Carbon-fibre composites are valued primarily for their:',
        options: ['Low cost', 'High strength-to-weight ratio', 'Bright colour', 'Edible nature'],
        answer: 1,
        explain: 'CFRP\'s great virtue is being stronger than steel at much lower weight.',
      },
      {
        q: 'A typical use of CFRP in robotics is:',
        options: ['Server cooling fans', 'Drone arms and humanoid link covers', 'Cooking utensils', 'Solar panels'],
        answer: 1,
        explain: 'Drones, humanoids, exoskeletons — anything that benefits from low moving mass.',
      },
      {
        q: 'CFRP is anisotropic, meaning:',
        options: ['Its properties differ depending on direction', 'It is heavy in all directions', 'It conducts only DC', 'It tastes sweet'],
        answer: 0,
        explain: 'Strength along the fibre is much higher than across — designers must orient plies carefully.',
      },
    ],
  },
  {
    slug: 'additive-manufacturing',
    title: 'Additive Manufacturing (3D Printing) for Robotics — Complete Guide | R2BOT',
    description:
      "Additive manufacturing builds robot parts layer by layer. Indispensable for prototypes, end-effectors, lightweight structures, and small-batch production.",
    bucket: 'materials-manufacturing',
    category: 'fundamentals',
    difficulty: 'beginner',
    tags: ['3d-printing', 'fdm', 'sla', 'prototype', 'additive'],
    relatedTerms: ['cnc-milling', 'carbon-fibre-composite', 'mechanical-design', 'gripper'],
    youtubeSearchQuery: 'additive manufacturing robotics 3d printing',
    definition:
      "Additive manufacturing (a.k.a. 3D printing) builds parts by depositing material layer by layer — opposite of subtractive machining. For robotics it shortens design iterations from weeks to hours and enables geometries impossible with traditional manufacturing.",
    howItWorks:
      "Common processes: FDM (Fused Deposition Modelling) extrudes a polymer filament — cheap, PLA/ABS/PETG/nylon; great for brackets and chassis. SLA (Stereolithography) photopolymerises liquid resin with UV — high resolution, smooth surfaces. SLS (Selective Laser Sintering) fuses nylon powder — strong, complex shapes, no support. DMLS / SLM fuses metal powder — used for titanium drone parts. Software workflow: CAD → STL → slicer → G-code → printer.",
    realWorld:
      "Boston Dynamics 3D-prints many internal robot brackets. Most Indian robotics startups have at least one Bambu Lab or Creality printer. IIT Madras's TVASTA 3D-prints entire concrete houses. Hospitals 3D-print custom prosthetic sockets in days.",
    whyItMatters:
      "3D printing has democratised mechanical prototyping. In India, a college team can iterate a custom robot bracket overnight for ₹50 of filament — game-changing for student innovation and startup velocity.",
    tryItYourself:
      "Buy an entry-level FDM printer (₹15,000). Design a simple servo bracket in Fusion 360 (free for hobbyists). Print it in PLA — within hours you have a custom robotic part. Then iterate ten times in a week, something impossible with CNC.",
    quiz: [
      {
        q: 'Additive manufacturing builds parts by:',
        options: ['Cutting away material', 'Adding material layer by layer', 'Casting molten metal', 'Hammering'],
        answer: 1,
        explain: 'Layer-by-layer addition is the defining characteristic of additive vs subtractive manufacturing.',
      },
      {
        q: 'FDM uses which material form?',
        options: ['Liquid resin', 'Polymer filament', 'Metal powder', 'Wood plank'],
        answer: 1,
        explain: 'FDM melts and extrudes filament; SLA uses resin; SLS/SLM use powder.',
      },
      {
        q: 'A typical robotics use of 3D printing is:',
        options: ['Rapid prototyping of brackets and grippers', 'Mass-producing 1M units', 'Storing data', 'Cooking biryani'],
        answer: 0,
        explain: 'Prototyping and small-batch parts are the sweet spot; mass production still favours moulding.',
      },
    ],
  },
  // ===== HRI =====
  {
    slug: 'speech-recognition',
    title: 'Speech Recognition for Robots — Complete Guide | R2BOT',
    description:
      "Speech recognition lets robots understand spoken commands. Powered by deep learning, now accurate even in Indian-language and accent variations.",
    bucket: 'human-robot-interaction',
    category: 'ai-and-perception',
    difficulty: 'intermediate',
    tags: ['speech', 'asr', 'language', 'voice', 'hri'],
    relatedTerms: ['large-language-model-robotics', 'natural-language-robotics', 'human-robot-interaction'],
    youtubeSearchQuery: 'speech recognition robotics tutorial',
    definition:
      "Automatic Speech Recognition (ASR) converts spoken audio into text. In robotics it enables voice control of robots — from saying 'pick up the cup' to an Indian-language voice for elderly-care robots.",
    howItWorks:
      "Modern ASR systems use deep neural networks. Audio is first converted to a mel-spectrogram. An encoder (often a transformer) compresses the spectrogram into hidden representations. A decoder (CTC, RNN-T, or transformer) predicts the most likely text. Recent open-source models (OpenAI Whisper, Meta SeamlessM4T) handle 100+ languages including Hindi, Tamil, and Bengali with high accuracy.",
    realWorld:
      "Alexa, Siri, Google Assistant — all ASR. Indian voice startups (Reverie, AI4Bharat's IndicSUPERB models) build Indian-language ASR. Service robots in airports use ASR for directions. Robotic surgery now uses ASR for hands-free instrument commands.",
    whyItMatters:
      "Voice is the most natural human interface. As India's smartphone-first population skews to voice over text, robotics that listen well will dominate. India-specific ASR (regional accents, code-mixing) is a hot startup space.",
    tryItYourself:
      "Install OpenAI Whisper (`pip install openai-whisper`). Run it on a 30-second audio clip in Hindi or any Indian language — accuracy is impressive. Plug it into a ROS2 node that publishes recognised text on a topic, and a robot can listen.",
    quiz: [
      {
        q: 'Modern ASR systems are primarily built on:',
        options: ['Hand-crafted phonetic rules', 'Deep neural networks (encoder-decoder/transformers)', 'Cookies', 'Radio waves'],
        answer: 1,
        explain: 'Classical ASR was rules + HMM; modern ASR is deep learning, often transformer-based.',
      },
      {
        q: 'A popular open-source multilingual ASR model is:',
        options: ['ChatGPT', 'Whisper from OpenAI', 'Photoshop', 'Excel'],
        answer: 1,
        explain: 'Whisper handles 100+ languages including major Indian ones.',
      },
      {
        q: 'A typical robotics use of ASR is:',
        options: ['Computing kinematics', 'Voice-commanding a service robot', 'Charging a battery', 'Designing PCBs'],
        answer: 1,
        explain: 'Voice control of robots is one of ASR\'s most direct robotics applications.',
      },
    ],
  },
  {
    slug: 'haptic-feedback',
    title: 'Haptic Feedback in Robotics — Complete Guide | R2BOT',
    description:
      'Haptic feedback lets robots transmit touch and force to humans (or vice versa). Used in tele-surgery, VR controllers, and rehabilitation robots.',
    bucket: 'human-robot-interaction',
    category: 'control',
    difficulty: 'advanced',
    tags: ['haptics', 'force-feedback', 'teleoperation', 'vr', 'touch'],
    relatedTerms: ['teleoperation', 'force-control', 'impedance-control', 'rehabilitation-robot'],
    youtubeSearchQuery: 'haptic feedback robotics teleoperation tutorial',
    definition:
      "Haptic feedback is the use of tactile and force sensations to convey information from a machine to a human (or vice versa). In robotics it makes teleoperation feel natural, surgery feel real, and VR games feel grounded.",
    howItWorks:
      "Haptic devices range from simple vibration motors (in phones, game controllers) to multi-DOF force-feedback arms (Geomagic Touch, Force Dimension Sigma). Force-feedback devices read the operator's hand pose and apply computed forces back through motors. In teleoperation, the remote robot's sensed forces are scaled and transmitted to the operator's device — making the surgeon 'feel' tissue resistance.",
    realWorld:
      "da Vinci surgical robots use haptic feedback for delicate tasks. Tesla's Cybertruck steer-by-wire has haptic detents. Sony PSVR2 controllers use HD haptics. Indian VR-training startups (Reverse Engineering Studios) use haptic gloves for industrial training.",
    whyItMatters:
      "Haptic feedback is the bridge between digital robots and human skills. Surgery, rehabilitation, training, and immersive teleoperation all depend on it. Mid-senior robotics roles in medical and defence sectors prize haptic expertise.",
    tryItYourself:
      "Buy a basic haptic motor (ERM or LRA, ~₹100). Drive it from an Arduino at different patterns. Now imagine that pattern conveyed when your robot's gripper touches an object — that is the simplest possible haptic communication.",
    quiz: [
      {
        q: 'Haptic feedback transmits:',
        options: ['Vision data', 'Force and tactile sensations to the human', 'Wi-Fi packets', 'Email'],
        answer: 1,
        explain: 'Haptic = related to touch — force, vibration, texture sensations.',
      },
      {
        q: 'A classic haptic device for robotics research is:',
        options: ['Geomagic Touch (formerly PHANTOM Omni)', 'A microwave oven', 'A weather satellite', 'A vacuum cleaner'],
        answer: 0,
        explain: 'Geomagic Touch / PHANTOM is the canonical 3-DOF haptic device for research.',
      },
      {
        q: 'Haptic feedback is critical in:',
        options: ['SQL databases', 'Tele-surgery and VR controllers', 'Solar energy', 'Spreadsheets'],
        answer: 1,
        explain: 'Surgical teleoperation and VR are flagship haptic use cases.',
      },
    ],
  },
  {
    slug: 'brain-computer-interface',
    title: 'Brain-Computer Interface (BCI) in Robotics — Complete Guide | R2BOT',
    description:
      "Brain-Computer Interfaces let people control robots and prosthetics with thoughts. Pioneered by Neuralink, BrainGate, and Indian university labs.",
    bucket: 'human-robot-interaction',
    category: 'ai-and-perception',
    difficulty: 'advanced',
    tags: ['bci', 'neural', 'prosthetic', 'eeg', 'invasive'],
    relatedTerms: ['prosthetic-limb', 'human-robot-interaction', 'rehabilitation-robot'],
    youtubeSearchQuery: 'brain computer interface BCI robotics',
    definition:
      "A Brain-Computer Interface (BCI) reads neural signals from a person's brain and translates them into commands for an external device — like a prosthetic arm or a robotic cursor. Invasive BCIs use implanted electrode arrays; non-invasive BCIs use EEG caps.",
    howItWorks:
      "Invasive BCIs (Neuralink, BrainGate, Synchron) place electrode arrays on or in the motor cortex. The electrodes record action potentials from individual neurons; ML decoders convert the firing patterns into intended movements. Non-invasive BCIs (Emotiv, OpenBCI) read scalp EEG — much lower signal quality but no surgery needed. Either way, decoders translate neural signals into discrete classes or continuous control signals.",
    realWorld:
      "Neuralink demonstrated a patient using its implant to play chess with thoughts (2024). BrainGate participants have controlled robotic arms to drink coffee. IIT Madras's CSE department has run EEG-based BCI experiments. AIIMS researches BCI for ALS patients.",
    whyItMatters:
      "BCI is one of the most ambitious frontiers in robotics — restoring autonomy to paralysed patients and creating new human-machine bandwidth. As India's neuroscience and robotics communities converge, BCI startups are emerging.",
    tryItYourself:
      'Buy an OpenBCI or Emotiv EEG headset (₹15,000+). Use their Python SDK to read your alpha/beta brainwaves. Train a simple classifier to detect when you blink — your first BCI in 50 lines of code.',
    quiz: [
      {
        q: 'An invasive BCI typically places electrodes:',
        options: ['On your laptop', 'On or in the brain', 'In your shoe', 'In a battery'],
        answer: 1,
        explain: 'Invasive BCIs implant electrodes; non-invasive uses surface EEG only.',
      },
      {
        q: 'Neuralink, BrainGate, Synchron are:',
        options: ['BCI companies', 'Coffee brands', 'Cars', 'Shipping firms'],
        answer: 0,
        explain: 'All three are major BCI players with active human trials.',
      },
      {
        q: 'A non-invasive BCI typically uses:',
        options: ['Electrode arrays in the cortex', 'Scalp EEG', 'Sound waves', 'GPS'],
        answer: 1,
        explain: 'Non-invasive BCIs read scalp EEG with surface electrodes — no surgery.',
      },
    ],
  },
  {
    slug: 'social-robotics',
    title: 'Social Robotics — Complete Guide | R2BOT',
    description:
      "Social robots are designed to interact with humans as companions, teachers, or service agents. Pepper, NAO, Jibo — and India\'s growing eldercare robots.",
    bucket: 'human-robot-interaction',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['social', 'companion', 'hri', 'pepper', 'nao'],
    relatedTerms: ['human-robot-interaction', 'service-robot', 'speech-recognition'],
    youtubeSearchQuery: 'social robot Pepper NAO companion tutorial',
    definition:
      "Social robotics is the design of robots that interact with humans through speech, gesture, expression, and behaviour — fulfilling roles as companions, educators, customer-service agents, or therapy aids. The success metric is not productivity but the quality of social interaction.",
    howItWorks:
      "Social robots combine perception (face detection, emotion recognition, speech recognition), expression (synthesised speech, animated faces, gestures), and behaviour (dialogue management, decision-making, memory). Robots like SoftBank's Pepper, Aldebaran's NAO, Hanson's Sophia, and Embodied's Moxie are built on this stack. LLMs increasingly power the dialogue and reasoning layers.",
    realWorld:
      "Pepper served as a receptionist in 1000+ banks and hospitals. NAO is a research/education platform in 70+ countries. India's Bengaluru-based Invento Robotics builds Mitra — a social robot used by airports, hospitals (including Apollo), and event venues.",
    whyItMatters:
      "As India's elderly population grows and as customer-service automation accelerates, social robots become economically important. Designing robots that humans genuinely want to interact with is one of the hardest and most rewarding robotics challenges.",
    tryItYourself:
      "Read about Mitra (Invento Robotics' social robot) at indoor airport deployments. Then watch how Pepper engages people in shopping malls — note the eye contact, voice cadence, and conversation memory.",
    quiz: [
      {
        q: 'Social robots are primarily designed for:',
        options: ['Factory welding', 'Human social interaction', 'Underwater exploration', 'Mining'],
        answer: 1,
        explain: 'The defining purpose is rich social interaction, not raw productivity.',
      },
      {
        q: 'Pepper is from which company?',
        options: ['SoftBank Robotics', 'Boston Dynamics', 'Tesla', 'ABB'],
        answer: 0,
        explain: 'Pepper is from SoftBank Robotics (originally Aldebaran).',
      },
      {
        q: 'An Indian social-robot company is:',
        options: ['Invento Robotics (Mitra)', 'L\'Oreal', 'Reliance Jio', 'Yamaha Music'],
        answer: 0,
        explain: 'Bengaluru-based Invento Robotics built Mitra, deployed in Indian airports and hospitals.',
      },
    ],
  },
  // ===== India =====
  {
    slug: 'drdo-robots',
    title: 'DRDO Robotics — Complete Guide | R2BOT',
    description:
      "DRDO builds India's defence robots — Daksh bomb-disposal, MUNTRA unmanned tanks, surveillance UAVs, and more. A flagship of Indian robotics R&D.",
    bucket: 'india-emerging-markets',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['drdo', 'defence', 'india', 'eod', 'uav'],
    relatedTerms: ['drdo-daksh', 'isro-robotics', 'make-in-india-robotics', 'national-robotics-mission'],
    youtubeSearchQuery: 'DRDO robotics defence India',
    definition:
      "The Defence Research and Development Organisation (DRDO) is India's primary defence-R&D agency. Across 50+ laboratories it builds robotic systems including bomb-disposal robots (Daksh), unmanned ground vehicles (MUNTRA, NETRA), unmanned aerial vehicles (Rustom-2, TAPAS-BH), and exoskeletons.",
    howItWorks:
      "DRDO labs specialise: CVRDE (Chennai) for armoured vehicles and UGVs, ADE (Bengaluru) for drones, CAIR (Bengaluru) for AI and combat robotics, DEAL (Dehradun) for electronics. Each programme combines indigenous design, foreign-collaborated subsystems, and rigorous environmental qualification (high heat, dust, high altitude). Operational deployment is through the three Services after Army/Navy/Air Force trials.",
    realWorld:
      "Daksh has supported 1000+ EOD missions across India. TAPAS-BH UAVs fly long-endurance surveillance. MUNTRA reconnaissance UGVs deployed near LAC. The Indian Army's Tata Aurix infantry assault vehicle uses DRDO-developed robotics.",
    whyItMatters:
      "DRDO is one of the largest robotics employers in India, with thousands of scientists working on robotics-adjacent programmes. Strategic autonomy, indigenous defence, and Make-in-India all point through DRDO. For engineering students from IITs/NITs, DRDO scientific roles are highly competitive and prestigious.",
    tryItYourself:
      "Visit DRDO's official website (drdo.gov.in) and read the Lab Pages for CVRDE, ADE, CAIR. Apply for the DRDO Internship Programme — India's gateway to defence-robotics careers.",
    quiz: [
      {
        q: 'DRDO stands for:',
        options: ['Defence Research and Development Organisation', 'Domestic Railway Development Organisation', 'Disaster Response and Disposal Office', 'Digital Robot Development Outfit'],
        answer: 0,
        explain: 'DRDO is India\'s premier defence-R&D agency under the Ministry of Defence.',
      },
      {
        q: 'A flagship DRDO bomb-disposal robot is:',
        options: ['Daksh', 'Pragyan', 'Mitra', 'Vyommitra'],
        answer: 0,
        explain: 'Daksh is the Indian Army\'s EOD robot developed by DRDO\'s R&DE (Engineers).',
      },
      {
        q: 'Which DRDO lab focuses on combat and AI robotics?',
        options: ['CAIR (Bengaluru)', 'AIIMS Delhi', 'ISRO Sriharikota', 'IIT Roorkee'],
        answer: 0,
        explain: 'CAIR — Centre for Artificial Intelligence and Robotics — leads DRDO\'s combat-robotics R&D.',
      },
    ],
  },
  {
    slug: 'agri-robot-india',
    title: 'Agricultural Robotics in India — Complete Guide | R2BOT',
    description:
      'Agricultural robots in India tackle labour shortages and yield gaps — drones spray pesticides, robots harvest tomatoes, AI sorts produce. Booming sector.',
    bucket: 'india-emerging-markets',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['agri', 'india', 'drone', 'precision-ag', 'startup'],
    relatedTerms: ['agricultural-robot', 'precision-agriculture', 'weeding-robot', 'spraying-drone'],
    youtubeSearchQuery: 'agriculture robotics India tutorial',
    definition:
      "Agricultural robotics in India encompasses drones for spraying and crop scouting, ground robots for weeding and harvesting, and AI-driven post-harvest sorting. Driven by acute labour shortages and government incentives, it is among India's fastest-growing robotics sectors.",
    howItWorks:
      "Spraying drones (Garuda, IoTechWorld, Marut) carry 10–16 L tanks and apply pesticides/foliar nutrients with high accuracy. Niqo Robotics' AI spot-sprayer drives between crop rows and detects weeds vs crops in real time. TartanSense's robotic tractors do precision weeding. Cropin's AI sorts crops post-harvest. Indian government subsidies cover 40-50% of drone purchase costs under Sub-Mission on Agricultural Mechanization (SMAM).",
    realWorld:
      "Garuda Aerospace has 1000+ Kisan Drones in service. IoTechWorld's Agribot sprays thousands of acres in Maharashtra. Niqo Robotics' AI-driven crop sprayers are reducing pesticide use by 60% in trial farms. State governments (Punjab, Haryana, MP) actively subsidise robotic agri equipment.",
    whyItMatters:
      "Indian agriculture is the world's largest by workforce — but yields lag by 30-50% behind developed nations. Robotics is the cheapest path to closing that gap while reducing chemical use. Agri-robotics is one of India's most strategic robotics sectors.",
    tryItYourself:
      "Search for 'Garuda Aerospace Kisan Drone' on YouTube and watch a typical operation. Then read NITI Aayog's 2024 report on agricultural automation to see government priorities.",
    quiz: [
      {
        q: 'An Indian agri-robotics startup is:',
        options: ['Garuda Aerospace', 'L\'Oreal', 'Cadbury', 'Hindustan Lever'],
        answer: 0,
        explain: 'Garuda Aerospace makes drones widely used in Indian agriculture.',
      },
      {
        q: 'Indian government schemes that subsidise agri robotics include:',
        options: ['SMAM and Drone Shakti', 'NEFT', 'IGNOU', 'CBSE'],
        answer: 0,
        explain: 'SMAM and Drone Shakti subsidise machinery purchase by farmers.',
      },
      {
        q: 'Niqo Robotics is known for:',
        options: ['AI-driven crop spraying that reduces pesticide use', 'Manufacturing tractors only', 'Building rockets', 'Mobile phones'],
        answer: 0,
        explain: 'Niqo\'s computer-vision spray system applies herbicides only on weeds — major chemical savings.',
      },
    ],
  },
  {
    slug: 'iit-bombay-robotics',
    title: 'IIT Bombay Robotics — Complete Guide | R2BOT',
    description:
      "IIT Bombay\'s robotics ecosystem spans CSRE, electrical engineering, mechanical, and the Wadhwani Centre. Hosts national robotics conferences and major spinoff startups.",
    bucket: 'india-emerging-markets',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['iit', 'bombay', 'research', 'wadhwani', 'india'],
    relatedTerms: ['iit-robotics-research', 'iit-madras-robotics', 'make-in-india-robotics'],
    youtubeSearchQuery: 'IIT Bombay robotics research',
    definition:
      "IIT Bombay is one of India's leading robotics-research centres. Spread across the Department of Aerospace, EE, ME, CSE, and the Wadhwani Centre for Electronic Systems and Robotics, its faculty publish in top journals and produce startup founders shaping Indian robotics.",
    howItWorks:
      "Major labs include the Mobile Robotics Lab (autonomous navigation), the Aerospace System Design Lab (drones, UAVs), the Aerial Robotics Lab, and the Suman Mashruwala Advanced Microengineering Lab (MEMS-scale robots). The Wadhwani Centre hosts shared facilities. PhD students work on RL-for-quadrupeds, multi-drone swarms, and human-robot collaboration.",
    realWorld:
      "Astrocube (medical robotics startup) was founded by IIT Bombay alumni. Sastra Robotics (cobot OEM) has IIT Bombay roots. The annual TechFest robotics competition draws thousands of students nationwide. The IIT Bombay Racing autonomous-car team competes globally.",
    whyItMatters:
      "IIT Bombay alumni populate every major Indian robotics company. Its research output is internationally cited. If you target a research career or startup foundership in Indian robotics, IIT Bombay is a top destination.",
    tryItYourself:
      "Read the IIT Bombay Mobile Robotics Lab's publications page. Apply for their summer-internship programme. Watch the TechFest robotics-competition highlights for a sense of the talent pipeline.",
    quiz: [
      {
        q: 'IIT Bombay\'s shared robotics research facility is at:',
        options: ['The Wadhwani Centre for Electronic Systems and Robotics', 'AIIMS Delhi', 'ISRO Sriharikota', 'Tata Memorial'],
        answer: 0,
        explain: 'The Wadhwani Centre hosts cross-department robotics infrastructure.',
      },
      {
        q: 'A famous student robotics competition hosted by IIT Bombay is:',
        options: ['TechFest', 'IPL', 'Eurovision', 'CES'],
        answer: 0,
        explain: 'TechFest is one of Asia\'s largest student tech festivals with major robotics tracks.',
      },
      {
        q: 'A robotics startup with IIT Bombay roots is:',
        options: ['Astrocube', 'Maruti Suzuki', 'Cadbury', 'Britannia'],
        answer: 0,
        explain: 'Astrocube — medical robotics — was founded by IIT Bombay alumni.',
      },
    ],
  },
  {
    slug: 'iit-madras-robotics',
    title: 'IIT Madras Robotics — Complete Guide | R2BOT',
    description:
      'IIT Madras leads Indian robotics research in surgical, agricultural, and humanoid robotics. Home to Robert Bosch Centre, the eYantra hub, and TVASTA.',
    bucket: 'india-emerging-markets',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['iit', 'madras', 'eyantra', 'tvasta', 'india'],
    relatedTerms: ['iit-robotics-research', 'iit-bombay-robotics', 'national-robotics-mission'],
    youtubeSearchQuery: 'IIT Madras robotics research eYantra',
    definition:
      "IIT Madras has one of India's largest robotics-research portfolios — spread across Mechanical, EE, CSE, Aerospace, and the Robert Bosch Centre for Data Science and AI. The campus hosts eYantra, a national robotics-education programme reaching 500+ Indian colleges.",
    howItWorks:
      "Major groups: Robotics Lab (manipulation, humanoid legs), the Centre for Innovation (student-led builds), eYantra (national skills programme funded by MeitY), TVASTA Manufacturing Solutions (3D-printed houses), and the Robert Bosch Centre for AI-driven robotics. Faculty work on surgical robots, autonomous tractors, swimming robots, and reinforcement learning.",
    realWorld:
      "eYantra has trained 100,000+ Indian engineering students. TVASTA 3D-printed India's first concrete house in 2020. IIT Madras's autonomous-tractor project pioneers Indian agricultural robotics. The Indian Government's National Mission on Interdisciplinary Cyber-Physical Systems funds multiple IIT Madras robotics groups.",
    whyItMatters:
      "IIT Madras produces both academic researchers and entrepreneurial founders. Its national-scale impact through eYantra makes it a primary engine of Indian robotics talent. Top graduate programmes (MTech in Robotics, Robotics PhD) are extremely competitive.",
    tryItYourself:
      "Visit the eYantra website (e-yantra.org) and explore the curriculum and competitions. Apply for the eYantra Robotics Competition (e-YRC) — India\'s largest national robotics challenge.",
    quiz: [
      {
        q: 'eYantra is hosted at:',
        options: ['IIT Madras', 'IIT Delhi', 'JNU', 'BHU'],
        answer: 0,
        explain: 'eYantra is funded by MeitY and hosted at IIT Madras\'s CSE department.',
      },
      {
        q: 'TVASTA, the 3D-printed-construction company, is:',
        options: ['An IIT Madras spinoff', 'A USB cable brand', 'A clothing label', 'A bank'],
        answer: 0,
        explain: 'TVASTA Manufacturing Solutions was founded by IIT Madras alumni.',
      },
      {
        q: 'The Robert Bosch Centre at IIT Madras focuses on:',
        options: ['Data Science and AI', 'Movies', 'Cooking', 'Cricket'],
        answer: 0,
        explain: 'RBCDSAI is IIT Madras\'s data-science and AI hub.',
      },
    ],
  },
  // ===== Space =====
  {
    slug: 'canadarm',
    title: 'Canadarm — The ISS Robotic Arm | R2BOT',
    description:
      "Canadarm and Canadarm2 are the most famous space manipulators. Used on the Shuttle and now the ISS for satellite capture, EVAs, and station assembly.",
    bucket: 'space-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['canadarm', 'iss', 'space', 'manipulator', 'nasa'],
    relatedTerms: ['iss-robotics', 'space-robotics', 'satellite-capture', 'robot-arm'],
    youtubeSearchQuery: 'Canadarm2 ISS robotic arm space',
    definition:
      "Canadarm (1981–2011) and Canadarm2 (2001-present) are the iconic Canadian-built robotic arms used on the Space Shuttle and the International Space Station. They have captured satellites, moved astronauts during spacewalks, and helped assemble the ISS module by module.",
    howItWorks:
      "Canadarm2 is a 7-DOF, 17-metre-long robotic arm with grappling fixtures at both ends — it can 'walk' along the ISS by attaching one end and releasing the other. Each joint uses redundant motors and brakes. The arm is controlled by astronauts inside the ISS via a robotic workstation. Force feedback assists fine docking. Coming next: Canadarm3 (smaller, AI-assisted) for the Lunar Gateway station.",
    realWorld:
      "Canadarm2 has captured visiting Dragon, Cygnus, and HTV resupply ships hundreds of times. It supported the Hubble Space Telescope servicing missions. It is one of the most famous robots in history, with a Canadian $5 banknote featuring it.",
    whyItMatters:
      "Space manipulators are an entire discipline of robotics: zero-gravity dynamics, radiation-hardened electronics, high-reliability design. Canadarm is the canonical case study — every space-robotics course covers it. India's planned space station will need a similar manipulator.",
    tryItYourself:
      "Watch the NASA video 'Capturing the SpaceX Dragon with Canadarm2' on YouTube. Then read the Wikipedia 'Mobile Servicing System' page for the engineering details. Bookmark the Canadarm3 NASA Artemis page for the future.",
    quiz: [
      {
        q: 'Canadarm2 is built by:',
        options: ['Canada (MDA)', 'Russia (Roscosmos)', 'Japan (JAXA)', 'India (ISRO)'],
        answer: 0,
        explain: 'MDA (formerly SPAR Aerospace) built Canadarm and Canadarm2 for Canada.',
      },
      {
        q: 'Canadarm2 has how many degrees of freedom?',
        options: ['7', '2', '20', '100'],
        answer: 0,
        explain: '7 DOF gives it human-arm-like dexterity in zero-G.',
      },
      {
        q: 'A unique feature of Canadarm2 is:',
        options: ['It can walk end-over-end along the ISS', 'It is invisible', 'It is made of wood', 'It plays music'],
        answer: 0,
        explain: 'Both ends are grippers — it walks by alternating attachments.',
      },
    ],
  },
  {
    slug: 'iss-robotics',
    title: 'Robotics on the ISS — Complete Guide | R2BOT',
    description:
      'The International Space Station hosts Canadarm2, Dextre, JEMRMS, free-flying CubeSats, and the Astrobee free-flyers — a robotic ecosystem in orbit.',
    bucket: 'space-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['iss', 'space', 'canadarm', 'astrobee', 'dextre'],
    relatedTerms: ['canadarm', 'space-robotics', 'satellite-capture', 'humanoid-robot'],
    youtubeSearchQuery: 'ISS robotics Astrobee Dextre tutorial',
    definition:
      "The International Space Station hosts the most concentrated collection of robots in orbit. Canadarm2 manipulates large payloads; Dextre is a fine-manipulation hand; JEMRMS is the Japanese arm; Astrobee is a free-flying inspection drone; Robonaut2 was a humanoid torso tested on board.",
    howItWorks:
      "Canadarm2 (Canada) for big moves. Dextre (Canada), a two-armed dextrous robot, attaches to Canadarm2 for fine ORU (Orbital Replacement Unit) work. JEMRMS (Japan) handles Kibo module operations. Astrobee (NASA, three cube-shaped 30 cm robots) flies inside the ISS doing inventory and inspection. Robonaut2 (NASA + GM) tested human-class manipulation in microgravity.",
    realWorld:
      "Astrobee free-flyers patrol the ISS interior. Canadarm2 has captured 60+ visiting vehicles. Dextre swaps batteries on the ISS exterior. Bharatiya Antariksh Station (planned by ISRO for 2035) will require its own robotic systems.",
    whyItMatters:
      "ISS robotics are the legacy that will inform every future space station — including India's. They demonstrate how to build reliable, repairable, multi-decade robotic systems in the harshest environments.",
    tryItYourself:
      "Search 'NASA Astrobee Free-flyer ISS' on YouTube and watch the bots glide between modules. Then read about the IDOL Space Internship — Indian students can intern with NASA via this programme.",
    quiz: [
      {
        q: 'Astrobee robots on the ISS are:',
        options: ['Free-flying cube-shaped indoor robots', 'Outside the ISS only', 'Imaginary', 'On Mars'],
        answer: 0,
        explain: 'Three Astrobee cubes fly inside the ISS for inspection and inventory tasks.',
      },
      {
        q: 'Dextre is famous for:',
        options: ['Two-armed fine manipulation', 'Cooking', 'Photo editing', 'GPS navigation'],
        answer: 0,
        explain: 'Dextre is a two-armed Special Purpose Dextrous Manipulator (SPDM) for ORU work.',
      },
      {
        q: "India's planned space station is called:",
        options: ['Bharatiya Antariksh Station', 'Salyut', 'Mir', 'Tiangong'],
        answer: 0,
        explain: 'ISRO plans the Bharatiya Antariksh Station by 2035.',
      },
    ],
  },
  {
    slug: 'planetary-lander',
    title: 'Planetary Landers — Complete Guide | R2BOT',
    description:
      "Planetary landers safely deliver spacecraft to the surface of moons, planets, and asteroids. Chandrayaan-3, Curiosity Sky-Crane, OSIRIS-REx — landers are heroic robotics.",
    bucket: 'space-robotics',
    category: 'applications',
    difficulty: 'advanced',
    tags: ['lander', 'space', 'chandrayaan', 'mars', 'descent'],
    relatedTerms: ['space-robotics', 'mars-rover', 'isro-chandrayaan-robot', 'iss-robotics'],
    youtubeSearchQuery: 'planetary lander descent landing tutorial',
    definition:
      "A planetary lander is a spacecraft designed to safely descend through (or without) an atmosphere and touch down softly on a planetary body. The 'seven minutes of terror' of any landing is one of the most complex robotic operations in human engineering.",
    howItWorks:
      "Landers combine guidance, navigation, and control (GNC) with throttleable engines, radar/LIDAR altimeters, optical hazard detection, and shock-absorbing legs. The descent profile varies: aero-braking with parachutes (Mars), powered descent with rockets (Moon, no atmosphere), or thrusters + bags (Curiosity Sky-Crane). Real-time autonomous decisions are essential — communication delay to Earth makes ground control impossible during touchdown.",
    realWorld:
      "Chandrayaan-3's Vikram lander touched down on the lunar south pole in 2023 — India's first soft lunar landing. NASA's Curiosity used the Sky-Crane manoeuvre. ESA's Schiaparelli crashed on Mars in 2016 due to a sensor bug. SpaceX is developing Starship lunar landers for NASA Artemis.",
    whyItMatters:
      "Landings are perhaps the most dramatic test of robotics. They demonstrate autonomous decision-making, sensor fusion, and fail-safe design at the extreme. India's lunar success has made ISRO a top destination for space-robotics engineers.",
    tryItYourself:
      "Watch the official 'Vikram Lander Touchdown' video by ISRO. Then read the Chandrayaan-3 technical paper to understand the autonomous hazard-avoidance algorithm that picked the final landing spot.",
    quiz: [
      {
        q: 'A lunar lander does not use parachutes because:',
        options: ['The Moon has no atmosphere', 'Parachutes are expensive', 'Wind would blow it away', 'No reason'],
        answer: 0,
        explain: 'No atmosphere = no aerobraking; the Moon requires fully powered descent.',
      },
      {
        q: 'Chandrayaan-3\'s lander was named:',
        options: ['Vikram', 'Pragyan', 'Mangal', 'Surya'],
        answer: 0,
        explain: 'Vikram (named after Vikram Sarabhai) is the lander; Pragyan is the rover it carried.',
      },
      {
        q: "Curiosity\'s Sky-Crane was:",
        options: ['A rocket-powered hovering platform that lowered the rover on tethers', 'A parachute', 'A balloon', 'A glider'],
        answer: 0,
        explain: 'The Sky-Crane hovered above the surface and lowered Curiosity by cable — never before done.',
      },
    ],
  },
  {
    slug: 'isro-chandrayaan-robot',
    title: 'ISRO Chandrayaan Pragyan Rover — Complete Guide | R2BOT',
    description:
      "Pragyan is ISRO's lunar rover from Chandrayaan-3 — India's first robot on the Moon. A landmark in Indian space robotics.",
    bucket: 'space-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['chandrayaan', 'pragyan', 'isro', 'lunar', 'rover'],
    relatedTerms: ['isro-robotics', 'mars-rover', 'planetary-lander', 'space-robotics'],
    youtubeSearchQuery: 'Pragyan Chandrayaan-3 rover ISRO',
    definition:
      "Pragyan ('Wisdom' in Sanskrit) is the lunar rover deployed by ISRO's Chandrayaan-3 mission in August 2023 — the first Indian robot to operate on the Moon and the first ever near the lunar south pole. It moved, sampled, and transmitted data through one lunar day.",
    howItWorks:
      "Pragyan is a 26 kg six-wheel rocker-bogie rover. It carries two science payloads — LIBS (laser-induced breakdown spectroscopy) and APXS (alpha particle X-ray spectrometer) — to analyse lunar regolith composition. Solar-panel powered. Communication relays through the Vikram lander to Earth. Software handles autonomous navigation and instrument scheduling for the 14-Earth-day lunar mission.",
    realWorld:
      "Pragyan rolled off Vikram on 23 August 2023 and operated for one lunar day. It traversed over 100 metres, recorded sulphur and other elements in the south-polar regolith, and confirmed the presence of water-ice-friendly mineralogy. The mission elevated ISRO to global elite status.",
    whyItMatters:
      "Chandrayaan-3 demonstrates that India can build, land, and operate planetary robots end-to-end. ISRO is now planning Chandrayaan-4 sample return and follow-on lunar rovers — a major growth area for Indian space-robotics careers.",
    tryItYourself:
      "Read ISRO's mission page for Chandrayaan-3 (isro.gov.in). Then watch the official touchdown live-stream replay on YouTube — feel the moment when an Indian robot rolled onto another world.",
    quiz: [
      {
        q: 'Pragyan rover was deployed by:',
        options: ['Chandrayaan-3 in 2023', 'Apollo 11 in 1969', 'Mars Pathfinder', 'Voyager 1'],
        answer: 0,
        explain: 'Pragyan landed via the Vikram lander on 23 August 2023.',
      },
      {
        q: 'Pragyan is approximately:',
        options: ['26 kg', '2 tonnes', '5 grams', '1 million kg'],
        answer: 0,
        explain: 'Pragyan is a compact 26 kg six-wheel rover.',
      },
      {
        q: 'Pragyan\'s science payloads include:',
        options: ['LIBS and APXS spectrometers', 'A coffee maker', 'A microwave oven', 'A photo printer'],
        answer: 0,
        explain: 'Both instruments probe the elemental composition of lunar regolith.',
      },
    ],
  },
  // ===== Medical =====
  {
    slug: 'da-vinci-system',
    title: 'da Vinci Surgical Robot — Complete Guide | R2BOT',
    description:
      "The da Vinci Surgical System is the most-used surgical robot worldwide — 10M+ operations across cardiac, urological, gynaecological, and abdominal surgery.",
    bucket: 'medical-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['davinci', 'surgical', 'medical', 'minimally-invasive', 'intuitive'],
    relatedTerms: ['surgical-robot', 'robotic-laparoscopy', 'medical-robotics', 'teleoperation'],
    youtubeSearchQuery: 'da Vinci surgical robot tutorial',
    definition:
      "The da Vinci Surgical System (Intuitive Surgical, USA) is the world's most-used surgical robot, performing 10M+ operations since its 2000 FDA approval. The surgeon sits at a console with 3D vision and master controllers; robotic arms inside the patient's body mirror their hand movements through small incisions.",
    howItWorks:
      "The patient cart holds 4 robotic arms — three holding articulated EndoWrist instruments and one holding the endoscope. The surgeon console offers 3D HD vision, hand controllers, and foot pedals. Tremor filtering and motion scaling deliver superhuman precision through 8 mm trocars. The vision cart connects sensors, monitors, and the surgical workflow software.",
    realWorld:
      "Apollo Hospitals, Fortis, Manipal, AIIMS, and many other Indian hospitals operate da Vinci systems. SS Innovations (India) is building a competing system — SSI Mantra — at a fraction of the cost. Indian surgeons train at the Intuitive Surgical India Training Centre in Hyderabad.",
    whyItMatters:
      "Robotic surgery dramatically improves patient outcomes — less blood loss, smaller scars, faster recovery — and enables procedures (some prostate, cardiac repair) too delicate for conventional laparoscopy. India's medical robotics market is forecast to triple by 2030.",
    tryItYourself:
      "Visit a hospital open day or a medical conference (AIIMS, Apollo, Fortis) to see a da Vinci demo. Watch Intuitive Surgical's tutorial videos online to understand the control system intuitively.",
    quiz: [
      {
        q: 'The da Vinci system is made by:',
        options: ['Intuitive Surgical', 'NASA', 'ISRO', 'Tesla'],
        answer: 0,
        explain: 'Intuitive Surgical (Sunnyvale, California) is the maker.',
      },
      {
        q: 'da Vinci\'s EndoWrist instruments offer how many degrees of freedom per instrument?',
        options: ['7', '1', '20', '0'],
        answer: 0,
        explain: '7-DOF EndoWrist instruments give more dexterity than a human wrist.',
      },
      {
        q: 'An Indian alternative being built is:',
        options: ['SSI Mantra by SS Innovations', 'A toy robot', 'A flying camera', 'A solar panel'],
        answer: 0,
        explain: 'SSI Mantra is positioned as an affordable Indian surgical-robot platform.',
      },
    ],
  },
  {
    slug: 'capsule-endoscopy',
    title: 'Capsule Endoscopy — Complete Guide | R2BOT',
    description:
      "Capsule endoscopy uses a swallowable camera robot to image the GI tract. Painless alternative to traditional endoscopy, used in millions of procedures.",
    bucket: 'medical-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['capsule', 'endoscopy', 'medical', 'imaging', 'gi'],
    relatedTerms: ['surgical-robot', 'medical-robotics', 'da-vinci-system'],
    youtubeSearchQuery: 'capsule endoscopy pill camera tutorial',
    definition:
      "A capsule endoscope is a swallowable pill-sized robot that contains a camera, light source, battery, and wireless transmitter. Once swallowed, it captures thousands of images as it travels through the GI tract — a painless way to diagnose disorders unreachable by traditional endoscopes.",
    howItWorks:
      "The capsule (typically 11×26 mm) has one or two CMOS cameras shooting 2-6 frames per second, illuminated by white LEDs. A small radio transmits images to a belt-worn recorder. After 8-12 hours of recording the capsule passes naturally; a doctor reviews the video with AI-assisted lesion detection. Newer prototypes add magnetic steering for active control by an external magnetic field.",
    realWorld:
      "PillCam (Medtronic) is the market leader, with 5M+ deployments. Indian hospitals (AIIMS, Apollo, Fortis) regularly use capsule endoscopy for small-bowel investigation. CAPSO Vision and IntroMedic also serve the market. AI-based interpretation reduces doctor review time by 80%.",
    whyItMatters:
      "Capsule endoscopy is a beautiful demonstration of micro-robotics — battery, imaging, wireless in a pill. Active steering and drug-delivery variants are active R&D areas. India's gastroenterology market is rapidly adopting these tools.",
    tryItYourself:
      "Watch a 'PillCam capsule endoscopy' video on YouTube to see the GI tour from the capsule's point of view. Then look at the published images from the Indian Journal of Gastroenterology — diagnostic-grade visuals from a swallowed robot.",
    quiz: [
      {
        q: 'A capsule endoscope is:',
        options: ['A swallowable pill-sized imaging robot', 'A surgical scalpel', 'A pacemaker', 'A heart-rate monitor'],
        answer: 0,
        explain: 'Camera, LEDs, battery, and transmitter in pill form.',
      },
      {
        q: 'PillCam is from:',
        options: ['Medtronic', 'Microsoft', 'Apple', 'Tesla'],
        answer: 0,
        explain: 'PillCam is Medtronic\'s flagship capsule-endoscopy product.',
      },
      {
        q: 'Typical recording duration of a capsule endoscope is:',
        options: ['8-12 hours', '1 minute', '30 days', '1 year'],
        answer: 0,
        explain: 'Battery and transit time cap recording at 8-12 hours.',
      },
    ],
  },
  {
    slug: 'prosthetic-limb',
    title: 'Robotic Prosthetic Limb — Complete Guide | R2BOT',
    description:
      "Robotic prosthetic limbs restore function for amputees using motors, sensors, and EMG/EEG control. Indian companies like Bionic Hope make affordable options.",
    bucket: 'medical-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['prosthetic', 'amputee', 'medical', 'emg', 'bionic'],
    relatedTerms: ['rehabilitation-robot', 'exoskeleton', 'brain-computer-interface', 'medical-robotics'],
    youtubeSearchQuery: 'robotic prosthetic arm tutorial',
    definition:
      "A robotic prosthetic limb is a powered artificial limb that restores function for amputees. Sensors read intent (from muscle signals, brain signals, or pressure cues), motors drive joint actuation, and embedded AI interprets the user's intended motion.",
    howItWorks:
      "Most modern prosthetics use myoelectric control — surface EMG electrodes on the residual limb pick up muscle activations. ML classifiers convert EMG patterns into motion commands. Motors in each joint execute the motion; force sensors in fingertips give grip-force feedback. Advanced systems add osseointegration (titanium implants directly to bone) for stable mounting.",
    realWorld:
      "Bionic Hope (Mumbai) builds the Grippy, an Indian-designed affordable robotic hand. Open Bionics (UK) sells the Hero Arm worldwide. Össur and Touch Bionics serve the high-end market. India's accident burden makes affordable bionic limbs an enormous unmet need.",
    whyItMatters:
      "India has an estimated 4M amputees but only a small fraction can afford imported bionic limbs. Affordable, locally manufactured Indian prosthetics are a major social-impact engineering opportunity, drawing increasing funding and policy support.",
    tryItYourself:
      "Watch Bionic Hope's product videos. Read the Open Bionics Hero Arm specs. Then research the IIT Madras 'Kalam' prosthetic — Indian innovations are catching up fast.",
    quiz: [
      {
        q: 'Myoelectric prosthetics read intent from:',
        options: ['Surface EMG muscle signals', 'WiFi networks', 'Hair colour', 'Heart rate only'],
        answer: 0,
        explain: 'Surface EMG on the residual limb provides the primary control signal.',
      },
      {
        q: 'An Indian prosthetic-robot company is:',
        options: ['Bionic Hope', 'Yamaha', 'Sony', 'Adidas'],
        answer: 0,
        explain: 'Bionic Hope (Mumbai) builds the Grippy bionic hand.',
      },
      {
        q: 'Osseointegration is:',
        options: ['Direct titanium attachment of prosthetic to bone', 'A new diet', 'A type of plastic', 'A factory'],
        answer: 0,
        explain: 'Osseointegration replaces socket-mounting with rigid bone integration — improves comfort and proprioception.',
      },
    ],
  },
  // ===== Agriculture =====
  {
    slug: 'weeding-robot',
    title: 'Weeding Robots — Complete Guide | R2BOT',
    description:
      'Weeding robots use computer vision to spot weeds and remove them mechanically or with targeted spray. Cuts herbicide use 80-90% in field trials.',
    bucket: 'agricultural-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['weeding', 'agriculture', 'cv', 'herbicide', 'precision-ag'],
    relatedTerms: ['agri-robot-india', 'agricultural-robot', 'precision-agriculture', 'computer-vision'],
    youtubeSearchQuery: 'weeding robot agriculture tutorial',
    definition:
      "A weeding robot autonomously identifies weeds among crops and removes them — either mechanically with hoes/lasers or chemically with micro-targeted herbicide spray. By treating only weeds and not bare soil, it slashes herbicide use by 80-90% while improving yield.",
    howItWorks:
      "The robot drives between crop rows on a tractor-mounted carriage or its own chassis. Downward-facing cameras feed a CNN that classifies each pixel as crop, weed, or soil. Detected weeds trigger one of three actions: a mechanical hoe arm, a laser pulse (weed-zapping technology by Carbon Robotics), or a single squirt of herbicide from a multi-nozzle spray bar. GPS/RTK and visual odometry keep the robot precisely between rows.",
    realWorld:
      "Niqo Robotics' system targets Indian rice paddies, claiming 60-90% herbicide reduction. Naio Technologies' Dino weeds vegetable farms in Europe. John Deere's See & Spray serves North American row crops. AI-driven laser weeders from Carbon Robotics destroy weeds without any chemicals.",
    whyItMatters:
      "Herbicide is a major Indian farming cost and environmental burden. Robotic weeding dramatically improves both economics and sustainability. As global pressure to reduce chemical use grows, this category will only expand.",
    tryItYourself:
      "Search 'Carbon Robotics laser weeder' on YouTube and watch the satisfying laser zaps. Then read Niqo Robotics' case studies for Indian-market specifics.",
    quiz: [
      {
        q: 'A typical weeding robot identifies weeds using:',
        options: ['Computer vision (CNNs)', 'Smell only', 'Wi-Fi signal', 'Sound'],
        answer: 0,
        explain: 'Onboard cameras and CNNs classify each image patch as crop, weed, or soil.',
      },
      {
        q: 'Weeding robots typically reduce herbicide use by:',
        options: ['80-90%', '5%', '0%', '200%'],
        answer: 0,
        explain: 'Spot spraying only on weeds dramatically reduces total herbicide applied.',
      },
      {
        q: 'An Indian agri-weeding-tech company is:',
        options: ['Niqo Robotics', 'Adobe', 'Spotify', 'Apple'],
        answer: 0,
        explain: 'Niqo Robotics (Bengaluru) builds AI spot-sprayer technology for Indian farms.',
      },
    ],
  },
  {
    slug: 'spraying-drone',
    title: 'Agricultural Spraying Drone — Complete Guide | R2BOT',
    description:
      'Spraying drones cover Indian fields with pesticide and foliar nutrients 20× faster than manual labour. Subsidised by Drone Shakti scheme.',
    bucket: 'agricultural-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['drone', 'agri', 'spraying', 'india', 'drone-shakti'],
    relatedTerms: ['agri-robot-india', 'drone-uav', 'precision-agriculture', 'spraying-drone'],
    youtubeSearchQuery: 'agriculture spraying drone India tutorial',
    definition:
      "An agricultural spraying drone is an unmanned aircraft fitted with a pesticide or foliar-nutrient tank (typically 10-16 L) and a multi-nozzle spray boom. Operated by a trained pilot, it covers fields 20-30× faster than a knapsack sprayer with far less chemical drift.",
    howItWorks:
      "Spraying drones are large multirotors (often hexacopters or octocopters) with 10-16 L tanks, pressurised pumps, and 4-8 spray nozzles. The drone follows a pre-programmed mission (waypoints, altitude, swath width, speed) via GPS + RTK. Centrifugal nozzles produce fine, evenly distributed droplets. Endurance is 10-20 minutes per battery; swap batteries to cover hectares quickly.",
    realWorld:
      "Garuda Aerospace, IoTechWorld, and Marut Drones lead the Indian market with thousands of drones sold under the Drone Shakti subsidy scheme. DJI Agras T50 is the global benchmark. Maharashtra and Telangana are the leading states by adoption.",
    whyItMatters:
      "Indian farms face acute labour shortages and chemical-application inefficiencies. Spraying drones are the most economically obvious robotics application in Indian agriculture — and the most heavily subsidised by central and state governments. Career demand for drone pilots and operators is exploding.",
    tryItYourself:
      "Get a DGCA-approved Remote Pilot Certificate (RPC) — required to commercially operate drones in India. Then enquire with Garuda or IoTechWorld about pilot-leasing schemes used by Indian farmer-producer organisations (FPOs).",
    quiz: [
      {
        q: 'A typical agri spraying drone holds approximately:',
        options: ['10-16 litres', '500 litres', '0.5 litres', '5000 litres'],
        answer: 0,
        explain: 'Common payloads are 10-16 L; some specialised drones go higher.',
      },
      {
        q: 'India\'s national drone-spraying subsidy scheme is:',
        options: ['Drone Shakti', 'PMJAY', 'NEFT', 'Aadhaar'],
        answer: 0,
        explain: 'Drone Shakti subsidises agri-drone deployment via FPOs and Krishi Vigyan Kendras.',
      },
      {
        q: 'Drone pilots in India require certification from:',
        options: ['DGCA (Directorate General of Civil Aviation)', 'SEBI', 'RBI', 'TRAI'],
        answer: 0,
        explain: 'DGCA issues Remote Pilot Certificates under India\'s drone rules.',
      },
    ],
  },
  {
    slug: 'precision-agriculture',
    title: 'Precision Agriculture — Complete Guide | R2BOT',
    description:
      'Precision agriculture uses sensors, GPS, and AI to apply seed, water, fertiliser, and herbicide only where needed — maximising yield while cutting cost.',
    bucket: 'agricultural-robotics',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['precision-ag', 'gps', 'iot', 'india', 'sustainability'],
    relatedTerms: ['agri-robot-india', 'agricultural-robot', 'weeding-robot', 'gps-module'],
    youtubeSearchQuery: 'precision agriculture India tutorial',
    definition:
      "Precision agriculture (precision ag, smart farming) is a farming approach that uses sensors, GPS, drones, and AI to deliver the exact right input (seed, water, fertiliser, herbicide) at the exact right place and time on the field. The goal: higher yield with less resource use.",
    howItWorks:
      "Field sensors (soil moisture, soil pH, leaf wetness) feed cloud platforms. Satellite NDVI and drone multispectral imagery map crop health. Variable-rate-application (VRA) machinery (planters, sprayers, irrigation) reads these maps and applies inputs cell by cell. Yield monitors on harvesters close the loop. AI platforms (Cropin, AgNext, John Deere Operations Center) integrate everything.",
    realWorld:
      "Cropin (Bengaluru) is India's leading precision-ag SaaS, used by 12M+ farmers. AgNext does post-harvest quality assessment. John Deere's Indian-launched variable-rate planters are slowly entering large farms. NITI Aayog's 'Precision Agriculture and Robotics' working group drives policy.",
    whyItMatters:
      "India's farms produce 30-50% less per acre than developed nations. Precision agriculture is the cheapest path to closing that gap. As climate change increases input costs, it becomes economically essential. Indian agri-tech is one of the most-funded startup categories.",
    tryItYourself:
      "Sign up for Cropin's free demo platform. Explore their satellite-NDVI dashboards for sample Indian fields. Then read NITI Aayog's 2023 paper on precision agriculture for the policy context.",
    quiz: [
      {
        q: 'Precision agriculture aims to:',
        options: ['Apply inputs exactly where and when needed', 'Use more fertiliser everywhere', 'Eliminate all farming', 'Replace water with oil'],
        answer: 0,
        explain: 'Right input, right place, right time — the defining principle.',
      },
      {
        q: 'A major Indian precision-ag SaaS is:',
        options: ['Cropin', 'IRCTC', 'BSNL', 'IndianOil'],
        answer: 0,
        explain: 'Cropin serves 12M+ farmers with satellite/farm-data SaaS.',
      },
      {
        q: 'A key technology in precision ag is:',
        options: ['GPS + variable-rate-application machinery', 'Postage stamps', 'CD-ROMs', 'Fax machines'],
        answer: 0,
        explain: 'GPS-guided variable-rate equipment is the foundation of executing the precision-ag promise.',
      },
    ],
  },
  // ===== History =====
  {
    slug: 'three-laws-robotics',
    title: "Asimov's Three Laws of Robotics — Complete Guide | R2BOT",
    description:
      "Isaac Asimov's Three Laws of Robotics define a safety hierarchy for fictional robots. Still the most cited ethical framework in robotics, 80+ years on.",
    bucket: 'history-concepts',
    category: 'applications',
    difficulty: 'beginner',
    tags: ['asimov', 'ethics', 'history', 'three-laws', 'philosophy'],
    relatedTerms: ['robot-ethics', 'robotics', 'history-of-robotics', 'turing-test'],
    youtubeSearchQuery: 'Asimov three laws robotics',
    definition:
      "The Three Laws of Robotics are a fictional safety hierarchy proposed by Isaac Asimov in his 1942 short story 'Runaround'. Despite being fiction, they remain the most-cited starting point for any conversation on robot ethics — even 80+ years later.",
    howItWorks:
      "First Law: A robot may not injure a human being or, through inaction, allow a human being to come to harm. Second Law: A robot must obey orders given by human beings, except where such orders would conflict with the First Law. Third Law: A robot must protect its own existence as long as such protection does not conflict with the First or Second Laws. Asimov later added a Zeroth Law (cannot harm humanity as a whole). The whole point of his stories was that these neat laws break down in messy real situations.",
    realWorld:
      "No real robot enforces the Three Laws — modern safety standards (ISO 10218, IEC 61508) provide far more concrete rules. But every robot-ethics paper, EU AI Act discussion, and corporate guideline references Asimov. Pixar's WALL-E, Spielberg's A.I., and countless others use the Laws as plot devices.",
    whyItMatters:
      "The Three Laws are the seed of the modern robot-ethics field. They forced humans to think about machine agency, responsibility, and safety long before real robots existed. Every robotics professional should know them and the philosophical debates they triggered.",
    tryItYourself:
      "Read Asimov's short story 'Runaround' — the original story containing the Laws. Then read his 1985 novel 'Robots and Empire' for the Zeroth Law. The whole Robot series is short, brilliant, and free in many Indian libraries.",
    quiz: [
      {
        q: 'The Three Laws of Robotics were proposed by:',
        options: ['Isaac Asimov', 'Karel Čapek', 'Alan Turing', 'Elon Musk'],
        answer: 0,
        explain: 'Asimov introduced them in his 1942 short story \'Runaround\'.',
      },
      {
        q: 'The First Law primarily protects:',
        options: ['Humans from harm by robots', 'Robots from humans', 'Companies from lawsuits', 'AI models from being deleted'],
        answer: 0,
        explain: 'No injury to humans is the foremost rule.',
      },
      {
        q: 'The Zeroth Law (added later) prioritises:',
        options: ['Humanity as a whole', 'Individual robot survival', 'Profit', 'Speed'],
        answer: 0,
        explain: 'A robot may not harm humanity, or by inaction allow humanity to come to harm.',
      },
    ],
  },
  {
    slug: 'turing-test',
    title: 'Turing Test in Robotics & AI — Complete Guide | R2BOT',
    description:
      "Alan Turing's 1950 thought experiment defines machine intelligence as indistinguishability from human conversation. Still debated 75 years later.",
    bucket: 'history-concepts',
    category: 'applications',
    difficulty: 'beginner',
    tags: ['turing', 'ai', 'history', 'philosophy', 'intelligence'],
    relatedTerms: ['three-laws-robotics', 'large-language-model-robotics', 'history-of-robotics', 'embodied-ai'],
    youtubeSearchQuery: 'Turing test AI explained',
    definition:
      "The Turing Test, proposed by Alan Turing in his 1950 paper 'Computing Machinery and Intelligence', is a thought experiment that defines machine intelligence as the ability to fool a human judge — in a text-only conversation — into thinking the machine is also human.",
    howItWorks:
      "A judge has text-only conversations simultaneously with one human and one machine. If the judge cannot reliably tell which is which, Turing argued the machine should be considered intelligent. Variants include the Loebner Prize (annual competition) and modern AGI debates about whether LLMs pass the test. Note: passing the Turing Test does not measure consciousness, only conversational indistinguishability.",
    realWorld:
      "ChatGPT, Claude, and Gemini routinely fool typical users in casual conversation — by some interpretations, they pass weak versions of the Turing Test. The Loebner Prize ran annually 1990-2019. Indian AI labs (Wadhwani AI, AI4Bharat) routinely test models against Turing-style benchmarks.",
    whyItMatters:
      "The Turing Test framed the entire field of AI. While modern AI evaluation has moved on to more nuanced benchmarks (MMLU, HumanEval, robotics-specific tests), the Turing Test remains a cultural touchstone that shapes public debate about AI and robotics.",
    tryItYourself:
      "Read Turing's original 1950 paper (free online — 'Computing Machinery and Intelligence'). Then chat with ChatGPT and try to detect it vs a human — surprisingly hard in 2026.",
    quiz: [
      {
        q: 'The Turing Test was proposed in:',
        options: ['1950 by Alan Turing', '2000 by Steve Jobs', '1969 by Neil Armstrong', '2020 by Elon Musk'],
        answer: 0,
        explain: 'Turing introduced the idea in his seminal 1950 paper.',
      },
      {
        q: 'Passing the Turing Test demonstrates:',
        options: ['Conversational indistinguishability from a human', 'Consciousness', 'Self-awareness', 'Empathy'],
        answer: 0,
        explain: 'Only behavioural similarity is tested — the philosophical interpretation is debated.',
      },
      {
        q: 'The Loebner Prize was:',
        options: ['An annual Turing-test competition (1990-2019)', 'A music award', 'A Nobel category', 'A car brand'],
        answer: 0,
        explain: 'The Loebner Prize ran annual Turing-test competitions for nearly three decades.',
      },
    ],
  },
  {
    slug: 'unimate-robot',
    title: 'Unimate — The First Industrial Robot | R2BOT',
    description:
      'Unimate, installed at General Motors in 1961, was the first industrial robot. It launched the entire robotics industry — and never gave up.',
    bucket: 'history-concepts',
    category: 'applications',
    difficulty: 'beginner',
    tags: ['unimate', 'history', 'industrial', 'devol', 'engelberger'],
    relatedTerms: ['industrial-robot', 'history-of-robotics', 'kuka-kr', 'robocup'],
    youtubeSearchQuery: 'Unimate first industrial robot 1961',
    definition:
      "Unimate was the world's first industrial robot, designed by inventor George Devol and entrepreneur Joseph Engelberger and installed at General Motors' New Jersey plant in 1961. It performed dangerous die-casting tasks — handing hot car parts — for 18 years.",
    howItWorks:
      "Unimate was a 4000-pound hydraulic arm with magnetic-drum-based program storage. Operators 'taught' it by manually moving the arm through positions while the controller recorded joint angles. Once trained, Unimate played the trajectory back precisely, repeatedly, day and night. Cycle time: about 1 part per minute. Reliability and indefatigability — not speed — were the breakthrough.",
    realWorld:
      "GM's Trenton plant ran the original Unimate from 1961-1979. Engelberger went on to found Unimation, the first robotics company. By the late 1970s, hundreds of Unimates were running in US, European, and Japanese factories. The robot is now in the Smithsonian.",
    whyItMatters:
      "Unimate created the entire industrial-robotics industry. Engelberger is rightly called the 'Father of Robotics'. Every modern industrial robot — every KUKA, Fanuc, ABB, Yaskawa — descends from this 1961 machine.",
    tryItYourself:
      "Watch the 1961 NBC 'Today Show' episode where Engelberger demonstrated Unimate pouring coffee — it is hilarious and historically priceless. Then read Engelberger's book 'Robotics in Practice' (1980) — still classic-required reading.",
    quiz: [
      {
        q: 'Unimate was first installed at:',
        options: ['General Motors Trenton plant, 1961', 'Tesla Fremont, 2020', 'Ford River Rouge, 1900', 'BMW Munich, 1990'],
        answer: 0,
        explain: 'The first deployment was at GM\'s Trenton (Inland Fisher Body) plant in 1961.',
      },
      {
        q: 'Joseph Engelberger is known as:',
        options: ['The Father of Robotics', 'A music producer', 'A jet pilot', 'A microbiologist'],
        answer: 0,
        explain: 'Engelberger commercialised Devol\'s invention and earned this title.',
      },
      {
        q: 'Unimate primarily did:',
        options: ['Dangerous die-casting and parts handling', 'Embroidery', 'Coffee brewing only', 'Banking'],
        answer: 0,
        explain: 'It handled hot, dangerous, repetitive die-casting work — replacing risky human labour.',
      },
    ],
  },
  // ===== Business =====
  {
    slug: 'robot-roi',
    title: 'Robot ROI — Calculating Return on Investment | R2BOT',
    description:
      'Robot ROI quantifies whether a robotic system pays back its cost in saved labour, quality, and uptime. Essential framework for any robotics deployment.',
    bucket: 'business-industry',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['roi', 'business', 'finance', 'automation', 'payback'],
    relatedTerms: ['automation-economics', 'robot-as-a-service', 'system-integrator', 'future-of-work-robots'],
    youtubeSearchQuery: 'robot ROI calculator industrial automation',
    definition:
      "Robot ROI (Return on Investment) is the financial metric that quantifies whether a robotic system is worth its cost. Calculated as ROI = (Annual Benefit - Annual Cost) / Initial Investment, it determines whether a CFO approves the project.",
    howItWorks:
      "Inputs: capital cost (robot + installation + safety + training), annual operating cost (electricity + maintenance + service contract), expected savings (labour replaced, quality improvement, throughput increase, scrap reduction, safety-incident avoidance). The payback period is initial investment / annual net benefit. Typical industrial-robot payback ranges from 9 months (high-volume welding) to 3 years (low-volume assembly). Cobots and AMRs often achieve faster payback because they require less infrastructure.",
    realWorld:
      "Maruti Suzuki targets <18 months payback on body-shop robotic-welding cells. Indian SMEs adopting UR cobots typically see 12-24 month paybacks. GreyOrange Butler deployments at Flipkart pay back in under 2 years on labour and throughput savings alone.",
    whyItMatters:
      "ROI is the language CFOs speak. Roboticists who can articulate ROI win deployments; those who cannot get stuck in pilots. As Indian SMEs adopt robotics, ROI calculation becomes a critical skill for every system integrator.",
    tryItYourself:
      "Build a simple ROI spreadsheet for a UR5 cobot (₹20L). Add labour cost saved (₹4L/year × 2 shifts), maintenance (₹50K/year), and electricity. Compute payback. Vary labour rate — see how rapidly cobots become attractive in higher-wage regions.",
    quiz: [
      {
        q: 'Robot ROI is calculated as:',
        options: ['(Annual benefit - Annual cost) / Initial investment', 'Just the robot purchase price', 'Random number', 'Number of robots'],
        answer: 0,
        explain: 'The classic ROI formula compares net annual benefit to initial investment.',
      },
      {
        q: 'Typical industrial-robot payback range:',
        options: ['9 months to 3 years', '20 years', '0 days', '100 years'],
        answer: 0,
        explain: 'Most deployments aim for payback under 24 months.',
      },
      {
        q: 'A reason cobots often have faster ROI than traditional robots:',
        options: ['Less safety infrastructure and shorter integration time', 'They never break', 'They are made of gold', 'They make coffee'],
        answer: 0,
        explain: 'Cobots eliminate cage and integration costs, dramatically reducing total deployment expense.',
      },
    ],
  },
  {
    slug: 'robot-as-a-service',
    title: 'Robot-as-a-Service (RaaS) — Complete Guide | R2BOT',
    description:
      'RaaS lets customers pay monthly to use robots instead of buying. Lowers entry barrier dramatically — the dominant business model for AMRs.',
    bucket: 'business-industry',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['raas', 'business-model', 'subscription', 'amr', 'leasing'],
    relatedTerms: ['robot-roi', 'system-integrator', 'autonomous-mobile-robot', 'automation-economics'],
    youtubeSearchQuery: 'robot as a service RaaS business model',
    definition:
      "Robot-as-a-Service (RaaS) is a business model where customers pay a recurring monthly fee to use robotics — instead of paying a large upfront purchase. The provider owns, maintains, and updates the robots. RaaS dramatically lowers the barrier to robotic automation.",
    howItWorks:
      "Provider deploys robots at the customer site and charges per robot per month (or per task completed). The fee bundles hardware, software, maintenance, and software updates. Contracts run 12-60 months. Providers benefit from recurring revenue and economies of scale on maintenance; customers benefit from no capex, no obsolescence risk, and predictable opex.",
    realWorld:
      "Locus Robotics charges $10K-$15K per AMR per year. Berkshire Grey, Plus One Robotics, GreyOrange, and Geek+ all offer RaaS. Indian RaaS providers (Difacto, Addverb's Asimov SaaS line) target SMEs. Cleaning-robot OEMs (Avidbots, SoftBank) provide RaaS to airports and shopping malls.",
    whyItMatters:
      "Most Indian SMEs cannot afford ₹40-60 lakh AMRs outright. RaaS makes adoption viable. As the model matures, it will be the dominant route to robotics for the next decade. Sales, finance, and customer-success roles in RaaS firms are growing fast.",
    tryItYourself:
      "Read Locus Robotics' RaaS pricing model on their website. Then look at GreyOrange's customer-case studies — note the language: 'pay per pick', 'pay per robot per month'. That is RaaS in action.",
    quiz: [
      {
        q: 'RaaS lets customers pay:',
        options: ['Monthly subscription for robot use', 'A one-time fee only', 'In cryptocurrency only', 'In gold bars'],
        answer: 0,
        explain: 'Recurring subscription instead of large upfront purchase is the defining feature.',
      },
      {
        q: 'A major RaaS warehouse-robot provider is:',
        options: ['Locus Robotics', 'Adobe Photoshop', 'Google Drive', 'IRCTC'],
        answer: 0,
        explain: 'Locus Robotics pioneered AMR RaaS at scale.',
      },
      {
        q: 'The main appeal of RaaS for SMEs is:',
        options: ['No large upfront capex', 'Higher total cost', 'More risk', 'More complexity'],
        answer: 0,
        explain: 'Avoiding capex and obsolescence risk is the central RaaS value proposition.',
      },
    ],
  },
  {
    slug: 'system-integrator',
    title: 'Robotics System Integrator — Complete Guide | R2BOT',
    description:
      'System integrators design, install, and maintain robotic systems for customers. The unsung heroes who turn robot OEM products into working factories.',
    bucket: 'business-industry',
    category: 'applications',
    difficulty: 'beginner',
    tags: ['integrator', 'consulting', 'deployment', 'engineering', 'services'],
    relatedTerms: ['robot-roi', 'robot-as-a-service', 'industrial-robot', 'risk-assessment'],
    youtubeSearchQuery: 'robotics system integrator role tutorial',
    definition:
      "A robotics system integrator (SI) is a company that designs, installs, programmes, and maintains robotic systems for end customers. SIs combine robots from OEMs (KUKA, FANUC, UR) with sensors, controllers, safety systems, and custom tooling to deliver turnkey solutions.",
    howItWorks:
      "An SI engages with a customer to scope a problem (e.g., 'palletise our packets at 60/min'). They design the system (which robot, layout, end-effector, safety), perform risk assessment, simulate the cell, build it on the factory floor, programme the robot, integrate it with conveyors and PLCs, train operators, and provide ongoing maintenance.",
    realWorld:
      "Globally: Comau, Yaskawa, ATS Automation. In India: Difacto Robotics (Bengaluru), Addverb Technologies (Noida), Asimov Robotics (Kochi), Cyient (Hyderabad). Most KUKA and FANUC robots in India are sold through SIs. India has hundreds of SIs serving auto, electronics, pharma, and FMCG.",
    whyItMatters:
      "SIs are where robotics meets reality. Most robotics careers go through an SI at some point — it is the best way to learn how robotics actually deploys at scale. Indian SI sector is one of the most-hiring robotics employer categories.",
    tryItYourself:
      "Visit the SIRA (System Integrator Robotics Association) website. Read case studies from Indian SIs like Difacto and Addverb. Apply for SI internships — they are an excellent gateway into the Indian robotics industry.",
    quiz: [
      {
        q: 'A robotics system integrator:',
        options: ['Designs, installs, and maintains robotic systems for customers', 'Manufactures robot OEM hardware only', 'Only does software', 'Only does sales'],
        answer: 0,
        explain: 'SIs combine multiple OEM products into deployed solutions.',
      },
      {
        q: 'An Indian robotics system integrator is:',
        options: ['Difacto Robotics', 'Reliance Jio', 'Spotify', 'McDonald\'s'],
        answer: 0,
        explain: 'Difacto (Bengaluru) is a leading Indian robotics SI.',
      },
      {
        q: 'A typical SI activity is:',
        options: ['Programming a robot to palletise boxes on a customer line', 'Inventing new microchips', 'Running a hospital', 'Designing satellites'],
        answer: 0,
        explain: 'Application-specific programming and integration is core SI work.',
      },
    ],
  },
  {
    slug: 'automation-economics',
    title: 'Economics of Automation — Complete Guide | R2BOT',
    description:
      "Automation economics studies the cost-benefit of robots vs human labour, the impact on jobs and wages, and the macro effect on national productivity.",
    bucket: 'business-industry',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['economics', 'automation', 'labour', 'productivity', 'policy'],
    relatedTerms: ['robot-roi', 'future-of-work-robots', 'robot-as-a-service', 'india-robot-density'],
    youtubeSearchQuery: 'automation economics labour displacement',
    definition:
      "Automation economics is the study of how robots and automation affect costs, productivity, wages, and employment. It informs corporate ROI decisions and national policy on robotics, AI, and the future of work.",
    howItWorks:
      "Micro level: total cost of a robot (capex + opex + integration + safety + training) vs labour cost over the robot's life. Macro level: aggregate effects on GDP, sector productivity, wage inequality, and labour-market shifts. Studies by MIT (Acemoglu & Restrepo), the IFR, OECD, and McKinsey track these effects. India-specific work by NITI Aayog and the Reserve Bank examines the implications of automation in the world's most labour-abundant economy.",
    realWorld:
      "McKinsey estimates 30% of work hours globally could be automated by 2030. India's IT sector has automated 30% of low-skill testing work in 5 years. NITI Aayog's 2023 paper estimates automation may create more jobs in India than it displaces — provided skilling keeps pace.",
    whyItMatters:
      "Robotics careers in India are shaped by policy and economics, not just engineering. Roboticists who understand automation economics — both microeconomic ROI and macroeconomic policy — are better positioned for senior, customer-facing, and policy roles.",
    tryItYourself:
      "Read NITI Aayog's 2024 paper on 'Automation and the Future of Work in India'. Then read MIT's Acemoglu & Restrepo (2020) 'Robots and Jobs: Evidence from US Labor Markets'. Compare and contrast.",
    quiz: [
      {
        q: 'Automation economics studies the trade-off between:',
        options: ['Robot cost and human labour cost', 'Apple vs Samsung phones', 'Cricket vs football', 'Coffee vs tea'],
        answer: 0,
        explain: 'Capex vs labour, plus broader productivity and employment effects.',
      },
      {
        q: 'India\'s think tank on automation policy is:',
        options: ['NITI Aayog', 'RBI alone', 'ISRO', 'IRCTC'],
        answer: 0,
        explain: 'NITI Aayog drives much of India\'s automation and AI policy.',
      },
      {
        q: 'A key insight of automation economics is:',
        options: ['Skilling must keep pace with automation', 'Robots will replace all humans tomorrow', 'Automation has no economic effect', 'Robots are always cheaper than humans'],
        answer: 0,
        explain: 'The dominant policy lesson is that skilling and education determine whether automation creates or destroys net jobs.',
      },
    ],
  },
  {
    slug: 'future-of-work-robots',
    title: 'Future of Work with Robots — Complete Guide | R2BOT',
    description:
      'How robots reshape what humans do at work. Job displacement, augmentation, new roles, and the policy choices that determine the outcome.',
    bucket: 'business-industry',
    category: 'applications',
    difficulty: 'intermediate',
    tags: ['future-of-work', 'policy', 'jobs', 'reskilling', 'automation'],
    relatedTerms: ['automation-economics', 'robot-roi', 'india-robot-density', 'national-robotics-mission'],
    youtubeSearchQuery: 'future of work automation robots policy',
    definition:
      "The future of work with robots is the broad question of how robotic and AI automation will reshape human jobs over the next 20+ years. It encompasses displacement, augmentation, new role creation, reskilling, and the policy responses needed.",
    howItWorks:
      "Three concurrent dynamics: **Displacement** — robots replace humans in routine physical and cognitive tasks. **Augmentation** — robots make remaining workers more productive (e.g., cobots in factories, AI in radiology). **Creation** — robots create entirely new jobs (robot operators, integrators, supervisors, designers). The net effect depends on rate of automation, rate of skilling, and policy choices like UBI, education investment, and labour protection.",
    realWorld:
      "Foxconn has replaced 30,000 humans with robots in some Chinese plants but added thousands of robot-supervisor jobs. McKinsey's 2024 report estimates 800M workers globally may need to shift roles by 2030. India's IT-services sector has been quietly automating BPO work for a decade — leading to net job *growth* in higher-value roles.",
    whyItMatters:
      "Robotics professionals shape this future. Engineers who think about social impact — alongside technical excellence — build better systems. Policy roles in NITI Aayog, ILO, World Bank, and Indian state skill missions increasingly hire robotics experts.",
    tryItYourself:
      "Read the World Economic Forum's 'Future of Jobs Report 2024' (free). Then read NITI Aayog's 'Automation and the Future of Work in India' (2024). Note which jobs they expect to grow vs decline in India.",
    quiz: [
      {
        q: 'A typical effect of automation in many sectors is:',
        options: ['Job displacement plus creation of new roles requiring different skills', 'Permanent and total disappearance of all jobs', 'No change at all', 'Higher wages for displaced workers without retraining'],
        answer: 0,
        explain: 'History shows displacement + creation; the net depends on policy and skilling.',
      },
      {
        q: 'A key Indian policy response to automation is:',
        options: ['Skill India and national reskilling missions', 'Banning all robots', 'Removing the internet', 'Closing all factories'],
        answer: 0,
        explain: 'India invests heavily in skilling to ensure workers can move to robotics-adjacent roles.',
      },
      {
        q: 'Cobots are often cited as an example of:',
        options: ['Augmentation rather than displacement', 'Pure displacement', 'No change to work', 'Only safety improvement'],
        answer: 0,
        explain: 'Cobots typically work alongside humans, making them more productive rather than replacing them entirely.',
      },
    ],
  },
];
