// lib/kids/curriculum/mapping.ts
// Honest alignment notes between the R2BOT Kids curriculum and two frameworks
// schools ask about:
//   1. CSTA K–12 Computer Science Standards (revised 2017) — real standard ids,
//      PARAPHRASED here (check the exact wording at csteachers.org before
//      quoting them to a school).
//   2. India’s National Education Policy 2020 and CBSE practice — in general
//      terms only. NEP and CBSE do not publish coded outcomes for this, so no
//      codes are given (and none may be invented).
// A few NGSS (US Next Generation Science Standards) ids are noted where the
// physics or engineering-design match is direct.
//
// These are ALIGNMENT NOTES written by the curriculum team. They are not a
// certification, accreditation or endorsement by CSTA, NGSS, the Government of
// India or CBSE, and must never be presented as one.

import type { ConceptId, LearningObjective, LevelNumber, MappingTag } from './types'

// ── Frameworks ────────────────────────────────────────────────────────────

export type CstaLevel = '1A' | '1B' | '2' | '3A'

export interface CstaStandard {
  id: string
  level: CstaLevel
  /** Paraphrase, not the official text. */
  summary: string
}

/** The CSTA level that matches each R2BOT Kids level by age/grade. */
export const CSTA_LEVEL_FOR: Record<LevelNumber, { level: CstaLevel; grades: string }> = {
  1: { level: '1A', grades: 'ages 5–7 (Grades K–2)' },
  2: { level: '1B', grades: 'ages 8–11 (Grades 3–5)' },
  3: { level: '2', grades: 'ages 11–14 (Grades 6–8)' },
  4: { level: '3A', grades: 'ages 14–16 (Grades 9–10); Grades 11–12 (3B) are only partly covered' },
}

