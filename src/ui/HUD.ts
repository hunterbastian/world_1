export class HUD {
  public readonly root: HTMLDivElement
  private readonly healthFill: HTMLDivElement
  private readonly staminaFill: HTMLDivElement
  private readonly xpFill: HTMLDivElement
  private readonly walkerBar: HTMLDivElement
  private readonly walkerFill: HTMLDivElement
  private readonly compassArrow: HTMLDivElement
  private readonly prompt: HTMLDivElement
  private readonly crosshair: HTMLDivElement

  constructor() {
    const f = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    this.root = document.createElement('div')
    this.root.id = 'hud'
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      fontFamily: f,
      zIndex: '10',
    })

    // ── Bar stack (top-left) ──
    const barStack = document.createElement('div')
    Object.assign(barStack.style, {
      position: 'absolute',
      left: '24px',
      top: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
    })
    this.root.appendChild(barStack)

    const makeBar = (colorA: string, colorB: string, label: string) => {
      const row = document.createElement('div')
      Object.assign(row.style, {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      })

      const lbl = document.createElement('div')
      Object.assign(lbl.style, {
        font: `400 9px/1 ${f}`,
        letterSpacing: '1.4px',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.28)',
        width: '24px',
        textAlign: 'right',
        userSelect: 'none',
      })
      lbl.textContent = label
      row.appendChild(lbl)

      const bar = document.createElement('div')
      bar.className = 'ui-bar'

      const fill = document.createElement('div')
      fill.className = 'ui-bar-fill'
      fill.style.background = `linear-gradient(90deg, ${colorA}, ${colorB})`
      fill.style.transform = 'scaleX(1)'
      bar.appendChild(fill)
      row.appendChild(bar)

      return { row, fill }
    }

    const hp = makeBar('#c03040', '#e04858', 'HP')
    this.healthFill = hp.fill
    barStack.appendChild(hp.row)

    const sta = makeBar('rgba(255,255,255,0.65)', 'rgba(255,255,255,0.85)', 'STA')
    this.staminaFill = sta.fill
    barStack.appendChild(sta.row)

    const xp = makeBar('#3088cc', '#50a8e8', 'XP')
    this.xpFill = xp.fill
    barStack.appendChild(xp.row)

    const wk = makeBar('#28a880', '#40c898', 'MECH')
    this.walkerBar = wk.row
    this.walkerFill = wk.fill
    wk.row.style.display = 'none'
    barStack.appendChild(wk.row)

    // ── Compass (top-center) ──
    this.compassArrow = document.createElement('div')
    Object.assign(this.compassArrow.style, {
      position: 'absolute',
      top: '22px',
      left: '50%',
      transform: 'translateX(-50%)',
      font: `300 18px/1 ${f}`,
      color: 'rgba(255,255,255,0.50)',
      textShadow: '0 0 8px rgba(255,255,255,0.15)',
      transition: 'transform 60ms linear',
      userSelect: 'none',
    })
    this.compassArrow.textContent = '▲'
    this.root.appendChild(this.compassArrow)

    // ── Crosshair: Destiny / Halo–style sci-fi reticle (SVG) ──
    this.crosshair = document.createElement('div')
    this.crosshair.className = 'hud-reticle'
    Object.assign(this.crosshair.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '48px',
      height: '48px',
      opacity: '0',
      transition: 'opacity 120ms ease, transform 120ms ease',
      pointerEvents: 'none',
    })

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '48')
    svg.setAttribute('height', '48')
    svg.setAttribute('viewBox', '0 0 48 48')
    svg.style.display = 'block'
    svg.style.filter = 'drop-shadow(0 0 4px rgba(74, 212, 232, 0.35))'

    const cx = 24
    const cy = 24
    const rOuter = 14
    const rTick = 11
    const strokeMain = 'rgba(255,255,255,0.82)'
    const strokeAccent = 'rgba(74, 212, 232, 0.92)'
    const strokeDim = 'rgba(255,255,255,0.22)'

    const arc = (a0: number, a1: number, rad: number, sw: number, col: string, dash?: string) => {
      const el = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const x0 = cx + Math.cos(a0) * rad
      const y0 = cy + Math.sin(a0) * rad
      const x1 = cx + Math.cos(a1) * rad
      const y1 = cy + Math.sin(a1) * rad
      const large = a1 - a0 > Math.PI ? 1 : 0
      el.setAttribute('d', `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${rad} ${rad} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`)
      el.setAttribute('fill', 'none')
      el.setAttribute('stroke', col)
      el.setAttribute('stroke-width', String(sw))
      el.setAttribute('stroke-linecap', 'round')
      if (dash) el.setAttribute('stroke-dasharray', dash)
      return el
    }

    // Faint full ring (orientation)
    svg.appendChild(arc(0, Math.PI * 2 - 0.001, rOuter + 2, 0.6, strokeDim))

    // Four bracket arcs (Destiny-ish broken circle)
    const gap = 0.42
    const q = Math.PI / 2
    for (let i = 0; i < 4; i++) {
      const mid = i * q - Math.PI / 2
      const a0 = mid - q / 2 + gap
      const a1 = mid + q / 2 - gap
      svg.appendChild(arc(a0, a1, rOuter, 1.35, i % 2 === 0 ? strokeMain : strokeAccent))
    }

    // Inner tick marks at cardinals
    for (let i = 0; i < 4; i++) {
      const a = i * q - Math.PI / 2
      const x0 = cx + Math.cos(a) * (rTick - 2)
      const y0 = cy + Math.sin(a) * (rTick - 2)
      const x1 = cx + Math.cos(a) * (rTick + 2.5)
      const y1 = cy + Math.sin(a) * (rTick + 2.5)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(x0))
      line.setAttribute('y1', String(y0))
      line.setAttribute('x2', String(x1))
      line.setAttribute('y2', String(y1))
      line.setAttribute('stroke', strokeAccent)
      line.setAttribute('stroke-width', '1.1')
      line.setAttribute('stroke-linecap', 'round')
      svg.appendChild(line)
    }

    // Center dot + soft ring
    const dotRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dotRing.setAttribute('cx', String(cx))
    dotRing.setAttribute('cy', String(cy))
    dotRing.setAttribute('r', '3.2')
    dotRing.setAttribute('fill', 'none')
    dotRing.setAttribute('stroke', strokeAccent)
    dotRing.setAttribute('stroke-width', '0.9')
    dotRing.setAttribute('opacity', '0.65')
    svg.appendChild(dotRing)

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', String(cx))
    dot.setAttribute('cy', String(cy))
    dot.setAttribute('r', '1.35')
    dot.setAttribute('fill', strokeMain)
    svg.appendChild(dot)

    this.crosshair.appendChild(svg)
    this.root.appendChild(this.crosshair)

    // ── Prompt (bottom-center) ──
    this.prompt = document.createElement('div')
    this.prompt.className = 'ui-chip'
    Object.assign(this.prompt.style, {
      position: 'absolute',
      left: '50%',
      bottom: '28px',
      transform: 'translateX(-50%)',
      font: `400 11px/1 ${f}`,
      letterSpacing: '1px',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.70)',
      opacity: '0',
      transition: 'opacity 100ms ease',
    })
    this.root.appendChild(this.prompt)
  }

  setHealth(v01: number) {
    const v = Math.max(0, Math.min(1, v01))
    this.healthFill.style.transform = `scaleX(${v})`
    if (v < 0.25) {
      this.healthFill.classList.add('ui-bar-fill--low')
    } else {
      this.healthFill.classList.remove('ui-bar-fill--low')
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
    this.compassArrow.style.transform = `translateX(-50%) rotate(${angleRad}rad)`
  }

  /** `mode`: pilot = full sci-fi reticle; explore = subtle center dot only; off = hidden */
  setCrosshair(visible: boolean, mode: 'pilot' | 'explore' = 'pilot') {
    if (!visible) {
      this.crosshair.style.opacity = '0'
      this.crosshair.style.transform = 'translate(-50%, -50%) scale(1)'
      return
    }
    const svg = this.crosshair.querySelector('svg')
    if (svg) {
      svg.style.opacity = mode === 'explore' ? '0.45' : '1'
      svg.style.transform = mode === 'explore' ? 'scale(0.42)' : 'scale(1)'
    }
    this.crosshair.style.opacity = '1'
    this.crosshair.style.transform =
      mode === 'explore' ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(1)'
  }

  setPrompt(text: string | null) {
    if (!text) {
      this.prompt.style.opacity = '0'
      return
    }
    this.prompt.textContent = text
    this.prompt.style.opacity = '1'
  }

  // ── Activation ring (center screen, SVG arc) ──

  private activationRing: HTMLDivElement | null = null
  private activationSvg: SVGCircleElement | null = null
  private activationLabel: HTMLDivElement | null = null

  private ensureActivationRing() {
    if (this.activationRing) return

    const size = 72
    const stroke = 3
    const r = (size - stroke * 2) / 2

    this.activationRing = document.createElement('div')
    Object.assign(this.activationRing.style, {
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
    svg.style.transform = 'rotate(-90deg)' // start from top

    // Background ring
    const bgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    bgCircle.setAttribute('cx', String(size / 2))
    bgCircle.setAttribute('cy', String(size / 2))
    bgCircle.setAttribute('r', String(r))
    bgCircle.setAttribute('fill', 'none')
    bgCircle.setAttribute('stroke', 'rgba(255,255,255,0.12)')
    bgCircle.setAttribute('stroke-width', String(stroke))
    svg.appendChild(bgCircle)

    // Fill ring
    const fillCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    fillCircle.setAttribute('cx', String(size / 2))
    fillCircle.setAttribute('cy', String(size / 2))
    fillCircle.setAttribute('r', String(r))
    fillCircle.setAttribute('fill', 'none')
    fillCircle.setAttribute('stroke', 'rgba(255,200,140,0.85)')
    fillCircle.setAttribute('stroke-width', String(stroke))
    const circumference = 2 * Math.PI * r
    fillCircle.setAttribute('stroke-dasharray', String(circumference))
    fillCircle.setAttribute('stroke-dashoffset', String(circumference))
    fillCircle.setAttribute('stroke-linecap', 'round')
    svg.appendChild(fillCircle)
    this.activationSvg = fillCircle

    this.activationRing.appendChild(svg)

    // Label below ring
    const f = 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    this.activationLabel = document.createElement('div')
    Object.assign(this.activationLabel.style, {
      position: 'absolute',
      top: `${size + 8}px`,
      left: '50%',
      transform: 'translateX(-50%)',
      font: `400 9px/1 ${f}`,
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      color: 'rgba(255,200,140,0.7)',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    })
    this.activationLabel.textContent = 'Hold E — Activate'
    this.activationRing.appendChild(this.activationLabel)

    this.root.appendChild(this.activationRing)
  }

  /** Show/update the activation ring. progress 0-1, null to hide. */
  setActivationRing(progress: number | null) {
    this.ensureActivationRing()
    if (!this.activationRing || !this.activationSvg) return

    if (progress === null) {
      this.activationRing.style.opacity = '0'
      return
    }

    this.activationRing.style.opacity = '1'
    const size = 72
    const stroke = 3
    const r = (size - stroke * 2) / 2
    const circumference = 2 * Math.PI * r
    const offset = circumference * (1 - Math.min(1, Math.max(0, progress)))
    this.activationSvg.setAttribute('stroke-dashoffset', String(offset))

    // Glow brighter as it fills
    const glow = 0.85 + progress * 0.15
    this.activationSvg.setAttribute('stroke', `rgba(255,200,140,${glow})`)
  }
}
