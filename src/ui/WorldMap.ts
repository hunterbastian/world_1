import type { Terrain } from '../world/Terrain'
import type { POI } from '../world/PointsOfInterest'
import * as THREE from 'three'

export type MapMarkerData = {
  player: { position: THREE.Vector3; yaw: number }
  pois: readonly POI[]
  walkers: readonly { position: THREE.Vector3 }[]
}

export class WorldMap {
  public readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  private readonly size: number
  private readonly terrain: Terrain
  private readonly seaLevel: number

  private readonly explored: Uint8Array
  private readonly blurred: Uint8Array
  private readonly baseImage: ImageData
  private dirty = true
  private pulsePhase = 0

  constructor(opts: { terrain: Terrain; size?: number; seaLevel?: number }) {
    this.terrain = opts.terrain
    this.size = opts.size ?? 220
    this.seaLevel = opts.seaLevel ?? -2

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.size
    this.canvas.height = this.size
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas not supported')
    this.ctx = ctx

    this.explored = new Uint8Array(this.size * this.size)
    this.blurred = new Uint8Array(this.size * this.size)
    this.baseImage = this.buildBaseImage()
    this.composeFog()
  }

  revealAt(worldPos: THREE.Vector3, radiusWorld: number) {
    const half = this.terrain.size * 0.5
    const px = (worldPos.x + half) / this.terrain.size
    const pz = (worldPos.z + half) / this.terrain.size

    const cx = Math.round(px * (this.size - 1))
    const cy = Math.round(pz * (this.size - 1))
    const r = Math.max(1, Math.round((radiusWorld / this.terrain.size) * this.size))

    let changed = false
    for (let y = cy - r; y <= cy + r; y++) {
      if (y < 0 || y >= this.size) continue
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || x >= this.size) continue
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy > r * r) continue
        const idx = y * this.size + x
        if (this.explored[idx] !== 255) {
          this.explored[idx] = 255
          changed = true
        }
      }
    }

    if (changed) {
      this.blurExplored()
      this.dirty = true
    }
  }

  updateMarkers(dt: number, data: MapMarkerData) {
    this.pulsePhase += dt * 3.0

    if (this.dirty) {
      this.composeFog()
      this.dirty = false
    }

    const ctx = this.ctx
    const s = this.size
    const half = this.terrain.size * 0.5

    const toMap = (wx: number, wz: number): [number, number] => {
      const mx = ((wx + half) / this.terrain.size) * (s - 1)
      const my = ((wz + half) / this.terrain.size) * (s - 1)
      return [mx, my]
    }

    // POI markers (discovered only)
    for (const poi of data.pois) {
      if (!poi.discovered) continue
      const [mx, my] = toMap(poi.position.x, poi.position.z)

      ctx.save()
      if (poi.type === 'camp') {
        ctx.beginPath()
        ctx.arc(mx, my, 2.5, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.80)'
        ctx.fill()
      } else if (poi.type === 'ruin') {
        ctx.fillStyle = 'rgba(230, 54, 74, 0.65)'
        ctx.fillRect(mx - 2, my - 2, 4, 4)
      } else {
        ctx.save()
        ctx.translate(mx, my)
        ctx.rotate(Math.PI / 4)
        ctx.fillStyle = 'rgba(80, 168, 232, 0.70)'
        ctx.fillRect(-2, -2, 4, 4)
        ctx.restore()
      }
      ctx.restore()
    }

    // Walker markers
    for (const w of data.walkers) {
      const [mx, my] = toMap(w.position.x, w.position.z)
      const ix = Math.round(mx)
      const iy = Math.round(my)
      if (ix < 0 || ix >= s || iy < 0 || iy >= s) continue
      if (this.blurred[iy * s + ix]! < 128) continue

      ctx.save()
      ctx.strokeStyle = 'rgba(64, 200, 152, 0.70)'
      ctx.lineWidth = 1.2
      ctx.beginPath()
      ctx.moveTo(mx - 2, my - 2)
      ctx.lineTo(mx + 2, my + 2)
      ctx.moveTo(mx + 2, my - 2)
      ctx.lineTo(mx - 2, my + 2)
      ctx.stroke()
      ctx.restore()
    }

    // Player marker (white arrow)
    const [pmx, pmy] = toMap(data.player.position.x, data.player.position.z)
    const pulse = 0.75 + 0.25 * Math.sin(this.pulsePhase)
    ctx.save()
    ctx.translate(pmx, pmy)
    ctx.rotate(data.player.yaw)
    ctx.globalAlpha = pulse
    ctx.beginPath()
    ctx.moveTo(0, -4.5)
    ctx.lineTo(3, 3)
    ctx.lineTo(0, 1.5)
    ctx.lineTo(-3, 3)
    ctx.closePath()
    ctx.fillStyle = '#fff'
    ctx.fill()
    ctx.globalAlpha = 1
    ctx.restore()

    // "N" compass indicator
    ctx.save()
    ctx.font = '500 8px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillText('N', s / 2, 4)
    ctx.restore()

    // Thin border
    ctx.save()
    ctx.strokeStyle = 'rgba(255,255,255,0.08)'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, s - 1, s - 1)
    ctx.restore()
  }

  private buildBaseImage(): ImageData {
    const s = this.size
    const img = new ImageData(s, s)
    const data = img.data
    const half = this.terrain.size * 0.5

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const u = x / (s - 1)
        const v = y / (s - 1)
        const wx = u * this.terrain.size - half
        const wz = v * this.terrain.size - half

        const h = this.terrain.heightAtXZ(wx, wz)
        const biome = this.terrain.biomeAtXZ(wx, wz)

        let r: number, g: number, b: number

        if (h < this.seaLevel) {
          const depth = Math.min(1, (this.seaLevel - h) / 12)
          r = Math.round(18 - depth * 6)
          g = Math.round(28 - depth * 8)
          b = Math.round(42 - depth * 8)
        } else if (biome === 'snowy_mountains') {
          const snow = THREE.MathUtils.clamp((h - 20) / 40, 0, 1)
          r = Math.round(THREE.MathUtils.lerp(60, 130, snow))
          g = Math.round(THREE.MathUtils.lerp(62, 132, snow))
          b = Math.round(THREE.MathUtils.lerp(68, 138, snow))
        } else if (biome === 'deep_forest') {
          const shade = THREE.MathUtils.clamp((h + 5) / 30, 0, 1)
          r = Math.round(THREE.MathUtils.lerp(18, 32, shade))
          g = Math.round(THREE.MathUtils.lerp(38, 56, shade))
          b = Math.round(THREE.MathUtils.lerp(24, 36, shade))
        } else {
          const shade = THREE.MathUtils.clamp((h + 5) / 30, 0, 1)
          r = Math.round(THREE.MathUtils.lerp(38, 58, shade))
          g = Math.round(THREE.MathUtils.lerp(55, 78, shade))
          b = Math.round(THREE.MathUtils.lerp(32, 48, shade))
        }

        // Subtle contour lines
        const interval = 15
        const hMod = ((h % interval) + interval) % interval
        if (hMod < 0.7 && h > this.seaLevel) {
          r = Math.round(r * 0.75)
          g = Math.round(g * 0.75)
          b = Math.round(b * 0.75)
        }

        const i = (y * s + x) * 4
        data[i] = r
        data[i + 1] = g
        data[i + 2] = b
        data[i + 3] = 255
      }
    }

    return img
  }

  private blurExplored() {
    const s = this.size
    const src = this.explored
    const dst = this.blurred

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        let max = 0
        for (let oy = -3; oy <= 3; oy++) {
          const yy = y + oy
          if (yy < 0 || yy >= s) continue
          for (let ox = -3; ox <= 3; ox++) {
            const xx = x + ox
            if (xx < 0 || xx >= s) continue
            const d2 = ox * ox + oy * oy
            if (d2 > 9) continue
            const val = src[yy * s + xx]!
            const falloff = 1 - d2 / 10
            const blended = Math.round(val * falloff)
            if (blended > max) max = blended
          }
        }
        dst[y * s + x] = max
      }
    }
  }

  private composeFog() {
    const s = this.size
    const base = this.baseImage.data
    const fog = this.ctx.createImageData(s, s)
    const out = fog.data
    const mask = this.blurred

    // Unexplored = muted dark gray (clean, not parchment)
    const fogR = 16
    const fogG = 18
    const fogB = 24

    for (let y = 0; y < s; y++) {
      for (let x = 0; x < s; x++) {
        const idx = y * s + x
        const i = idx * 4
        const m = mask[idx]! / 255

        out[i] = Math.round(base[i]! * m + fogR * (1 - m))
        out[i + 1] = Math.round(base[i + 1]! * m + fogG * (1 - m))
        out[i + 2] = Math.round(base[i + 2]! * m + fogB * (1 - m))
        out[i + 3] = 255
      }
    }

    this.ctx.putImageData(fog, 0, 0)
  }
}
