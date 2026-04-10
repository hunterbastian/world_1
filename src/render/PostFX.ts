import * as THREE from 'three'
import {
  EffectComposer,
  RenderPass,
  EffectPass,
  Effect,
  NormalPass,
  SSAOEffect,
  BloomEffect,
  VignetteEffect,
  ChromaticAberrationEffect,
  BlendFunction,
} from 'postprocessing'
import type { QualityTier } from '../game/PerformanceManager'

/* ── Custom Effects ─────────────────────────────────────────── */

/**
 * Destiny-style warm/cool color grade.
 *
 * Shadows get a cool blue-violet push (Bungie's "mythic" ambient).
 * Midtones stay true. Highlights get a warm golden push.
 * A soft luminance ramp separates the bands — no hard toon edges,
 * just a filmic warm/cool temperature split that reads as cinematic.
 */
class ToonRampEffect extends Effect {
  constructor() {
    super('ToonRampEffect', /* glsl */ `
      uniform float uWarmth;
      uniform float uCoolness;

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));

        // Cool shadow push — blue-violet tint in dark regions
        float shadowMask = 1.0 - smoothstep(0.08, 0.38, lum);
        vec3 coolShadow = vec3(0.78, 0.80, 0.96);
        col = mix(col, col * coolShadow, shadowMask * uCoolness);

        // Warm highlight push — golden amber in bright regions
        float highMask = smoothstep(0.50, 0.82, lum);
        vec3 warmHighlight = vec3(1.08, 1.02, 0.90);
        col *= mix(vec3(1.0), warmHighlight, highMask * uWarmth);

        // Subtle midtone contrast lift
        float midMask = smoothstep(0.15, 0.45, lum) * (1.0 - smoothstep(0.55, 0.85, lum));
        col *= 1.0 + midMask * 0.04;

        // Specular bloom seed — brightest pixels get a tiny warm kick
        float spec = smoothstep(0.85, 0.98, lum);
        col += spec * vec3(0.06, 0.04, 0.02);

        outputColor = vec4(col, 1.0);
      }
    `, {
      uniforms: new Map([
        ['uWarmth', new THREE.Uniform(0.65)],
        ['uCoolness', new THREE.Uniform(0.55)],
      ]),
    })
  }

  setWarmth(v: number) {
    ;(this.uniforms.get('uWarmth') as THREE.Uniform).value = v
  }

  setCoolness(v: number) {
    ;(this.uniforms.get('uCoolness') as THREE.Uniform).value = v
  }
}

