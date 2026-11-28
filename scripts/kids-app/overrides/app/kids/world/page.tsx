// STANDALONE app only: /kids/world became the Spark Trail (next.config redirect on the website).
import { AppRedirect } from '@/components/kids/app/AppRedirectClient'

export default function WorldMoved() {
  return <AppRedirect to="/kids/spark-trail/" label="the Spark Trail" />
}
