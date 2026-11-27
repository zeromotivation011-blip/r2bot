// app/kids/my-robot — retired 27 Nov 2026 (roadmap #7, "one robot, one Garage").
// The robot card, name and Spark Trail parts now live in the Hangar. The
// permanent redirect belongs in next.config.mjs; this page is the fallback so
// an old link still lands in the right place (308) until that is in.

import { permanentRedirect } from 'next/navigation'

export default function MyRobotPage(): never {
  permanentRedirect('/kids/hangar')
}
