import MyRobotWrapper from './MyRobotWrapper'

export const runtime = 'nodejs'

export const metadata = {
  title: 'My Robot — Robot World',
  description: 'Customize your very own robot built from parts you earn.',
}

export default function MyRobotPage() {
  return <MyRobotWrapper />
}