export const CSTA: CstaStandard[] = [
  // Level 1A (K–2)
  { id: '1A-CS-02', level: '1A', summary: 'Use the right words to name and describe what common hardware parts do.' },
  { id: '1A-CS-03', level: '1A', summary: 'Describe basic hardware and software problems using accurate words.' },
  { id: '1A-AP-08', level: '1A', summary: 'Model everyday processes by creating and following step-by-step algorithms.' },
  { id: '1A-AP-10', level: '1A', summary: 'Develop programs with sequences and simple loops to express ideas or solve a problem.' },
  { id: '1A-AP-11', level: '1A', summary: 'Break the steps needed to solve a problem into a precise sequence of instructions.' },
  { id: '1A-AP-12', level: '1A', summary: 'Make plans that describe a program’s sequence of events, goals and expected outcomes.' },
  { id: '1A-AP-14', level: '1A', summary: 'Find and fix errors in an algorithm or program with sequences and simple loops.' },
  { id: '1A-AP-15', level: '1A', summary: 'Using correct words, describe the steps taken and choices made while developing a program.' },
  { id: '1A-IC-16', level: '1A', summary: 'Compare how people live and work before and after a computing technology is adopted.' },
  // Level 1B (3–5)
  { id: '1B-CS-01', level: '1B', summary: 'Describe how internal and external parts of a computing device work together as a system.' },
  { id: '1B-CS-02', level: '1B', summary: 'Model how hardware and software work together to accomplish tasks.' },
  { id: '1B-CS-03', level: '1B', summary: 'Find solutions to simple hardware and software problems with common troubleshooting strategies.' },
  { id: '1B-DA-06', level: '1B', summary: 'Organise and present collected data visually to show relationships and support a claim.' },
  { id: '1B-DA-07', level: '1B', summary: 'Use data to show cause and effect, predict outcomes or communicate an idea.' },
  { id: '1B-AP-08', level: '1B', summary: 'Compare and refine several algorithms for the same task and choose the most suitable.' },
  { id: '1B-AP-09', level: '1B', summary: 'Create programs that use variables to store and change data.' },
  { id: '1B-AP-10', level: '1B', summary: 'Create programs that include sequences, events, loops and conditionals.' },
  { id: '1B-AP-11', level: '1B', summary: 'Break problems into smaller, manageable sub-problems.' },
  { id: '1B-AP-13', level: '1B', summary: 'Plan program development iteratively, including others’ views and user preferences.' },
  { id: '1B-AP-15', level: '1B', summary: 'Test and debug a program or algorithm so it runs as intended.' },
  { id: '1B-AP-16', level: '1B', summary: 'Take on different roles, with teacher guidance, when collaborating on a program.' },
  { id: '1B-AP-17', level: '1B', summary: 'Describe choices made during program development through comments, presentations and demonstrations.' },
  { id: '1B-IC-18', level: '1B', summary: 'Discuss computing technologies that changed the world and how they relate to culture.' },
  { id: '1B-IC-19', level: '1B', summary: 'Brainstorm ways to make technology more accessible and usable for diverse users.' },
  // Level 2 (6–8)
  { id: '2-CS-02', level: '2', summary: 'Design projects that combine hardware and software to collect and exchange data.' },
  { id: '2-CS-03', level: '2', summary: 'Systematically identify and fix problems with computing devices and their parts.' },
  { id: '2-DA-08', level: '2', summary: 'Collect data with computational tools and transform it to be more useful and reliable.' },
  { id: '2-DA-09', level: '2', summary: 'Refine computational models based on the data they generate.' },
  { id: '2-AP-10', level: '2', summary: 'Use flowcharts and/or pseudocode to express complex problems as algorithms.' },
  { id: '2-AP-11', level: '2', summary: 'Create clearly named variables and perform operations on their values.' },
  { id: '2-AP-12', level: '2', summary: 'Design and iteratively develop programs that combine control structures, including nested loops and compound conditionals.' },
  { id: '2-AP-13', level: '2', summary: 'Decompose problems and sub-problems to help design, implement and review programs.' },
  { id: '2-AP-15', level: '2', summary: 'Seek and use feedback from team members and users to refine a solution.' },
  { id: '2-AP-17', level: '2', summary: 'Systematically test and refine programs using a range of test cases.' },
  { id: '2-AP-18', level: '2', summary: 'Share out tasks and keep a timeline when developing collaboratively.' },
  { id: '2-AP-19', level: '2', summary: 'Document programs to make them easier to follow, test and debug.' },
  { id: '2-IC-20', level: '2', summary: 'Compare trade-offs of computing technologies that affect everyday life and careers.' },
  { id: '2-IC-21', level: '2', summary: 'Discuss bias and accessibility in the design of existing technologies.' },
  // Level 3A (9–10)
  { id: '3A-CS-01', level: '3A', summary: 'Explain how abstractions hide the implementation details of computing systems in everyday objects.' },
  { id: '3A-CS-03', level: '3A', summary: 'Develop guidelines for systematic troubleshooting that others can use.' },
  { id: '3A-DA-12', level: '3A', summary: 'Create computational models of the relationships in data collected from a phenomenon or process.' },
  { id: '3A-AP-13', level: '3A', summary: 'Create prototypes that use algorithms to solve problems, drawing on prior knowledge and interests.' },
  { id: '3A-AP-15', level: '3A', summary: 'Justify the choice of control structures, explaining trade-offs in implementation, readability and performance.' },
  { id: '3A-AP-16', level: '3A', summary: 'Design and iteratively develop artefacts for a practical purpose or societal issue, using events to trigger instructions.' },
  { id: '3A-AP-17', level: '3A', summary: 'Decompose problems systematically using constructs such as procedures or modules.' },
  { id: '3A-AP-21', level: '3A', summary: 'Evaluate and refine artefacts to make them more usable and accessible.' },
  { id: '3A-AP-22', level: '3A', summary: 'Design and develop artefacts working in team roles with collaborative tools.' },
  { id: '3A-AP-23', level: '3A', summary: 'Document design decisions with text, graphics, presentations or demonstrations.' },
  { id: '3A-IC-24', level: '3A', summary: 'Evaluate how computing affects personal, ethical, social, economic and cultural practices.' },
  { id: '3A-IC-26', level: '3A', summary: 'Show how an algorithm applies to problems across different subjects.' },
]

const CSTA_IDS = new Set(CSTA.map((c) => c.id))

/** NGSS ids used below (performance expectations), paraphrased. */
export const NGSS: Record<string, string> = {
  'K-PS2-1': 'Investigate how pushes and pulls of different strengths and directions change an object’s motion.',
  'K-PS2-2': 'Analyse data to decide whether a design changes an object’s speed or direction as intended.',
  '1-PS4-2': 'Objects in darkness can be seen only when lit.',
  '1-PS4-4': 'Design a device that uses light or sound to solve a communication problem.',
  'K-2-ETS1-1': 'Ask questions and define a simple problem that a new tool or object could solve.',
  'K-2-ETS1-2': 'Sketch or model how a shape helps an object do its job.',
  'K-2-ETS1-3': 'Compare two designs by testing how well each performs.',
  '3-5-ETS1-1': 'Define a simple design problem with criteria and constraints.',
  '3-5-ETS1-3': 'Plan and carry out fair tests that control variables to find what to improve.',
  'MS-ETS1-1': 'Define criteria and constraints of a design problem precisely.',
  'MS-ETS1-3': 'Analyse test data to combine the best features of several solutions.',
  'HS-ETS1-2': 'Design a solution to a complex problem by breaking it into smaller engineering problems.',
  'HS-ETS1-3': 'Evaluate a solution against prioritised criteria and trade-offs, including safety and social impact.',
}

