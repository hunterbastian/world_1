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

    // ── Crosshair (center, hidden) ──
    this.crosshair = document.createElement('div')
    Object.assign(this.crosshair.style, {
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '20px',
      height: '20px',
      opacity: '0',
      transition: 'opacity 100ms ease',
      pointerEvents: 'none',
    })

    const cc = 'rgba(255,255,255,0.25)'
    const hLine = document.createElement('div')
    Object.assign(hLine.style, {
      position: 'absolute',
      top: '50%',
      left: '0',
      width: '100%',
      height: '1px',
      background: `linear-gradient(90deg, ${cc} 0%, ${cc} 30%, transparent 30%, transparent 70%, ${cc} 70%, ${cc} 100%)`,
    })
    this.crosshair.appendChild(hLine)

    const vLine = document.createElement('div')
    Object.assign(vLine.style, {
      position: 'absolute',
      left: '50%',
      top: '0',
      width: '1px',
      height: '100%',
      background: `linear-gradient(180deg, ${cc} 0%, ${cc} 30%, transparent 30%, transparent 70%, ${cc} 70%, ${cc} 100%)`,
    })
    this.crosshair.appendChild(vLine)

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
}
