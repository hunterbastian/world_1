export class TitleScreen {
  public readonly root: HTMLDivElement
  private dismissed = false
  private onDismissCallback: (() => void) | null = null

  constructor() {
    this.root = document.createElement('div')
    this.root.id = 'title-screen'
    this.root.className = 'title-screen'

    this.root.innerHTML = `
      <div class="title-content">
        <div class="title-brand">
          <div class="title-name">GLASSWAKE</div>
          <div class="title-tagline">Beyond the mountains, something stirs</div>
        </div>
        <div class="title-prompt">Click anywhere to begin</div>
      </div>
      <div class="title-vignette"></div>
    `

    this.root.addEventListener('click', this.dismiss, { once: true })
    window.addEventListener('keydown', this.onKey)
  }

  set onDismiss(cb: () => void) {
    this.onDismissCallback = cb
  }

  private dismiss = () => {
    if (this.dismissed) return
    this.dismissed = true
    window.removeEventListener('keydown', this.onKey)
    this.root.classList.add('title-screen--out')

    this.root.addEventListener('transitionend', () => {
      this.root.remove()
      this.onDismissCallback?.()
    }, { once: true })

    // Safety fallback in case transitionend doesn't fire
    setTimeout(() => {
      if (this.root.parentElement) {
        this.root.remove()
        this.onDismissCallback?.()
      }
    }, 2200)
  }

  private onKey = (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'KeyE') {
      this.dismiss()
    }
  }
}
