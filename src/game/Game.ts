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
import { GrassField } from '../world/GrassField'
import { PauseMenu } from '../ui/PauseMenu'
import type { GameState, GameStateId, GameContext } from './GameState'
import { ExploringState } from './ExploringState'
import { PilotingState } from './PilotingState'

export class Game {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene: THREE.Scene
  private readonly camera: THREE.PerspectiveCamera
  private readonly clock: THREE.Clock
  private raf: number | null = null

  // World systems
  private terrain!: Terrain
  private water!: Water
  private sky!: SkySystem
  private wind!: WindSystem
  private vegetation!: Vegetation
  private cloudDome!: CloudDome
  private landmarks!: Landmarks
  private campfires!: Campfires
  private poi!: PointsOfInterest
  private walkers!: WalkerMechs
  private grass!: GrassField

  // Player systems
  private input!: Input
  private player!: Player
  private cameraRig!: CameraRig
  private audio!: AudioSystem

  // UI
  private hud!: HUD
  private journal!: JournalUI
  private worldMap!: WorldMap
  private pauseMenu!: PauseMenu

  // Rendering
  private postfx!: PostFX
  private rim = { sunDir: new THREE.Vector3(0, 1, 0), intensity: 0.0 }
  private readonly perf = new PerformanceManager()
  private qualityTier: QualityTier = 'high'
  private perfDebug = false

