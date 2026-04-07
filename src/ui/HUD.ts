export class HUD {
  public readonly root: HTMLDivElement
  private readonly compassArrow: HTMLDivElement
  private readonly staminaFill: HTMLDivElement
  private readonly prompt: HTMLDivElement

  constructor() {
    this.root = document.createElement('div')
    this.root.id = 'hud'
    this.root.style.position = 'fixed'
    this.root.style.inset = '0'
    this.root.style.pointerEvents = 'none'
    this.root.style.fontFamily = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

    // Compass (top-center)
    const compass = document.createElement('div')
    compass.style.position = 'absolute'
    compass.style.top = '14px'
    compass.style.left = '50%'
    compass.style.transform = 'translateX(-50%)'
    compass.style.width = '176px'
    compass.style.height = '30px'
    compass.className = 'wc-chip'
    compass.style.display = 'grid'
    compass.style.placeItems = 'center'
    this.root.appendChild(compass)

    this.compassArrow = document.createElement('div')
    this.compassArrow.textContent = '▲'
    this.compassArrow.style.color = 'var(--wc-gold)'
    this.compassArrow.style.fontWeight = '900'
    this.compassArrow.style.transform = 'rotate(0rad)'
    this.compassArrow.style.transition = 'transform 60ms linear'
    compass.appendChild(this.compassArrow)

    // Stamina (bottom-left)
    const stamina = document.createElement('div')
    stamina.style.position = 'absolute'
    stamina.style.left = '16px'
    stamina.style.bottom = '16px'
    stamina.style.width = '220px'
    stamina.style.height = '10px'
    stamina.style.borderRadius = '4px'
    stamina.style.background = 'rgba(0,0,0,0.35)'
    stamina.style.border = '1px solid rgba(255, 210, 120, 0.22)'
    stamina.style.overflow = 'hidden'
    this.root.appendChild(stamina)

    this.staminaFill = document.createElement('div')
    this.staminaFill.style.height = '100%'
    this.staminaFill.style.width = '100%'
    this.staminaFill.style.background =
      'linear-gradient(90deg, rgba(255, 210, 120, 0.95), rgba(255, 120, 70, 0.90))'
    this.staminaFill.style.transformOrigin = 'left center'
    this.staminaFill.style.transform = 'scaleX(1)'
    this.staminaFill.style.transition = 'transform 80ms linear'
    stamina.appendChild(this.staminaFill)

    // Prompt (bottom-center)
    this.prompt = document.createElement('div')
    this.prompt.style.position = 'absolute'
    this.prompt.style.left = '50%'
    this.prompt.style.bottom = '18px'
    this.prompt.style.transform = 'translateX(-50%)'
    this.prompt.className = 'wc-chip'
    this.prompt.style.font = '900 12px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    this.prompt.style.letterSpacing = '0.5px'
    this.prompt.style.textTransform = 'uppercase'
    this.prompt.style.opacity = '0'
    this.prompt.style.transition = 'opacity 120ms ease'
    this.root.appendChild(this.prompt)
  }

  setStamina(v01: number) {
    const v = Math.max(0, Math.min(1, v01))
    this.staminaFill.style.transform = `scaleX(${v})`
    this.staminaFill.style.opacity = v < 0.08 ? '0.4' : '1'
  }

  setCompassAngle(angleRad: number) {
    this.compassArrow.style.transform = `rotate(${angleRad}rad)`
  }

  setPrompt(text: string | null) {
    if (!text) {
      this.prompt.style.opacity = '0'
      return
    }
    this.prompt.textContent = text
    this.prompt.style.opacity = '1'
  }
}

