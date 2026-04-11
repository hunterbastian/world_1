import * as THREE from 'three'
import type { WalkerMech } from './WalkerMech'
import type { CameraRig } from '../game/CameraRig'
import type { PostFX } from '../render/PostFX'

/**
 * 6-second choreographed walker awakening sequence.
 *
 * 4 beats:
 *  1. "The Hush"   (0.0–1.2s) — world quiets, camera looks at walker
 *  2. "First Light" (1.2–3.0s) — radiolaria pulses outward from core
 *  3. "The Eye"    (3.0–4.2s) — cyclops eye flickers on, sacred tone
 *  4. "Rising"     (4.2–6.0s) — walker stands from dormant crouch
 */
export class WalkerActivationCinematic {
  private active = false
  private t = 0
  private walker: WalkerMech | null = null
  private cameraRig: CameraRig | null = null
  private camera: THREE.PerspectiveCamera | null = null
  private audioCtx: AudioContext | null = null

  // (original material intensities restored by setDormant(false))

  // Audio nodes (cleaned up on finish)
  private activeNodes: { stop: () => void }[] = []

  isActive() { return this.active }

  start(
    walker: WalkerMech,
    cameraRig: CameraRig,
    _postfx: PostFX,
    audioCtx: AudioContext | null,
    camera?: THREE.PerspectiveCamera,
  ) {
    this.active = true
    this.t = 0
    this.walker = walker
    this.cameraRig = cameraRig
    this.camera = camera ?? null
    this.audioCtx = audioCtx
    walker.eyeMat.emissiveIntensity = 0
    walker.radiolariaMat.emissiveIntensity = 0.15
  }

