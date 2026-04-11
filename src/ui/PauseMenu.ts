import type { UISounds } from './UISounds'

export type CharacterStats = {
  level: number
  health: number
  maxHealth: number
  stamina: number
  maxStamina: number
  speed: number
}

export type WalkerStats = {
  name: string
  tier: string
  health: number
  maxHealth: number
  armor: number
  turretDamage: number
}

export type InventoryItem = {
  name: string
  count: number
}

export class PauseMenu {
  public readonly root: HTMLDivElement
  public onResume: (() => void) | null = null
  public onRestart: (() => void) | null = null
  public onQuit: (() => void) | null = null

  private uiSounds: UISounds | null = null

  private readonly contentArea: HTMLDivElement
  private readonly charSection: HTMLDivElement
  private readonly walkerSection: HTMLDivElement
  private readonly inventorySection: HTMLDivElement
  private open = false

  private charStats: CharacterStats = {
    level: 1,
    health: 100,
    maxHealth: 100,
    stamina: 100,
    maxStamina: 100,
    speed: 1.0,
  }
  private walkerStats: WalkerStats | null = null
  private inventory: InventoryItem[] = []

  constructor() {
    this.root = document.createElement('div')
    this.root.id = 'pause-menu'
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      display: 'grid',
      placeItems: 'center',
      opacity: '0',
      visibility: 'hidden',
      transition: 'opacity 200ms ease',
      zIndex: '30',
    })

    const scrim = document.createElement('div')
    scrim.className = 'ui-scrim'
    Object.assign(scrim.style, { position: 'absolute', inset: '0' })
    this.root.appendChild(scrim)

    const shell = document.createElement('div')
    shell.className = 'pause-menu-shell'

    const nav = document.createElement('nav')
    nav.className = 'pause-menu-nav'
    nav.setAttribute('aria-label', 'Pause actions')

    const navLabel = document.createElement('p')
    navLabel.className = 'pause-menu-nav-label'
    navLabel.textContent = 'Directives'
    nav.appendChild(navLabel)

    const resumeBtn = document.createElement('button')
    resumeBtn.type = 'button'
    resumeBtn.className = 'pause-menu-nav-btn pause-menu-nav-btn--primary'
    resumeBtn.textContent = 'Resume'
    resumeBtn.addEventListener('click', () => {
      this.uiSounds?.menuSelect()
      this.setOpen(false)
      this.onResume?.()
    })
    resumeBtn.addEventListener('mouseenter', () => {
      this.uiSounds?.menuHover()
    })
    nav.appendChild(resumeBtn)

    const restartBtn = document.createElement('button')
    restartBtn.type = 'button'
    restartBtn.className = 'pause-menu-nav-btn'
    restartBtn.textContent = 'Restart'
    restartBtn.addEventListener('click', () => {
      this.uiSounds?.menuSelect()
      this.onRestart?.()
    })
    restartBtn.addEventListener('mouseenter', () => {
      this.uiSounds?.menuHover()
    })
    nav.appendChild(restartBtn)

    const quitBtn = document.createElement('button')
    quitBtn.type = 'button'
    quitBtn.className = 'pause-menu-nav-btn pause-menu-nav-btn--danger'
    quitBtn.textContent = 'Quit'
    quitBtn.addEventListener('click', () => {
      this.uiSounds?.menuSelect()
      this.onQuit?.()
    })
    quitBtn.addEventListener('mouseenter', () => {
      this.uiSounds?.menuHover()
    })
    nav.appendChild(quitBtn)

    const main = document.createElement('div')
    main.className = 'pause-menu-main'

    const header = document.createElement('header')
    header.className = 'pause-menu-header'

    const gameLine = document.createElement('p')
    gameLine.className = 'pause-menu-game'
    gameLine.textContent = 'Glasswake'

    const tagLine = document.createElement('p')
    tagLine.className = 'pause-menu-tag'
    tagLine.textContent = 'Session suspended'

    const title = document.createElement('h1')
    title.className = 'pause-menu-title'
    title.textContent = 'Paused'

    header.appendChild(gameLine)
    header.appendChild(tagLine)
    header.appendChild(title)
    main.appendChild(header)

    this.contentArea = document.createElement('div')
    this.contentArea.className = 'pause-menu-body ui-scroll'

    this.charSection = document.createElement('div')
    this.contentArea.appendChild(this.charSection)

    this.walkerSection = document.createElement('div')
    this.contentArea.appendChild(this.walkerSection)

    this.inventorySection = document.createElement('div')
    this.contentArea.appendChild(this.inventorySection)

    main.appendChild(this.contentArea)
    shell.appendChild(nav)
    shell.appendChild(main)
    this.root.appendChild(shell)

    this.renderSections()
  }

  toggle() {
    this.setOpen(!this.open)
  }

  isOpen() {
    return this.open
  }

  setOpen(open: boolean) {
    this.open = open
    if (open) {
      this.uiSounds?.menuOpen()
    } else {
      this.uiSounds?.menuClose()
    }
    this.root.style.opacity = open ? '1' : '0'
    this.root.style.pointerEvents = open ? 'auto' : 'none'
    this.root.style.visibility = open ? 'visible' : 'hidden'
    if (open) this.renderSections()
  }

  setUISounds(sounds: UISounds) {
    this.uiSounds = sounds
  }

  setCharacterStats(stats: CharacterStats) {
    this.charStats = stats
    if (this.open) this.renderSections()
  }

  setWalkerStats(stats: WalkerStats | null) {
    this.walkerStats = stats
    if (this.open) this.renderSections()
  }

  setInventory(items: InventoryItem[]) {
    this.inventory = items
    if (this.open) this.renderSections()
  }

  private renderSections() {
    this.renderCharacter()
    this.renderWalker()
    this.renderInventory()
  }

  private renderCharacter() {
    this.charSection.replaceChildren()
    const s = this.charStats

    this.charSection.appendChild(this.makeSectionHeader('Character'))
    this.charSection.appendChild(this.makeDivider())
    this.charSection.appendChild(this.makeStatRow('Level', `${s.level}`))
    this.charSection.appendChild(this.makeStatRow('Health', `${s.health} / ${s.maxHealth}`))
    this.charSection.appendChild(this.makeStatRow('Stamina', `${s.stamina} / ${s.maxStamina}`))
    this.charSection.appendChild(this.makeStatRow('Speed', s.speed.toFixed(1)))
  }

  private renderWalker() {
    this.walkerSection.replaceChildren()
    const s = this.walkerStats
    if (!s) return

    this.walkerSection.style.marginTop = '14px'
    this.walkerSection.appendChild(this.makeSectionHeader(`Walker \u2014 ${s.name}`))
    this.walkerSection.appendChild(this.makeDivider())
    this.walkerSection.appendChild(this.makeStatRow('Tier', s.tier))
    this.walkerSection.appendChild(this.makeStatRow('Health', `${s.health} / ${s.maxHealth}`))
    this.walkerSection.appendChild(this.makeStatRow('Armor', `${s.armor}`))
    this.walkerSection.appendChild(this.makeStatRow('Turret Damage', `${s.turretDamage}`))
  }

  private renderInventory() {
    this.inventorySection.replaceChildren()
    this.inventorySection.style.marginTop = '14px'

    this.inventorySection.appendChild(this.makeSectionHeader('Inventory'))
    this.inventorySection.appendChild(this.makeDivider())

    if (this.inventory.length === 0) {
      const empty = document.createElement('div')
      Object.assign(empty.style, {
        font: `500 12px/1.4 var(--ui-font-display), system-ui, sans-serif`,
        color: 'rgba(255,255,255,0.28)',
        fontStyle: 'italic',
        padding: '2px 0',
      })
      empty.textContent = 'No items'
      this.inventorySection.appendChild(empty)
      return
    }

    for (const item of this.inventory) {
      const label = item.count > 1 ? `${item.name} x${item.count}` : item.name
      this.inventorySection.appendChild(this.makeStatRow(label, ''))
    }
  }

  private makeSectionHeader(text: string): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ui-title'
    el.style.paddingTop = '2px'
    el.textContent = text
    return el
  }

  private makeDivider(): HTMLDivElement {
    const el = document.createElement('div')
    el.className = 'ui-divider'
    el.style.margin = '10px 0'
    return el
  }

  private makeStatRow(label: string, value: string): HTMLDivElement {
    const row = document.createElement('div')
    row.className = 'ui-stat-row'

    const lbl = document.createElement('span')
    lbl.className = 'ui-stat-label'
    lbl.textContent = label
    row.appendChild(lbl)

    if (value) {
      const val = document.createElement('span')
      val.className = 'ui-stat-value'
      val.textContent = value
      row.appendChild(val)
    }

    return row
  }
}
