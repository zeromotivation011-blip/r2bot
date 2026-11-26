// components/kids/activities/templates/robot-designer/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

const ABILITIES: Record<string, string> = {
  grip: 'Pick things up',
  'see-obstacles': 'See obstacles before touching them',
  'feel-bumps': 'Feel a bump',
  'see-plants': 'Recognise plants',
  'remove-weeds': 'Remove weeds',
  gps: 'Know where it is outdoors',
  waterproof: 'Work in the rain',
  light: 'Work in the dark',
}

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'design-beach-cleaner',
    title: 'Build a beach-cleaning robot',
    track: 'design',
    band: 'explorers',
    template: 'robot-designer',
    difficulty: 1,
    intro: 'The beach is full of litter! Build a robot that can drive on soft sand and pick up rubbish. Choose its wheels and its tool.',
    takeaway: 'Engineers choose every part for the job: wide wheels for soft sand, a gripper for picking things up.',
    realWorld: 'Beach-cleaning robots really exist — they use wide tyres or tracks so they don’t sink in the sand.',
    params: {
      brief: 'Drive on soft sand and pick up litter.',
      terrain: 'sand',
      terrainLabel: 'Soft sand',
      budget: 100,
      builtInBatteryWh: 60,
      requires: ['grip'],
      abilityLabels: ABILITIES,
      slots: [
        {
          id: 'drive',
          label: 'Wheels',
          parts: [
            { id: 'thin', name: 'Thin wheels', icon: '🛞', cost: 20, massKg: 1, powerW: 10, payloadKg: 10, terrains: ['floor', 'road'], note: 'Thin wheels sink into soft sand.' },
            { id: 'balloon', name: 'Fat balloon tyres', icon: '🎈', cost: 30, massKg: 1.5, powerW: 12, payloadKg: 10, terrains: ['sand', 'floor', 'road'], note: 'Wide, soft tyres spread the weight so they float on sand.' },
          ],
        },
        {
          id: 'tool',
          label: 'Tool',
          parts: [
            { id: 'gripper', name: 'Grabber claw', icon: '🦾', cost: 25, massKg: 0.8, powerW: 5, gives: ['grip'], note: 'Closes its fingers around an object.' },
            { id: 'horn', name: 'Loud horn', icon: '📯', cost: 10, massKg: 0.3, powerW: 2, note: 'Very loud — but it can’t pick anything up.' },
          ],
        },
      ],
    },
    solution: { parts: ['balloon', 'gripper'] },
  },
  {
    id: 'design-night-security-rover',
    title: 'A rover for the night shift',
    track: 'design',
    band: 'builders',
    template: 'robot-designer',
    difficulty: 3,
    intro: 'A school wants a robot that patrols the car park at night for 2 hours, sees obstacles in the dark, and keeps working in the rain. You have 250 coins.',
    takeaway: 'Every part uses battery power. Runtime = battery energy ÷ power used. Bigger batteries cost more.',
    realWorld: 'Security patrol robots carry lights, cameras and obstacle sensors, and drive themselves back to a charger when the battery runs low.',
    params: {
      brief: 'Patrol a car park at night for 2 hours, in any weather.',
      terrain: 'road',
      terrainLabel: 'Tarmac car park',
      budget: 250,
      minRuntimeMin: 120,
      requires: ['see-obstacles', 'light', 'waterproof'],
      abilityLabels: ABILITIES,
      slots: [
        {
          id: 'body',
          label: 'Body',
          parts: [
            { id: 'open', name: 'Open frame', icon: '🔲', cost: 20, massKg: 2, powerW: 0, note: 'Light and cheap, but rain gets in.' },
            { id: 'sealed', name: 'Sealed shell', icon: '🛡️', cost: 50, massKg: 3, powerW: 0, gives: ['waterproof'], note: 'Rubber seals keep water out of the electronics.' },
          ],
        },
        {
          id: 'drive',
          label: 'Drive',
          parts: [
            { id: 'wheels4', name: '4 wheels', icon: '🛞', cost: 40, massKg: 3, powerW: 30, payloadKg: 25, terrains: ['road', 'floor'] },
            { id: 'legs', name: 'Robot legs', icon: '🦿', cost: 150, massKg: 6, powerW: 90, payloadKg: 30, terrains: ['road', 'floor', 'stairs', 'grass'], note: 'Legs can climb, but walking uses lots of energy.' },
          ],
        },
        {
          id: 'battery',
          label: 'Battery',
          parts: [
            { id: 'b50', name: 'Small battery (50 Wh)', icon: '🔋', cost: 20, massKg: 0.4, powerW: 0, energyWh: 50 },
            { id: 'b100', name: 'Medium battery (100 Wh)', icon: '🔋', cost: 40, massKg: 0.8, powerW: 0, energyWh: 100 },
            { id: 'b200', name: 'Big battery (200 Wh)', icon: '🔋', cost: 80, massKg: 1.6, powerW: 0, energyWh: 200 },
          ],
        },
        {
          id: 'sensors',
          label: 'Sensors',
          min: 1,
          max: 2,
          parts: [
            { id: 'camera', name: 'Camera', icon: '📷', cost: 30, massKg: 0.1, powerW: 3, gives: ['see-obstacles'], note: 'Sees well — when there is light.' },
            { id: 'lamp', name: 'LED headlights', icon: '🔦', cost: 15, massKg: 0.2, powerW: 10, gives: ['light'] },
            { id: 'bumper', name: 'Bump switch', icon: '🔘', cost: 5, massKg: 0.1, powerW: 0, gives: ['feel-bumps'], note: 'Detects obstacles by touch — only once it has already hit them.' },
          ],
        },
      ],
    },
    // 3 + 10 + 30 = 43 W; 100 Wh ÷ 43 W × 60 ≈ 139 min. Cost 50 + 40 + 40 + 30 + 15 = 175.
    solution: { parts: ['sealed', 'wheels4', 'b100', 'camera', 'lamp'] },
  },
  {
    id: 'design-mud-weeding-robot',
    title: 'Weeding robot for muddy fields',
    track: 'design',
    band: 'engineers',
    template: 'robot-designer',
    difficulty: 5,
    intro: 'A farm needs a weeding robot: muddy fields, a 4-hour shift, under 40 kg so it doesn’t squash the soil, and 950 coins. It must navigate, recognise plants and remove weeds. Gauges are off — reason it out, then test.',
    takeaway: 'Every requirement pulls against another: tracks handle mud but weigh more; a bigger battery adds mass. Engineering is finding a design that satisfies all of them.',
    realWorld: 'Real field robots are kept light because heavy machines compact the soil and harm crops; many carry cameras plus satellite navigation accurate to a few centimetres (RTK GPS).',
    params: {
      brief: 'Weed a muddy field for 4 hours. Max 40 kg, 950 coins.',
      terrain: 'mud',
      terrainLabel: 'Wet mud',
      budget: 950,
      maxMassKg: 40,
      minRuntimeMin: 240,
      requires: ['gps', 'see-plants', 'remove-weeds', 'waterproof'],
      abilityLabels: ABILITIES,
      liveGauges: false,
      slots: [
        {
          id: 'drive',
          label: 'Drive',
          parts: [
            { id: 'wheels', name: 'Narrow wheels', icon: '🛞', cost: 120, massKg: 8, powerW: 80, payloadKg: 45, terrains: ['road', 'grass'], note: 'Narrow wheels dig ruts and get stuck in mud.' },
            { id: 'tracks', name: 'Rubber tracks', icon: '⛓️', cost: 260, massKg: 14, powerW: 120, payloadKg: 60, terrains: ['mud', 'sand', 'grass'], note: 'Tracks spread the weight over a big area.' },
            { id: 'wide', name: 'Wide flotation tyres', icon: '🚜', cost: 200, massKg: 11, powerW: 100, payloadKg: 38, terrains: ['mud', 'grass', 'sand'], note: 'Good in mud, but a lower payload rating.' },
          ],
        },
        {
          id: 'battery',
          label: 'Battery',
          parts: [
            { id: 'b500', name: '500 Wh pack', icon: '🔋', cost: 100, massKg: 3.5, powerW: 0, energyWh: 500 },
            { id: 'b1000', name: '1 kWh pack', icon: '🔋', cost: 190, massKg: 7, powerW: 0, energyWh: 1000 },
            { id: 'b1500', name: '1.5 kWh pack', icon: '🔋', cost: 280, massKg: 10.5, powerW: 0, energyWh: 1500 },
          ],
        },
        {
          id: 'brain',
          label: 'Computer',
          parts: [
            { id: 'micro', name: 'Microcontroller', icon: '🔲', cost: 20, massKg: 0.1, powerW: 1, note: 'Too small to run a plant-recognition neural network.' },
            { id: 'ai', name: 'AI computer + camera', icon: '🧠', cost: 250, massKg: 1.5, powerW: 25, gives: ['see-plants'], note: 'Runs a neural network that tells crops from weeds.' },
          ],
        },
        {
          id: 'nav',
          label: 'Navigation',
          parts: [
            { id: 'rtk', name: 'RTK GPS', icon: '🛰️', cost: 150, massKg: 0.5, powerW: 4, gives: ['gps'], note: 'Satellite positioning to about 2 cm.' },
            { id: 'odometry', name: 'Wheel counters only', icon: '🔢', cost: 10, massKg: 0.1, powerW: 0.5, note: 'Counts wheel turns — drifts badly when wheels slip in mud.' },
          ],
        },
        {
          id: 'tool',
          label: 'Weeding tool',
          parts: [
            { id: 'hoe', name: 'Robotic hoe', icon: '⛏️', cost: 90, massKg: 6, powerW: 15, gives: ['remove-weeds'], note: 'A small blade that cuts weeds just below the soil.' },
            { id: 'laser', name: 'Weeding laser', icon: '🔆', cost: 400, massKg: 9, powerW: 150, gives: ['remove-weeds'], note: 'Burns weeds with no chemicals — but very power hungry.' },
          ],
        },
        {
          id: 'shell',
          label: 'Weatherproofing',
          min: 0,
          max: 1,
          parts: [{ id: 'ip67', name: 'IP67 sealing kit', icon: '🛡️', cost: 40, massKg: 1, powerW: 0, gives: ['waterproof'], note: 'IP67 = dust-tight and survives being dunked in water.' }],
        },
      ],
    },
    // The one design that fits: wide tyres (mud-capable, 38 kg payload ≥ 27 kg) + 1 kWh
    // (1000 Wh ÷ 144 W × 60 ≈ 417 min) + AI camera + RTK GPS + hoe (the laser blows the
    // budget) + IP67. Cost 920/950. Tracks would push it to 980 coins.
    solution: { parts: ['wide', 'b1000', 'ai', 'rtk', 'hoe', 'ip67'] },
  },
]
