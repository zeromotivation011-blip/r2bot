// components/kids/activities/templates/simple-machines/index.ts
import type { TemplateDef } from '@/lib/kids/activities/types'
import { logic, type Answer, type Params } from './logic'
import Component from './SimpleMachinesClient'

export type { Answer, Params } from './logic'

export const template: TemplateDef<Params, Answer> = { ...logic, Component }
