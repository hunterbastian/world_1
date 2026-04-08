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
  public onQuit: (() => void) | null = null

  private readonly panel: HTMLDivElement
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

  private static readonly F =
    'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

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
      transition: 'opacity 160ms ease',
      zIndex: '30',
    })

    const scrim = document.createElement('div')
    scrim.className = 'ui-scrim'
    Object.assign(scrim.style, { position: 'absolute', inset: '0' })
    this.root.appendChild(scrim)

    this.panel = document.createElement('div')
    this.panel.className = 'ui-panel ui-scroll'
    Object.assign(this.panel.style, {
      position: 'relative',
      width: 'min(380px, calc(100vw - 48px))',
      maxHeight: 'min(560px, calc(100vh - 48px))',
      overflow: 'auto',
      pointerEvents: 'auto',
      padding: '28px 32px',
    })
    this.root.appendChild(this.panel)

    // Title
    const title = document.createElement('div')
    Object.assign(title.style, {
      textAlign: 'center',
      font: `300 13px/1 ${PauseMenu.F}`,
      letterSpacing: '3px',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.50)',
    })
    title.textContent = 'Paused'
    this.panel.appendChild(title)

    const topDiv = document.createElement('div')
    topDiv.className = 'ui-divider'
    this.panel.appendChild(topDiv)

    this.charSection = document.createElement('div')
    this.panel.appendChild(this.charSection)

    this.walkerSection = document.createElement('div')
    this.panel.appendChild(this.walkerSection)

    this.inventorySection = document.createElement('div')
    this.panel.appendChild(this.inventorySection)

    const btnDiv = document.createElement('div')
    btnDiv.className = 'ui-divider'
    this.panel.appendChild(btnDiv)

    const btnRow = document.createElement('div')
    Object.assign(btnRow.style, {
      display: 'flex',
      justifyContent: 'center',
      gap: '12px',
    })
    this.panel.appendChild(btnRow)

    const resumeBtn = document.createElement('button')
    resumeBtn.className = 'ui-btn'
    resumeBtn.textContent = 'Resume'
    resumeBtn.addEventListener('click', () => {
      this.setOpen(false)
      this.onResume?.()
    })
    btnRow.appendChild(resumeBtn)

    const quitBtn = document.createElement('button')
    quitBtn.className = 'ui-btn'
    quitBtn.textContent = 'Quit'
    quitBtn.addEventListener('click', () => {
      this.onQuit?.()
    })
    btnRow.appendChild(quitBtn)

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
    this.root.style.opacity = open ? '1' : '0'
    this.root.style.pointerEvents = open ? 'auto' : 'none'
    this.panel.style.pointerEvents = open ? 'auto' : 'none'
    this.root.style.visibility = open ? 'visible' : 'hidden'
    if (open) this.renderSections()
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

    this.walkerSection.style.marginTop = '8px'
    this.walkerSection.appendChild(this.makeSectionHeader(`Walker \u2014 ${s.name}`))
    this.walkerSection.appendChild(this.makeDivider())
    this.walkerSection.appendChild(this.makeStatRow('Tier', s.tier))
    this.walkerSection.appendChild(this.makeStatRow('Health', `${s.health} / ${s.maxHealth}`))
    this.walkerSection.appendChild(this.makeStatRow('Armor', `${s.armor}`))
    this.walkerSection.appendChild(this.makeStatRow('Turret Damage', `${s.turretDamage}`))
  }

  private renderInventory() {
    this.inventorySection.replaceChildren()
    this.inventorySection.style.marginTop = '8px'

    this.inventorySection.appendChild(this.makeSectionHeader('Inventory'))
    this.inventorySection.appendChild(this.makeDivider())

    if (this.inventory.length === 0) {
      const empty = document.createElement('div')
      Object.assign(empty.style, {
        font: `300 12px/1.4 ${PauseMenu.F}`,
        color: 'rgba(255,255,255,0.22)',
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
