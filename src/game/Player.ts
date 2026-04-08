import * as THREE from 'three'
import type { InputState } from './Input'
import type { Terrain } from '../world/Terrain'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

export type PlayerStepEvent = {
  intensity: number
}

export type PlayerOptions = {
  terrain: Terrain
  start: THREE.Vector3
}

export class Player {
  public readonly object3d: THREE.Object3D
  public readonly model: THREE.Object3D

  public readonly position = new THREE.Vector3()
  public readonly velocity = new THREE.Vector3()
  public readonly facing = new THREE.Vector3(0, 0, -1)

  public stamina = 1

  private readonly terrain: Terrain
  private stepPhase = 0
  private readonly stepListeners = new Set<(e: PlayerStepEvent) => void>()
  private capeMats: THREE.MeshStandardMaterial[] = []
  private capeTime = 0
  private capeWind = new THREE.Vector2(1, 0)

  // Movement tuning (weighty)
  private readonly walkSpeed = 6.0
  private readonly runSpeed = 9.5
  private readonly accel = 10.0
  private readonly decel = 14.0
  private readonly turnRate = 7.5
  // Climb limit per frame (world units). Safer than slope-at-destination alone — discrete
  // heightfields can report huge local slope and trap the player on “flat” ground.
  private readonly maxStepUp = 0.85
  private readonly maxClimbSlope = 0.78

