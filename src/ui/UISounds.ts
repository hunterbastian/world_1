import * as THREE from 'three'

/**
 * Procedural sci-fi UI sounds — Halo/Destiny inspired.
 * All sounds synthesized via Web Audio API. No audio files.
 */
export class UISounds {
  private ctx: AudioContext | null = null
  private readonly listener: THREE.AudioListener

  constructor(listener: THREE.AudioListener) {
    this.listener = listener
  }

  private ensureCtx(): AudioContext | null {
    if (!this.ctx) {
      try { this.ctx = this.listener.context } catch { return null }
    }
    return this.ctx
  }

  menuOpen() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.2
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      const noise = (Math.random() * 2 - 1) * Math.exp(-t * 12) * 0.12
      const tone = Math.sin(t * 180 * Math.PI * 2) * Math.min(1, t / 0.03) * Math.exp(-t * 5) * 0.08
      d[i] = noise + tone
    }
    this.play(ctx, buf, 0.15)
  }

  menuClose() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.1
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      d[i] = (Math.random() * 2 - 1) * Math.exp(-t * 18) * 0.08
        + Math.sin(t * 220 * Math.PI * 2) * Math.exp(-t * 14) * 0.05
    }
    this.play(ctx, buf, 0.12)
  }

  menuHover() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.04
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      d[i] = Math.sin(t * 3200 * Math.PI * 2) * Math.exp(-t * 50) * 0.04
    }
    this.play(ctx, buf, 0.06)
  }

  menuSelect() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.12
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      const a = Math.sin(t * 800 * Math.PI * 2) * Math.exp(-t * 18)
      const b = t > 0.02 ? Math.sin((t - 0.02) * 1200 * Math.PI * 2) * Math.exp(-(t - 0.02) * 22) : 0
      d[i] = (a + b * 0.7) * 0.08
    }
    this.play(ctx, buf, 0.12)
  }

  menuBack() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.1
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    let phase = 0
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      const freq = 600 - t * 2000
      phase += freq / ctx.sampleRate
      d[i] = Math.sin(phase * Math.PI * 2) * Math.exp(-t * 16) * 0.06
    }
    this.play(ctx, buf, 0.10)
  }

  promptShow() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.12
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      d[i] = Math.sin(t * 1400 * Math.PI * 2) * Math.exp(-t * 14) * 0.05
    }
    this.play(ctx, buf, 0.08)
  }

  activationTick(progress: number) {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const freq = 1800 + progress * 600
    const dur = 0.03
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      d[i] = Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * 60) * 0.04
    }
    this.play(ctx, buf, 0.06)
  }

  mountConfirm() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.35
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      const latch = (Math.random() * 2 - 1) * Math.exp(-t * 30) * 0.15
      const tone1 = Math.sin(t * 220 * Math.PI * 2) * Math.min(1, t / 0.01) * Math.exp(-t * 4) * 0.1
      const tone2 = Math.sin(t * 330 * Math.PI * 2) * Math.min(1, t / 0.01) * Math.exp(-t * 4) * 0.06
      d[i] = latch + tone1 + tone2
    }
    this.play(ctx, buf, 0.2)
  }

  errorBuzz() {
    const ctx = this.ensureCtx()
    if (!ctx) return
    const dur = 0.12
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate)
    const d = buf.getChannelData(0)
    let phase = 0
    for (let i = 0; i < d.length; i++) {
      const t = i / ctx.sampleRate
      phase += 120 / ctx.sampleRate
      d[i] = ((phase % 1) * 2 - 1) * Math.exp(-t * 10) * 0.1
    }
    this.play(ctx, buf, 0.15)
  }

  private play(ctx: AudioContext, buf: AudioBuffer, vol: number) {
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = vol
    src.connect(gain).connect(ctx.destination)
    src.start()
  }
}
