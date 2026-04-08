export type InputState = {
  forward: number
  right: number
  sprint: boolean
  mouseDeltaX: number
  mouseDeltaY: number
  journalToggle: boolean
  interactHeld: boolean
  attackDown: boolean
}

export class Input {
  private readonly el: HTMLElement
  private keys = new Set<string>()
  private mouseDX = 0
  private mouseDY = 0
  private sprint = false
  private journalToggle = false
  private interact = false
  private attackDown = false
  private _locked = false

  constructor(element: HTMLElement) {
    this.el = element

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousemove', this.onMouseMove)
    window.addEventListener('mousedown', this.onMouseDown)
    window.addEventListener('mouseup', this.onMouseUp)
    this.el.addEventListener('click', this.onActivate)
    document.addEventListener('pointerlockchange', this.onLockChange)
  }

  get locked() {
    return this._locked
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    window.removeEventListener('mousedown', this.onMouseDown)
    window.removeEventListener('mouseup', this.onMouseUp)
    this.el.removeEventListener('click', this.onActivate)
    document.removeEventListener('pointerlockchange', this.onLockChange)
    if (document.pointerLockElement === this.el) document.exitPointerLock()
  }

  consume(): InputState {
    const forward = (this.keys.has('KeyW') ? 1 : 0) + (this.keys.has('KeyS') ? -1 : 0)
    const right = (this.keys.has('KeyD') ? 1 : 0) + (this.keys.has('KeyA') ? -1 : 0)

    const out: InputState = {
      forward,
      right,
      sprint: this.sprint,
      mouseDeltaX: this._locked ? this.mouseDX : 0,
      mouseDeltaY: this._locked ? this.mouseDY : 0,
      journalToggle: this.journalToggle,
      interactHeld: this.interact,
      attackDown: this.attackDown,
    }

    this.mouseDX = 0
    this.mouseDY = 0
    this.journalToggle = false
    this.attackDown = false
    return out
  }

  private onActivate = () => {
    if (document.pointerLockElement === this.el) return
    const result = this.el.requestPointerLock()
    if (result && typeof (result as any).catch === 'function') {
      ;(result as any).catch(() => {})
    }
  }

  private onLockChange = () => {
    this._locked = document.pointerLockElement === this.el
    if (!this._locked) {
      this.keys.clear()
      this.sprint = false
      this.interact = false
    }
  }

  private onMouseDown = (e: MouseEvent) => {
    if (!this._locked) return
    if (e.button === 0) this.attackDown = true
  }

  private onMouseUp = () => {}

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this._locked) return
    if (e.code === 'Tab') {
      e.preventDefault()
      this.journalToggle = true
      return
    }
    if (e.code === 'Escape') {
      e.preventDefault()
      return
    }
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = true
    if (e.code === 'KeyE') this.interact = true
    this.keys.add(e.code)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') this.sprint = false
    if (e.code === 'KeyE') this.interact = false
    this.keys.delete(e.code)
  }

  private onMouseMove = (e: MouseEvent) => {
    if (!this._locked) return
    this.mouseDX += e.movementX
    this.mouseDY += e.movementY
  }
}
