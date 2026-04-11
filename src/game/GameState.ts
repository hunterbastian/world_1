import type * as THREE from 'three'
import type { InputState } from './Input'
import type { Player } from './Player'
import type { CameraRig } from './CameraRig'
import type { Terrain } from '../world/Terrain'
import type { SkySystem } from '../world/SkySystem'
import type { WindSystem } from '../world/WindSystem'
import type { PointsOfInterest } from '../world/PointsOfInterest'
import type { WalkerMechs } from '../world/WalkerMechs'
import type { WalkerMech } from '../world/WalkerMech'
import type { JournalUI } from '../ui/Journal'
import type { HUD } from '../ui/HUD'
import type { WorldMap } from '../ui/WorldMap'
import type { PostFX } from '../render/PostFX'
import type { AudioSystem } from '../audio/AudioSystem'

export type GameStateId = 'exploring' | 'piloting' | 'menu'

export interface GameContext {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  terrain: Terrain
  player: Player
  cameraRig: CameraRig
  sky: SkySystem
  wind: WindSystem
  poi: PointsOfInterest
  walkers: WalkerMechs
  activeWalker: WalkerMech | null
  journal: JournalUI
  hud: HUD
  worldMap: WorldMap
  postfx: PostFX
  audio: AudioSystem
  requestStateChange: (id: GameStateId) => void
}

export interface GameState {
  readonly id: GameStateId
  enter(ctx: GameContext): void
  exit(ctx: GameContext): void
  update(ctx: GameContext, dt: number, input: InputState): void
}
