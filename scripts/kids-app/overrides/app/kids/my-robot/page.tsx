// STANDALONE app only: /kids/my-robot moved into the Garage (next.config redirect on the website).
import { AppRedirect } from '@/components/kids/app/AppRedirectClient'

export default function MyRobotMoved() {
  return <AppRedirect to="/kids/hangar/" label="your Garage" />
}
