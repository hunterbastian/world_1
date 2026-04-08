import * as THREE from 'three'
import { EffectComposer } from 'postprocessing'
import { RenderPass } from 'postprocessing'
import { EffectPass } from 'postprocessing'
import { Effect } from 'postprocessing'
import type { QualityTier } from '../game/PerformanceManager'

class BiomePaletteEffect extends Effect {
  constructor() {
    super('BiomePaletteEffect', /* glsl */ `
      uniform sampler2D tBiome;

      vec3 applyGrade(vec3 col, float biome) {
        // 0 plains, 1 autumn, 2 snow
        vec3 plainsTint = vec3(0.98, 1.08, 0.90);
        vec3 forestTint = vec3(0.88, 1.04, 0.86);
        vec3 snowTint   = vec3(0.92, 0.98, 1.08);

        vec3 tint = plainsTint;
        if (biome > 1.5) tint = snowTint;
        else if (biome > 0.5) tint = forestTint;

        // Saturation + contrast push (avoid grey wash)
        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, 1.14);
        col = mix(vec3(0.0), col, 1.05);

        return clamp(col * tint, 0.0, 1.0);
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;
        float b = texture2D(tBiome, uv).r * 255.0;
        outputColor = vec4(applyGrade(col, b), 1.0);
      }
    `, {
      uniforms: new Map([['tBiome', new THREE.Uniform(null)]]),
    })
  }

  setBiomeTexture(tex: THREE.Texture) {
    ;(this.uniforms.get('tBiome') as THREE.Uniform).value = tex
  }
}

class FilmGrainEffect extends Effect {
  constructor() {
    super('FilmGrainEffect', /* glsl */ `
      uniform float uTime;
      uniform float uAmount;

      float hash(vec2 p) {
        p = fract(p * vec2(123.34, 345.45));
        p += dot(p, p + 34.345);
        return fract(p.x * p.y);
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;
        float g = hash(uv * (800.0 + uTime * 0.07) + vec2(uTime * 0.13, -uTime * 0.11));
        g = g * 2.0 - 1.0;
        col += g * uAmount;
        outputColor = vec4(col, 1.0);
      }
    `, {
      uniforms: new Map([
        ['uTime', new THREE.Uniform(0)],
        ['uAmount', new THREE.Uniform(0.02)],
      ]),
    })
  }

  setTime(t: number) {
    ;(this.uniforms.get('uTime') as THREE.Uniform).value = t
  }

  setAmount(v: number) {
    ;(this.uniforms.get('uAmount') as THREE.Uniform).value = v
  }
}

class GodRaysEffect extends Effect {
  constructor() {
    super('GodRaysEffect', /* glsl */ `
      uniform vec2 uSunUv;
      uniform float uIntensity;
      uniform float uSamples;

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;

        vec2 dir = uSunUv - uv;
        float dist = length(dir);
        dir /= max(1e-5, dist);

        // Radial sample blur (cheap, subtle).
        float decay = 0.92;
        float exposure = uIntensity;
        float weight = 0.025;
        vec3 rays = vec3(0.0);

        vec2 coord = uv;
        for (int i = 0; i < 20; i++) {
          if (float(i) >= uSamples) break;
          coord += dir * 0.012;
          vec3 s = texture2D(inputBuffer, coord).rgb;
          float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
          rays += s * l * weight;
          weight *= decay;
        }

        col += rays * exposure * smoothstep(0.9, 0.0, dist);
        outputColor = vec4(col, 1.0);
      }
    `, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uSunUv', new THREE.Uniform(new THREE.Vector2(0.5, 0.5))],
        ['uIntensity', new THREE.Uniform(0.25)],
        ['uSamples', new THREE.Uniform(20)],
      ]),
    })
  }

  setSunUv(uv: THREE.Vector2) {
    ;(this.uniforms.get('uSunUv') as THREE.Uniform).value.copy(uv)
  }

  setIntensity(v: number) {
    ;(this.uniforms.get('uIntensity') as THREE.Uniform).value = v
  }

  setSamples(n: number) {
    ;(this.uniforms.get('uSamples') as THREE.Uniform).value = Math.max(2, Math.min(20, Math.floor(n)))
  }
}

class FogVeilEffect extends Effect {
  constructor() {
    super('FogVeilEffect', /* glsl */ `
      uniform sampler2D tBiome;
      uniform float uTime;
      uniform float uStrength;
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

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;

        // Valley-ish fog: concentrate nearer the horizon band (avoid washing the ground).
        float horizon = smoothstep(0.18, 0.55, uv.y) * (1.0 - smoothstep(0.72, 0.98, uv.y));
        float valley = horizon;
        vec2 drift = vec2(uTime * 0.01, -uTime * 0.007);
        float n = noise(uv * 6.0 + drift) * 0.6 + noise(uv * 14.0 - drift * 1.7) * 0.4 * uDetail;
        n = n * 2.0 - 1.0;

        float biome = texture2D(tBiome, uv).r * 255.0;
        float forestBoost = (biome > 0.5 && biome < 1.5) ? 1.0 : 0.0;

        float fogAmt = uStrength * valley * (0.75 + 0.25 * n) * (1.0 + 0.35 * forestBoost);
        fogAmt = clamp(fogAmt, 0.0, 0.85);

        vec3 fogCol = vec3(0.70, 0.78, 0.86);
        col = mix(col, fogCol, fogAmt);
        outputColor = vec4(col, 1.0);
      }
    `, {
      uniforms: new Map<string, THREE.Uniform>([
        ['tBiome', new THREE.Uniform(null)],
        ['uTime', new THREE.Uniform(0)],
        ['uStrength', new THREE.Uniform(0.12)],
        ['uDetail', new THREE.Uniform(1.0)],
      ]),
    })
  }

