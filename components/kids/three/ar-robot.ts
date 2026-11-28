// components/kids/three/ar-robot.ts
// The robot for "See it in your room" (ARViewClient). One rule: AR shows
// exactly the robot the Workshop shows — the same buildRobot() call with the
// World form on (drone / sub / humanoid when the child fitted one), the same
// parts, colours and learned-part glow. Only the X-ray insides are left out
// (AR has no X-ray button, and they are hidden in the Workshop until X-ray).
// Plain three.js, no DOM, so ar-robot.verify.ts can run it in Node.

import * as THREE from 'three'
import { buildRobot } from '@/lib/kids/robot3d'
import { getUpgrade, upgradesOf, type RobotDesign } from '@/lib/kids/robot-design'
import type { AnySlot } from '@/lib/kids/robot-growth'

/** Same options the Workshop passes (WorkshopSceneClient), minus the X-ray insides. */
export function buildARRobot(design: RobotDesign, learned: readonly AnySlot[] = []): THREE.Group {
  return buildRobot(design, { worldForm: true, learned })
}

export interface ARFormLabel {
  /** 'ground' when no World form is fitted. */
  id: string
  name: string
  emoji: string
}

/** The World form the robot is wearing, for the AR header and the photo caption. Null for a ground robot. */
export function arFormLabel(design: RobotDesign): ARFormLabel | null {
  const chassis = upgradesOf(design).chassis
  if (!chassis || chassis === 'ground') return null
  const part = getUpgrade('chassis', chassis)
  return part ? { id: part.id, name: part.name, emoji: part.emoji } : null
}

export interface ARFrame {
  /** Camera position for the magic window, in Workshop units (robot at scale 1, on the origin). */
  camera: [number, number, number]
  /** Where the camera looks. */
  target: [number, number, number]
  /** Height of the robot at scale 1 (a humanoid stands taller than a ground robot). */
  height: number
}

/** The magic window's camera field of view (degrees, vertical). */
export const AR_FOV = 50

/**
 * Frame the whole robot in the magic window for a screen of this aspect
 * (width / height). Same downward look as before (camera up 1 for every 2
 * back) and never closer than the old fixed view (1.3 m up, 2.6 m back), but
 * far enough back that a wide drone or a tall humanoid fits a portrait phone.
 */
export function arMagicWindowFrame(robot: THREE.Object3D, aspect = 1): ARFrame {
  const box = new THREE.Box3().setFromObject(robot)
  if (box.isEmpty()) return { camera: [0, 1.3, 2.6], target: [0, 0.3, 0], height: 1 }
  const height = Math.max(0.3, box.max.y)
  const look = Math.max(0.3, height * 0.45)
  const centre = box.getCenter(new THREE.Vector3())
  const sphere = box.getBoundingSphere(new THREE.Sphere())
  // Distance from the robot's centre, not the look point, so the whole sphere fits.
  const halfV = THREE.MathUtils.degToRad(AR_FOV / 2)
  const halfH = Math.atan(Math.tan(halfV) * Math.max(0.2, aspect))
  const fit = (sphere.radius + Math.abs(centre.y - look) * 0.5) / Math.sin(Math.min(halfV, halfH))
  const dist = Math.max(Math.hypot(2.6, 1.0), fit * 1.08)
  // Look down at the robot like before: direction (0, 1, 2) normalised.
  const k = dist / Math.sqrt(5)
  return { camera: [0, look + k, 2 * k], target: [0, look, 0], height }
}

/** Real-AR size (unchanged): every form at the same 0.35 scale, so a humanoid stands taller than a ground robot, as in the Workshop. */
export const AR_XR_SCALE = 0.35
