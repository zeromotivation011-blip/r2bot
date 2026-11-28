// lib/kids/sim/robot-spec.ts
// Turns a RobotDesign (lib/kids/robot-design.ts) into PHYSICAL numbers: size,
// mass, where the sensors sit, how fast and strong each drive is, and how each
// drive grips each floor. These tables are the whole "parts matter" lesson,
// so every number is written down here with what it means.
//
// Scale: lib/kids/robot3d.ts builds the robot about 1 unit tall; the sim uses
// metres and a robot about 20 cm across, so the renderer scales the model by
// MODEL_SCALE.

import { UPGRADE_DEFAULT, upgradesOf, type ArmId, type MotorId, type PowerId, type RobotDesign } from '../robot-design'
import type { Surface } from './arena'
import { electronicsAmps, MOTOR_NO_LOAD_AMPS, MOTOR_STALL_AMPS, packInfo, type PackConfig } from './battery'

export const MODEL_SCALE = 0.25

/**
 * The motors' dead zone, % of full power. A small DC gear motor has to beat the static friction
 * of its gearbox (and the tyres' rolling resistance) before the wheel turns at all: below this
 * command the motor hums but the wheel stays still. Above it the wheel speed follows the command
 * as before. 12 % is a well-matched hobby gear motor and driver (the Level 4 story's motor: humming
 * at 8 %, moving from 12 %); a cheap one with a poor driver can need 20–30 %. Level 4 Session 2
 * measures it ("Find the dead zone", demos.ts). A sagging
 * battery widens it (the motor gets less voltage for the same command), and an arena can set its
 * own (Arena.motorDeadZonePct: a worn motor, a fault).
 */
export const MOTOR_DEAD_ZONE_PCT = 12

export interface DriveSpec {
  /** Top wheel/track surface speed at 100 %, m/s. */
  maxSpeed: number
  /** Most force one side's motor can push with, N (the torque limit at the ground). */
  maxForcePerSide: number
  /**
   * Back-EMF: the push falls linearly with speed and reaches zero at noLoad × maxSpeed (default 1.3).
   * Two-wheel drive is 1.0 with a strong stall force: on the flat it barely matters, while a heavy
   * load uphill settles at a slower speed (Level 1 Session 14 is calibrated on it in verify.ts).
   */
  noLoad?: number
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
  /**
   * Extra current one side's motors draw whenever that side is moving, A, on top of the current
   * for the force it pushes. It is the energy a drive wastes inside itself, which rolling drag
   * does not see. Tracks: the belt bends round the sprockets and rubs the idlers (on hard floors
   * tracked vehicles need noticeably more power than wheels for the same speed). Legs: a walking
   * robot lifts its body and swings its legs every step, and its servos hold it up between steps;
   * a small hobby quadruped with 8 micro servos draws about 0.1 A per servo walking (SG90-class
   * servos: ~0.1–0.25 A moving), so ≈ 0.4 A per side. Wheels waste almost nothing (0).
   */
  moveAmpsPerSide?: number
}

export const DRIVES: Record<RobotDesign['drive'], DriveSpec> = {
  // Light and nimble: turns on the spot, but narrow tyres dig into sand. Sinkage is
  // tuned so sand drag (0.24 × 1.45 ≈ 0.35 × load) sits just under sand grip (0.38 × load),
  // and wheels plough harder the faster they go (SURFACES.sand.wheelSpeedDrag): in sand a
  // two-wheeler crawls a couple of cm a second with its wheels spinning hard.
  wheels2: { maxSpeed: 0.42, maxForcePerSide: 4.4, noLoad: 1, wheelAccel: 3, grip: 1, sinkage: 1.45, scrub: 0.05, wheelRadius: 0.05, mass: 0.25 },
  // Fast and stable; four tyres share the load a bit better but must skid to turn.
  wheels4: { maxSpeed: 0.46, maxForcePerSide: 3.6, wheelAccel: 3, grip: 1.05, sinkage: 1.6, scrub: 0.55, wheelRadius: 0.0425, mass: 0.4 },
  // Slower, heavier, grips everything; turning scrubs a lot.
  tracks: { maxSpeed: 0.3, maxForcePerSide: 4.5, wheelAccel: 2.5, grip: 1.6, sinkage: 0.35, scrub: 0.8, wheelRadius: 0.035, mass: 0.6, moveAmpsPerSide: 0.12 },
  // Approximated as a very grippy, slow drive that does not sink and steps over rocks.
  legs: { maxSpeed: 0.17, maxForcePerSide: 4, wheelAccel: 1.5, grip: 1.8, sinkage: 0.3, scrub: 0.6, wheelRadius: 0.04, mass: 0.5, moveAmpsPerSide: 0.4 },
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
  /**
   * Ploughing drag per side in N per m/s that does NOT grow with weight (the tyre's width
   * pushing sand aside), scaled by the drive's sinkage relative to two wheels. Used by
   * Level 1 soft sand so every body slows to about the same speed.
   */
  plough?: number
}

