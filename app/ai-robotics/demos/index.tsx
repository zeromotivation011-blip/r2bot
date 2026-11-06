import type { ComponentType } from 'react'
import KnnDemo from './KnnDemo'
import PixelDemo from './PixelDemo'
import GridRlDemo from './GridRlDemo'
import AStarDemo from './AStarDemo'
import FusionDemo from './FusionDemo'
import LlmDemo from './LlmDemo'
import SafetyDemo from './SafetyDemo'
import ImitationDemo from './ImitationDemo'
import EdgeDemo from './EdgeDemo'
import SlamDemo from './SlamDemo'

export const DEMOS: Record<string, ComponentType> = {
  'machine-learning-for-robots': KnnDemo,
  'computer-vision-for-robots': PixelDemo,
  'reinforcement-learning-for-robots': GridRlDemo,
  'path-planning': AStarDemo,
  'sensor-fusion': FusionDemo,
  'large-language-models-and-robots': LlmDemo,
  'safety-and-ai-limits': SafetyDemo,
  'imitation-learning': ImitationDemo,
  'edge-ai-on-small-robots': EdgeDemo,
  'slam-and-navigation': SlamDemo,
}
