import type { UISounds } from './UISounds'

export type JournalEntry = {
  id: string
  title: string
  body: string
}

export type WalkerInfo = { name: string; tier: string; mounted: boolean }

export class JournalUI {
  public readonly root: HTMLDivElement
  private readonly panel: HTMLDivElement
  private readonly list: HTMLDivElement
  private readonly mapSlot: HTMLDivElement
  private entries: JournalEntry[] = []
  private open = false

  private walkerInfo: WalkerInfo | null = null
  private readonly walkerCard: HTMLDivElement
  private uiSounds: UISounds | null = null

  private static readonly F =
    "'Barlow Condensed', 'Rajdhani', system-ui, -apple-system, sans-serif"

  constructor() {
    const f = JournalUI.F

    this.root = document.createElement('div')
    this.root.id = 'journal'
    Object.assign(this.root.style, {
      position: 'fixed',
      inset: '0',
      pointerEvents: 'none',
      display: 'grid',
      placeItems: 'center',
      opacity: '0',
      visibility: 'hidden',
      transition: 'opacity 160ms ease',
      zIndex: '20',
    })

    const scrim = document.createElement('div')
    scrim.className = 'ui-scrim'
    Object.assign(scrim.style, { position: 'absolute', inset: '0' })
    this.root.appendChild(scrim)

    this.panel = document.createElement('div')
    this.panel.className = 'ui-panel'
    Object.assign(this.panel.style, {
      position: 'relative',
      width: 'min(720px, calc(100vw - 48px))',
      maxHeight: 'min(520px, calc(100vh - 48px))',
      overflow: 'hidden',
      pointerEvents: 'auto',
    })
    this.root.appendChild(this.panel)

    // Header
    const header = document.createElement('div')
    Object.assign(header.style, {
      padding: '20px 24px 0',
      display: 'flex',
      alignItems: 'baseline',
      justifyContent: 'space-between',
    })
    this.panel.appendChild(header)

    const title = document.createElement('div')
    title.className = 'ui-title'
    title.textContent = 'Journal'
    header.appendChild(title)

    const hint = document.createElement('div')
    hint.className = 'ui-hint'
    hint.textContent = 'Tab to close'
    header.appendChild(hint)

    const divider = document.createElement('div')
    divider.className = 'ui-divider'
    divider.style.margin = '14px 24px'
    this.panel.appendChild(divider)

    // Body
    const body = document.createElement('div')
    Object.assign(body.style, {
      display: 'grid',
      gridTemplateColumns: '220px 1fr',
      gap: '16px',
      padding: '0 24px 24px',
      maxHeight: 'calc(520px - 68px)',
    })
    this.panel.appendChild(body)

    // Map column
    this.mapSlot = document.createElement('div')
    Object.assign(this.mapSlot.style, {
      borderRadius: '8px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
      padding: '12px',
      display: 'grid',
      gap: '8px',
      alignContent: 'start',
    })
    body.appendChild(this.mapSlot)

    const mapTitle = document.createElement('div')
    Object.assign(mapTitle.style, {
      font: `400 9px/1 ${f}`,
      letterSpacing: '1.4px',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.25)',
    })
    mapTitle.textContent = 'Map'
    this.mapSlot.appendChild(mapTitle)

    this.walkerCard = document.createElement('div')
    Object.assign(this.walkerCard.style, {
      display: 'none',
      borderLeft: '2px solid rgba(74,212,232,0.4)',
      background: 'rgba(74,212,232,0.04)',
      padding: '10px 12px',
      borderRadius: '6px',
      marginTop: '10px',
    })
    this.mapSlot.appendChild(this.walkerCard)

    // List column
    this.list = document.createElement('div')
    this.list.className = 'ui-scroll'
    Object.assign(this.list.style, {
      overflow: 'auto',
      paddingRight: '4px',
      maxHeight: 'calc(520px - 68px)',
    })
    body.appendChild(this.list)

