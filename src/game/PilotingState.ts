import * as THREE from 'three'
import type { GameState, GameContext } from './GameState'
import type { InputState } from './Input'

export class PilotingState implements GameState {
  readonly id = 'piloting' as const

  private dismountHold = 0
  private compass = { t: 0, angle: 0, has: false }

  enter(ctx: GameContext) {
    const walker = ctx.activeWalker
    if (!walker) return

    walker.mount()

    // Hide on-foot player
    ctx.player.object3d.visible = false

    // Camera: switch to third-person chase
    const tpDist = walker.tier === 'assault' ? 18 : 14
    const tpHeight = walker.tier === 'assault' ? 8 : 6
    ctx.cameraRig.setTPOffsets(tpDist, tpHeight)
    ctx.cameraRig.setMode('tp')

    // HUD
    ctx.hud.setWalkerHealth(1.0)
    ctx.hud.setCrosshair(true, 'pilot')
    ctx.hud.setPrompt(null)

    this.dismountHold = 0
  }

  exit(ctx: GameContext) {
    const walker = ctx.activeWalker
    if (walker) {
      // Place player next to Walker on dismount
      const offset = new THREE.Vector3(
        Math.sin(walker.heading + Math.PI * 0.5) * 4,
        0,
        Math.cos(walker.heading + Math.PI * 0.5) * 4,
      )
      const dismountPos = walker.object3d.position.clone().add(offset)
      dismountPos.y = ctx.terrain.heightAtXZ(dismountPos.x, dismountPos.z)
      ctx.player.position.copy(dismountPos)
      ctx.player.velocity.set(0, 0, 0)

      walker.dismount()
    }

    ctx.activeWalker = null
    ctx.player.object3d.visible = true

    // Camera: back to first-person
    ctx.cameraRig.setMode('fp')

    // HUD cleanup
    ctx.hud.setWalkerHealth(null)
    ctx.hud.setCrosshair(false)
    ctx.hud.setPrompt(null)

    this.dismountHold = 0
  }

  update(ctx: GameContext, dt: number, input: InputState) {
    const walker = ctx.activeWalker
    if (!walker) return

    const { cameraRig, hud, terrain, poi, camera } = ctx

    // Mouse look (orbits around Walker in TP mode)
    cameraRig.addOrbitDelta(input.mouseDeltaX, input.mouseDeltaY)

    // Walker movement: WASD steers relative to camera yaw
    walker.moveUpdate(dt, input.forward, input.right, input.sprint, terrain)

    // Keep player position synced with Walker (so world systems like audio stay correct)
    ctx.player.position.copy(walker.object3d.position)
    ctx.player.position.y = terrain.heightAtXZ(ctx.player.position.x, ctx.player.position.z)

    // Camera follows Walker hull top
    const followTarget = walker.getHullTopPosition()
    cameraRig.update(dt, followTarget)

    // Compass to nearest POI
    this.compass.t += dt
    if (this.compass.t >= 1 / 12) {
      this.compass.t = 0
      const nearest = poi.nearestUndiscovered(walker.object3d.position)
      if (nearest) {
        const to = nearest.position.clone().sub(walker.object3d.position)
        to.y = 0
        to.normalize()
        const fwd = new THREE.Vector3()
        camera.getWorldDirection(fwd)
        fwd.y = 0
        fwd.normalize()
        this.compass.angle = Math.atan2(to.x, to.z) - Math.atan2(fwd.x, fwd.z)
        this.compass.has = true
      } else {
        this.compass.has = false
      }
    }
    if (this.compass.has) hud.setCompassAngle(this.compass.angle)

    // Dismount: hold E for 0.5s
    const dismountTime = 0.5
    if (input.interactHeld) {
      this.dismountHold += dt
      if (this.dismountHold > dismountTime * 0.15) {
        hud.setPrompt('Hold E — Dismount')
      }
      if (this.dismountHold >= dismountTime) {
        ctx.requestStateChange('exploring')
        return
      }
    } else {
      if (this.dismountHold > 0) {
        this.dismountHold = Math.max(0, this.dismountHold - dt * 3)
        if (this.dismountHold < 0.01) {
          this.dismountHold = 0
          hud.setPrompt(null)
        }
      }
    }
  }
}
