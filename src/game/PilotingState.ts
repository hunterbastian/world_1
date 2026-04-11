import * as THREE from 'three'
import type { GameState, GameContext } from './GameState'
import type { InputState } from './Input'
import type { WalkerMech, WalkerStompEvent } from '../world/WalkerMech'
import { animateWalker } from '../world/WalkerMech'
import { ChaseCam } from './ChaseCam'

const TIER_CONFIG = {
  scout:   { distance: 12, heightOffset: 5, fov: 72, walkSpeed: 8, turnSpeed: 1.2 },
  assault: { distance: 18, heightOffset: 8, fov: 72, walkSpeed: 6, turnSpeed: 0.8 },
} as const

/**
 * Piloting state — player is mounted in a Walker mech.
 *
 * Tank-style controls: W/S forward/back, A/D rotate yaw.
 * Camera orbits freely around the walker (Halo vehicle camera).
 * Hold E for 1.5s to dismount.
 */
export class PilotingState implements GameState {
  readonly id = 'piloting' as const

  private chaseCam: ChaseCam | null = null
  private walker: WalkerMech | null = null
  private walkPhase = 0
  private readonly velocity = new THREE.Vector3()
  private yaw = 0
  private dismountHold = 0
  private mountPromptTimer = 0
  private stompUnsub: (() => void) | null = null

  enter(ctx: GameContext) {
    this.walker = ctx.activeWalker ?? null
    if (!this.walker) return

    const tier = this.walker.tier
    const cfg = TIER_CONFIG[tier]

    this.chaseCam = new ChaseCam(ctx.camera, {
      distance: cfg.distance,
      heightOffset: cfg.heightOffset,
      fov: cfg.fov,
    })
    this.chaseCam.enterTransition()

    ctx.player.object3d.visible = false

    this.yaw = this.walker.object3d.rotation.y
    this.velocity.set(0, 0, 0)
    this.walkPhase = 0
    this.dismountHold = 0

    this.mountPromptTimer = 2.0
    ctx.hud.setPrompt(`${this.walker.name.toUpperCase()}`)
    ctx.hud.setPilotingMode(true, this.walker.name)
    ctx.journal.setWalkerInfo({ name: this.walker.name, tier: this.walker.tier, mounted: true })

    this.stompUnsub = this.walker.onStomp((e: WalkerStompEvent) => {
      this.chaseCam?.impulseShake(e.intensity)
    })
  }

  exit(ctx: GameContext) {
    ctx.player.object3d.visible = true

    if (this.walker) {
      const right = new THREE.Vector3(
        Math.cos(this.yaw), 0, -Math.sin(this.yaw),
      )
      ctx.player.position.copy(this.walker.object3d.position)
        .addScaledVector(right, 3)
      ctx.player.position.y = ctx.terrain.heightAtXZ(
        ctx.player.position.x, ctx.player.position.z,
      )
      ctx.player.object3d.position.copy(ctx.player.position)
    }
    ctx.player.velocity.set(0, 0, 0)

    ctx.camera.fov = 65
    ctx.camera.updateProjectionMatrix()

    ctx.hud.setPrompt(null)
    ctx.hud.setPilotingMode(false)

    if (this.stompUnsub) {
      this.stompUnsub()
      this.stompUnsub = null
    }

    this.walker = null
    this.chaseCam = null
  }

  update(ctx: GameContext, dt: number, input: InputState) {
    if (!this.walker || !this.chaseCam) return

    const tier = this.walker.tier
    const cfg = TIER_CONFIG[tier]

    // --- Movement (tank-style) ---
    if (input.right !== 0) {
      this.yaw -= input.right * cfg.turnSpeed * dt
    }

    const fwd = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw))

    if (input.forward !== 0) {
      const accel = fwd.clone().multiplyScalar(input.forward * cfg.walkSpeed * 2.5 * dt)
      this.velocity.add(accel)
    }

    // Friction
    this.velocity.multiplyScalar(Math.pow(0.92, dt * 60))

    // Clamp to max speed
    const hSpeed = Math.hypot(this.velocity.x, this.velocity.z)
    if (hSpeed > cfg.walkSpeed) {
      const scale = cfg.walkSpeed / hSpeed
      this.velocity.x *= scale
      this.velocity.z *= scale
    }

    // Apply movement
    this.walker.object3d.position.x += this.velocity.x * dt
    this.walker.object3d.position.z += this.velocity.z * dt

    // Terrain follow
    this.walker.object3d.position.y = ctx.terrain.heightAtXZ(
      this.walker.object3d.position.x,
      this.walker.object3d.position.z,
    )

    this.walker.object3d.rotation.y = this.yaw

    // --- Animation ---
    const speed = Math.hypot(this.velocity.x, this.velocity.z)
    this.walkPhase += speed * dt * 0.35
    animateWalker(this.walker.limbs, dt, speed, this.walkPhase)

    // --- Camera ---
    this.chaseCam.addOrbitDelta(input.mouseDeltaX, input.mouseDeltaY)
    this.chaseCam.update(dt, this.walker.object3d)

    // --- Dismount ---
    if (input.interactHeld) {
      this.dismountHold += dt
      if (this.dismountHold >= 1.5) {
        ctx.requestStateChange('exploring')
        return
      }
      ctx.hud.setPrompt('Hold E to Dismount')
    } else {
      this.dismountHold = Math.max(0, this.dismountHold - dt * 2)
      if (this.mountPromptTimer > 0) {
        this.mountPromptTimer -= dt
        if (this.mountPromptTimer <= 0) {
          ctx.hud.setPrompt(null)
    ctx.hud.setPilotingMode(false)
        }
      } else if (this.dismountHold < 0.01) {
        ctx.hud.setPrompt(null)
    ctx.hud.setPilotingMode(false)
      }
    }

    // --- Shadow focus on walker ---
    ctx.sky.updateShadowFocus(this.walker.object3d.position)
  }
}
