import * as THREE from 'three'

type Projectile = {
  mesh: THREE.Mesh
  light: THREE.PointLight
  velocity: THREE.Vector3
  age: number
  active: boolean
  origin: THREE.Vector3
}

const POOL_SIZE = 50
const MAX_AGE = 3
const MAX_DIST = 200

const _geo = new THREE.SphereGeometry(0.3, 8, 8)
const _mat = new THREE.MeshBasicMaterial({ color: 0x88ccff })

export class ProjectileSystem {
  private readonly pool: Projectile[] = []
  private readonly group: THREE.Group

  constructor(scene: THREE.Scene) {
    this.group = new THREE.Group()
    this.group.name = 'Projectiles'
    scene.add(this.group)

    for (let i = 0; i < POOL_SIZE; i++) {
      const mesh = new THREE.Mesh(_geo, _mat)
      mesh.castShadow = true
      mesh.visible = false

      const light = new THREE.PointLight(0x88ccff, 2, 15)
      light.visible = false
      mesh.add(light)

      this.group.add(mesh)
      this.pool.push({
        mesh,
        light,
        velocity: new THREE.Vector3(),
        age: 0,
        active: false,
        origin: new THREE.Vector3(),
      })
    }
  }

  fire(position: THREE.Vector3, direction: THREE.Vector3, speed = 120) {
    let slot = this.pool.find((p) => !p.active)
    if (!slot) {
      slot = this.pool.reduce((oldest, p) => (p.age > oldest.age ? p : oldest))
    }

    slot.active = true
    slot.age = 0
    slot.origin.copy(position)
    slot.mesh.position.copy(position)
    slot.velocity.copy(direction).normalize().multiplyScalar(speed)
    slot.mesh.visible = true
    slot.light.visible = true
  }

  update(dt: number) {
    for (const p of this.pool) {
      if (!p.active) continue
      p.age += dt
      p.mesh.position.addScaledVector(p.velocity, dt)
      if (p.age >= MAX_AGE || p.mesh.position.distanceTo(p.origin) >= MAX_DIST) {
        p.active = false
        p.mesh.visible = false
        p.light.visible = false
      }
    }
  }
}
