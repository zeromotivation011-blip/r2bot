// lib/kids/teach/clubs.ts
//
// Clubs, homeschoolers and libraries (roadmap #84). Three ways to run R2BOT
// Kids outside a school timetable, all built on what already exists:
//   - Club mode: a leader runs a MIXED-AGE group. Every member keeps their own
//     band (it lives on their device, and their class snapshot reports it), and
//     a 60–90-minute weekly session replaces the 40-minute period. The stations
//     come from each band's six-week plan (lib/kids/classroom-plan.ts), so the
//     whole club shares one theme while each age works at its own level.
//   - Family class: a homeschool parent makes a class for siblings with the
//     same Classroom a teacher uses.
//   - Library drop-in kit: a printable 60-minute session for walk-in children,
//     with no class, no sign-in and no names — a head-count tally only.
//
// Pure data built from the class plans; safe on the server and in the browser.

import { BAND_ORDER, KIDS_BANDS, type BandId } from '../bands'
import { CLASS_PLANS, episodeHref, missionHref } from '../classroom-plan'

export type ClubLength = 60 | 75 | 90

export interface ClubBlock {
  minutes: number
  title: string
  what: string
}

/** The weekly club session, in three lengths. Minutes always add up (checked in ./clubs.verify.ts). */
export function clubSessionShape(length: ClubLength): ClubBlock[] {
  const stations = length === 60 ? 25 : 35
  const blocks: ClubBlock[] = [
    { minutes: length === 60 ? 5 : 10, title: 'Arrive and warm up', what: 'A puzzle card on every table as members arrive (an unplugged floor-grid mission or a sorting set). Nobody waits for the late ones.' },
    { minutes: 10, title: 'Whole-club hook', what: 'One Story Theatre episode on the big screen (use Present mode). Pick the youngest band’s episode: older members explain it back.' },
    { minutes: 10, title: 'Buddy unplugged', what: 'Mixed-age pairs: an older member is the programmer, a younger one is the robot — then swap. Older members practise explaining; younger ones practise thinking out loud.' },
    { minutes: stations, title: 'Stations by band', what: 'Each member works at their own band’s station for this week (below), alone or with a same-band partner.' },
  ]
  if (length === 90) blocks.push({ minutes: 15, title: 'Mixed team build', what: 'Teams of one from each band design one robot together in the Workshop, then test it in the Physics Lab. The youngest member names it.' })
  blocks.push({ minutes: 10, title: 'Show and tell', what: 'Two or three members show what they made. Everyone says one thing they learned and one thing they will try next week. No scores, no winners.' })
  return blocks
}

export interface ClubStation {
  band: BandId
  bandName: string
  ages: string
  emoji: string
  concept: string
  goal: string
  episode: { title: string; href: string }
  codeLab: string
  missions: { title: string; href: string }[]
  workshop: string
  unplugged: string
}

export interface ClubWeek {
  week: number
  theme: string
  stations: ClubStation[]
}

/** The six themed club weeks: every band's station for the same week of its plan. */
export function clubWeeks(): ClubWeek[] {
  const weeks = CLASS_PLANS.explorers.length
  return Array.from({ length: weeks }, (_, i) => {
    const stations = BAND_ORDER.map((band) => {
      const w = CLASS_PLANS[band][i]
      const b = KIDS_BANDS.find((x) => x.id === band)
      return {
        band,
        bandName: b?.name ?? band,
        ages: b?.ages ?? '',
        emoji: b?.emoji ?? '',
        concept: w.concept,
        goal: w.goal,
        episode: { title: w.episode.title, href: episodeHref(w.episode.slug) },
        codeLab: w.codeLab,
        missions: w.missions.map((m) => ({ title: m.title, href: missionHref(m.id) })),
        workshop: w.workshop,
        unplugged: w.unplugged,
      }
    })
    return { week: i + 1, theme: CLASS_PLANS.explorers[i].concept, stations }
  })
}

/** After the six themed weeks: two weeks that turn a club term into a season. */
export const CLUB_FINALE: ClubBlock[] = [
  { minutes: 75, title: 'Week 7 · Build sprint', what: 'Mixed-age teams choose a problem in their community (a library returns trolley, a garden waterer, a guide for a visitor) and design, build and program a robot for it in the Workshop and Code Lab. Older members keep a design log; younger members test.' },
  { minutes: 75, title: 'Week 8 · Showcase night', what: 'Families are invited. Each team presents its robot with Present mode on the big screen and runs it live. Members hand out their own explanations, not certificates of rank — every member who took part gets the same thanks.' },
]

export const CLUB_SETUP: string[] = [
  'Sign in as an adult and create a class in the Classroom. Choose “Club” as the kind of group and name it after your club. The band you pick is the youngest in the club: it sets the shared hook, not anyone’s level.',
  'Print the join card. Members join with the code and a first name or a made-up robot name — never an email or anything else.',
  'Because it is a club, every member keeps their OWN band (Explorers 5–7, Builders 8–10, Inventors 11–13, Engineers 14–17); a member who has not chosen one yet picks it when they join. Their progress, missions and certificates follow that band; your roster shows each member’s band next to their nickname, and you can still set one member’s band if they need a different level.',
  'Assign the week’s station work from the Classroom (a course session, a Skill Galaxy activity or a game), or simply print this page’s stations.',
  'Use Present mode for the hook and the show-and-tell, with the join code in the corner for newcomers.',
]

