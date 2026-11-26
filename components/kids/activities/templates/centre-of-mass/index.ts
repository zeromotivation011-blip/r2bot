// components/kids/activities/templates/centre-of-mass/index.ts
import type { TemplateDef } from '@/lib/kids/activities/types'
import { logic, type Answer, type Params } from './logic'
import Component from './CentreOfMassClient'

export type { Answer, Params } from './logic'

export const template: TemplateDef<Params, Answer> = { ...logic, Component }
