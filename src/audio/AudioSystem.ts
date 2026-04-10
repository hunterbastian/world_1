import * as THREE from 'three'
import type { Terrain } from '../world/Terrain'
import type { Player } from '../game/Player'
import type { WalkerMech } from '../world/WalkerMech'

function makeNoiseBuffer(ctx: AudioContext, seconds: number, color: 'white' | 'pink') {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(1, len, rate)
  const data = buf.getChannelData(0)

  if (color === 'white') {
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.25
    return buf
  }

  // Pink-ish noise via simple filtering.
  let b0 = 0,
    b1 = 0,
    b2 = 0,
    b3 = 0,
    b4 = 0,
    b5 = 0,
    b6 = 0
  for (let i = 0; i < len; i++) {
    const white = Math.random() * 2 - 1
    b0 = 0.99886 * b0 + white * 0.0555179
    b1 = 0.99332 * b1 + white * 0.0750759
    b2 = 0.96900 * b2 + white * 0.1538520
    b3 = 0.86650 * b3 + white * 0.3104856
    b4 = 0.55000 * b4 + white * 0.5329522
    b5 = -0.7616 * b5 - white * 0.0168980
    const pink = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
    b6 = white * 0.115926
    data[i] = (pink * 0.08) as number
  }
  return buf
}

function makeImpulseBuffer(ctx: AudioContext, seconds: number) {
  const rate = ctx.sampleRate
  const len = Math.floor(rate * seconds)
  const buf = ctx.createBuffer(1, len, rate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / rate
    const env = Math.exp(-t * 18)
    data[i] = ((Math.random() * 2 - 1) * env * 0.65) as number
  }
  return buf
}

/**
 * Heavy mech stomp — layered synthesis for a massive, cinematic impact.
 *
 * Layers:
 * 1. Transient crack  — ultra-fast attack, the initial metal-on-ground hit
 * 2. Pitch-drop bass  — bass note that sweeps downward (sells mass)
 * 3. Sub-bass pressure — 18-28 Hz chest-punch, slow decay
 * 4. Hydraulic servo   — mid-frequency whine of the leg mechanism
 * 5. Ground resonance  — filtered noise rumble, the earth shaking
 * 6. Debris scatter    — late noise tail, pebbles and dirt settling
 */
function makeStompBuffer(ctx: AudioContext, intensity: number) {
  const rate = ctx.sampleRate
  const duration = 0.55 + intensity * 0.25
  const len = Math.floor(rate * duration)
  const buf = ctx.createBuffer(1, len, rate)
  const data = buf.getChannelData(0)

  // Randomize per-stomp character
  const pitchSeed = 0.85 + Math.random() * 0.3
  const resonanceFreq = 55 + Math.random() * 20

  for (let i = 0; i < len; i++) {
    const t = i / rate
    let sample = 0

    // 1. Transient crack — first 8ms, pure attack
    const transientEnv = t < 0.008 ? 1.0 : Math.exp(-(t - 0.008) * 80)
    const transient = (Math.random() * 2 - 1) * transientEnv * 0.7
    // Clip it for that hard digital crack
    sample += Math.max(-0.6, Math.min(0.6, transient * 1.5))

    // 2. Pitch-drop bass — starts at ~80Hz, sweeps to ~30Hz over 200ms
    const bassStartFreq = 80 * pitchSeed
    const bassEndFreq = 28 * pitchSeed
    const bassSweep = bassStartFreq + (bassEndFreq - bassStartFreq) * Math.min(1, t / 0.2)
    const bassPhase = t * bassSweep * Math.PI * 2
    const bassEnv = Math.exp(-t * 7)
    sample += Math.sin(bassPhase) * bassEnv * 0.85

    // 3. Sub-bass pressure — very low, slow decay, you feel it
    const subFreq = 22 * pitchSeed
    const subEnv = Math.exp(-t * 4) * Math.min(1, t / 0.01) // 10ms fade-in to avoid click
    sample += Math.sin(t * subFreq * Math.PI * 2) * subEnv * 0.55

    // 4. Hydraulic servo whine — mid freq, appears after impact, short
    const servoDelay = Math.max(0, t - 0.015)
    const servoEnv = Math.exp(-servoDelay * 25) * Math.min(1, servoDelay / 0.005)
    const servoFreq = 280 + Math.sin(t * 12) * 40 // slight wobble
    sample += Math.sin(servoDelay * servoFreq * Math.PI * 2) * servoEnv * 0.12

    // 5. Ground resonance — filtered noise, medium decay
    const resoEnv = Math.exp(-t * 5) * Math.min(1, t / 0.003)
    const noise = Math.random() * 2 - 1
    // Fake bandpass: multiply noise by a resonant sine
    const resoCarrier = Math.sin(t * resonanceFreq * Math.PI * 2)
    sample += noise * resoCarrier * resoEnv * 0.3

    // 6. Debris scatter — late noise tail, small particles settling
    if (t > 0.08) {
      const debrisT = t - 0.08
      const debrisEnv = Math.exp(-debrisT * 3.5) * 0.18
      // Sparse crackle: random impulses
      const crackle = Math.random() < 0.15 ? (Math.random() * 2 - 1) : 0
      sample += crackle * debrisEnv
      // Continuous low rattle
      sample += (Math.random() * 2 - 1) * debrisEnv * 0.25
    }

    // Soft-clip to prevent harsh digital distortion while keeping punch
    sample *= intensity
    sample = Math.tanh(sample * 1.2)

    data[i] = sample
  }
  return buf
}

