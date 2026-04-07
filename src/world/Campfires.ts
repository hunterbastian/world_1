import * as THREE from 'three'
import type { Terrain } from './Terrain'

export class Campfires {
  public readonly object3d: THREE.Object3D
  private readonly particles: THREE.Points
  private readonly vel: Float32Array
  private readonly pos: Float32Array
  private readonly count: number
  private t = 0

  constructor(terrain: Terrain) {
    this.object3d = new THREE.Group()
    this.object3d.name = 'Campfires'

    // Place a few campfires around the world (independent of POIs for now).
    const fires: THREE.Vector3[] = []
    const half = terrain.size * 0.5
    for (let i = 0; i < 5; i++) {
      const x = (Math.sin(i * 91.3) * 0.7) * half
      const z = (Math.cos(i * 73.9) * 0.55) * half
      const y = terrain.heightAtXZ(x, z)
      fires.push(new THREE.Vector3(x, y, z))
    }

    for (const p of fires) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(1.0, 0.12, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x3b2a20, roughness: 1, metalness: 0 })
      )
      ring.rotation.x = Math.PI / 2
      ring.position.copy(p).add(new THREE.Vector3(0, 0.2, 0))
      this.object3d.add(ring)

      const light = new THREE.PointLight(0xffb26b, 1.6, 12, 2)
      light.position.copy(p).add(new THREE.Vector3(0, 1.2, 0))
      this.object3d.add(light)
    }

    // Simple shared ember particle system near origin; we’ll “follow” the nearest campfire later.
    this.count = 220
    this.pos = new Float32Array(this.count * 3)
    this.vel = new Float32Array(this.count * 3)
    for (let i = 0; i < this.count; i++) this.respawn(i)

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3))
    const mat = new THREE.PointsMaterial({
      size: 0.06,
      color: 0xffc37a,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
    this.particles = new THREE.Points(geo, mat)
    this.particles.position.set(0, 0, 0)
    this.object3d.add(this.particles)
  }

  update(dt: number, windDir: THREE.Vector2) {
    this.t += dt
    const w = new THREE.Vector3(windDir.x, 0, windDir.y).multiplyScalar(0.35)

    for (let i = 0; i < this.count; i++) {
      const ix = i * 3
      this.vel[ix + 0] += w.x * dt
      this.vel[ix + 2] += w.z * dt

      // Upward lift + curl.
      this.vel[ix + 1] += (0.9 + 0.2 * Math.sin(this.t * 3 + i)) * dt
      this.vel[ix + 0] += Math.sin(this.t * 7 + i) * 0.02
      this.vel[ix + 2] += Math.cos(this.t * 6 + i) * 0.02

      this.pos[ix + 0] += this.vel[ix + 0] * dt
      this.pos[ix + 1] += this.vel[ix + 1] * dt
      this.pos[ix + 2] += this.vel[ix + 2] * dt

      // Fade out by height; respawn.
      if (this.pos[ix + 1] > 2.6) this.respawn(i)
    }

    ;(this.particles.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
  }

  private respawn(i: number) {
    const ix = i * 3
    const r = Math.sqrt(Math.random()) * 0.55
    const a = Math.random() * Math.PI * 2
    this.pos[ix + 0] = Math.cos(a) * r
    this.pos[ix + 1] = 0.25 + Math.random() * 0.25
    this.pos[ix + 2] = Math.sin(a) * r
    this.vel[ix + 0] = (Math.random() * 2 - 1) * 0.1
    this.vel[ix + 1] = 0.6 + Math.random() * 0.3
    this.vel[ix + 2] = (Math.random() * 2 - 1) * 0.1
  }
}