export const SURFACES: Record<Surface, SurfaceSpec> = {
  tile: { mu: 0.8, crr: 0.03, wheelOnlyDrag: 0, wheelSpeedDrag: 0 },
  carpet: { mu: 0.9, crr: 0.08, wheelOnlyDrag: 0, wheelSpeedDrag: 0 },
  // Soft: low grip, lots of drag for anything that sinks.
  sand: { mu: 0.38, crr: 0.24, wheelOnlyDrag: 0, wheelSpeedDrag: 1.6 },
  // Level 1 beach sand (Session 15): firm enough to grip, soft enough to drag. A two-wheeler at
  // Hop power (80 %) runs at about half its mat speed; it slows, it never stops. Tuned in verify.ts.
  'soft-sand': { mu: 0.75, crr: 0.03, wheelOnlyDrag: 0, wheelSpeedDrag: 0, plough: 15 },
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
  /** How far from the tool tip an object's edge may be and still be grabbed, metres. */
  toolReach: number
  /** Pen tip in robot space: the turning centre (midpoint of the drive axle), so a turn on the spot leaves a dot. */
  penTip: [number, number]
  /** Motor dead zone, % of full power (MOTOR_DEAD_ZONE_PCT): below it the wheels do not turn. */
  deadZonePct: number
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
    // A claw closes just in front of the body; a scoop is a long shovel that reaches into the
    // next Level 1 tile (an object on the tile in front, near edge, about 24 cm from the centre).
    toolTip: [0, lift + 0.04, body.front + (d.tool === 'scoop' ? 0.13 : 0.06)],
    toolReach: d.tool === 'scoop' ? 0.09 : 0.05,
    // The drive wheels sit on the body's centre line, so the turning centre is (0, 0).
    penTip: [0, 0],
    deadZonePct: MOTOR_DEAD_ZONE_PCT,
  }
}

// ── Upgrades in the physics (roadmap #33, #39) ───────────────────────────────
// The Workshop upgrades (lib/kids/robot-design.ts) used to change only the spec
// sheet and the look. These tables put them into the simulator: the Physics Lab
// and the Power Lab drive `fittedSpec(design)`, so a torque motor really pushes
// harder and a big pack really weighs more and lasts longer. The spec sheet
// (lib/kids/robot-growth.ts specSheet) uses the same numbers; robot-growth.verify
// and sim/verify check they agree. Course challenges keep the session's own robot
// without upgrades (arenas/level1.ts sessionDesign), so their calibration holds.

/**
 * Motor gearing. A gearbox trades speed for force: with gear ratio G the wheel turns
 * 1/G as fast and pushes G times as hard, so speed × strength stays about 1 (speedy
 * 1.4 × 0.7 = 0.98, torque 0.7 × 1.6 = 1.12: the torque motor is also a bit bigger).
 * Brushless motors are more powerful AND more efficient for their size (1.3 × 1.3).
 */
export const MOTOR_GEARING: Record<MotorId, { speed: number; strength: number; massDelta: number }> = {
  gear: { speed: 1, strength: 1, massDelta: 0 },
  speedy: { speed: 1.4, strength: 0.7, massDelta: 0 },
  torque: { speed: 0.7, strength: 1.6, massDelta: 0.04 },
  brushless: { speed: 1.3, strength: 1.3, massDelta: 0.02 },
}

/**
 * The battery each power upgrade IS, as a pack the battery model runs.
 *   aa:      4 × NiMH AA in series: 4 × 1.2 V = 4.8 V, 2000 mAh (9.6 Wh)
 *   lipo:    2S LiPo: 2 × 3.7 V = 7.4 V, 2200 mAh (16.3 Wh)
 *   bigpack: 3S LiPo of 5000 mAh cells: 3 × 3.7 V = 11.1 V, 5000 mAh (55.5 Wh)
 *   solar:   the 2S LiPo; the panel is on top (no sun in the indoor arenas)
 */
export const POWER_PACKS: Record<PowerId, PackConfig> = {
  aa: { cell: 'nimh', series: 4, parallel: 1 },
  lipo: { cell: 'lipo', series: 2, parallel: 1 },
  bigpack: { cell: 'lipo', series: 3, parallel: 1, cellMah: 5000 },
  solar: { cell: 'lipo', series: 2, parallel: 1 },
}