export const CLUB_LEADER_NOTES: string[] = [
  'Two adults in the room, and follow your organisation’s safeguarding and background-check rules for volunteers working with children.',
  'Do not photograph members or share their work outside the club without written permission from their parents or carers.',
  'One device per pair is enough. Members can bring their own; nothing needs installing. Without devices, run the unplugged lessons instead.',
  'Older members are explainers, not answer-givers: “Show me how you would tell the robot” beats “Here is the answer”.',
  'Keep it a club, not a contest: no rankings, no public scores. Celebrate fixes and good questions.',
  'At the end of a season, delete the class in the Classroom (or remove members who leave): their class data is deleted with it.',
]

export const FAMILY_SETUP: string[] = [
  'A parent or carer signs in with their own adult account and creates a class in the Classroom, choosing “Family class” as the kind of group. The band you pick is the youngest child’s: it sets the shared episode, not anyone’s level.',
  'Each child joins on their own device (or their own profile on a shared tablet) with the class code and a first name or a nickname. In a family class each child keeps their own band, and picks one when they join if they have not yet.',
  'You now have the same tools a teacher has: every child’s progress in one view, the concepts each one is secure in or still learning, missions you can assign, and the printable teacher guides.',
  'Several families learning together (a co-op) can share one class: one adult creates it and the others help run the sessions.',
]

export interface FamilyDay {
  day: string
  minutes: number
  what: string
}

/** A three-day week of 30–40-minute sessions for a home with children of different ages. */
export const FAMILY_WEEK: FamilyDay[] = [
  { day: 'Day 1 · Watch and act', minutes: 30, what: 'Watch one episode together (the youngest child’s band). Then act it out unplugged: the older child programs, the younger one is the robot, on a floor grid of sheets of paper.' },
  { day: 'Day 2 · Course session', minutes: 40, what: 'Each child does the next session of their own level’s course. Sit with the youngest; let older ones work alone and explain their run to you at the end.' },
  { day: 'Day 3 · Make and share', minutes: 35, what: 'One shared build: design a robot for a job at home in the Workshop, or try the “try at home” activity from the week’s family note. Each child explains one thing to another family member.' },
]

export const FAMILY_NOTES: string[] = [
  'Short and often beats long and rare: three 30–40-minute sessions a week is plenty for ages 5–10; teenagers can go longer on their own projects.',
  'Use the weekly report and the concept constellations to see what is secure and what needs another go. The Recharge missions bring back fading ideas by themselves.',
  'On a shared tablet, use family profiles so each child’s progress stays separate, and “Play together” for sessions side by side.',
  'Every teacher guide works at home: the unplugged warm-ups need only things every home has.',
]

export interface DropInStation {
  name: string
  emoji: string
  ages: string
  what: string[]
  needs: string[]
}

/** The library / community-centre drop-in kit: three stations for walk-in children. */
export const DROP_IN_STATIONS: DropInStation[] = [
  {
    name: 'Human-robot floor grid',
    emoji: '🤖',
    ages: 'All ages, best for 5–9',
    what: [
      'Tape a 4 × 4 grid on the floor. Lay out one mission map from the unplugged lessons (lessons 2, 5 and 7 are good first ones).',
      'One child is the robot, the others lay the command cards. Then swap.',
      'A volunteer reads the cards with the youngest children.',
    ],
    needs: ['Masking tape', 'One printed set of command cards', 'Three printed mission maps'],
  },
  {
    name: 'Screens: story and code',
    emoji: '💻',
    ages: 'All ages; each child picks their band',
    what: [
      'Children open www.r2bot.in/kids on a library computer or tablet. No sign-in and no class code: drop-in visitors do not join a class, so nothing about them is stored by R2BOT. (For a regular group with the same children every week, a leader can make a “Library group” class instead: mixed ages, each child keeps their own band.)',
      'Ages 5–7: one Story Theatre episode, then the first Code Lab mission. Ages 8–17: the first course session of their band’s level.',
      'Progress stays on that device only. Use the device’s guest mode or clear the site data at closing time.',
    ],
    needs: ['Library computers or tablets with a current browser', 'Headphones'],
  },
  {
    name: 'Make table: gears and sorting',
    emoji: '⚙️',
    ages: 'All ages',
    what: [
      'Cut out paper gears, pin them to cardboard with a pencil and find out which way each one turns.',
      'Sort the sense–think–act picture cards for machines in the library (the automatic doors, the self-checkout, the lift).',
    ],
    needs: ['Card, scissors, pencils, cardboard', 'Printed gear template and sorting cards'],
  },
]

export const DROP_IN_PLAN: ClubBlock[] = [
  { minutes: 5, title: 'Welcome', what: 'A volunteer greets each family, asks the child’s age band (not their name) and points to a station. Children can arrive at any time.' },
  { minutes: 45, title: 'Rotate the stations', what: 'Children move freely between the three stations. Ring a bell every 15 minutes as a gentle nudge to try another.' },
  { minutes: 10, title: 'Robot show', what: 'Two or three volunteers’ choices of robot programs from the floor grid, run by the children who made them. Everyone claps the robot.' },
]

export const DROP_IN_VOLUNTEER_SCRIPT: string[] = [
  '“Welcome to Robot Club! Have you ever programmed a robot? Today YOU get to be one.”',
  '“A robot only does exactly what its instructions say. Let’s see if your friend’s cards really get you to the star.”',
  '“Uh-oh — a bug! That’s great: real engineers find bugs every day. Which card should we change?”',
  '“Want to keep going at home? This leaflet has the website. Ask a grown-up to open it with you.”',
]

/** Head count only: age bands, never names. */
export const TALLY_ROWS = KIDS_BANDS.map((b) => `${b.name} (${b.ages})`)