  // State machine
  private paused = false
  private readonly states: Map<GameStateId, GameState> = new Map()
  private activeState!: GameState
  private ctx!: GameContext

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
    })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    this.renderer.setSize(window.innerWidth, window.innerHeight, false)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.18

    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = THREE.PCFShadowMap

    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x0b0f16)

    this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2000)
    this.camera.position.set(0, 3, 6)

    this.clock = new THREE.Clock()

    this.seedScene()

    this.ctx = {
      renderer: this.renderer,
      scene: this.scene,
      camera: this.camera,
      terrain: this.terrain,
      player: this.player,
      cameraRig: this.cameraRig,
      sky: this.sky,
      wind: this.wind,
      poi: this.poi,
      walkers: this.walkers,
      journal: this.journal,
      hud: this.hud,
      worldMap: this.worldMap,
      audio: this.audio,
      postfx: this.postfx,
      activeWalker: undefined,
      requestStateChange: (id) => this.changeState(id),
    }

    this.states.set('exploring', new ExploringState())
    this.states.set('piloting', new PilotingState())
    this.activeState = this.states.get('exploring')!
    this.activeState.enter(this.ctx)

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
    this.input.dispose()
    window.removeEventListener('keydown', this.onDebugKey)
    window.removeEventListener('resize', this.onResize)
  }

  private changeState(id: GameStateId) {
    const next = this.states.get(id)
    if (!next || next === this.activeState) return
    this.activeState.exit(this.ctx)
    this.activeState = next
    this.activeState.enter(this.ctx)
  }

  private tick = () => {
    const dt = Math.min(this.clock.getDelta(), 1 / 20)

    // Performance tier management
    const perf = this.perf.update(dt)
    if (perf.changed) {
      this.qualityTier = perf.tier
      this.postfx.setQuality(this.qualityTier)
      this.vegetation.setQuality(this.qualityTier)
      this.grass.setQuality(this.qualityTier)
      this.water.setQuality(this.qualityTier)
      this.cloudDome.setQuality(this.qualityTier)
      if (this.perfDebug) console.info(`[perf] tier=${this.qualityTier} ema=${perf.emaMs.toFixed(1)}ms`)
    }

    // Environment (always updates regardless of state/pause)
    this.sky.update(dt, this.renderer)
    const shadowTarget = this.ctx.activeWalker && this.activeState.id === 'piloting'
      ? this.ctx.activeWalker.object3d.position
      : this.player.position
    this.sky.updateShadowFocus(shadowTarget)
    this.rim.sunDir.copy(this.sky.sunDirection)
    this.rim.intensity = THREE.MathUtils.clamp(0.25 + this.sky.duskAmount * 0.55, 0, 0.9)
    this.cloudDome.update(dt, this.sky)
    this.wind.update(dt)

    // Periodically refresh IBL to track day/night shifts
    this.iblTimer += dt
    if (this.iblTimer > 90) {
      this.iblTimer = 0
      this.buildIBL()
    }

    const input = this.input.consume()

    // Pause toggle
    if (input.escapePressed) {
      this.paused = !this.paused
      this.pauseMenu.setOpen(this.paused)
      if (this.paused && document.pointerLockElement === this.renderer.domElement) {
        document.exitPointerLock()
      }
    }

    if (!this.paused) {
      // Delegate gameplay to active state
      this.activeState.update(this.ctx, dt, input)

      // World system updates
      const windDir = this.wind.dirXZ
      this.water.update(dt, windDir)
      this.vegetation.update(dt, windDir)
      this.grass.update(dt, windDir, this.player.position)
      this.poi.update(this.player.position)
      this.campfires.update(dt, windDir)
      this.walkers.update(dt)
      this.audio.update()
    }

    // Post-processing (always renders)
    // Use the sky-far sun position for god rays / fog, not the shadow-following light
    const skySunPos = this._tmpSunPos.copy(this.sky.sunDirection).multiplyScalar(400)
    const sunUv = this.projectToScreenUv(skySunPos, this.camera)
    const godAmt = THREE.MathUtils.clamp(this.sky.duskAmount * 0.9 + (1 - this.sky.dayAmount) * 0.15, 0, 0.85)
    const fogAmt = THREE.MathUtils.clamp(0.06 + (1 - this.sky.dayAmount) * 0.14 + this.sky.duskAmount * 0.04, 0, 0.28)
    this.postfx.update(dt, sunUv, godAmt * 0.55, fogAmt, this.camera.position.y, this.sky.dayAmount, this.sky.duskAmount)
    this.postfx.render(this.renderer, this.scene, this.camera)

    this.raf = requestAnimationFrame(this.tick)
  }

  private onResize = () => {
    const w = window.innerWidth
    const h = window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.postfx.resize(w, h)
  }

  private onDebugKey = (e: KeyboardEvent) => {
    if (e.code !== 'F3') return
    this.perfDebug = !this.perfDebug
    console.info(`[perf] debug=${this.perfDebug ? 'on' : 'off'} tier=${this.qualityTier} ema=${this.perf.emaMs.toFixed(1)}ms`)
  }

  private seedScene() {
    const hemi = new THREE.HemisphereLight(0xc8deff, 0x8a7860, 1.0)
    this.scene.add(hemi)

    this.sky = new SkySystem({ scene: this.scene })
    this.wind = new WindSystem()

    this.cloudDome = new CloudDome()
    this.cloudDome.setQuality(this.qualityTier)
    this.scene.add(this.cloudDome.object3d)

    this.terrain = new Terrain({
      size: 1500,
      segments: 350,
      seed: 'world-seed-001',
      seaLevel: -2,
    })
    this.terrain.object3d.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) o.receiveShadow = true
    })
    this.scene.add(this.terrain.object3d)

    this.landmarks = new Landmarks(this.terrain)
    this.landmarks.object3d.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true }
    })
    this.scene.add(this.landmarks.object3d)

    this.water = new Water(this.terrain, {
      seed: 'world-seed-001',
      seaLevel: -2,
      riverCount: 4,
    })
    this.water.setQuality(this.qualityTier)
    this.scene.add(this.water.object3d)

    this.vegetation = new Vegetation({
      seed: 'world-seed-001',
      terrain: this.terrain,
    })
    this.vegetation.setQuality(this.qualityTier)
    this.scene.add(this.vegetation.object3d)

    this.grass = new GrassField({
      terrain: this.terrain,
      seed: 'world-seed-001',
      count: 35000,
    })
    this.grass.setQuality(this.qualityTier)
    this.scene.add(this.grass.object3d)

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
      this.journal.addEntry({ id: poi.id, title: poi.loreTitle, body: poi.loreBody })
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

    this.showControlsHint()

    this.pauseMenu = new PauseMenu()
    document.body.appendChild(this.pauseMenu.root)
    this.pauseMenu.onResume = () => {
      this.paused = false
      this.pauseMenu.setOpen(false)
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
    this.player.object3d.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true }
    })
    this.scene.add(this.player.object3d)

    this.walkers = new WalkerMechs({
      terrain: this.terrain,
      seed: 'world-seed-001',
      playerSpawn: spawn,
      pois: this.poi.pois,
    })
    this.walkers.object3d.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) { o.castShadow = true; o.receiveShadow = true }
    })
    this.scene.add(this.walkers.object3d)

    this.audio = new AudioSystem({ camera: this.camera, terrain: this.terrain, player: this.player })
    this.audio.registerWalkers(this.walkers.walkers)
    document.addEventListener(
      'pointerlockchange',
      () => {
        if (document.pointerLockElement === this.renderer.domElement) {
          void this.audio.start()
        }
      },
      { once: true }
    )

    this.cameraRig = new CameraRig(this.camera, {
      fov: 65,
      yaw: 0,
      pitch: 0,
    })
    this.player.onStep(({ intensity }) => this.cameraRig.impulseFootstep(intensity))
    this.player.onLanding(({ intensity }) => this.cameraRig.impulseLanding(intensity))

    // Walker stomps shake the camera when nearby
    for (const w of this.walkers.walkers) {
      w.onStomp((e) => {
        const dist = e.position.distanceTo(this.player.position)
        if (dist < 50) {
          const falloff = 1 - dist / 50
          this.cameraRig.impulseLanding(e.intensity * falloff * 0.5)
        }
      })
    }

    // IBL — capture the sky as a PMREM environment map for PBR materials
    this.buildIBL()
  }

  private readonly _tmpSunPos = new THREE.Vector3()
  private iblTimer = 0

  private buildIBL() {
    const oldEnv = this.scene.environment
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const envRT = pmrem.fromScene(this.scene, 0.04, 0.1, 2000)
    this.scene.environment = envRT.texture
    pmrem.dispose()
    if (oldEnv) oldEnv.dispose()
  }

  private projectToScreenUv(worldPos: THREE.Vector3, camera: THREE.Camera) {
    const v = worldPos.clone().project(camera)
    return new THREE.Vector2(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
  }

  private showControlsHint() {
    const hint = document.createElement('div')
    Object.assign(hint.style, {
      position: 'fixed',
      bottom: '72px',
      left: '50%',
      transform: 'translateX(-50%)',
      font: `500 11px/1.6 'Barlow Condensed', system-ui, sans-serif`,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.55)',
      textAlign: 'center',
      pointerEvents: 'none',
      opacity: '0',
      transition: 'opacity 0.8s ease',
      zIndex: '15',
      whiteSpace: 'pre-line',
    })
    hint.textContent = 'WASD to move  ·  Hold E to interact  ·  Shift to sprint'
    document.body.appendChild(hint)
    setTimeout(() => { hint.style.opacity = '1' }, 2000)
    setTimeout(() => { hint.style.opacity = '0' }, 8000)
    setTimeout(() => { hint.remove() }, 9500)
  }
}
