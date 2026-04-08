export type JournalEntry = {
  id: string
  title: string
  body: string
}

export class JournalUI {
  public readonly root: HTMLDivElement
  private readonly panel: HTMLDivElement
  private readonly list: HTMLDivElement
  private readonly mapSlot: HTMLDivElement
  private entries: JournalEntry[] = []
  private open = false

  private static readonly F =
    'system-ui, -apple-system, Segoe UI, Roboto, sans-serif'

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
    this.setOpen(!this.open)
  }

  setOpen(open: boolean) {
    this.open = open
    this.root.style.opacity = open ? '1' : '0'
    this.root.style.pointerEvents = open ? 'auto' : 'none'
    this.panel.style.pointerEvents = open ? 'auto' : 'none'
    this.root.style.visibility = open ? 'visible' : 'hidden'
  }

  addEntry(e: JournalEntry) {
    if (this.entries.some((x) => x.id === e.id)) return
    this.entries = [e, ...this.entries]
    this.render()
  }

  setMapElement(el: HTMLElement) {
    const children = Array.from(this.mapSlot.children)
    for (let i = 1; i < children.length; i++) children[i]!.remove()
    this.mapSlot.appendChild(el)
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