export class AudioSystem {
  public readonly listener: THREE.AudioListener

  private readonly terrain: Terrain
  private readonly player: Player
  private readonly camera: THREE.Camera

  private ctx: AudioContext | null = null
  private started = false

  private ambientWind: THREE.Audio | null = null
  private ambientBirds: THREE.Audio | null = null
  private footstep: THREE.Audio | null = null

  // Pool of positional audio sources for walker stomps
  private readonly stompPool: THREE.PositionalAudio[] = []
  private stompPoolIdx = 0

  constructor(opts: { camera: THREE.Camera; terrain: Terrain; player: Player }) {
    this.camera = opts.camera
    this.terrain = opts.terrain
    this.player = opts.player

    this.listener = new THREE.AudioListener()
    this.camera.add(this.listener)
  }

  /** Register walker mechs for stomp + activation audio. */
  registerWalkers(walkers: WalkerMech[]) {
    for (const w of walkers) {
      w.onStomp((e) => this.playWalkerStomp(e.position, e.intensity))
      w.onActivation((mech) => this.playActivationHum(mech.object3d.position))
    }
  }

  async start() {
    if (this.started) return
    this.started = true

    // Ensure AudioContext is resumed on user gesture; Three manages context internally.
    this.ctx = this.listener.context
    await this.ctx.resume()

    // Wind (mountains)
    this.ambientWind = new THREE.Audio(this.listener)
    this.ambientWind.setBuffer(makeNoiseBuffer(this.ctx, 2.5, 'pink'))
    this.ambientWind.setLoop(true)
    this.ambientWind.setVolume(0.0)
    this.ambientWind.play()

    // Birds (forest)
    this.ambientBirds = new THREE.Audio(this.listener)
    this.ambientBirds.setBuffer(makeNoiseBuffer(this.ctx, 1.8, 'white'))
    this.ambientBirds.setLoop(true)
    this.ambientBirds.setVolume(0.0)
    this.ambientBirds.play()

    // Footstep one-shot
    this.footstep = new THREE.Audio(this.listener)
    this.footstep.setLoop(false)
    this.footstep.setVolume(0.5)

    // Hook player steps
    this.player.onStep(() => this.playFootstep())

    // Positional stomp pool — 4 sources rotated for overlapping stomps
    for (let i = 0; i < 4; i++) {
      const src = new THREE.PositionalAudio(this.listener)
      src.setLoop(false)
      src.setRefDistance(15) // audible from ~15m at full volume
      src.setMaxDistance(120) // can hear faintly from far away
      src.setRolloffFactor(1.5)
      src.setDistanceModel('exponential')
      this.stompPool.push(src)
    }
  }

