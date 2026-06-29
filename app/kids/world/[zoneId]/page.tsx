import ZoneWrapper from './ZoneWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'Zone — Robot World',
  description: 'A robotics zone with levels and a boss challenge.',
}

export default function ZonePage() {
  return <ZoneWrapper />
}
