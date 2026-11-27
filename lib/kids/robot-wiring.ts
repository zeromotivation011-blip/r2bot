// lib/kids/robot-wiring.ts
// The wires inside the child's robot (roadmap #36, X-ray view), derived from its
// parts: no part, no wire. Pure and tiny, so lib/kids/robot3d.ts can draw them
// without pulling mission data into every 3D view. Signal words: robot-growth.ts.

import { getPart, getUpgrade, upgradesOf, type RobotDesign } from './robot-design'


/** Inside parts the X-ray shows. Anchors with the same ids are placed by lib/kids/robot3d.ts. */
export type ComponentId = 'battery' | 'brain' | 'driver' | 'motorL' | 'motorR' | 'head' | 'sensor' | 'sensor2' | 'tool' | 'arm' | 'solar'

/** power = red, motor = orange, sense = cyan (into the brain), command = green (out of the brain). */
export type WireKind = 'power' | 'motor' | 'sense' | 'command'

export const WIRE_COLOR: Record<WireKind, string> = {
  power: '#EF4444',
  motor: '#FC6818',
  sense: '#00E5FF',
  command: '#22C55E',
}

export const WIRE_KIND_LABEL: Record<WireKind, string> = {
  power: 'Power (red)',
  motor: 'Motor power (orange)',
  sense: 'Sensor signal (cyan)',
  command: 'Brain command (green)',
}

export interface WireSpec {
  id: string
  from: ComponentId
  to: ComponentId
  kind: WireKind
  /** Child words: "Distance sensor → brain". */
  label: string
}

export const COMPONENT_LABEL: Record<ComponentId, string> = {
  battery: 'Battery',
  brain: 'Brain board',
  driver: 'Motor driver',
  motorL: 'Left motor',
  motorR: 'Right motor',
  head: 'Head',
  sensor: 'Floor sensor',
  sensor2: '2nd sensor',
  tool: 'Tool',
  arm: 'Arm',
  solar: 'Solar panel',
}

/** The wires inside this robot, derived from its parts (no part, no wire). */
export function wiringOf(d: RobotDesign): WireSpec[] {
  const up = upgradesOf(d)
  const w: WireSpec[] = []
  const wire = (from: ComponentId, to: ComponentId, kind: WireKind, label: string) => w.push({ id: `${from}-${to}`, from, to, kind, label })
  if (up.power === 'solar') wire('solar', 'battery', 'power', 'Solar panel → battery')
  wire('battery', 'brain', 'power', 'Battery → brain')
  wire('battery', 'driver', 'power', 'Battery → motor driver')
  wire('brain', 'driver', 'command', 'Brain → motor driver')
  wire('driver', 'motorL', 'motor', 'Motor driver → left motor')
  wire('driver', 'motorR', 'motor', 'Motor driver → right motor')
  const head = getPart('head', d.head)
  if (d.head === 'distance' || d.head === 'camera') wire('head', 'brain', 'sense', `${head?.name ?? 'Head'} → brain`)
  else if (d.head === 'antenna') wire('head', 'brain', 'sense', 'Radio antenna → brain')
  else if (d.head === 'screen') wire('brain', 'head', 'command', 'Brain → face screen')
  if (d.sensor !== 'none') wire('sensor', 'brain', 'sense', `${getPart('sensor', d.sensor)?.name ?? 'Floor sensor'} → brain`)
  if (up.sensor2 !== 'none') wire('sensor2', 'brain', 'sense', `${getUpgrade('sensor2', up.sensor2)?.name ?? '2nd sensor'} → brain`)
  if (d.tool !== 'none') wire('brain', 'tool', 'command', `Brain → ${getPart('tool', d.tool)?.name.toLowerCase() ?? 'tool'}`)
  if (up.arm !== 'none') wire('brain', 'arm', 'command', `Brain → ${up.arm === 'arm3' ? 'three' : 'two'} arm joints`)
  return w
}