// ── Rules: tags and concepts → standards ─────────────────────────────────

type Strength = 'addresses' | 'contributes'

interface Rule {
  ids: string[]
  strength: Strength
}

/** Per CSTA level: which standards each mapping tag points to. */
const TAG_RULES: Record<CstaLevel, Partial<Record<MappingTag, Rule>>> = {
  '1A': {
    algorithms: { ids: ['1A-AP-08', '1A-AP-11'], strength: 'addresses' },
    programming: { ids: ['1A-AP-10'], strength: 'addresses' },
    debugging: { ids: ['1A-AP-14'], strength: 'addresses' },
    'computing-systems': { ids: ['1A-CS-02'], strength: 'contributes' },
    'impacts-of-computing': { ids: ['1A-IC-16'], strength: 'contributes' },
    communication: { ids: ['1A-AP-15'], strength: 'contributes' },
    collaboration: { ids: ['1A-AP-15'], strength: 'contributes' },
    'engineering-design': { ids: ['1A-AP-12'], strength: 'contributes' },
  },
  '1B': {
    algorithms: { ids: ['1B-AP-08', '1B-AP-11'], strength: 'addresses' },
    programming: { ids: ['1B-AP-10'], strength: 'addresses' },
    debugging: { ids: ['1B-AP-15', '1B-CS-03'], strength: 'addresses' },
    'computing-systems': { ids: ['1B-CS-01', '1B-CS-02'], strength: 'addresses' },
    data: { ids: ['1B-DA-06', '1B-DA-07'], strength: 'addresses' },
    'impacts-of-computing': { ids: ['1B-IC-18', '1B-IC-19'], strength: 'contributes' },
    collaboration: { ids: ['1B-AP-16'], strength: 'contributes' },
    communication: { ids: ['1B-AP-17'], strength: 'contributes' },
    'engineering-design': { ids: ['1B-AP-13'], strength: 'contributes' },
  },
  '2': {
    algorithms: { ids: ['2-AP-10', '2-AP-13'], strength: 'addresses' },
    programming: { ids: ['2-AP-12'], strength: 'addresses' },
    debugging: { ids: ['2-AP-17', '2-CS-03'], strength: 'addresses' },
    'computing-systems': { ids: ['2-CS-02'], strength: 'contributes' },
    data: { ids: ['2-DA-08', '2-DA-09'], strength: 'addresses' },
    'impacts-of-computing': { ids: ['2-IC-20', '2-IC-21'], strength: 'contributes' },
    collaboration: { ids: ['2-AP-18', '2-AP-15'], strength: 'contributes' },
    communication: { ids: ['2-AP-19'], strength: 'contributes' },
    'engineering-design': { ids: ['2-AP-15'], strength: 'contributes' },
  },
  '3A': {
    algorithms: { ids: ['3A-AP-13', '3A-IC-26'], strength: 'addresses' },
    programming: { ids: ['3A-AP-15', '3A-AP-16'], strength: 'addresses' },
    debugging: { ids: ['3A-CS-03'], strength: 'addresses' },
    'computing-systems': { ids: ['3A-CS-01'], strength: 'contributes' },
    data: { ids: ['3A-DA-12'], strength: 'addresses' },
    'impacts-of-computing': { ids: ['3A-IC-24'], strength: 'addresses' },
    collaboration: { ids: ['3A-AP-22'], strength: 'contributes' },
    communication: { ids: ['3A-AP-23'], strength: 'contributes' },
    'engineering-design': { ids: ['3A-AP-21'], strength: 'contributes' },
  },
}

