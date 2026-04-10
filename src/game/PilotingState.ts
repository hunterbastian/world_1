import * as THREE from 'three'
import type { GameState, GameContext } from './GameState'
import type { InputState } from './Input'
export class PilotingState implements GameState {
  readonly id = 'piloting' as const

  private dismountHold = 0
  private readonly dismountTime = 0.45
  private compassT = 0

  enter(ctx: GameContext) {
    const w = ctx.getMountedWalker()
    if (!w) {
      ctx.requestStateChange('exploring')
      return
    }

    const tier = w.tier
    const sc = w.object3d.scale.x
    const chase =
      tier === 'scout'
        ? { distance: 13 * sc, height: 3.8 * sc, anchorY: 4.2 * sc, lookLift: 1.8 * sc, fov: 60 }
        : { distance: 15 * sc, height: 4.5 * sc, anchorY: 6.5 * sc, lookLift: 2.4 * sc, fov: 58 }

    ctx.cameraRig.setThirdPersonChase(chase)

    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(w.object3d.quaternion)
    const yaw = Math.atan2(fwd.x, fwd.z)
    ctx.cameraRig.setYaw(yaw)
    ctx.cameraRig.setPitch(-0.12)

    ctx.hud.setCrosshair(true)
    ctx.hud.setWalkerHealth(1.0)
    ctx.hud.setPrompt('Hold E to Dismount')
  }

  exit(ctx: GameContext) {
    ctx.hud.setCrosshair(false)
    ctx.hud.setWalkerHealth(null)
    ctx.hud.setPrompt(null)
    ctx.cameraRig.setFirstPerson()
    this.dismountHold = 0
  }

  update(ctx: GameContext, dt: number, input: InputState) {
    const w = ctx.getMountedWalker()
    if (!w) {
      ctx.requestStateChange('exploring')
      return
    }

    const { cameraRig, player, terrain, hud, journal, worldMap, poi, walkers, camera } = ctx

    cameraRig.addOrbitDelta(input.mouseDeltaX, input.mouseDeltaY)

    if (input.journalToggle) journal.toggle()

    const maxSpeed = w.tier === 'scout' ? 11.5 : 9.5
    const accel = w.tier === 'scout' ? 7.5 : 6.2
    const decel = 5.0
    const turnSpeed = w.tier === 'scout' ? 2.8 : 2.2

    const yaw = cameraRig.getYaw()
    const sinY = Math.sin(yaw)
    const cosY = Math.cos(yaw)
    const fwd = new THREE.Vector3(sinY, 0, cosY)
    const right = new THREE.Vector3(cosY, 0, -sinY)

    const wish = new THREE.Vector3()
    wish.addScaledVector(fwd, input.forward)
    wish.addScaledVector(right, -input.right)
    let wishLen = wish.length()
    if (wishLen > 1) {
      wish.multiplyScalar(1 / wishLen)
      wishLen = 1
    }

    const sprintMul = input.sprint ? 1.22 : 1.0
    const targetSpeed = wishLen * maxSpeed * sprintMul

    const horizontal = new THREE.Vector3(player.velocity.x, 0, player.velocity.z)
    const curSpeed = horizontal.length()
    let newSpeed = curSpeed
    if (wishLen > 0.02) {
      newSpeed = THREE.MathUtils.lerp(curSpeed, targetSpeed, 1 - Math.exp(-accel * dt))
    } else {
      newSpeed = Math.max(0, curSpeed - decel * dt)
    }

    if (newSpeed > 0.02 && wishLen > 0.02) {
      const moveDir = wish.clone().normalize()
      player.velocity.x = moveDir.x * newSpeed
      player.velocity.z = moveDir.z * newSpeed

      const targetRot = Math.atan2(moveDir.x, moveDir.z)
      let dr = targetRot - w.object3d.rotation.y
      while (dr > Math.PI) dr -= Math.PI * 2
      while (dr < -Math.PI) dr += Math.PI * 2
      w.object3d.rotation.y += dr * (1 - Math.exp(-turnSpeed * dt))
    } else {
      player.velocity.x *= Math.max(0, 1 - decel * dt * 0.5)
      player.velocity.z *= Math.max(0, 1 - decel * dt * 0.5)
      if (player.velocity.lengthSq() < 1e-4) player.velocity.set(0, 0, 0)
    }

    const sc = w.object3d.scale.x
    const baseOff = -0.3 * sc
    const p = w.object3d.position
    p.x += player.velocity.x * dt
    p.z += player.velocity.z * dt
    p.y = terrain.heightAtXZ(p.x, p.z) + baseOff

    player.position.copy(p)
    player.object3d.position.copy(p)
    player.velocity.y = 0

    w.setPilotMotion(newSpeed)

    const anchorY = w.pilotCameraAnchorY()
    const camTarget = new THREE.Vector3(p.x, anchorY, p.z)
    cameraRig.update(dt, camTarget)

    if (input.interactHeld) {
      this.dismountHold = Math.min(1, this.dismountHold + dt / this.dismountTime)
    } else {
      this.dismountHold = Math.max(0, this.dismountHold - dt * 1.5)
    }
    hud.setActivationRing(this.dismountHold > 0.02 ? this.dismountHold : null)

    if (this.dismountHold >= 1) {
      hud.setActivationRing(null)
      ctx.dismountWalker()
      return
    }

    worldMap.revealAt(player.position, 18)
    worldMap.updateMarkers(dt, {
      player: { position: player.position, yaw: cameraRig.getYaw() },
      pois: poi.pois,
      walkers: walkers.walkers.map((wk) => ({ position: wk.object3d.position })),
    })

    this.compassT += dt
    if (this.compassT >= 1 / 12) {
      this.compassT = 0
      const nearest = poi.nearestUndiscovered(player.position)
      if (nearest) {
        const to = nearest.position.clone().sub(player.position)
        to.y = 0
        to.normalize()
        const camFwd = new THREE.Vector3()
        camera.getWorldDirection(camFwd)
        camFwd.y = 0
        camFwd.normalize()
        const angle = Math.atan2(to.x, to.z) - Math.atan2(camFwd.x, camFwd.z)
        hud.setCompassAngle(angle)
      }
    }
  }
}
