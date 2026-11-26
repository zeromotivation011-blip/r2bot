// lib/kids/activities/content/zones/index.ts
// Activities that belong to a Universe world (lib/kids/universe/worlds.ts WORLDS).
// Each file is owned by that world's author; every activity carries `world: '<id>'`
// and one of the ten galaxy tracks, so it also appears in the Skill Galaxy.

import type { WorldId } from '../../../universe/worlds'
import { guardians } from './guardians'
import { ocean } from './ocean'
import { zoo } from './zoo'
import { hospital } from './hospital'
import { farm } from './farm'
import { city } from './city'
import { station } from './station'

export const ZONE_FILES: Record<WorldId, readonly unknown[]> = { guardians, ocean, zoo, hospital, farm, city, station }