class BiomePaletteEffect extends Effect {
  constructor() {
    super('BiomePaletteEffect', /* glsl */ `
      uniform sampler2D tBiome;

      vec3 applyGrade(vec3 col, float biome) {
        vec3 plainsTint = vec3(1.02, 1.10, 0.88);
        vec3 forestTint = vec3(0.90, 1.08, 0.84);
        vec3 snowTint   = vec3(0.92, 0.98, 1.08);

        vec3 tint = plainsTint;
        if (biome > 1.5) tint = snowTint;
        else if (biome > 0.5) tint = forestTint;

        float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
        col = mix(vec3(l), col, 1.22);
        col = mix(vec3(0.0), col, 1.06);

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
        ['uAmount', new THREE.Uniform(0.012)],
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

        float decay = 0.93;
        float exposure = uIntensity;
        float weight = 0.028;
        vec3 rays = vec3(0.0);

        vec2 coord = uv;
        for (int i = 0; i < 20; i++) {
          if (float(i) >= uSamples) break;
          coord += dir * 0.014;
          vec3 s = texture2D(inputBuffer, coord).rgb;
          float l = dot(s, vec3(0.2126, 0.7152, 0.0722));
          rays += s * l * weight;
          weight *= decay;
        }

        col += rays * exposure * smoothstep(0.9, 0.0, dist);

        float haloFalloff = smoothstep(0.45, 0.0, dist);
        float haloBright = haloFalloff * haloFalloff;
        vec3 haloColor = vec3(1.0, 0.92, 0.78);
        col += haloColor * haloBright * uIntensity * 0.35;

        float outerGlow = smoothstep(0.7, 0.0, dist) * 0.12 * uIntensity;
        col += vec3(0.95, 0.88, 0.75) * outerGlow;

        float horizonBand = smoothstep(0.35, 0.55, uv.y) * (1.0 - smoothstep(0.55, 0.62, uv.y));
        float haze = horizonBand * 0.08 * uIntensity;
        col += vec3(0.85, 0.82, 0.78) * haze;

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

class HeightFogEffect extends Effect {
  constructor() {
    super('HeightFogEffect', /* glsl */ `
      uniform sampler2D tBiome;
      uniform float uTime;
      uniform float uStrength;
      uniform float uDetail;
      uniform float uCamHeight;
      uniform float uSeaLevel;
      uniform vec2  uSunScreenUv;

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

      float fbmFog(vec2 p) {
        float v = 0.0;
        float a = 0.55;
        v += a * noise(p); p *= 2.03; a *= 0.5;
        v += a * noise(p); p *= 2.01; a *= 0.5;
        v += a * noise(p) * uDetail;
        return v;
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;

        // Height-based: thicker in valleys, thinner at peaks
        float horizon = smoothstep(0.10, 0.50, uv.y) * (1.0 - smoothstep(0.78, 0.98, uv.y));
        float valleyPool = smoothstep(0.50, 0.20, uv.y) * 0.6;
        float heightMask = horizon + valleyPool;

        // Exponential altitude decay — fog density drops as camera climbs
        float altFade = exp(-max(0.0, uCamHeight - 8.0) * 0.04);

        // Animated drift
        vec2 drift  = vec2(uTime * 0.008, -uTime * 0.005);
        vec2 drift2 = vec2(-uTime * 0.006, uTime * 0.004);

        float n1 = fbmFog(uv * 5.0 + drift);
        float n2 = fbmFog(uv * 10.0 + drift2);
        float n3 = noise(uv * 20.0 + drift * 2.5) * uDetail;
        float fogShape = n1 * 0.55 + n2 * 0.30 + n3 * 0.15;

        // Biome influence
        float biome = texture2D(tBiome, uv).r * 255.0;
        float forestBoost = (biome > 0.5 && biome < 1.5) ? 1.0 : 0.0;
        float mountainClear = (biome > 1.5) ? 0.6 : 1.0;

        float fogAmt = uStrength * heightMask * (0.25 + 0.15 * fogShape);
        fogAmt *= (1.0 + 0.2 * forestBoost) * mountainClear * altFade;
        fogAmt = clamp(fogAmt, 0.0, 0.30);

        // Base fog color
        vec3 fogValley  = vec3(0.58, 0.65, 0.80);
        vec3 fogHorizon = vec3(0.82, 0.78, 0.72);
        vec3 fogCol = mix(fogValley, fogHorizon, smoothstep(0.25, 0.55, uv.y));

        // Sun scattering through height fog — warm glow near sun
        float sunProx = 1.0 - smoothstep(0.0, 0.55, distance(uv, uSunScreenUv));
        vec3 scatterCol = vec3(1.0, 0.92, 0.72);
        fogCol = mix(fogCol, scatterCol, sunProx * sunProx * 0.35);

        col = mix(col, fogCol, fogAmt);
        outputColor = vec4(col, 1.0);
      }
    `, {
      uniforms: new Map<string, THREE.Uniform>([
        ['tBiome', new THREE.Uniform(null)],
        ['uTime', new THREE.Uniform(0)],
        ['uStrength', new THREE.Uniform(0.08)],
        ['uDetail', new THREE.Uniform(1.0)],
        ['uCamHeight', new THREE.Uniform(10)],
        ['uSeaLevel', new THREE.Uniform(-2)],
        ['uSunScreenUv', new THREE.Uniform(new THREE.Vector2(0.5, 0.8))],
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

  setCamHeight(h: number) {
    ;(this.uniforms.get('uCamHeight') as THREE.Uniform).value = h
  }

  setSunScreenUv(uv: THREE.Vector2) {
    ;(this.uniforms.get('uSunScreenUv') as THREE.Uniform).value.copy(uv)
  }
}

/**
 * Atmospheric perspective — the further something is, the more it
 * desaturates and shifts toward a cool horizon color.
 *
 * Uses the depth buffer to determine distance. Replaces distant pixels
 * with a blend toward a blue-grey horizon, simulating Rayleigh
 * scattering. Gives the NMS / BotW / Destiny vast-horizon feel.
 */
class AtmoPerspectiveEffect extends Effect {
  constructor() {
    super('AtmoPerspectiveEffect', /* glsl */ `
      uniform float uNear;
      uniform float uFar;
      uniform float uStrength;
      uniform float uDesaturation;
      uniform vec3  uHorizonColor;
      uniform float uDayAmount;

      float readDepth(const in vec2 uv) {
        float d = texture2D(depthBuffer, uv).r;
        float ndc = d * 2.0 - 1.0;
        return (2.0 * uNear * uFar) / (uFar + uNear - ndc * (uFar - uNear));
      }

      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 col = inputColor.rgb;
        float depth = readDepth(uv);

        // Exponential falloff — starts subtle, ramps past mid-distance
        float t = 1.0 - exp(-depth * uStrength * 0.003);
        t = clamp(t, 0.0, 0.85);

        // Desaturate with distance
        float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
        vec3 desat = mix(col, vec3(lum), t * uDesaturation);

        // Shift toward horizon color (cool blue-grey, warmer at dusk)
        vec3 horizonCol = uHorizonColor;
        vec3 result = mix(desat, horizonCol, t * 0.5);

        outputColor = vec4(result, 1.0);
      }
    `, {
      uniforms: new Map<string, THREE.Uniform>([
        ['uNear', new THREE.Uniform(0.1)],
        ['uFar', new THREE.Uniform(2000)],
        ['uStrength', new THREE.Uniform(1.0)],
        ['uDesaturation', new THREE.Uniform(0.7)],
        ['uHorizonColor', new THREE.Uniform(new THREE.Color(0.65, 0.72, 0.82))],
        ['uDayAmount', new THREE.Uniform(1.0)],
      ]),
    })
  }

  setStrength(v: number) {
    ;(this.uniforms.get('uStrength') as THREE.Uniform).value = v
  }

  setDesaturation(v: number) {
    ;(this.uniforms.get('uDesaturation') as THREE.Uniform).value = v
  }

  setHorizonColor(col: THREE.Color) {
    ;(this.uniforms.get('uHorizonColor') as THREE.Uniform).value.copy(col)
  }

  setDayAmount(v: number) {
    ;(this.uniforms.get('uDayAmount') as THREE.Uniform).value = v
  }

  setCameraNearFar(near: number, far: number) {
    ;(this.uniforms.get('uNear') as THREE.Uniform).value = near
    ;(this.uniforms.get('uFar') as THREE.Uniform).value = far
  }
}

/* ── PostFX Pipeline ────────────────────────────────────────── */

export class PostFX {
  public readonly composer: EffectComposer

  private readonly biomeTarget: THREE.WebGLRenderTarget
  private readonly biomeOverrideMaterial: THREE.MeshBasicMaterial

  // Custom effects
  private readonly toonRamp: ToonRampEffect
  private readonly biomeEffect: BiomePaletteEffect
  private readonly heightFog: HeightFogEffect
  private readonly grainEffect: FilmGrainEffect
  private readonly godRays: GodRaysEffect
  private readonly atmoPerspective: AtmoPerspectiveEffect

  // Library effects
  private readonly normalPass: NormalPass
  private readonly ssao: SSAOEffect
  private readonly bloom: BloomEffect
  private readonly vignette: VignetteEffect
  private readonly chromatic: ChromaticAberrationEffect
  private readonly ssaoPass: EffectPass

  private time = 0
  private quality: QualityTier = 'high'

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.composer = new EffectComposer(renderer)

    // ── Pass 1: Scene render ──
    this.composer.addPass(new RenderPass(scene, camera))

    // Biome ID render target (rendered manually before composer)
    this.biomeTarget = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
      depthBuffer: true,
    })
    this.biomeTarget.texture.name = 'BiomeIdTarget'
    this.biomeOverrideMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 })

    // ── Pass 2: Normal pass for SSAO ──
    this.normalPass = new NormalPass(scene, camera)
    this.composer.addPass(this.normalPass)

    // ── Pass 3: SSAO (HBAO-like ambient occlusion) ──
    this.ssao = new SSAOEffect(camera, this.normalPass.texture, {
      blendFunction: BlendFunction.MULTIPLY,
      samples: 9,
      rings: 7,
      worldDistanceThreshold: 20,
      worldDistanceFalloff: 5,
      worldProximityThreshold: 0.4,
      worldProximityFalloff: 0.15,
      luminanceInfluence: 0.6,
      radius: 0.1,
      intensity: 1.5,
      bias: 0.025,
      fade: 0.02,
      resolutionScale: 0.5,
    })
    this.ssaoPass = new EffectPass(camera as THREE.Camera, this.ssao)
    this.composer.addPass(this.ssaoPass)

    // ── Pass 4: Color processing + atmosphere ──
    this.toonRamp = new ToonRampEffect()
    this.biomeEffect = new BiomePaletteEffect()
    this.biomeEffect.setBiomeTexture(this.biomeTarget.texture)
    this.godRays = new GodRaysEffect()

    this.heightFog = new HeightFogEffect()
    this.heightFog.setBiomeTexture(this.biomeTarget.texture)

    this.atmoPerspective = new AtmoPerspectiveEffect()

    this.bloom = new BloomEffect({
      blendFunction: BlendFunction.SCREEN,
      luminanceThreshold: 0.82,
      luminanceSmoothing: 0.08,
      mipmapBlur: true,
      intensity: 0.5,
      radius: 0.75,
      levels: 6,
    })

    this.composer.addPass(
      new EffectPass(camera as THREE.Camera,
        this.toonRamp, this.biomeEffect, this.godRays, this.heightFog, this.atmoPerspective, this.bloom,
      ),
    )

    // ── Pass 5: Final polish ──
    this.chromatic = new ChromaticAberrationEffect({
      offset: new THREE.Vector2(0.0006, 0.0003),
      radialModulation: true,
      modulationOffset: 0.2,
    })
    this.vignette = new VignetteEffect({
      offset: 0.35,
      darkness: 0.4,
    })
    this.grainEffect = new FilmGrainEffect()

    this.composer.addPass(
      new EffectPass(camera as THREE.Camera,
        this.chromatic, this.vignette, this.grainEffect,
      ),
    )
  }

  setQuality(tier: QualityTier) {
    this.quality = tier

    // SSAO — disable entirely on low, half-res on medium
    this.ssaoPass.enabled = tier !== 'low'
    this.normalPass.enabled = tier !== 'low'

    // Bloom intensity
    this.bloom.intensity = tier === 'low' ? 0.15 : tier === 'medium' ? 0.35 : 0.5
  }

  resize(w: number, h: number) {
    this.composer.setSize(w, h)
    this.biomeTarget.setSize(w, h)
  }

  update(dt: number, sunUv: THREE.Vector2, godRayIntensity: number, fogStrength: number, camHeight = 10, dayAmount = 1, duskAmount = 0) {
    this.time += dt
    this.grainEffect.setTime(this.time)

    const k = 1 - Math.exp(-dt * 2.2)

    // God ray quality
    const targetSamples = this.quality === 'high' ? 20 : this.quality === 'medium' ? 14 : 10
    const curSamples = (this.godRays.uniforms.get('uSamples') as THREE.Uniform).value as number
    this.godRays.setSamples(THREE.MathUtils.lerp(curSamples, targetSamples, k))

    // Height fog quality
    const targetFogDetail = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.7 : 0.45
    const curFogDetail = (this.heightFog.uniforms.get('uDetail') as THREE.Uniform).value as number
    this.heightFog.setDetail(THREE.MathUtils.lerp(curFogDetail, targetFogDetail, k))

    // Grain amount
    const targetGrain = this.quality === 'high' ? 0.012 : this.quality === 'medium' ? 0.010 : 0.008
    const curGrain = (this.grainEffect.uniforms.get('uAmount') as THREE.Uniform).value as number
    this.grainEffect.setAmount(THREE.MathUtils.lerp(curGrain, targetGrain, k))

    // God rays
    this.godRays.setSunUv(sunUv)
    const godMul = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.85 : 0.7
    this.godRays.setIntensity(godRayIntensity * godMul)

    // Height fog
    this.heightFog.setTime(this.time)
    const fogMul = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.9 : 0.78
    this.heightFog.setStrength(fogStrength * fogMul)
    this.heightFog.setCamHeight(camHeight)
    this.heightFog.setSunScreenUv(sunUv)

    // Warm/cool grading shifts with time of day — cooler shadows at night
    this.toonRamp.setCoolness(THREE.MathUtils.lerp(0.7, 0.55, dayAmount))
    this.toonRamp.setWarmth(THREE.MathUtils.lerp(0.3, 0.65, dayAmount) + duskAmount * 0.2)

    // Atmospheric perspective — horizon color shifts with time of day
    const dayHorizon = new THREE.Color(0.65, 0.72, 0.82)
    const duskHorizon = new THREE.Color(0.75, 0.58, 0.48)
    const nightHorizon = new THREE.Color(0.12, 0.14, 0.22)
    const horizonCol = nightHorizon.clone().lerp(dayHorizon, dayAmount)
    horizonCol.lerp(duskHorizon, duskAmount * 0.6)
    this.atmoPerspective.setHorizonColor(horizonCol)
    this.atmoPerspective.setDayAmount(dayAmount)
    const atmoMul = this.quality === 'high' ? 1.0 : this.quality === 'medium' ? 0.85 : 0.7
    this.atmoPerspective.setStrength(atmoMul)
  }

  render(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    // Render biome ID to target using per-mesh userData.biomeIndex
    const prevRT = renderer.getRenderTarget()
    const prevOverride = scene.overrideMaterial

    scene.overrideMaterial = this.biomeOverrideMaterial
    renderer.setRenderTarget(this.biomeTarget)
    renderer.clear()
    renderer.render(scene, camera)

    scene.overrideMaterial = prevOverride
    renderer.setRenderTarget(prevRT)

    this.composer.render()
  }

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
