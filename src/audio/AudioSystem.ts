import * as THREE from 'three'
import type { Terrain } from '../world/Terrain'
import type { Player } from '../game/Player'

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

  constructor(opts: { camera: THREE.Camera; terrain: Terrain; player: Player }) {
    this.camera = opts.camera
    this.terrain = opts.terrain
    this.player = opts.player

    this.listener = new THREE.AudioListener()
    this.camera.add(this.listener)
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

  private playFootstep() {
    if (!this.started || !this.ctx || !this.footstep) return

    const biome = this.terrain.biomeAtXZ(this.player.position.x, this.player.position.z)
    const buf = makeImpulseBuffer(this.ctx, 0.18)
    this.footstep.setBuffer(buf)

    // Biome “feel” via simple volume shaping.
    const vol = biome === 'snowy_mountains' ? 0.28 : biome === 'deep_forest' ? 0.45 : 0.38
    this.footstep.setVolume(vol)
    this.footstep.play()
  }
}