  update(dt: number): boolean {
    if (!this.active || !this.walker) return false

    const prev = this.t
    this.t += dt

    // ── BEAT 1: The Hush (0.0–1.2s) ──
    if (this.t < 1.2) {
      if (prev < 0.8 && this.t >= 0.8) {
        this.playTick()
      }
      // FOV narrows: 65 → 58 over 1.2s
      if (this.camera) {
        const fovT = Math.min(1, this.t / 1.2)
        this.camera.fov = THREE.MathUtils.lerp(65, 58, fovT)
        this.camera.updateProjectionMatrix()
      }
    }

    // ── BEAT 2: First Light (1.2–3.0s) ──
    if (prev < 1.2 && this.t >= 1.2) {
      this.playThoom()
      this.playLowHum()
    }

    // First radiolaria pulse at 1.2s
    if (this.t >= 1.2 && this.t < 1.6) {
      const pulseT = (this.t - 1.2) / 0.4
      const spike = pulseT < 0.15 ? THREE.MathUtils.lerp(0.15, 3.0, pulseT / 0.15)
        : THREE.MathUtils.lerp(3.0, 0.8, (pulseT - 0.15) / 0.85)
      this.walker.radiolariaMat.emissiveIntensity = spike
    }

    // Second pulse at 1.8s (brighter)
    if (prev < 1.8 && this.t >= 1.8) {
      this.playPing()
    }
    if (this.t >= 1.8 && this.t < 2.3) {
      const pulseT = (this.t - 1.8) / 0.5
      const spike = pulseT < 0.12 ? THREE.MathUtils.lerp(0.8, 4.0, pulseT / 0.12)
        : THREE.MathUtils.lerp(4.0, 1.2, (pulseT - 0.12) / 0.88)
      this.walker.radiolariaMat.emissiveIntensity = spike
    }

    // Radiolaria settling to elevated glow
    if (this.t >= 2.3 && this.t < 3.0) {
      this.walker.radiolariaMat.emissiveIntensity = THREE.MathUtils.lerp(
        1.2, 1.5, (this.t - 2.3) / 0.7,
      )
    }

    // Mechanical groan at 2.5s
    if (prev < 2.5 && this.t >= 2.5) {
      this.playGroan()
    }

    // ── BEAT 3: The Eye (3.0–4.2s) ──
    if (this.t >= 3.0 && this.t < 3.5) {
      // Three rapid flickers then hold
      const eyeT = this.t - 3.0
      let eyeVal = 0
      if (eyeT < 0.10) eyeVal = 3.2
      else if (eyeT < 0.15) eyeVal = 0
      else if (eyeT < 0.25) eyeVal = 3.2
      else if (eyeT < 0.30) eyeVal = 0
      else if (eyeT < 0.40) eyeVal = 3.2
      else eyeVal = 3.2
      this.walker.eyeMat.emissiveIntensity = eyeVal
    }

    // Sacred tone at eye stabilization
    if (prev < 3.4 && this.t >= 3.4) {
      this.playSacredTone()
      this.cameraRig?.impulseLanding(0.15)
    }

    // Head lifts from 3.5–4.2s
    if (this.t >= 3.5 && this.t < 4.2) {
      const liftT = (this.t - 3.5) / 0.7
      const eased = 1 - Math.pow(1 - liftT, 2)
      this.walker.limbs.head.rotation.x = THREE.MathUtils.lerp(-0.26, 0, eased)
    }

    // ── BEAT 4: Rising (4.2–6.0s) ──
    if (prev < 4.2 && this.t >= 4.2) {
      this.playHiss()
      this.playServoWhine()
    }

    // FOV eases back: 58 → 65 over the rising phase
    if (this.t >= 4.2 && this.t < 6.0 && this.camera) {
      const fovT = Math.min(1, (this.t - 4.2) / 1.5)
      const eased = 1 - Math.pow(1 - fovT, 2)
      this.camera.fov = THREE.MathUtils.lerp(58, 65, eased)
      this.camera.updateProjectionMatrix()
    }

    // Legs extend, hull rises — ease-out with tiny overshoot
    if (this.t >= 4.2 && this.t < 6.0) {
      const riseT = Math.min(1, (this.t - 4.2) / 1.6)
      const eased = 1 - Math.pow(1 - riseT, 3)
      const overshoot = riseT > 0.85 ? Math.sin((riseT - 0.85) / 0.15 * Math.PI) * 0.02 : 0

      const { limbs } = this.walker
      limbs.hull.position.y = THREE.MathUtils.lerp(
        limbs.restHullY * 0.85, limbs.restHullY, eased,
      ) + overshoot

      for (const leg of limbs.legs) {
        leg.upper.rotation.x = THREE.MathUtils.lerp(
          leg.restUpperX + 0.25, leg.restUpperX, eased,
        )
        leg.lower.rotation.x = THREE.MathUtils.lerp(
          leg.restLowerX + 0.30, leg.restLowerX, eased,
        )
        leg.foot.rotation.x = THREE.MathUtils.lerp(
          leg.restFootX - 0.15, leg.restFootX, eased,
        )
      }
    }

    // Weapons snap at 4.8s
    if (this.t >= 4.8 && this.t < 5.0) {
      const snapT = (this.t - 4.8) / 0.2
      const eased = 1 - Math.pow(1 - snapT, 4)
      this.walker.limbs.weaponL.rotation.x = THREE.MathUtils.lerp(0.18, 0, eased)
      this.walker.limbs.weaponR.rotation.x = THREE.MathUtils.lerp(0.18, 0, eased)
    }

    if (prev < 4.8 && this.t >= 4.8) {
      this.playClack()
    }

    // Final stomp at 5.8s
    if (prev < 5.8 && this.t >= 5.8) {
      this.playStomp()
      this.cameraRig?.impulseLanding(0.3)
    }

    // Finish at 6.0s
    if (this.t >= 6.0) {
      this.active = false
      this.walker.setDormant(false)
      this.walker.activate()
      this.cleanup()
      return false
    }

    return true
  }

  private cleanup() {
    for (const n of this.activeNodes) {
      try { n.stop() } catch {}
    }
    this.activeNodes = []
    this.walker = null
    this.cameraRig = null
  }

  // ── Procedural audio (Web Audio API) ──