  update() {
    if (!this.started || !this.ambientWind || !this.ambientBirds) return

    const biome = this.terrain.biomeAtXZ(this.player.position.x, this.player.position.z)
    const y = this.player.position.y

    // Mix ambient beds.
    const windAmt = THREE.MathUtils.clamp((y - 18) / 35, 0, 1)
    const birdsAmt = biome === 'deep_forest' ? 1 : 0.2

    this.ambientWind.setVolume(0.02 + windAmt * 0.09)
    this.ambientBirds.setVolume(0.01 + birdsAmt * 0.05)
  }

  private playWalkerStomp(worldPos: THREE.Vector3, intensity: number) {
    if (!this.started || !this.ctx) return

    // Distance check — don't play if too far
    const dist = worldPos.distanceTo(this.player.position)
    if (dist > 120) return

    const buf = makeStompBuffer(this.ctx, intensity)
    const src = this.stompPool[this.stompPoolIdx % this.stompPool.length]
    if (!src) return
    this.stompPoolIdx++

    // Position the audio source at the walker
    src.position.copy(worldPos)

    // Ensure it's in the scene for spatial audio
    if (!src.parent) {
      // Add to listener's parent (camera) as a world-space positioned child
      this.camera.parent?.add(src)
    }

    if (src.isPlaying) src.stop()
    src.setBuffer(buf)

    // Volume scales with intensity and tier
    const vol = 0.4 + intensity * 0.6
    src.setVolume(vol)

    // Slight pitch variation for organic feel
    src.setPlaybackRate(0.9 + Math.random() * 0.2)
    src.play()
  }

  private playFootstep() {
    if (!this.started || !this.ctx || !this.footstep) return

    const biome = this.terrain.biomeAtXZ(this.player.position.x, this.player.position.z)
    const buf = makeImpulseBuffer(this.ctx, 0.18)
    this.footstep.setBuffer(buf)

    // Biome “feel” via simple volume shaping.
    const isSprinting = this.player.sprinting
    const baseVol = biome === 'snowy_mountains' ? 0.28 : biome === 'deep_forest' ? 0.45 : 0.38
    const vol = isSprinting ? baseVol * 1.15 : baseVol
    this.footstep.setVolume(vol)

    // Pitch variation: slight randomness + lower pitch when sprinting
    const pitchBase = isSprinting ? 0.92 : 1.0
    const pitchVariation = 0.95 + Math.random() * 0.1 // ±5%
    this.footstep.setPlaybackRate(pitchBase * pitchVariation)

    this.footstep.play()
  }