  setBiomeTexture(tex: THREE.Texture) {
    ;(this.uniforms.get('tBiome') as THREE.Uniform).value = tex
  }

  setTime(t: number) {
    ;(this.uniforms.get('uTime') as THREE.Uniform).value = t
  }

  setStrength(v: number) {
    ;(this.uniforms.get('uStrength') as THREE.Uniform).value = v
  }

  setDetail(v: number) {
    ;(this.uniforms.get('uDetail') as THREE.Uniform).value = THREE.MathUtils.clamp(v, 0.0, 1.0)
  }
}

export class PostFX {
  public readonly composer: EffectComposer

  private readonly biomeTarget: THREE.WebGLRenderTarget
  private readonly biomeOverrideMaterial: THREE.MeshBasicMaterial
  private readonly biomeEffect: BiomePaletteEffect
  private readonly fogVeil: FogVeilEffect
  private readonly grainEffect: FilmGrainEffect
  private readonly godRays: GodRaysEffect

  private time = 0
  private quality: QualityTier = 'high'

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer)
    this.composer.addPass(new RenderPass(scene, camera))

    // Biome ID pass render target (R8-like via RGBA, but we only use .r)
    this.biomeTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      depthBuffer: true,
    })
    this.biomeTarget.texture.name = 'BiomeIdTarget'
    this.biomeOverrideMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })

    this.biomeEffect = new BiomePaletteEffect()
    this.biomeEffect.setBiomeTexture(this.biomeTarget.texture)

    this.godRays = new GodRaysEffect()
    this.fogVeil = new FogVeilEffect()
    this.fogVeil.setBiomeTexture(this.biomeTarget.texture)
    this.grainEffect = new FilmGrainEffect()

    this.composer.addPass(new EffectPass(camera, this.biomeEffect, this.godRays, this.fogVeil, this.grainEffect))
  }

  setQuality(tier: QualityTier) {
    this.quality = tier
  }

  resize(w: number, h: number) {
    this.composer.setSize(w, h)
    this.biomeTarget.setSize(w, h)
  }

  update(dt: number, sunUv: THREE.Vector2, godRayIntensity: number, fogStrength: number) {
    this.time += dt
    this.grainEffect.setTime(this.time)

    // Apply quality knobs gradually (tier changes are already hysteresis-gated).
    const k = 1 - Math.exp(-dt * 2.2)
    const targetSamples = this.quality === 'high' ? 20 : this.quality === 'medium' ? 14 : 10
    const curSamples = (this.godRays.uniforms.get('uSamples') as THREE.Uniform).value as number
    this.godRays.setSamples(THREE.MathUtils.lerp(curSamples, targetSamples, k))

    const targetFogDetail = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.7 : 0.45
    const curFogDetail = (this.fogVeil.uniforms.get('uDetail') as THREE.Uniform).value as number
    this.fogVeil.setDetail(THREE.MathUtils.lerp(curFogDetail, targetFogDetail, k))

    const targetGrain = this.quality === 'high' ? 0.02 : this.quality === 'medium' ? 0.018 : 0.016
    const curGrain = (this.grainEffect.uniforms.get('uAmount') as THREE.Uniform).value as number
    this.grainEffect.setAmount(THREE.MathUtils.lerp(curGrain, targetGrain, k))

    this.godRays.setSunUv(sunUv)
    const godMul = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.85 : 0.7
    this.godRays.setIntensity(godRayIntensity * godMul)
    this.fogVeil.setTime(this.time)
    const fogMul = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.9 : 0.78
    this.fogVeil.setStrength(fogStrength * fogMul)
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    // Render biome ID to target using per-mesh userData.biomeIndex encoded in red channel.
    const prevRT = renderer.getRenderTarget()
    const prevOverride = scene.overrideMaterial

    // Override material is set per mesh in onBeforeRender hook for ID encoding
    scene.overrideMaterial = this.biomeOverrideMaterial

    renderer.setRenderTarget(this.biomeTarget)
    renderer.clear()
    renderer.render(scene, camera)

    scene.overrideMaterial = prevOverride
    renderer.setRenderTarget(prevRT)

    this.composer.render()
  }

  // Helper: attach to meshes you want biome-graded.
  static tagBiome(mesh: THREE.Object3D, biomeIndex: number) {
    mesh.traverse((o) => {
      const m = o as THREE.Mesh
      if (!m.isMesh) return
      m.userData.biomeIndex = biomeIndex
      m.onBeforeRender = (_r, _s, _c, _g, material) => {
        if (!(material instanceof THREE.MeshBasicMaterial)) return
        const b = Math.max(0, Math.min(255, Math.floor(m.userData.biomeIndex ?? 0)))
        material.color.setRGB(b / 255, 0, 0)
      }
    })
  }
}

