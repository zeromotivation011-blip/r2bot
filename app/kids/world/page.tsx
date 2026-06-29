import WorldMapWrapper from './WorldMapWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'Robot World Map — R2BOT for Kids',
  description: '6 robotics zones, 14 levels, a robot to build. Pick where to explore next!',
}

export default function WorldPage() {
  return <WorldMapWrapper />
}
