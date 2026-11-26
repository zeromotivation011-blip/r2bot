// components/kids/activities/templates/motor-math/index.ts
import type { TemplateDef } from '@/lib/kids/activities/types'
import { logic, type Answer, type Params } from './logic'
import Component from './MotorMathClient'

export type { Answer, Params } from './logic'

export const template: TemplateDef<Params, Answer> = { ...logic, Component }