/** Concept-based additions (things a tag alone does not capture). */
const CONCEPT_RULES: Record<CstaLevel, Partial<Record<ConceptId, Rule>>> = {
  '1A': {
    decomposition: { ids: ['1A-AP-11'], strength: 'addresses' },
    loops: { ids: ['1A-AP-10'], strength: 'addresses' },
    'design-process': { ids: ['1A-AP-12', '1A-AP-15'], strength: 'contributes' },
    sensors: { ids: ['1A-CS-02'], strength: 'contributes' },
    // Conditionals sit in 1B, one band above Level 1’s age group.
    conditions: { ids: ['1B-AP-10'], strength: 'contributes' },
  },
  '1B': {
    decomposition: { ids: ['1B-AP-11'], strength: 'addresses' },
    variables: { ids: ['1B-AP-09'], strength: 'contributes' },
    sensors: { ids: ['1B-CS-02'], strength: 'contributes' },
  },
  '2': {
    variables: { ids: ['2-AP-11'], strength: 'addresses' },
    decomposition: { ids: ['2-AP-13'], strength: 'addresses' },
    sensors: { ids: ['2-CS-02'], strength: 'contributes' },
  },
  '3A': {
    decomposition: { ids: ['3A-AP-17'], strength: 'contributes' },
    'safety-ethics': { ids: ['3A-IC-24'], strength: 'addresses' },
  },
}

const NGSS_RULES: Record<LevelNumber, Partial<Record<MappingTag, string[]>>> = {
  1: { 'science-forces': ['K-PS2-1', 'K-PS2-2'], 'engineering-design': ['K-2-ETS1-1', 'K-2-ETS1-3'] },
  2: { 'engineering-design': ['3-5-ETS1-1', '3-5-ETS1-3'] },
  3: { 'engineering-design': ['MS-ETS1-1', 'MS-ETS1-3'] },
  4: { 'engineering-design': ['HS-ETS1-2', 'HS-ETS1-3'] },
}

/** Objective-specific notes where a rule would over- or under-claim. */
const NOTES: Record<string, { addNgss?: string[]; note: string }> = {
  'L1-S17-O1': { addNgss: ['1-PS4-2'], note: 'Seeing needs light: a direct match to NGSS 1-PS4-2.' },
  'L1-S20-O1': { note: 'Uses a single “if” — conditionals are a Grades 3–5 (1B) expectation, so this is an early, supported introduction rather than mastery.' },
  'L1-S19-O2': { note: '“Repeat until” with a sensor goes slightly beyond the “simple loops” of 1A; it is presented as one picture block.' },
  'L1-S21-O1': { addNgss: ['1-PS4-4'], note: 'Echo distance sensing links to sound in NGSS 1-PS4; 1-PS4-4 is about communicating with light or sound, so the link is partial.' },
  'L1-S23-O2': { note: 'Careers awareness; no specific CSTA K–2 standard covers it.' },
}

// ── Public API ────────────────────────────────────────────────────────────

export interface ObjectiveAlignment {
  objectiveId: string
  csta: { id: string; strength: Strength }[]
  ngss: string[]
  note?: string
}

/** Alignment for one objective at a given level. Deterministic; every id is checked against CSTA / NGSS above. */
export function alignObjective(level: LevelNumber, o: LearningObjective): ObjectiveAlignment {
  const band = CSTA_LEVEL_FOR[level].level
  const found = new Map<string, Strength>()
  const add = (r: Rule | undefined) => {
    if (!r) return
    for (const id of r.ids) {
      if (!CSTA_IDS.has(id)) throw new Error(`Unknown CSTA id ${id}`)
      if (found.get(id) !== 'addresses') found.set(id, r.strength)
    }
  }
  for (const t of o.tags) add(TAG_RULES[band][t])
  for (const c of o.concepts) add(CONCEPT_RULES[band][c])

  const ngss = new Set<string>()
  for (const t of o.tags) for (const id of NGSS_RULES[level][t] ?? []) ngss.add(id)
  const extra = NOTES[o.id]
  for (const id of extra?.addNgss ?? []) ngss.add(id)
  for (const id of ngss) if (!(id in NGSS)) throw new Error(`Unknown NGSS id ${id}`)

  return {
    objectiveId: o.id,
    csta: [...found].map(([id, strength]) => ({ id, strength })).sort((a, b) => a.id.localeCompare(b.id)),
    ngss: [...ngss].sort(),
    note: extra?.note,
  }
}