  constructor(opts: PlayerOptions) {
    this.terrain = opts.terrain
    this.object3d = new THREE.Group()
    this.object3d.name = 'Player'

    // Placeholder model (swappable).
    const capsule = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.0, 6, 10),
      new THREE.MeshStandardMaterial({ color: 0x2b2a2f, roughness: 0.85, metalness: 0.15 })
    )
    capsule.position.y = 0.9
    this.model = capsule
    this.object3d.add(this.model)

    this.position.copy(opts.start)
    this.object3d.position.copy(this.position)

    void this.tryLoadKnight()
  }

  onStep(cb: (e: PlayerStepEvent) => void) {
    this.stepListeners.add(cb)
    return () => this.stepListeners.delete(cb)
  }

  update(dt: number, input: InputState, cameraYaw: number) {
    this.capeTime += dt
    for (const m of this.capeMats) {
      const u = (m as any).userData?.__capeUniforms as
        | { uTime: { value: number }; uWind: { value: THREE.Vector2 } }
        | undefined
      if (u) {
        u.uTime.value = this.capeTime
        u.uWind.value.copy(this.capeWind)
      }
    }

    // Camera-relative move intent in XZ plane.
    const move = new THREE.Vector3(input.right, 0, -input.forward)
    if (move.lengthSq() > 1) move.normalize()

    const yawRot = new THREE.Euler(0, cameraYaw, 0)
    move.applyEuler(yawRot)

    const wantsMove = move.lengthSq() > 1e-4

    // Sprint + stamina
    const sprinting = input.sprint && wantsMove && this.stamina > 0.06
    const maxSpeed = sprinting ? this.runSpeed : this.walkSpeed

    if (sprinting) this.stamina = Math.max(0, this.stamina - dt * 0.24)
    else this.stamina = Math.min(1, this.stamina + dt * 0.18)

    const desiredVel = move.multiplyScalar(maxSpeed)

    // Accelerate/decelerate (weighty)
    const currentXZ = new THREE.Vector2(this.velocity.x, this.velocity.z)
    const desiredXZ = new THREE.Vector2(desiredVel.x, desiredVel.z)
    const diff = desiredXZ.clone().sub(currentXZ)
    const diffLen = diff.length()

    const a = wantsMove ? this.accel : this.decel
    const maxDelta = a * dt
    if (diffLen > maxDelta) diff.multiplyScalar(maxDelta / diffLen)
    currentXZ.add(diff)

    this.velocity.x = currentXZ.x
    this.velocity.z = currentXZ.y

    // Deliberate turning toward movement direction.
    if (wantsMove) {
      const desiredFacing = new THREE.Vector3(this.velocity.x, 0, this.velocity.z)
      if (desiredFacing.lengthSq() > 1e-5) {
        desiredFacing.normalize()
        this.facing.lerp(desiredFacing, 1 - Math.exp(-this.turnRate * dt))
        this.facing.normalize()
      }
    }

    // Position integrate: step-up limit + axis slide (avoids getting stuck on mesh slope noise).
    const px = this.position.x
    const pz = this.position.z
    const h0 = this.terrain.heightAtXZ(px, pz)
    const dx = this.velocity.x * dt
    const dz = this.velocity.z * dt

    const tryStep = (sx: number, sz: number): boolean => {
      if (Math.abs(sx) < 1e-6 && Math.abs(sz) < 1e-6) return false
      const nx = px + sx
      const nz = pz + sz
      const h1 = this.terrain.heightAtXZ(nx, nz)
      const climb = h1 - h0
      if (climb > this.maxStepUp) return false
      const slope = this.terrain.slopeAtXZ(nx, nz)
      if (climb > 0.08 && slope > this.maxClimbSlope) return false
      this.position.x = nx
      this.position.z = nz
      return true
    }

    if (!tryStep(dx, dz)) {
      if (!tryStep(dx, 0) && !tryStep(0, dz)) {
        this.velocity.x *= 0.35
        this.velocity.z *= 0.35
      }
    }

    // Stick to terrain height (simple grounding for now)
    const groundY = this.terrain.heightAtXZ(this.position.x, this.position.z)
    this.position.y = groundY

    this.object3d.position.copy(this.position)

    // Orient model to facing
    const yaw = Math.atan2(this.facing.x, this.facing.z)
    this.object3d.rotation.y = yaw

    // Step events (for camera shake + later audio): stride by speed.
    const speed = Math.hypot(this.velocity.x, this.velocity.z)
    const strideHz = THREE.MathUtils.clamp(speed / 2.6, 0, 4.0)
    const prevPhase = this.stepPhase
    this.stepPhase = (this.stepPhase + dt * strideHz) % 1

    // Trigger on phase wrap.
    if (strideHz > 0.25 && this.stepPhase < prevPhase) {
      const intensity = THREE.MathUtils.clamp(speed / this.runSpeed, 0.2, 1.0)
      for (const cb of this.stepListeners) cb({ intensity })
    }
  }

  setWind(dirXZ: THREE.Vector2) {
    this.capeWind.copy(dirXZ)
  }

  private async tryLoadKnight() {
    // Optional: if user provides /public/models/knight.glb, we load it.
    // If it fails, we keep the placeholder capsule.
    const loader = new GLTFLoader()
    try {
      const gltf = await loader.loadAsync('/models/knight.glb')
      this.object3d.remove(this.model)
      this.object3d.add(gltf.scene)
      this.attachCapeFlutter(gltf.scene)
    } catch {
      // ignore
    }
  }

  private attachCapeFlutter(root: THREE.Object3D) {
    this.capeMats = []
    root.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      if (typeof mesh.name !== 'string') return
      if (mesh.name.toLowerCase() !== 'cape') return

      const mat = mesh.material
      if (!(mat instanceof THREE.MeshStandardMaterial)) return
      this.patchCapeMaterial(mat)
      this.capeMats.push(mat)
    })
  }

  private patchCapeMaterial(mat: THREE.MeshStandardMaterial) {
    if ((mat as any).__capePatched) return
    ;(mat as any).__capePatched = true

    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCapeTime = { value: 0 }
      shader.uniforms.uCapeWind = { value: new THREE.Vector2(1, 0) }

      // Keep refs for per-frame updates.
      ;(mat as any).userData = (mat as any).userData ?? {}
      ;(mat as any).userData.__capeUniforms = {
        uTime: shader.uniforms.uCapeTime,
        uWind: shader.uniforms.uCapeWind,
      }

      shader.vertexShader =
        /* glsl */ `
          uniform float uCapeTime;
          uniform vec2 uCapeWind;
        ` + shader.vertexShader

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        /* glsl */ `
          #include <begin_vertex>

          // Cape flutter: stronger toward the hem (lower Y in local space).
          // Assumes cape is modeled with Y up; adjust by authoring if needed.
          float w = clamp((position.y + 0.2) / 1.8, 0.0, 1.0);
          w = 1.0 - w;

          vec2 wind = normalize(uCapeWind);
          float phase = (position.x * 1.7 + position.y * 0.9 + position.z * 1.2);
          float flutter = sin(uCapeTime * 3.2 + phase) * 0.06 + sin(uCapeTime * 5.1 + phase * 0.7) * 0.03;

          transformed.x += wind.x * flutter * (0.35 + 0.65 * w);
          transformed.z += wind.y * flutter * (0.35 + 0.65 * w);
          transformed.y += abs(flutter) * 0.03 * w;
        `
      )
    }

    mat.needsUpdate = true
  }
}

