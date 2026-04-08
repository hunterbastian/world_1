import * as THREE from 'three'
import { Terrain } from '../world/Terrain'
import { Water } from '../world/Water'
import { Input } from './Input'
import { CameraRig } from './CameraRig'
import { Player } from './Player'
import { SkySystem } from '../world/SkySystem'
import { Vegetation } from '../world/Vegetation'
import { PostFX } from '../render/PostFX'
import { applyRimLightToScene } from '../render/RimLight'
import { WindSystem } from '../world/WindSystem'
import { PointsOfInterest } from '../world/PointsOfInterest'
import { JournalUI } from '../ui/Journal'
import { HUD } from '../ui/HUD'
import { Campfires } from '../world/Campfires'
import { AudioSystem } from '../audio/AudioSystem'
import { WorldMap } from '../ui/WorldMap'
import { PerformanceManager } from './PerformanceManager'
import type { QualityTier } from './PerformanceManager'
import { CloudDome } from '../world/CloudDome'
import { Landmarks } from '../world/Landmarks'
import { WalkerMechs } from '../world/WalkerMechs'
import { PauseMenu } from '../ui/PauseMenu'

export class Game {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly clock: THREE.Clock
  private raf: number | null = null
  private terrain: Terrain | null = null
  private water: Water | null = null
  private input: Input | null = null
  private player: Player | null = null
  private cameraRig: CameraRig | null = null
  private sky: SkySystem | null = null
  private vegetation: Vegetation | null = null
  private postfx: PostFX | null = null
  private rim = { sunDir: new THREE.Vector3(0, 1, 0), intensity: 0.0 }
  private wind: WindSystem | null = null
  private poi: PointsOfInterest | null = null
  private journal: JournalUI | null = null
  private hud: HUD | null = null
  private campfires: Campfires | null = null
  private audio: AudioSystem | null = null
  private worldMap: WorldMap | null = null
  private cloudDome: CloudDome | null = null
  private landmarks: Landmarks | null = null
  private walkers: WalkerMechs | null = null
  private pauseMenu: PauseMenu | null = null
  private readonly perf = new PerformanceManager()
  private qualityTier: QualityTier = 'high'
  private perfDebug = false
  private paused = false
  private compass = {
    t: 0,
    angle: 0,
    has: false,
  }
  private rest = {
    active: false,
    hold: 0,
    t: 0,
  }
  private spawnIntro = {
    t: 0,
    active: true,
  }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0b0f16)

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000)
    this.camera.position.set(0, 3, 6)

    this.clock = new THREE.Clock()

    this.seedScene()
    this.input = new Input(this.renderer.domElement)
    window.addEventListener('keydown', this.onDebugKey)
    window.addEventListener('resize', this.onResize)
  }

  start() {
    if (this.raf != null) return
    this.clock.start()
    this.tick()
  }

  stop() {
    if (this.raf != null) cancelAnimationFrame(this.raf)
    this.raf = null
    this.input?.dispose()
    window.removeEventListener('keydown', this.onDebugKey)
    window.removeEventListener('resize', this.onResize)
  }

  private tick = () => {
    const dt = Math.min(this.clock.getDelta(), 1 / 20)

    const perf = this.perf.update(dt)
    if (perf.changed) {
      this.qualityTier = perf.tier
      this.postfx?.setQuality(this.qualityTier)
      this.vegetation?.setQuality(this.qualityTier)
      this.water?.setQuality(this.qualityTier)
      this.cloudDome?.setQuality(this.qualityTier)
      if (this.perfDebug) console.info(`[perf] tier=${this.qualityTier} ema=${perf.emaMs.toFixed(1)}ms`)
    }

    this.sky?.update(dt, this.renderer)
    if (this.sky) {
      this.rim.sunDir.copy(this.sky.sunDirection)
      this.rim.intensity = THREE.MathUtils.clamp(0.15 + this.sky.duskAmount * 0.55, 0, 0.8)
      if (this.cloudDome) this.cloudDome.update(dt, this.sky)
    }

    this.wind?.update(dt)
    const windDir = this.wind?.dirXZ ?? new THREE.Vector2(1, 0)

    const input = this.input?.consume()

    // Pause toggle on ESC
    if (input?.escapePressed && this.pauseMenu) {
      this.paused = !this.paused
      this.pauseMenu.setOpen(this.paused)
      if (this.paused) {
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock()
        }
      }
    }

    if (!this.paused && input && this.player && this.cameraRig) {
      this.cameraRig.addOrbitDelta(input.mouseDeltaX, input.mouseDeltaY)
      this.player.setWind(windDir)
      if (!this.rest.active) this.player.update(dt, input, this.cameraRig.getYaw())

      if (this.spawnIntro.active) {
        this.spawnIntro.t += dt
        const dur = 2.6
        const t = Math.min(1, this.spawnIntro.t / dur)
        const ease = 1 - Math.pow(1 - t, 3)
        const dist = THREE.MathUtils.lerp(14.0, 7.5, ease)
        const height = THREE.MathUtils.lerp(3.6, 2.0, ease)
        this.cameraRig.setDesired(dist, height)
        if (t >= 1) this.spawnIntro.active = false
      } else {
        this.cameraRig.setDesired(7.5, 2.0)
      }

      this.cameraRig.update(dt, this.player.position)

      if (input.journalToggle) this.journal?.toggle()
    }

    if (!this.paused) {
      this.water?.update(dt, windDir)
      this.vegetation?.update(dt, windDir)
      if (this.poi && this.player) this.poi.update(this.player.position)
      this.campfires?.update(dt, windDir)
      this.walkers?.update(dt)
      this.audio?.update()
    }

    if (this.hud && this.player) {
      this.hud.setStamina(this.player.stamina)

      this.compass.t += dt
      if (this.compass.t >= 1 / 12) {
        this.compass.t = 0
        const nearest = this.poi?.nearestUndiscovered(this.player.position)
        if (nearest) {
          const to = nearest.position.clone().sub(this.player.position)
          to.y = 0
          to.normalize()

          const fwd = new THREE.Vector3()
          this.camera.getWorldDirection(fwd)
          fwd.y = 0
          fwd.normalize()

          this.compass.angle = Math.atan2(to.x, to.z) - Math.atan2(fwd.x, fwd.z)
          this.compass.has = true
        } else {
          this.compass.has = false
        }
      }

      if (this.compass.has) this.hud.setCompassAngle(this.compass.angle)
    }

    if (this.worldMap && this.player && this.cameraRig) {
      this.worldMap.revealAt(this.player.position, 18)
      this.worldMap.updateMarkers(dt, {
        player: { position: this.player.position, yaw: this.cameraRig.getYaw() },
        pois: this.poi?.pois ?? [],
        walkers: this.walkers?.walkers.map((w) => ({ position: w.object3d.position })) ?? [],
      })
    }

    if (!this.paused && this.sky && this.hud && this.poi && this.player) {
      let closestCampDist = Infinity
      for (const p of this.poi.pois) {
        if (!p.restPoint) continue
        const d = p.position.distanceTo(this.player.position)
        if (d < closestCampDist) closestCampDist = d
      }

      const inCamp = closestCampDist < 3.0
      const interact = input?.interactHeld ?? false

      if (!this.rest.active) {
        if (inCamp) {
          this.hud.setPrompt('Hold E to Rest')
          this.rest.hold = interact ? Math.min(1, this.rest.hold + dt * 0.9) : Math.max(0, this.rest.hold - dt * 1.6)
          if (this.rest.hold >= 1) {
            this.rest.active = true
            this.rest.t = 0
            this.rest.hold = 0
          }
        } else {
          this.hud.setPrompt(null)
          this.rest.hold = 0
        }
      } else {
        this.hud.setPrompt('Resting\u2026')
        this.rest.t += dt
        this.sky.timeScale = 24
        this.player.stamina = Math.min(1, this.player.stamina + dt * 0.6)
        if (this.rest.t > 2.8) {
          this.rest.active = false
          this.sky.timeScale = 1
          this.hud.setPrompt(null)
        }
      }
    }

    if (this.postfx && this.sky) {
      const sunUv = this.projectToScreenUv(this.sky.sunLight.position, this.camera)
      const godAmt = THREE.MathUtils.clamp(this.sky.duskAmount * 0.9 + (1 - this.sky.dayAmount) * 0.15, 0, 0.85)
      const fogAmt = THREE.MathUtils.clamp(0.12 + (1 - this.sky.dayAmount) * 0.28 + this.sky.duskAmount * 0.08, 0, 0.55)
      this.postfx.update(dt, sunUv, godAmt * 0.55, fogAmt)
    }

    if (this.postfx) this.postfx.render(this.renderer, this.scene, this.camera)
    else this.renderer.render(this.scene, this.camera)
    this.raf = requestAnimationFrame(this.tick)
  }

  private onResize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.postfx?.resize(w, h)
  }

  private onDebugKey = (e: KeyboardEvent) => {
    if (e.code !== 'F3') return
    this.perfDebug = !this.perfDebug
    console.info(`[perf] debug=${this.perfDebug ? 'on' : 'off'} tier=${this.qualityTier} ema=${this.perf.emaMs.toFixed(1)}ms`)
  }

  private seedScene() {
    const hemi = new THREE.HemisphereLight(0xbdd9ff, 0x1d2230, 0.55)
    this.scene.add(hemi)

    this.sky = new SkySystem({ scene: this.scene })
    this.wind = new WindSystem()

    this.cloudDome = new CloudDome()
    this.cloudDome.setQuality(this.qualityTier)
    this.scene.add(this.cloudDome.object3d)

    this.terrain = new Terrain({
      size: 700,
      segments: 224,
      seed: 'world-seed-001',
      seaLevel: -2,
    })
    this.scene.add(this.terrain.object3d)

    this.landmarks = new Landmarks(this.terrain)
    this.scene.add(this.landmarks.object3d)

    this.water = new Water(this.terrain, {
      seed: 'world-seed-001',
      seaLevel: -2,
      riverCount: 2,
    })
    this.water.setQuality(this.qualityTier)
    this.scene.add(this.water.object3d)

    this.vegetation = new Vegetation({
      seed: 'world-seed-001',
      terrain: this.terrain,
    })
    this.vegetation.setQuality(this.qualityTier)
    this.scene.add(this.vegetation.object3d)

    this.postfx = new PostFX(this.renderer, this.scene, this.camera)
    this.postfx.setQuality(this.qualityTier)
    applyRimLightToScene(this.scene, this.rim)

    this.poi = new PointsOfInterest({ seed: 'world-seed-001', terrain: this.terrain })
    this.scene.add(this.poi.object3d)

    this.campfires = new Campfires(this.terrain)
    this.scene.add(this.campfires.object3d)

    this.journal = new JournalUI()
    document.body.appendChild(this.journal.root)
    this.poi.onDiscover((poi) => {
      this.journal?.addEntry({ id: poi.id, title: poi.loreTitle, body: poi.loreBody })
    })

    this.worldMap = new WorldMap({ terrain: this.terrain, size: 220, seaLevel: -2 })
    this.worldMap.canvas.style.width = '100%'
    this.worldMap.canvas.style.height = 'auto'
    this.worldMap.canvas.style.borderRadius = '4px'
    this.journal.setMapElement(this.worldMap.canvas)

    this.hud = new HUD()
    document.body.appendChild(this.hud.root)
    this.hud.setHealth(1.0)
    this.hud.setXP(0)

    this.pauseMenu = new PauseMenu()
    document.body.appendChild(this.pauseMenu.root)
    this.pauseMenu.onResume = () => {
      this.paused = false
      this.pauseMenu?.setOpen(false)
      const result = this.renderer.domElement.requestPointerLock()
      if (result && typeof (result as any).catch === 'function') {
        ;(result as any).catch(() => {})
      }
    }
    this.pauseMenu.onQuit = () => {
      window.location.reload()
    }

    const spawn = this.terrain.findFlatSpawn(1337)
    this.player = new Player({
      terrain: this.terrain,
      start: spawn.clone(),
    })
    this.scene.add(this.player.object3d)

    this.walkers = new WalkerMechs({
      terrain: this.terrain,
      seed: 'world-seed-001',
      playerSpawn: spawn,
      pois: this.poi.pois,
    })
    this.scene.add(this.walkers.object3d)

    this.audio = new AudioSystem({ camera: this.camera, terrain: this.terrain, player: this.player })
    document.addEventListener(
      'pointerlockchange',
      () => {
        if (document.pointerLockElement === this.renderer.domElement) {
          void this.audio?.start()
        }
      },
      { once: true }
    )

    this.cameraRig = new CameraRig(this.camera, {
      distance: 7.5,
      height: 2.0,
      yaw: 0,
      pitch: 0.25,
      terrain: this.terrain!,
    })
    this.player.onStep(({ intensity }) => this.cameraRig?.impulseFootstep(intensity))
  }

  private projectToScreenUv(worldPos: THREE.Vector3, camera: THREE.Camera) {
    const v = worldPos.clone().project(camera)
    return new THREE.Vector2(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
  }
}

