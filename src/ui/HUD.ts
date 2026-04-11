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

    // ── Reticle: layered Destiny / Halo–style HUD (SVG + CSS motion) ──
    this.crosshair = document.createElement('div')
    this.crosshair.className = 'hud-reticle'
    Object.assign(this.crosshair.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '64px',
      height: '64px',
      opacity: '0',
      transition: 'opacity 160ms ease',
      pointerEvents: 'none',
    })

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svg.setAttribute('width', '64')
    svg.setAttribute('height', '64')
    svg.setAttribute('viewBox', '0 0 56 56')
    svg.setAttribute('class', 'hud-reticle-svg')
    svg.style.display = 'block'

    const cx = 28
    const cy = 28
    const rOuter = 15.5
    const rTick = 12
    const strokeAccent = 'rgba(74, 212, 232, 0.95)'
    const strokeDim = 'rgba(255,255,255,0.18)'

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    const gradBracket = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient')
    gradBracket.setAttribute('id', 'hudReticleBracket')
    gradBracket.setAttribute('x1', '0%')
    gradBracket.setAttribute('y1', '0%')
    gradBracket.setAttribute('x2', '100%')
    gradBracket.setAttribute('y2', '100%')
    const gs0 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    gs0.setAttribute('offset', '0%')
    gs0.setAttribute('stop-color', '#ffffff')
    gs0.setAttribute('stop-opacity', '0.95')
    const gs1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    gs1.setAttribute('offset', '100%')
    gs1.setAttribute('stop-color', '#4ad4e8')
    gs1.setAttribute('stop-opacity', '0.9')
    gradBracket.appendChild(gs0)
    gradBracket.appendChild(gs1)
    defs.appendChild(gradBracket)

    const gradDot = document.createElementNS('http://www.w3.org/2000/svg', 'radialGradient')
    gradDot.setAttribute('id', 'hudReticleDot')
    const gc = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    gc.setAttribute('offset', '0%')
    gc.setAttribute('stop-color', '#ffffff')
    const ge = document.createElementNS('http://www.w3.org/2000/svg', 'stop')
    ge.setAttribute('offset', '100%')
    ge.setAttribute('stop-color', '#4ad4e8')
    gradDot.appendChild(gc)
    gradDot.appendChild(ge)
    defs.appendChild(gradDot)
    svg.appendChild(defs)

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

    const gOrbit = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    gOrbit.setAttribute('class', 'hud-reticle-pilot-only')
    gOrbit.setAttribute('transform', `translate(${cx} ${cy})`)
    const gOrbitSpin = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    gOrbitSpin.setAttribute('class', 'hud-reticle-orbit-spin')
    const orbitCirc = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    orbitCirc.setAttribute('cx', '0')
    orbitCirc.setAttribute('cy', '0')
    orbitCirc.setAttribute('r', String(rOuter + 5.2))
    orbitCirc.setAttribute('fill', 'none')
    orbitCirc.setAttribute('stroke', strokeAccent)
    orbitCirc.setAttribute('stroke-width', '0.85')
    orbitCirc.setAttribute('stroke-dasharray', '2.4 4')
    orbitCirc.setAttribute('opacity', '0.5')
    gOrbitSpin.appendChild(orbitCirc)
    gOrbit.appendChild(gOrbitSpin)
    svg.appendChild(gOrbit)

    // Pilot-only: corner brackets (Halo-style frame)
    const gCorners = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    gCorners.setAttribute('class', 'hud-reticle-corners hud-reticle-pilot-only')
    const L = 5.5
    const inset = 5
    const corners: Array<{ x: number; y: number; hx: number; hy: number }> = [
      { x: inset, y: inset, hx: 1, hy: 1 },
      { x: 56 - inset, y: inset, hx: -1, hy: 1 },
      { x: inset, y: 56 - inset, hx: 1, hy: -1 },
      { x: 56 - inset, y: 56 - inset, hx: -1, hy: -1 },
    ]
    for (const c of corners) {
      const h = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const x1 = c.x + L * c.hx
      const y1 = c.y
      const x2 = c.x
      const y2 = c.y + L * c.hy
      h.setAttribute('d', `M ${c.x} ${c.y} L ${x1} ${y1} M ${c.x} ${c.y} L ${x2} ${y2}`)
      h.setAttribute('fill', 'none')
      h.setAttribute('stroke', 'url(#hudReticleBracket)')
      h.setAttribute('stroke-width', '1.5')
      h.setAttribute('stroke-linecap', 'square')
      h.setAttribute('stroke-linejoin', 'miter')
      gCorners.appendChild(h)
    }
    svg.appendChild(gCorners)

    const ringFaint = arc(0, Math.PI * 2 - 0.001, rOuter + 1.8, 0.55, strokeDim)
    ringFaint.setAttribute('class', 'hud-reticle-ring-outer hud-reticle-pilot-only')
    svg.appendChild(ringFaint)

    const gap = 0.4
    const q = Math.PI / 2
    for (let i = 0; i < 4; i++) {
      const mid = i * q - Math.PI / 2
      const a0 = mid - q / 2 + gap
      const a1 = mid + q / 2 - gap
      const useGrad = i === 0 || i === 2
      const path = arc(a0, a1, rOuter, 1.45, useGrad ? 'url(#hudReticleBracket)' : strokeAccent)
      path.setAttribute('class', 'hud-reticle-quad hud-reticle-pilot-only')
      svg.appendChild(path)
    }

    // Cardinal ticks + diagonals (pilot: full; explore hides diagonals via CSS)
    const gTicks = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    gTicks.setAttribute('class', 'hud-reticle-ticks')
    for (let i = 0; i < 4; i++) {
      const a = i * q - Math.PI / 2
      const x0 = cx + Math.cos(a) * (rTick - 2.2)
      const y0 = cy + Math.sin(a) * (rTick - 2.2)
      const x1 = cx + Math.cos(a) * (rTick + 3.2)
      const y1 = cy + Math.sin(a) * (rTick + 3.2)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('x1', String(x0))
      line.setAttribute('y1', String(y0))
      line.setAttribute('x2', String(x1))
      line.setAttribute('y2', String(y1))
      line.setAttribute('stroke', strokeAccent)
      line.setAttribute('stroke-width', '1.15')
      line.setAttribute('stroke-linecap', 'round')
      gTicks.appendChild(line)
    }
    const diagClass = 'hud-reticle-tick-diag'
    for (let i = 0; i < 4; i++) {
      const a = i * q - Math.PI / 2 + Math.PI / 4
      const x0 = cx + Math.cos(a) * (rTick - 0.5)
      const y0 = cy + Math.sin(a) * (rTick - 0.5)
      const x1 = cx + Math.cos(a) * (rTick + 2.2)
      const y1 = cy + Math.sin(a) * (rTick + 2.2)
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
      line.setAttribute('class', diagClass)
      line.setAttribute('x1', String(x0))
      line.setAttribute('y1', String(y0))
      line.setAttribute('x2', String(x1))
      line.setAttribute('y2', String(y1))
      line.setAttribute('stroke', strokeDim)
      line.setAttribute('stroke-width', '0.9')
      line.setAttribute('stroke-linecap', 'round')
      gTicks.appendChild(line)
    }
    svg.appendChild(gTicks)

    // Center: ring + pip + soft glow
    const glow = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    glow.setAttribute('class', 'hud-reticle-glow')
    glow.setAttribute('cx', String(cx))
    glow.setAttribute('cy', String(cy))
    glow.setAttribute('r', '5')
    glow.setAttribute('fill', 'rgba(74, 212, 232, 0.12)')
    svg.appendChild(glow)

    const dotRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dotRing.setAttribute('cx', String(cx))
    dotRing.setAttribute('cy', String(cy))
    dotRing.setAttribute('r', '3.6')
    dotRing.setAttribute('fill', 'none')
    dotRing.setAttribute('stroke', strokeAccent)
    dotRing.setAttribute('stroke-width', '1')
    dotRing.setAttribute('opacity', '0.75')
    svg.appendChild(dotRing)

    const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    dot.setAttribute('cx', String(cx))
    dot.setAttribute('cy', String(cy))
    dot.setAttribute('r', '1.5')
    dot.setAttribute('fill', 'url(#hudReticleDot)')
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

  /** `mode`: pilot = full sci-fi reticle + motion; explore = minimal center stack */
  setCrosshair(visible: boolean, mode: 'pilot' | 'explore' = 'pilot') {
    if (!visible) {
      this.crosshair.style.opacity = '0'
      delete this.crosshair.dataset.reticleMode
      return
    }
    this.crosshair.dataset.reticleMode = mode
    this.crosshair.style.opacity = '1'
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
