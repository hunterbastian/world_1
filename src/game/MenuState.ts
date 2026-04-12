import type * as THREE from 'three'
import type { GameState, GameContext } from './GameState'
import type { InputState } from './Input'
import type { PauseMenu } from '../ui/PauseMenu'

export class MenuState implements GameState {
  readonly id = 'menu' as const

  private readonly pauseMenu: PauseMenu
  private readonly renderer: THREE.WebGLRenderer
  private previousStateId: 'exploring' | 'piloting' = 'exploring'
  private justEntered = false

  constructor(pauseMenu: PauseMenu, renderer: THREE.WebGLRenderer) {
    this.pauseMenu = pauseMenu
    this.renderer = renderer
  }

  setPreviousState(id: 'exploring' | 'piloting') {
    this.previousStateId = id
  }

  getPreviousStateId(): 'exploring' | 'piloting' {
    return this.previousStateId
  }

  enter(ctx: GameContext) {
    this.justEntered = true
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock()
    }
    this.pauseMenu.setOpen(true)
    this.pauseMenu.onResume = () => ctx.requestStateChange(this.previousStateId)
  }

  exit(_ctx: GameContext) {
    this.pauseMenu.setOpen(false)
    const result = this.renderer.domElement.requestPointerLock()
    if (result && typeof (result as any).catch === 'function') {
      ;(result as any).catch(() => {})
    }
  }

  update(ctx: GameContext, _dt: number, input: InputState) {
    if (this.justEntered) {
      this.justEntered = false
      return
    }
    if (input.escapePressed) {
      ctx.requestStateChange(this.previousStateId)
    }
  }
}
