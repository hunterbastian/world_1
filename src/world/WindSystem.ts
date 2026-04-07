import * as THREE from 'three'

export class WindSystem {
  public readonly dirXZ = new THREE.Vector2(1, 0)
  public speed = 1

  private t = 0

  update(dt: number) {
    this.t += dt
    // Slow meander; keeps everything feeling alive.
    const a = this.t * 0.05 + Math.sin(this.t * 0.013) * 0.6
    this.dirXZ.set(Math.cos(a), Math.sin(a)).normalize()
    this.speed = 0.8 + 0.4 * (0.5 + 0.5 * Math.sin(this.t * 0.07))
  }
}

