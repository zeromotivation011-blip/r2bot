// STANDALONE app only: /kids/activities became Make It at Home (next.config redirect on the website).
import { AppRedirect } from '@/components/kids/app/AppRedirectClient'

export default function ActivitiesMoved() {
  return <AppRedirect to="/kids/printables/" label="Make It at Home" />
}
