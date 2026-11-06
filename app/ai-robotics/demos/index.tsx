import type { ComponentType } from 'react'
import KnnDemo from './KnnDemo'
import PixelDemo from './PixelDemo'
import GridRlDemo from './GridRlDemo'
import AStarDemo from './AStarDemo'
import FusionDemo from './FusionDemo'

export const DEMOS: Record<string, ComponentType> = {
  'machine-learning-for-robots': KnnDemo,
  'computer-vision-for-robots': PixelDemo,
  'reinforcement-learning-for-robots': GridRlDemo,
  'path-planning': AStarDemo,
  'sensor-fusion': FusionDemo,
}