/** Extra mass over the AA box, kg (the body mass already holds a 4 × AA box). */
export const POWER_MASS_DELTA: Record<PowerId, number> = { aa: 0, lipo: -0.04, bigpack: 0.28, solar: 0.04 }

/** A jointed arm's mass, kg (servos + links). */
export const ARM_MASS: Record<ArmId, number> = { none: 0, arm2: 0.15, arm3: 0.22 }

/**
 * Above this many kg per unit of motor strength a small DC motor is overloaded: it runs further
 * down its torque–speed line (speed falls as the load torque rises), so the top speed drops in
 * proportion. Same rule as the spec sheet's top speed.
 */
export const OVERLOAD_KG_PER_STRENGTH = 1.6

/** The pack this robot carries (its power upgrade). */
export function powerPack(d: RobotDesign): PackConfig {
  return { ...(POWER_PACKS[upgradesOf(d).power] ?? POWER_PACKS.aa) }
}

/** True when the design has no upgrade that changes the physics (the starter robot). */
export function hasPhysicsUpgrades(d: RobotDesign): boolean {
  const up = upgradesOf(d)
  return up.power !== UPGRADE_DEFAULT.power || up.motor !== UPGRADE_DEFAULT.motor || up.sensor2 !== UPGRADE_DEFAULT.sensor2 || up.arm !== UPGRADE_DEFAULT.arm
}

/**
 * The robot as the simulator drives it, upgrades included: mass (pack, motors, 2nd sensor,
 * arm), top speed and push (motor gearing, overload). A World form (drone, sub, humanoid)
 * is not a ground robot: the ground arenas keep its base drive, so `chassis` is ignored here.
 * With no upgrades fitted this is exactly robotSpec(d).
 */
export function fittedSpec(d: RobotDesign): RobotSpec {
  const base = robotSpec(d)
  if (!hasPhysicsUpgrades(d)) return base
  const up = upgradesOf(d)
  const mo = MOTOR_GEARING[up.motor] ?? MOTOR_GEARING.gear
  const mass = base.mass + (POWER_MASS_DELTA[up.power] ?? 0) + mo.massDelta + (SENSOR_MASS[up.sensor2] ?? 0) + (ARM_MASS[up.arm] ?? 0)
  const overload = Math.max(1, mass / (OVERLOAD_KG_PER_STRENGTH * mo.strength))
  const drive: DriveSpec = {
    ...base.drive,
    maxSpeed: (base.drive.maxSpeed * mo.speed) / overload,
    maxForcePerSide: base.drive.maxForcePerSide * mo.strength,
    mass: base.drive.mass,
  }
  return { ...base, drive, mass }
}

export interface CruisePower {
  /** Steady current cruising straight on a smooth tile floor at full speed, A. */
  amps: number
  /** Of which the two drive motors, A. */
  motorAmps: number
  /** Of which the computer, head and sensors, A. */
  electronicsAmps: number
  /** Pack voltage (nominal), V, and power, W. */
  volts: number
  watts: number
  /** Minutes from full until the pack is flat at this draw. */
  runtimeMin: number
}

/**
 * The battery's steady draw while cruising on tile, from the SAME constants the engine drains
 * with (battery.ts): each motor's no-load current plus current ∝ the force it pushes (torque ∝
 * current), the force being the rolling drag on its side; plus the electronics. sim/verify drives
 * the headless engine and checks the battery really drains at this rate, so a spec sheet that
 * shows `runtimeMin` shows how long the simulated robot runs.
 */
export function cruisePower(d: RobotDesign): CruisePower {
  const spec = fittedSpec(d)
  const G = 9.81
  const dragPerSide = SURFACES.tile.crr * spec.drive.sinkage * ((spec.mass * G) / 2)
  const motorAmps = 2 * (MOTOR_NO_LOAD_AMPS + (spec.drive.moveAmpsPerSide ?? 0) + (MOTOR_STALL_AMPS * dragPerSide) / spec.drive.maxForcePerSide)
  const parts = { head: d.head, sensor: d.sensor, tool: d.tool }
  const elec = electronicsAmps(parts, false, false)
  const amps = motorAmps + elec
  const pack = packInfo(powerPack(d))
  const runtimeMin = ((pack.capacityMah / 1000) / amps) * 60
  return {
    amps: round3(amps),
    motorAmps: round3(motorAmps),
    electronicsAmps: round3(elec),
    volts: pack.nominalV,
    watts: round3(amps * pack.nominalV),
    runtimeMin: Math.round(runtimeMin),
  }
}

const round3 = (x: number) => Math.round(x * 1000) / 1000
