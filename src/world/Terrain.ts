import * as THREE from 'three'
import { Biome, type BiomeId, biomeIndex } from './Biomes'
import { fbm2, makeNoise2D, ridge2 } from './noise'

export type TerrainOptions = {
  size: number
  segments: number
  seed: string
  seaLevel: number
}

export class Terrain {
  public readonly object3d: THREE.Object3D
  public readonly mesh: THREE.Mesh
  public readonly geometry: THREE.PlaneGeometry
  public readonly material: THREE.MeshStandardMaterial

  public readonly size: number
  public readonly segments: number
  public readonly seaLevel: number
  public readonly megaMountainCenterXZ = new THREE.Vector2(0, 0)
  public megaMountainRadius = 0

  private readonly heightField: Float32Array
  private readonly biomeField: Uint8Array

  constructor(opts: TerrainOptions) {
    this.size = opts.size
    this.segments = opts.segments
    this.seaLevel = opts.seaLevel

    this.object3d = new THREE.Group()
    this.object3d.name = 'Terrain'

    this.geometry = new THREE.PlaneGeometry(this.size, this.size, this.segments, this.segments)
    this.geometry.rotateX(-Math.PI / 2)

    this.material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 1,
      metalness: 0,
    })

    this.mesh = new THREE.Mesh(this.geometry, this.material)
    this.mesh.receiveShadow = true
    this.object3d.add(this.mesh)

    const vertCount = (this.segments + 1) * (this.segments + 1)
    this.heightField = new Float32Array(vertCount)
    this.biomeField = new Uint8Array(vertCount)

    this.generate(opts.seed)
  }

  heightAtXZ(x: number, z: number) {
    const half = this.size * 0.5
    const u = (x + half) / this.size
    const v = (z + half) / this.size
    if (u < 0 || u > 1 || v < 0 || v > 1) return this.seaLevel

    const gx = u * this.segments
    const gz = v * this.segments
    const x0 = Math.floor(gx)
    const z0 = Math.floor(gz)
    const x1 = Math.min(this.segments, x0 + 1)
    const z1 = Math.min(this.segments, z0 + 1)
    const tx = gx - x0
    const tz = gz - z0

    const idx = (xi: number, zi: number) => zi * (this.segments + 1) + xi
    const h00 = this.heightField[idx(x0, z0)]!
    const h10 = this.heightField[idx(x1, z0)]!
    const h01 = this.heightField[idx(x0, z1)]!
    const h11 = this.heightField[idx(x1, z1)]!

    const hx0 = THREE.MathUtils.lerp(h00, h10, tx)
    const hx1 = THREE.MathUtils.lerp(h01, h11, tx)
    return THREE.MathUtils.lerp(hx0, hx1, tz)
  }

  biomeAtXZ(x: number, z: number): BiomeId {
    const half = this.size * 0.5
    const u = (x + half) / this.size
    const v = (z + half) / this.size
    if (u < 0 || u > 1 || v < 0 || v > 1) return 'grassy_plains'
    const xi = Math.round(u * this.segments)
    const zi = Math.round(v * this.segments)
    const index = zi * (this.segments + 1) + xi
    const b = this.biomeField[index] ?? 0
    if (b === biomeIndex('snowy_mountains')) return 'snowy_mountains'
    if (b === biomeIndex('autumn_forest')) return 'autumn_forest'
    return 'grassy_plains'
  }

  slopeAtXZ(x: number, z: number) {
    // Approximate slope magnitude via finite difference on height.
    const e = 2.0
    const hL = this.heightAtXZ(x - e, z)
    const hR = this.heightAtXZ(x + e, z)
    const hD = this.heightAtXZ(x, z - e)
    const hU = this.heightAtXZ(x, z + e)
    const dx = (hR - hL) / (2 * e)
    const dz = (hU - hD) / (2 * e)
    return Math.hypot(dx, dz)
  }

  findFlatSpawn(seed = 1337) {
    // Pick a mostly-flat location (prefer plains/forest) above sea level.
    const half = this.size * 0.5
    let s = seed >>> 0
    const rand = () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      return (s >>> 0) / 0xffffffff
    }

    let bestX = 0
    let bestZ = 0
    let bestScore = -Infinity

    const attempts = 260
    for (let i = 0; i < attempts; i++) {
      // Bias toward center so spawn isn't on coast.
      const r = Math.sqrt(rand()) * (half * 0.55)
      const a = rand() * Math.PI * 2
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r

      const y = this.heightAtXZ(x, z)
      if (y < this.seaLevel + 1.5) continue

      const biome = this.biomeAtXZ(x, z)
      if (biome === 'snowy_mountains') continue

      const slope = this.slopeAtXZ(x, z)
      // Never spawn on steep ground (avoids immediate movement dead-zones on noisy heightfields).
      if (slope > 0.22) continue

      // Lower slope is better; moderate elevation preferred.
      const flatScore = 1 / (0.12 + slope)
      const elevScore = 1 - Math.abs(y - 6) / 18
      const biomeScore = biome === 'grassy_plains' ? 1.0 : 0.85
      const score = flatScore * 2.4 + elevScore * 0.6 + biomeScore * 0.35

      if (score > bestScore) {
        bestScore = score
        bestX = x
        bestZ = z
      }
    }

    const y = this.heightAtXZ(bestX, bestZ)
    return new THREE.Vector3(bestX, y, bestZ)
  }

  carveRiverChannels(paths: readonly THREE.Vector3[], width: number, depth: number) {
    if (paths.length < 2) return

    const pos = this.geometry.attributes.position as THREE.BufferAttribute
    const sampleCount = Math.max(64, Math.min(512, paths.length))

    // Downsample long paths for cheaper distance checks.
    const samples: THREE.Vector3[] = []
    for (let i = 0; i < sampleCount; i++) {
      const t = i / (sampleCount - 1)
      const idx = Math.floor(t * (paths.length - 1))
      samples.push(paths[idx]!.clone())
    }

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      // Quick reject outside expanded AABB of the river samples.
      // (Keeps carving pass cheap for large terrains.)
      let minDist2 = Infinity
      for (let s = 0; s < samples.length; s++) {
        const dx = x - samples[s]!.x
        const dz = z - samples[s]!.z
        const d2 = dx * dx + dz * dz
        if (d2 < minDist2) minDist2 = d2
      }

      const dist = Math.sqrt(minDist2)
      if (dist > width) continue

      const t = 1 - dist / Math.max(1e-6, width)
      const profile = t * t * (3 - 2 * t) // smoothstep-ish
      const delta = -depth * profile

      const newY = pos.getY(i) + delta
      pos.setY(i, newY)
      this.heightField[i] = newY

      // If carving reaches below sea level, gently clamp so ocean/river meet cleanly.
      if (newY < this.seaLevel - 2) {
        const clamped = this.seaLevel - 2
        pos.setY(i, clamped)
        this.heightField[i] = clamped
      }

      // Update biome if we carved deep into lowlands (keeps visuals coherent).
      // (Snow stays snow; forest stays forest.)
      const b = this.biomeField[i] ?? 0
      const snow = biomeIndex('snowy_mountains')
      const forest = biomeIndex('autumn_forest')
      if (b !== snow && b !== forest) this.biomeField[i] = biomeIndex('grassy_plains')
    }

    pos.needsUpdate = true
    this.geometry.computeVertexNormals()
  }

  private generate(seed: string) {
    const baseNoise = makeNoise2D(`${seed}:base`)
    const ridgeNoise = makeNoise2D(`${seed}:ridge`)
    const forestNoise = makeNoise2D(`${seed}:forest`)
    const tempNoise = makeNoise2D(`${seed}:temp`)

    const pos = this.geometry.attributes.position
    const color = new THREE.Float32BufferAttribute(pos.count * 3, 3)

    const half = this.size * 0.5

    // Tuning knobs (kept intentionally simple for iteration).
    const baseScale = 1 / 220
    const ridgeScale = 1 / 180
    const forestScale = 1 / 260
    const tempScale = 1 / 500

    const plainsAmp = 9
    const mountainAmp = 70
    const uplift = 10
    const snowLine = 30

    // Deterministic mega-mountain landmark (distinct, traversable).
    let s = 2166136261 >>> 0
    for (let i = 0; i < seed.length; i++) {
      s ^= seed.charCodeAt(i)
      s = Math.imul(s, 16777619)
    }
    const rand01 = () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      return (s >>> 0) / 0xffffffff
    }
    const mmR = this.size * 0.18
    const mmX = (rand01() * 2 - 1) * (half * 0.55)
    const mmZ = (rand01() * 2 - 1) * (half * 0.55)
    this.megaMountainCenterXZ.set(mmX, mmZ)
    this.megaMountainRadius = mmR
    const mmStrength = 62
    const mmDetail = makeNoise2D(`${seed}:mega`)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const z = pos.getZ(i)

      const nx = (x + half) * baseScale
      const nz = (z + half) * baseScale

      const base = fbm2(baseNoise, nx, nz, 5, 2, 0.5) // [-1,1]
      const rolling = base * plainsAmp

      const r = fbm2(ridgeNoise, (x + half) * ridgeScale, (z + half) * ridgeScale, 4, 2.1, 0.55)
      const ridge = ridge2(r) // [0,1-ish]
      const mountainMask = THREE.MathUtils.smoothstep(ridge, 0.35, 0.75)
      const mountains = (ridge * ridge) * mountainAmp

      // Large-scale uplift so mountains feel like regions.
      const temp = fbm2(tempNoise, (x + half) * tempScale, (z + half) * tempScale, 2, 2, 0.5)
      const region = THREE.MathUtils.smoothstep(temp, -0.2, 0.4)

      let h = rolling + uplift * region + mountains * mountainMask

      // Mega-mountain uplift: broad recognizable massif + slight ridge detail.
      const dx = x - mmX
      const dz = z - mmZ
      const d = Math.hypot(dx, dz)
      if (d < mmR) {
        const t = 1 - d / mmR
        const falloff = t * t * (3 - 2 * t)
        const n = fbm2(mmDetail, (x + half) * (1 / 160), (z + half) * (1 / 160), 2, 2.15, 0.55)
        const detail = (n * 0.5 + 0.5) * 0.55 + 0.45
        h += mmStrength * falloff * detail
      }

      // Keep coasts readable by gently easing up very low elevations (until oceans are in).
      h = Math.max(h, this.seaLevel - 8)

      const forestMask = THREE.MathUtils.smoothstep(
        fbm2(forestNoise, (x + half) * forestScale, (z + half) * forestScale, 3, 2, 0.5),
        -0.1,
        0.35
      )

      let biome: BiomeId = 'grassy_plains'
      if (h > snowLine || mountainMask > 0.55) biome = 'snowy_mountains'
      else if (forestMask > 0.5 && h > this.seaLevel + 1) biome = 'autumn_forest'

      this.heightField[i] = h
      this.biomeField[i] = biomeIndex(biome)

      pos.setY(i, h)

      const c = new THREE.Color(Biome[biome].baseColor)

      // Slight elevation tint so mountains read even before post-processing.
      if (biome === 'snowy_mountains') {
        const rock = new THREE.Color(0x6c717a)
        const snowT = THREE.MathUtils.clamp((h - snowLine) / 35, 0, 1)
        c.lerp(rock, 1 - snowT)
      }

      // Debug-friendly: push forest warmer, plains greener.
      color.setXYZ(i, c.r, c.g, c.b)
    }

    // Carve 1–2 “Skyrim-style” passes up the mega-mountain so traversal has intended routes.
    this.carveMountainPasses(seed)

    this.geometry.setAttribute('color', color)
    this.geometry.computeVertexNormals()
    pos.needsUpdate = true
    color.needsUpdate = true
  }

  private carveMountainPasses(seed: string) {
    const c = this.megaMountainCenterXZ
    const r = this.megaMountainRadius || this.size * 0.18

    // Deterministic but stable per seed.
    let s = 1469598103 >>> 0
    for (let i = 0; i < seed.length; i++) {
      s ^= seed.charCodeAt(i)
      s = Math.imul(s, 16777619)
    }
    const rand01 = () => {
      s ^= s << 13
      s ^= s >>> 17
      s ^= s << 5
      return (s >>> 0) / 0xffffffff
    }

    const makeSpiral = (turns: number, a0: number) => {
      const pts: THREE.Vector3[] = []
      const steps = 160
      const startR = r * 1.05
      const endR = r * 0.35
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1)
        const ang = a0 + t * (Math.PI * 2) * turns
        const rr = THREE.MathUtils.lerp(startR, endR, t)
        const x = c.x + Math.cos(ang) * rr
        const z = c.y + Math.sin(ang) * rr
        const y = this.heightAtXZ(x, z)
        pts.push(new THREE.Vector3(x, y, z))
      }
      return pts
    }

    const passA = makeSpiral(1.25, rand01() * Math.PI * 2)
    // Wider/deeper main switchback so it reads and remains usable under slope gating.
    this.carveRiverChannels(passA, 10.5, 3.1)

    // Optional second pass from a different approach angle.
    if (rand01() > 0.35) {
      const passB = makeSpiral(0.9, rand01() * Math.PI * 2 + 1.7)
      this.carveRiverChannels(passB, 8.5, 2.4)
    }
  }
}

