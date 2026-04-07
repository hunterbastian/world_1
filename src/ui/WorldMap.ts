import type { Terrain } from '../world/Terrain'
import * as THREE from 'three'

export class WorldMap {
  public readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D

  private readonly size: number
  private readonly terrain: Terrain

  // 0..1 explored mask
  private readonly explored: Uint8Array

  constructor(opts: { terrain: Terrain; size?: number }) {
    this.terrain = opts.terrain
    this.size = opts.size ?? 220

    this.canvas = document.createElement('canvas')
    this.canvas.width = this.size
    this.canvas.height = this.size
    const ctx = this.canvas.getContext('2d')
    if (!ctx) throw new Error('2D canvas not supported')
    this.ctx = ctx

    this.explored = new Uint8Array(this.size * this.size)

    this.drawBaseMap()
    this.drawFog()
  }

  revealAt(worldPos: THREE.Vector3, radiusWorld: number) {
    const half = this.terrain.size * 0.5
    const px = (worldPos.x + half) / this.terrain.size
    const pz = (worldPos.z + half) / this.terrain.size

    const cx = Math.round(px * (this.size - 1))
    const cy = Math.round(pz * (this.size - 1))

    const r = Math.max(1, Math.round((radiusWorld / this.terrain.size) * this.size))

    for (let y = cy - r; y <= cy + r; y++) {
      if (y < 0 || y >= this.size) continue
      for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || x >= this.size) continue
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy > r * r) continue
        this.explored[y * this.size + x] = 255
      }
    }

    this.drawFog()
  }

  private drawBaseMap() {
    const img = this.ctx.createImageData(this.size, this.size)
    const data = img.data

    const half = this.terrain.size * 0.5
    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        const u = x / (this.size - 1)
        const v = y / (this.size - 1)
        const wx = u * this.terrain.size - half
        const wz = v * this.terrain.size - half

        const biome = this.terrain.biomeAtXZ(wx, wz)
        const h = this.terrain.heightAtXZ(wx, wz)

        let c = new THREE.Color(0x2f7a46) // plains
        if (biome === 'autumn_forest') c = new THREE.Color(0xb06a2b)
        if (biome === 'snowy_mountains') c = new THREE.Color(0xe7eef6)

        // Add subtle height shading for readability
        const shade = THREE.MathUtils.clamp((h + 10) / 70, 0, 1)
        c.multiplyScalar(0.7 + 0.3 * shade)

        const i = (y * this.size + x) * 4
        data[i + 0] = Math.round(c.r * 255)
        data[i + 1] = Math.round(c.g * 255)
        data[i + 2] = Math.round(c.b * 255)
        data[i + 3] = 255
      }
    }

    this.ctx.putImageData(img, 0, 0)
  }

  private drawFog() {
    // Draw fog-of-war as a black overlay with soft edges.
    const fog = this.ctx.getImageData(0, 0, this.size, this.size)
    const data = fog.data

    // Simple blur-ish falloff by sampling neighborhood (cheap).
    const get = (x: number, y: number) => this.explored[y * this.size + x]!

    for (let y = 0; y < this.size; y++) {
      for (let x = 0; x < this.size; x++) {
        let m = get(x, y)
        // 3x3 neighborhood max (soften edges a bit)
        if (m < 255) {
          for (let oy = -1; oy <= 1; oy++) {
            const yy = y + oy
            if (yy < 0 || yy >= this.size) continue
            for (let ox = -1; ox <= 1; ox++) {
              const xx = x + ox
              if (xx < 0 || xx >= this.size) continue
              m = Math.max(m, get(xx, yy))
            }
          }
        }

        const alpha = 255 - m // unexplored = opaque
        const i = (y * this.size + x) * 4
        // Multiply existing pixel by fog (darken)
        data[i + 0] = (data[i + 0]! * (1 - alpha / 255) + 8 * (alpha / 255)) as number
        data[i + 1] = (data[i + 1]! * (1 - alpha / 255) + 10 * (alpha / 255)) as number
        data[i + 2] = (data[i + 2]! * (1 - alpha / 255) + 14 * (alpha / 255)) as number
        data[i + 3] = 255
      }
    }

    this.ctx.putImageData(fog, 0, 0)
  }
}

