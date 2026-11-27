// components/kids/net/net-activities.ts
// The Skill Galaxy activities of roadmap #88 (Robot Guardians, connected robots
// and cybersecurity), by id. Server-side only (it reads the content file).
// Pages look each id up in the live activity index, so an activity is linked
// only once lib/kids/activities/content/zones/index.ts registers the file.

import { guardiansNet } from '@/lib/kids/activities/content/zones/guardians-net'

export const NET_ACTIVITY_IDS: readonly string[] = guardiansNet.map((a) => a.id)
