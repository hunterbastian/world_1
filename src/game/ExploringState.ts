import * as THREE from 'three'
import type { GameState, GameContext } from './GameState'
import type { InputState } from './Input'
import { ActivationCinematic } from './ActivationCinematic'

export class ExploringState implements GameState {
  readonly id = 'exploring' as const

  private compass = { t: 0, angle: 0, has: false }
  private rest = { active: false, hold: 0, t: 0 }
  private walkerActivation = { hold: 0, nearWalkerIdx: -1 }
  private devFly = false
  private cinematic: ActivationCinematic | null = null

  enter(_ctx: GameContext) {}

  exit(_ctx: GameContext) {
    this.rest = { active: false, hold: 0, t: 0 }
  }

  update(ctx: GameContext, dt: number, input: InputState) {
    // Cinematic takes priority over all exploration
    if (this.cinematic) {
      this.cinematic.update(ctx, dt)
      if (this.cinematic.done) {
        this.cinematic = null
      }
      return
    }

    const { player, cameraRig, poi, hud, journal, worldMap, walkers, camera } = ctx

    // Dev fly toggle
    if (input.devFlyToggle) {
      this.devFly = !this.devFly
      console.info(`[dev] fly mode: ${this.devFly ? 'ON' : 'OFF'}`)
    }

    // FP camera: mouse → camera yaw/pitch
    cameraRig.addOrbitDelta(input.mouseDeltaX, input.mouseDeltaY)

    if (this.devFly) {
      // Noclip fly mode — WASD + Space/Ctrl for up/down, Shift for fast
      this.updateDevFly(ctx, dt, input)
    } else {
      if (!this.rest.active) {
        player.update(dt, input, cameraRig.getYaw())
      }

      // Feed movement state to camera for bob, FOV, roll
      cameraRig.setMovementState(
        player.speed,
        player.sprinting ? 7.0 : 5.5,
        player.sprinting,
        player.sliding
      )
      cameraRig.setEyeHeight(player.eyeHeight)
    }
    cameraRig.update(dt, player.position)

    if (input.journalToggle) journal.toggle()

    // Compass
    this.compass.t += dt
    if (this.compass.t >= 1 / 12) {
      this.compass.t = 0
      const nearest = poi.nearestUndiscovered(player.position)
      if (nearest) {
        const to = nearest.position.clone().sub(player.position)
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

    // HUD
    hud.setStamina(player.stamina)

    // World map
    worldMap.revealAt(player.position, 18)
    worldMap.updateMarkers(dt, {
      player: { position: player.position, yaw: cameraRig.getYaw() },
      pois: poi.pois,
      walkers: walkers.walkers.map((w) => ({ position: w.object3d.position })),
    })

    // Walker activation
    this.updateWalkerActivation(ctx, dt, input)

    // Rest mechanic
    this.updateRest(ctx, dt, input)
  }

  private updateDevFly(ctx: GameContext, dt: number, input: InputState) {
    const { player, cameraRig } = ctx
    const flySpeed = input.sprint ? 80 : 25
    const yaw = cameraRig.getYaw()

    // Forward/back/strafe in camera direction
    const fwd = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw))
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x)

    const move = new THREE.Vector3()
    move.addScaledVector(fwd, input.forward * flySpeed * dt)
    move.addScaledVector(right, -input.right * flySpeed * dt)

    // Up/down
    if (input.flyUp) move.y += flySpeed * dt
    if (input.flyDown) move.y -= flySpeed * dt

    player.position.add(move)
    player.velocity.set(0, 0, 0)

