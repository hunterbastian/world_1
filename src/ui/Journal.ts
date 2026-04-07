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

  constructor() {
    this.root = document.createElement('div')
    this.root.id = 'journal'
    this.root.style.position = 'fixed'
    this.root.style.inset = '0'
    this.root.style.pointerEvents = 'none'
    this.root.style.display = 'grid'
    this.root.style.placeItems = 'center'
    this.root.style.opacity = '0'
    this.root.style.transition = 'opacity 160ms ease'

    const scrim = document.createElement('div')
    scrim.style.position = 'absolute'
    scrim.style.inset = '0'
    scrim.className = 'wc-scrim'
    this.root.appendChild(scrim)

    this.panel = document.createElement('div')
    this.panel.style.position = 'relative'
    this.panel.style.width = 'min(760px, calc(100vw - 32px))'
    this.panel.style.maxHeight = 'min(560px, calc(100vh - 32px))'
    this.panel.style.borderRadius = '8px'
    this.panel.className = 'wc-frame wc-gold-trim'
    this.panel.style.overflow = 'hidden'
    this.panel.style.pointerEvents = 'auto'
    this.root.appendChild(this.panel)

    const header = document.createElement('div')
    header.style.padding = '16px 18px'
    header.style.display = 'flex'
    header.style.alignItems = 'baseline'
    header.style.justifyContent = 'space-between'
    header.style.gap = '12px'
    header.style.borderBottom = '1px solid rgba(255, 210, 120, 0.18)'
    this.panel.appendChild(header)

    const title = document.createElement('div')
    title.textContent = 'Journal'
    title.className = 'wc-title'
    header.appendChild(title)

    const hint = document.createElement('div')
    hint.textContent = 'Tab to close'
    hint.className = 'wc-hint'
    header.appendChild(hint)

    const body = document.createElement('div')
    body.style.display = 'grid'
    body.style.gridTemplateColumns = '260px 1fr'
    body.style.gap = '12px'
    body.style.padding = '14px 18px 18px'
    body.style.maxHeight = 'calc(560px - 50px)'
    this.panel.appendChild(body)

    // Map column
    this.mapSlot = document.createElement('div')
    this.mapSlot.style.borderRadius = '6px'
    this.mapSlot.className = 'wc-parchment'
    this.mapSlot.style.padding = '10px'
    this.mapSlot.style.display = 'grid'
    this.mapSlot.style.gap = '8px'
    body.appendChild(this.mapSlot)

    const mapTitle = document.createElement('div')
    mapTitle.textContent = 'Map'
    mapTitle.style.font = '900 11px/1 system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
    mapTitle.style.letterSpacing = '0.6px'
    mapTitle.style.textTransform = 'uppercase'
    mapTitle.style.color = 'rgba(40, 24, 12, 0.78)'
    this.mapSlot.appendChild(mapTitle)

    // List column
    this.list = document.createElement('div')
    this.list.style.overflow = 'auto'
    this.list.style.paddingRight = '6px'
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
  }

  addEntry(e: JournalEntry) {
    if (this.entries.some((x) => x.id === e.id)) return
    this.entries = [e, ...this.entries]
    this.render()
  }

  setMapElement(el: HTMLElement) {
    // Keep title; replace the rest.
    const children = Array.from(this.mapSlot.children)
    for (let i = 1; i < children.length; i++) children[i]!.remove()
    this.mapSlot.appendChild(el)
  }

  private render() {
    this.list.replaceChildren()

    if (this.entries.length === 0) {
      const empty = document.createElement('div')
      empty.textContent = 'No discoveries yet. Follow the glow.'
      empty.style.padding = '16px 0'
      empty.style.color = 'rgba(255, 248, 230, 0.72)'
      empty.style.font = '600 14px/1.5 system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      this.list.appendChild(empty)
      return
    }

    for (const e of this.entries) {
      const card = document.createElement('div')
      card.style.padding = '12px 12px'
      card.style.borderRadius = '6px'
      card.style.background = 'rgba(0, 0, 0, 0.18)'
      card.style.border = '1px solid rgba(255, 210, 120, 0.16)'
      card.style.marginBottom = '10px'

      const t = document.createElement('div')
      t.textContent = e.title
      t.style.font = '800 13px/1.2 system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      t.style.letterSpacing = '0.2px'
      t.style.color = 'rgba(255, 248, 230, 0.92)'
      card.appendChild(t)

      const b = document.createElement('div')
      b.textContent = e.body
      b.style.marginTop = '6px'
      b.style.font = '600 13px/1.55 system-ui, -apple-system, Segoe UI, Roboto, sans-serif'
      b.style.color = 'rgba(255, 248, 230, 0.74)'
      card.appendChild(b)

      this.list.appendChild(card)
    }
  }
}

