import * as THREE from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'

export type SkySystemOptions = {
  scene: THREE.Scene
}

export class SkySystem {
  public readonly sunLight: THREE.DirectionalLight
  public readonly sky: Sky

  public timeOfDay = 0.5 // 0..1 (0.5 = noon)
  public readonly sunDirection = new THREE.Vector3(0, 1, 0)
  public dayAmount = 1
  public duskAmount = 0
  public timeScale = 1

  private readonly scene: THREE.Scene
  private readonly fog: THREE.FogExp2

  constructor(opts: SkySystemOptions) {
    this.scene = opts.scene

    this.sky = new Sky()
    this.sky.scale.setScalar(4500)
    this.scene.add(this.sky)

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.15)
    this.sunLight.position.set(100, 200, 50)
    this.scene.add(this.sunLight)

    this.fog = new THREE.FogExp2(0x9fb7c8, 0.0007)
    this.scene.fog = this.fog

    const u = this.sky.material.uniforms
    u.turbidity.value = 10
    u.rayleigh.value = 2.2
    u.mieCoefficient.value = 0.006
    u.mieDirectionalG.value = 0.8
  }

  public freezeTime = true

  update(dt: number, renderer: THREE.WebGLRenderer) {
    if (!this.freezeTime) {
      this.timeOfDay = (this.timeOfDay + dt * this.timeScale * (1 / 600)) % 1
    }

    const sun = this.computeSunDir(this.timeOfDay)
    this.sunDirection.copy(sun)
    const sunPos = sun.clone().multiplyScalar(400)
    ;(this.sky.material.uniforms.sunPosition.value as THREE.Vector3).copy(sunPos)
    this.sunLight.position.copy(sunPos)

    // Lighting & exposure
    const sunHeight = THREE.MathUtils.clamp(sun.y, -0.2, 1.0)
    const dayAmt = THREE.MathUtils.smoothstep(sunHeight, -0.05, 0.35)
    this.dayAmount = dayAmt

    // Warmer dusk/dawn
    const duskAmt = Math.exp(-Math.pow((sunHeight - 0.08) / 0.16, 2))
    this.duskAmount = duskAmt
    const sunColor = new THREE.Color(0xffffff)
      .lerp(new THREE.Color(0xffc38a), duskAmt)
      .lerp(new THREE.Color(0x9db6ff), 1 - dayAmt)
    this.sunLight.color.copy(sunColor)
    this.sunLight.intensity = THREE.MathUtils.lerp(0.05, 1.2, dayAmt)

    renderer.toneMappingExposure = THREE.MathUtils.lerp(0.35, 1.05, dayAmt)

    // Horizon-matched fog color (approximate)
    const fogDay = new THREE.Color(0xb8d0dd)
    const fogDusk = new THREE.Color(0x7f7a86)
    const fogNight = new THREE.Color(0x0b1020)
    const fogCol = fogNight.clone().lerp(fogDusk, duskAmt).lerp(fogDay, dayAmt)
    this.fog.color.copy(fogCol)

    // Keep base fog lighter to preserve biome color; valley fog veil handles extra depth.
    this.fog.density = THREE.MathUtils.lerp(0.00075, 0.00035, dayAmt)
  }

  private computeSunDir(t: number) {
    // t=0 -> midnight, t=0.25 -> sunrise, t=0.5 -> noon, t=0.75 -> sunset
    const theta = (t * Math.PI * 2) - Math.PI / 2
    const elevation = Math.sin(theta) // -1..1
    const az = Math.cos(theta) * 0.35 + 0.7
    const dir = new THREE.Vector3(Math.cos(az), elevation, Math.sin(az)).normalize()
    return dir
  }
}