    // Disable bob in fly mode
    cameraRig.setMovementState(0, 1, false, false)
    cameraRig.setEyeHeight(player.standingEyeHeight)
  }

  private updateWalkerActivation(ctx: GameContext, dt: number, input: InputState) {
    const { player, walkers, hud } = ctx
    const activationRange = 8.0
    const activationTime = 4.0

    // Check for nearby already-activated Walker to re-mount (quick hold E)
    let nearestActivated: typeof walkers.walkers[number] | null = null
    let nearestActivatedDist = Infinity
    for (const w of walkers.walkers) {
      if (!w.activated || w.mounted) continue
      const d = w.object3d.position.distanceTo(player.position)
      if (d < activationRange && d < nearestActivatedDist) {
        nearestActivatedDist = d
        nearestActivated = w
      }
    }

    if (nearestActivated) {
      hud.setPrompt('Hold E — Mount')
      if (input.interactHeld) {
        this.walkerActivation.hold = Math.min(1, this.walkerActivation.hold + dt * 2)
        if (this.walkerActivation.hold >= 1) {
          this.walkerActivation.hold = 0
          hud.setPrompt(null)
          ctx.activeWalker = nearestActivated
          ctx.requestStateChange('piloting')
          return
        }
      } else {
        this.walkerActivation.hold = Math.max(0, this.walkerActivation.hold - dt * 3)
      }
      return
    }

    // Find nearest inactive (dormant) walker
    let nearestIdx = -1
    let nearestDist = Infinity
    for (let i = 0; i < walkers.walkers.length; i++) {
      const w = walkers.walkers[i]
      if (w.activated) continue
      const d = w.object3d.position.distanceTo(player.position)
      if (d < activationRange && d < nearestDist) {
        nearestDist = d
        nearestIdx = i
      }
    }

    if (nearestIdx >= 0) {
      if (this.walkerActivation.nearWalkerIdx !== nearestIdx) {
        this.walkerActivation.hold = 0
        this.walkerActivation.nearWalkerIdx = nearestIdx
      }

      if (input.interactHeld) {
        this.walkerActivation.hold = Math.min(1, this.walkerActivation.hold + dt / activationTime)
      } else {
        this.walkerActivation.hold = Math.max(0, this.walkerActivation.hold - dt * 0.8)
      }

      hud.setActivationRing(this.walkerActivation.hold)

      if (this.walkerActivation.hold >= 1) {
        const walker = walkers.walkers[nearestIdx]
        walker.activate()
        this.walkerActivation.hold = 0
        this.walkerActivation.nearWalkerIdx = -1
        hud.setActivationRing(null)
        hud.setPrompt(null)

        // Start cinematic -- hand off to PilotingState when done
        this.cinematic = new ActivationCinematic(walker, ctx, () => {
          ctx.activeWalker = walker
          ctx.requestStateChange('piloting')
        })
        return
      }
    } else {
      if (this.walkerActivation.hold > 0) {
        this.walkerActivation.hold = Math.max(0, this.walkerActivation.hold - dt * 1.2)
        hud.setActivationRing(this.walkerActivation.hold > 0.01 ? this.walkerActivation.hold : null)
      } else {
        hud.setActivationRing(null)
      }
      this.walkerActivation.nearWalkerIdx = -1
    }
  }

  private updateRest(ctx: GameContext, dt: number, input: InputState) {
    const { sky, hud, poi, player } = ctx

    let closestCampDist = Infinity
    for (const p of poi.pois) {
      if (!p.restPoint) continue
      const d = p.position.distanceTo(player.position)
      if (d < closestCampDist) closestCampDist = d
    }

    const inCamp = closestCampDist < 3.0
    const interact = input.interactHeld

    if (!this.rest.active) {
      if (inCamp) {
        hud.setPrompt('Hold E to Rest')
        this.rest.hold = interact
          ? Math.min(1, this.rest.hold + dt * 0.9)
          : Math.max(0, this.rest.hold - dt * 1.6)
        if (this.rest.hold >= 1) {
          this.rest.active = true
          this.rest.t = 0
          this.rest.hold = 0
        }
      } else {
        hud.setPrompt(null)
        this.rest.hold = 0
      }
    } else {
      hud.setPrompt('Resting\u2026')
      this.rest.t += dt
      sky.timeScale = 24
      player.stamina = Math.min(1, player.stamina + dt * 0.6)
      if (this.rest.t > 2.8) {
        this.rest.active = false
        sky.timeScale = 1
        hud.setPrompt(null)
      }
    }
  }
}