  private playActivationHum(worldPos: THREE.Vector3) {
    if (!this.started || !this.ctx) return

    /**
     * Activation power-up sound — evolves through 3 phases:
     *
     * Phase 1 (0-1s): Deep mechanical rumble waking up. Sub-bass drone with
     *   servo whine climbing in pitch. Like a reactor spinning up.
     *
     * Phase 2 (1-2s): Harmonics bloom. The chord fills in — fundamental locks,
     *   fifth and octave sweep into tune. FM modulation adds alien shimmer.
     *
     * Phase 3 (2-3.5s): Full resonance. Warm sustained chord with tremolo
     *   and phase-beating between detuned pairs. Fades out with a high
     *   crystalline ring (the radiolaria glowing).
     */
    const rate = this.ctx.sampleRate
    const duration = 3.5
    const len = Math.floor(rate * duration)
    const buf = this.ctx.createBuffer(1, len, rate)
    const data = buf.getChannelData(0)

    // Accumulate phase for smooth frequency sweeps
    let fundPhase = 0
    let fifthPhase = 0
    let octPhase = 0
    let servoPhase = 0
    let shimmerPhase = 0

    for (let i = 0; i < len; i++) {
      const t = i / rate
      const tNorm = t / duration // 0→1 over full sound
      let sample = 0

      // Master envelope: 0.3s fade in, hold, 0.6s fade out
      const fadeIn = Math.min(1, t / 0.3)
      const fadeOut = Math.min(1, (duration - t) / 0.6)
      const env = fadeIn * fadeOut

      // Phase 1: Reactor spin-up (0-1s)
      const p1 = Math.min(1, t / 1.0)

      // Sub-bass drone: 35→55 Hz sweep
      const fundFreq = 35 + p1 * 20 + tNorm * 20 // settles at ~90 Hz by end
      fundPhase += fundFreq / rate
      const fund = Math.sin(fundPhase * Math.PI * 2)
      // Starts loud, eases into the mix
      sample += fund * (0.4 - tNorm * 0.1)

      // Servo whine climbing: 120→400→280 Hz (overshoots then settles)
      const servoFreq = 120 + p1 * 320 - Math.max(0, p1 - 0.7) * 160
      servoPhase += servoFreq / rate
      const servoEnv = p1 * Math.exp(-Math.max(0, t - 0.8) * 2.5) * 0.2
      sample += Math.sin(servoPhase * Math.PI * 2) * servoEnv

      // Phase 2: Chord bloom (1-2s)
      const p2 = Math.max(0, Math.min(1, (t - 0.6) / 1.2))

      // Perfect fifth sweeps into tune: starts detuned, locks in
      const fifthDetune = (1 - p2) * 12 // starts 12 Hz off
      const fifthFreq = (fundFreq * 1.5) + fifthDetune * Math.sin(t * 3)
      fifthPhase += fifthFreq / rate
      sample += Math.sin(fifthPhase * Math.PI * 2) * p2 * 0.25

      // Octave fades in with FM modulation (alien shimmer)
      const octFreq = fundFreq * 2
      const fmMod = Math.sin(t * 5.5) * p2 * 8 // frequency modulation depth
      octPhase += (octFreq + fmMod) / rate
      sample += Math.sin(octPhase * Math.PI * 2) * p2 * 0.15

      // Phase 3: Full resonance + crystalline ring (1.5s+)
      const p3 = Math.max(0, Math.min(1, (t - 1.5) / 0.8))

      // Detuned pair beating: fund + fund*1.003 = slow phase beating
      const beatSample = Math.sin(fundPhase * 1.003 * Math.PI * 2)
      sample += beatSample * p3 * 0.12

      // Second detuned fifth for width
      sample += Math.sin(fifthPhase * 0.998 * Math.PI * 2) * p3 * 0.08

      // Tremolo on the whole chord — breathing pulse
      const tremolo = 1 + Math.sin(t * 4.2) * 0.12 * p3

      // High crystalline shimmer — radiolaria awakening
      const shimmerFreq = 880 + Math.sin(t * 1.8) * 40
      shimmerPhase += shimmerFreq / rate
      const shimmerEnv = p3 * 0.07 * (1 + Math.sin(t * 6) * 0.5)
      sample += Math.sin(shimmerPhase * Math.PI * 2) * shimmerEnv

      // Even higher sparkle (1320 Hz, harmonic)
      const sparkle = Math.sin(t * 1320 * Math.PI * 2) * p3 * 0.03
        * (Math.random() > 0.7 ? 1.5 : 1.0) // occasional bright pings
      sample += sparkle

      // Low-frequency throb: mechanical heartbeat starting
      const heartbeat = Math.sin(t * 2.2 * Math.PI * 2)
      sample += heartbeat * Math.max(0, 0.06 - tNorm * 0.04) * (1 + p1)

      // Apply tremolo and envelope
      sample *= tremolo * env

      // Soft-clip for warmth
      data[i] = Math.tanh(sample * 1.4) * 0.5
    }

    // Use a stomp pool source for positioning
    const src = this.stompPool[this.stompPoolIdx % this.stompPool.length]
    if (!src) return
    this.stompPoolIdx++

    src.position.copy(worldPos)
    if (!src.parent) {
      this.camera.parent?.add(src)
    }

    if (src.isPlaying) src.stop()
    src.setBuffer(buf)
    src.setVolume(0.7)
    src.setPlaybackRate(1.0)
    src.play()
  }
}

