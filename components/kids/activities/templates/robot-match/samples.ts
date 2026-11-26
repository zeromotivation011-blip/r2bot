// components/kids/activities/templates/robot-match/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each. Facts are about real, documented robots.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'world-match-robot-homes',
    title: 'Where does each robot live?',
    track: 'world',
    band: 'explorers',
    template: 'robot-match',
    difficulty: 1,
    intro: 'Three robots got lost! Help each one get back to the place it was built for.',
    takeaway: 'Every robot’s body is made for its home: wheels for floors and rocky ground, propellers for water.',
    params: {
      task: 'Connect each robot to its home.',
      robots: [
        { id: 'vac', name: 'Robot vacuum', icon: '🧹', clues: ['Flat and round', 'Brushes underneath'], fact: 'It is flat so it can clean under beds and sofas.', job: 'home' },
        { id: 'rover', name: 'Mars rover', icon: '🚙', clues: ['Six big wheels', 'Lots of cameras'], fact: 'Rovers like Perseverance drive on Mars, millions of kilometres away.', job: 'mars' },
        { id: 'sub', name: 'Underwater robot', icon: '🐟', clues: ['Propellers', 'Bright lights'], fact: 'The deep sea is pitch dark, so underwater robots carry their own lights.', job: 'ocean' },
      ],
      jobs: [
        { id: 'home', label: 'A living room', icon: '🛋️' },
        { id: 'mars', label: 'Planet Mars', icon: '🔴' },
        { id: 'ocean', label: 'Deep ocean', icon: '🌊' },
      ],
    },
    solution: { matches: { vac: 'home', rover: 'mars', sub: 'ocean' } },
  },
  {
    id: 'world-match-robots-at-work',
    title: 'Robots at work',
    track: 'world',
    band: 'builders',
    template: 'robot-match',
    difficulty: 3,
    intro: 'Four famous robots, four workplaces. Match each robot to its job — then read the fact you unlock.',
    takeaway: 'Robots are designed for one job: carrying shelves, helping surgeons, inspecting factories or flying where people can’t go.',
    params: {
      task: 'Match each robot to its workplace.',
      robots: [
        { id: 'kiva', name: 'Warehouse drive unit', icon: '📦', clues: ['Low and square', 'Lifts whole shelves', 'Follows codes on the floor'], fact: 'Warehouse robots like these bring shelves to human pickers, so people don’t walk miles a day.', job: 'warehouse' },
        { id: 'davinci', name: 'da Vinci surgical system', icon: '🩺', clues: ['Four thin arms', 'Tiny wrist tools', 'Moved by a surgeon at a console'], fact: 'The surgeon controls every move — the robot makes tiny, steady motions through small cuts.', job: 'hospital' },
        { id: 'spot', name: 'Spot', icon: '🐕', clues: ['Four legs', 'Cameras all round', 'Climbs stairs'], fact: 'Spot, a four-legged robot by Boston Dynamics, walks through factories and power plants reading gauges and checking for leaks.', job: 'factory' },
        { id: 'ingenuity', name: 'Ingenuity', icon: '🚁', clues: ['Two spinning rotors', 'Very light', 'Solar panel on top'], fact: 'In April 2021 Ingenuity made the first powered, controlled flight on another planet — Mars.', job: 'mars' },
      ],
      jobs: [
        { id: 'warehouse', label: 'Online-shop warehouse', icon: '🏬' },
        { id: 'hospital', label: 'Operating room', icon: '🏥' },
        { id: 'factory', label: 'Power plant inspection', icon: '🏭' },
        { id: 'mars', label: 'Flying on Mars', icon: '🔴' },
      ],
    },
    solution: { matches: { kiva: 'warehouse', davinci: 'hospital', spot: 'factory', ingenuity: 'mars' } },
  },
  {
    id: 'world-match-form-follows-function',
    title: 'Form follows function: name the robot from its design',
    track: 'world',
    band: 'engineers',
    template: 'robot-match',
    difficulty: 5,
    intro: 'The names are hidden. Read each design like an engineer — body, power, tools — and decide where it works. One design fits none of these jobs.',
    takeaway: 'A robot’s design is an argument about its environment: nuclear power where there’s little sun, buoyancy instead of propellers for months at sea, no wheels where there is no ground.',
    params: {
      task: 'Match each design to its mission. One design is not needed here.',
      hideNames: true,
      robots: [
        { id: 'percy', name: 'Perseverance rover', icon: '🚙', clues: ['Six wheels on a rocker-bogie', 'Nuclear power source (no solar panels)', 'Arm with a coring drill'], fact: 'Perseverance drills rock cores and seals them in tubes for a future mission to bring back to Earth.', job: 'mars' },
        { id: 'canadarm', name: 'Canadarm2', icon: '🦾', clues: ['17 m long, 7 joints', 'No wheels or legs', 'Moves end-over-end between fixtures'], fact: 'Canadarm2 on the International Space Station catches cargo spacecraft and can “inchworm” to new places.', job: 'iss' },
        { id: 'glider', name: 'Ocean glider', icon: '🐋', clues: ['No propeller', 'Changes its buoyancy to sink and rise', 'Missions lasting months'], fact: 'Underwater gliders like the Slocum glide on wings while changing buoyancy, using so little energy they can sample the ocean for months.', job: 'ocean' },
        { id: 'davinci', name: 'da Vinci surgical system', icon: '🩺', clues: ['Several thin arms with wrists', '3-D camera', 'Every move made by a human at a console'], fact: 'It is not autonomous: it scales down the surgeon’s hand movements and filters out tremor.', job: 'surgery' },
        { id: 'mower', name: 'Robot lawn mower', icon: '🌱', clues: ['Spinning blades underneath', 'Boundary wire or GPS', 'Rain sensor'], fact: 'Robot lawn mowers cut a little grass often, and head home to charge when it rains.', job: null },
      ],
      jobs: [
        { id: 'mars', label: 'Collect rock samples on Mars', icon: '🔴' },
        { id: 'iss', label: 'Grab spacecraft at the space station', icon: '🛰️' },
        { id: 'ocean', label: 'Measure the ocean for months', icon: '🌊' },
        { id: 'surgery', label: 'Keyhole surgery', icon: '🏥' },
      ],
    },
    solution: { matches: { percy: 'mars', canadarm: 'iss', glider: 'ocean', davinci: 'surgery', mower: null } },
  },
]
