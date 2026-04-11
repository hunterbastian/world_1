import * as THREE from 'three'
import type { GameContext } from './GameState'
import type { WalkerMech } from '../world/WalkerMech'

const CINEMATIC_DURATION = 6.0

type DustParticle = {
  mesh: THREE.Mesh
  vel: THREE.Vector3
  life: number
  maxLife: number
}

export class ActivationCinematic {
  private t = 0
  private walker: WalkerMech
  private onComplete: () => void

  private startCamPos = new THREE.Vector3()
  private playerPos = new THREE.Vector3()

  // Walker rise animation
  private walkerBaseY = 0
  private riseAmount: number

  // Dust burst
  private dust: DustParticle[] = []
  private dustGroup: THREE.Group

  // Screen shake state
  private shakeIntensity = 0

  constructor(walker: WalkerMech, ctx: GameContext, onComplete: () => void) {
    this.walker = walker
    this.onComplete = onComplete
    this.playerPos.copy(ctx.player.position)

    const walkerScale = walker.tier === 'assault' ? 3.5 : 3.0
    this.riseAmount = walkerScale * 0.8

    // Sunken pose: push Walker down before it rises
    this.walkerBaseY = walker.object3d.position.y
    walker.object3d.position.y -= this.riseAmount

    // Save camera start position
    this.startCamPos.copy(ctx.camera.position)

    // Bloom spike on start
    ctx.postfx.setBloomOverride(2.5)

    // Dust particle group
    this.dustGroup = new THREE.Group()
    this.dustGroup.name = 'ActivationDust'
    ctx.scene.add(this.dustGroup)
    this.spawnDust(walker)
  }

  get done(): boolean {
    return this.t >= CINEMATIC_DURATION
  }

  update(ctx: GameContext, dt: number) {
    this.t += dt
    const p = Math.min(1, this.t / CINEMATIC_DURATION)

    // Phase breakdown:
    // 0.0-0.8s: camera snaps to dramatic angle, bloom peaks, shake builds
    // 0.8-3.5s: Walker rises from ground, servo sounds, dust erupts
    // 3.5-5.0s: camera pulls back to wide shot, bloom fades
    // 5.0-6.0s: settle, hand off to PilotingState

    this.updateWalkerRise(dt, p)
    this.updateCamera(ctx, p)
    this.updateBloom(ctx, p)
    this.updateShake(ctx, dt, p)
    this.updateDust(dt)

    if (this.done) {
      this.finish(ctx)
    }
  }

  private updateWalkerRise(_dt: number, p: number) {
    // Rise: eased in phase 0.1-0.6
    const riseP = THREE.MathUtils.smoothstep(p, 0.1, 0.6)
    const eased = 1 - Math.pow(1 - riseP, 3)
    this.walker.object3d.position.y = (this.walkerBaseY - this.riseAmount) + this.riseAmount * eased
  }

  private updateCamera(ctx: GameContext, p: number) {
    const wPos = this.walker.object3d.position
    const walkerScale = this.walker.tier === 'assault' ? 3.5 : 3.0
    const hullHeight = walkerScale * 2.2

    // Camera orbit angle: starts at player-facing side, slowly orbits
    const baseAngle = Math.atan2(
      this.playerPos.x - wPos.x,
      this.playerPos.z - wPos.z,
    )
    const orbitAngle = baseAngle + p * 0.6

    // Distance: close at start, pulls back dramatically
    const closeDist = walkerScale * 2.5
    const farDist = walkerScale * 5.5
    const pullP = THREE.MathUtils.smoothstep(p, 0.5, 0.85)
    const dist = THREE.MathUtils.lerp(closeDist, farDist, pullP)

    // Height: starts slightly above hull, rises for the wide shot
    const closeHeight = hullHeight * 0.6
    const farHeight = hullHeight * 1.4
    const height = THREE.MathUtils.lerp(closeHeight, farHeight, pullP)

    // Apply shake
    const shakeX = (Math.random() - 0.5) * this.shakeIntensity
    const shakeY = (Math.random() - 0.5) * this.shakeIntensity * 0.6

    const camX = wPos.x + Math.sin(orbitAngle) * dist + shakeX
    const camZ = wPos.z + Math.cos(orbitAngle) * dist
    const camY = wPos.y + height + shakeY

    ctx.camera.position.set(camX, camY, camZ)

    // Look at walker hull center
    const lookY = wPos.y + hullHeight * 0.5
    ctx.camera.lookAt(wPos.x, lookY, wPos.z)
  }

