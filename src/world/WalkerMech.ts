import * as THREE from 'three'
import { buildWalkerMechModel, tierDims, type WalkerTier, type WalkerLimbs, type WalkerStompEvent } from './WalkerMechModel'
import { animateWalker } from './WalkerMechAnimation'
import type { Terrain } from './Terrain'

export type { WalkerTier, WalkerLimbs, LegLimb, TierDims, WalkerStompEvent } from './WalkerMechModel'
export { animateWalker } from './WalkerMechAnimation'

type TierMotion = {
  maxSpeed: number
  sprintSpeed: number
  accel: number
  decel: number
  turnRate: number
}

function tierMotion(tier: WalkerTier): TierMotion {
  if (tier === 'scout') {
    return { maxSpeed: 12, sprintSpeed: 16, accel: 6, decel: 10, turnRate: 1.8 }
  }
  return { maxSpeed: 9, sprintSpeed: 12, accel: 4, decel: 8, turnRate: 1.2 }
}

export class WalkerMech {
  public readonly object3d: THREE.Group
  public readonly tier: WalkerTier
  public readonly name: string
  public readonly limbs: WalkerLimbs
  public readonly stompListeners = new Set<(e: WalkerStompEvent) => void>()

  private stompPhase = 0
  private prevStompSin = 0

  public activated = false
  private readonly activationListeners = new Set<(mech: WalkerMech) => void>()

  // Movement state (piloting)
  public mounted = false
  public heading = 0
  public speed = 0
  private walkPhase = 0
  private readonly motion: TierMotion

  onActivation(cb: (mech: WalkerMech) => void) {
    this.activationListeners.add(cb)
    return () => this.activationListeners.delete(cb)
  }

  activate() {
    if (this.activated) return
    this.activated = true
    for (const cb of this.activationListeners) cb(this)
  }

  onStomp(cb: (e: WalkerStompEvent) => void) {
    this.stompListeners.add(cb)
    return () => this.stompListeners.delete(cb)
  }

  mount() {
    this.mounted = true
    this.heading = this.object3d.rotation.y
    this.speed = 0
    this.walkPhase = 0
  }

  dismount() {
    this.mounted = false
    this.speed = 0
  }

  /** Per-frame piloting update: steering, acceleration, terrain clamping, animation. */
  moveUpdate(
    dt: number,
    forwardInput: number,
    rightInput: number,
    sprint: boolean,
    terrain: Terrain,
  ) {
    const m = this.motion
    const cap = sprint ? m.sprintSpeed : m.maxSpeed

    // Steering
    this.heading -= rightInput * m.turnRate * dt

    // Acceleration / deceleration along heading
    if (forwardInput !== 0) {
      const targetSpeed = forwardInput > 0 ? cap : -cap * 0.4
      const accelRate = forwardInput > 0 ? m.accel : m.decel
      this.speed += (targetSpeed - this.speed) * (1 - Math.exp(-accelRate * dt))
    } else {
      this.speed += (0 - this.speed) * (1 - Math.exp(-m.decel * dt))
    }
    if (Math.abs(this.speed) < 0.05) this.speed = 0

    // Move position
    const dx = Math.sin(this.heading) * this.speed * dt
    const dz = Math.cos(this.heading) * this.speed * dt
    const pos = this.object3d.position
    pos.x += dx
    pos.z += dz

    // Terrain clamp
    const walkerScale = this.tier === 'assault' ? 3.5 : 3.0
    pos.y = terrain.heightAtXZ(pos.x, pos.z) - 0.3 * walkerScale

    // Face heading
    this.object3d.rotation.y = this.heading

    // Drive walk animation
    const absSpeed = Math.abs(this.speed)
    this.walkPhase += dt * absSpeed * 0.35
    animateWalker(this.limbs, dt, absSpeed, this.walkPhase)
  }

  /** World-space position of the hull top (camera anchor). */
  getHullTopPosition(): THREE.Vector3 {
    const d = tierDims(this.tier)
    const walkerScale = this.tier === 'assault' ? 3.5 : 3.0
    const localY = d.hipY + d.bodyR * d.bodySquashY
    const out = new THREE.Vector3(0, localY * walkerScale, 0)
    out.add(this.object3d.position)
    // Re-add the base offset that was subtracted during spawn
    out.y += 0.3 * walkerScale
    return out
  }

  /** World-space position of the weapon muzzle (left barrel tip). */
  getMuzzleWorldPosition(): THREE.Vector3 {
    const pos = new THREE.Vector3()
    this.limbs.weaponL.getWorldPosition(pos)
    return pos
  }

  constructor(tier: WalkerTier, name: string) {
    this.tier = tier
    this.name = name
    this.motion = tierMotion(tier)
    this.object3d = new THREE.Group()
    this.object3d.name = `WalkerMech:${name}`

    const { group, limbs } = buildWalkerMechModel(tier)
    while (group.children.length > 0) {
      this.object3d.add(group.children[0])
    }
    this.limbs = limbs
  }

  update(dt: number) {
    this.stompPhase += dt * 0.45
    const stompSin = Math.sin(this.stompPhase * Math.PI * 2)

    if (this.prevStompSin > 0 && stompSin <= 0) {
      const intensity = this.tier === 'assault' ? 0.4 : 0.25
      for (const cb of this.stompListeners) {
        cb({ position: this.object3d.position, intensity })
      }
    }
    this.prevStompSin = stompSin
  }
}
