import type { Metadata } from 'next'
import SimulatorWrapper from './SimulatorWrapper'

export const runtime = 'nodejs'

export const metadata: Metadata = {
  title: 'Robot Simulator — R2BOT Schools',
  description: 'Browser-based robot simulator. Drive, sense, sort — no hardware needed.',
}

export default function SimulatePage() {
  return <SimulatorWrapper />
}
