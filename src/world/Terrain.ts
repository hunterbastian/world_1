import * as THREE from 'three'
import { Biome, type BiomeId, biomeIndex } from './Biomes'
import { fbm2, makeNoise2D, ridge2 } from './noise'
import { makeTerrainMaterial } from '../render/TerrainShader'

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

    this.material = makeTerrainMaterial() as any

    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;
      ` + shader.vertexShader

      shader.vertexShader = shader.vertexShader.replace(
        '#include <worldpos_vertex>',
        /* glsl */ `
          #include <worldpos_vertex>
          vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
          vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
        `
      )

      shader.fragmentShader = /* glsl */ `
        varying vec3 vWorldPos;
        varying vec3 vWorldNormal;

        float terrainHash(vec2 p) {
          p = fract(p * vec2(123.34, 345.45));
          p += dot(p, p + 34.345);
          return fract(p.x * p.y);
        }
        float terrainNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          float a = terrainHash(i);
          float b = terrainHash(i + vec2(1.0, 0.0));
          float c = terrainHash(i + vec2(0.0, 1.0));
          float d = terrainHash(i + vec2(1.0, 1.0));
          vec2 u = f * f * (3.0 - 2.0 * f);
          return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
        }
        float terrainFbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 3; i++) {
            v += a * terrainNoise(p);
            p *= 2.03;
            a *= 0.47;
          }
          return v;
        }
      ` + shader.fragmentShader

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <dithering_fragment>',
        /* glsl */ `
          // Slope-based rock blending
          vec3 wN = normalize(vWorldNormal);
          float slopeAmt = 1.0 - wN.y;

          // Triplanar rock noise
          vec3 blendW = abs(wN);
          blendW = max(blendW - 0.2, 0.001);
          blendW = pow(blendW, vec3(4.0));
          blendW /= (blendW.x + blendW.y + blendW.z);
          float rockN = terrainFbm(vWorldPos.yz * 0.12) * blendW.x
                      + terrainFbm(vWorldPos.xz * 0.12) * blendW.y
                      + terrainFbm(vWorldPos.xy * 0.12) * blendW.z;

          vec3 rockCol = mix(vec3(0.42, 0.40, 0.44), vec3(0.34, 0.33, 0.36), rockN);
          float rockBlend = smoothstep(0.32, 0.58, slopeAmt);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, rockCol, rockBlend);

          float detail = terrainFbm(vWorldPos.xz * 0.3);
          gl_FragColor.rgb += (detail - 0.5) * 0.02;

          float shoreFade = smoothstep(-2.0, 1.0, vWorldPos.y);
          gl_FragColor.rgb *= 0.90 + 0.10 * shoreFade;

          #include <dithering_fragment>
        `
      )
    }
    this.material.needsUpdate = true

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
    if (b === biomeIndex('deep_forest')) return 'deep_forest'
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

    for (let pass = 0; pass < 2; pass++) {
      const strict = pass === 0
      const attempts = strict ? 800 : 500
      const maxSlope = strict ? 0.12 : 0.25
      const maxHeight = strict ? 18 : 30

      for (let i = 0; i < attempts; i++) {
        const r = Math.sqrt(rand()) * (half * (strict ? 0.35 : 0.50))
        const a = rand() * Math.PI * 2
        const x = Math.cos(a) * r
        const z = Math.sin(a) * r

        const y = this.heightAtXZ(x, z)
        if (y < this.seaLevel + 2.0) continue
        if (y > maxHeight) continue

        const biome = this.biomeAtXZ(x, z)
        if (strict && biome !== 'grassy_plains') continue
        if (!strict && biome === 'snowy_mountains') continue

        const slope = this.slopeAtXZ(x, z)
        if (slope > maxSlope) continue

        // Two rings of neighbor checks: 15 and 30 units out
        let neighborOk = true
        let neighborSlopeSum = 0
        for (const ring of [15, 30]) {
          for (let n = 0; n < 8; n++) {
            const na = (n / 8) * Math.PI * 2
            const nx = x + Math.cos(na) * ring
            const nz = z + Math.sin(na) * ring
            const nb = this.biomeAtXZ(nx, nz)
            const ns = this.slopeAtXZ(nx, nz)
            neighborSlopeSum += ns
            const slopeLimit = ring === 15
              ? (strict ? 0.22 : 0.35)
              : (strict ? 0.35 : 0.50)
            if (nb === 'snowy_mountains' || ns > slopeLimit) {
              neighborOk = false
              break
            }
          }
          if (!neighborOk) break
        }
        if (!neighborOk) continue

        const avgNeighborSlope = neighborSlopeSum / 16
        const flatScore = 1 / (0.05 + slope + avgNeighborSlope * 0.5)
        const elevScore = 1 - Math.abs(y - 5) / 20
        const biomeBonus = biome === 'grassy_plains' ? 1.5 : 0
        const score = flatScore * 3.0 + elevScore * 0.8 + biomeBonus

        if (score > bestScore) {
          bestScore = score
          bestX = x
          bestZ = z
        }
      }

      if (bestScore > -Infinity) break
    }

    const y = this.heightAtXZ(bestX, bestZ)
    const spawnBiome = this.biomeAtXZ(bestX, bestZ)
    const spawnSlope = this.slopeAtXZ(bestX, bestZ)
    console.info(`[spawn] pos=(${bestX.toFixed(0)}, ${y.toFixed(1)}, ${bestZ.toFixed(0)}) biome=${spawnBiome} slope=${spawnSlope.toFixed(3)} score=${bestScore.toFixed(1)}`)
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
      const forest = biomeIndex('deep_forest')
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

      // Grassland basin: suppress mountains near world center so player has a
      // guaranteed flat starting area. Basin radius ~30% of half-size, smooth falloff.
      const distFromCenter = Math.hypot(x, z)
      const basinRadius = half * 0.30
      const basinFalloff = THREE.MathUtils.smoothstep(distFromCenter, basinRadius * 0.5, basinRadius)
      const localMountainMask = mountainMask * basinFalloff
      const localRegion = region * (0.3 + 0.7 * basinFalloff)

      let h = rolling + uplift * localRegion + mountains * localMountainMask

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

      h = Math.max(h, this.seaLevel - 8)

      const forestMask = THREE.MathUtils.smoothstep(
        fbm2(forestNoise, (x + half) * forestScale, (z + half) * forestScale, 3, 2, 0.5),
        -0.1,
        0.35
      )

      let biome: BiomeId = 'grassy_plains'
      if ((h > snowLine || localMountainMask > 0.55) && basinFalloff > 0.5) biome = 'snowy_mountains'
      else if (forestMask > 0.5 && h > this.seaLevel + 1 && basinFalloff > 0.3) biome = 'deep_forest'

      this.heightField[i] = h
      this.biomeField[i] = biomeIndex(biome)

      pos.setY(i, h)

      const detailNoise = fbm2(baseNoise, x * 0.02, z * 0.02, 2, 2, 0.5)
      const microNoise = fbm2(forestNoise, x * 0.08, z * 0.08, 2, 2, 0.5)

      // Continuous blend weights for smooth biome transitions.
      // The discrete biomeField stays hard-edged for game logic, but
      // vertex colors use soft boundaries derived from the same noise.
      const snowRaw =
        THREE.MathUtils.smoothstep(localMountainMask, 0.35, 0.70) * THREE.MathUtils.smoothstep(basinFalloff, 0.35, 0.65)
        + THREE.MathUtils.smoothstep(h, snowLine - 6, snowLine + 8) * 0.45
      const snowW = THREE.MathUtils.clamp(snowRaw, 0, 1)

      const aboveSea = THREE.MathUtils.smoothstep(h, this.seaLevel, this.seaLevel + 3)
      const forestRaw =
        THREE.MathUtils.smoothstep(forestMask, 0.28, 0.62)
        * (1 - snowW * 0.85)
        * aboveSea
        * THREE.MathUtils.smoothstep(basinFalloff, 0.18, 0.42)
      const forestW = THREE.MathUtils.clamp(forestRaw, 0, 1)

      const plainsW = THREE.MathUtils.clamp(1 - snowW - forestW, 0, 1)

      // Per-biome color with detail noise (same as before, computed independently)
      const cPlains = new THREE.Color(Biome.grassy_plains.baseColor)
      const warm = new THREE.Color(0x7cc850)
      const cool = new THREE.Color(0x4a9440)
      cPlains.lerp(warm, detailNoise * 0.5 + 0.5)
      cPlains.lerp(cool, THREE.MathUtils.clamp(microNoise * 0.3 + 0.15, 0, 0.4))
      const elevFade = THREE.MathUtils.clamp((h - 2) / 15, 0, 1)
      cPlains.lerp(new THREE.Color(0x6aad4e), elevFade * 0.15)

      const cForest = new THREE.Color(Biome.deep_forest.baseColor)
      const canopy = new THREE.Color(0x1f5c2d)
      const moss = new THREE.Color(0x3d7a3a)
      cForest.lerp(canopy, THREE.MathUtils.clamp(detailNoise * 0.4 + 0.3, 0, 0.6))
      cForest.lerp(moss, THREE.MathUtils.clamp(microNoise * 0.25, 0, 0.3))
      const shade = THREE.MathUtils.clamp(1 - localMountainMask * 0.3, 0.7, 1)
      cForest.multiplyScalar(shade)

      const cSnow = new THREE.Color(Biome.snowy_mountains.baseColor)
      const rock = new THREE.Color(0x6c717a)
      const snowT = THREE.MathUtils.clamp((h - snowLine) / 35, 0, 1)
      cSnow.lerp(rock, 1 - snowT)
      cSnow.lerp(new THREE.Color(0x8090a0), THREE.MathUtils.clamp(detailNoise * 0.15, 0, 0.2))

      // Weighted blend
      const c = new THREE.Color(
        cPlains.r * plainsW + cForest.r * forestW + cSnow.r * snowW,
        cPlains.g * plainsW + cForest.g * forestW + cSnow.g * snowW,
        cPlains.b * plainsW + cForest.b * forestW + cSnow.b * snowW,
      )

      color.setXYZ(i, c.r, c.g, c.b)
    }

    // Carve 1–2 “Skyrim-style” passes up the mega-mountain so traversal has intended routes.
    this.carveMountainPasses(seed)

    this.geometry.setAttribute('color', color)
    this.geometry.computeVertexNormals()
    pos.needsUpdate = true
    color.needsUpdate = true

    const biomeAttr = new Float32Array(pos.count)
    const slopeAttr = new Float32Array(pos.count)
    for (let i = 0; i < pos.count; i++) {
      biomeAttr[i] = this.biomeField[i] ?? 0
      slopeAttr[i] = this.slopeAtXZ(pos.getX(i), pos.getZ(i))
    }
    this.geometry.setAttribute('aBiome', new THREE.BufferAttribute(biomeAttr, 1))
    this.geometry.setAttribute('aSlope', new THREE.BufferAttribute(slopeAttr, 1))
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

