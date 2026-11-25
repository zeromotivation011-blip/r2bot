// lib/kids/sim/robot-spec.ts
// Turns a RobotDesign (lib/kids/robot-design.ts) into PHYSICAL numbers: size,
// mass, where the sensors sit, how fast and strong each drive is, and how each
// drive grips each floor. These tables are the whole "parts matter" lesson,
// so every number is written down here with what it means.
//
// Scale: lib/kids/robot3d.ts builds the robot about 1 unit tall; the sim uses
// metres and a robot about 20 cm across, so the renderer scales the model by
// MODEL_SCALE.

import type { RobotDesign } from '../robot-design'
import type { Surface } from './arena'

export const MODEL_SCALE = 0.25

export interface DriveSpec {
  /** Top wheel/track surface speed at 100 %, m/s. */
  maxSpeed: number
  /** Most force one side's motor can push with, N (the torque limit at the ground). */
  maxForcePerSide: number
  /** How fast the motor can change wheel speed with no load, m/s². */
  wheelAccel: number
  /** Multiplies the floor's grip (tyres < tracks). */
  grip: number
  /** Multiplies the floor's rolling drag (thin wheels sink, tracks spread the load). */
  sinkage: number
  /** 0 = turns freely (two wheels + a caster); 1 = every contact scrubs sideways when turning (skid-steer). */
  scrub: number
  /** Wheel radius in metres, for the encoders and the renderer's spin. */
  wheelRadius: number
  mass: number
}

export const DRIVES: Record<RobotDesign['drive'], DriveSpec> = {
  // Light and nimble: turns on the spot, but narrow tyres dig into sand. Sinkage is
  // tuned so sand drag (0.24 × 1.45 ≈ 0.35 × load) sits just under sand grip (0.38 × load),
  // and wheels plough harder the faster they go (SURFACES.sand.wheelSpeedDrag): in sand a
  // two-wheeler crawls a couple of cm a second with its wheels spinning hard.
  wheels2: { maxSpeed: 0.42, maxForcePerSide: 3.2, wheelAccel: 3, grip: 1, sinkage: 1.45, scrub: 0.05, wheelRadius: 0.05, mass: 0.25 },
  // Fast and stable; four tyres share the load a bit better but must skid to turn.
  wheels4: { maxSpeed: 0.46, maxForcePerSide: 3.6, wheelAccel: 3, grip: 1.05, sinkage: 1.6, scrub: 0.55, wheelRadius: 0.0425, mass: 0.4 },
  // Slower, heavier, grips everything; turning scrubs a lot.
  tracks: { maxSpeed: 0.3, maxForcePerSide: 4.5, wheelAccel: 2.5, grip: 1.6, sinkage: 0.35, scrub: 0.8, wheelRadius: 0.035, mass: 0.6 },
  // Approximated as a very grippy, slow drive that does not sink and steps over rocks.
  legs: { maxSpeed: 0.17, maxForcePerSide: 4, wheelAccel: 1.5, grip: 1.8, sinkage: 0.3, scrub: 0.6, wheelRadius: 0.04, mass: 0.5 },
}

export interface SurfaceSpec {
  /** Friction coefficient a rubber tyre gets (traction limit = mu × load). */
  mu: number
  /** Rolling drag coefficient (drag = crr × load × sinkage). */
  crr: number
  /** Extra drag on wheels only (rocks catch wheels; legs and tracks step over them). */
  wheelOnlyDrag: number
  /** Wheels only: extra drag per m/s of speed (a wheel ploughing through soft ground). Gives a slow crawl, not a dead stop. */
  wheelSpeedDrag: number
}

export const SURFACES: Record<Surface, SurfaceSpec> = {
  tile: { mu: 0.8, crr: 0.03, wheelOnlyDrag: 0, wheelSpeedDrag: 0 },
  carpet: { mu: 0.9, crr: 0.08, wheelOnlyDrag: 0, wheelSpeedDrag: 0 },
  // Soft: low grip, lots of drag for anything that sinks.
  sand: { mu: 0.38, crr: 0.24, wheelOnlyDrag: 0, wheelSpeedDrag: 1.6 },
  // Almost no grip: you cannot speed up or stop quickly.
  ice: { mu: 0.05, crr: 0.01, wheelOnlyDrag: 0, wheelSpeedDrag: 0 },
  rocks: { mu: 0.75, crr: 0.06, wheelOnlyDrag: 0.45, wheelSpeedDrag: 0 },
}

export interface BodySpec {
  halfWidth: number
  /** Front edge, metres from the centre (positive). */
  front: number
  back: number
  /** Body bottom height and top height above the floor. */
  bottom: number
  top: number
  mass: number
}

// From the BodySpec numbers in robot3d.ts × MODEL_SCALE.
const BODY: Record<RobotDesign['body'], Omit<BodySpec, 'bottom' | 'top'> & { height: number }> = {
  box: { halfWidth: 0.09, front: 0.078, back: -0.078, height: 0.115, mass: 0.9 },
  dome: { halfWidth: 0.105, front: 0.095, back: -0.095, height: 0.08, mass: 0.7 },
  tall: { halfWidth: 0.073, front: 0.068, back: -0.068, height: 0.195, mass: 1.1 },
  bug: { halfWidth: 0.085, front: 0.105, back: -0.105, height: 0.1, mass: 0.45 },
}

const DRIVE_LIFT: Record<RobotDesign['drive'], number> = { wheels2: 0.05, wheels4: 0.05, tracks: 0.05, legs: 0.085 }

const HEAD_MASS: Record<RobotDesign['head'], number> = { distance: 0.08, camera: 0.12, antenna: 0.05, screen: 0.15 }
const TOOL_MASS: Record<RobotDesign['tool'], number> = { none: 0, gripper: 0.2, scoop: 0.18, pen: 0.05, light: 0.08 }
const SENSOR_MASS: Record<RobotDesign['sensor'], number> = { none: 0, line: 0.03, color: 0.03, bumper: 0.05 }

export interface RobotSpec {
  body: BodySpec
  drive: DriveSpec
  /** Half the distance between the left and right drive contacts. */
  track: number
  mass: number
  /** Centre of mass height. */
  comY: number
  /** Distance sensor origin in robot space (x, y, z) — on the head. */
  eye: [number, number, number]
  /** Floor sensor bar position (z) in robot space and its half width. */
  floorSensorZ: number
  floorSensorHalfWidth: number
  /** Tool tip in robot space (gripper / scoop reach point). */
  toolTip: [number, number, number]
  /** Pen tip in robot space. */
  penTip: [number, number]
}

export function robotSpec(d: RobotDesign): RobotSpec {
  const b = BODY[d.body]
  const lift = DRIVE_LIFT[d.drive]
  const body: BodySpec = { halfWidth: b.halfWidth, front: b.front, back: b.back, bottom: lift, top: lift + b.height, mass: b.mass }
  const drive = DRIVES[d.drive]
  const mass = b.mass + drive.mass + HEAD_MASS[d.head] + TOOL_MASS[d.tool] + SENSOR_MASS[d.sensor]
  return {
    body,
    drive,
    track: b.halfWidth + 0.015,
    mass,
    // A heavy tall body raises the centre of mass a little.
    comY: lift + b.height * 0.35,
    eye: [0, body.top + 0.045, body.front * 0.6],
    floorSensorZ: body.front - 0.01,
    floorSensorHalfWidth: 0.04,
    toolTip: [0, lift + 0.04, body.front + 0.06],
    penTip: [0, body.back + 0.005],
  }
}
