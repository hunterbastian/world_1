import * as THREE from 'three'
import type { InputState } from './Input'
import type { Terrain } from '../world/Terrain'

export type PlayerStepEvent = {
  intensity: number
}

export type PlayerOptions = {
  terrain: Terrain
  start: THREE.Vector3
}

const MAT = {
  armor: () => new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.85, metalness: 0.25 }),
  leather: () => new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.95, metalness: 0.05 }),
  cape: () => new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.92, metalness: 0.0, side: THREE.DoubleSide }),
  visor: () => new THREE.MeshStandardMaterial({ color: 0x0a0a0e, emissive: 0x1a2a4a, emissiveIntensity: 0.3, roughness: 0.5, metalness: 0.0 }),
}

function buildKnightModel(): THREE.Group {
  const knight = new THREE.Group()
  knight.name = 'KnightModel'

  const armor = MAT.armor()
  const leather = MAT.leather()

  // --- Boots ---
  const bootL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.28), leather)
  bootL.position.set(-0.12, 0.07, 0)
  knight.add(bootL)

  const bootR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.28), leather)
  bootR.position.set(0.12, 0.07, 0)
  knight.add(bootR)

  // --- Greaves (lower legs) ---
  const greaveL = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 7), armor)
  greaveL.position.set(-0.12, 0.35, 0)
  knight.add(greaveL)

  const greaveR = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.42, 7), armor)
  greaveR.position.set(0.12, 0.35, 0)
  knight.add(greaveR)

  // --- Knee guards ---
  const kneeL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), armor)
  kneeL.position.set(-0.12, 0.56, -0.03)
  knight.add(kneeL)

  const kneeR = new THREE.Mesh(new THREE.SphereGeometry(0.085, 6, 5), armor)
  kneeR.position.set(0.12, 0.56, -0.03)
  knight.add(kneeR)

  // --- Thighs (upper legs) ---
  const thighL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.32, 7), armor)
  thighL.position.set(-0.11, 0.72, 0)
  knight.add(thighL)

  const thighR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.32, 7), armor)
  thighR.position.set(0.11, 0.72, 0)
  knight.add(thighR)

  // --- Belt / waist ---
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.1, 0.22), leather)
  belt.position.set(0, 0.90, 0)
  knight.add(belt)

  const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.03), armor)
  buckle.position.set(0, 0.90, -0.125)
  knight.add(buckle)

  // --- Torso / chest plate ---
  const torsoGeo = new THREE.BoxGeometry(0.40, 0.42, 0.24)
  const torso = new THREE.Mesh(torsoGeo, armor)
  torso.position.set(0, 1.16, 0)
  knight.add(torso)

  // Chest ridge detail
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.04), armor.clone())
  chestPlate.position.set(0, 1.22, -0.14)
  knight.add(chestPlate)

  // --- Pauldrons (shoulder armor) ---
  const pauldronL = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), armor)
  pauldronL.position.set(-0.26, 1.34, 0)
  pauldronL.scale.set(1.1, 0.7, 1.0)
  knight.add(pauldronL)

  const pauldronR = new THREE.Mesh(new THREE.SphereGeometry(0.14, 7, 5, 0, Math.PI * 2, 0, Math.PI * 0.6), armor)
  pauldronR.position.set(0.26, 1.34, 0)
  pauldronR.scale.set(1.1, 0.7, 1.0)
  knight.add(pauldronR)

  // --- Arms ---
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.38, 6), armor)
  armL.position.set(-0.28, 1.10, 0)
  armL.rotation.z = 0.12
  knight.add(armL)

  const armR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.38, 6), armor)
  armR.position.set(0.28, 1.10, 0)
  armR.rotation.z = -0.12
  knight.add(armR)

  // --- Gauntlets ---
  const gauntletL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), armor)
  gauntletL.position.set(-0.30, 0.88, 0)
  knight.add(gauntletL)

  const gauntletR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.12), armor)
  gauntletR.position.set(0.30, 0.88, 0)
  knight.add(gauntletR)

  // --- Neck ---
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, 6), armor)
  neck.position.set(0, 1.40, 0)
  knight.add(neck)

  // --- Helmet ---
  const helmetBase = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.14, 0.22, 8), armor)
  helmetBase.position.set(0, 1.56, 0)
  knight.add(helmetBase)

  const helmetTop = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.5), armor)
  helmetTop.position.set(0, 1.67, 0)
  knight.add(helmetTop)

  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.04, 0.06), MAT.visor())
  visor.position.set(0, 1.54, -0.12)
  knight.add(visor)

  const facePlate = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.03), armor)
  facePlate.position.set(0, 1.50, -0.14)
  knight.add(facePlate)

  // --- Cape ---
  const capeGeo = new THREE.PlaneGeometry(0.38, 0.85, 4, 10)
  const capeMesh = new THREE.Mesh(capeGeo, MAT.cape())
  capeMesh.name = 'Cape'
  capeMesh.position.set(0, 0.97, 0.14)
  knight.add(capeMesh)

  return knight
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

  private readonly walkSpeed = 6.0
  private readonly runSpeed = 9.5
  private readonly accel = 10.0
  private readonly decel = 14.0
  private readonly turnRate = 7.5
  private readonly maxStepUp = 0.85
  private readonly maxClimbSlope = 0.78

  constructor(opts: PlayerOptions) {
    this.terrain = opts.terrain
    this.object3d = new THREE.Group()
    this.object3d.name = 'Player'

    this.model = buildKnightModel()
    this.object3d.add(this.model)
    this.attachCapeFlutter(this.model)

    this.position.copy(opts.start)
    this.object3d.position.copy(this.position)
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

    const move = new THREE.Vector3(input.right, 0, -input.forward)
    if (move.lengthSq() > 1) move.normalize()

    const yawRot = new THREE.Euler(0, cameraYaw, 0)
    move.applyEuler(yawRot)

    const wantsMove = move.lengthSq() > 1e-4

    const sprinting = input.sprint && wantsMove && this.stamina > 0.06
    const maxSpeed = sprinting ? this.runSpeed : this.walkSpeed

    if (sprinting) this.stamina = Math.max(0, this.stamina - dt * 0.24)
    else this.stamina = Math.min(1, this.stamina + dt * 0.18)

    const desiredVel = move.multiplyScalar(maxSpeed)

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

    if (wantsMove) {
      const desiredFacing = new THREE.Vector3(this.velocity.x, 0, this.velocity.z)
      if (desiredFacing.lengthSq() > 1e-5) {
        desiredFacing.normalize()
        this.facing.lerp(desiredFacing, 1 - Math.exp(-this.turnRate * dt))
        this.facing.normalize()
      }
    }

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

    const groundY = this.terrain.heightAtXZ(this.position.x, this.position.z)
    this.position.y = groundY

    this.object3d.position.copy(this.position)

    const yaw = Math.atan2(this.facing.x, this.facing.z)
    this.object3d.rotation.y = yaw

    const speed = Math.hypot(this.velocity.x, this.velocity.z)
    const strideHz = THREE.MathUtils.clamp(speed / 2.6, 0, 4.0)
    const prevPhase = this.stepPhase
    this.stepPhase = (this.stepPhase + dt * strideHz) % 1

    if (strideHz > 0.25 && this.stepPhase < prevPhase) {
      const intensity = THREE.MathUtils.clamp(speed / this.runSpeed, 0.2, 1.0)
      for (const cb of this.stepListeners) cb({ intensity })
    }
  }

  setWind(dirXZ: THREE.Vector2) {
    this.capeWind.copy(dirXZ)
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