    this.render()
  }

  toggle() {
    const next = !this.open
    if (next) this.uiSounds?.menuOpen()
    else this.uiSounds?.menuClose()
    this.setOpen(next)
  }

  setOpen(open: boolean) {
    this.open = open
    this.root.style.opacity = open ? '1' : '0'
    this.root.style.pointerEvents = open ? 'auto' : 'none'
    this.panel.style.pointerEvents = open ? 'auto' : 'none'
    this.root.style.visibility = open ? 'visible' : 'hidden'
  }

  setUISounds(sounds: UISounds | null) {
    this.uiSounds = sounds
  }

  addEntry(e: JournalEntry) {
    if (this.entries.some((x) => x.id === e.id)) return
    this.entries = [e, ...this.entries]
    this.render()
  }

  setWalkerInfo(info: WalkerInfo | null) {
    this.walkerInfo = info
    this.renderWalkerCard()
  }

  setMapElement(el: HTMLElement) {
    const existing = this.mapSlot.querySelector('[data-journal-map]')
    existing?.remove()
    el.dataset.journalMap = '1'
    this.mapSlot.insertBefore(el, this.walkerCard)
  }

  private renderWalkerCard() {
    const f = JournalUI.F
    const info = this.walkerInfo
    if (!info) {
      this.walkerCard.style.display = 'none'
      this.walkerCard.replaceChildren()
      return
    }

    this.walkerCard.style.display = ''
    this.walkerCard.replaceChildren()

    const tierKey = info.tier.trim().toLowerCase()
    const tierLabel =
      tierKey === 'scout'
        ? 'Scout Walker'
        : tierKey === 'assault'
          ? 'Assault Walker'
          : info.tier

    const armor = tierKey === 'assault' ? 80 : 40
    const speed = tierKey === 'assault' ? 6 : 8
    const turret = tierKey === 'assault' ? 25 : 15

    const nameEl = document.createElement('div')
    nameEl.textContent = info.name
    Object.assign(nameEl.style, {
      font: `600 14px/1.2 ${f}`,
      color: '#4ad4e8',
    })
    this.walkerCard.appendChild(nameEl)

    const tierEl = document.createElement('div')
    tierEl.textContent = tierLabel
    Object.assign(tierEl.style, {
      marginTop: '4px',
      font: `500 10px/1.2 ${f}`,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.45)',
    })
    this.walkerCard.appendChild(tierEl)

    const statusEl = document.createElement('div')
    statusEl.textContent = info.mounted ? 'MOUNTED' : 'BONDED'
    Object.assign(statusEl.style, {
      marginTop: '6px',
      font: `600 9px/1.2 ${f}`,
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      color: info.mounted ? '#4ad4e8' : '#5a8a5a',
    })
    this.walkerCard.appendChild(statusEl)

    const mkStatRow = (label: string, value: string) => {
      const row = document.createElement('div')
      Object.assign(row.style, {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '5px 0',
      })
      const lbl = document.createElement('span')
      lbl.textContent = label
      Object.assign(lbl.style, {
        font: `500 12px/1.2 ${f}`,
        color: 'rgba(255,255,255,0.5)',
      })
      row.appendChild(lbl)
      const val = document.createElement('span')
      val.textContent = value
      Object.assign(val.style, {
        font: `600 13px/1.2 ${f}`,
        color: 'rgba(255,255,255,0.92)',
        fontVariantNumeric: 'tabular-nums',
      })
      row.appendChild(val)
      return row
    }

    const statsWrap = document.createElement('div')
    statsWrap.style.marginTop = '8px'
    statsWrap.appendChild(mkStatRow('Health', '100'))
    statsWrap.appendChild(mkStatRow('Armor', `${armor}`))
    statsWrap.appendChild(mkStatRow('Speed', `${speed}`))
    statsWrap.appendChild(mkStatRow('Turret', `${turret}`))
    this.walkerCard.appendChild(statsWrap)
  }

  private render() {
    const f = JournalUI.F
    this.list.replaceChildren()

    if (this.entries.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'No discoveries yet.'
      Object.assign(empty.style, {
        padding: '20px 0',
        color: 'rgba(255,255,255,0.22)',
        font: `300 13px/1.5 ${f}`,
        fontStyle: 'italic',
      })
      this.list.appendChild(empty)
      return
    }

    for (const e of this.entries) {
      const card = document.createElement('div')
      Object.assign(card.style, {
        padding: '12px 14px',
        borderRadius: '6px',
        background: 'rgba(255,255,255,0.03)',
        borderLeft: '2px solid rgba(230, 54, 74, 0.30)',
        marginBottom: '8px',
      })

      const t = document.createElement('div')
      t.textContent = e.title
      Object.assign(t.style, {
        font: `500 13px/1.2 ${f}`,
        color: 'rgba(255,255,255,0.85)',
      })
      card.appendChild(t)

      const b = document.createElement('div')
      b.textContent = e.body
      Object.assign(b.style, {
        marginTop: '6px',
        font: `300 13px/1.55 ${f}`,
        color: 'rgba(255,255,255,0.42)',
      })
      card.appendChild(b)

      this.list.appendChild(card)
    }
  }
}
