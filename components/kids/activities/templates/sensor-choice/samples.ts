// components/kids/activities/templates/sensor-choice/samples.ts
// Three reference activities (easy → hard). validate() is empty and
// check(solution) is correct for each.

import type { Activity } from '@/lib/kids/activities/types'
import type { Answer, Params } from './logic'

export const samples: Activity<Params, Answer>[] = [
  {
    id: 'sense-choice-night-garden',
    title: 'Spark’s night-time garden walk',
    track: 'sensors',
    band: 'explorers',
    template: 'sensor-choice',
    difficulty: 1,
    intro: 'It is dark in the garden! Spark must follow the path line and stop before the wall. Pick two sensors that work in the dark.',
    takeaway: 'Cameras need light. Sensors that shine their own light or use sound still work in the dark.',
    realWorld: 'Robot lawnmowers and warehouse robots work at night using sensors that bring their own light or sound.',
    params: {
      mission: 'Night garden walk',
      conditions: ['dark'],
      needs: [
        { capability: 'line', label: 'Follow the path line' },
        { capability: 'distance-near', label: 'Stop before the wall' },
      ],
      available: ['camera', 'line', 'ultrasonic', 'light'],
      maxSensors: 2,
      showCapabilities: true,
    },
    solution: { sensors: ['line', 'ultrasonic'] },
    badges: ['wall-whisperer'],
  },
  {
    id: 'sense-choice-hotel-delivery',
    title: 'Hotel delivery robot',
    track: 'sensors',
    band: 'builders',
    template: 'sensor-choice',
    difficulty: 3,
    intro: 'Deliver towels in a hotel: steer down the corridor, find the room by counting metres, and stop for the glass door and the curtains. Only four sensors fit!',
    takeaway: 'Each sensor has a weakness. Light-based sensors miss glass; sound-based ones miss soft curtains. Pick the one each moment needs.',
    realWorld: 'Hotel and hospital delivery robots carry several kinds of distance sensor so one sensor’s blind spot is another’s strength.',
    params: {
      mission: 'Towel delivery',
      conditions: ['indoor'],
      needs: [
        { capability: 'heading', label: 'Drive straight down the corridor' },
        { capability: 'distance-travelled', label: 'Stop after 12 metres at room 12' },
        { capability: 'distance-near', label: 'Stop at the glass door', conditions: ['glass'] },
        { capability: 'distance-near', label: 'Stop at the soft curtain', conditions: ['soft'] },
      ],
      available: ['gps', 'imu', 'encoder', 'ultrasonic', 'ir-distance', 'lidar', 'bump'],
      maxSensors: 4,
      showCapabilities: true,
    },
    solution: { sensors: ['imu', 'encoder', 'ultrasonic', 'ir-distance'] },
    badges: ['right-tool'],
    after: ['sense-choice-night-garden'],
  },
  {
    id: 'sense-choice-fire-rescue',
    title: 'Firefighting scout on a budget',
    track: 'sensors',
    band: 'engineers',
    template: 'sensor-choice',
    difficulty: 4,
    intro: 'A smoke-filled warehouse. Your scout must map the walls, find a person by body heat, report its tilt on the rubble — for 30 credits. Choose the cheapest set that works.',
    takeaway: 'Smoke blinds cameras and lasers but not sound or heat. Engineers choose sensors for the conditions first, then for cost.',
    realWorld: 'Firefighting robots use thermal cameras and radar or sonar, because smoke makes ordinary cameras and LiDAR almost useless.',
    params: {
      mission: 'Warehouse fire scout',
      conditions: ['dark', 'smoke', 'indoor'],
      needs: [
        { capability: 'distance-far', label: 'Avoid shelves 3 m ahead' },
        { capability: 'heat', label: 'Find the person by body heat' },
        { capability: 'tilt', label: 'Warn before tipping on rubble' },
        { capability: 'touch', label: 'Know when it touches debris' },
      ],
      available: ['camera', 'lidar', 'ultrasonic', 'ir-distance', 'thermal', 'imu', 'bump', 'gps'],
      maxSensors: 4,
      budget: 30,
      cheapestOnly: true,
      showCapabilities: false,
      noExtras: true,
    },
    solution: { sensors: ['ultrasonic', 'thermal', 'imu', 'bump'] },
    badges: ['right-tool'],
  },
]
