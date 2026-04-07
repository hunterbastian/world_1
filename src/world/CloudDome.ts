import * as THREE from 'three'
import type { SkySystem } from './SkySystem'
import type { QualityTier } from '../game/PerformanceManager'

export class CloudDome {
  public readonly object3d: THREE.Object3D
  private readonly mesh: THREE.Mesh
  private readonly mat: THREE.ShaderMaterial
  private t = 0

  constructor() {
    this.object3d = new THREE.Group()
    this.object3d.name = 'CloudDome'

    // Low-poly sphere for perf; rendered inside.
    const geo = new THREE.SphereGeometry(2400, 28, 18)
    this.mat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      uniforms: {
        uTime: { value: 0 },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uDay: { value: 1.0 },
        uDusk: { value: 0.0 },
        uDetail: { value: 1.0 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vPosW;
        varying vec3 vNormalW;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vPosW = wp.xyz;
          vNormalW = normalize(mat3(modelMatrix) * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vPosW;
        varying vec3 vNormalW;

        uniform float uTime;
        uniform vec3 uSunDir;
        uniform float uDay;
        uniform float uDusk;
        uniform float uDetail;

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

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.55;
          // 3 octaves; fade last octave with uDetail.
          v += a * noise(p); p *= 2.02; a *= 0.5;
          v += a * noise(p); p *= 2.03; a *= 0.5;
          v += a * noise(p) * uDetail;
          return v;
        }

        void main() {
          // Project to spherical-ish UV using world position.
          vec3 p = normalize(vPosW);
          float u = atan(p.z, p.x) / 6.2831853 + 0.5;
          float v = asin(clamp(p.y, -1.0, 1.0)) / 3.1415926 + 0.5;

          // Keep clouds mostly above the horizon.
          float horizon = smoothstep(0.46, 0.60, v);

          vec2 uv = vec2(u, v);
          vec2 drift = vec2(uTime * 0.004, -uTime * 0.0025);
          float n = fbm(uv * 6.0 + drift);

          // Coverage/shape.
          float cover = 0.58;
          float c = smoothstep(cover, 0.90, n);
          // Wispy edge.
          c *= smoothstep(0.0, 0.25, n);
          c *= horizon;

          // Lighting: brighter when facing sun; warm at dusk; dim at night.
          float ndl = clamp(dot(normalize(vNormalW), normalize(uSunDir)), 0.0, 1.0);
          float light = mix(0.25, 1.0, uDay) * (0.55 + 0.45 * ndl);

          vec3 dayCol = vec3(0.92, 0.95, 1.0);
          vec3 duskCol = vec3(1.0, 0.76, 0.50);
          vec3 nightCol = vec3(0.18, 0.22, 0.35);
          vec3 base = mix(nightCol, dayCol, uDay);
          base = mix(base, duskCol, uDusk * 0.75);

          // Subtle self-shadowing.
          float shade = 1.0 - (n - 0.55) * 0.55;
          shade = clamp(shade, 0.65, 1.0);

          vec3 col = base * light * shade;
          float alpha = c * mix(0.18, 0.48, uDay);
          alpha *= (0.85 + 0.15 * uDetail);

          gl_FragColor = vec4(col, alpha);
        }
      `,
    })

    this.mesh = new THREE.Mesh(geo, this.mat)
    this.mesh.frustumCulled = false
    this.object3d.add(this.mesh)
  }

  setQuality(tier: QualityTier) {
    const detail = tier === 'high' ? 1.0 : tier === 'medium' ? 0.7 : 0.45
    this.mat.uniforms.uDetail.value = detail
  }

  update(dt: number, sky: SkySystem) {
    this.t += dt
    this.mat.uniforms.uTime.value = this.t
    this.mat.uniforms.uSunDir.value.copy(sky.sunDirection)
    this.mat.uniforms.uDay.value = sky.dayAmount
    this.mat.uniforms.uDusk.value = sky.duskAmount
  }
}