  private updateBloom(ctx: GameContext, p: number) {
    // Bloom: peaks at start, fades through the cinematic
    if (p < 0.15) {
      const ramp = p / 0.15
      ctx.postfx.setBloomOverride(THREE.MathUtils.lerp(2.5, 3.5, ramp))
    } else if (p < 0.5) {
      const fade = (p - 0.15) / 0.35
      ctx.postfx.setBloomOverride(THREE.MathUtils.lerp(3.5, 1.2, fade))
    } else {
      const settle = (p - 0.5) / 0.5
      ctx.postfx.setBloomOverride(THREE.MathUtils.lerp(1.2, 0.5, Math.min(1, settle)))
    }
  }

  private updateShake(ctx: GameContext, _dt: number, p: number) {
    // Shake: builds during rise, peaks, settles
    if (p < 0.1) {
      this.shakeIntensity = p / 0.1 * 0.3
    } else if (p < 0.4) {
      this.shakeIntensity = 0.3 + (p - 0.1) / 0.3 * 0.5
    } else if (p < 0.65) {
      this.shakeIntensity = THREE.MathUtils.lerp(0.8, 0.1, (p - 0.4) / 0.25)
    } else {
      this.shakeIntensity = Math.max(0, 0.1 * (1 - (p - 0.65) / 0.35))
    }

    // Feed camera shake to the rig for residual settling
    if (this.shakeIntensity > 0.01) {
      ctx.cameraRig.impulseLanding(this.shakeIntensity * 0.3)
    }
  }

  private spawnDust(walker: WalkerMech) {
    const pos = walker.object3d.position
    const walkerScale = walker.tier === 'assault' ? 3.5 : 3.0
    const count = 40
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xc8b898,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    })

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const r = walkerScale * (0.5 + Math.random() * 1.5)
      const size = 0.15 + Math.random() * 0.35

      const geo = new THREE.SphereGeometry(size, 4, 3)
      const mesh = new THREE.Mesh(geo, dustMat.clone())
      mesh.position.set(
        pos.x + Math.cos(angle) * r,
        pos.y + Math.random() * 0.5,
        pos.z + Math.sin(angle) * r,
      )

      const speed = 2 + Math.random() * 4
      const vel = new THREE.Vector3(
        Math.cos(angle) * speed,
        1.5 + Math.random() * 3,
        Math.sin(angle) * speed,
      )

      const maxLife = 1.5 + Math.random() * 2.0
      this.dust.push({ mesh, vel, life: 0, maxLife })
      this.dustGroup.add(mesh)
    }
  }

  private updateDust(dt: number) {
    for (const d of this.dust) {
      d.life += dt
      const lp = d.life / d.maxLife

      d.vel.y -= 3 * dt
      d.mesh.position.addScaledVector(d.vel, dt)

      const mat = d.mesh.material as THREE.MeshBasicMaterial
      mat.opacity = 0.6 * (1 - lp * lp)

      const scale = 1 + lp * 1.5
      d.mesh.scale.setScalar(scale)
    }
  }

  private finish(ctx: GameContext) {
    // Clean up
    ctx.postfx.setBloomOverride(null)
    this.shakeIntensity = 0

    // Remove dust
    for (const d of this.dust) {
      d.mesh.geometry.dispose()
      ;(d.mesh.material as THREE.Material).dispose()
    }
    ctx.scene.remove(this.dustGroup)

    // Restore Walker to correct Y
    this.walker.object3d.position.y = this.walkerBaseY

    this.onComplete()
  }
}
