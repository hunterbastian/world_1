import * as THREE from 'three'
import type { Terrain } from './Terrain'
import { Biome, type BiomeId } from './Biomes'
import type { QualityTier } from '../game/PerformanceManager'

type VegetationOptions = {
  seed: string
  terrain: Terrain
}

function hash01(seed: string) {
  let h = 2166136261 >>> 0
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 0xffffffff
}

function makeRng(seed: string) {
  let s = Math.floor(hash01(seed) * 0x7fffffff) || 1
  return () => {
    s = (Math.imul(48271, s) % 0x7fffffff) >>> 0
    return s / 0x7fffffff
  }
}

export class Vegetation {
  public readonly object3d: THREE.Object3D

  private readonly mats: THREE.ShaderMaterial[] = []
  private time = 0
  private quality: QualityTier = 'high'

  private forestMesh: THREE.InstancedMesh | null = null
  private pineMesh: THREE.InstancedMesh | null = null
  private forestFilled = 0
  private pineFilled = 0
  private forestCapacity = 0
  private pineCapacity = 0

  constructor(opts: VegetationOptions) {
    this.object3d = new THREE.Group()
    this.object3d.name = 'Vegetation'

    const rng = makeRng(`${opts.seed}:veg`)

    const forestTrees = this.makeTreeInstanced({
      kind: 'deciduous',
      colorA: new THREE.Color(0x4a9e3f),
      colorB: new THREE.Color(0x2d7a35),
      trunk: new THREE.Color(0x5a3d28),
      count: 2800,
    })
    const pineTrees = this.makeTreeInstanced({
      kind: 'pine',
      colorA: new THREE.Color(0x2a5e35),
      colorB: new THREE.Color(0x1a4528),
      trunk: new THREE.Color(0x4a3220),
      count: 800,
    })

    this.object3d.add(forestTrees)
    this.object3d.add(pineTrees)

    this.forestMesh = forestTrees as THREE.InstancedMesh
    this.pineMesh = pineTrees as THREE.InstancedMesh
    this.forestCapacity = (forestTrees as THREE.InstancedMesh).count
    this.pineCapacity = (pineTrees as THREE.InstancedMesh).count

    // Scatter instances with biome-dependent density.
    const half = opts.terrain.size * 0.5
    const scatterAttempts = 20000
    const tmp = new THREE.Object3D()
    let forestIdx = 0
    let pineIdx = 0

    for (let i = 0; i < scatterAttempts; i++) {
      const x = (rng() * 2 - 1) * half
      const z = (rng() * 2 - 1) * half
      const y = opts.terrain.heightAtXZ(x, z)

      const biome: BiomeId = opts.terrain.biomeAtXZ(x, z)
      const density = Biome[biome].treeDensity
      if (rng() > density) continue

      const isPine = biome === 'snowy_mountains' || (biome === 'grassy_plains' && rng() < 0.2)
      const mesh = isPine ? pineTrees : forestTrees
      const idx = isPine ? pineIdx++ : forestIdx++
      if (idx >= (mesh.count ?? 0)) continue

      const s = isPine ? THREE.MathUtils.lerp(1.2, 2.2, rng()) : THREE.MathUtils.lerp(0.9, 1.8, rng())
      tmp.position.set(x, y + 0.06, z)
      tmp.rotation.set(0, rng() * Math.PI * 2, 0)
      tmp.scale.setScalar(s)
      tmp.updateMatrix()
      ;(mesh as THREE.InstancedMesh).setMatrixAt(idx, tmp.matrix)
    }

    ;(forestTrees as THREE.InstancedMesh).instanceMatrix.needsUpdate = true
    ;(pineTrees as THREE.InstancedMesh).instanceMatrix.needsUpdate = true

    // Track how many were actually filled so we can reduce draw cost without re-scattering.
    this.forestFilled = forestIdx
    this.pineFilled = pineIdx

    this.applyQualityImmediately()
  }

  update(dt: number, windDirXZ: THREE.Vector2) {
    this.time += dt
    for (const m of this.mats) {
      m.uniforms.uTime.value = this.time
      m.uniforms.uWind.value.set(windDirXZ.x, windDirXZ.y)
    }
  }

  setQuality(tier: QualityTier) {
    this.quality = tier
    this.applyQualityImmediately()
  }

  private applyQualityImmediately() {
    const factor = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.8 : 0.6
    if (this.forestMesh) this.forestMesh.count = Math.max(0, Math.min(this.forestCapacity, Math.floor(this.forestFilled * factor)))
    if (this.pineMesh) this.pineMesh.count = Math.max(0, Math.min(this.pineCapacity, Math.floor(this.pineFilled * factor)))

    const sway = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.85 : 0.7
    for (const m of this.mats) m.uniforms.uSwayScale.value = sway
  }