/** Level-wide alignment (Levels 2–4 are outlined, so they are mapped per level, not per objective). */
export const LEVEL_CSTA: Record<LevelNumber, { focus: string[]; notCovered: string[] }> = {
  1: {
    focus: ['1A-AP-08', '1A-AP-10', '1A-AP-11', '1A-AP-12', '1A-AP-14', '1A-AP-15', '1A-CS-02'],
    notCovered: ['1A-NI-04 and 1A-IC-18 (passwords and logging in): out of scope — children never create accounts.', '1A-DA-05 to 1A-DA-07 (storing and charting data): only touched informally.'],
  },
  2: {
    focus: ['1B-AP-08', '1B-AP-10', '1B-AP-11', '1B-AP-13', '1B-AP-15', '1B-AP-16', '1B-CS-01', '1B-CS-02', '1B-DA-06', '1B-DA-07', '1B-IC-19'],
    notCovered: ['1B-NI-04 and 1B-NI-05 (networks and cybersecurity).', '1B-AP-09 (variables) is only prepared for; variables start at Level 3.'],
  },
  3: {
    focus: ['2-AP-10', '2-AP-11', '2-AP-12', '2-AP-13', '2-AP-17', '2-CS-02', '2-CS-03', '2-DA-08', '2-DA-09', '2-IC-20'],
    notCovered: ['2-AP-14 (procedures with parameters): the shared block set has no “make a block” yet (see OPEN_QUESTIONS).', 'Networks and cybersecurity (2-NI).'],
  },
  4: {
    focus: ['3A-AP-13', '3A-AP-15', '3A-AP-16', '3A-AP-21', '3A-AP-22', '3A-AP-23', '3A-CS-01', '3A-CS-03', '3A-DA-12', '3A-IC-24', '3A-IC-26'],
    notCovered: ['3A-AP-14 (use lists to simplify solutions): the shared block set has no lists, so maps and logs are kept in a few named variables or on paper (see OPEN_QUESTIONS).', '3A-AP-17 only partly (no procedures in the block set).', 'Networks, cybersecurity and most of 3B (Grades 11–12).'],
  },
}

/** India: NEP 2020 / NCF / CBSE alignment in general terms (no codes exist for this, and none are invented). */
export const INDIA_ALIGNMENT: Record<LevelNumber, { stage: string; themes: string[] }> = {
  1: {
    stage: 'NEP 2020 Foundational Stage (ages 3–8; Level 1 covers Grades 1–2).',
    themes: [
      'Play-, activity- and story-based learning, which NEP 2020 and the National Curriculum Framework for the Foundational Stage put at the centre of these years.',
      'Early numeracy and spatial sense: counting steps, comparing distances, left and right, quarter turns.',
      'Voice-first and translatable, so it can be offered in a child’s home language, in the spirit of NEP’s emphasis on learning in the mother tongue in the early years.',
      'Toy- and game-based pedagogy using everyday materials in the unplugged warm-ups.',
    ],
  },
  2: {
    stage: 'NEP 2020 Preparatory Stage (Grades 3–5).',
    themes: [
      'Experiential, discovery-based learning that connects mathematics (measurement, angles) and science (forces, friction) through a project.',
      'Fair tests and simple data tables, building the scientific temper NEP calls for.',
      'Environmental awareness (the turtle beach) and design for everyone (inclusion).',
    ],
  },
  3: {
    stage: 'NEP 2020 Middle Stage (Grades 6–8).',
    themes: [
      'NEP 2020 recommends introducing coding from Grade 6; Level 3 brings variables, maths in code and control in that window.',
      'Computational thinking and hands-on, project-based work, in line with NEP’s push for experiential and vocational exposure in the middle stage.',
      'Fits alongside CBSE skill modules in coding and AI offered at the middle stage, as enrichment rather than a replacement.',
    ],
  },
  4: {
    stage: 'NEP 2020 Secondary Stage (Grades 9–12).',
    themes: [
      'Multidisciplinary, inquiry-led capstone work and critical thinking, as NEP intends for the secondary stage.',
      'Relevant to CBSE skill subjects in AI and information technology as practical enrichment (no claim of syllabus coverage).',
      'Ethics, safety and responsible technology, connecting to NEP’s emphasis on ethical reasoning and values.',
      'Career awareness and portfolios that support NEP’s goal of flexible pathways into higher education and vocational routes.',
    ],
  },
}

export const ALIGNMENT_DISCLAIMER =
  'Alignment notes only. Standard ids are real; the descriptions are our paraphrases. R2BOT Kids is not certified, accredited or endorsed by CSTA, NGSS, the Ministry of Education (India) or CBSE. Schools should check the official wording before citing any standard.'
