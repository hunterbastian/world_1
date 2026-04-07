import * as THREE from 'three'
import type { Terrain } from './Terrain'

type WaterOptions = {
  seed: string
  seaLevel: number
  riverCount: number
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

export class Water {
  public readonly object3d: THREE.Object3D
  public readonly ocean: THREE.Mesh
  public readonly rivers: THREE.Mesh[] = []

  private readonly oceanMat: THREE.ShaderMaterial
  private readonly riverMats: THREE.ShaderMaterial[] = []

  private t = 0

  constructor(terrain: Terrain, opts: WaterOptions) {
    this.object3d = new THREE.Group()
    this.object3d.name = 'Water'

    this.oceanMat = makeOceanMaterial()
    this.ocean = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000, 1, 1), this.oceanMat)
    this.ocean.rotation.x = -Math.PI / 2
    this.ocean.position.y = opts.seaLevel
    this.ocean.renderOrder = 0
    this.object3d.add(this.ocean)

    const rng = makeRng(`${opts.seed}:rivers`)

    const riverPaths: THREE.Vector3[][] = []
    for (let i = 0; i < opts.riverCount; i++) {
      const path = this.generateDownhillPath(terrain, rng, opts.seaLevel, i)
      if (path.length >= 12) riverPaths.push(path)
    }

    // Carve terrain first so rivers sit in channels.
    for (const path of riverPaths) {
      terrain.carveRiverChannels(path, 10, 5)
    }

    // Build river meshes.
    for (const path of riverPaths) {
      const curve = new THREE.CatmullRomCurve3(path, false, 'catmullrom', 0.25)
      const geo = buildRiverRibbon(curve, { width: 6, segments: 420 })
      const mat = makeRiverMaterial()
      const mesh = new THREE.Mesh(geo, mat)
      mesh.renderOrder = 1
      this.riverMats.push(mat)
      this.rivers.push(mesh)
      this.object3d.add(mesh)
    }
  }

  update(dt: number, windDirXZ: THREE.Vector2) {
    this.t += dt
    this.oceanMat.uniforms.uTime.value = this.t
    this.oceanMat.uniforms.uWind.value.set(windDirXZ.x, windDirXZ.y)
    for (const m of this.riverMats) {
      m.uniforms.uTime.value = this.t
      m.uniforms.uWind.value.set(windDirXZ.x, windDirXZ.y)
    }
  }

  private generateDownhillPath(terrain: Terrain, rng: () => number, seaLevel: number, riverIndex: number) {
    const half = terrain.size * 0.5
    const attempts = 250

    // Pick a good mountain source by sampling the map and choosing a high point.
    let best = new THREE.Vector3(0, 0, 0)
    let bestScore = -Infinity
    for (let i = 0; i < attempts; i++) {
      const x = (rng() * 2 - 1) * half
      const z = (rng() * 2 - 1) * half
      const y = terrain.heightAtXZ(x, z)
      const score = y + 0.25 * (Math.abs(x) + Math.abs(z))
      if (y > seaLevel + 35 && score > bestScore) {
        bestScore = score
        best.set(x, y, z)
      }
    }

    // Fallback: if no good source, bail.
    if (bestScore === -Infinity) return []

    const path: THREE.Vector3[] = [best.clone()]

    const step = 10
    const maxSteps = 360
    let x = best.x
    let z = best.z
    let y = best.y

    // Downhill walk using local neighbor sampling.
    for (let i = 0; i < maxSteps; i++) {
      if (y <= seaLevel + 0.75) break

      let bestNx = x
      let bestNz = z
      let bestNy = y

      // Sample 8 directions + slight randomness to avoid perfectly straight lines.
      const jitter = (rng() * 2 - 1) * 0.35
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2 + jitter
        const nx = x + Math.cos(ang) * step
        const nz = z + Math.sin(ang) * step
        const ny = terrain.heightAtXZ(nx, nz)
        if (ny < bestNy) {
          bestNy = ny
          bestNx = nx
          bestNz = nz
        }
      }

      // If we can’t find a lower neighbor, gently “nudge” toward the ocean by stepping outward.
      if (bestNy >= y - 0.05) {
        const outward = new THREE.Vector2(x, z).normalize().multiplyScalar(step)
        bestNx = x + outward.x
        bestNz = z + outward.y
        bestNy = terrain.heightAtXZ(bestNx, bestNz)
      }

      x = bestNx
      z = bestNz
      y = bestNy

      // Keep within bounds.
      x = THREE.MathUtils.clamp(x, -half + 5, half - 5)
      z = THREE.MathUtils.clamp(z, -half + 5, half - 5)
      y = terrain.heightAtXZ(x, z)

      const last = path[path.length - 1]!
      const dx = x - last.x
      const dz = z - last.z
      if (dx * dx + dz * dz < 2 * 2) continue

      path.push(new THREE.Vector3(x, Math.max(y, seaLevel + 0.2), z))
    }

    // Ensure it meets the sea a bit.
    const last = path[path.length - 1]
    if (last && last.y > seaLevel + 0.75) {
      path.push(new THREE.Vector3(last.x, seaLevel + 0.2, last.z))
    }

    // Space rivers apart a bit by mirroring every other river (cheap variety).
    if (riverIndex % 2 === 1) {
      for (const p of path) p.x *= -1
    }

    return path
  }
}

function makeOceanMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector2(1, 0) },
      uColorDeep: { value: new THREE.Color(0x0a1b2a) },
      uColorShallow: { value: new THREE.Color(0x1c4a62) },
      uAlpha: { value: 0.85 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      uniform float uTime;
      uniform vec2 uWind;
      uniform vec3 uColorDeep;
      uniform vec3 uColorShallow;
      uniform float uAlpha;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        vec2 p = vWorldPos.xz * 0.006;
        vec2 drift = normalize(uWind) * (uTime * 0.02);
        float n = noise(p + drift) * 0.7 + noise(p * 2.0 - drift * 1.7) * 0.3;

        vec3 V = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - max(0.0, dot(normalize(vNormalW), V)), 3.0);

        vec3 col = mix(uColorDeep, uColorShallow, clamp(n * 1.15, 0.0, 1.0));
        col += fres * 0.18;

        gl_FragColor = vec4(col, uAlpha);
      }
    `,
  })
}

function makeRiverMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector2(1, 0) },
      uColor: { value: new THREE.Color(0x2a6e86) },
      uAlpha: { value: 0.9 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        vNormalW = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec2 vUv;
      varying vec3 vWorldPos;
      varying vec3 vNormalW;
      uniform float uTime;
      uniform vec2 uWind;
      uniform vec3 uColor;
      uniform float uAlpha;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      float noise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        float a = hash(i);
        float b = hash(i + vec2(1.0, 0.0));
        float c = hash(i + vec2(0.0, 1.0));
        float d = hash(i + vec2(1.0, 1.0));
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
      }

      void main() {
        float flow = vUv.y * 6.0 - uTime * 0.65;
        vec2 p = vec2(vUv.x * 8.0, flow);
        float n = noise(p) * 0.6 + noise(p * 2.0) * 0.4;

        vec3 V = normalize(cameraPosition - vWorldPos);
        float fres = pow(1.0 - max(0.0, dot(normalize(vNormalW), V)), 3.0);

        float edge = smoothstep(0.0, 0.08, vUv.x) * (1.0 - smoothstep(0.92, 1.0, vUv.x));
        vec3 col = uColor + n * 0.08 + fres * 0.12;
        gl_FragColor = vec4(col, uAlpha * edge);
      }
    `,
  })
}

function buildRiverRibbon(curve: THREE.Curve<THREE.Vector3>, opts: { width: number; segments: number }) {
  const width = opts.width
  const segments = opts.segments

  const positions = new Float32Array((segments + 1) * 2 * 3)
  const normals = new Float32Array((segments + 1) * 2 * 3)
  const uvs = new Float32Array((segments + 1) * 2 * 2)
  const indices: number[] = []

  const up = new THREE.Vector3(0, 1, 0)
  const p = new THREE.Vector3()
  const t = new THREE.Vector3()
  const right = new THREE.Vector3()
  const n = new THREE.Vector3(0, 1, 0)

  for (let i = 0; i <= segments; i++) {
    const s = i / segments
    curve.getPointAt(s, p)
    curve.getTangentAt(s, t).normalize()

    right.copy(t).cross(up).normalize()
    if (right.lengthSq() < 1e-6) right.set(1, 0, 0)

    const leftPos = p.clone().addScaledVector(right, -width * 0.5)
    const rightPos = p.clone().addScaledVector(right, width * 0.5)

    const base = i * 2
    positions.set([leftPos.x, leftPos.y + 0.1, leftPos.z], (base + 0) * 3)
    positions.set([rightPos.x, rightPos.y + 0.1, rightPos.z], (base + 1) * 3)

    normals.set([n.x, n.y, n.z], (base + 0) * 3)
    normals.set([n.x, n.y, n.z], (base + 1) * 3)

    uvs.set([0, s], (base + 0) * 2)
    uvs.set([1, s], (base + 1) * 2)

    if (i < segments) {
      const a = base
      const b = base + 1
      const c = base + 2
      const d = base + 3
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeBoundingSphere()
  return geo
}

