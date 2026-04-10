/**
 * Destiny / Halo–style minimal HUD.
 *
 * Design pillars:
 * - Vitals tucked in corners, never center-screen
 * - Thin glowing bars with subtle backdrop — not chunky game-UI bars
 * - Compass is a horizontal strip with cardinal markers, not a single arrow
 * - Interaction prompts are clean chips at bottom-center
 * - Everything uses the Barlow Condensed / system-ui stack from the pause menu
 * - High readability: white on dark with accent glows
 */
export class HUD {
  public readonly root: HTMLDivElement
  private readonly healthFill: HTMLDivElement
  private readonly healthGlow: HTMLDivElement
  private readonly staminaFill: HTMLDivElement
  private readonly xpFill: HTMLDivElement
  // xpLabel reserved for level display
  private readonly walkerBar: HTMLDivElement
  private readonly walkerFill: HTMLDivElement
  private readonly compassStrip: HTMLDivElement
  private readonly compassPointer: HTMLDivElement
  private readonly prompt: HTMLDivElement
  private readonly crosshair: HTMLDivElement

  private readonly font = `'Barlow Condensed', 'Rajdhani', system-ui, -apple-system, sans-serif`

  constructor() {
    this.root = document.createElement('div')
    this.root.id = 'hud'
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      zIndex: '10',
    })

    // ── Vitals cluster (bottom-left) — Destiny puts vitals low ──
    const vitals = this.makeDiv({
      position: 'absolute',
      left: '28px',
      bottom: '28px',
      display: 'flex',
      flexDirection: 'column',
      gap: '6px',
    })
    this.root.appendChild(vitals)

    // Health bar
    const hpRow = this.makeBarRow('HP', '#e04858', '#c03040')
    this.healthFill = hpRow.fill
    this.healthGlow = hpRow.glow
    vitals.appendChild(hpRow.row)

    // Stamina bar
    const staRow = this.makeBarRow('STA', 'rgba(255,255,255,0.85)', 'rgba(255,255,255,0.55)')
    this.staminaFill = staRow.fill
    vitals.appendChild(staRow.row)

    // XP bar (wider, with level indicator)
    const xpRow = this.makeBarRow('XP', '#50a8e8', '#3078b8')
    this.xpFill = xpRow.fill
    // xpRow.label available for level display later
    vitals.appendChild(xpRow.row)

    // Walker MECH bar (hidden until piloting)
    const wkRow = this.makeBarRow('MECH', '#40c898', '#28a880')
    this.walkerBar = wkRow.row
    this.walkerFill = wkRow.fill
    wkRow.row.style.display = 'none'
    vitals.appendChild(wkRow.row)

    // ── Compass strip (top-center) ──
    const compassWrap = this.makeDiv({
      position: 'absolute',
      top: '16px',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '220px',
      height: '28px',
      overflow: 'hidden',
    })
    this.root.appendChild(compassWrap)

    // Fade edges
    const compassFade = this.makeDiv({
      position: 'absolute',
      inset: '0',
      background: 'linear-gradient(90deg, rgba(0,0,0,0.8) 0%, transparent 15%, transparent 85%, rgba(0,0,0,0.8) 100%)',
      pointerEvents: 'none',
      zIndex: '2',
    })
    compassWrap.appendChild(compassFade)

    // Moving strip
    this.compassStrip = this.makeDiv({
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      font: `500 10px/1 ${this.font}`,
      letterSpacing: '0.15em',
      color: 'rgba(255,255,255,0.35)',
      userSelect: 'none',
      transition: 'none',
    })
    compassWrap.appendChild(this.compassStrip)

    // Center tick
    this.compassPointer = this.makeDiv({
      position: 'absolute',
      top: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '1px',
      height: '10px',
      background: 'rgba(255,255,255,0.6)',
      zIndex: '3',
    })
    compassWrap.appendChild(this.compassPointer)

    // Bottom notch
    const notch = this.makeDiv({
      position: 'absolute',
      bottom: '0',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '1px',
      height: '6px',
      background: 'rgba(255,255,255,0.3)',
      zIndex: '3',
    })
    compassWrap.appendChild(notch)

    // ── Crosshair (center, hidden by default) ──
    this.crosshair = this.makeCrosshair()
    this.root.appendChild(this.crosshair)

    // ── Prompt (bottom-center) ──
    this.prompt = this.makeDiv({
      position: 'absolute',
      left: '50%',
      bottom: '36px',
      transform: 'translateX(-50%)',
      font: `500 11px/1 ${this.font}`,
      letterSpacing: '0.18em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.75)',
      padding: '8px 18px',
      background: 'rgba(10, 14, 20, 0.55)',
      border: '1px solid rgba(255,255,255,0.10)',
      borderRadius: '4px',
      backdropFilter: 'blur(8px)',
      opacity: '0',
      transition: 'opacity 150ms ease',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    })
    this.root.appendChild(this.prompt)
  }

  // ── Public API ──

  setHealth(v01: number) {
    const v = Math.max(0, Math.min(1, v01))
    this.healthFill.style.transform = `scaleX(${v})`
    if (v < 0.25) {
      this.healthFill.style.animation = 'hudPulse 1s ease-in-out infinite'
      this.healthGlow.style.opacity = '0.6'
    } else {
      this.healthFill.style.animation = 'none'
      this.healthGlow.style.opacity = '0'
    }
  }

  setStamina(v01: number) {
    const v = Math.max(0, Math.min(1, v01))
    this.staminaFill.style.transform = `scaleX(${v})`
    this.staminaFill.style.opacity = v < 0.08 ? '0.3' : '1'
  }

  setXP(v01: number) {
    const v = Math.max(0, Math.min(1, v01))
    this.xpFill.style.transform = `scaleX(${v})`
  }

  setWalkerHealth(v01: number | null) {
    if (v01 === null) {
      this.walkerBar.style.display = 'none'
      return
    }
    this.walkerBar.style.display = 'flex'
    const v = Math.max(0, Math.min(1, v01))
    this.walkerFill.style.transform = `scaleX(${v})`
  }

  setCompassAngle(angleRad: number) {
    const deg = (angleRad * 180) / Math.PI
    this.compassStrip.style.transform = `translateX(${-deg * 0.6}px)`
  }

  setCrosshair(visible: boolean) {
    this.crosshair.style.opacity = visible ? '1' : '0'
  }

  setPrompt(text: string | null) {
    if (!text) {
      this.prompt.style.opacity = '0'
      return
    }
    this.prompt.textContent = text
    this.prompt.style.opacity = '1'
  }

  // ── Activation ring ──

  private activationRing: HTMLDivElement | null = null
  private activationSvg: SVGCircleElement | null = null
  private activationLabel: HTMLDivElement | null = null

  private ensureActivationRing() {
    if (this.activationRing) return

    const size = 64
    const stroke = 2
    const r = (size - stroke * 2) / 2

    this.activationRing = this.makeDiv({
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${size}px`,
      height: `${size}px`,
      opacity: '0',
      transition: 'opacity 150ms ease',
      pointerEvents: 'none',
    })

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', String(size))
    svg.setAttribute('height', String(size))
    svg.style.transform = 'rotate(-90deg)'

    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    bgCircle.setAttribute('cx', String(size / 2))
    bgCircle.setAttribute('cy', String(size / 2))
    bgCircle.setAttribute('r', String(r))
    bgCircle.setAttribute('fill', 'none')
    bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.08)')
    bgCircle.setAttribute('stroke-width', String(stroke))
    svg.appendChild(bgCircle)

    const fillCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    fillCircle.setAttribute('cx', String(size / 2))
    fillCircle.setAttribute('cy', String(size / 2))
    fillCircle.setAttribute('r', String(r))
    fillCircle.setAttribute('fill', 'none')
    fillCircle.setAttribute('stroke', 'rgba(74, 212, 232, 0.85)')
    fillCircle.setAttribute('stroke-width', String(stroke))
    const circumference = 2 * Math.PI * r
    fillCircle.setAttribute('stroke-dasharray', String(circumference))
    fillCircle.setAttribute('stroke-dashoffset', String(circumference))
    fillCircle.setAttribute('stroke-linecap', 'round')
    svg.appendChild(fillCircle)
    this.activationSvg = fillCircle

    this.activationRing.appendChild(svg)

    this.activationLabel = this.makeDiv({
      position: 'absolute',
      top: `${size + 10}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      font: `500 9px/1 ${this.font}`,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'rgba(74, 212, 232, 0.7)',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    })
    this.activationLabel.textContent = 'Hold E — Activate'
    this.activationRing.appendChild(this.activationLabel)

    this.root.appendChild(this.activationRing)
  }

  setActivationRing(progress: number | null) {
    this.ensureActivationRing()
    if (!this.activationRing || !this.activationSvg) return

    if (progress === null) {
      this.activationRing.style.opacity = '0'
      return
    }

    this.activationRing.style.opacity = '1'
    const size = 64
    const stroke = 2
    const r = (size - stroke * 2) / 2
    const circumference = 2 * Math.PI * r
    const offset = circumference * (1 - Math.min(1, Math.max(0, progress)))
    this.activationSvg.setAttribute('stroke-dashoffset', String(offset))

    const glow = 0.85 + progress * 0.15
    this.activationSvg.setAttribute('stroke', `rgba(74, 212, 232, ${glow})`)
  }

  // ── Internal helpers ──

  private makeDiv(styles: Record<string, string>): HTMLDivElement {
    const el = document.createElement('div')
    Object.assign(el.style, styles)
    return el
  }

  private makeBarRow(label: string, colorA: string, colorB: string) {
    const row = this.makeDiv({
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
    })

    const lbl = this.makeDiv({
      font: `600 8px/1 ${this.font}`,
      letterSpacing: '0.2em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.30)',
      width: '28px',
      textAlign: 'right',
      userSelect: 'none',
    })
    lbl.textContent = label
    row.appendChild(lbl)

    const barWrap = this.makeDiv({
      position: 'relative',
      width: '140px',
      height: '3px',
    })

    const track = this.makeDiv({
      position: 'absolute',
      inset: '0',
      borderRadius: '2px',
      background: 'rgba(255,255,255,0.06)',
    })
    barWrap.appendChild(track)

    const fill = this.makeDiv({
      position: 'absolute',
      inset: '0',
      borderRadius: '2px',
      background: `linear-gradient(90deg, ${colorB}, ${colorA})`,
      transformOrigin: 'left center',
      transition: 'transform 80ms linear',
    })
    barWrap.appendChild(fill)

    // Glow layer for low-health warning
    const glow = this.makeDiv({
      position: 'absolute',
      inset: '-4px -2px',
      borderRadius: '4px',
      background: colorA,
      filter: 'blur(6px)',
      opacity: '0',
      transition: 'opacity 300ms ease',
      pointerEvents: 'none',
    })
    barWrap.appendChild(glow)

    row.appendChild(barWrap)

    return { row, fill, glow, label: lbl }
  }

  private makeCrosshair(): HTMLDivElement {
    const size = 24
    const wrap = this.makeDiv({
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: `${size}px`,
      height: `${size}px`,
      opacity: '0',
      transition: 'opacity 100ms ease',
      pointerEvents: 'none',
    })

    const c = 'rgba(255,255,255,0.3)'
    const arm = 6

    // Top arm
    wrap.appendChild(this.makeCrosshairArm(size / 2, 0, 1, arm, c))
    // Bottom arm
    wrap.appendChild(this.makeCrosshairArm(size / 2, size - arm, 1, arm, c))
    // Left arm
    wrap.appendChild(this.makeCrosshairArm(0, size / 2, arm, 1, c))
    // Right arm
    wrap.appendChild(this.makeCrosshairArm(size - arm, size / 2, arm, 1, c))

    // Center dot
    const dot = this.makeDiv({
      position: 'absolute',
      top: `${size / 2 - 1}px`,
      left: `${size / 2 - 1}px`,
      width: '2px',
      height: '2px',
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.5)',
    })
    wrap.appendChild(dot)

    return wrap
  }

  private makeCrosshairArm(x: number, y: number, w: number, h: number, color: string): HTMLDivElement {
    return this.makeDiv({
      position: 'absolute',
      left: `${x}px`,
      top: `${y}px`,
      width: `${w}px`,
      height: `${h}px`,
      background: color,
    })
  }
}