  private makeTreeInstanced(opts: {
    kind: 'deciduous' | 'pine'
    colorA: THREE.Color
    colorB: THREE.Color
    trunk: THREE.Color
    count: number
  }) {
    const geo = makeTreeGeometry(opts.kind)
    const mat = makeTreeWindMaterial()
    mat.uniforms.uLeafA.value = opts.colorA
    mat.uniforms.uLeafB.value = opts.colorB
    mat.uniforms.uTrunk.value = opts.trunk

    this.mats.push(mat)

    const mesh = new THREE.InstancedMesh(geo, mat, opts.count)
    mesh.frustumCulled = true
    mesh.castShadow = false
    mesh.receiveShadow = false
    return mesh
  }
}

function makeTreeGeometry(kind: 'deciduous' | 'pine') {
  const trunk = new THREE.CylinderGeometry(0.12, 0.18, 1.4, 6, 1)
  trunk.translate(0, 0.7, 0)

  const canopy =
    kind === 'pine'
      ? new THREE.ConeGeometry(0.75, 1.9, 7, 1)
      : new THREE.DodecahedronGeometry(0.85, 0)
  canopy.translate(0, kind === 'pine' ? 2.0 : 2.1, 0)

  const geo = mergeGeometries([trunk, canopy])

  // Attribute to separate trunk vs leaves in shader
  const trunkCount = trunk.attributes.position.count
  const total = geo.attributes.position.count
  const isLeaf = new Float32Array(total)
  for (let i = 0; i < total; i++) isLeaf[i] = i >= trunkCount ? 1 : 0
  geo.setAttribute('aIsLeaf', new THREE.BufferAttribute(isLeaf, 1))

  return geo
}

function mergeGeometries(geos: THREE.BufferGeometry[]) {
  // Simple manual merge for position/normal/uv only (good enough for our low-poly).
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  let indexOffset = 0
  for (const g of geos) {
    const pos = g.getAttribute('position')
    const nor = g.getAttribute('normal')
    const uv = g.getAttribute('uv')
    const idx = g.getIndex()

    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
      normals.push(nor.getX(i), nor.getY(i), nor.getZ(i))
      if (uv) uvs.push(uv.getX(i), uv.getY(i))
      else uvs.push(0, 0)
    }

    if (idx) {
      for (let i = 0; i < idx.count; i++) indices.push(idx.getX(i) + indexOffset)
    } else {
      for (let i = 0; i < pos.count; i++) indices.push(i + indexOffset)
    }

    indexOffset += pos.count
  }

  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  out.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  out.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  out.setIndex(indices)
  out.computeVertexNormals()
  return out
}

function makeTreeWindMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector2(1, 0) },
      uLeafA: { value: new THREE.Color(0x4f7d3a) },
      uLeafB: { value: new THREE.Color(0x9a7a2a) },
      uTrunk: { value: new THREE.Color(0x4a3425) },
      uSwayScale: { value: 1.0 },
    },
    vertexShader: /* glsl */ `
      attribute float aIsLeaf;
      varying float vIsLeaf;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      uniform float uTime;
      uniform vec2 uWind;
      uniform float uSwayScale;

      void main() {
        vIsLeaf = aIsLeaf;

        vec3 p = position;
        float w = clamp((p.y - 0.4) / 2.2, 0.0, 1.0);
        float phase = (instanceMatrix[3].x + instanceMatrix[3].z) * 0.15;

        vec2 wind = normalize(uWind);
        float sway = sin(uTime * 1.3 + phase) * 0.16 + sin(uTime * 2.1 + phase * 1.7) * 0.06;
        p.xz += wind * sway * uSwayScale * w * (0.35 + 0.65 * aIsLeaf);

        vec4 wp = modelMatrix * instanceMatrix * vec4(p, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix * instanceMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying float vIsLeaf;
      varying vec3 vNormalW;
      varying vec3 vWorldPos;
      uniform vec3 uLeafA;
      uniform vec3 uLeafB;
      uniform vec3 uTrunk;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      void main() {
        vec3 N = normalize(vNormalW);
        vec3 V = normalize(cameraPosition - vWorldPos);
        float rim = pow(1.0 - max(0.0, dot(N, V)), 2.0);

        float n = hash(vWorldPos.xz * 0.8);
        vec3 leaf = mix(uLeafA, uLeafB, n);
        vec3 col = mix(uTrunk, leaf, vIsLeaf);
        col += rim * 0.08 * vIsLeaf;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })
}

