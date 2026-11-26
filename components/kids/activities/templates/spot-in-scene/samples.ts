// components/kids/activities/templates/spot-in-scene/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'world-spot-robots-at-home',
    title: 'Robots hiding at home',
    track: 'world',
    band: 'explorers',
    template: 'spot-in-scene',
    difficulty: 1,
    intro: 'Two robots are hiding in this house! A robot can sense, think and move all by itself. Tap the robots.',
    takeaway: 'A robot is a machine that senses, thinks and acts by itself. Pets and toys don’t count!',
    realWorld: 'Millions of homes already have a robot vacuum or a robot lawn mower.',
    params: {
      prompt: 'Find the 2 robots.',
      backdrop: 'home',
      decor: [{ icon: '🛋️', x: 30, y: 44, size: 18 }],
      objects: [
        { id: 'vac', icon: 'svg:vacuum', x: 18, y: 56, size: 9, label: 'Robot vacuum', target: true, fact: 'It senses walls, decides where to clean next, and drives itself — a real robot!' },
        { id: 'mower', icon: 'svg:mower', x: 84, y: 54, size: 10, label: 'Robot lawn mower', target: true, fact: 'It drives around the garden by itself, cutting the grass a little every day.' },
        { id: 'teddy', icon: '🧸', x: 47, y: 52, size: 8, label: 'Teddy bear', target: false, fact: 'a teddy is lovely, but it can’t sense, think or move by itself.' },
        { id: 'cat', icon: '🐈', x: 62, y: 55, size: 9, label: 'Cat', target: false, fact: 'a cat senses, thinks and moves — but it is an animal, not a machine!' },
        { id: 'tv', icon: '📺', x: 50, y: 24, size: 10, label: 'TV', target: false, fact: 'a TV shows pictures, but it can’t move or do jobs by itself.' },
        { id: 'clock', icon: '⏰', x: 14, y: 18, size: 7, label: 'Clock', target: false, fact: 'a clock ticks along, but it doesn’t sense anything or make decisions.' },
      ],
    },
    solution: { found: ['vac', 'mower'] },
  },
  {
    id: 'world-spot-warehouse-hazards',
    title: 'Hazards for a warehouse robot',
    track: 'sensors',
    band: 'inventors',
    template: 'spot-in-scene',
    difficulty: 3,
    intro: 'You are the safety engineer. Find everything this warehouse robot must slow down or stop for. Careful: only 2 wrong taps allowed.',
    takeaway: 'Mobile robots watch for people, vehicles, spills and things in their path — and slow down or stop for each.',
    realWorld: 'Warehouse robots carry laser scanners with protective zones: if anything enters the zone, they slow down or stop automatically.',
    params: {
      prompt: 'Find the 4 hazards in the robot’s way.',
      backdrop: 'warehouse',
      decor: [{ icon: 'svg:amr', x: 12, y: 52, size: 12 }],
      maxWrongTaps: 2,
      objects: [
        { id: 'spill', icon: '💧', x: 32, y: 54, size: 7, label: 'Spilled liquid', target: true, fact: 'Liquid makes wheels slip, and shiny puddles can confuse sensors — stop and report it.' },
        { id: 'person', icon: '🚶', x: 58, y: 46, size: 10, label: 'Person walking', target: true, fact: 'People always come first: robots slow down and stop when someone enters their safety zone.' },
        { id: 'box', icon: '📦', x: 45, y: 56, size: 7, label: 'Fallen box', target: true, fact: 'A box in the aisle blocks the path — the robot must detect it and plan around it.' },
        { id: 'forklift', icon: 'svg:forklift', x: 80, y: 50, size: 11, label: 'Forklift', target: true, fact: 'Forklifts are big, heavy and fast; robots must keep well clear of them.' },
        { id: 'shelf', icon: 'svg:shelf', x: 30, y: 22, size: 10, label: 'Boxes on a shelf', target: false, fact: 'boxes stored neatly on a shelf are out of the robot’s way.' },
        { id: 'dock', icon: 'svg:dock', x: 88, y: 20, size: 9, label: 'Charging dock', target: false, fact: 'the dock is where the robot recharges — it is meant to drive there.' },
        { id: 'arrow', icon: '⬆️', x: 66, y: 20, size: 7, label: 'Floor marking', target: false, fact: 'painted markings help robots and people know where to go.' },
        { id: 'ext', icon: '🧯', x: 6, y: 30, size: 7, label: 'Fire extinguisher', target: false, fact: 'it hangs on the wall: safety equipment, not an obstacle.' },
      ],
    },
    solution: { found: ['spill', 'person', 'box', 'forklift'], wrongTaps: 0 },
  },
  {
    id: 'sensors-spot-self-driving-car',
    title: 'Name every sensor on a self-driving car',
    track: 'sensors',
    band: 'engineers',
    template: 'spot-in-scene',
    difficulty: 5,
    intro: 'A self-driving car combines several kinds of sensors so each covers the others’ blind spots. Find all five sensors and name each one. Two wrong taps allowed.',
    takeaway: 'Sensor fusion: lidar gives precise 3-D shape, cameras read colour and signs, radar sees speed through rain and fog, ultrasonic covers the last metre.',
    realWorld: 'Robotaxis combine lidar, cameras and radar; most ordinary cars already carry radar and ultrasonic parking sensors.',
    params: {
      prompt: 'Find the 5 sensors, then label each one.',
      backdrop: 'street',
      decor: [{ icon: 'svg:car', x: 50, y: 40, size: 64 }],
      maxWrongTaps: 2,
      kinds: [
        { id: 'lidar', label: 'Lidar' },
        { id: 'camera', label: 'Camera' },
        { id: 'radar', label: 'Radar' },
        { id: 'ultrasonic', label: 'Ultrasonic' },
      ],
      objects: [
        { id: 'roof', icon: 'svg:lidar', x: 48, y: 15, size: 8, label: 'Roof unit', target: true, kind: 'lidar', fact: 'the spinning roof unit fires laser pulses and times their echoes to build a 3-D point map.' },
        { id: 'wind', icon: 'svg:camera', x: 62, y: 25, size: 6, label: 'Behind the windscreen', target: true, kind: 'camera', fact: 'it reads traffic lights, signs and lane lines — things only colour vision can see.' },
        { id: 'side', icon: 'svg:camera', x: 36, y: 25, size: 6, label: 'Side pillar', target: true, kind: 'camera', fact: 'cameras on the sides watch the next lanes and the blind spot.' },
        { id: 'grille', icon: 'svg:radar', x: 82, y: 44, size: 7, label: 'Front bumper', target: true, kind: 'radar', fact: 'radar measures the distance AND speed of cars ahead (Doppler), even in fog and heavy rain.' },
        { id: 'rear', icon: 'svg:ultrasonic', x: 17, y: 44, size: 6, label: 'Rear bumper dots', target: true, kind: 'ultrasonic', fact: 'small ultrasonic sensors ping sound off nearby objects — perfect for the last metre when parking.' },
        { id: 'lamp', icon: '💡', x: 86, y: 34, size: 6, label: 'Headlight', target: false, fact: 'a headlight makes light; it doesn’t measure anything.' },
        { id: 'port', icon: '⚡', x: 22, y: 33, size: 6, label: 'Charging port', target: false, fact: 'the charging port fills the battery — it doesn’t sense the world.' },
        { id: 'tyre', icon: '🛞', x: 70, y: 54, size: 8, label: 'Tyre', target: false, fact: 'the tyre grips the road; it is not a sensor.' },
      ],
    },
    solution: {
      found: ['roof', 'wind', 'side', 'grille', 'rear'],
      labels: { roof: 'lidar', wind: 'camera', side: 'camera', grille: 'radar', rear: 'ultrasonic' },
      wrongTaps: 0,
    },
  },
]
