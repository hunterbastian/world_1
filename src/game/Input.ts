export type InputState = {
  forward: number
  right: number
  sprint: boolean
  mouseDeltaX: number
  mouseDeltaY: number
  journalToggle: boolean
  interactHeld: boolean
}

export class Input {
  private readonly el: HTMLElement
  private keys = new Set<string>()
  private mouseDX = 0
  private mouseDY = 0
  private sprint = false
  private journalToggle = false
  private interact = false
  private dragging = false
  private hovering = false
  private lastClientX: number | null = null
  private lastClientY: number | null = null

  constructor(element: HTMLElement) {
    this.el = element

    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('mousemove', this.onMouseMove)
    this.el.addEventListener('pointerdown', this.onPointerDown)
    this.el.addEventListener('mouseenter', this.onMouseEnter)
    this.el.addEventListener('mouseleave', this.onMouseLeave)
    window.addEventListener('pointerup', this.onPointerUp)
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('mousemove', this.onMouseMove)
    this.el.removeEventListener('pointerdown', this.onPointerDown)
    this.el.removeEventListener('mouseenter', this.onMouseEnter)
    this.el.removeEventListener('mouseleave', this.onMouseLeave)
    window.removeEventListener('pointerup', this.onPointerUp)
  }

  consume(): InputState {
    const forward = (this.keys.has('KeyW') ? 1 : 0) + (this.keys.has('KeyS') ? -1 : 0)
    const right = (this.keys.has('KeyD') ? 1 : 0) + (this.keys.has('KeyA') ? -1 : 0)

    const out: InputState = {
      forward,
      right,
      sprint: this.sprint,
      mouseDeltaX: this.mouseDX,
      mouseDeltaY: this.mouseDY,
      journalToggle: this.journalToggle,
      interactHeld: this.interact,
    }

    this.mouseDX = 0
    this.mouseDY = 0
    this.journalToggle = false
    return out
  }

  private onPointerDown = (e: PointerEvent) => {
    this.dragging = true
    this.lastClientX = e.clientX
    this.lastClientY = e.clientY
    // Click canvas to lock pointer for mouse orbit.
    if (document.pointerLockElement !== this.el) this.el.requestPointerLock?.()
  }

  private onPointerUp = () => {
    this.dragging = false
    this.lastClientX = null
    this.lastClientY = null
  }

  private onMouseEnter = (e: MouseEvent) => {
    this.hovering = true
    this.lastClientX = e.clientX
    this.lastClientY = e.clientY
  }

  private onMouseLeave = () => {
    this.hovering = false
    if (!this.dragging) {
      this.lastClientX = null
      this.lastClientY = null
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.code === 'Tab') {
      e.preventDefault()
      this.journalToggle = true
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
    const locked = document.pointerLockElement === this.el
    const allowHoverLook = this.hovering && document.hasFocus()
    if (!locked && !this.dragging && !allowHoverLook) return

    let dx = e.movementX || 0
    let dy = e.movementY || 0

    // In many embedded/browser contexts movementX/Y can be 0 without pointer lock.
    // When not pointer-locked, compute deltas from client coords.
    if (!locked) {
      if (this.lastClientX != null && this.lastClientY != null) {
        dx = e.clientX - this.lastClientX
        dy = e.clientY - this.lastClientY
      }
      this.lastClientX = e.clientX
      this.lastClientY = e.clientY
    }

    this.mouseDX += dx
    this.mouseDY += dy
  }
}

