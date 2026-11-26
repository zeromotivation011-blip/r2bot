import MyRobotWrapper from './MyRobotWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'My Robot — Robot World',
  description: 'Customize your very own robot built from parts you earn.',
  // Client-rendered Robot World screens: /kids/world is the indexed entry.
  robots: { index: false, follow: true },
}

export default function MyRobotPage() {
  return <MyRobotWrapper />
}
