import * as THREE from 'three'
import type { Terrain } from './Terrain'
import type { QualityTier } from '../game/PerformanceManager'

type GrassOptions = {
  terrain: Terrain
  seed: string
  count?: number
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

function makeGrassBlade(): THREE.BufferGeometry {
  const w = 0.06
  const h = 0.28
  const verts = new Float32Array([
    -w * 0.5, 0, 0,
     w * 0.5, 0, 0,
    -w * 0.35, h * 0.4, 0,
     w * 0.35, h * 0.4, 0,
    -w * 0.15, h * 0.75, 0,
     w * 0.15, h * 0.75, 0,
     0, h, 0,
  ])
  const uvs = new Float32Array([
    0, 0,  1, 0,
    0.15, 0.4,  0.85, 0.4,
    0.3, 0.75,  0.7, 0.75,
    0.5, 1.0,
  ])
  const indices = [0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5, 4, 5, 6]

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(verts, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

function makeGrassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    polygonOffset: true,
    polygonOffsetFactor: -1.5,
    polygonOffsetUnits: -1.5,
    uniforms: {
      uTime: { value: 0 },
      uWind: { value: new THREE.Vector2(1, 0) },
      uColorBase: { value: new THREE.Color(0x4a8a42) },
      uColorTip: { value: new THREE.Color(0x82c05a) },
      uPlayerPos: { value: new THREE.Vector3() },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      uniform vec2 uWind;
      uniform vec3 uPlayerPos;

      varying vec2 vUv;
      varying float vHeight;
      varying float vAO;

      #include <logdepthbuf_pars_vertex>

      void main() {
        vUv = uv;
        vHeight = uv.y;

        vec4 worldInst = instanceMatrix * vec4(position, 1.0);
        vec4 wp = modelMatrix * worldInst;

        float heightFactor = uv.y;

        float phase = wp.x * 0.4 + wp.z * 0.3;
        vec2 wind = normalize(uWind);
        float sway = sin(uTime * 2.2 + phase) * 0.12
                   + sin(uTime * 3.5 + phase * 1.7) * 0.05;
        float gust = sin(uTime * 0.7 + wp.x * 0.08 + wp.z * 0.06) * 0.5 + 0.5;
        sway *= 1.0 + gust * 0.6;

        wp.x += wind.x * sway * heightFactor;
        wp.z += wind.y * sway * heightFactor;

        float distToPlayer = length(wp.xz - uPlayerPos.xz);
        float push = smoothstep(1.8, 0.3, distToPlayer) * heightFactor;
        vec2 pushDir = normalize(wp.xz - uPlayerPos.xz + vec2(0.001));
        wp.x += pushDir.x * push * 0.35;
        wp.z += pushDir.y * push * 0.25;
        wp.y -= push * 0.12;

        vAO = 1.0 - (1.0 - heightFactor) * 0.3;

        gl_Position = projectionMatrix * viewMatrix * wp;
        #include <logdepthbuf_vertex>
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColorBase;
      uniform vec3 uColorTip;

      varying vec2 vUv;
      varying float vHeight;
      varying float vAO;

      #include <logdepthbuf_pars_fragment>

      void main() {
        vec3 col = mix(uColorBase, uColorTip, vHeight);
        col *= vAO;

        float alpha = smoothstep(0.0, 0.05, vHeight) * (1.0 - smoothstep(0.92, 1.0, vHeight) * 0.3);

        gl_FragColor = vec4(col, alpha);
        #include <logdepthbuf_fragment>
      }
    `,
  })
}

export class GrassField {
  public readonly object3d: THREE.Object3D
  private readonly mesh: THREE.InstancedMesh
  private readonly mat: THREE.ShaderMaterial
  private time = 0
  private filled = 0
  private capacity: number

  constructor(opts: GrassOptions) {
    this.object3d = new THREE.Group()
    this.object3d.name = 'GrassField'

    this.capacity = opts.count ?? 18000
    const bladeGeo = makeGrassBlade()
    this.mat = makeGrassMaterial()

    this.mesh = new THREE.InstancedMesh(bladeGeo, this.mat, this.capacity)
    this.mesh.frustumCulled = false
    this.object3d.add(this.mesh)

    const rng = makeRng(`${opts.seed}:grass`)
    const terrain = opts.terrain
    const half = terrain.size * 0.5
    const tmp = new THREE.Object3D()
    let idx = 0

    const attempts = this.capacity * 4
    for (let i = 0; i < attempts && idx < this.capacity; i++) {
      // Bias 60% of samples toward center (grassland basin) for denser meadow
      let x: number, z: number
      if (rng() < 0.6) {
        const r = Math.sqrt(rng()) * half * 0.35
        const a = rng() * Math.PI * 2
        x = Math.cos(a) * r
        z = Math.sin(a) * r
      } else {
        x = (rng() * 2 - 1) * half
        z = (rng() * 2 - 1) * half
      }
      const y = terrain.heightAtXZ(x, z)

      if (y < terrain.seaLevel + 0.5) continue

      const biome = terrain.biomeAtXZ(x, z)
      if (biome === 'snowy_mountains') continue

      const slope = terrain.slopeAtXZ(x, z)
      if (slope > 0.35) continue

      const density = biome === 'grassy_plains' ? 0.95 : 0.20
      if (rng() > density) continue

      const scale = THREE.MathUtils.lerp(0.7, 1.5, rng())
      const heightScale = biome === 'grassy_plains'
        ? THREE.MathUtils.lerp(0.9, 1.4, rng())
        : THREE.MathUtils.lerp(0.5, 0.8, rng())

      const clusterCount = biome === 'grassy_plains' ? 3 : 1
      for (let c = 0; c < clusterCount && idx < this.capacity; c++) {
        const cx = x + (c === 0 ? 0 : (rng() - 0.5) * 0.6)
        const cz = z + (c === 0 ? 0 : (rng() - 0.5) * 0.6)
        const cy = terrain.heightAtXZ(cx, cz)

        const cs = scale * THREE.MathUtils.lerp(0.85, 1.15, rng())
        // Slight lift + polygon offset avoids z-fight flicker with terrain at 1500m scale
        tmp.position.set(cx, cy + 0.04, cz)
        tmp.rotation.set(
          (rng() - 0.5) * 0.15,
          rng() * Math.PI * 2,
          (rng() - 0.5) * 0.15
        )
        tmp.scale.set(cs, cs * heightScale, cs)
        tmp.updateMatrix()
        this.mesh.setMatrixAt(idx, tmp.matrix)
        idx++
      }
    }

    this.filled = idx
    this.mesh.count = idx
    this.mesh.instanceMatrix.needsUpdate = true
  }

  update(dt: number, windDir: THREE.Vector2, playerPos: THREE.Vector3) {
    this.time += dt
    this.mat.uniforms.uTime.value = this.time
    this.mat.uniforms.uWind.value.set(windDir.x, windDir.y)
    this.mat.uniforms.uPlayerPos.value.copy(playerPos)
  }

  setQuality(tier: QualityTier) {
    const factor = tier === 'high' ? 1.0 : tier === 'medium' ? 0.6 : 0.35
    this.mesh.count = Math.floor(this.filled * factor)
  }
}
