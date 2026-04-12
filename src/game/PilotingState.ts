import * as THREE from 'three'
import type { GameState, GameContext } from './GameState'
import type { InputState } from './Input'

const FIRE_INTERVAL = 0.5
const AIM_CONE_COS = Math.cos(10 * Math.PI / 180)
const AIM_RANGE = 150

export class PilotingState implements GameState {
  readonly id = 'piloting' as const

  private dismountHold = 0
  private compass = { t: 0, angle: 0, has: false }
  private fireCooldown = 0
  private debugTarget: THREE.Mesh | null = null

  enter(ctx: GameContext) {
    const walker = ctx.activeWalker
    if (!walker) return

    walker.mount()

    ctx.player.object3d.visible = false

    const tpDist = walker.tier === 'assault' ? 18 : 14
    const tpHeight = walker.tier === 'assault' ? 8 : 6
    ctx.cameraRig.setTPOffsets(tpDist, tpHeight)
    ctx.cameraRig.setMode('tp')

    ctx.hud.setWalkerHealth(1.0)
    ctx.hud.setCrosshair(true, 'pilot')
    ctx.hud.setPrompt(null)

    this.dismountHold = 0
    this.fireCooldown = 0

    const targetGeo = new THREE.SphereGeometry(1.5, 12, 12)
    const targetMat = new THREE.MeshBasicMaterial({ color: 0xff3333 })
    this.debugTarget = new THREE.Mesh(targetGeo, targetMat)
    this.debugTarget.position.copy(walker.object3d.position).add(new THREE.Vector3(30, 5, 20))
    ctx.scene.add(this.debugTarget)
  }

  exit(ctx: GameContext) {
    const walker = ctx.activeWalker
    if (walker) {
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

    ctx.cameraRig.setMode('fp')

    ctx.hud.setWalkerHealth(null)
    ctx.hud.setCrosshair(false)
    ctx.hud.setPrompt(null)

    this.dismountHold = 0

    if (this.debugTarget) {
      ctx.scene.remove(this.debugTarget)
      this.debugTarget.geometry.dispose()
      ;(this.debugTarget.material as THREE.MeshBasicMaterial).dispose()
      this.debugTarget = null
    }
  }

  update(ctx: GameContext, dt: number, input: InputState) {
    const walker = ctx.activeWalker
    if (!walker) return

    const { cameraRig, hud, terrain, poi, camera } = ctx

    cameraRig.addOrbitDelta(input.mouseDeltaX, input.mouseDeltaY)

    walker.moveUpdate(dt, input.forward, input.right, input.sprint, terrain)

    ctx.player.position.copy(walker.object3d.position)
    ctx.player.position.y = terrain.heightAtXZ(ctx.player.position.x, ctx.player.position.z)

    const followTarget = walker.getHullTopPosition()
    cameraRig.update(dt, followTarget)

    // Firing
    this.fireCooldown = Math.max(0, this.fireCooldown - dt)
    if (input.mouseLeft && this.fireCooldown <= 0) {
      this.fireCooldown = FIRE_INTERVAL
      const muzzle = walker.getMuzzleWorldPosition()
      const dir = new THREE.Vector3()
      camera.getWorldDirection(dir)
      const aimDir = this.applyAutoAim(camera, muzzle, dir)
      ctx.projectiles.fire(muzzle, aimDir)
    }

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

  private applyAutoAim(
    camera: THREE.PerspectiveCamera,
    muzzle: THREE.Vector3,
    baseDir: THREE.Vector3,
  ): THREE.Vector3 {
    if (!this.debugTarget) return baseDir

    const camPos = camera.position
    const camFwd = new THREE.Vector3()
    camera.getWorldDirection(camFwd)

    const toTarget = this.debugTarget.position.clone().sub(camPos)
    const dist = toTarget.length()
    if (dist > AIM_RANGE || dist < 1) return baseDir

    toTarget.normalize()
    if (camFwd.dot(toTarget) > AIM_CONE_COS) {
      return this.debugTarget.position.clone().sub(muzzle).normalize()
    }

    return baseDir
  }
}