  private playTick() {
    const ctx = this.audioCtx
    if (!ctx) return
    const bufLen = Math.floor(ctx.sampleRate * 0.03)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 120) * 0.3
    }
    this.playBuffer(ctx, buf, 0.4)
  }

  private playThoom() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 0.5
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      const env = Math.exp(-t * 6) * Math.min(1, t / 0.005)
      data[i] = Math.sin(t * 50 * Math.PI * 2) * env * 0.5
    }
    this.playBuffer(ctx, buf, 0.5)
  }

  private playPing() {
    const ctx = this.audioCtx
    if (!ctx) return
    const freq = 2000 + Math.random() * 1000
    const dur = 0.12
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      data[i] = Math.sin(t * freq * Math.PI * 2) * Math.exp(-t * 25) * 0.15
    }
    this.playBuffer(ctx, buf, 0.3)
  }

  private playLowHum() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 4.5
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      const env = Math.min(1, t / 1.5) * Math.max(0, 1 - (t - 3.5) / 1.0)
      const f1 = Math.sin(t * 70 * Math.PI * 2)
      const f2 = Math.sin(t * 120 * Math.PI * 2) * Math.min(1, t / 2.0)
      data[i] = (f1 * 0.3 + f2 * 0.15) * env * 0.25
    }
    this.playBuffer(ctx, buf, 0.3)
  }

  private playGroan() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 1.5
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let phase = 0
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      const freq = 40 + t * 12
      phase += freq / ctx.sampleRate
      const env = Math.min(1, t / 0.3) * Math.max(0, 1 - (t - 1.0) / 0.5)
      const saw = (phase % 1) * 2 - 1
      data[i] = saw * env * 0.12
    }
    this.playBuffer(ctx, buf, 0.35)
  }

  private playSacredTone() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 2.5
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      const env = Math.min(1, t / 0.08) * Math.exp(-t * 0.8)
      const f1 = Math.sin(t * 340 * Math.PI * 2)
      const f2 = Math.sin(t * 680 * Math.PI * 2) * 0.3
      const f3 = Math.sin(t * 1020 * Math.PI * 2) * 0.12
      data[i] = (f1 + f2 + f3) * env * 0.2
    }
    this.playBuffer(ctx, buf, 0.5)
  }

  private playHiss() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 0.4
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      const env = Math.exp(-t * 5) * Math.min(1, t / 0.01)
      const noise = Math.random() * 2 - 1
      data[i] = noise * env * 0.12
    }
    this.playBuffer(ctx, buf, 0.3)
  }

  private playServoWhine() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 1.2
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    let phase = 0
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      const freq = 200 + t * 500
      phase += freq / ctx.sampleRate
      const env = Math.min(1, t / 0.1) * Math.max(0, 1 - (t - 0.8) / 0.4)
      const saw = (phase % 1) * 2 - 1
      data[i] = saw * env * 0.08
    }
    this.playBuffer(ctx, buf, 0.25)
  }

  private playClack() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 0.06
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      data[i] = (Math.random() * 2 - 1) * Math.exp(-t * 60) * 0.4
    }
    this.playBuffer(ctx, buf, 0.5)
  }

  private playStomp() {
    const ctx = this.audioCtx
    if (!ctx) return
    const dur = 0.4
    const bufLen = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < bufLen; i++) {
      const t = i / ctx.sampleRate
      const env = Math.exp(-t * 8) * Math.min(1, t / 0.005)
      const bass = Math.sin(t * 40 * Math.PI * 2) * 0.6
      const noise = (Math.random() * 2 - 1) * 0.3
      data[i] = (bass + noise) * env * 0.5
    }
    this.playBuffer(ctx, buf, 0.6)
  }

  private playBuffer(ctx: AudioContext, buf: AudioBuffer, vol: number) {
    const src = ctx.createBufferSource()
    src.buffer = buf
    const gain = ctx.createGain()
    gain.gain.value = vol
    src.connect(gain).connect(ctx.destination)
    src.start()
    this.activeNodes.push({ stop: () => { try { src.stop() } catch {} } })
  }
}
