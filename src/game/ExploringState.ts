import * as THREE from 'three'
import type { GameState, GameContext } from './GameState'
import type { InputState } from './Input'

export class ExploringState implements GameState {
  readonly id = 'exploring' as const

  private compass = { t: 0, angle: 0, has: false }
  private rest = { active: false, hold: 0, t: 0 }
  private spawnIntro = { t: 0, active: true }

  enter(_ctx: GameContext) {
    this.spawnIntro = { t: 0, active: true }
  }

  exit(_ctx: GameContext) {
    this.rest = { active: false, hold: 0, t: 0 }
  }

  update(ctx: GameContext, dt: number, input: InputState) {
    const { player, cameraRig, poi, hud, journal, worldMap, walkers, camera } = ctx
    const windDir = ctx.wind.dirXZ

    cameraRig.addOrbitDelta(input.mouseDeltaX, input.mouseDeltaY)
    player.setWind(windDir)

    if (!this.rest.active) {
      player.update(dt, input, cameraRig.getYaw())
    }

    this.updateSpawnIntro(dt, cameraRig)
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

    // Rest mechanic
    this.updateRest(ctx, dt, input)
  }

  private updateSpawnIntro(dt: number, cameraRig: GameContext['cameraRig']) {
    if (!this.spawnIntro.active) {
      cameraRig.setDesired(7.5, 2.0)
      return
    }
    this.spawnIntro.t += dt
    const dur = 2.6
    const t = Math.min(1, this.spawnIntro.t / dur)
    const ease = 1 - Math.pow(1 - t, 3)
    const dist = THREE.MathUtils.lerp(14.0, 7.5, ease)
    const height = THREE.MathUtils.lerp(3.6, 2.0, ease)
    cameraRig.setDesired(dist, height)
    if (t >= 1) this.spawnIntro.active = false
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
